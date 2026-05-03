import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Badge, EmptyState, LoadingScreen } from '../../components/UI';
import { COLORS, FONTS, SPACING } from '../../constants/theme';
import { API_BASE } from '../../constants/theme';

export default function VehiclesScreen() {
  const nav = useNavigation();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/transport/vehicles`)
      .then(r => r.json()).then(setVehicles).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.cream }}>
      <View style={styles.header}><Text style={styles.title}>Fleet</Text></View>
      <FlatList
        data={vehicles}
        keyExtractor={i => i._id || String(i.id)}
        contentContainerStyle={{ padding: SPACING.md, gap: SPACING.sm, paddingBottom: 32 }}
        ListEmptyComponent={<EmptyState icon="🚗" title="No vehicles" />}
        renderItem={({ item }) => (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
            <View style={styles.vehicleIcon}>
              <Text style={{ fontSize: 28 }}>{item.vehicleType?.includes('Truck') ? '🚛' : '🚗'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.plate}>{item.licensePlate}</Text>
              <Text style={styles.type}>{item.vehicleType}</Text>
              {item.capacityKg && <Text style={styles.cap}>Capacity: {item.capacityKg} kg</Text>}
            </View>
            <View style={{ alignItems: 'flex-end', gap: 8 }}>
              <Badge status={item.status} label={item.status} />
              <TouchableOpacity onPress={() => nav.navigate('MaintenanceLog', { vehicleId: item._id || item.id, vehicle: item })}>
                <Ionicons name="construct-outline" size={20} color={COLORS.maroon} />
              </TouchableOpacity>
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header:      { backgroundColor: COLORS.maroon, padding: SPACING.md, paddingTop: SPACING.xl },
  title:       { fontSize: 22, ...FONTS.bold, color: COLORS.white },
  vehicleIcon: { width: 52, height: 52, backgroundColor: COLORS.cream, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  plate:       { fontSize: 16, ...FONTS.bold, color: COLORS.dark },
  type:        { fontSize: 13, color: COLORS.gray600 },
  cap:         { fontSize: 12, color: COLORS.gray400 },
});
