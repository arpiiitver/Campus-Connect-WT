const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  room_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatRoom',
    required: true,
  },
  sender_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Encrypted message fields — plaintext is NEVER stored
  ciphertext: {
    type: String,
    required: true,
  },
  iv: {
    type: String,
    required: true,
  },
  tag: {
    type: String,
    required: true,
  },
}, { timestamps: true });

// Index for efficient message retrieval per room
messageSchema.index({ room_id: 1, createdAt: 1 });

// Virtual for created_at compatibility
messageSchema.virtual('created_at').get(function () {
  return this.createdAt;
});

messageSchema.set('toJSON', { virtuals: true });
messageSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Message', messageSchema);
