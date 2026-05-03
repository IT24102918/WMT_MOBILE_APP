const router = require('express').Router();
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const StockLog = require('../models/StockLog');

const VALID_STATUSES = ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'EXPIRED'];

function normalizeStatus(value) {
  if (!value) return null;
  return `${value}`.trim().toUpperCase().replace(/\s+/g, '_');
}

function deriveStockStatus({ quantity, minReorderLevel, expiryDate, requestedStatus }) {
  const now = new Date();
  if (expiryDate && new Date(expiryDate) < now) return 'EXPIRED';

  const normalizedRequested = normalizeStatus(requestedStatus);
  if (normalizedRequested && VALID_STATUSES.includes(normalizedRequested)) {
    return normalizedRequested;
  }

  const qty = Number(quantity || 0);
  const min = Number(minReorderLevel || 0);
  if (qty <= 0) return 'OUT_OF_STOCK';
  if (min > 0 && qty <= min) return 'LOW_STOCK';
  return 'IN_STOCK';
}

function validateInventoryPayload(body, { partial = false } = {}) {
  const errors = [];

  if (!partial) {
    if (!body.product) errors.push('product is required');
    if (body.quantity == null || `${body.quantity}` === '') errors.push('quantity is required');
    if (!body.warehouseLocation || `${body.warehouseLocation}`.trim() === '') errors.push('warehouseLocation is required');
  }

  if (body.quantity != null) {
    const quantity = Number(body.quantity);
    if (Number.isNaN(quantity) || quantity < 0) errors.push('quantity must be zero or a positive number');
  }

  if (body.minReorderLevel != null && `${body.minReorderLevel}` !== '') {
    const level = Number(body.minReorderLevel);
    if (Number.isNaN(level) || level < 0) errors.push('minReorderLevel must be zero or a positive number');
  }

  if (body.warehouseLocation != null && `${body.warehouseLocation}`.trim() === '') {
    errors.push('warehouseLocation is required');
  }

  if (body.stockStatus != null) {
    const status = normalizeStatus(body.stockStatus);
    if (!VALID_STATUSES.includes(status)) {
      errors.push(`stockStatus must be one of ${VALID_STATUSES.join(', ')}`);
    }
  }

  if (body.expiryDate) {
    const expiryDate = new Date(body.expiryDate);
    if (Number.isNaN(expiryDate.getTime())) errors.push('expiryDate must be a valid date');
  }

  return errors;
}

async function syncProductStock(productId, quantity) {
  await Product.findByIdAndUpdate(productId, { stockQuantity: Number(quantity || 0) });
}

async function createStockLog(entry) {
  await StockLog.create({
    product: entry.product,
    changeType: entry.changeType,
    quantityChanged: entry.quantityChanged,
    warehouseLocation: entry.warehouseLocation,
    stockStatus: entry.stockStatus,
    note: entry.note || '',
  });
}

async function populateInventory(id) {
  return Inventory.findById(id).populate('product');
}

router.get('/', async (req, res) => {
  try {
    const items = await Inventory.find().populate('product').sort({ warehouseLocation: 1, _id: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/low-stock', async (req, res) => {
  try {
    const all = await Inventory.find().populate('product').sort({ quantity: 1 });
    const low = all.filter((item) => {
      const status = item.stockStatus || deriveStockStatus(item);
      return status === 'LOW_STOCK' || status === 'OUT_OF_STOCK';
    });
    res.json(low);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/product/:productId', async (req, res) => {
  try {
    const inv = await Inventory.findOne({ product: req.params.productId }).populate('product');
    if (!inv) return res.status(404).json({ message: 'Inventory item not found' });
    res.json(inv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const inv = await Inventory.findById(req.params.id).populate('product');
    if (!inv) return res.status(404).json({ message: 'Inventory item not found' });
    res.json(inv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const errors = validateInventoryPayload(req.body);
    if (errors.length) return res.status(400).json({ message: errors[0], errors });

    const product = await Product.findById(req.body.product);
    if (!product) return res.status(400).json({ message: 'product not found' });

    const existing = await Inventory.findOne({ product: product._id });
    if (existing) return res.status(400).json({ message: 'Inventory already exists for this product. Edit the existing stock item instead.' });

    const stockStatus = deriveStockStatus({
      quantity: req.body.quantity,
      minReorderLevel: req.body.minReorderLevel,
      expiryDate: req.body.expiryDate,
      requestedStatus: req.body.stockStatus,
    });

    const saved = await Inventory.create({
      product: product._id,
      quantity: Number(req.body.quantity),
      minReorderLevel: req.body.minReorderLevel != null && `${req.body.minReorderLevel}` !== '' ? Number(req.body.minReorderLevel) : 0,
      warehouseLocation: `${req.body.warehouseLocation}`.trim(),
      expiryDate: req.body.expiryDate || undefined,
      stockStatus,
    });

    await syncProductStock(saved.product, saved.quantity);
    await createStockLog({
      product: saved.product,
      changeType: 'STOCK_IN',
      quantityChanged: saved.quantity,
      warehouseLocation: saved.warehouseLocation,
      stockStatus: saved.stockStatus,
      note: req.body.note || 'Inventory item created',
    });

    res.json(await populateInventory(saved._id));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const errors = validateInventoryPayload(req.body, { partial: true });
    if (errors.length) return res.status(400).json({ message: errors[0], errors });

    const existing = await Inventory.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Inventory item not found' });

    if (req.body.product) {
      const product = await Product.findById(req.body.product);
      if (!product) return res.status(400).json({ message: 'product not found' });

      const duplicate = await Inventory.findOne({ product: product._id, _id: { $ne: existing._id } });
      if (duplicate) return res.status(400).json({ message: 'Another inventory item already exists for this product' });
      existing.product = product._id;
    }

    const oldQty = Number(existing.quantity || 0);
    const nextQty = req.body.quantity != null ? Number(req.body.quantity) : oldQty;

    if (req.body.quantity != null) existing.quantity = nextQty;
    if (req.body.minReorderLevel != null && `${req.body.minReorderLevel}` !== '') existing.minReorderLevel = Number(req.body.minReorderLevel);
    if (req.body.warehouseLocation != null) existing.warehouseLocation = `${req.body.warehouseLocation}`.trim();
    if (req.body.expiryDate !== undefined) existing.expiryDate = req.body.expiryDate || undefined;
    existing.stockStatus = deriveStockStatus({
      quantity: existing.quantity,
      minReorderLevel: existing.minReorderLevel,
      expiryDate: existing.expiryDate,
      requestedStatus: req.body.stockStatus ?? existing.stockStatus,
    });

    const saved = await existing.save();
    const diff = nextQty - oldQty;

    await syncProductStock(saved.product, saved.quantity);

    if (
      diff !== 0 ||
      req.body.warehouseLocation != null ||
      req.body.expiryDate !== undefined ||
      req.body.stockStatus != null ||
      req.body.minReorderLevel != null
    ) {
      await createStockLog({
        product: saved.product,
        changeType: diff > 0 ? 'STOCK_IN' : diff < 0 ? 'STOCK_OUT' : 'STOCK_UPDATE',
        quantityChanged: diff,
        warehouseLocation: saved.warehouseLocation,
        stockStatus: saved.stockStatus,
        note: req.body.note || 'Inventory item updated',
      });
    }

    res.json(await populateInventory(saved._id));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const inv = await Inventory.findByIdAndDelete(req.params.id);
    if (!inv) return res.status(404).json({ message: 'Inventory item not found' });

    await syncProductStock(inv.product, 0);
    await createStockLog({
      product: inv.product,
      changeType: 'STOCK_REMOVED',
      quantityChanged: -Number(inv.quantity || 0),
      warehouseLocation: inv.warehouseLocation,
      stockStatus: 'OUT_OF_STOCK',
      note: 'Inventory item removed',
    });

    res.json({ message: 'Inventory item deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
