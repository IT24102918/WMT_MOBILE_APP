import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ScrollView, Modal } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Card, EmptyState, LoadingScreen, Button, Input } from '../../components/UI';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { API_BASE } from '../../constants/theme';

export default function MaintenanceLogScreen() {
  const { params } = useRoute();
  const vehicleId  = params?.vehicleId;
  const vehicle    = params?.vehicle;
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]       = useState({ description: '', cost: '', maintenanceDate: '' });
  const [saving, setSaving]   = useState(false);

  const fetchLogs = () => {
    fetch(`${API_BASE}/api/transport/vehicles/${vehicleId}/maintenance`)
      .then(r => r.json()).then(setLogs).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { if (vehicleId) fetchLogs(); }, [vehicleId]);

  const handleAdd = async () => {
    if (!form.description || !form.cost || !form.maintenanceDate) {
      Alert.alert('Fill all fields'); return;
    }
    setSaving(true);
    try {
      await fetch(`${API_BASE}/api/transport/maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicle: vehicleId, description: form.description, cost: parseFloat(form.cost), maintenanceDate: form.maintenanceDate }),
      });
      setShowModal(false);
      setForm({ description: '', cost: '', maintenanceDate: '' });
      fetchLogs();
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  if (loading) return <LoadingScreen />;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.cream }}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Maintenance Log</Text>
          {vehicle && <Text style={styles.sub}>{vehicle.licensePlate} · {vehicle.vehicleType}</Text>}
        </View>
        <TouchableOpacity onPress={() => setShowModal(true)} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={logs}
        keyExtractor={i => i._id || String(i.id)}
        contentContainerStyle={{ padding: SPACING.md, gap: SPACING.sm, paddingBottom: 32 }}
        ListEmptyComponent={<EmptyState icon="🔧" title="No maintenance records" subtitle="Add the first record above" />}
        renderItem={({ item }) => (
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={styles.date}>{new Date(item.maintenanceDate).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
              <Text style={styles.cost}>Rs. {item.cost}</Text>
            </View>
            <Text style={styles.desc}>{item.description}</Text>
          </Card>
        )}
      />

      <Modal visible={showModal} animationType="slide" presentationStyle="formSheet">
        <ScrollView contentContainerStyle={{ padding: SPACING.lg }} keyboardShouldPersistTaps="handled">
          <Text style={styles.modalTitle}>Add Maintenance Record</Text>
          <Input label="Description" value={form.description} onChangeText={v => setForm(f => ({ ...f, description: v }))}
            placeholder="e.g. Oil change, tire rotation" multiline numberOfLines={3} style={{ minHeight: 80 }} />
          <Input label="Cost (Rs.)" value={form.cost} onChangeText={v => setForm(f => ({ ...f, cost: v.replace(/\D/g, '') }))}
            keyboardType="numeric" placeholder="0.00" />
          <TouchableOpacity style={styles.dateInput} onPress={() => {
            Alert.prompt('Maintenance Date', 'Format: YYYY-MM-DD', txt => {
              if (txt && /^\d{4}-\d{2}-\d{2}$/.test(txt.trim())) setForm(f => ({ ...f, maintenanceDate: txt.trim() }));
              else if (txt) Alert.alert('Invalid format', 'Use YYYY-MM-DD');
            }, 'plain-text', form.maintenanceDate);
          }}>
            <Text style={styles.dateLabel}>Date</Text>
            <Text style={[styles.dateVal, !form.maintenanceDate && { color: COLORS.gray400 }]}>
              {form.maintenanceDate || 'Tap to enter (YYYY-MM-DD)'}
            </Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg }}>
            <Button title="Cancel" variant="outline" onPress={() => setShowModal(false)} style={{ flex: 1 }} />
            <Button title="Save" onPress={handleAdd} loading={saving} style={{ flex: 1 }} />
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header:     { backgroundColor: COLORS.maroon, flexDirection: 'row', justifyContent: 'space-between',
                alignItems: 'center', padding: SPACING.md, paddingTop: SPACING.xl },
  title:      { fontSize: 20, ...FONTS.bold, color: COLORS.white },
  sub:        { fontSize: 13, color: COLORS.lightGold, marginTop: 2 },
  addBtn:     { backgroundColor: COLORS.gold + '30', paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.md },
  addBtnText: { fontSize: 14, ...FONTS.semibold, color: COLORS.white },
  date:       { fontSize: 13, color: COLORS.gray600 },
  cost:       { fontSize: 15, ...FONTS.bold, color: COLORS.maroon },
  desc:       { fontSize: 14, color: COLORS.dark, lineHeight: 20 },
  modalTitle: { fontSize: 20, ...FONTS.bold, color: COLORS.dark, marginBottom: SPACING.md },
  dateInput:  { borderWidth: 1.5, borderColor: COLORS.gray200, borderRadius: RADIUS.md,
                padding: SPACING.md, backgroundColor: COLORS.white, marginBottom: SPACING.md },
  dateLabel:  { fontSize: 12, color: COLORS.gray400, marginBottom: 4 },
  dateVal:    { fontSize: 15, color: COLORS.dark },
});
