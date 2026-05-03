const router = require('express').Router();
const OrderItem = require('../models/OrderItem');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const StockLog = require('../models/StockLog');
const { ensureRequired, parsePositiveNumber } = require('../utils/validation');

function deriveStockStatus(quantity, minReorderLevel = 0, expiryDate) {
  if (expiryDate) {
    const parsedExpiry = new Date(expiryDate);
    if (!Number.isNaN(parsedExpiry.getTime())) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      parsedExpiry.setHours(0, 0, 0, 0);
      if (parsedExpiry < now) return 'EXPIRED';
    }
  }

  if (quantity <= 0) return 'OUT_OF_STOCK';
  if (quantity <= Number(minReorderLevel || 0)) return 'LOW_STOCK';
  return 'IN_STOCK';
}

router.get('/', async (req, res) => {
  try { res.json(await OrderItem.find().populate('order product')); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/order/:orderId', async (req, res) => {
  try { res.json(await OrderItem.find({ order: req.params.orderId }).populate('order product')); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const errors = ensureRequired(req.body, ['order', 'product', 'quantity', 'price']);
    if (errors.length) return res.status(400).json({ message: errors[0], errors });
    const [order, product] = await Promise.all([
      Order.findById(req.body.order),
      Product.findById(req.body.product),
    ]);
    if (!order) return res.status(400).json({ message: 'order not found' });
    if (!product) return res.status(400).json({ message: 'product not found' });
    const quantity = parsePositiveNumber(req.body.quantity, 'quantity');
    if (quantity.error) return res.status(400).json({ message: quantity.error });
    const price = parsePositiveNumber(req.body.price, 'price', { allowZero: true });
    if (price.error) return res.status(400).json({ message: price.error });
    if ((product.stockQuantity || 0) < quantity.value) {
      return res.status(400).json({ message: `Only ${product.stockQuantity || 0} item(s) left in stock` });
    }

    const orderItem = await OrderItem.create({
      order: order._id,
      product: product._id,
      quantity: quantity.value,
      price: price.value,
    });

    product.stockQuantity = Number(product.stockQuantity || 0) - quantity.value;
    await product.save();

    const inventoryItem = await Inventory.findOne({ product: product._id }).sort({ createdAt: 1 });
    if (inventoryItem) {
      inventoryItem.quantity = Math.max(0, Number(inventoryItem.quantity || 0) - quantity.value);
      inventoryItem.stockStatus = deriveStockStatus(
        inventoryItem.quantity,
        inventoryItem.minReorderLevel,
        inventoryItem.expiryDate
      );
      await inventoryItem.save();

      await StockLog.create({
        product: product._id,
        changeType: 'STOCK_OUT',
        quantityChanged: -quantity.value,
        warehouseLocation: inventoryItem.warehouseLocation || 'Default Warehouse',
        stockStatus: inventoryItem.stockStatus,
        note: `Order ${(order._id || '').toString().slice(-6)} checkout`,
      });
    } else {
      await StockLog.create({
        product: product._id,
        changeType: 'STOCK_OUT',
        quantityChanged: -quantity.value,
        stockStatus: deriveStockStatus(product.stockQuantity || 0, 0, null),
        note: `Order ${(order._id || '').toString().slice(-6)} checkout`,
      });
    }

    res.json(await OrderItem.findById(orderItem._id).populate('order product'));
  }
  catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
