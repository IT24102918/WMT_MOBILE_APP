const router = require('express').Router();
const Order = require('../models/Order');
const User = require('../models/User');
const { ensureRequired, parsePositiveNumber } = require('../utils/validation');

const VALID_ORDER_STATUSES = ['PENDING', 'PAID', 'PROCESSING', 'CONFIRMED', 'DELIVERED', 'CANCELLED'];

router.get('/', async (req, res) => {
  try { res.json(await Order.find().populate('user')); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const errors = ensureRequired(req.body, ['user', 'totalAmount']);
    if (errors.length) return res.status(400).json({ message: errors[0], errors });
    const user = await User.findById(req.body.user);
    if (!user) return res.status(400).json({ message: 'user not found' });
    const totalAmount = parsePositiveNumber(req.body.totalAmount, 'totalAmount', { allowZero: true });
    if (totalAmount.error) return res.status(400).json({ message: totalAmount.error });
    const status = req.body.status || 'PENDING';
    if (!VALID_ORDER_STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid order status' });

    res.json(await Order.create({
      user: user._id,
      totalAmount: totalAmount.value,
      status,
    }));
  }
  catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/user/:userId', async (req, res) => {
  try { res.json(await Order.find({ user: req.params.userId }).populate('user')); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (req.body.totalAmount != null) {
      const totalAmount = parsePositiveNumber(req.body.totalAmount, 'totalAmount', { allowZero: true });
      if (totalAmount.error) return res.status(400).json({ message: totalAmount.error });
      order.totalAmount = totalAmount.value;
    }

    if (req.body.status != null) {
      const status = `${req.body.status}`.toUpperCase();
      if (!VALID_ORDER_STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid order status' });
      order.status = status;
    }

    await order.save();
    res.json(await Order.findById(order._id).populate('user'));
  }
  catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
