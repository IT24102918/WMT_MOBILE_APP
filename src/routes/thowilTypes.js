const router = require('express').Router();
const ThowilType = require('../models/ThowilType');

router.get('/', async (req, res) => {
  try { res.json(await ThowilType.find()); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
