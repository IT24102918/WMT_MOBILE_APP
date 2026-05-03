const Booking = require('../models/Booking');
const Category = require('../models/Category');
const Inventory = require('../models/Inventory');
const OrderItem = require('../models/OrderItem');
const Product = require('../models/Product');
const StockLog = require('../models/StockLog');
const StockRequest = require('../models/StockRequest');
const SupplierProduct = require('../models/SupplierProduct');
const ThowilType = require('../models/ThowilType');

const DEFAULT_THOWIL_TYPES = [
  {
    name: 'Bali Thowil',
    description: 'Traditional healing and protection ritual for homes and families.',
    basePrice: 15000,
  },
  {
    name: 'Rata Yakuma',
    description: 'Protective ceremony for removing negative influences and restoring balance.',
    basePrice: 25000,
  },
  {
    name: 'Sanni Yakuma',
    description: 'Classic ritual focused on spiritual relief and wellbeing.',
    basePrice: 30000,
  },
  {
    name: 'Devol Maduwa',
    description: 'Blessing ritual for prosperity, peace, and protection.',
    basePrice: 18000,
  },
  {
    name: 'Maha Sohon Samayama',
    description: 'A stronger protective ritual traditionally used for severe spiritual disturbances and fear.',
    basePrice: 35000,
  },
  {
    name: 'Kohomba Kankariya',
    description: 'A ceremonial healing performance rooted in blessing, renewal, and community wellbeing.',
    basePrice: 42000,
  },
  {
    name: 'Gara Yakuma',
    description: 'A ritual sought for removing misfortune, calming unrest, and inviting household harmony.',
    basePrice: 22000,
  },
  {
    name: 'Suniyam Shanthikarma',
    description: 'A spiritual protection ceremony intended to counter harmful influences and restore peace.',
    basePrice: 28000,
  },
];

const DEFAULT_CATEGORIES = [
  { name: 'Offerings' },
  { name: 'Lamps & Oils' },
  { name: 'Flowers & Leaves' },
  { name: 'Drums & Sound' },
  { name: 'Incense & Powders' },
  { name: 'Protective Items' },
];

const DEFAULT_PRODUCTS = [
  {
    name: 'Coconut Oil Lamp Set',
    description: 'Brass oil lamp set with wicks for ritual blessings and evening offerings.',
    price: 4500,
    stockQuantity: 12,
    categoryName: 'Lamps & Oils',
    imageUrl: '/uploads/product-images/seed-coconut-oil-lamp-set.png',
  },
  {
    name: 'Sesame Ritual Oil Bottle',
    description: 'Pure sesame oil prepared for lamps, blessings, and traditional healing ceremonies.',
    price: 1800,
    stockQuantity: 18,
    categoryName: 'Lamps & Oils',
  },
  {
    name: 'Fresh Betel Leaf Bundle',
    description: 'Handpicked betel leaves suitable for offerings, blessings, and ceremonial trays.',
    price: 950,
    stockQuantity: 24,
    categoryName: 'Offerings',
    imageUrl: '/uploads/product-images/seed-fresh-betel-leaf-bundle.png',
  },
  {
    name: 'Areca Nut Offering Pack',
    description: 'Prepared areca nuts packed for ritual use and respectful temple-style offerings.',
    price: 1200,
    stockQuantity: 20,
    categoryName: 'Offerings',
    imageUrl: '/uploads/product-images/seed-areca-nut-offering-pack.png',
  },
  {
    name: 'Temple Flower Basket',
    description: 'Mixed lotus, araliya, and seasonal flowers arranged for devotional rituals.',
    price: 2200,
    stockQuantity: 10,
    categoryName: 'Flowers & Leaves',
    imageUrl: '/uploads/product-images/seed-temple-flower-basket.png',
  },
  {
    name: 'Neem & Mango Leaf Set',
    description: 'Ceremonial leaves bundled for entrance blessing, altar setups, and protection rites.',
    price: 1400,
    stockQuantity: 14,
    categoryName: 'Flowers & Leaves',
  },
  {
    name: 'Hand Ritual Drum',
    description: 'Compact drum crafted for chanting support, procession rhythm, and ritual music.',
    price: 8500,
    stockQuantity: 6,
    categoryName: 'Drums & Sound',
    imageUrl: '/uploads/product-images/seed-hand-ritual-drum.png',
  },
  {
    name: 'Bronze Bell',
    description: 'Traditional bell with a clear ceremonial tone for opening and closing rituals.',
    price: 2600,
    stockQuantity: 9,
    categoryName: 'Drums & Sound',
    imageUrl: '/uploads/product-images/seed-bronze-bell.png',
  },
  {
    name: 'Sandalwood Incense Pack',
    description: 'Long-burning incense sticks with a calm sandalwood fragrance for sacred spaces.',
    price: 900,
    stockQuantity: 30,
    categoryName: 'Incense & Powders',
    imageUrl: '/uploads/product-images/seed-sandalwood-incense-pack.png',
  },
  {
    name: 'Pirith Noole Set',
    description: 'Blessed protection thread set prepared for family use after ceremonies.',
    price: 700,
    stockQuantity: 25,
    categoryName: 'Protective Items',
  },
  {
    name: 'Turmeric & Saffron Powder Mix',
    description: 'Ceremonial powder blend for blessing marks, altar preparation, and ritual decor.',
    price: 1100,
    stockQuantity: 16,
    categoryName: 'Incense & Powders',
  },
  {
    name: 'Protective Charm Pouch',
    description: 'Small ritual pouch prepared for safekeeping blessed items and protective tokens.',
    price: 1500,
    stockQuantity: 11,
    categoryName: 'Protective Items',
  },
];

async function ensureUniqueNameIndex(Model) {
  await Model.collection.createIndex({ name: 1 }, { unique: true });
}

async function cleanupDuplicateNames(Model, reassignReferences = async () => {}) {
  const duplicateGroups = await Model.aggregate([
    {
      $group: {
        _id: '$name',
        ids: { $push: '$_id' },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);

  let removedCount = 0;

  for (const group of duplicateGroups) {
    const ids = [...group.ids].sort((a, b) => String(a).localeCompare(String(b)));
    const keepId = ids[0];
    const duplicateIds = ids.slice(1);

    await reassignReferences(keepId, duplicateIds);
    const deleteResult = await Model.deleteMany({ _id: { $in: duplicateIds } });
    removedCount += deleteResult.deletedCount || 0;
  }

  return removedCount;
}

async function upsertNamedDocument(Model, item) {
  await Model.findOneAndUpdate(
    { name: item.name },
    { $setOnInsert: item },
    { upsert: true, returnDocument: 'after' }
  );
}

async function seedDefaults() {
  const removedTypeDuplicates = await cleanupDuplicateNames(ThowilType, async (keepId, duplicateIds) => {
    await Booking.updateMany({ thowilType: { $in: duplicateIds } }, { $set: { thowilType: keepId } });
  });

  const removedCategoryDuplicates = await cleanupDuplicateNames(Category, async (keepId, duplicateIds) => {
    await Product.updateMany({ category: { $in: duplicateIds } }, { $set: { category: keepId } });
  });

  const removedProductDuplicates = await cleanupDuplicateNames(Product, async (keepId, duplicateIds) => {
    await Promise.all([
      Inventory.updateMany({ product: { $in: duplicateIds } }, { $set: { product: keepId } }),
      OrderItem.updateMany({ product: { $in: duplicateIds } }, { $set: { product: keepId } }),
      StockLog.updateMany({ product: { $in: duplicateIds } }, { $set: { product: keepId } }),
      StockRequest.updateMany({ product: { $in: duplicateIds } }, { $set: { product: keepId } }),
      SupplierProduct.updateMany({ product: { $in: duplicateIds } }, { $set: { product: keepId } }),
    ]);
  });

  if (removedTypeDuplicates > 0) {
    console.log(`Removed ${removedTypeDuplicates} duplicate thowil types`);
  }
  if (removedCategoryDuplicates > 0) {
    console.log(`Removed ${removedCategoryDuplicates} duplicate ritual item categories`);
  }
  if (removedProductDuplicates > 0) {
    console.log(`Removed ${removedProductDuplicates} duplicate ritual supply products`);
  }

  await ensureUniqueNameIndex(ThowilType);
  await ensureUniqueNameIndex(Category);
  await ensureUniqueNameIndex(Product);

  for (const type of DEFAULT_THOWIL_TYPES) {
    await upsertNamedDocument(ThowilType, type);
  }

  for (const category of DEFAULT_CATEGORIES) {
    await upsertNamedDocument(Category, category);
  }

  for (const product of DEFAULT_PRODUCTS) {
    const category = await Category.findOne({ name: product.categoryName });
    if (!category) continue;

    const payload = {
      name: product.name,
      description: product.description,
      price: product.price,
      stockQuantity: product.stockQuantity,
      category: category._id,
      imageUrl: product.imageUrl || '',
    };

    await upsertNamedDocument(Product, payload);

    if (product.imageUrl) {
      await Product.updateOne(
        { name: product.name, $or: [{ imageUrl: { $exists: false } }, { imageUrl: '' }, { imageUrl: null }] },
        { $set: { imageUrl: product.imageUrl } }
      );
    }
  }
}

module.exports = seedDefaults;
