# Thowil Express Backend

Express.js + MongoDB rewrite of the original Spring Boot backend.  
Every API endpoint, business rule, and auto-seeding behaviour from the original has been preserved.

---

## Tech Stack

| Layer       | Spring Boot (original) | Express (this project)     |
|-------------|------------------------|----------------------------|
| Framework   | Spring Boot 3          | Express 5                  |
| Database    | MySQL + JPA/Hibernate  | MongoDB + Mongoose         |
| Auth        | Plain-text compare     | Plain-text compare (same)  |
| CORS        | `@CrossOrigin("*")`    | `cors()` middleware        |

---

## Project Structure

```
thowil-express/
├── index.js                  # App entry point, route mounting
├── .env                      # Environment variables
├── src/
│   ├── config/
│   │   └── db.js             # MongoDB connection
│   ├── models/               # Mongoose schemas (one per entity)
│   │   ├── Role.js
│   │   ├── User.js
│   │   ├── ThowilType.js
│   │   ├── Performer.js
│   │   ├── PerformerAvailability.js
│   │   ├── PerformerPayout.js
│   │   ├── Booking.js
│   │   ├── Category.js
│   │   ├── Product.js
│   │   ├── Inventory.js
│   │   ├── StockLog.js
│   │   ├── StockRequest.js
│   │   ├── Supplier.js
│   │   ├── SupplierProduct.js
│   │   ├── PurchaseOrder.js
│   │   ├── Order.js
│   │   ├── OrderItem.js
│   │   ├── Payment.js
│   │   ├── Vehicle.js
│   │   ├── Driver.js
│   │   ├── TransportAssignment.js
│   │   └── VehicleMaintenance.js
│   └── routes/               # Express routers (one per controller)
│       ├── auth.js
│       ├── users.js
│       ├── bookings.js
│       ├── categories.js
│       ├── inventory.js
│       ├── orders.js
│       ├── orderItems.js
│       ├── payments.js
│       ├── performers.js
│       ├── availability.js
│       ├── performerPayouts.js
│       ├── products.js
│       ├── purchaseOrders.js
│       ├── stockLogs.js
│       ├── stockRequests.js
│       ├── suppliers.js
│       ├── supplierProducts.js
│       ├── thowilTypes.js
│       └── transport.js
```

---

## Setup & Run

### Prerequisites
- Node.js 18+
- MongoDB running locally (or a MongoDB Atlas URI)

### Install
```bash
npm install
```

### Configure
Edit `.env`:
```
PORT=8080
MONGODB_URI=mongodb://localhost:27017/thowil
```
For MongoDB Atlas replace the URI with your connection string.

### Start
```bash
# Production
npm start

# Development (with nodemon auto-reload)
npm run dev
```

---

## API Endpoints

All endpoints are at `http://localhost:8080`. CORS is open (`*`).

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login — body: `{ email, password }` |
| POST | `/api/auth/register?roleName=CUSTOMER` | Register user; roleName = `CUSTOMER`, `PERFORMER`, or `SUPPLIER` |

> Registering as `PERFORMER` auto-creates a `Performer` profile.  
> Registering as `SUPPLIER` auto-creates a `Supplier` profile.

### Users
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/users` | All users |
| GET | `/api/users/:id` | User by ID |
| POST | `/api/users` | Create user |
| DELETE | `/api/users/:id` | Delete user |

### Bookings
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/bookings` | All bookings |
| POST | `/api/bookings` | Create booking |
| GET | `/api/bookings/user/:userId` | Bookings by user |
| GET | `/api/bookings/performer/:userId` | Bookings by performer (pass user ID, resolves internally) |
| PUT | `/api/bookings/:id/status?status=CONFIRMED` | Update booking status |

### Performers
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/performers` | All performers |
| GET | `/api/performers/:id` | Performer by ID |
| POST | `/api/performers` | Create performer |
| DELETE | `/api/performers/:id` | Delete performer |

### Performer Availability
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/availability/performer/:userId` | Availability for a performer (by user ID) |
| GET | `/api/availability/date/:date` | Availability on a date (YYYY-MM-DD) |
| POST | `/api/availability/user/:userId` | Add availability (by user ID) |
| POST | `/api/availability/performer-id/:performerId` | Add availability (by performer ID) |
| DELETE | `/api/availability/:id` | Remove availability slot |

### Performer Payouts
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/performer-payouts` | All payouts |
| GET | `/api/performer-payouts/performer/:performerId` | By performer |
| GET | `/api/performer-payouts/booking/:bookingId` | By booking |
| POST | `/api/performer-payouts` | Create payout |

### Thowil Types
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/thowil-types` | All thowil types |

### Categories
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/categories` | All categories |
| POST | `/api/categories` | Create category |

### Products
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/products` | All products |
| POST | `/api/products` | Create product |
| GET | `/api/products/category/:categoryId` | Products by category |

### Inventory
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/inventory` | Full inventory |
| GET | `/api/inventory/low-stock` | Items at or below reorder level |
| GET | `/api/inventory/:id` | Inventory by ID |
| GET | `/api/inventory/product/:productId` | Inventory by product |
| POST | `/api/inventory` | Add inventory (auto-logs STOCK_IN) |
| PUT | `/api/inventory/:id` | Update inventory (auto-logs STOCK_IN/OUT on diff) |
| DELETE | `/api/inventory/:id` | Delete inventory record |

### Stock Logs
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stock-logs` | All stock logs |
| GET | `/api/stock-logs/product/:productId` | Logs by product |
| POST | `/api/stock-logs` | Create log entry |

### Stock Requests
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stock-requests` | All requests |
| GET | `/api/stock-requests/pending` | Pending requests |
| POST | `/api/stock-requests` | Create request |
| PUT | `/api/stock-requests/:id/approve` | Approve request |
| PUT | `/api/stock-requests/:id/fulfill` | Mark fulfilled |
| DELETE | `/api/stock-requests/:id` | Delete request |

### Orders
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/orders` | All orders |
| POST | `/api/orders` | Create order |
| GET | `/api/orders/user/:userId` | Orders by user |

### Order Items
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/order-items` | All order items |
| GET | `/api/order-items/order/:orderId` | Items by order |
| POST | `/api/order-items` | Add order item |

### Payments
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/payments` | All payments |
| POST | `/api/payments` | Process payment |

### Suppliers
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/suppliers` | All suppliers |
| GET | `/api/suppliers/:id` | Supplier by ID |
| POST | `/api/suppliers` | Create supplier |
| PUT | `/api/suppliers/:id` | Update supplier |
| DELETE | `/api/suppliers/:id` | Delete supplier |

### Supplier Products
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/supplier-products` | All supplier products |
| GET | `/api/supplier-products/supplier/:supplierId` | By supplier |
| POST | `/api/supplier-products` | Create link |
| DELETE | `/api/supplier-products/:id` | Remove link |

### Purchase Orders
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/purchase-orders` | All purchase orders |
| GET | `/api/purchase-orders/supplier/:supplierId` | By supplier |
| POST | `/api/purchase-orders` | Create PO |
| PUT | `/api/purchase-orders/:id` | Update PO |
| DELETE | `/api/purchase-orders/:id` | Delete PO |
| PUT | `/api/purchase-orders/:id/deliver?productId=&quantity=` | Mark delivered, auto-update inventory + stock log |

### Transport
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/transport/vehicles` | Add vehicle |
| GET | `/api/transport/vehicles` | All vehicles |
| PUT | `/api/transport/vehicles/:id/status?status=` | Update vehicle status |
| POST | `/api/transport/drivers` | Add driver |
| GET | `/api/transport/drivers` | All drivers |
| PUT | `/api/transport/drivers/:id/status?status=` | Update driver status |
| POST | `/api/transport/assignments` | Create assignment |
| GET | `/api/transport/assignments` | All assignments |
| PUT | `/api/transport/assignments/:id/status?status=` | Update task status |
| POST | `/api/transport/maintenance` | Add maintenance record |
| GET | `/api/transport/vehicles/:vehicleId/maintenance` | Maintenance by vehicle |

---

## Key Differences from Spring Boot Version

- **IDs**: MongoDB uses `_id` (ObjectId strings) instead of numeric `Long` IDs. Update your frontend references accordingly.
- **Relationships**: Stored as ObjectId references and resolved with `.populate()` — equivalent to JPA `@ManyToOne` / `@OneToOne` with `FetchType.LAZY`.
- **Timestamps**: `createdAt`, `orderDate`, etc. are native `Date` fields with `default: Date.now` — equivalent to `@PrePersist`.
- **No Spring Security**: Auth remains plain-text password comparison, matching the original implementation.
- **data.sql**: Seed data from `data.sql` is not auto-run. Insert initial roles and thowil types via the API or a seed script after starting the server.
