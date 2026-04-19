const express = require('express');
const adminAuth = require('../middleware/adminAuth');
const User = require('../models/User');
const Listing = require('../models/Listing');
const Report = require('../models/Report');

const router = express.Router();

// All routes here require admin authentication
router.use(adminAuth);

// ── GET /api/admin/stats — Dashboard stats ──────────────
router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, totalListings, activeListings, pendingReports, bannedUsers] = await Promise.all([
      User.countDocuments(),
      Listing.countDocuments(),
      Listing.countDocuments({ status: 'Available' }),
      Report.countDocuments({ status: 'pending' }),
      User.countDocuments({ is_banned: true }),
    ]);

    // Category breakdown
    const categoryStats = await Listing.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Type breakdown (Sell vs Rent)
    const typeStats = await Listing.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);

    // Status breakdown
    const statusStats = await Listing.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    res.json({
      totalUsers,
      totalListings,
      activeListings,
      pendingReports,
      bannedUsers,
      categoryStats,
      typeStats,
      statusStats,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ message: 'Failed to fetch stats.' });
  }
});

// ── GET /api/admin/users — List all users ───────────────
router.get('/users', async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search) {
      query = {
        $or: [
          { username: { $regex: search, $options: 'i' } },
          { college_email: { $regex: search, $options: 'i' } },
          { full_name: { $regex: search, $options: 'i' } },
        ],
      };
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 });

    const formatted = users.map((u) => ({
      id: u._id,
      _id: u._id,
      username: u.username,
      college_email: u.college_email,
      full_name: u.full_name || '',
      contact: u.contact || '',
      avatar_url: u.avatar_url,
      trust_score: u.trust_score,
      is_admin: u.is_admin,
      is_banned: u.is_banned,
      created_at: u.createdAt,
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({ message: 'Failed to fetch users.' });
  }
});

// ── PATCH /api/admin/users/:id/ban — Toggle ban status ──
router.patch('/users/:id/ban', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.is_admin) {
      return res.status(400).json({ message: 'Cannot ban an admin user.' });
    }

    user.is_banned = !user.is_banned;
    await user.save();

    res.json({
      message: user.is_banned ? 'User has been banned.' : 'User has been unbanned.',
      user: {
        id: user._id,
        username: user.username,
        is_banned: user.is_banned,
      },
    });
  } catch (error) {
    console.error('Admin toggle ban error:', error);
    res.status(500).json({ message: 'Failed to update user.' });
  }
});

// ── PATCH /api/admin/users/:id/trust — Update trust score ─
router.patch('/users/:id/trust', async (req, res) => {
  try {
    const { trust_score } = req.body;

    if (trust_score === undefined || trust_score < 0 || trust_score > 100) {
      return res.status(400).json({ message: 'Trust score must be between 0 and 100.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    user.trust_score = trust_score;
    await user.save();

    res.json({
      message: 'Trust score updated.',
      user: {
        id: user._id,
        username: user.username,
        trust_score: user.trust_score,
      },
    });
  } catch (error) {
    console.error('Admin update trust error:', error);
    res.status(500).json({ message: 'Failed to update trust score.' });
  }
});

// ── GET /api/admin/listings — All listings (any status) ─
router.get('/listings', async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search) {
      query = {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ],
      };
    }

    const listings = await Listing.find(query)
      .populate('seller_id', 'username college_email avatar_url trust_score')
      .sort({ createdAt: -1 });

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
    console.error('Admin get listings error:', error);
    res.status(500).json({ message: 'Failed to fetch listings.' });
  }
});

// ── DELETE /api/admin/listings/:id — Force delete any listing ─
router.delete('/listings/:id', async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found.' });
    }

    await Listing.findByIdAndDelete(req.params.id);

    // Also clean up any reports for this listing
    await Report.deleteMany({ listing_id: req.params.id });

    res.json({ message: 'Listing deleted by admin.' });
  } catch (error) {
    console.error('Admin delete listing error:', error);
    res.status(500).json({ message: 'Failed to delete listing.' });
  }
});

// ── PATCH /api/admin/listings/:id/status — Force status change ─
router.patch('/listings/:id/status', async (req, res) => {
  try {
    const { status } = req.body;

    if (!['Available', 'Sold', 'Rented'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }

    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found.' });
    }

    listing.status = status;
    await listing.save();

    res.json({ message: 'Listing status updated by admin.', listing });
  } catch (error) {
    console.error('Admin update listing status error:', error);
    res.status(500).json({ message: 'Failed to update listing.' });
  }
});

// ── GET /api/admin/reports — All pending reports ────────
router.get('/reports', async (req, res) => {
  try {
    const reports = await Report.find({ status: 'pending' })
      .populate('reporter_id', 'username college_email avatar_url')
      .populate({
        path: 'listing_id',
        populate: {
          path: 'seller_id',
          select: 'username college_email avatar_url trust_score',
        },
      })
      .sort({ createdAt: -1 });

    const formatted = reports.map((r) => {
      const obj = r.toObject({ virtuals: true });
      return {
        id: obj._id,
        _id: obj._id,
        reporter: obj.reporter_id,
        reporter_id: obj.reporter_id?._id || obj.reporter_id,
        listing: obj.listing_id ? {
          ...obj.listing_id,
          id: obj.listing_id._id,
          seller: obj.listing_id.seller_id,
          seller_id: obj.listing_id.seller_id?._id || obj.listing_id.seller_id,
        } : null,
        listing_id: obj.listing_id?._id || obj.listing_id,
        reason: obj.reason,
        status: obj.status,
        created_at: obj.createdAt,
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Admin get reports error:', error);
    res.status(500).json({ message: 'Failed to fetch reports.' });
  }
});

// ── PATCH /api/admin/reports/:id/dismiss — Dismiss a report ─
router.patch('/reports/:id/dismiss', async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found.' });
    }

    report.status = 'dismissed';
    await report.save();

    res.json({ message: 'Report dismissed.' });
  } catch (error) {
    console.error('Admin dismiss report error:', error);
    res.status(500).json({ message: 'Failed to dismiss report.' });
  }
});

// ── PATCH /api/admin/reports/:id/action — Action a report (delete listing) ─
router.patch('/reports/:id/action', async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found.' });
    }

    // Delete the reported listing
    if (report.listing_id) {
      await Listing.findByIdAndDelete(report.listing_id);
      // Clean up all reports for this listing
      await Report.updateMany(
        { listing_id: report.listing_id, status: 'pending' },
        { status: 'actioned' }
      );
    }

    report.status = 'actioned';
    await report.save();

    res.json({ message: 'Report actioned — listing removed.' });
  } catch (error) {
    console.error('Admin action report error:', error);
    res.status(500).json({ message: 'Failed to action report.' });
  }
});

module.exports = router;
