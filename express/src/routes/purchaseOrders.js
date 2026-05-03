const router = require('express').Router();
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const PurchaseOrder = require('../models/PurchaseOrder');
const StockLog = require('../models/StockLog');
const StockRequest = require('../models/StockRequest');
const Supplier = require('../models/Supplier');

async function syncInventoryQuantity(productId, nextQuantity, changeType, quantityChanged) {
  let inventory = await Inventory.findOne({ product: productId });

  if (inventory) {
    inventory.quantity = nextQuantity;
    await inventory.save();
  } else {
    inventory = await Inventory.create({
      product: productId,
      quantity: nextQuantity,
      minReorderLevel: 10,
      warehouseLocation: 'Default Warehouse',
    });
  }

  await Product.findByIdAndUpdate(productId, { stockQuantity: nextQuantity });

  if (quantityChanged !== 0) {
    await StockLog.create({
      product: productId,
      changeType,
      quantityChanged,
    });
  }

  return inventory;
}

function validatePurchaseOrderPayload(body, { partial = false } = {}) {
  const errors = [];
  const requiredFields = ['supplier', 'product', 'quantity', 'unitPrice'];

  if (!partial) {
    requiredFields.forEach((field) => {
      if (body[field] == null || `${body[field]}`.trim?.() === '') {
        errors.push(`${field} is required`);
      }
    });
  }

  if (body.quantity != null) {
    const quantity = Number(body.quantity);
    if (Number.isNaN(quantity) || quantity <= 0) errors.push('quantity must be a positive number');
  }

  if (body.unitPrice != null) {
    const unitPrice = Number(body.unitPrice);
    if (Number.isNaN(unitPrice) || unitPrice <= 0) errors.push('unitPrice must be a positive number');
  }

  return errors;
}

async function populatePurchaseOrder(id) {
  return PurchaseOrder.findById(id).populate('supplier product stockRequest');
}

router.get('/', async (req, res) => {
  try {
    const orders = await PurchaseOrder.find()
      .populate('supplier product stockRequest')
      .sort({ orderDate: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/supplier/:supplierId', async (req, res) => {
  try {
    const orders = await PurchaseOrder.find({ supplier: req.params.supplierId })
      .populate('supplier product stockRequest')
      .sort({ orderDate: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const errors = validatePurchaseOrderPayload(req.body);
    if (errors.length) return res.status(400).json({ message: errors[0], errors });

    const [supplier, product] = await Promise.all([
      Supplier.findById(req.body.supplier),
      Product.findById(req.body.product),
    ]);

    if (!supplier) return res.status(400).json({ message: 'supplier not found' });
    if (!product) return res.status(400).json({ message: 'product not found' });

    let stockRequest = null;
    if (req.body.stockRequest) {
      stockRequest = await StockRequest.findById(req.body.stockRequest);
      if (!stockRequest) return res.status(400).json({ message: 'stockRequest not found' });
    }

    const quantity = Number(req.body.quantity);
    const unitPrice = Number(req.body.unitPrice);

    const order = await PurchaseOrder.create({
      supplier: supplier._id,
      product: product._id,
      stockRequest: stockRequest?._id,
      quantity,
      unitPrice,
      totalAmount: quantity * unitPrice,
      status: req.body.status || 'PENDING',
    });

    if (stockRequest) {
      stockRequest.status = 'PO_CREATED';
      stockRequest.purchaseOrder = order._id;
      await stockRequest.save();
    }

    res.json(await populatePurchaseOrder(order._id));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const errors = validatePurchaseOrderPayload(req.body, { partial: true });
    if (errors.length) return res.status(400).json({ message: errors[0], errors });

    const order = await PurchaseOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Purchase order not found' });
    const previousStockRequestId = order.stockRequest ? String(order.stockRequest) : null;

    if (req.body.supplier) {
      const supplier = await Supplier.findById(req.body.supplier);
      if (!supplier) return res.status(400).json({ message: 'supplier not found' });
      order.supplier = supplier._id;
    }

    if (req.body.product) {
      const product = await Product.findById(req.body.product);
      if (!product) return res.status(400).json({ message: 'product not found' });
      order.product = product._id;
    }

    if (req.body.stockRequest !== undefined) {
      if (!req.body.stockRequest) {
        order.stockRequest = undefined;
      } else {
        const stockRequest = await StockRequest.findById(req.body.stockRequest);
        if (!stockRequest) return res.status(400).json({ message: 'stockRequest not found' });
        order.stockRequest = stockRequest._id;
        stockRequest.status = 'PO_CREATED';
        stockRequest.purchaseOrder = order._id;
        await stockRequest.save();
      }
    }

    const nextStockRequestId = order.stockRequest ? String(order.stockRequest) : null;
    if (previousStockRequestId && previousStockRequestId !== nextStockRequestId) {
      await StockRequest.findByIdAndUpdate(previousStockRequestId, {
        status: 'APPROVED',
        $unset: { purchaseOrder: 1 },
      });
    }

    if (req.body.quantity != null) order.quantity = Number(req.body.quantity);
    if (req.body.unitPrice != null) order.unitPrice = Number(req.body.unitPrice);
    if (req.body.status != null) order.status = req.body.status;
    order.totalAmount = Number(order.quantity || 0) * Number(order.unitPrice || 0);

    await order.save();
    res.json(await populatePurchaseOrder(order._id));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const order = await PurchaseOrder.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ message: 'Purchase order not found' });

    if (order.stockRequest) {
      await StockRequest.findByIdAndUpdate(order.stockRequest, {
        status: 'APPROVED',
        $unset: { purchaseOrder: 1 },
      });
    }

    res.json({ message: 'Purchase order deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/deliver', async (req, res) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Purchase order not found' });
    if (!order.product) return res.status(400).json({ message: 'Purchase order has no product' });

    const product = await Product.findById(order.product);
    if (!product) return res.status(400).json({ message: 'product not found' });

    const currentStock = Number(product.stockQuantity || 0);
    const deliveredQty = Number(order.quantity || 0);
    const nextStock = currentStock + deliveredQty;

    order.status = 'DELIVERED';
    order.deliveredAt = new Date();
    await order.save();

    await syncInventoryQuantity(order.product, nextStock, 'SUPPLIER_DELIVERY', deliveredQty);

    if (order.stockRequest) {
      await StockRequest.findByIdAndUpdate(order.stockRequest, { status: 'FULFILLED' });
    }

    res.json(await populatePurchaseOrder(order._id));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
