const router = require('express').Router();
const User = require('../models/User');
const Role = require('../models/Role');
const { ensureRequired, validateEmail, validatePhone } = require('../utils/validation');
const { hashPassword } = require('../utils/passwords');

// GET /api/users
router.get('/', async (req, res) => {
  try {
    const users = await User.find().populate('role');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/users/:id
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('role');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/users
router.post('/', async (req, res) => {
  try {
    const errors = ensureRequired(req.body, ['name', 'email', 'password']);
    if (errors.length) return res.status(400).json({ message: errors[0], errors });
    if (!validateEmail(req.body.email)) return res.status(400).json({ message: 'email must be valid' });
    if (req.body.phone && !validatePhone(req.body.phone)) return res.status(400).json({ message: 'phone must be a valid 10-digit number' });
    if (`${req.body.password}`.length < 6) return res.status(400).json({ message: 'password must be at least 6 characters long' });
    const existing = await User.findOne({ email: `${req.body.email}`.trim().toLowerCase() });
    if (existing) return res.status(400).json({ message: 'User already exists with this email' });

    let roleId = req.body.role;
    if (roleId) {
      const role = await Role.findById(roleId);
      if (!role) return res.status(400).json({ message: 'role not found' });
      roleId = role._id;
    }

    const user = await User.create({
      name: `${req.body.name}`.trim(),
      email: `${req.body.email}`.trim().toLowerCase(),
      password: await hashPassword(req.body.password),
      phone: req.body.phone ? `${req.body.phone}`.trim() : undefined,
      role: roleId,
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
