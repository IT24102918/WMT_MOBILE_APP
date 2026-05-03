const router = require('express').Router();
const PerformerPayout = require('../models/PerformerPayout');

router.get('/', async (req, res) => {
  try { res.json(await PerformerPayout.find().populate('performer booking')); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/performer/:performerId', async (req, res) => {
  try { res.json(await PerformerPayout.find({ performer: req.params.performerId }).populate('performer booking')); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/booking/:bookingId', async (req, res) => {
  try { res.json(await PerformerPayout.find({ booking: req.params.bookingId }).populate('performer booking')); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', async (req, res) => {
  try { res.json(await PerformerPayout.create(req.body)); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
