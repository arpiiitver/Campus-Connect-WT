const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema({
  buyer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  seller_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  listing_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing',
    required: true,
  },
  last_message_at: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

// Prevent duplicate rooms for the same buyer-seller-listing combo
chatRoomSchema.index({ buyer_id: 1, seller_id: 1, listing_id: 1 }, { unique: true });

// Index for efficient "my rooms" queries
chatRoomSchema.index({ buyer_id: 1, last_message_at: -1 });
chatRoomSchema.index({ seller_id: 1, last_message_at: -1 });

// Virtual for created_at compatibility
chatRoomSchema.virtual('created_at').get(function () {
  return this.createdAt;
});

chatRoomSchema.set('toJSON', { virtuals: true });
chatRoomSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ChatRoom', chatRoomSchema);
