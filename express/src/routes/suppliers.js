const router = require('express').Router();
const StockRequest = require('../models/StockRequest');
const Supplier = require('../models/Supplier');
const SupplierProduct = require('../models/SupplierProduct');
const PurchaseOrder = require('../models/PurchaseOrder');

const PHONE_REGEX = /^0\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateSupplierPayload(body, { partial = false } = {}) {
  const errors = [];
  const requiredFields = ['name', 'contactPerson', 'phone', 'email', 'rating'];

  if (!partial) {
    requiredFields.forEach((field) => {
      if (body[field] == null || `${body[field]}`.trim?.() === '') {
        errors.push(`${field} is required`);
      }
    });
  }

  if (body.name != null && `${body.name}`.trim().length === 0) errors.push('name is required');
  if (body.contactPerson != null && `${body.contactPerson}`.trim().length === 0) errors.push('contactPerson is required');
  if (body.phone != null && !PHONE_REGEX.test(`${body.phone}`)) errors.push('phone must be a valid 10-digit number');
  if (body.email != null && !EMAIL_REGEX.test(`${body.email}`)) errors.push('email must be valid');
  if (body.rating != null) {
    const rating = Number(body.rating);
    if (Number.isNaN(rating) || rating < 0 || rating > 5) errors.push('rating must be between 0 and 5');
  }

  return errors;
}

router.get('/', async (req, res) => {
  try {
    const suppliers = await Supplier.find().populate('user').sort({ name: 1 });
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id).populate('user');
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    res.json(supplier);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const errors = validateSupplierPayload(req.body);
    if (errors.length) return res.status(400).json({ message: errors[0], errors });

    const supplier = await Supplier.create({
      user: req.body.user || undefined,
      name: `${req.body.name}`.trim(),
      contactPerson: `${req.body.contactPerson}`.trim(),
      phone: `${req.body.phone}`.trim(),
      email: `${req.body.email}`.trim().toLowerCase(),
      rating: Number(req.body.rating),
    });

    res.json(await supplier.populate('user'));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const errors = validateSupplierPayload(req.body, { partial: true });
    if (errors.length) return res.status(400).json({ message: errors[0], errors });

    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

    ['name', 'contactPerson', 'phone', 'email'].forEach((field) => {
      if (req.body[field] != null) supplier[field] = `${req.body[field]}`.trim();
    });
    if (req.body.email != null) supplier.email = `${req.body.email}`.trim().toLowerCase();
    if (req.body.rating != null) supplier.rating = Number(req.body.rating);

    await supplier.save();
    res.json(await supplier.populate('user'));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndDelete(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

    const relatedOrders = await PurchaseOrder.find({ supplier: supplier._id }, '_id stockRequest');
    const relatedStockRequestIds = relatedOrders
      .map((order) => order.stockRequest)
      .filter(Boolean);

    if (relatedStockRequestIds.length) {
      await StockRequest.updateMany(
        { _id: { $in: relatedStockRequestIds } },
        { status: 'APPROVED', $unset: { purchaseOrder: 1 } }
      );
    }

    await Promise.all([
      SupplierProduct.deleteMany({ supplier: supplier._id }),
      PurchaseOrder.deleteMany({ supplier: supplier._id }),
    ]);

    res.json({ message: 'Supplier deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
