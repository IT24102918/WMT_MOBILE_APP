import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../constants/theme';
import { useCart } from '../context/CartContext';
import { View, Text, StyleSheet } from 'react-native';

// Customer
import HomeScreen           from '../screens/customer/HomeScreen';
import BookingScreen        from '../screens/customer/BookingScreen';
import ShopScreen           from '../screens/customer/ShopScreen';
import CartScreen           from '../screens/customer/CartScreen';
import CustomerDashboard    from '../screens/customer/CustomerDashboard';

// Performer
import PerformerBookings    from '../screens/performer/PerformerBookingsScreen';
import PerformerAvailability from '../screens/performer/PerformerAvailabilityScreen';
import PerformerProfile     from '../screens/performer/PerformerProfileScreen';

// Supplier
import SuppliersScreen        from '../screens/supplier/SuppliersScreen';
import SupplierPurchaseOrders from '../screens/supplier/PurchaseOrdersScreen';
import SupplierStockRequests  from '../screens/supplier/StockRequestsScreen';
import SupplierProducts       from '../screens/supplier/SupplierProductsScreen';

// Driver
import AssignmentsScreen   from '../screens/driver/AssignmentsScreen';
import VehiclesScreen      from '../screens/driver/VehiclesScreen';
import DriverProfileScreen from '../screens/driver/DriverProfileScreen';

// Inventory
import InventoryOverviewScreen from '../screens/inventory/InventoryOverviewScreen';
import StockLogsScreen         from '../screens/inventory/StockLogsScreen';
import InventoryProfileScreen  from '../screens/inventory/InventoryProfileScreen';

const Tab = createBottomTabNavigator();

const tabOpts = (name, iconName) => ({ tabBarLabel: name, tabBarIcon: ({ color, size }) =>
  <Ionicons name={iconName} size={size} color={color} /> });

function CartBadge({ color, size }) {
  const { cart } = useCart();
  const count = cart.reduce((s, i) => s + i.qty, 0);
  return (
    <View>
      <Ionicons name="cart-outline" size={size} color={color} />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
        </View>
      )}
    </View>
  );
}

const TAB_BAR = {
  tabBarActiveTintColor:   COLORS.maroon,
  tabBarInactiveTintColor: COLORS.gray400,
  tabBarStyle: {
    backgroundColor: COLORS.white,
    borderTopColor: COLORS.gray200,
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 8,
  },
  tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
  headerShown: false,
};

export default function TabNavigator() {
  const { user } = useAuth();
  const role = user?.roleName;

  if (role === 'PERFORMER') {
    return (
      <Tab.Navigator screenOptions={TAB_BAR}>
        <Tab.Screen name="PBookings"     component={PerformerBookings}     options={tabOpts('Bookings', 'calendar-outline')} />
        <Tab.Screen name="Availability"  component={PerformerAvailability} options={tabOpts('Availability', 'time-outline')} />
        <Tab.Screen name="PProfile"      component={PerformerProfile}      options={tabOpts('Profile', 'person-outline')} />
      </Tab.Navigator>
    );
  }

  if (role === 'SUPPLIER') {
    return (
      <Tab.Navigator screenOptions={TAB_BAR}>
        <Tab.Screen name="Suppliers"      component={SuppliersScreen}        options={tabOpts('Suppliers', 'people-outline')} />
        <Tab.Screen name="PurchaseOrders" component={SupplierPurchaseOrders} options={tabOpts('Orders', 'receipt-outline')} />
        <Tab.Screen name="StockRequests"  component={SupplierStockRequests}  options={tabOpts('Requests', 'cube-outline')} />
        <Tab.Screen name="SProducts"      component={SupplierProducts}       options={tabOpts('Products', 'pricetag-outline')} />
      </Tab.Navigator>
    );
  }

  if (role === 'DRIVER') {
    return (
      <Tab.Navigator screenOptions={TAB_BAR}>
        <Tab.Screen name="Assignments" component={AssignmentsScreen}   options={tabOpts('Assignments', 'navigate-outline')} />
        <Tab.Screen name="Vehicles"    component={VehiclesScreen}      options={tabOpts('Vehicles', 'car-outline')} />
        <Tab.Screen name="DProfile"    component={DriverProfileScreen} options={tabOpts('Profile', 'person-outline')} />
      </Tab.Navigator>
    );
  }

  if (role === 'INVENTORY_MANAGER') {
    return (
      <Tab.Navigator screenOptions={TAB_BAR}>
        <Tab.Screen name="Inventory" component={InventoryOverviewScreen} options={tabOpts('Inventory', 'layers-outline')} />
        <Tab.Screen name="StockLogs" component={StockLogsScreen}         options={tabOpts('Stock Logs', 'list-outline')} />
        <Tab.Screen name="IProfile"  component={InventoryProfileScreen}  options={tabOpts('Profile', 'person-outline')} />
      </Tab.Navigator>
    );
  }

  // Default: CUSTOMER / ADMIN
  return (
    <Tab.Navigator screenOptions={TAB_BAR}>
      <Tab.Screen name="Home"      component={HomeScreen}        options={tabOpts('Home', 'home-outline')} />
      <Tab.Screen name="Booking"   component={BookingScreen}     options={tabOpts('Book', 'calendar-outline')} />
      <Tab.Screen name="Shop"      component={ShopScreen}        options={tabOpts('Shop', 'storefront-outline')} />
      <Tab.Screen name="Cart"      component={CartScreen}
        options={{ tabBarLabel: 'Cart', tabBarIcon: ({ color, size }) => <CartBadge color={color} size={size} />, headerShown: false }} />
      <Tab.Screen name="Dashboard" component={CustomerDashboard} options={tabOpts('Me', 'person-outline')} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute', top: -4, right: -6,
    backgroundColor: COLORS.maroon, borderRadius: 8,
    minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
