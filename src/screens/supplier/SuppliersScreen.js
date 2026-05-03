import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { Badge, Button, Card, EmptyState, Input, LoadingScreen } from '../../components/UI';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../../constants/theme';
import { requestJson } from '../../config/api';

const PHONE_REGEX = /^0\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMPTY_FORM = {
  id: null,
  name: '',
  contactPerson: '',
  phone: '',
  email: '',
  rating: '',
};

function StatCard({ label, value, accent }) {
  return (
    <View style={[styles.statCard, { borderColor: `${accent}30` }]}>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function SuppliersScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [suppliers, setSuppliers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [suppliedProducts, setSuppliedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const stats = useMemo(() => {
    const pendingOrders = orders.filter((item) => item.status === 'PENDING').length;
    const deliveredValue = orders
      .filter((item) => item.status === 'DELIVERED')
      .reduce((sum, item) => sum + Number(item.totalAmount || 0), 0);

    return {
      registeredSuppliers: suppliers.length,
      pendingOrders,
      deliveredValue,
      productsSupplied: suppliedProducts.length,
    };
  }, [orders, suppliedProducts, suppliers]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [supplierData, orderData, suppliedProductData] = await Promise.all([
        requestJson('/api/suppliers'),
        requestJson('/api/purchase-orders'),
        requestJson('/api/supplier-products'),
      ]);
      setSuppliers(supplierData);
      setOrders(orderData);
      setSuppliedProducts(suppliedProductData);
    } catch (error) {
      Alert.alert('Load Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) fetchData();
  }, [isFocused]);

  const closeModal = () => {
    setShowModal(false);
    setSaving(false);
    setForm(EMPTY_FORM);
    setErrors({});
  };

  const openCreateModal = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setShowModal(true);
  };

  const openEditModal = (supplier) => {
    setForm({
      id: supplier._id || supplier.id,
      name: supplier.name || '',
      contactPerson: supplier.contactPerson || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      rating: supplier.rating != null ? String(supplier.rating) : '',
    });
    setErrors({});
    setShowModal(true);
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!form.name.trim()) nextErrors.name = 'Supplier name is required';
    if (!form.contactPerson.trim()) nextErrors.contactPerson = 'Contact person is required';
    if (!PHONE_REGEX.test(form.phone.trim())) nextErrors.phone = 'Enter a valid 10-digit phone number';
    if (!EMAIL_REGEX.test(form.email.trim())) nextErrors.email = 'Enter a valid email';

    const rating = Number(form.rating);
    if (form.rating === '') nextErrors.rating = 'Rating is required';
    else if (Number.isNaN(rating) || rating < 0 || rating > 5) nextErrors.rating = 'Rating must be between 0 and 5';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        contactPerson: form.contactPerson.trim(),
        phone: form.phone.trim(),
        email: form.email.trim().toLowerCase(),
        rating: Number(form.rating),
      };

      if (form.id) {
        await requestJson(`/api/suppliers/${form.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await requestJson('/api/suppliers', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      closeModal();
      fetchData();
    } catch (error) {
      Alert.alert('Save Failed', error.message);
      setSaving(false);
    }
  };

  const handleDelete = (supplier) => {
    Alert.alert(
      'Delete Supplier',
      `Delete ${supplier.name}? Related supplier products and purchase orders will also be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await requestJson(`/api/suppliers/${supplier._id || supplier.id}`, { method: 'DELETE' });
              fetchData();
            } catch (error) {
              Alert.alert('Delete Failed', error.message);
            }
          },
        },
      ]
    );
  };

  if (loading) return <LoadingScreen message="Loading suppliers..." />;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Suppliers</Text>
          <Text style={styles.headerSub}>Manage suppliers and supplier-side dashboard totals</Text>
        </View>
        <TouchableOpacity onPress={openCreateModal} style={styles.addBtn}>
          <Ionicons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={suppliers}
        keyExtractor={(item) => item._id || String(item.id)}
        ListHeaderComponent={(
          <View style={styles.listHeaderWrap}>
            <View style={styles.statsGrid}>
              <StatCard label="Registered" value={stats.registeredSuppliers} accent={COLORS.gold} />
              <StatCard label="Pending Orders" value={stats.pendingOrders} accent={COLORS.blue} />
              <StatCard label="Delivered Value" value={`Rs. ${stats.deliveredValue.toFixed(0)}`} accent={COLORS.green} />
              <StatCard label="Products Supplied" value={stats.productsSupplied} accent={COLORS.maroon} />
            </View>

            <Card style={styles.profileCard}>
              <View style={styles.profileTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{user?.name?.[0] || 'S'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.profileName}>{user?.name || 'Supplier User'}</Text>
                  <Text style={styles.profileRole}>{user?.roleName || 'SUPPLIER'}</Text>
                </View>
                <Button title="Sign Out" variant="outline" size="sm" onPress={logout} />
              </View>
              <View style={styles.profileActions}>
                <Button title="Open AI Assistant" onPress={() => navigation.navigate('Assistant')} />
              </View>
            </Card>

            <Text style={styles.sectionTitle}>Registered Suppliers</Text>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<EmptyState icon="🏪" title="No suppliers yet" subtitle="Register the first supplier to get started." />}
        renderItem={({ item }) => (
          <Card style={styles.supplierCard}>
            <View style={styles.supplierTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.supplierName}>{item.name}</Text>
                <Text style={styles.contactPerson}>{item.contactPerson || 'No contact person'}</Text>
              </View>
              <Badge status="APPROVED" label={`Rating ${Number(item.rating || 0).toFixed(1)}`} />
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="call-outline" size={14} color={COLORS.gray600} />
              <Text style={styles.detailText}>{item.phone || 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="mail-outline" size={14} color={COLORS.gray600} />
              <Text style={styles.detailText}>{item.email || 'N/A'}</Text>
            </View>

            <View style={styles.actionRow}>
              <Button title="Edit" variant="outline" size="sm" onPress={() => openEditModal(item)} style={{ flex: 1 }} />
              <Button title="Delete" variant="danger" size="sm" onPress={() => handleDelete(item)} style={{ flex: 1 }} />
            </View>
          </Card>
        )}
      />

      <Modal visible={showModal} animationType="slide" presentationStyle="formSheet" onRequestClose={closeModal}>
        <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.modalTitle}>{form.id ? 'Edit Supplier' : 'Register Supplier'}</Text>

          <Input
            label="Supplier Name"
            value={form.name}
            onChangeText={(value) => setForm((current) => ({ ...current, name: value }))}
            placeholder="Supplier business name"
            error={errors.name}
          />
          <Input
            label="Contact Person"
            value={form.contactPerson}
            onChangeText={(value) => setForm((current) => ({ ...current, contactPerson: value }))}
            placeholder="Primary contact person"
            error={errors.contactPerson}
          />
          <Input
            label="Phone"
            value={form.phone}
            onChangeText={(value) => setForm((current) => ({ ...current, phone: value.replace(/\D/g, '').slice(0, 10) }))}
            keyboardType="phone-pad"
            placeholder="0771234567"
            error={errors.phone}
          />
          <Input
            label="Email"
            value={form.email}
            onChangeText={(value) => setForm((current) => ({ ...current, email: value }))}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="supplier@example.com"
            error={errors.email}
          />
          <Input
            label="Rating"
            value={form.rating}
            onChangeText={(value) => setForm((current) => ({ ...current, rating: value.replace(/[^0-9.]/g, '').slice(0, 3) }))}
            keyboardType="decimal-pad"
            placeholder="0 - 5"
            error={errors.rating}
          />

          <View style={styles.modalActions}>
            <Button title="Cancel" variant="outline" onPress={closeModal} style={{ flex: 1 }} />
            <Button title={form.id ? 'Update' : 'Save'} onPress={handleSave} loading={saving} style={{ flex: 1 }} />
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.cream },
  header: {
    backgroundColor: COLORS.maroon,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  headerTitle: { fontSize: 24, ...FONTS.bold, color: COLORS.white },
  headerSub: { marginTop: 4, fontSize: 13, color: COLORS.lightGold, maxWidth: 260 },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: `${COLORS.gold}30`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listHeaderWrap: { padding: SPACING.md, gap: SPACING.md },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  statCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    ...SHADOW.sm,
  },
  statValue: { fontSize: 22, ...FONTS.bold },
  statLabel: { marginTop: 4, fontSize: 12, color: COLORS.gray600 },
  profileCard: { padding: SPACING.md },
  profileTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  profileActions: { marginTop: SPACING.md },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: `${COLORS.gold}30`,
    borderWidth: 2,
    borderColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 22, ...FONTS.bold, color: COLORS.gold },
  profileName: { fontSize: 17, ...FONTS.bold, color: COLORS.dark },
  profileRole: { marginTop: 2, fontSize: 13, color: COLORS.gray600 },
  sectionTitle: { fontSize: 20, ...FONTS.bold, color: COLORS.dark },
  listContent: { paddingBottom: SPACING.xl },
  supplierCard: { marginHorizontal: SPACING.md, marginBottom: SPACING.sm },
  supplierTop: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.sm },
  supplierName: { fontSize: 18, ...FONTS.bold, color: COLORS.dark },
  contactPerson: { marginTop: 2, fontSize: 13, color: COLORS.maroon, ...FONTS.medium },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  detailText: { fontSize: 13, color: COLORS.gray600 },
  actionRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  modalContent: { padding: SPACING.lg },
  modalTitle: { fontSize: 24, ...FONTS.bold, color: COLORS.dark, marginBottom: SPACING.md },
  modalActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
});
