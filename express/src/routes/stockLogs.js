const router = require('express').Router();
const Product = require('../models/Product');
const StockLog = require('../models/StockLog');

function validatePayload(body) {
  const errors = [];

  if (!body.product) errors.push('product is required');
  if (!body.changeType) errors.push('changeType is required');
  if (body.quantityChanged == null || `${body.quantityChanged}` === '') errors.push('quantityChanged is required');

  if (body.quantityChanged != null) {
    const qty = Number(body.quantityChanged);
    if (Number.isNaN(qty)) errors.push('quantityChanged must be a valid number');
  }

  return errors;
}

router.get('/', async (req, res) => {
  try {
    const logs = await StockLog.find().populate('product').sort({ changeDate: -1, _id: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/product/:productId', async (req, res) => {
  try {
    const logs = await StockLog.find({ product: req.params.productId }).populate('product').sort({ changeDate: -1, _id: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const errors = validatePayload(req.body);
    if (errors.length) return res.status(400).json({ message: errors[0], errors });

    const product = await Product.findById(req.body.product);
    if (!product) return res.status(400).json({ message: 'product not found' });

    const log = await StockLog.create({
      product: product._id,
      changeType: req.body.changeType,
      quantityChanged: Number(req.body.quantityChanged),
      warehouseLocation: req.body.warehouseLocation || '',
      stockStatus: req.body.stockStatus || '',
      note: req.body.note || '',
    });
    res.json(await log.populate('product'));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
