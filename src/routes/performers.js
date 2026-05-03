const router = require('express').Router();
const Performer = require('../models/Performer');

router.get('/', async (req, res) => {
  try { res.json(await Performer.find().populate('user')); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const p = await Performer.findById(req.params.id).populate('user');
    if (!p) return res.status(404).json({ message: 'Not found' });
    res.json(p);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', async (req, res) => {
  try { res.json(await Performer.create(req.body)); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const p = await Performer.findByIdAndDelete(req.params.id);
    if (!p) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
