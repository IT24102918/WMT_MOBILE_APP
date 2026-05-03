import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Button, Card, EmptyState, Input, LoadingScreen } from '../../components/UI';
import { requestJson } from '../../config/api';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../../constants/theme';

const EMPTY_FORM = {
  id: null,
  supplier: '',
  product: '',
  supplyPrice: '',
  currentInventory: '',
};

function PickerCard({ label, sublabel, active, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.pickItem, active && styles.pickItemActive]}>
      <Text style={[styles.pickTitle, active && styles.pickTitleActive]}>{label}</Text>
      {sublabel ? <Text style={[styles.pickSub, active && styles.pickSubActive]}>{sublabel}</Text> : null}
    </TouchableOpacity>
  );
}

export default function SupplierProductsScreen() {
  const isFocused = useIsFocused();
  const [supplierProducts, setSupplierProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const fetchData = async () => {
    try {
      setLoading(true);
      const [supplierProductData, supplierData, productData] = await Promise.all([
        requestJson('/api/supplier-products'),
        requestJson('/api/suppliers'),
        requestJson('/api/products'),
      ]);
      setSupplierProducts(supplierProductData);
      setSuppliers(supplierData);
      setProducts(productData);
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

  const openEditModal = (item) => {
    setForm({
      id: item._id || item.id,
      supplier: item.supplier?._id || item.supplier || '',
      product: item.product?._id || item.product || '',
      supplyPrice: item.supplyPrice != null ? String(item.supplyPrice) : '',
      currentInventory: item.currentInventory != null ? String(item.currentInventory) : '',
    });
    setErrors({});
    setShowModal(true);
  };

  const validateForm = () => {
    const nextErrors = {};
    const supplyPrice = Number(form.supplyPrice);
    const currentInventory = Number(form.currentInventory);

    if (!form.supplier) nextErrors.supplier = 'Supplier is required';
    if (!form.product) nextErrors.product = 'Product is required';
    if (!form.supplyPrice) nextErrors.supplyPrice = 'Supply price is required';
    else if (Number.isNaN(supplyPrice) || supplyPrice <= 0) nextErrors.supplyPrice = 'Supply price must be a positive number';
    if (form.currentInventory === '') nextErrors.currentInventory = 'Current inventory is required';
    else if (Number.isNaN(currentInventory) || currentInventory < 0) nextErrors.currentInventory = 'Current inventory must be zero or more';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const payload = {
        supplier: form.supplier,
        product: form.product,
        supplyPrice: Number(form.supplyPrice),
        currentInventory: Number(form.currentInventory),
      };

      if (form.id) {
        await requestJson(`/api/supplier-products/${form.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await requestJson('/api/supplier-products', {
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

  const handleDelete = (item) => {
    Alert.alert('Remove Supplied Product', 'This supplier product record will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await requestJson(`/api/supplier-products/${item._id || item.id}`, { method: 'DELETE' });
            fetchData();
          } catch (error) {
            Alert.alert('Delete Failed', error.message);
          }
        },
      },
    ]);
  };

  if (loading) return <LoadingScreen message="Loading supplied products..." />;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Supplied Products</Text>
          <Text style={styles.headerSub}>Manage supplier product links, supply price, and live inventory</Text>
        </View>
        <TouchableOpacity onPress={openCreateModal} style={styles.addBtn}>
          <Ionicons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={supplierProducts}
        keyExtractor={(item) => item._id || String(item.id)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<Text style={styles.sectionTitle}>All Supplied Products</Text>}
        ListEmptyComponent={<EmptyState icon="🏷️" title="No supplied products yet" subtitle="Add supplier product records to track prices and inventory." />}
        renderItem={({ item }) => (
          <Card style={styles.productCard}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.productName}>{item.product?.name || 'Product'}</Text>
                <Text style={styles.supplierName}>{item.supplier?.name || 'Supplier'}</Text>
              </View>
              <Badge status="DELIVERED" label={`Stock ${item.currentInventory || 0}`} />
            </View>

            <Text style={styles.detailLine}>Category: {item.product?.category?.name || 'Uncategorized'}</Text>
            <Text style={styles.detailLine}>Supply Price: Rs. {Number(item.supplyPrice || 0).toFixed(2)}</Text>
            <Text style={styles.detailLine}>Current Inventory: {item.currentInventory || 0}</Text>

            <View style={styles.actionRow}>
              <Button title="Edit" variant="outline" size="sm" onPress={() => openEditModal(item)} style={{ flex: 1 }} />
              <Button title="Delete" variant="danger" size="sm" onPress={() => handleDelete(item)} style={{ flex: 1 }} />
            </View>
          </Card>
        )}
      />

      <Modal visible={showModal} animationType="slide" presentationStyle="formSheet" onRequestClose={closeModal}>
        <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.modalTitle}>{form.id ? 'Edit Supplied Product' : 'Add Supplied Product'}</Text>

          <Text style={styles.modalLabel}>Supplier</Text>
          <View style={styles.pickGrid}>
            {suppliers.map((item) => {
              const id = item._id || item.id;
              return (
                <PickerCard
                  key={id}
                  label={item.name}
                  sublabel={item.contactPerson || item.email}
                  active={String(form.supplier) === String(id)}
                  onPress={() => setForm((current) => ({ ...current, supplier: id }))}
                />
              );
            })}
          </View>
          {errors.supplier ? <Text style={styles.errorText}>{errors.supplier}</Text> : null}

          <Text style={styles.modalLabel}>Product</Text>
          <View style={styles.pickGrid}>
            {products.map((item) => {
              const id = item._id || item.id;
              return (
                <PickerCard
                  key={id}
                  label={item.name}
                  sublabel={item.category?.name || 'Uncategorized'}
                  active={String(form.product) === String(id)}
                  onPress={() => setForm((current) => ({ ...current, product: id }))}
                />
              );
            })}
          </View>
          {errors.product ? <Text style={styles.errorText}>{errors.product}</Text> : null}

          <Input
            label="Supply Price (Rs.)"
            value={form.supplyPrice}
            onChangeText={(value) => setForm((current) => ({ ...current, supplyPrice: value.replace(/[^0-9.]/g, '') }))}
            keyboardType="decimal-pad"
            placeholder="0.00"
            error={errors.supplyPrice}
          />
          <Input
            label="Current Inventory"
            value={form.currentInventory}
            onChangeText={(value) => setForm((current) => ({ ...current, currentInventory: value.replace(/[^0-9]/g, '') }))}
            keyboardType="number-pad"
            placeholder="0"
            error={errors.currentInventory}
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
  headerSub: { marginTop: 4, fontSize: 13, color: COLORS.lightGold, maxWidth: 255 },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: `${COLORS.gold}30`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: { padding: SPACING.md, paddingBottom: SPACING.xl, gap: SPACING.sm },
  sectionTitle: { fontSize: 20, ...FONTS.bold, color: COLORS.dark, marginBottom: SPACING.sm },
  productCard: { marginBottom: SPACING.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.md, marginBottom: SPACING.sm },
  productName: { fontSize: 17, ...FONTS.bold, color: COLORS.dark },
  supplierName: { marginTop: 2, fontSize: 13, color: COLORS.maroon, ...FONTS.medium },
  detailLine: { fontSize: 13, color: COLORS.gray600, marginBottom: 4 },
  actionRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  modalContent: { padding: SPACING.lg },
  modalTitle: { fontSize: 24, ...FONTS.bold, color: COLORS.dark, marginBottom: SPACING.md },
  modalLabel: { fontSize: 14, ...FONTS.medium, color: COLORS.dark, marginBottom: 8 },
  pickGrid: { gap: SPACING.sm, marginBottom: SPACING.md },
  pickItem: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.gray200,
    padding: SPACING.md,
    ...SHADOW.sm,
  },
  pickItemActive: {
    backgroundColor: COLORS.maroon,
    borderColor: COLORS.maroon,
  },
  pickTitle: { fontSize: 15, ...FONTS.semibold, color: COLORS.dark },
  pickTitleActive: { color: COLORS.white },
  pickSub: { marginTop: 4, fontSize: 12, color: COLORS.gray600 },
  pickSubActive: { color: `${COLORS.white}CC` },
  errorText: { fontSize: 12, color: COLORS.red, marginBottom: SPACING.md, marginTop: -6 },
  modalActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
});
