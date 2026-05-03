# Thowil Mobile — React Native (Expo SDK 52)

Mobile frontend for the Thowil platform, built with React Native + Expo Go compatible.
Mirrors the full feature set of the original React web frontend, rewritten for native mobile.

---

## Quick Start

Current command guide:

```bash
npm run dev       # local Expo Web development
npm run native    # Expo Go/native development
npm run build:web # export web build to dist
npm start         # serve dist for Render/static web hosting
```

The API base URL is resolved from `EXPO_PUBLIC_API_URL` when set. Otherwise, local Expo development automatically targets the backend host on port `8080`.

### 1. Install dependencies
```bash
cd thowil-mobile
npm install
```

### 2. Set your backend IP
Open `src/constants/theme.js` and change:
```js
export const API_BASE = 'http://192.168.1.100:8080'; // ← your machine's local IP
```
> **Important:** Use your computer's actual LAN IP (e.g. `192.168.1.x`), not `localhost`.
> Find it with `ipconfig` (Windows) or `ifconfig` (Mac/Linux).
> Both your phone and computer must be on the same Wi-Fi network.

### 3. Start Expo
```bash
npm start
```
Scan the QR code with **Expo Go** (v54) on your phone.

---

## Project Structure

```
thowil-mobile/
├── App.js                         # Root — providers + navigator
├── app.json                       # Expo config
├── package.json
├── src/
│   ├── constants/
│   │   └── theme.js               # Colors, fonts, spacing, API_BASE
│   ├── context/
│   │   ├── AuthContext.js         # Login state + AsyncStorage
│   │   └── CartContext.js         # Shopping cart state
│   ├── hooks/
│   │   └── useAPI.js              # Generic fetch hook
│   ├── components/
│   │   └── UI.js                  # Button, Card, Input, Badge, EmptyState, etc.
│   ├── navigation/
│   │   ├── RootNavigator.js       # Auth vs Main routing
│   │   ├── AuthNavigator.js       # Splash → Login → Register
│   │   └── TabNavigator.js        # Role-aware bottom tabs
│   └── screens/
│       ├── auth/
│       │   ├── SplashScreen.js
│       │   ├── LoginScreen.js
│       │   └── RegisterScreen.js
│       ├── customer/
│       │   ├── HomeScreen.js
│       │   ├── BookingScreen.js
│       │   ├── ShopScreen.js
│       │   ├── CartScreen.js
│       │   ├── CheckoutScreen.js
│       │   └── CustomerDashboard.js
│       ├── performer/
│       │   ├── PerformerBookingsScreen.js
│       │   ├── PerformerAvailabilityScreen.js
│       │   └── PerformerProfileScreen.js
│       ├── supplier/
│       │   ├── PurchaseOrdersScreen.js
│       │   ├── StockRequestsScreen.js
│       │   ├── SupplierProductsScreen.js
│       │   └── SupplierProfileScreen.js
│       ├── driver/
│       │   ├── AssignmentsScreen.js
│       │   ├── VehiclesScreen.js
│       │   ├── MaintenanceLogScreen.js
│       │   └── DriverProfileScreen.js
│       ├── inventory/
│       │   ├── InventoryOverviewScreen.js
│       │   ├── StockLogsScreen.js
│       │   └── InventoryProfileScreen.js
│       └── shared/
│           ├── PerformerDetailScreen.js
│           ├── BookingWizardScreen.js   ← 3-step booking flow
│           ├── ProductDetailScreen.js
│           └── ThowilTypesScreen.js
```

---

## Roles & Their Screens

| Role               | Tab 1           | Tab 2        | Tab 3       | Tab 4      |
|--------------------|-----------------|--------------|-------------|------------|
| CUSTOMER (default) | Home            | Book         | Shop / Cart | Me         |
| PERFORMER          | My Bookings     | Availability | Profile     | —          |
| SUPPLIER           | Purchase Orders | Stock Req.   | Products    | Profile    |
| DRIVER             | Assignments     | Fleet        | Profile     | —          |
| INVENTORY_MANAGER  | Inventory       | Stock Logs   | Profile     | —          |

---

## Key Features

### Customer
- **Home** — hero banner, quick actions, service cards, how-it-works steps
- **Book** — searchable performer list with ratings, experience, location
- **Performer Detail** — stats, scrollable availability calendar chips, Book button
- **Booking Wizard** — 3-step: select ritual type + date → card payment → confirmation
- **Shop** — product grid with category filter chips and search, stock indicators
- **Product Detail** — full info, in-cart count, Add to Cart
- **Cart** — qty controls, remove, total, checkout
- **Checkout** — card payment form, creates Order + OrderItems + Payment records
- **My Dashboard** — booking history with cancel, order history, stats

### Performer
- Accept / Decline / Complete bookings
- Add & remove availability slots (AVAILABLE / UNAVAILABLE)

### Supplier
- View and create purchase orders, mark delivered (auto-updates inventory)
- Approve and fulfill stock requests

### Driver
- Start trip / complete assignments
- View fleet, open per-vehicle maintenance logs
- Add maintenance records (date, description, cost)

### Inventory Manager
- Full inventory list with low-stock tab filter
- Real-time stock log timeline with change types + signed quantities

---

## Design System

| Token       | Value            |
|-------------|------------------|
| Maroon      | `#6B2737`        |
| Gold        | `#C9963E`        |
| Cream       | `#FAF3E0`        |
| Dark        | `#1A0A0A`        |
| Border      | 1.5px solid      |
| Radius MD   | 10px             |
| Radius LG   | 14px             |

---

## Notes for Expo Go

- **No `@react-native-picker/picker`** — Register screen uses `Alert.prompt` for role selection as Picker may need ejecting. If you want native Picker, install `@react-native-picker/picker` and it will work with Expo Go.
- **DateTimePicker** — Availability and maintenance screens use `Alert.prompt` (text input) for dates to avoid native module issues in Expo Go.
- **Images** — All product/performer images use emoji placeholders. Replace with `expo-image` + real URLs when ready.
- **Assets** — Add `icon.png`, `splash.png`, `adaptive-icon.png`, `favicon.png` to `/assets/` before building.
