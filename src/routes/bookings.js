const router = require('express').Router();
const Booking = require('../models/Booking');
const User = require('../models/User');
const Performer = require('../models/Performer');
const ThowilType = require('../models/ThowilType');
const { ensureRequired, normalizeDateOnly, parsePositiveNumber } = require('../utils/validation');
const VALID_BOOKING_STATUSES = ['PENDING', 'CONFIRMED', 'CONFIRMED_BY_PERFORMER', 'COMPLETED', 'CANCELLED', 'CANCELLED_BY_CUSTOMER', 'Confirmed', 'Cancelled'];

// GET /api/bookings
router.get('/', async (req, res) => {
  try {
    const bookings = await Booking.find().populate('user performer thowilType');
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/bookings
router.post('/', async (req, res) => {
  try {
    const errors = ensureRequired(req.body, ['user', 'performer', 'thowilType', 'eventDate']);
    if (errors.length) return res.status(400).json({ message: errors[0], errors });

    const [user, performer, thowilType] = await Promise.all([
      User.findById(req.body.user),
      Performer.findById(req.body.performer),
      ThowilType.findById(req.body.thowilType),
    ]);
    if (!user) return res.status(400).json({ message: 'user not found' });
    if (!performer) return res.status(400).json({ message: 'performer not found' });
    if (!thowilType) return res.status(400).json({ message: 'thowilType not found' });

    const requestedDate = normalizeDateOnly(req.body.eventDate, 'eventDate');
    if (requestedDate.error) return res.status(400).json({ message: requestedDate.error });
    const today = normalizeDateOnly(new Date()).value;
    if (requestedDate.value < today) return res.status(400).json({ message: 'Booking date must be today or a future date' });

    let totalAmount = thowilType.basePrice || 0;
    if (req.body.totalAmount != null && `${req.body.totalAmount}` !== '') {
      const parsed = parsePositiveNumber(req.body.totalAmount, 'totalAmount', { allowZero: true });
      if (parsed.error) return res.status(400).json({ message: parsed.error });
      totalAmount = parsed.value;
    }

    const booking = await Booking.create({
      user: user._id,
      performer: performer._id,
      thowilType: thowilType._id,
      eventDate: requestedDate.value,
      endDate: req.body.endDate || undefined,
      status: req.body.status || 'PENDING',
      totalAmount,
    });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/bookings/user/:userId
router.get('/user/:userId', async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.params.userId }).populate('user performer thowilType');
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/bookings/:id
router.put('/:id', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (booking.status !== 'PENDING') {
      return res.status(400).json({ message: 'Only pending bookings can be updated' });
    }

    const updates = {};

    if (req.body.eventDate) {
      const requestedDate = normalizeDateOnly(req.body.eventDate);
      const today = normalizeDateOnly(new Date(), 'today');

      if (requestedDate.error) {
        return res.status(400).json({ message: requestedDate.error });
      }

      if (requestedDate.value < today.value) {
        return res.status(400).json({ message: 'Booking date must be today or a future date' });
      }

      updates.eventDate = requestedDate.value;
    }

    if (req.body.thowilType) {
      const thowilType = await ThowilType.findById(req.body.thowilType);
      if (!thowilType) {
        return res.status(400).json({ message: 'Selected ritual type was not found' });
      }

      updates.thowilType = thowilType._id;
      updates.totalAmount = thowilType.basePrice || 0;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No booking changes were provided' });
    }

    const updatedBooking = await Booking.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate('user performer thowilType');

    res.json(updatedBooking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/bookings/performer/:userId - accepts user id and resolves to performer
router.get('/performer/:userId', async (req, res) => {
  try {
    const performer = await Performer.findOne({ user: req.params.userId });
    if (!performer) return res.json([]);
    const bookings = await Booking.find({ performer: performer._id }).populate('user performer thowilType');
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/bookings/:id/status?status=CONFIRMED
router.put('/:id/status', async (req, res) => {
  try {
    const nextStatus = req.query.status;
    if (!nextStatus) return res.status(400).json({ message: 'status is required' });
    if (!VALID_BOOKING_STATUSES.includes(nextStatus)) {
      return res.status(400).json({ message: 'Invalid booking status' });
    }
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: nextStatus },
      { new: true }
    );
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
