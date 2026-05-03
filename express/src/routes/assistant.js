const router = require('express').Router();
const Booking = require('../models/Booking');
const Category = require('../models/Category');
const Driver = require('../models/Driver');
const Inventory = require('../models/Inventory');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Performer = require('../models/Performer');
const PerformerAvailability = require('../models/PerformerAvailability');
const Product = require('../models/Product');
const PurchaseOrder = require('../models/PurchaseOrder');
const StockLog = require('../models/StockLog');
const StockRequest = require('../models/StockRequest');
const Supplier = require('../models/Supplier');
const SupplierProduct = require('../models/SupplierProduct');
const ThowilType = require('../models/ThowilType');
const TransportAssignment = require('../models/TransportAssignment');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const VehicleMaintenance = require('../models/VehicleMaintenance');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function pick(value, fallback = null) {
  return value == null ? fallback : value;
}

function simplifyDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function textFromGeminiResponse(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts || [];
  return parts.map((part) => part.text || '').join('').trim();
}

function trimHistory(history = []) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((item) => item && (item.role === 'user' || item.role === 'assistant') && item.text)
    .slice(-8)
    .map((item) => ({
      role: item.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: `${item.text}`.slice(0, 2000) }],
    }));
}

async function buildCommonContext() {
  const [thowilTypes, products, categories] = await Promise.all([
    ThowilType.find().sort({ basePrice: 1 }).lean(),
    Product.find().populate('category').sort({ name: 1 }).limit(20).lean(),
    Category.find().sort({ name: 1 }).lean(),
  ]);

  return {
    ritualTypes: thowilTypes.map((item) => ({
      name: item.name,
      basePrice: item.basePrice,
      description: item.description || null,
    })),
    products: products.map((item) => ({
      name: item.name,
      price: item.price,
      stockQuantity: item.stockQuantity,
      category: item.category?.name || null,
    })),
    categories: categories.map((item) => item.name),
  };
}

async function buildCustomerContext(userId) {
  const [bookings, orders] = await Promise.all([
    Booking.find({ user: userId })
      .populate('performer thowilType')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    Order.find({ user: userId })
      .sort({ orderDate: -1 })
      .limit(10)
      .lean(),
  ]);

  const orderIds = orders.map((item) => item._id);
  const orderItems = orderIds.length
    ? await OrderItem.find({ order: { $in: orderIds } }).populate('product').lean()
    : [];
  const itemsByOrder = new Map();
  orderItems.forEach((item) => {
    const key = String(item.order);
    const existing = itemsByOrder.get(key) || [];
    existing.push({
      product: item.product?.name || 'Item',
      quantity: item.quantity,
      price: item.price,
    });
    itemsByOrder.set(key, existing);
  });

  return {
    bookings: bookings.map((item) => ({
      ritual: item.thowilType?.name || null,
      performer: item.performer?.name || null,
      eventDate: simplifyDate(item.eventDate),
      status: item.status,
      totalAmount: item.totalAmount,
    })),
    orders: orders.map((item) => ({
      orderDate: simplifyDate(item.orderDate),
      status: item.status,
      totalAmount: item.totalAmount,
      items: itemsByOrder.get(String(item._id)) || [],
    })),
  };
}

async function buildPerformerContext(userId) {
  const performer = await Performer.findOne({ user: userId }).lean();
  if (!performer) {
    return { performer: null, availability: [], bookings: [] };
  }

  const [availability, bookings] = await Promise.all([
    PerformerAvailability.find({ performer: performer._id }).sort({ availableDate: 1 }).limit(20).lean(),
    Booking.find({ performer: performer._id })
      .populate('user thowilType')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
  ]);

  return {
    performer: {
      name: performer.name,
      rating: performer.rating,
      experienceYears: performer.experienceYears,
      location: performer.location,
    },
    availability: availability.map((item) => ({
      availableDate: simplifyDate(item.availableDate),
      status: item.status,
    })),
    bookings: bookings.map((item) => ({
      customer: item.user?.name || null,
      ritual: item.thowilType?.name || null,
      eventDate: simplifyDate(item.eventDate),
      status: item.status,
      totalAmount: item.totalAmount,
    })),
  };
}

async function buildSupplierContext(userId) {
  const supplier = await Supplier.findOne({ user: userId }).lean();
  const supplierFilter = supplier ? { supplier: supplier._id } : {};

  const [suppliers, purchaseOrders, stockRequests, supplierProducts] = await Promise.all([
    Supplier.find().sort({ name: 1 }).limit(20).lean(),
    PurchaseOrder.find(supplierFilter)
      .populate('supplier product stockRequest')
      .sort({ orderDate: -1 })
      .limit(15)
      .lean(),
    StockRequest.find().populate('product purchaseOrder').sort({ createdAt: -1 }).limit(15).lean(),
    SupplierProduct.find(supplierFilter).populate('supplier product').sort({ _id: -1 }).limit(20).lean(),
  ]);

  return {
    currentSupplier: supplier
      ? {
          name: supplier.name,
          contactPerson: supplier.contactPerson,
          rating: supplier.rating,
        }
      : null,
    suppliers: suppliers.map((item) => ({
      name: item.name,
      contactPerson: item.contactPerson,
      phone: item.phone,
      email: item.email,
      rating: item.rating,
    })),
    purchaseOrders: purchaseOrders.map((item) => ({
      supplier: item.supplier?.name || null,
      product: item.product?.name || null,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalAmount: item.totalAmount,
      status: item.status,
      orderDate: simplifyDate(item.orderDate),
    })),
    stockRequests: stockRequests.map((item) => ({
      product: item.product?.name || null,
      requestedQuantity: item.requestedQuantity,
      status: item.status,
      requestedBy: item.requestedBy,
    })),
    suppliedProducts: supplierProducts.map((item) => ({
      supplier: item.supplier?.name || null,
      product: item.product?.name || null,
      supplyPrice: item.supplyPrice,
      currentInventory: pick(item.currentInventory, null),
    })),
  };
}

async function buildDriverContext(userId) {
  const driver = await Driver.findOne({ user: userId }).lean();
  const driverFilter = driver ? { driver: driver._id } : {};

  const [vehicles, assignments, maintenance] = await Promise.all([
    Vehicle.find().sort({ _id: -1 }).limit(20).lean(),
    TransportAssignment.find(driverFilter)
      .populate('vehicle driver booking order')
      .sort({ departureTime: -1 })
      .limit(15)
      .lean(),
    VehicleMaintenance.find().populate('vehicle').sort({ maintenanceDate: -1 }).limit(15).lean(),
  ]);

  return {
    currentDriver: driver
      ? {
          licenseNumber: driver.licenseNumber,
          experienceYears: driver.experienceYears,
          status: driver.status,
        }
      : null,
    vehicles: vehicles.map((item) => ({
      plateNumber: item.plateNumber,
      type: item.type,
      capacity: item.capacity,
      status: item.status,
    })),
    assignments: assignments.map((item) => ({
      destinationAddress: item.destinationAddress,
      departureTime: simplifyDate(item.departureTime),
      estimatedReturnTime: simplifyDate(item.estimatedReturnTime),
      taskStatus: item.taskStatus,
      transportCost: item.transportCost,
      vehicle: item.vehicle?.plateNumber || null,
    })),
    maintenance: maintenance.map((item) => ({
      vehicle: item.vehicle?.plateNumber || null,
      maintenanceType: item.maintenanceType,
      maintenanceDate: simplifyDate(item.maintenanceDate),
      status: item.status,
      cost: item.cost,
    })),
  };
}

async function buildInventoryContext() {
  const [inventory, lowStock, stockRequests, stockLogs, products, categories] = await Promise.all([
    Inventory.find().populate('product').sort({ warehouseLocation: 1 }).limit(25).lean(),
    Inventory.find().populate('product').sort({ quantity: 1 }).limit(25).lean(),
    StockRequest.find().populate('product').sort({ createdAt: -1 }).limit(20).lean(),
    StockLog.find().populate('product').sort({ changeDate: -1 }).limit(30).lean(),
    Product.find().populate('category').sort({ name: 1 }).limit(30).lean(),
    Category.find().sort({ name: 1 }).lean(),
  ]);

  return {
    inventory: inventory.map((item) => ({
      product: item.product?.name || null,
      quantity: item.quantity,
      minReorderLevel: item.minReorderLevel,
      warehouseLocation: item.warehouseLocation,
      expiryDate: simplifyDate(item.expiryDate),
      stockStatus: item.stockStatus,
    })),
    lowStock: lowStock
      .filter((item) => ['LOW_STOCK', 'OUT_OF_STOCK'].includes(item.stockStatus))
      .map((item) => ({
        product: item.product?.name || null,
        quantity: item.quantity,
        stockStatus: item.stockStatus,
      })),
    stockRequests: stockRequests.map((item) => ({
      product: item.product?.name || null,
      requestedQuantity: item.requestedQuantity,
      status: item.status,
      requestedBy: item.requestedBy,
    })),
    stockLogs: stockLogs.map((item) => ({
      product: item.product?.name || null,
      changeType: item.changeType,
      quantityChanged: item.quantityChanged,
      warehouseLocation: item.warehouseLocation,
      stockStatus: item.stockStatus,
      changeDate: simplifyDate(item.changeDate),
      note: item.note,
    })),
    products: products.map((item) => ({
      name: item.name,
      category: item.category?.name || null,
      price: item.price,
      stockQuantity: item.stockQuantity,
    })),
    categories: categories.map((item) => item.name),
  };
}

async function buildAdminContext() {
  const [userCount, bookingCount, orderCount, inventoryCount, supplierCount] = await Promise.all([
    User.countDocuments(),
    Booking.countDocuments(),
    Order.countDocuments(),
    Inventory.countDocuments(),
    Supplier.countDocuments(),
  ]);

  return {
    totals: {
      users: userCount,
      bookings: bookingCount,
      orders: orderCount,
      inventoryItems: inventoryCount,
      suppliers: supplierCount,
    },
  };
}

async function buildRoleContext({ userId, roleName }) {
  const upperRole = `${roleName || 'CUSTOMER'}`.toUpperCase();
  const common = await buildCommonContext();

  if (upperRole === 'PERFORMER') {
    return { roleContext: await buildPerformerContext(userId), common };
  }
  if (upperRole === 'SUPPLIER') {
    return { roleContext: await buildSupplierContext(userId), common };
  }
  if (upperRole === 'DRIVER') {
    return { roleContext: await buildDriverContext(userId), common };
  }
  if (upperRole === 'INVENTORY_MANAGER') {
    return { roleContext: await buildInventoryContext(), common };
  }
  if (upperRole === 'ADMIN') {
    return { roleContext: await buildAdminContext(), common };
  }

  return { roleContext: await buildCustomerContext(userId), common };
}

router.post('/chat', async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      return res.status(500).json({
        message: 'Gemini API key is not configured on the server. Add GEMINI_API_KEY to thowil-express/.env.',
      });
    }

    const message = `${req.body.message || ''}`.trim();
    const history = req.body.history || [];
    const userPayload = req.body.user || {};
    const userId = userPayload.id || userPayload._id;

    if (!message) return res.status(400).json({ message: 'message is required' });
    if (!userId) return res.status(400).json({ message: 'user id is required' });

    const dbUser = await User.findById(userId).populate('role').lean();
    if (!dbUser) return res.status(404).json({ message: 'User not found' });

    const roleName = userPayload.roleName || dbUser.role?.roleName || 'CUSTOMER';

    const context = await buildRoleContext({ userId, roleName });
    const promptContext = JSON.stringify(
      {
        currentUser: {
          id: userId,
          name: userPayload.name || dbUser.name || 'User',
          roleName,
        },
        ...context,
      },
      null,
      2
    );

    const systemInstruction = [
      'You are the Thowil mobile app assistant.',
      'Answer using the provided app data context and project domain knowledge only.',
      'Do not invent records, payments, bookings, stock, or statuses that are not in context.',
      'If the answer is not available in the provided data, say that clearly and suggest where in the app the user can check.',
      'Keep answers concise, helpful, and role-aware.',
      'Never reveal secrets, API keys, raw passwords, or internal implementation details.',
    ].join(' ');

    const contents = [
      {
        role: 'user',
        parts: [
          {
            text: `App data context:\n${promptContext}\n\nUse this context to answer questions about the Thowil app.`,
          },
        ],
      },
      ...trimHistory(history),
      {
        role: 'user',
        parts: [{ text: message }],
      },
    ];

    const geminiResponse = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemInstruction }],
        },
        contents,
      }),
    });

    const payload = await geminiResponse.json();
    if (!geminiResponse.ok) {
      return res.status(geminiResponse.status).json({
        message: payload?.error?.message || 'Gemini request failed',
      });
    }

    const reply = textFromGeminiResponse(payload);
    if (!reply) {
      return res.status(500).json({ message: 'Gemini returned an empty response' });
    }

    res.json({ reply });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
