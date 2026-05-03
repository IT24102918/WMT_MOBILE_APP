import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { Button, Card, EmptyState, LoadingScreen, Badge } from '../../components/UI';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { API_BASE } from '../../constants/theme';

function formatISODate(date) {
  return date.toISOString().slice(0, 10);
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export default function PerformerAvailabilityScreen() {
  const { user } = useAuth();
  const [slots, setSlots]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [addDate, setAddDate]   = useState('');
  const [addStatus, setAddStatus] = useState('AVAILABLE');
  const [adding, setAdding]     = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const minDate = startOfToday();
  const pickerDate = addDate ? new Date(addDate) : minDate;

  const fetchSlots = () => {
    const uid = user?._id || user?.id;
    fetch(`${API_BASE}/api/availability/performer/${uid}`)
      .then(r => r.json()).then(setSlots).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchSlots(); }, [user]);

  const handleAdd = async () => {
    if (!addDate) { Alert.alert('Pick a date'); return; }
    setAdding(true);
    const uid = user?._id || user?.id;
    try {
      await fetch(`${API_BASE}/api/availability/user/${uid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availableDate: addDate, status: addStatus }),
      });
      setAddDate('');
      fetchSlots();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id) => {
    await fetch(`${API_BASE}/api/availability/${id}`, { method: 'DELETE' });
    fetchSlots();
  };

  const handleDateChange = (event, selectedDate) => {
    setShowPicker(false);
    if (event.type === 'dismissed' || !selectedDate) return;

    const nextDate = new Date(selectedDate);
    nextDate.setHours(0, 0, 0, 0);
    if (nextDate < minDate) {
      Alert.alert('Invalid date', 'Please choose today or a future date.');
      return;
    }

    setAddDate(formatISODate(nextDate));
  };

  if (loading) return <LoadingScreen />;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>My Availability</Text>
        <Text style={styles.sub}>{slots.filter(s => s.status === 'AVAILABLE').length} available days</Text>
      </View>

      {/* Add slot */}
      <Card style={styles.addCard}>
        <Text style={styles.addTitle}>Add Availability</Text>
        <Text style={styles.addLabel}>Date (YYYY-MM-DD)</Text>
        <TouchableOpacity style={styles.dateInput} onPress={() => setShowPicker(true)}>
          <Ionicons name="calendar-outline" size={16} color={COLORS.maroon} />
          <Text style={[styles.dateInputText, !addDate && { color: COLORS.gray400 }]}>
            {addDate || 'Tap to choose a date'}
          </Text>
        </TouchableOpacity>
        {showPicker ? (
          <DateTimePicker
            value={pickerDate}
            mode="date"
            display="default"
            minimumDate={minDate}
            onChange={handleDateChange}
          />
        ) : null}
        <Text style={[styles.addLabel, { marginTop: SPACING.sm }]}>Status</Text>
        <View style={styles.statusRow}>
          {['AVAILABLE', 'UNAVAILABLE'].map(s => (
            <TouchableOpacity key={s} onPress={() => setAddStatus(s)}
              style={[styles.statusChip, addStatus === s && styles.statusChipActive]}>
              <Text style={[styles.statusChipText, addStatus === s && { color: COLORS.white }]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Button title="Add Slot" onPress={handleAdd} loading={adding} style={{ marginTop: SPACING.sm }} />
      </Card>

      <FlatList
        data={slots}
        keyExtractor={i => i._id || String(i.id)}
        contentContainerStyle={{ padding: SPACING.md, gap: SPACING.sm, paddingBottom: 32 }}
        ListEmptyComponent={<EmptyState icon="📆" title="No slots added" subtitle="Add your available dates above" />}
        renderItem={({ item }) => (
          <Card style={styles.slotCard}>
            <View>
              <Text style={styles.slotDate}>{new Date(item.availableDate).toLocaleDateString('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
              <Badge status={item.status} label={item.status} style={{ marginTop: 4 }} />
            </View>
            <TouchableOpacity onPress={() => handleRemove(item._id || item.id)}>
              <Ionicons name="trash-outline" size={20} color={COLORS.red} />
            </TouchableOpacity>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen:          { flex: 1, backgroundColor: COLORS.cream },
  header:          { backgroundColor: COLORS.maroon, padding: SPACING.md, paddingTop: SPACING.xl },
  title:           { fontSize: 22, ...FONTS.bold, color: COLORS.white },
  sub:             { fontSize: 13, color: COLORS.lightGold, marginTop: 2 },
  addCard:         { margin: SPACING.md },
  addTitle:        { fontSize: 16, ...FONTS.semibold, color: COLORS.dark, marginBottom: SPACING.sm },
  addLabel:        { fontSize: 13, ...FONTS.medium, color: COLORS.gray600, marginBottom: 6 },
  dateInput:       { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5,
                     borderColor: COLORS.gray200, borderRadius: RADIUS.md, padding: 12, backgroundColor: COLORS.white },
  dateInputText:   { fontSize: 14, color: COLORS.dark, flex: 1 },
  statusRow:       { flexDirection: 'row', gap: 8 },
  statusChip:      { flex: 1, paddingVertical: 10, borderRadius: RADIUS.md, borderWidth: 1.5,
                     borderColor: COLORS.gray200, alignItems: 'center' },
  statusChipActive:{ backgroundColor: COLORS.maroon, borderColor: COLORS.maroon },
  statusChipText:  { fontSize: 13, ...FONTS.medium, color: COLORS.dark },
  slotCard:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  slotDate:        { fontSize: 14, ...FONTS.medium, color: COLORS.dark },
});
