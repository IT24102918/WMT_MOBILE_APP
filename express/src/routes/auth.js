const router = require('express').Router();
const User = require('../models/User');
const Role = require('../models/Role');
const Performer = require('../models/Performer');
const Supplier = require('../models/Supplier');
const { ensureRequired, validateEmail, validatePhone } = require('../utils/validation');
const { hashPassword, looksHashed, verifyPassword } = require('../utils/passwords');

const VALID_ROLES = ['CUSTOMER', 'PERFORMER', 'SUPPLIER', 'DRIVER', 'INVENTORY_MANAGER', 'ADMIN'];

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const errors = ensureRequired(req.body, ['email', 'password']);
    if (errors.length) return res.status(400).json({ message: errors[0], errors });
    const normalizedEmail = `${email}`.trim().toLowerCase();
    if (!validateEmail(normalizedEmail)) return res.status(400).json({ message: 'email must be valid' });

    const user = await User.findOne({ email: normalizedEmail }).populate('role');
    if (!user) return res.status(401).json({ message: 'User not found' });
    const passwordValid = await verifyPassword(password, user.password);
    if (!passwordValid) return res.status(401).json({ message: 'Invalid Password' });

    if (!looksHashed(user.password)) {
      user.password = await hashPassword(password);
      await user.save();
    }

    const roleName = user.role ? user.role.roleName : 'CUSTOMER';
    res.json({ id: user._id, name: user.name, email: user.email, phone: user.phone, roleName });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/register?roleName=CUSTOMER
router.post('/register', async (req, res) => {
  try {
    const roleName = `${req.query.roleName || 'CUSTOMER'}`.toUpperCase();
    const errors = ensureRequired(req.body, ['name', 'email', 'password']);
    if (errors.length) return res.status(400).json({ message: errors[0], errors });
    if (!validateEmail(req.body.email)) return res.status(400).json({ message: 'email must be valid' });
    if (req.body.phone && !validatePhone(req.body.phone)) return res.status(400).json({ message: 'phone must be a valid 10-digit number' });
    if (`${req.body.password}`.length < 6) return res.status(400).json({ message: 'password must be at least 6 characters long' });
    if (!VALID_ROLES.includes(roleName)) return res.status(400).json({ message: 'Invalid roleName' });
    const existingUser = await User.findOne({ email: `${req.body.email}`.trim().toLowerCase() });
    if (existingUser) return res.status(400).json({ message: 'User already exists with this email' });

    // Find or create role
    let role = await Role.findOne({ roleName });
    if (!role) {
      role = await Role.create({ roleName });
    }

    const user = await User.create({
      ...req.body,
      name: `${req.body.name}`.trim(),
      email: `${req.body.email}`.trim().toLowerCase(),
      password: await hashPassword(req.body.password),
      phone: req.body.phone ? `${req.body.phone}`.trim() : undefined,
      role: role._id,
    });
    const populated = await user.populate('role');

    // Auto-seed performer/supplier profile to prevent broken dashboards
    if (roleName.toUpperCase() === 'PERFORMER') {
      await Performer.create({
        user: user._id,
        name: user.name,
        experienceYears: 0,
        rating: 0.0,
        location: 'New Performer',
      });
    } else if (roleName.toUpperCase() === 'SUPPLIER') {
      await Supplier.create({
        user: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        rating: 0.0,
        contactPerson: user.name,
      });
    }

    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
