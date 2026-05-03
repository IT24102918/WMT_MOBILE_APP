require('dotenv').config();
const express = require('express');
const cors = require('cors');
const os = require('os');
const path = require('path');
const connectDB = require('./src/config/db');
const seedDefaults = require('./src/config/seedDefaults');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth',              require('./src/routes/auth'));
app.use('/api/assistant',         require('./src/routes/assistant'));
app.use('/api/users',             require('./src/routes/users'));
app.use('/api/bookings',          require('./src/routes/bookings'));
app.use('/api/categories',        require('./src/routes/categories'));
app.use('/api/inventory',         require('./src/routes/inventory'));
app.use('/api/orders',            require('./src/routes/orders'));
app.use('/api/order-items',       require('./src/routes/orderItems'));
app.use('/api/payments',          require('./src/routes/payments'));
app.use('/api/performers',        require('./src/routes/performers'));
app.use('/api/availability',      require('./src/routes/availability'));
app.use('/api/performer-payouts', require('./src/routes/performerPayouts'));
app.use('/api/products',          require('./src/routes/products'));
app.use('/api/purchase-orders',   require('./src/routes/purchaseOrders'));
app.use('/api/stock-logs',        require('./src/routes/stockLogs'));
app.use('/api/stock-requests',    require('./src/routes/stockRequests'));
app.use('/api/suppliers',         require('./src/routes/suppliers'));
app.use('/api/supplier-products', require('./src/routes/supplierProducts'));
app.use('/api/thowil-types',      require('./src/routes/thowilTypes'));
app.use('/api/transport',         require('./src/routes/transport'));

// Health check
app.get('/', (req, res) => res.json({ status: 'Thowil API running', version: '1.0.0' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 8080;

function getLocalIPv4Addresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((item) => item && item.family === 'IPv4' && !item.internal)
    .map((item) => item.address);
}

async function startServer() {
  await connectDB();
  await seedDefaults();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    getLocalIPv4Addresses().forEach((address) => {
      console.log(`LAN URL: http://${address}:${PORT}`);
    });
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
