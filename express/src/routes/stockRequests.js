const router = require('express').Router();
const Product = require('../models/Product');
const StockRequest = require('../models/StockRequest');

const VALID_STATUSES = ['PENDING', 'APPROVED', 'PO_CREATED', 'FULFILLED'];

function validateStockRequestPayload(body, { partial = false } = {}) {
  const errors = [];

  if (!partial) {
    if (!body.product) errors.push('product is required');
    if (body.requestedQuantity == null || `${body.requestedQuantity}` === '') errors.push('requestedQuantity is required');
  }

  if (body.requestedQuantity != null) {
    const qty = Number(body.requestedQuantity);
    if (Number.isNaN(qty) || qty <= 0) errors.push('requestedQuantity must be a positive number');
  }

  if (body.status != null && !VALID_STATUSES.includes(body.status)) {
    errors.push(`status must be one of ${VALID_STATUSES.join(', ')}`);
  }

  return errors;
}

router.get('/', async (req, res) => {
  try {
    const requests = await StockRequest.find().populate('product purchaseOrder').sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/pending', async (req, res) => {
  try {
    const requests = await StockRequest.find({ status: 'PENDING' }).populate('product purchaseOrder').sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const errors = validateStockRequestPayload(req.body);
    if (errors.length) return res.status(400).json({ message: errors[0], errors });

    const product = await Product.findById(req.body.product);
    if (!product) return res.status(400).json({ message: 'product not found' });

    const request = await StockRequest.create({
      product: product._id,
      requestedQuantity: Number(req.body.requestedQuantity),
      notes: req.body.notes || '',
      status: req.body.status || 'PENDING',
      requestedBy: req.body.requestedBy || 'Staff',
    });

    res.json(await request.populate('product purchaseOrder'));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const errors = validateStockRequestPayload(req.body, { partial: true });
    if (errors.length) return res.status(400).json({ message: errors[0], errors });

    const request = await StockRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Stock request not found' });

    if (req.body.product) {
      const product = await Product.findById(req.body.product);
      if (!product) return res.status(400).json({ message: 'product not found' });
      request.product = product._id;
    }

    if (req.body.requestedQuantity != null) request.requestedQuantity = Number(req.body.requestedQuantity);
    if (req.body.notes != null) request.notes = req.body.notes;
    if (req.body.status != null) request.status = req.body.status;
    if (req.body.requestedBy != null) request.requestedBy = req.body.requestedBy;

    await request.save();
    res.json(await request.populate('product purchaseOrder'));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/approve', async (req, res) => {
  try {
    const request = await StockRequest.findByIdAndUpdate(req.params.id, { status: 'APPROVED' }, { returnDocument: 'after' }).populate('product purchaseOrder');
    if (!request) return res.status(404).json({ message: 'Stock request not found' });
    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/po-created', async (req, res) => {
  try {
    const request = await StockRequest.findByIdAndUpdate(req.params.id, { status: 'PO_CREATED' }, { returnDocument: 'after' }).populate('product purchaseOrder');
    if (!request) return res.status(404).json({ message: 'Stock request not found' });
    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/fulfill', async (req, res) => {
  try {
    const request = await StockRequest.findByIdAndUpdate(req.params.id, { status: 'FULFILLED' }, { returnDocument: 'after' }).populate('product purchaseOrder');
    if (!request) return res.status(404).json({ message: 'Stock request not found' });
    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const request = await StockRequest.findByIdAndDelete(req.params.id);
    if (!request) return res.status(404).json({ message: 'Stock request not found' });
    res.json({ message: 'Stock request deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
