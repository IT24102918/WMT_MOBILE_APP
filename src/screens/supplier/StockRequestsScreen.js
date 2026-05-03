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
  product: '',
  requestedQuantity: '',
  requestedBy: '',
  notes: '',
  status: 'PENDING',
};

const STATUS_OPTIONS = ['PENDING', 'APPROVED', 'PO_CREATED', 'FULFILLED'];

function StatusChip({ label, active, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.statusChip, active && styles.statusChipActive]}>
      <Text style={[styles.statusChipText, active && styles.statusChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ProductCard({ label, sublabel, active, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.pickItem, active && styles.pickItemActive]}>
      <Text style={[styles.pickTitle, active && styles.pickTitleActive]}>{label}</Text>
      {sublabel ? <Text style={[styles.pickSub, active && styles.pickSubActive]}>{sublabel}</Text> : null}
    </TouchableOpacity>
  );
}

function formatDate(value) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString();
}

export default function StockRequestsScreen() {
  const isFocused = useIsFocused();
  const [requests, setRequests] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const fetchData = async () => {
    try {
      setLoading(true);
      const [requestData, productData] = await Promise.all([
        requestJson('/api/stock-requests'),
        requestJson('/api/products'),
      ]);
      setRequests(requestData);
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
    setErrors({});
    setForm(EMPTY_FORM);
  };

  const openCreateModal = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setShowModal(true);
  };

  const openEditModal = (request) => {
    setForm({
      id: request._id || request.id,
      product: request.product?._id || request.product || '',
      requestedQuantity: request.requestedQuantity != null ? String(request.requestedQuantity) : '',
      requestedBy: request.requestedBy || '',
      notes: request.notes || '',
      status: request.status || 'PENDING',
    });
    setErrors({});
    setShowModal(true);
  };

  const validateForm = () => {
    const nextErrors = {};
    const quantity = Number(form.requestedQuantity);

    if (!form.product) nextErrors.product = 'Product is required';
    if (!form.requestedQuantity) nextErrors.requestedQuantity = 'Requested quantity is required';
    else if (Number.isNaN(quantity) || quantity <= 0) nextErrors.requestedQuantity = 'Quantity must be a positive number';
    if (!form.requestedBy.trim()) nextErrors.requestedBy = 'Requested by is required';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const payload = {
        product: form.product,
        requestedQuantity: Number(form.requestedQuantity),
        requestedBy: form.requestedBy.trim(),
        notes: form.notes.trim(),
        status: form.status,
      };

      if (form.id) {
        await requestJson(`/api/stock-requests/${form.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await requestJson('/api/stock-requests', {
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

  const handleDelete = (request) => {
    Alert.alert('Delete Stock Request', 'This stock request will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await requestJson(`/api/stock-requests/${request._id || request.id}`, { method: 'DELETE' });
            fetchData();
          } catch (error) {
            Alert.alert('Delete Failed', error.message);
          }
        },
      },
    ]);
  };

  const changeStatus = async (request, endpoint, nextLabel) => {
    try {
      await requestJson(`/api/stock-requests/${request._id || request.id}/${endpoint}`, { method: 'PUT' });
      fetchData();
    } catch (error) {
      Alert.alert(`${nextLabel} Failed`, error.message);
    }
  };

  if (loading) return <LoadingScreen message="Loading stock requests..." />;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Stock Requests</Text>
          <Text style={styles.headerSub}>Track low-stock needs and push them through fulfillment</Text>
        </View>
        <TouchableOpacity onPress={openCreateModal} style={styles.addBtn}>
          <Ionicons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={requests}
        keyExtractor={(item) => item._id || String(item.id)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<Text style={styles.sectionTitle}>All Stock Requests</Text>}
        ListEmptyComponent={<EmptyState icon="📦" title="No stock requests yet" subtitle="Create a stock request to start the supplier workflow." />}
        renderItem={({ item }) => (
          <Card style={styles.requestCard}>
            <View style={styles.cardTop}>
              <Text style={styles.productName}>{item.product?.name || 'Product'}</Text>
              <Badge status={item.status} label={item.status.replace('_', ' ')} />
            </View>

            <Text style={styles.detailLine}>Requested Quantity: {item.requestedQuantity}</Text>
            <Text style={styles.detailLine}>Requested By: {item.requestedBy || 'Staff'}</Text>
            <Text style={styles.detailLine}>Created: {formatDate(item.createdAt)}</Text>
            {item.notes ? <Text style={styles.detailLine}>Notes: {item.notes}</Text> : null}
            {item.purchaseOrder ? (
              <Text style={styles.detailLine}>Linked PO: #{String(item.purchaseOrder._id || item.purchaseOrder.id).slice(-6)}</Text>
            ) : null}

            <View style={styles.actionRow}>
              <Button title="Edit" variant="outline" size="sm" onPress={() => openEditModal(item)} style={{ flex: 1 }} />
              <Button title="Delete" variant="danger" size="sm" onPress={() => handleDelete(item)} style={{ flex: 1 }} />
            </View>

            <View style={styles.statusActionWrap}>
              {item.status === 'PENDING' ? (
                <Button title="Approve" variant="secondary" size="sm" onPress={() => changeStatus(item, 'approve', 'Approve')} />
              ) : null}
              {item.status === 'APPROVED' ? (
                <Button title="Mark PO Created" variant="outline" size="sm" onPress={() => changeStatus(item, 'po-created', 'PO Created')} />
              ) : null}
              {(item.status === 'APPROVED' || item.status === 'PO_CREATED') ? (
                <Button title="Fulfill" size="sm" onPress={() => changeStatus(item, 'fulfill', 'Fulfill')} />
              ) : null}
            </View>
          </Card>
        )}
      />

      <Modal visible={showModal} animationType="slide" presentationStyle="formSheet" onRequestClose={closeModal}>
        <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.modalTitle}>{form.id ? 'Edit Stock Request' : 'Create Stock Request'}</Text>

          <Text style={styles.modalLabel}>Product</Text>
          <View style={styles.pickGrid}>
            {products.map((item) => {
              const id = item._id || item.id;
              return (
                <ProductCard
                  key={id}
                  label={item.name}
                  sublabel={`In stock ${item.stockQuantity || 0}`}
                  active={String(form.product) === String(id)}
                  onPress={() => setForm((current) => ({ ...current, product: id }))}
                />
              );
            })}
          </View>
          {errors.product ? <Text style={styles.errorText}>{errors.product}</Text> : null}

          <Input
            label="Requested Quantity"
            value={form.requestedQuantity}
            onChangeText={(value) => setForm((current) => ({ ...current, requestedQuantity: value.replace(/[^0-9]/g, '') }))}
            keyboardType="number-pad"
            placeholder="0"
            error={errors.requestedQuantity}
          />
          <Input
            label="Requested By"
            value={form.requestedBy}
            onChangeText={(value) => setForm((current) => ({ ...current, requestedBy: value }))}
            placeholder="Staff name"
            error={errors.requestedBy}
          />
          <Input
            label="Notes"
            value={form.notes}
            onChangeText={(value) => setForm((current) => ({ ...current, notes: value }))}
            placeholder="Optional notes"
            multiline
            numberOfLines={3}
          />

          <Text style={styles.modalLabel}>Status</Text>
          <View style={styles.statusChipWrap}>
            {STATUS_OPTIONS.map((status) => (
              <StatusChip
                key={status}
                label={status.replace('_', ' ')}
                active={form.status === status}
                onPress={() => setForm((current) => ({ ...current, status }))}
              />
            ))}
          </View>

          <View style={styles.modalActions}>
            <Button title="Cancel" variant="outline" onPress={closeModal} style={{ flex: 1 }} />
            <Button title={form.id ? 'Update' : 'Create'} onPress={handleSave} loading={saving} style={{ flex: 1 }} />
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
  headerSub: { marginTop: 4, fontSize: 13, color: COLORS.lightGold, maxWidth: 250 },
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
  requestCard: { marginBottom: SPACING.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.md, marginBottom: SPACING.sm },
  productName: { flex: 1, fontSize: 17, ...FONTS.bold, color: COLORS.dark },
  detailLine: { fontSize: 13, color: COLORS.gray600, marginBottom: 4 },
  actionRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  statusActionWrap: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap', marginTop: SPACING.sm },
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
  statusChipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.gray200,
    backgroundColor: COLORS.white,
  },
  statusChipActive: {
    backgroundColor: COLORS.maroon,
    borderColor: COLORS.maroon,
  },
  statusChipText: { fontSize: 13, color: COLORS.gray600, ...FONTS.medium },
  statusChipTextActive: { color: COLORS.white },
  errorText: { fontSize: 12, color: COLORS.red, marginBottom: SPACING.md, marginTop: -6 },
  modalActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
});
