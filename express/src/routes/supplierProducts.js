const router = require('express').Router();
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const SupplierProduct = require('../models/SupplierProduct');

async function syncInventory(productId, currentInventory) {
  if (currentInventory == null || currentInventory === '') return;

  const quantity = Number(currentInventory);
  let inventory = await Inventory.findOne({ product: productId });

  if (inventory) {
    inventory.quantity = quantity;
    await inventory.save();
  } else {
    inventory = await Inventory.create({
      product: productId,
      quantity,
      minReorderLevel: 10,
      warehouseLocation: 'Default Warehouse',
    });
  }

  await Product.findByIdAndUpdate(productId, { stockQuantity: quantity });
}

function validateSupplierProductPayload(body, { partial = false } = {}) {
  const errors = [];

  if (!partial) {
    if (!body.supplier) errors.push('supplier is required');
    if (!body.product) errors.push('product is required');
    if (body.supplyPrice == null || `${body.supplyPrice}` === '') errors.push('supplyPrice is required');
  }

  if (body.supplyPrice != null) {
    const supplyPrice = Number(body.supplyPrice);
    if (Number.isNaN(supplyPrice) || supplyPrice <= 0) errors.push('supplyPrice must be a positive number');
  }

  if (body.currentInventory != null && body.currentInventory !== '') {
    const currentInventory = Number(body.currentInventory);
    if (Number.isNaN(currentInventory) || currentInventory < 0) errors.push('currentInventory must be zero or a positive number');
  }

  return errors;
}

async function attachInventory(items) {
  const productIds = items.map((item) => item.product?._id || item.product).filter(Boolean);
  const inventoryRows = await Inventory.find({ product: { $in: productIds } });
  const inventoryMap = new Map(inventoryRows.map((row) => [String(row.product), row.quantity || 0]));

  return items.map((item) => ({
    ...item.toObject(),
    currentInventory: inventoryMap.get(String(item.product?._id || item.product)) ?? Number(item.product?.stockQuantity || 0),
  }));
}

router.get('/', async (req, res) => {
  try {
    const items = await SupplierProduct.find().populate('supplier product').sort({ createdAt: -1, _id: -1 });
    res.json(await attachInventory(items));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/supplier/:supplierId', async (req, res) => {
  try {
    const items = await SupplierProduct.find({ supplier: req.params.supplierId }).populate('supplier product');
    res.json(await attachInventory(items));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const errors = validateSupplierProductPayload(req.body);
    if (errors.length) return res.status(400).json({ message: errors[0], errors });

    const [supplier, product] = await Promise.all([
      Supplier.findById(req.body.supplier),
      Product.findById(req.body.product),
    ]);
    if (!supplier) return res.status(400).json({ message: 'supplier not found' });
    if (!product) return res.status(400).json({ message: 'product not found' });

    const existing = await SupplierProduct.findOne({ supplier: supplier._id, product: product._id });
    if (existing) return res.status(400).json({ message: 'Supplier product already exists for this supplier and product' });

    const item = await SupplierProduct.create({
      supplier: supplier._id,
      product: product._id,
      supplyPrice: Number(req.body.supplyPrice),
    });

    await syncInventory(product._id, req.body.currentInventory);
    const populated = await SupplierProduct.findById(item._id).populate('supplier product');
    const [withInventory] = await attachInventory([populated]);
    res.json(withInventory);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const errors = validateSupplierProductPayload(req.body, { partial: true });
    if (errors.length) return res.status(400).json({ message: errors[0], errors });

    const item = await SupplierProduct.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Supplier product not found' });

    if (req.body.supplier) {
      const supplier = await Supplier.findById(req.body.supplier);
      if (!supplier) return res.status(400).json({ message: 'supplier not found' });
      item.supplier = supplier._id;
    }

    if (req.body.product) {
      const product = await Product.findById(req.body.product);
      if (!product) return res.status(400).json({ message: 'product not found' });
      item.product = product._id;
    }

    if (req.body.supplyPrice != null) item.supplyPrice = Number(req.body.supplyPrice);
    await item.save();

    await syncInventory(item.product, req.body.currentInventory);
    const populated = await SupplierProduct.findById(item._id).populate('supplier product');
    const [withInventory] = await attachInventory([populated]);
    res.json(withInventory);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const item = await SupplierProduct.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Supplier product not found' });
    res.json({ message: 'Supplier product deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
