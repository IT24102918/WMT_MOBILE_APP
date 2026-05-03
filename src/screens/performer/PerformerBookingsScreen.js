// PerformerBookingsScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Card, Badge, EmptyState, LoadingScreen, SectionHeader } from '../../components/UI';
import { COLORS, FONTS, SPACING, SHADOW } from '../../constants/theme';
import { API_BASE } from '../../constants/theme';

export default function PerformerBookingsScreen() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);

  const fetchBookings = () => {
    const uid = user?._id || user?.id;
    fetch(`${API_BASE}/api/bookings/performer/${uid}`)
      .then(r => r.json()).then(setBookings).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchBookings(); }, [user]);

  const updateStatus = async (id, status) => {
    await fetch(`${API_BASE}/api/bookings/${id}/status?status=${status}`, { method: 'PUT' });
    fetchBookings();
  };

  if (loading) return <LoadingScreen />;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>My Bookings</Text>
        <Text style={styles.sub}>{bookings.length} total</Text>
      </View>
      <FlatList
        data={bookings}
        keyExtractor={i => i._id || String(i.id)}
        contentContainerStyle={{ padding: SPACING.md, gap: SPACING.sm, paddingBottom: 32 }}
        ListEmptyComponent={<EmptyState icon="📅" title="No bookings assigned yet" />}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={styles.cardId}>Booking #{(item._id || item.id)?.slice(-6)}</Text>
              <Badge status={item.status} label={item.status} />
            </View>
            <Text style={styles.cardDetail}>📅 {item.eventDate ? new Date(item.eventDate).toLocaleDateString() : 'Date TBD'}</Text>
            <Text style={styles.cardDetail}>👤 {item.user?.name || 'Customer'}</Text>
            <Text style={styles.cardDetail}>🎭 {item.thowilType?.name || 'Ritual'}</Text>
            {item.totalAmount ? <Text style={styles.cardDetail}>💰 Rs. {item.totalAmount}</Text> : null}
            {item.status === 'PENDING' && (
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => updateStatus(item._id || item.id, 'Confirmed')} style={[styles.actionBtn, { backgroundColor: COLORS.greenLight }]}>
                  <Text style={[styles.actionText, { color: COLORS.green }]}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => updateStatus(item._id || item.id, 'Cancelled')} style={[styles.actionBtn, { backgroundColor: COLORS.redLight }]}>
                  <Text style={[styles.actionText, { color: COLORS.red }]}>Decline</Text>
                </TouchableOpacity>
              </View>
            )}
            {item.status === 'Confirmed' && (
              <TouchableOpacity onPress={() => updateStatus(item._id || item.id, 'Completed')} style={[styles.actionBtn, { backgroundColor: COLORS.blueLight, marginTop: 8 }]}>
                <Text style={[styles.actionText, { color: COLORS.blue }]}>Mark Completed</Text>
              </TouchableOpacity>
            )}
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen:     { flex: 1, backgroundColor: COLORS.cream },
  header:     { backgroundColor: COLORS.maroon, padding: SPACING.md, paddingTop: SPACING.xl },
  title:      { fontSize: 22, ...FONTS.bold, color: COLORS.white },
  sub:        { fontSize: 13, color: COLORS.lightGold, marginTop: 2 },
  card:       { gap: 4 },
  cardId:     { fontSize: 15, ...FONTS.semibold, color: COLORS.dark },
  cardDetail: { fontSize: 13, color: COLORS.gray600 },
  actions:    { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn:  { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  actionText: { fontSize: 13, ...FONTS.semibold },
});
