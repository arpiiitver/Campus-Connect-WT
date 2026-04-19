const express = require('express');
const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');
const Listing = require('../models/Listing');
const authMiddleware = require('../middleware/auth');
const { deriveRoomKey, encryptMessage, decryptMessage } = require('../utils/crypto');

const router = express.Router();

// All chat routes require authentication
router.use(authMiddleware);

// POST /api/chat/rooms — Create or get existing chat room
router.post('/rooms', async (req, res) => {
  try {
    const { listing_id } = req.body;

    if (!listing_id) {
      return res.status(400).json({ message: 'listing_id is required.' });
    }

    // Fetch the listing to get the seller
    const listing = await Listing.findById(listing_id);
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found.' });
    }

    const buyerId = req.user._id.toString();
    const sellerId = listing.seller_id.toString();

    // Prevent chatting with yourself
    if (buyerId === sellerId) {
      return res.status(400).json({ message: 'You cannot chat about your own listing.' });
    }

    // Find existing room or create new one
    let room = await ChatRoom.findOne({
      buyer_id: buyerId,
      seller_id: sellerId,
      listing_id: listing_id,
    });

    if (!room) {
      room = new ChatRoom({
        buyer_id: buyerId,
        seller_id: sellerId,
        listing_id: listing_id,
      });
      await room.save();
    }

    // Populate for response
    await room.populate('buyer_id', 'username college_email avatar_url trust_score');
    await room.populate('seller_id', 'username college_email avatar_url trust_score');
    await room.populate('listing_id', 'title price type category image_url status');

    const obj = room.toObject({ virtuals: true });
    const formatted = {
      ...obj,
      id: obj._id,
      buyer: obj.buyer_id,
      seller: obj.seller_id,
      listing: obj.listing_id,
      buyer_id: obj.buyer_id?._id || obj.buyer_id,
      seller_id: obj.seller_id?._id || obj.seller_id,
      listing_id: obj.listing_id?._id || obj.listing_id,
    };

    res.status(200).json(formatted);
  } catch (error) {
    console.error('Create/get room error:', error);
    if (error.code === 11000) {
      // Duplicate key — race condition, just fetch the existing room
      try {
        const { listing_id } = req.body;
        const listing = await Listing.findById(listing_id);
        const room = await ChatRoom.findOne({
          buyer_id: req.user._id,
          seller_id: listing.seller_id,
          listing_id: listing_id,
        })
          .populate('buyer_id', 'username college_email avatar_url trust_score')
          .populate('seller_id', 'username college_email avatar_url trust_score')
          .populate('listing_id', 'title price type category image_url status');

        const obj = room.toObject({ virtuals: true });
        return res.status(200).json({
          ...obj,
          id: obj._id,
          buyer: obj.buyer_id,
          seller: obj.seller_id,
          listing: obj.listing_id,
          buyer_id: obj.buyer_id?._id || obj.buyer_id,
          seller_id: obj.seller_id?._id || obj.seller_id,
          listing_id: obj.listing_id?._id || obj.listing_id,
        });
      } catch (innerErr) {
        console.error('Fallback room fetch error:', innerErr);
      }
    }
    res.status(500).json({ message: 'Failed to create or get chat room.' });
  }
});

// GET /api/chat/rooms — List all chat rooms for the current user
router.get('/rooms', async (req, res) => {
  try {
    const userId = req.user._id;

    const rooms = await ChatRoom.find({
      $or: [{ buyer_id: userId }, { seller_id: userId }],
    })
      .populate('buyer_id', 'username college_email avatar_url trust_score')
      .populate('seller_id', 'username college_email avatar_url trust_score')
      .populate('listing_id', 'title price type category image_url status')
      .sort({ last_message_at: -1 });

    // For each room, get the last message and unread count
    const formatted = await Promise.all(
      rooms.map(async (room) => {
        const obj = room.toObject({ virtuals: true });

        // Get last message
        const lastMsg = await Message.findOne({ room_id: room._id })
          .sort({ createdAt: -1 })
          .populate('sender_id', 'username');

        let lastMessagePreview = null;
        if (lastMsg) {
          try {
            const roomKey = deriveRoomKey(room._id);
            const text = decryptMessage(
              { ciphertext: lastMsg.ciphertext, iv: lastMsg.iv, tag: lastMsg.tag },
              roomKey
            );
            lastMessagePreview = {
              id: lastMsg._id,
              text: text.length > 60 ? text.substring(0, 60) + '...' : text,
              sender_id: lastMsg.sender_id?._id || lastMsg.sender_id,
              sender_name: lastMsg.sender_id?.username || 'Unknown',
              created_at: lastMsg.createdAt,
            };
          } catch (decryptErr) {
            lastMessagePreview = {
              id: lastMsg._id,
              text: '[Encrypted message]',
              sender_id: lastMsg.sender_id?._id || lastMsg.sender_id,
              sender_name: lastMsg.sender_id?.username || 'Unknown',
              created_at: lastMsg.createdAt,
            };
          }
        }

        // Get total message count (simple approach — could add read tracking later)
        const messageCount = await Message.countDocuments({ room_id: room._id });

        return {
          ...obj,
          id: obj._id,
          buyer: obj.buyer_id,
          seller: obj.seller_id,
          listing: obj.listing_id,
          buyer_id: obj.buyer_id?._id || obj.buyer_id,
          seller_id: obj.seller_id?._id || obj.seller_id,
          listing_id: obj.listing_id?._id || obj.listing_id,
          last_message: lastMessagePreview,
          message_count: messageCount,
        };
      })
    );

    res.json(formatted);
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ message: 'Failed to fetch chat rooms.' });
  }
});

// GET /api/chat/rooms/:roomId/messages — Get all messages in a room (decrypted)
router.get('/rooms/:roomId/messages', async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;

    // Verify user is a participant
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Chat room not found.' });
    }

    if (
      room.buyer_id.toString() !== userId.toString() &&
      room.seller_id.toString() !== userId.toString()
    ) {
      return res.status(403).json({ message: 'You are not a participant of this chat.' });
    }

    const messages = await Message.find({ room_id: roomId })
      .populate('sender_id', 'username avatar_url')
      .sort({ createdAt: 1 });

    const roomKey = deriveRoomKey(roomId);

    const decrypted = messages.map((msg) => {
      const obj = msg.toObject({ virtuals: true });
      let text;
      try {
        text = decryptMessage(
          { ciphertext: obj.ciphertext, iv: obj.iv, tag: obj.tag },
          roomKey
        );
      } catch {
        text = '[Unable to decrypt message]';
      }

      return {
        id: obj._id,
        room_id: obj.room_id,
        sender_id: obj.sender_id?._id || obj.sender_id,
        sender: obj.sender_id,
        text,
        created_at: obj.createdAt,
      };
    });

    res.json(decrypted);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Failed to fetch messages.' });
  }
});

// POST /api/chat/rooms/:roomId/messages — Send a message
router.post('/rooms/:roomId/messages', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Message text is required.' });
    }

    if (text.length > 2000) {
      return res.status(400).json({ message: 'Message is too long (max 2000 characters).' });
    }

    // Verify user is a participant
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Chat room not found.' });
    }

    if (
      room.buyer_id.toString() !== userId.toString() &&
      room.seller_id.toString() !== userId.toString()
    ) {
      return res.status(403).json({ message: 'You are not a participant of this chat.' });
    }

    // Encrypt the message
    const roomKey = deriveRoomKey(roomId);
    const encrypted = encryptMessage(text.trim(), roomKey);

    // Save encrypted message
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

    const responseData = {
      id: obj._id,
      room_id: obj.room_id,
      sender_id: obj.sender_id?._id || obj.sender_id,
      sender: obj.sender_id,
      text: text.trim(),
      created_at: obj.createdAt,
    };

    // Broadcast via Socket.IO so the OTHER user gets the message in real-time
    if (req.io) {
      req.io.to(roomId).emit('new_message', responseData);
    }

    res.status(201).json(responseData);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Failed to send message.' });
  }
});

module.exports = router;
