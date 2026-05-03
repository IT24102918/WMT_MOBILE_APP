const fs = require('fs');
const path = require('path');
const router = require('express').Router();
const multer = require('multer');
const Category = require('../models/Category');
const Inventory = require('../models/Inventory');
const OrderItem = require('../models/OrderItem');
const Product = require('../models/Product');
const PurchaseOrder = require('../models/PurchaseOrder');
const StockLog = require('../models/StockLog');
const StockRequest = require('../models/StockRequest');
const SupplierProduct = require('../models/SupplierProduct');

const PRODUCT_IMAGE_DIR = path.join(__dirname, '..', '..', 'uploads', 'product-images');

fs.mkdirSync(PRODUCT_IMAGE_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, PRODUCT_IMAGE_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
    cb(null, `product-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'));
      return;
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

function escapeRegex(value) {
  return `${value}`.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeImageUrl(value) {
  if (value == null) return undefined;
  const trimmed = `${value}`.trim();
  if (!trimmed) return '';
  return trimmed;
}

function isValidImageUrl(value) {
  if (!value) return true;
  return /^https?:\/\//i.test(value) || value.startsWith('/uploads/');
}

function removeLocalProductImage(imageUrl) {
  if (!imageUrl || !imageUrl.startsWith('/uploads/product-images/')) return;
  const filename = path.basename(imageUrl);
  const filePath = path.join(PRODUCT_IMAGE_DIR, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

function validateProductPayload(body, { partial = false } = {}) {
  const errors = [];

  if (!partial && (!body.name || `${body.name}`.trim() === '')) errors.push('name is required');

  if (body.name != null && `${body.name}`.trim() === '') errors.push('name is required');
  if (body.price != null) {
    const price = Number(body.price);
    if (Number.isNaN(price) || price < 0) errors.push('price must be zero or a positive number');
  }
  if (body.stockQuantity != null) {
    const stockQuantity = Number(body.stockQuantity);
    if (Number.isNaN(stockQuantity) || stockQuantity < 0) errors.push('stockQuantity must be zero or a positive number');
  }
  if (body.imageUrl !== undefined) {
    const imageUrl = normalizeImageUrl(body.imageUrl);
    if (!isValidImageUrl(imageUrl)) errors.push('imageUrl must start with http://, https://, or /uploads/');
  }

  return errors;
}

async function findProductByName(name, excludeId) {
  const query = {
    name: { $regex: `^${escapeRegex(name.trim())}$`, $options: 'i' },
  };
  if (excludeId) query._id = { $ne: excludeId };
  return Product.findOne(query);
}

async function resolveCategory(categoryId) {
  if (!categoryId) return undefined;
  const category = await Category.findById(categoryId);
  if (!category) throw new Error('category not found');
  return category._id;
}

router.get('/', async (req, res) => {
  try {
    res.json(await Product.find().populate('category').sort({ name: 1 }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category');
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const errors = validateProductPayload(req.body);
    if (errors.length) return res.status(400).json({ message: errors[0], errors });

    const duplicate = await findProductByName(req.body.name);
    if (duplicate) return res.status(400).json({ message: 'Product already exists' });

    let categoryId;
    try {
      categoryId = await resolveCategory(req.body.category);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }

    const product = await Product.create({
      name: `${req.body.name}`.trim(),
      description: req.body.description || '',
      price: req.body.price != null && `${req.body.price}` !== '' ? Number(req.body.price) : 0,
      stockQuantity: req.body.stockQuantity != null && `${req.body.stockQuantity}` !== '' ? Number(req.body.stockQuantity) : 0,
      category: categoryId,
      imageUrl: normalizeImageUrl(req.body.imageUrl) || '',
    });

    res.json(await Product.findById(product._id).populate('category'));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const errors = validateProductPayload(req.body, { partial: true });
    if (errors.length) return res.status(400).json({ message: errors[0], errors });

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (req.body.name != null) {
      const duplicate = await findProductByName(req.body.name, product._id);
      if (duplicate) return res.status(400).json({ message: 'Product already exists' });
      product.name = `${req.body.name}`.trim();
    }

    if (req.body.description != null) product.description = req.body.description;
    if (req.body.price != null) product.price = Number(req.body.price);
    if (req.body.stockQuantity != null) product.stockQuantity = Number(req.body.stockQuantity);
    if (req.body.imageUrl !== undefined) {
      const nextImageUrl = normalizeImageUrl(req.body.imageUrl) || '';
      if (!nextImageUrl && product.imageUrl) removeLocalProductImage(product.imageUrl);
      product.imageUrl = nextImageUrl;
    }
    if (req.body.category !== undefined) {
      try {
        product.category = await resolveCategory(req.body.category);
      } catch (error) {
        return res.status(400).json({ message: error.message });
      }
    }

    await product.save();
    res.json(await Product.findById(product._id).populate('category'));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    removeLocalProductImage(product.imageUrl);

    await Promise.all([
      Inventory.deleteMany({ product: product._id }),
      OrderItem.deleteMany({ product: product._id }),
      PurchaseOrder.deleteMany({ product: product._id }),
      StockLog.deleteMany({ product: product._id }),
      StockRequest.deleteMany({ product: product._id }),
      SupplierProduct.deleteMany({ product: product._id }),
    ]);

    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/image', upload.single('image'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Product not found' });
    }
    if (!req.file) return res.status(400).json({ message: 'Image file is required' });

    removeLocalProductImage(product.imageUrl);
    product.imageUrl = `/uploads/product-images/${req.file.filename}`;
    await product.save();

    res.json(await Product.findById(product._id).populate('category'));
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: err.message });
  }
});

router.get('/category/:categoryId', async (req, res) => {
  try {
    res.json(await Product.find({ category: req.params.categoryId }).populate('category').sort({ name: 1 }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
