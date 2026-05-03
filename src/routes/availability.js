const router = require('express').Router();
const PerformerAvailability = require('../models/PerformerAvailability');
const Performer = require('../models/Performer');
const { normalizeDateOnly } = require('../utils/validation');

const VALID_AVAILABILITY_STATUSES = ['AVAILABLE', 'UNAVAILABLE'];

function validateAvailabilityPayload(body) {
  if (!body.availableDate) return 'availableDate is required';
  const parsed = normalizeDateOnly(body.availableDate, 'availableDate');
  if (parsed.error) return parsed.error;
  const status = `${body.status || 'AVAILABLE'}`.toUpperCase();
  if (!VALID_AVAILABILITY_STATUSES.includes(status)) return 'Invalid availability status';
  const today = normalizeDateOnly(new Date(), 'today').value;
  if (parsed.value < today) return 'availableDate must be today or a future date';
  return null;
}

// GET /api/availability/performer/:id
// Accept either a performer user id or performer document id
router.get('/performer/:id', async (req, res) => {
  try {
    const performer = await Performer.findOne({
      $or: [{ user: req.params.id }, { _id: req.params.id }],
    });

    if (!performer) return res.json([]);

    const availability = await PerformerAvailability.find({
      performer: performer._id,
    }).populate('performer');

    res.json(availability);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/availability/date/:date (ISO format: YYYY-MM-DD)
router.get('/date/:date', async (req, res) => {
  try {
    const date = new Date(req.params.date);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const avails = await PerformerAvailability.find({
      availableDate: { $gte: date, $lt: nextDay },
    }).populate('performer');

    res.json(avails);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/availability/user/:userId
router.post('/user/:userId', async (req, res) => {
  try {
    const performer = await Performer.findOne({ user: req.params.userId });
    if (!performer) {
      return res.status(400).json({ message: 'Performer profile not found for this user.' });
    }
    const validationError = validateAvailabilityPayload(req.body);
    if (validationError) return res.status(400).json({ message: validationError });
    const parsed = normalizeDateOnly(req.body.availableDate, 'availableDate');

    const avail = await PerformerAvailability.create({
      availableDate: parsed.value,
      status: `${req.body.status || 'AVAILABLE'}`.toUpperCase(),
      performer: performer._id,
    });

    res.json(avail);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/availability/performer-id/:performerId
router.post('/performer-id/:performerId', async (req, res) => {
  try {
    const performer = await Performer.findById(req.params.performerId);
    if (!performer) return res.status(400).json({ message: 'Performer not found.' });
    const validationError = validateAvailabilityPayload(req.body);
    if (validationError) return res.status(400).json({ message: validationError });
    const parsed = normalizeDateOnly(req.body.availableDate, 'availableDate');

    const avail = await PerformerAvailability.create({
      availableDate: parsed.value,
      status: `${req.body.status || 'AVAILABLE'}`.toUpperCase(),
      performer: performer._id,
    });

    res.json(avail);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/availability/:id
router.delete('/:id', async (req, res) => {
  try {
    const availability = await PerformerAvailability.findByIdAndDelete(req.params.id);
    if (!availability) return res.status(404).json({ message: 'Not found' });

    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
