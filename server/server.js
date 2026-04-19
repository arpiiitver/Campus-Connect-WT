require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const authRoutes = require('./routes/auth');
const listingRoutes = require('./routes/listings');
const chatRoutes = require('./routes/chat');
const adminRoutes = require('./routes/admin');

const User = require('./models/User');
const ChatRoom = require('./models/ChatRoom');
const Message = require('./models/Message');
const { deriveRoomKey, encryptMessage, decryptMessage } = require('./utils/crypto');

const app = express();
const server = http.createServer(app);

// ── CORS origins ────────────────────────────────────────
const CORS_ORIGINS = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'];

// ── Middleware ──────────────────────────────────────────────
app.use(cors({
  origin: CORS_ORIGINS,
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Socket.IO Setup ─────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: CORS_ORIGINS,
    credentials: true,
  },
});

// Socket.IO JWT authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return next(new Error('User not found'));
    }

    if (user.is_banned) {
      return next(new Error('Account is banned'));
    }

    // Attach user to socket
    socket.user = {
      id: user._id.toString(),
      username: user.username,
      avatar_url: user.avatar_url,
    };

    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.user.username} (${socket.user.id})`);

  // Join a chat room
  socket.on('join_room', async (roomId) => {
    try {
      // Verify user is a participant
      const room = await ChatRoom.findById(roomId);
      if (!room) return;

      const userId = socket.user.id;
      if (
        room.buyer_id.toString() !== userId &&
        room.seller_id.toString() !== userId
      ) {
        return; // silently ignore unauthorized join
      }

      socket.join(roomId);
      console.log(`📨 ${socket.user.username} joined room ${roomId}`);
    } catch (error) {
      console.error('Join room error:', error);
    }
  });

  // Leave a chat room
  socket.on('leave_room', (roomId) => {
    socket.leave(roomId);
  });

  // Send a message via WebSocket
  socket.on('send_message', async ({ roomId, text }) => {
    try {
      if (!text || !text.trim() || text.length > 2000) return;

      const userId = socket.user.id;

      // Verify user is a participant
      const room = await ChatRoom.findById(roomId);
      if (!room) return;

      if (
        room.buyer_id.toString() !== userId &&
        room.seller_id.toString() !== userId
      ) {
        return;
      }

      // Encrypt the message
      const roomKey = deriveRoomKey(roomId);
      const encrypted = encryptMessage(text.trim(), roomKey);

      // Save to database
      const message = new Message({
        room_id: roomId,
        sender_id: userId,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        tag: encrypted.tag,
      });

      await message.save();

      // Update room's last_message_at
      room.last_message_at = new Date();
      await room.save();

      // Populate sender info
      await message.populate('sender_id', 'username avatar_url');

      const obj = message.toObject({ virtuals: true });

      // Emit decrypted message to all participants in the room
      io.to(roomId).emit('new_message', {
        id: obj._id,
        room_id: obj.room_id,
        sender_id: obj.sender_id?._id || obj.sender_id,
        sender: obj.sender_id,
        text: text.trim(),
        created_at: obj.createdAt,
      });
    } catch (error) {
      console.error('Socket send_message error:', error);
    }
  });

  // Typing indicators
  socket.on('typing', (roomId) => {
    socket.to(roomId).emit('user_typing', {
      userId: socket.user.id,
      username: socket.user.username,
    });
  });

  socket.on('stop_typing', (roomId) => {
    socket.to(roomId).emit('user_stopped_typing', {
      userId: socket.user.id,
    });
  });

  socket.on('disconnect', () => {
    console.log(`🔌 User disconnected: ${socket.user.username}`);
  });
});

// ── Make Socket.IO accessible to routes ─────────────────
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ── Routes ──────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Campus Connect API is running!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// ── Seed Admin User ─────────────────────────────────────
const seedAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminUsername = process.env.ADMIN_USERNAME || 'Admin';

    if (!adminEmail || !adminPassword) {
      console.log('⚠️  No ADMIN_EMAIL/ADMIN_PASSWORD in .env — skipping admin seed');
      return;
    }

    let adminUser = await User.findOne({ college_email: adminEmail.toLowerCase() });

    if (!adminUser) {
      adminUser = new User({
        username: adminUsername,
        college_email: adminEmail.toLowerCase(),
        password: adminPassword,
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${adminUsername}`,
        trust_score: 100,
        is_admin: true,
        is_banned: false,
      });
      await adminUser.save();
      console.log(`👑 Admin user created: ${adminEmail}`);
    } else if (!adminUser.is_admin) {
      adminUser.is_admin = true;
      await adminUser.save();
      console.log(`👑 Existing user promoted to admin: ${adminEmail}`);
    } else {
      console.log(`👑 Admin user ready: ${adminEmail}`);
    }
  } catch (error) {
    console.error('❌ Failed to seed admin user:', error.message);
  }
};

// ── Database + Start ────────────────────────────────────
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB connected successfully');

    // Seed admin user
    await seedAdmin();

    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📡 API available at http://localhost:${PORT}/api`);
      console.log(`🔌 Socket.IO ready for connections`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });
