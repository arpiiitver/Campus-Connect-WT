const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
  seller_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  category: {
    type: String,
    enum: ['Notes', 'Electronics', 'Gear', 'Books', 'Other'],
    required: true,
  },
  description: {
    type: String,
    required: true,
    maxlength: 500,
  },
  type: {
    type: String,
    enum: ['Sell', 'Rent'],
    required: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  min_price: {
    type: Number,
    default: null,
  },
  security_deposit: {
    type: Number,
    default: null,
  },
  max_days: {
    type: Number,
    default: null,
  },
  status: {
    type: String,
    enum: ['Available', 'Sold', 'Rented'],
    default: 'Available',
  },
  image_url: {
    type: String,
    default: null,
  },
}, { timestamps: true });

// Virtual for created_at compatibility
listingSchema.virtual('created_at').get(function () {
  return this.createdAt;
});

listingSchema.set('toJSON', { virtuals: true });
listingSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Listing', listingSchema);
