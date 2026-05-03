const fs = require('fs');
const path = require('path');
const multer = require('multer');
const router = require('express').Router();
const Booking = require('../models/Booking');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const User = require('../models/User');
const { parsePositiveNumber } = require('../utils/validation');

const uploadDir = path.join(__dirname, '../../uploads/payment-slips');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeExt = path.extname(file.originalname || '').toLowerCase() || '.bin';
    cb(null, `slip-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, WEBP, and PDF slips are allowed'));
    }
    cb(null, true);
  },
});

const VALID_PAYMENT_METHODS = ['CARD', 'BANK_TRANSFER', 'CASH'];
const VALID_PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'PENDING_VERIFICATION', 'REFUNDED'];

router.get('/', async (req, res) => {
  try {
    const query = {};

    if (req.query.order) query.order = req.query.order;
    if (req.query.booking) query.booking = req.query.booking;
    if (req.query.paymentStatus) query.paymentStatus = req.query.paymentStatus;
    if (req.query.paymentMethod) query.paymentMethod = req.query.paymentMethod;

    if (req.query.user) {
      const user = await User.findById(req.query.user);
      if (!user) return res.status(400).json({ message: 'user not found' });
      const [orders, bookings] = await Promise.all([
        Order.find({ user: user._id }, '_id').lean(),
        Booking.find({ user: user._id }, '_id').lean(),
      ]);
      query.$or = [
        { order: { $in: orders.map((item) => item._id) } },
        { booking: { $in: bookings.map((item) => item._id) } },
      ];
    }

    res.json(await Payment.find(query).populate('booking order').sort({ paymentDate: -1 }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', upload.single('slip'), async (req, res) => {
  try {
    const paymentMethod = req.body.paymentMethod || 'CARD';
    const paymentStatus = req.body.paymentStatus || 'PENDING';
    if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({ message: 'Invalid paymentMethod' });
    }
    if (!VALID_PAYMENT_STATUSES.includes(paymentStatus)) {
      return res.status(400).json({ message: 'Invalid paymentStatus' });
    }

    if (!req.body.booking && !req.body.order) {
      return res.status(400).json({ message: 'Either booking or order is required' });
    }

    const amount = parsePositiveNumber(req.body.amount, 'amount', { allowZero: true });
    if (amount.error) return res.status(400).json({ message: amount.error });

    const [booking, order] = await Promise.all([
      req.body.booking ? Booking.findById(req.body.booking) : Promise.resolve(null),
      req.body.order ? Order.findById(req.body.order) : Promise.resolve(null),
    ]);
    if (req.body.booking && !booking) return res.status(400).json({ message: 'booking not found' });
    if (req.body.order && !order) return res.status(400).json({ message: 'order not found' });

    if (paymentMethod === 'BANK_TRANSFER' && !req.file) {
      return res.status(400).json({ message: 'Bank transfer slip is required' });
    }

    const payload = {
      booking: booking?._id,
      order: order?._id,
      amount: amount.value,
      paymentMethod,
      paymentStatus,
      transactionId: req.body.transactionId || undefined,
      paymentReference: req.body.paymentReference || undefined,
      bankAccountName: req.body.bankAccountName || undefined,
      bankName: req.body.bankName || undefined,
      bankAccountNumber: req.body.bankAccountNumber || undefined,
      bankBranch: req.body.bankBranch || undefined,
    };

    if (req.file) {
      payload.slipPath = `/uploads/payment-slips/${req.file.filename}`;
      payload.slipOriginalName = req.file.originalname;
    }

    res.json(await Payment.create(payload));
  } catch (err) {
    if (req.file?.path) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/status', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    const nextStatus = `${req.body.paymentStatus || req.body.status || ''}`.toUpperCase();
    if (!VALID_PAYMENT_STATUSES.includes(nextStatus)) {
      return res.status(400).json({ message: 'Invalid paymentStatus' });
    }

    payment.paymentStatus = nextStatus;
    if (req.body.transactionId != null) payment.transactionId = req.body.transactionId;
    if (req.body.paymentReference != null) payment.paymentReference = req.body.paymentReference;
    await payment.save();

    if (payment.order) {
      const order = await Order.findById(payment.order);
      if (order) {
        order.status = nextStatus === 'PAID' ? 'PAID' : nextStatus === 'PENDING_VERIFICATION' ? 'PENDING' : order.status;
        await order.save();
      }
    }

    if (payment.booking) {
      const booking = await Booking.findById(payment.booking);
      if (booking) {
        if (nextStatus === 'PAID') booking.status = 'Confirmed';
        if (nextStatus === 'PENDING_VERIFICATION') booking.status = 'PENDING';
        await booking.save();
      }
    }

    res.json(await Payment.findById(payment._id).populate('booking order'));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
