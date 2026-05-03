import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { LoadingScreen } from '../components/UI';

import AuthNavigator from './AuthNavigator';
import TabNavigator  from './TabNavigator';

// Shared modal screens
import PerformerDetailScreen from '../screens/shared/PerformerDetailScreen';
import BookingWizardScreen   from '../screens/shared/BookingWizardScreen';
import ProductDetailScreen   from '../screens/shared/ProductDetailScreen';
import ThowilTypesScreen     from '../screens/shared/ThowilTypesScreen';
import AssistantScreen       from '../screens/shared/AssistantScreen';
import CheckoutScreen        from '../screens/customer/CheckoutScreen';
import MaintenanceLogScreen  from '../screens/driver/MaintenanceLogScreen';

const Root = createNativeStackNavigator();

export default function RootNavigator() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;

  return (
    <NavigationContainer>
      <Root.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Root.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <>
            <Root.Screen name="Main" component={TabNavigator} />
            <Root.Screen name="PerformerDetail" component={PerformerDetailScreen}
              options={{ headerShown: true, title: 'Performer', headerTintColor: '#6B2737' }} />
            <Root.Screen name="BookingWizard" component={BookingWizardScreen}
              options={{ headerShown: true, title: 'Book Performer', headerTintColor: '#6B2737' }} />
            <Root.Screen name="ProductDetail" component={ProductDetailScreen}
              options={{ headerShown: true, title: 'Product', headerTintColor: '#6B2737' }} />
            <Root.Screen name="ThowilTypes" component={ThowilTypesScreen}
              options={{ headerShown: true, title: 'Thowil Types', headerTintColor: '#6B2737' }} />
            <Root.Screen name="Assistant" component={AssistantScreen}
              options={{ headerShown: true, title: 'AI Assistant', headerTintColor: '#6B2737' }} />
            <Root.Screen name="Checkout" component={CheckoutScreen}
              options={{ headerShown: true, title: 'Checkout', headerTintColor: '#6B2737' }} />
            <Root.Screen name="MaintenanceLog" component={MaintenanceLogScreen}
              options={{ headerShown: true, title: 'Maintenance', headerTintColor: '#6B2737' }} />
          </>
        )}
      </Root.Navigator>
    </NavigationContainer>
  );
}
