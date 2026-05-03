import React, { useEffect, useMemo, useState } from 'react';
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
  stockRequest: '',
  quantity: '',
  unitPrice: '',
};

function PickerCard({ label, sublabel, active, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.pickItem, active && styles.pickItemActive]}>
      <Text style={[styles.pickTitle, active && styles.pickTitleActive]}>{label}</Text>
      {sublabel ? <Text style={[styles.pickSub, active && styles.pickSubActive]}>{sublabel}</Text> : null}
    </TouchableOpacity>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <View style={[styles.statCard, { borderColor: `${accent}30` }]}>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function formatDate(value) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString();
}

export default function PurchaseOrdersScreen() {
  const isFocused = useIsFocused();
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [stockRequests, setStockRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const fetchData = async () => {
    try {
      setLoading(true);
      const [orderData, supplierData, productData, stockRequestData] = await Promise.all([
        requestJson('/api/purchase-orders'),
        requestJson('/api/suppliers'),
        requestJson('/api/products'),
        requestJson('/api/stock-requests'),
      ]);
      setOrders(orderData);
      setSuppliers(supplierData);
      setProducts(productData);
      setStockRequests(stockRequestData);
    } catch (error) {
      Alert.alert('Load Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) fetchData();
  }, [isFocused]);

  const stats = useMemo(() => {
    const pendingOrders = orders.filter((item) => item.status === 'PENDING').length;
    const deliveredOrders = orders.filter((item) => item.status === 'DELIVERED');
    const deliveredValue = deliveredOrders.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0);

    return {
      pendingOrders,
      deliveredOrders: deliveredOrders.length,
      deliveredValue,
    };
  }, [orders]);

  const requestOptions = useMemo(() => {
    return stockRequests.filter((request) => {
      const matchesProduct =
        !form.product ||
        String(request.product?._id || request.product) === String(form.product);
      const validStatus =
        request.status === 'PENDING' ||
        request.status === 'APPROVED' ||
        String(request._id || request.id) === String(form.stockRequest);
      return matchesProduct && validStatus;
    });
  }, [form.product, form.stockRequest, stockRequests]);

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

  const openEditModal = (order) => {
    setForm({
      id: order._id || order.id,
      supplier: order.supplier?._id || order.supplier || '',
      product: order.product?._id || order.product || '',
      stockRequest: order.stockRequest?._id || order.stockRequest || '',
      quantity: order.quantity != null ? String(order.quantity) : '',
      unitPrice: order.unitPrice != null ? String(order.unitPrice) : '',
    });
    setErrors({});
    setShowModal(true);
  };

  const validateForm = () => {
    const nextErrors = {};
    const quantity = Number(form.quantity);
    const unitPrice = Number(form.unitPrice);

    if (!form.supplier) nextErrors.supplier = 'Supplier is required';
    if (!form.product) nextErrors.product = 'Product is required';
    if (!form.quantity) nextErrors.quantity = 'Quantity is required';
    else if (Number.isNaN(quantity) || quantity <= 0) nextErrors.quantity = 'Quantity must be a positive number';
    if (!form.unitPrice) nextErrors.unitPrice = 'Unit price is required';
    else if (Number.isNaN(unitPrice) || unitPrice <= 0) nextErrors.unitPrice = 'Unit price must be a positive number';

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
        quantity: Number(form.quantity),
        unitPrice: Number(form.unitPrice),
        stockRequest: form.stockRequest || null,
      };

      if (form.id) {
        await requestJson(`/api/purchase-orders/${form.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await requestJson('/api/purchase-orders', {
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

  const handleDelete = (order) => {
    Alert.alert('Delete Purchase Order', 'This purchase order will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await requestJson(`/api/purchase-orders/${order._id || order.id}`, { method: 'DELETE' });
            fetchData();
          } catch (error) {
            Alert.alert('Delete Failed', error.message);
          }
        },
      },
    ]);
  };

  const handleDeliver = (order) => {
    Alert.alert(
      'Deliver & Update Stock',
      `Mark this order as delivered and add ${order.quantity} units to inventory?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deliver',
          onPress: async () => {
            try {
              await requestJson(`/api/purchase-orders/${order._id || order.id}/deliver`, {
                method: 'PUT',
              });
              fetchData();
            } catch (error) {
              Alert.alert('Delivery Failed', error.message);
            }
          },
        },
      ]
    );
  };

  if (loading) return <LoadingScreen message="Loading purchase orders..." />;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Purchase Orders</Text>
          <Text style={styles.headerSub}>Create orders, mark deliveries, and update stock automatically</Text>
        </View>
        <TouchableOpacity onPress={openCreateModal} style={styles.addBtn}>
          <Ionicons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item._id || String(item.id)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={(
          <View style={styles.listHeader}>
            <View style={styles.statsGrid}>
              <StatCard label="Pending" value={stats.pendingOrders} accent={COLORS.amber} />
              <StatCard label="Delivered" value={stats.deliveredOrders} accent={COLORS.green} />
              <StatCard label="Delivered Value" value={`Rs. ${stats.deliveredValue.toFixed(0)}`} accent={COLORS.blue} />
            </View>
            <Text style={styles.sectionTitle}>All Purchase Orders</Text>
          </View>
        )}
        ListEmptyComponent={<EmptyState icon="📋" title="No purchase orders yet" subtitle="Create a purchase order to start supplier fulfillment." />}
        renderItem={({ item }) => (
          <Card style={styles.orderCard}>
            <View style={styles.cardTop}>
              <Text style={styles.orderId}>PO #{String(item._id || item.id).slice(-6)}</Text>
              <Badge status={item.status} label={item.status} />
            </View>

            <View style={styles.detailGrid}>
              <Text style={styles.detailLine}>Supplier: {item.supplier?.name || 'N/A'}</Text>
              <Text style={styles.detailLine}>Product: {item.product?.name || 'N/A'}</Text>
              <Text style={styles.detailLine}>Quantity: {item.quantity || 0}</Text>
              <Text style={styles.detailLine}>Unit Price: Rs. {Number(item.unitPrice || 0).toFixed(2)}</Text>
              <Text style={styles.detailLine}>Total: Rs. {Number(item.totalAmount || 0).toFixed(2)}</Text>
              <Text style={styles.detailLine}>Order Date: {formatDate(item.orderDate)}</Text>
              {item.deliveredAt ? <Text style={styles.detailLine}>Delivered: {formatDate(item.deliveredAt)}</Text> : null}
              {item.stockRequest ? (
                <Text style={styles.detailLine}>
                  Stock Request: {item.stockRequest.product?.name || 'Linked'} x{item.stockRequest.requestedQuantity}
                </Text>
              ) : null}
            </View>

            <View style={styles.actionRow}>
              <Button title="Edit" variant="outline" size="sm" onPress={() => openEditModal(item)} style={{ flex: 1 }} />
              <Button title="Delete" variant="danger" size="sm" onPress={() => handleDelete(item)} style={{ flex: 1 }} />
            </View>

            {item.status === 'PENDING' ? (
              <Button title="Deliver & Update Stock" variant="secondary" size="sm" onPress={() => handleDeliver(item)} style={{ marginTop: SPACING.sm }} />
            ) : null}
          </Card>
        )}
      />

      <Modal visible={showModal} animationType="slide" presentationStyle="formSheet" onRequestClose={closeModal}>
        <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.modalTitle}>{form.id ? 'Edit Purchase Order' : 'Create Purchase Order'}</Text>

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
                  sublabel={`Stock ${item.stockQuantity || 0}`}
                  active={String(form.product) === String(id)}
                  onPress={() =>
                    setForm((current) => ({
                      ...current,
                      product: id,
                      stockRequest: '',
                    }))
                  }
                />
              );
            })}
          </View>
          {errors.product ? <Text style={styles.errorText}>{errors.product}</Text> : null}

          <Text style={styles.modalLabel}>Related Stock Request (optional)</Text>
          <TouchableOpacity onPress={() => setForm((current) => ({ ...current, stockRequest: '' }))} style={styles.clearLink}>
            <Text style={styles.clearLinkText}>Clear linked request</Text>
          </TouchableOpacity>
          <View style={styles.pickGrid}>
            {requestOptions.length ? (
              requestOptions.map((item) => {
                const id = item._id || item.id;
                return (
                  <PickerCard
                    key={id}
                    label={`${item.product?.name || 'Product'} x${item.requestedQuantity}`}
                    sublabel={`${item.status} • ${item.requestedBy || 'Staff'}`}
                    active={String(form.stockRequest) === String(id)}
                    onPress={() => setForm((current) => ({ ...current, stockRequest: id }))}
                  />
                );
              })
            ) : (
              <Text style={styles.helperText}>No matching pending or approved stock requests for the selected product.</Text>
            )}
          </View>

          <Input
            label="Quantity"
            value={form.quantity}
            onChangeText={(value) => setForm((current) => ({ ...current, quantity: value.replace(/[^0-9]/g, '') }))}
            keyboardType="number-pad"
            placeholder="0"
            error={errors.quantity}
          />
          <Input
            label="Unit Price (Rs.)"
            value={form.unitPrice}
            onChangeText={(value) => setForm((current) => ({ ...current, unitPrice: value.replace(/[^0-9.]/g, '') }))}
            keyboardType="decimal-pad"
            placeholder="0.00"
            error={errors.unitPrice}
          />

          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>Calculated Total</Text>
            <Text style={styles.summaryValue}>
              Rs. {(Number(form.quantity || 0) * Number(form.unitPrice || 0)).toFixed(2)}
            </Text>
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
  headerSub: { marginTop: 4, fontSize: 13, color: COLORS.lightGold, maxWidth: 260 },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: `${COLORS.gold}30`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: { paddingBottom: SPACING.xl },
  listHeader: { padding: SPACING.md, gap: SPACING.md },
  statsGrid: { flexDirection: 'row', gap: SPACING.sm },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    ...SHADOW.sm,
  },
  statValue: { fontSize: 20, ...FONTS.bold },
  statLabel: { marginTop: 4, fontSize: 12, color: COLORS.gray600 },
  sectionTitle: { fontSize: 20, ...FONTS.bold, color: COLORS.dark },
  orderCard: { marginHorizontal: SPACING.md, marginBottom: SPACING.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.md, marginBottom: SPACING.sm },
  orderId: { fontSize: 18, ...FONTS.bold, color: COLORS.dark },
  detailGrid: { gap: 4 },
  detailLine: { fontSize: 13, color: COLORS.gray600 },
  actionRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
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
  },
  pickItemActive: {
    backgroundColor: COLORS.maroon,
    borderColor: COLORS.maroon,
  },
  pickTitle: { fontSize: 15, ...FONTS.semibold, color: COLORS.dark },
  pickTitleActive: { color: COLORS.white },
  pickSub: { marginTop: 4, fontSize: 12, color: COLORS.gray600 },
  pickSubActive: { color: `${COLORS.white}CC` },
  clearLink: { alignSelf: 'flex-start', marginBottom: 8 },
  clearLinkText: { fontSize: 13, color: COLORS.maroon, ...FONTS.medium },
  helperText: { fontSize: 12, color: COLORS.gray600, marginBottom: SPACING.md },
  errorText: { fontSize: 12, color: COLORS.red, marginBottom: SPACING.md, marginTop: -6 },
  summaryBox: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    marginTop: SPACING.sm,
  },
  summaryTitle: { fontSize: 13, color: COLORS.gray600 },
  summaryValue: { fontSize: 24, ...FONTS.bold, color: COLORS.maroon, marginTop: 6 },
  modalActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg },
});
