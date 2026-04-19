const express = require('express');
const Listing = require('../models/Listing');
const Report = require('../models/Report');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// GET /api/listings — public, fetch all available listings with seller info
router.get('/', async (req, res) => {
  try {
    const listings = await Listing.find({ status: 'Available' })
      .populate('seller_id', 'username college_email avatar_url trust_score')
      .sort({ createdAt: -1 });

    // Map to frontend-compatible shape
    const formatted = listings.map((l) => {
      const obj = l.toObject({ virtuals: true });
      return {
        ...obj,
        id: obj._id,
        seller: obj.seller_id,
        seller_id: obj.seller_id?._id || obj.seller_id,
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Get listings error:', error);
    res.status(500).json({ message: 'Failed to fetch listings.' });
  }
});

// GET /api/listings/my — auth required, fetch current user's listings
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const listings = await Listing.find({ seller_id: req.user._id })
      .sort({ createdAt: -1 });

    const formatted = listings.map((l) => {
      const obj = l.toObject({ virtuals: true });
      return { ...obj, id: obj._id };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Get my listings error:', error);
    res.status(500).json({ message: 'Failed to fetch your listings.' });
  }
});

// GET /api/listings/:id — single listing with seller info
router.get('/:id', async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate('seller_id', 'username college_email avatar_url trust_score');

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found.' });
    }

    const obj = listing.toObject({ virtuals: true });
    const formatted = {
      ...obj,
      id: obj._id,
      seller: obj.seller_id,
      seller_id: obj.seller_id?._id || obj.seller_id,
    };

    res.json(formatted);
  } catch (error) {
    console.error('Get listing error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Listing not found.' });
    }
    res.status(500).json({ message: 'Failed to fetch listing.' });
  }
});

// POST /api/listings — create listing (auth required)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      type,
      price,
      min_price,
      security_deposit,
      max_days,
      image_url,
    } = req.body;

    // Validate required fields
    if (!title || !description || !category || !type || price === undefined) {
      return res.status(400).json({ message: 'Title, description, category, type, and price are required.' });
    }

    if (!['Notes', 'Electronics', 'Gear', 'Books', 'Other'].includes(category)) {
      return res.status(400).json({ message: 'Invalid category.' });
    }

    if (!['Sell', 'Rent'].includes(type)) {
      return res.status(400).json({ message: 'Type must be Sell or Rent.' });
    }

    const listing = new Listing({
      seller_id: req.user._id,
      title: title.trim(),
      description: description.trim(),
      category,
      type,
      price: parseFloat(price),
      min_price: min_price ? parseFloat(min_price) : null,
      security_deposit: security_deposit ? parseFloat(security_deposit) : null,
      max_days: max_days ? parseInt(max_days) : null,
      status: 'Available',
      image_url: image_url || null,
    });

    await listing.save();

    // Populate seller before returning
    await listing.populate('seller_id', 'username college_email avatar_url trust_score');

    const obj = listing.toObject({ virtuals: true });
    const formatted = {
      ...obj,
      id: obj._id,
      seller: obj.seller_id,
      seller_id: obj.seller_id?._id || obj.seller_id,
    };

    res.status(201).json({
      message: 'Listing created successfully!',
      listing: formatted,
    });
  } catch (error) {
    console.error('Create listing error:', error);
    if (error.name === 'ValidationError') {
      const msg = Object.values(error.errors).map(e => e.message).join(', ');
      return res.status(400).json({ message: msg });
    }
    res.status(500).json({ message: 'Failed to create listing.' });
  }
});

// PATCH /api/listings/:id/status — update listing status (auth required, owner only)
router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['Available', 'Sold', 'Rented'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }

    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found.' });
    }

    if (listing.seller_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only update your own listings.' });
    }

    listing.status = status;
    await listing.save();

    res.json({ message: 'Listing status updated.', listing });
  } catch (error) {
    console.error('Update listing status error:', error);
    res.status(500).json({ message: 'Failed to update listing.' });
  }
});

// DELETE /api/listings/:id — remove a sold/rented listing (auth required, owner only)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found.' });
    }

    if (listing.seller_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own listings.' });
    }

    if (listing.status === 'Available') {
      return res.status(400).json({ message: 'You can only remove listings that have been sold or rented.' });
    }

    await Listing.findByIdAndDelete(req.params.id);

    res.json({ message: 'Listing removed successfully.' });
  } catch (error) {
    console.error('Delete listing error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Listing not found.' });
    }
    res.status(500).json({ message: 'Failed to delete listing.' });
  }
});

// POST /api/listings/:id/report — report a listing (auth required)
router.post('/:id/report', authMiddleware, async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'Please provide a reason for reporting.' });
    }

    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found.' });
    }

    // Prevent reporting own listing
    if (listing.seller_id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot report your own listing.' });
    }

    // Check for duplicate pending report from same user
    const existingReport = await Report.findOne({
      reporter_id: req.user._id,
      listing_id: req.params.id,
      status: 'pending',
    });

    if (existingReport) {
      return res.status(409).json({ message: 'You have already reported this listing.' });
    }

    const report = new Report({
      reporter_id: req.user._id,
      listing_id: req.params.id,
      reason: reason.trim(),
    });

    await report.save();

    res.status(201).json({ message: 'Report submitted. Thank you for helping keep our community safe!' });
  } catch (error) {
    console.error('Report listing error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Listing not found.' });
    }
    res.status(500).json({ message: 'Failed to submit report.' });
  }
});

module.exports = router;
