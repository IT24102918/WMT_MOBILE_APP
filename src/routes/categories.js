const router = require('express').Router();
const Category = require('../models/Category');
const Product = require('../models/Product');

function escapeRegex(value) {
  return `${value}`.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function validateCategoryPayload(body) {
  const errors = [];
  if (!body.name || `${body.name}`.trim() === '') errors.push('name is required');
  return errors;
}

async function findCategoryByName(name, excludeId) {
  const query = {
    name: { $regex: `^${escapeRegex(name.trim())}$`, $options: 'i' },
  };
  if (excludeId) query._id = { $ne: excludeId };
  return Category.findOne(query);
}

router.get('/', async (req, res) => {
  try {
    res.json(await Category.find().sort({ name: 1 }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const errors = validateCategoryPayload(req.body);
    if (errors.length) return res.status(400).json({ message: errors[0], errors });

    const duplicate = await findCategoryByName(req.body.name);
    if (duplicate) return res.status(400).json({ message: 'Category already exists' });

    const category = await Category.create({
      name: `${req.body.name}`.trim(),
    });

    res.json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const errors = validateCategoryPayload(req.body);
    if (errors.length) return res.status(400).json({ message: errors[0], errors });

    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    const duplicate = await findCategoryByName(req.body.name, category._id);
    if (duplicate) return res.status(400).json({ message: 'Category already exists' });

    category.name = `${req.body.name}`.trim();
    await category.save();
    res.json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    await Product.updateMany({ category: category._id }, { $unset: { category: 1 } });
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
