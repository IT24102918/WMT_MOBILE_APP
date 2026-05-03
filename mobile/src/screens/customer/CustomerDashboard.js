import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { Card, Badge, EmptyState, SectionHeader, LoadingScreen, Button } from '../../components/UI';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../../constants/theme';
import { requestJson } from '../../config/api';

const toIsoDate = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toDisplayDate = (dateString) => {
  if (!dateString) return 'Date TBD';
  const date = new Date(`${dateString}T12:00:00`);
  if (Number.isNaN(date.getTime())) return 'Date TBD';

  return date.toLocaleDateString('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const toPickerDate = (dateString, fallbackDate) => {
  if (!dateString) return fallbackDate;
  const parsedDate = new Date(`${dateString}T12:00:00`);
  return Number.isNaN(parsedDate.getTime()) ? fallbackDate : parsedDate;
};

export default function CustomerDashboard() {
  const { user, logout } = useAuth();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [bookings, setBookings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [thowilTypes, setThowilTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editBooking, setEditBooking] = useState(null);
  const [editTypeId, setEditTypeId] = useState('');
  const [editDate, setEditDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(() => new Date());
  const [savingBooking, setSavingBooking] = useState(false);

  const minimumBookingDate = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const fetchData = async () => {
    if (!user) return;
    const uid = user._id || user.id;
    setLoading(true);

    try {
      const [bookingData, orderData] = await Promise.all([
        requestJson(`/api/bookings/user/${uid}`),
        requestJson(`/api/orders/user/${uid}`),
      ]);
      const orderItemsByOrder = await Promise.all(
        orderData.map((order) => requestJson(`/api/order-items/order/${order._id || order.id}`))
      );

      const ordersWithItems = orderData.map((order, index) => ({
        ...order,
        items: orderItemsByOrder[index] || [],
      }));

      setBookings(bookingData);
      setOrders(ordersWithItems);
    } catch (error) {
      Alert.alert('Load Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchThowilTypes = async () => {
    try {
      const types = await requestJson('/api/thowil-types');
      setThowilTypes(types);
    } catch (error) {
      Alert.alert('Ritual Types Unavailable', error.message);
    }
  };

  useEffect(() => {
    if (isFocused) {
      fetchData();
    }
  }, [user, isFocused]);

  useEffect(() => {
    fetchThowilTypes();
  }, []);

  const closeEditModal = () => {
    setEditBooking(null);
    setEditTypeId('');
    setEditDate('');
    setShowDatePicker(false);
    setPickerDate(minimumBookingDate);
    setSavingBooking(false);
  };

  const startEditBooking = (booking) => {
    const currentDate = booking.eventDate ? toIsoDate(new Date(booking.eventDate)) : toIsoDate(minimumBookingDate);
    setEditBooking(booking);
    setEditTypeId(booking.thowilType?._id || booking.thowilType || '');
    setEditDate(currentDate);
    setPickerDate(toPickerDate(currentDate, minimumBookingDate));
    setShowDatePicker(false);
  };

  const cancelBooking = async (id) => {
    Alert.alert('Cancel Booking', 'Are you sure?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: async () => {
          try {
            await requestJson(`/api/bookings/${id}/status?status=Cancelled`, { method: 'PUT' });
            fetchData();
          } catch (error) {
            Alert.alert('Cancel Failed', error.message);
          }
        },
      },
    ]);
  };

  const openDatePicker = () => {
    setPickerDate(toPickerDate(editDate, minimumBookingDate));
    setShowDatePicker((current) => (Platform.OS === 'ios' ? !current : true));
  };

  const applySelectedDate = (dateValue) => {
    const nextDate = new Date(dateValue);
    nextDate.setHours(12, 0, 0, 0);
    setPickerDate(nextDate);
    setEditDate(toIsoDate(nextDate));
  };

  const handleDateChange = (event, dateValue) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event.type === 'dismissed' || !dateValue) return;
      applySelectedDate(dateValue);
      return;
    }

    if (dateValue) {
      applySelectedDate(dateValue);
    }
  };

  const saveBookingUpdate = async () => {
    if (!editBooking || !editTypeId || !editDate) return;

    setSavingBooking(true);
    try {
      await requestJson(`/api/bookings/${editBooking._id || editBooking.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          thowilType: editTypeId,
          eventDate: editDate,
        }),
      });

      closeEditModal();
      await fetchData();
      Alert.alert('Booking Updated', 'Your ritual type and booking date were updated successfully.');
    } catch (error) {
      setSavingBooking(false);
      Alert.alert('Update Failed', error.message);
    }
  };

  if (loading) return <LoadingScreen />;

  const upcoming = bookings.filter((booking) => booking.status === 'PENDING' || booking.status === 'Confirmed');
  const past = bookings.filter((booking) => booking.status === 'Completed');
  const canSaveEdit = Boolean(editBooking && editTypeId && editDate);

  return (
    <>
      <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.[0] || 'U'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroName}>{user?.name}</Text>
            <Text style={styles.heroRole}>{user?.roleName}</Text>
          </View>
          <TouchableOpacity onPress={logout}>
            <Ionicons name="log-out-outline" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          {[
            { label: 'Upcoming', val: upcoming.length, color: COLORS.gold },
            { label: 'Orders', val: orders.length, color: COLORS.blue },
            { label: 'Past', val: past.length, color: COLORS.gray400 },
          ].map((stat) => (
            <View key={stat.label} style={styles.stat}>
              <Text style={[styles.statVal, { color: stat.color }]}>{stat.val}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.content}>
          <View>
            <SectionHeader title="My Bookings" />
            {bookings.length === 0 ? (
              <EmptyState icon="📅" title="No bookings yet" />
            ) : (
              bookings.slice(0, 5).map((booking) => (
                <Card key={booking._id || booking.id} style={styles.bookCard}>
                  <View style={styles.bookLeft}>
                    <Text style={styles.bookId}>Booking #{(booking._id || booking.id)?.slice(-6)}</Text>
                    <Text style={styles.bookDate}>
                      {booking.eventDate ? toDisplayDate(toIsoDate(new Date(booking.eventDate))) : 'Date TBD'}
                    </Text>
                    <Text style={styles.bookMeta}>{booking.thowilType?.name || 'Ritual TBD'}</Text>
                    <Text style={styles.bookPerformer}>{booking.performer?.name || 'Performer TBD'}</Text>
                  </View>
                  <View style={styles.bookActions}>
                    <Badge status={booking.status} label={booking.status} />
                    {booking.status === 'PENDING' ? (
                      <View style={styles.inlineActions}>
                        <TouchableOpacity onPress={() => startEditBooking(booking)}>
                          <Text style={styles.editAction}>Update</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => cancelBooking(booking._id || booking.id)}>
                          <Text style={styles.cancelAction}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>
                </Card>
              ))
            )}
          </View>

          <Card style={styles.assistantCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.assistantTitle}>Need quick help?</Text>
              <Text style={styles.assistantSubtitle}>Ask the AI assistant about bookings, ritual types, products, or your order history.</Text>
            </View>
            <Button title="Open Assistant" onPress={() => navigation.navigate('Assistant')} />
          </Card>

          <View>
            <SectionHeader title="Recent Orders" />
            {orders.length === 0 ? (
              <EmptyState icon="📦" title="No orders yet" />
            ) : (
              orders.slice(0, 5).map((order) => (
                <Card key={order._id || order.id} style={styles.bookCard}>
                  <View style={styles.bookLeft}>
                    <Text style={styles.bookId}>Order #{(order._id || order.id)?.slice(-6)}</Text>
                    <Text style={styles.bookDate}>{new Date(order.orderDate).toLocaleDateString()}</Text>
                    {order.items?.length ? (
                      <Text style={styles.orderItems}>
                        {order.items
                          .map((item) => `${item.product?.name || 'Item'} x${item.quantity}`)
                          .join(', ')}
                      </Text>
                    ) : (
                      <Text style={styles.bookPerformer}>Items will appear once order details load.</Text>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Text style={styles.orderAmt}>Rs. {order.totalAmount}</Text>
                    <Badge status={order.status} label={order.status} />
                  </View>
                </Card>
              ))
            )}
          </View>

          <Button title="Sign Out" variant="outline" onPress={logout} />
        </View>
      </ScrollView>

      <Modal transparent animationType="fade" visible={Boolean(editBooking)} onRequestClose={closeEditModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              <Text style={styles.modalTitle}>Update Booking</Text>
              <Text style={styles.modalSubtitle}>Change the ritual type or booking date for this pending booking.</Text>

              <Text style={styles.modalLabel}>Ritual Type</Text>
              <View style={styles.chipGrid}>
                {thowilTypes.map((type) => {
                  const isSelected = editTypeId === (type._id || type.id);
                  return (
                    <TouchableOpacity
                      key={type._id || type.id}
                      style={[styles.chip, isSelected && styles.chipActive]}
                      onPress={() => setEditTypeId(type._id || type.id)}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{type.name}</Text>
                      <Text style={[styles.chipPrice, isSelected && styles.chipPriceActive]}>Rs. {type.basePrice || 0}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.modalLabel, { marginTop: SPACING.md }]}>Booking Date</Text>
              <TouchableOpacity style={styles.dateTrigger} onPress={openDatePicker} activeOpacity={0.85}>
                <Ionicons name="calendar-outline" size={18} color={COLORS.maroon} />
                <Text style={styles.dateTriggerText}>{toDisplayDate(editDate)}</Text>
              </TouchableOpacity>
              <Text style={styles.dateHint}>Only today or future dates can be selected.</Text>

              {Platform.OS === 'ios' && showDatePicker ? (
                <View style={styles.inlinePickerCard}>
                  <DateTimePicker
                    value={pickerDate}
                    mode="date"
                    display="spinner"
                    minimumDate={minimumBookingDate}
                    onChange={handleDateChange}
                    accentColor={COLORS.maroon}
                    themeVariant="light"
                    style={styles.iosDatePicker}
                  />
                  <Text style={styles.selectedDateText}>Selected: {toDisplayDate(editDate)}</Text>
                  <Button
                    title="Done"
                    size="sm"
                    onPress={() => setShowDatePicker(false)}
                    style={styles.inlineDoneButton}
                  />
                </View>
              ) : null}

              <View style={styles.modalActions}>
                <Button title="Close" variant="outline" onPress={closeEditModal} style={{ flex: 1 }} />
                <Button
                  title="Save Changes"
                  onPress={saveBookingUpdate}
                  loading={savingBooking}
                  disabled={!canSaveEdit}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {Platform.OS === 'android' && showDatePicker ? (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display="calendar"
          minimumDate={minimumBookingDate}
          onChange={handleDateChange}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.cream },
  hero: {
    backgroundColor: COLORS.maroon,
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    paddingTop: SPACING.xl,
    gap: SPACING.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: `${COLORS.gold}30`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.gold,
  },
  avatarText: { fontSize: 22, ...FONTS.bold, color: COLORS.gold },
  heroName: { fontSize: 18, ...FONTS.bold, color: COLORS.white },
  heroRole: { fontSize: 13, color: COLORS.lightGold, marginTop: 2 },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginTop: -16,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    ...SHADOW.md,
  },
  stat: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 24, ...FONTS.bold },
  statLabel: { fontSize: 12, color: COLORS.gray400, marginTop: 2 },
  content: { padding: SPACING.md, gap: SPACING.lg },
  bookCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bookLeft: { flex: 1, gap: 4, paddingRight: SPACING.sm },
  bookId: { fontSize: 14, ...FONTS.semibold, color: COLORS.dark },
  bookDate: { fontSize: 13, color: COLORS.gray600 },
  bookMeta: { fontSize: 13, color: COLORS.maroon, ...FONTS.medium },
  bookPerformer: { fontSize: 12, color: COLORS.gray400 },
  orderItems: { fontSize: 12, color: COLORS.gray600, lineHeight: 18, marginTop: 2 },
  bookActions: { alignItems: 'flex-end', gap: 8 },
  inlineActions: { alignItems: 'flex-end', gap: 8 },
  editAction: { fontSize: 12, color: COLORS.maroon, ...FONTS.semibold },
  cancelAction: { fontSize: 12, color: COLORS.red, ...FONTS.medium },
  orderAmt: { fontSize: 15, ...FONTS.bold, color: COLORS.maroon },
  assistantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  assistantTitle: { fontSize: 16, ...FONTS.bold, color: COLORS.dark },
  assistantSubtitle: { fontSize: 12, color: COLORS.gray600, marginTop: 4, lineHeight: 18 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
  },
  modalScrollContent: {
    padding: SPACING.md,
  },
  modalTitle: {
    fontSize: 20,
    ...FONTS.bold,
    color: COLORS.dark,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.gray600,
    marginTop: 6,
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  modalLabel: {
    fontSize: 14,
    ...FONTS.semibold,
    color: COLORS.dark,
    marginBottom: 8,
  },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minWidth: '46%',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.gray200,
    backgroundColor: COLORS.white,
  },
  chipActive: {
    borderColor: COLORS.maroon,
    backgroundColor: COLORS.maroon,
  },
  chipText: { fontSize: 14, ...FONTS.medium, color: COLORS.dark },
  chipTextActive: { color: COLORS.white },
  chipPrice: { fontSize: 12, color: COLORS.gray400, marginTop: 2 },
  chipPriceActive: { color: COLORS.lightGold },
  dateTrigger: {
    borderWidth: 1.5,
    borderColor: COLORS.gray200,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateTriggerText: {
    fontSize: 15,
    color: COLORS.dark,
    ...FONTS.medium,
  },
  dateHint: { fontSize: 12, color: COLORS.gray400, marginTop: 6 },
  inlinePickerCard: {
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.cream,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  iosDatePicker: { marginTop: SPACING.sm },
  selectedDateText: {
    marginTop: SPACING.sm,
    fontSize: 14,
    ...FONTS.medium,
    color: COLORS.maroon,
  },
  inlineDoneButton: {
    marginTop: SPACING.sm,
    alignSelf: 'flex-end',
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
});
