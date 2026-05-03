import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../../context/AuthContext';
import { Badge, Button, Card, EmptyState, Input, LoadingScreen } from '../../components/UI';
import { requestJson, requestMultipart, resolveApiMediaUrl } from '../../config/api';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../../constants/theme';

const ITEM_TABS = [
  ['all', 'All Items'],
  ['low', 'Low Stock'],
  ['requests', 'Requests'],
  ['catalog', 'Catalog'],
];

const STATUS_OPTIONS = ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'EXPIRED'];

const EMPTY_ITEM_FORM = {
  id: null,
  product: '',
  quantity: '',
  minReorderLevel: '',
  warehouseLocation: '',
  expiryDate: '',
  stockStatus: 'IN_STOCK',
  note: '',
};

const EMPTY_REQUEST_FORM = {
  id: null,
  product: '',
  requestedQuantity: '',
  requestedBy: '',
  notes: '',
  status: 'PENDING',
};

const EMPTY_PRODUCT_FORM = {
  id: null,
  name: '',
  description: '',
  price: '',
  stockQuantity: '',
  category: '',
  imageUrl: '',
};

const EMPTY_CATEGORY_FORM = {
  id: null,
  name: '',
};

function StatCard({ label, value, accent }) {
  return (
    <View style={[styles.statCard, { borderColor: `${accent}30` }]}>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SelectCard({ title, subtitle, active, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.selectCard, active && styles.selectCardActive]}>
      <Text style={[styles.selectTitle, active && styles.selectTitleActive]}>{title}</Text>
      {subtitle ? <Text style={[styles.selectSubtitle, active && styles.selectSubtitleActive]}>{subtitle}</Text> : null}
    </TouchableOpacity>
  );
}

function StatusChip({ label, active, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.statusChip, active && styles.statusChipActive]}>
      <Text style={[styles.statusChipText, active && styles.statusChipTextActive]}>{label.replace(/_/g, ' ')}</Text>
    </TouchableOpacity>
  );
}

function formatDate(value) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString();
}

function isValidDateInput(value) {
  if (!value) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime());
}

function isValidImageInput(value) {
  if (!value) return true;
  return /^https?:\/\//i.test(value) || value.startsWith('/uploads/');
}

function ProductThumb({ imageUrl, localUri, style }) {
  const sourceUri = localUri || resolveApiMediaUrl(imageUrl);

  if (sourceUri) {
    return <Image source={{ uri: sourceUri }} style={style} resizeMode="cover" />;
  }

  return (
    <View style={[style, styles.productThumbFallback]}>
      <Ionicons name="image-outline" size={26} color={COLORS.gold} />
    </View>
  );
}

export default function InventoryOverviewScreen() {
  const { user } = useAuth();
  const isFocused = useIsFocused();
  const [inventory, setInventory] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [requests, setRequests] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [showItemModal, setShowItemModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM_FORM);
  const [requestForm, setRequestForm] = useState(EMPTY_REQUEST_FORM);
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT_FORM);
  const [categoryForm, setCategoryForm] = useState(EMPTY_CATEGORY_FORM);
  const [itemErrors, setItemErrors] = useState({});
  const [requestErrors, setRequestErrors] = useState({});
  const [productErrors, setProductErrors] = useState({});
  const [categoryErrors, setCategoryErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [pendingProductImage, setPendingProductImage] = useState(null);
  const [historyTitle, setHistoryTitle] = useState('');
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [inventoryData, lowStockData, requestData, productData, categoryData] = await Promise.all([
        requestJson('/api/inventory'),
        requestJson('/api/inventory/low-stock'),
        requestJson('/api/stock-requests'),
        requestJson('/api/products'),
        requestJson('/api/categories'),
      ]);
      setInventory(inventoryData);
      setLowStock(lowStockData);
      setRequests(requestData);
      setProducts(productData);
      setCategories(categoryData);
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
    const lowCount = lowStock.length;
    const requestCount = requests.length;
    const totalQty = inventory.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    return {
      totalItems: inventory.length,
      lowCount,
      requestCount,
      totalQty,
      productCount: products.length,
      categoryCount: categories.length,
    };
  }, [inventory, lowStock, requests, products, categories]);

  const displayed = tab === 'low' ? lowStock : tab === 'requests' ? requests : inventory;
  const categoryProductCounts = useMemo(() => {
    const counts = new Map();
    products.forEach((product) => {
      const categoryId = product.category?._id || product.category;
      if (!categoryId) return;
      counts.set(String(categoryId), (counts.get(String(categoryId)) || 0) + 1);
    });
    return counts;
  }, [products]);

  const closeItemModal = () => {
    setShowItemModal(false);
    setItemForm(EMPTY_ITEM_FORM);
    setItemErrors({});
    setSaving(false);
  };

  const closeRequestModal = () => {
    setShowRequestModal(false);
    setRequestForm(EMPTY_REQUEST_FORM);
    setRequestErrors({});
    setSaving(false);
  };

  const closeProductModal = () => {
    setShowProductModal(false);
    setProductForm(EMPTY_PRODUCT_FORM);
    setProductErrors({});
    setPendingProductImage(null);
    setSaving(false);
  };

  const closeCategoryModal = () => {
    setShowCategoryModal(false);
    setCategoryForm(EMPTY_CATEGORY_FORM);
    setCategoryErrors({});
    setSaving(false);
  };

  const openCreateItemModal = () => {
    setItemForm(EMPTY_ITEM_FORM);
    setItemErrors({});
    setShowItemModal(true);
  };

  const openEditItemModal = (item) => {
    setItemForm({
      id: item._id || item.id,
      product: item.product?._id || item.product || '',
      quantity: item.quantity != null ? String(item.quantity) : '',
      minReorderLevel: item.minReorderLevel != null ? String(item.minReorderLevel) : '',
      warehouseLocation: item.warehouseLocation || '',
      expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().slice(0, 10) : '',
      stockStatus: item.stockStatus || 'IN_STOCK',
      note: '',
    });
    setItemErrors({});
    setShowItemModal(true);
  };

  const openCreateRequestModal = () => {
    setRequestForm({
      ...EMPTY_REQUEST_FORM,
      requestedBy: user?.name || 'Inventory Manager',
    });
    setRequestErrors({});
    setShowRequestModal(true);
  };

  const openCreateProductModal = () => {
    setProductForm(EMPTY_PRODUCT_FORM);
    setProductErrors({});
    setPendingProductImage(null);
    setShowProductModal(true);
  };

  const openEditProductModal = (product) => {
    setProductForm({
      id: product._id || product.id,
      name: product.name || '',
      description: product.description || '',
      price: product.price != null ? String(product.price) : '',
      stockQuantity: product.stockQuantity != null ? String(product.stockQuantity) : '',
      category: product.category?._id || product.category || '',
      imageUrl: product.imageUrl || '',
    });
    setProductErrors({});
    setPendingProductImage(null);
    setShowProductModal(true);
  };

  const openCreateCategoryModal = () => {
    setCategoryForm(EMPTY_CATEGORY_FORM);
    setCategoryErrors({});
    setShowCategoryModal(true);
  };

  const openEditCategoryModal = (category) => {
    setCategoryForm({
      id: category._id || category.id,
      name: category.name || '',
    });
    setCategoryErrors({});
    setShowCategoryModal(true);
  };

  const openEditRequestModal = (item) => {
    setRequestForm({
      id: item._id || item.id,
      product: item.product?._id || item.product || '',
      requestedQuantity: item.requestedQuantity != null ? String(item.requestedQuantity) : '',
      requestedBy: item.requestedBy || user?.name || '',
      notes: item.notes || '',
      status: item.status || 'PENDING',
    });
    setRequestErrors({});
    setShowRequestModal(true);
  };

  const validateItemForm = () => {
    const nextErrors = {};
    const quantity = Number(itemForm.quantity);
    const minReorderLevel = itemForm.minReorderLevel === '' ? 0 : Number(itemForm.minReorderLevel);

    if (!itemForm.product) nextErrors.product = 'Product is required';
    if (itemForm.quantity === '') nextErrors.quantity = 'Quantity is required';
    else if (Number.isNaN(quantity) || quantity < 0) nextErrors.quantity = 'Quantity must be zero or a positive number';
    if (!itemForm.warehouseLocation.trim()) nextErrors.warehouseLocation = 'Warehouse location is required';
    if (itemForm.minReorderLevel !== '' && (Number.isNaN(minReorderLevel) || minReorderLevel < 0)) {
      nextErrors.minReorderLevel = 'Minimum reorder level must be zero or a positive number';
    }
    if (!isValidDateInput(itemForm.expiryDate)) nextErrors.expiryDate = 'Expiry date must be in YYYY-MM-DD format';

    setItemErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateRequestForm = () => {
    const nextErrors = {};
    const requestedQuantity = Number(requestForm.requestedQuantity);

    if (!requestForm.product) nextErrors.product = 'Product is required';
    if (requestForm.requestedQuantity === '') nextErrors.requestedQuantity = 'Requested quantity is required';
    else if (Number.isNaN(requestedQuantity) || requestedQuantity <= 0) nextErrors.requestedQuantity = 'Requested quantity must be a positive number';
    if (!requestForm.requestedBy.trim()) nextErrors.requestedBy = 'Requested by is required';

    setRequestErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateProductForm = () => {
    const nextErrors = {};
    const price = Number(productForm.price);
    const stockQuantity = productForm.stockQuantity === '' ? 0 : Number(productForm.stockQuantity);

    if (!productForm.name.trim()) nextErrors.name = 'Product name is required';
    if (productForm.price === '') nextErrors.price = 'Price is required';
    else if (Number.isNaN(price) || price < 0) nextErrors.price = 'Price must be zero or a positive number';
    if (productForm.stockQuantity !== '' && (Number.isNaN(stockQuantity) || stockQuantity < 0)) {
      nextErrors.stockQuantity = 'Stock quantity must be zero or a positive number';
    }
    if (!isValidImageInput(productForm.imageUrl.trim())) {
      nextErrors.imageUrl = 'Image URL must start with http://, https://, or /uploads/';
    }

    setProductErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const pickProductImage = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      setPendingProductImage({
        uri: asset.uri,
        name: asset.name || `product-${Date.now()}.jpg`,
        mimeType: asset.mimeType || 'image/jpeg',
      });
      setProductErrors((current) => ({ ...current, imageUrl: undefined }));
    } catch (error) {
      Alert.alert('Image Pick Failed', error.message);
    }
  };

  const validateCategoryForm = () => {
    const nextErrors = {};
    if (!categoryForm.name.trim()) nextErrors.name = 'Category name is required';
    setCategoryErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const saveItem = async () => {
    if (!validateItemForm()) return;
    setSaving(true);
    try {
      const payload = {
        product: itemForm.product,
        quantity: Number(itemForm.quantity),
        minReorderLevel: itemForm.minReorderLevel === '' ? 0 : Number(itemForm.minReorderLevel),
        warehouseLocation: itemForm.warehouseLocation.trim(),
        expiryDate: itemForm.expiryDate || null,
        stockStatus: itemForm.stockStatus,
        note: itemForm.note.trim(),
      };

      if (itemForm.id) {
        await requestJson(`/api/inventory/${itemForm.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await requestJson('/api/inventory', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      closeItemModal();
      fetchData();
    } catch (error) {
      Alert.alert('Save Failed', error.message);
      setSaving(false);
    }
  };

  const saveRequest = async () => {
    if (!validateRequestForm()) return;
    setSaving(true);
    try {
      const payload = {
        product: requestForm.product,
        requestedQuantity: Number(requestForm.requestedQuantity),
        requestedBy: requestForm.requestedBy.trim(),
        notes: requestForm.notes.trim(),
        status: requestForm.status,
      };

      if (requestForm.id) {
        await requestJson(`/api/stock-requests/${requestForm.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await requestJson('/api/stock-requests', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      closeRequestModal();
      fetchData();
    } catch (error) {
      Alert.alert('Save Failed', error.message);
      setSaving(false);
    }
  };

  const saveProduct = async () => {
    if (!validateProductForm()) return;
    setSaving(true);
    try {
      const payload = {
        name: productForm.name.trim(),
        description: productForm.description.trim(),
        price: Number(productForm.price),
        stockQuantity: productForm.stockQuantity === '' ? 0 : Number(productForm.stockQuantity),
        category: productForm.category || null,
        imageUrl: productForm.imageUrl.trim(),
      };

      let savedProduct;
      if (productForm.id) {
        savedProduct = await requestJson(`/api/products/${productForm.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        savedProduct = await requestJson('/api/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      if (pendingProductImage && savedProduct?._id) {
        const formData = new FormData();
        formData.append('image', {
          uri: pendingProductImage.uri,
          name: pendingProductImage.name,
          type: pendingProductImage.mimeType,
        });

        savedProduct = await requestMultipart(`/api/products/${savedProduct._id}/image`, formData, {
          method: 'POST',
        });
      }

      closeProductModal();
      fetchData();
    } catch (error) {
      Alert.alert('Save Failed', error.message);
      setSaving(false);
    }
  };

  const saveCategory = async () => {
    if (!validateCategoryForm()) return;
    setSaving(true);
    try {
      const payload = { name: categoryForm.name.trim() };

      if (categoryForm.id) {
        await requestJson(`/api/categories/${categoryForm.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await requestJson('/api/categories', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      closeCategoryModal();
      fetchData();
    } catch (error) {
      Alert.alert('Save Failed', error.message);
      setSaving(false);
    }
  };

  const deleteInventoryItem = (item) => {
    Alert.alert('Delete Stock Item', 'This inventory record will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await requestJson(`/api/inventory/${item._id || item.id}`, { method: 'DELETE' });
            fetchData();
          } catch (error) {
            Alert.alert('Delete Failed', error.message);
          }
        },
      },
    ]);
  };

  const deleteStockRequest = (item) => {
    Alert.alert('Delete Stock Request', 'This stock request will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await requestJson(`/api/stock-requests/${item._id || item.id}`, { method: 'DELETE' });
            fetchData();
          } catch (error) {
            Alert.alert('Delete Failed', error.message);
          }
        },
      },
    ]);
  };

  const deleteProduct = (product) => {
    Alert.alert(
      'Delete Product',
      'This will remove the product and related inventory, stock requests, supplier products, purchase orders, and logs.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await requestJson(`/api/products/${product._id || product.id}`, { method: 'DELETE' });
              fetchData();
            } catch (error) {
              Alert.alert('Delete Failed', error.message);
            }
          },
        },
      ]
    );
  };

  const deleteCategory = (category) => {
    Alert.alert(
      'Delete Category',
      'This will remove the category and clear it from linked products.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await requestJson(`/api/categories/${category._id || category.id}`, { method: 'DELETE' });
              fetchData();
            } catch (error) {
              Alert.alert('Delete Failed', error.message);
            }
          },
        },
      ]
    );
  };

  const openHistory = async (item) => {
    const productId = item.product?._id || item.product;
    if (!productId) return;

    setHistoryTitle(item.product?.name || 'Stock History');
    setHistoryLogs([]);
    setShowHistoryModal(true);
    setHistoryLoading(true);

    try {
      const logs = await requestJson(`/api/stock-logs/product/${productId}`);
      setHistoryLogs(logs);
    } catch (error) {
      Alert.alert('History Failed', error.message);
      setShowHistoryModal(false);
    } finally {
      setHistoryLoading(false);
    }
  };

  if (loading) return <LoadingScreen message="Loading inventory..." />;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Inventory</Text>
          <Text style={styles.subtitle}>Manage stock, warehouses, expiry, and stock requests</Text>
        </View>
        <TouchableOpacity
          onPress={
            tab === 'requests'
              ? openCreateRequestModal
              : tab === 'catalog'
              ? openCreateProductModal
              : openCreateItemModal
          }
          style={styles.addBtn}
        >
          <Ionicons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <StatCard label="Items" value={stats.totalItems} accent={COLORS.gold} />
        <StatCard label="Low Stock" value={stats.lowCount} accent={COLORS.amber} />
        <StatCard label="Products" value={stats.productCount} accent={COLORS.blue} />
        <StatCard label="Categories" value={stats.categoryCount} accent={COLORS.green} />
      </View>

      <View style={styles.tabRow}>
        {ITEM_TABS.map(([key, label]) => (
          <TouchableOpacity key={key} onPress={() => setTab(key)} style={[styles.tab, tab === key && styles.tabActive]}>
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'catalog' ? (
        <ScrollView contentContainerStyle={styles.catalogContent}>
          <Card style={styles.catalogActions}>
            <Text style={styles.catalogTitle}>Product & Category Management</Text>
            <Text style={styles.catalogSubtitle}>Add, view, edit, and remove products or categories.</Text>
            <View style={styles.actionRow}>
              <Button title="Add Product" onPress={openCreateProductModal} style={{ flex: 1 }} />
              <Button title="Add Category" variant="outline" onPress={openCreateCategoryModal} style={{ flex: 1 }} />
            </View>
          </Card>

          <Text style={styles.sectionTitle}>Categories</Text>
          {categories.length ? (
            categories.map((category) => {
              const id = category._id || category.id;
              return (
                <Card key={id} style={styles.catalogCard}>
                  <View style={styles.catalogRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{category.name}</Text>
                      <Text style={styles.itemMeta}>
                        {categoryProductCounts.get(String(id)) || 0} linked products
                      </Text>
                    </View>
                    <View style={styles.smallActionRow}>
                      <Button title="Edit" size="sm" variant="outline" onPress={() => openEditCategoryModal(category)} />
                      <Button title="Delete" size="sm" variant="danger" onPress={() => deleteCategory(category)} />
                    </View>
                  </View>
                </Card>
              );
            })
          ) : (
            <EmptyState icon="🗂️" title="No categories yet" subtitle="Create the first category to organize products." />
          )}

          <Text style={styles.sectionTitle}>Products</Text>
          {products.length ? (
            products.map((product) => (
              <Card key={product._id || product.id} style={styles.catalogCard}>
                <View style={styles.catalogRow}>
                  <ProductThumb imageUrl={product.imageUrl} style={styles.catalogProductImage} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{product.name}</Text>
                    <Text style={styles.itemMeta}>{product.category?.name || 'Uncategorized'}</Text>
                    <Text style={styles.itemMeta}>Price: Rs. {Number(product.price || 0).toFixed(2)}</Text>
                    <Text style={styles.itemMeta}>Stock: {product.stockQuantity || 0}</Text>
                  </View>
                  <View style={styles.smallActionRow}>
                    <Button title="Edit" size="sm" variant="outline" onPress={() => openEditProductModal(product)} />
                    <Button title="Delete" size="sm" variant="danger" onPress={() => deleteProduct(product)} />
                  </View>
                </View>
              </Card>
            ))
          ) : (
            <EmptyState icon="🏷️" title="No products yet" subtitle="Add products to start managing inventory and shop items." />
          )}
        </ScrollView>
      ) : (
      <FlatList
        data={displayed}
        keyExtractor={(item) => item._id || String(item.id)}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon={tab === 'requests' ? '📋' : tab === 'low' ? '⚠️' : '📦'}
            title={
              tab === 'requests'
                ? 'No stock requests'
                : tab === 'low'
                ? 'No low-stock items'
                : 'No inventory items'
            }
            subtitle={tab === 'requests' ? 'Create a stock request to notify suppliers.' : undefined}
          />
        }
        renderItem={({ item }) =>
          tab === 'requests' ? (
            <Card style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.product?.name || 'Product'}</Text>
                  <Text style={styles.itemMeta}>Requested by {item.requestedBy || 'Staff'}</Text>
                </View>
                <Badge status={item.status} label={item.status.replace(/_/g, ' ')} />
              </View>
              <Text style={styles.itemMeta}>Quantity: {item.requestedQuantity}</Text>
              <Text style={styles.itemMeta}>Created: {formatDate(item.createdAt)}</Text>
              {item.notes ? <Text style={styles.itemMeta}>Notes: {item.notes}</Text> : null}
              <View style={styles.actionRow}>
                <Button title="Edit" variant="outline" size="sm" onPress={() => openEditRequestModal(item)} style={{ flex: 1 }} />
                <Button title="Delete" variant="danger" size="sm" onPress={() => deleteStockRequest(item)} style={{ flex: 1 }} />
              </View>
            </Card>
          ) : (
            <Card style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.iconWrap}>
                  <Ionicons name="cube-outline" size={22} color={COLORS.green} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.product?.name || 'Product'}</Text>
                  <Text style={styles.itemMeta}>Warehouse: {item.warehouseLocation || 'N/A'}</Text>
                  <Text style={styles.itemMeta}>Status: {item.stockStatus?.replace(/_/g, ' ') || 'IN STOCK'}</Text>
                </View>
                <View style={styles.qtyWrap}>
                  <Text style={styles.qtyValue}>{item.quantity}</Text>
                  <Text style={styles.itemMeta}>in stock</Text>
                </View>
              </View>

              <View style={styles.detailBlock}>
                <Text style={styles.itemMeta}>Min reorder: {item.minReorderLevel ?? 0}</Text>
                <Text style={styles.itemMeta}>Expiry: {item.expiryDate ? formatDate(item.expiryDate) : 'None'}</Text>
              </View>

              <View style={styles.actionRow}>
                <Button title="History" variant="outline" size="sm" onPress={() => openHistory(item)} style={{ flex: 1 }} />
                <Button title="Edit" variant="outline" size="sm" onPress={() => openEditItemModal(item)} style={{ flex: 1 }} />
                <Button title="Delete" variant="danger" size="sm" onPress={() => deleteInventoryItem(item)} style={{ flex: 1 }} />
              </View>
            </Card>
          )
        }
      />
      )}

      <Modal visible={showItemModal} animationType="slide" presentationStyle="formSheet" onRequestClose={closeItemModal}>
        <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.modalTitle}>{itemForm.id ? 'Edit Stock Item' : 'Add Stock Item'}</Text>

          <Text style={styles.modalLabel}>Product</Text>
          <View style={styles.selectList}>
            {products.map((product) => {
              const productId = product._id || product.id;
              return (
                <SelectCard
                  key={productId}
                  title={product.name}
                  subtitle={`Current shop stock ${product.stockQuantity || 0}`}
                  active={String(itemForm.product) === String(productId)}
                  onPress={() => setItemForm((current) => ({ ...current, product: productId }))}
                />
              );
            })}
          </View>
          {itemErrors.product ? <Text style={styles.errorText}>{itemErrors.product}</Text> : null}

          <Input
            label="Quantity"
            value={itemForm.quantity}
            onChangeText={(value) => setItemForm((current) => ({ ...current, quantity: value.replace(/[^0-9]/g, '') }))}
            keyboardType="number-pad"
            placeholder="0"
            error={itemErrors.quantity}
          />
          <Input
            label="Minimum Reorder Level"
            value={itemForm.minReorderLevel}
            onChangeText={(value) => setItemForm((current) => ({ ...current, minReorderLevel: value.replace(/[^0-9]/g, '') }))}
            keyboardType="number-pad"
            placeholder="0"
            error={itemErrors.minReorderLevel}
          />
          <Input
            label="Warehouse Location"
            value={itemForm.warehouseLocation}
            onChangeText={(value) => setItemForm((current) => ({ ...current, warehouseLocation: value }))}
            placeholder="Main Warehouse"
            error={itemErrors.warehouseLocation}
          />
          <Input
            label="Expiry Date"
            value={itemForm.expiryDate}
            onChangeText={(value) => setItemForm((current) => ({ ...current, expiryDate: value }))}
            placeholder="YYYY-MM-DD"
            error={itemErrors.expiryDate}
          />
          <Input
            label="Update Note"
            value={itemForm.note}
            onChangeText={(value) => setItemForm((current) => ({ ...current, note: value }))}
            placeholder="Optional note for stock history"
          />

          <Text style={styles.modalLabel}>Stock Status</Text>
          <View style={styles.statusRow}>
            {STATUS_OPTIONS.map((status) => (
              <StatusChip
                key={status}
                label={status}
                active={itemForm.stockStatus === status}
                onPress={() => setItemForm((current) => ({ ...current, stockStatus: status }))}
              />
            ))}
          </View>

          <View style={styles.modalActions}>
            <Button title="Cancel" variant="outline" onPress={closeItemModal} style={{ flex: 1 }} />
            <Button title={itemForm.id ? 'Update' : 'Save'} onPress={saveItem} loading={saving} style={{ flex: 1 }} />
          </View>
        </ScrollView>
      </Modal>

      <Modal visible={showRequestModal} animationType="slide" presentationStyle="formSheet" onRequestClose={closeRequestModal}>
        <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.modalTitle}>{requestForm.id ? 'Edit Stock Request' : 'Create Stock Request'}</Text>

          <Text style={styles.modalLabel}>Product</Text>
          <View style={styles.selectList}>
            {products.map((product) => {
              const productId = product._id || product.id;
              return (
                <SelectCard
                  key={productId}
                  title={product.name}
                  subtitle={`Current stock ${product.stockQuantity || 0}`}
                  active={String(requestForm.product) === String(productId)}
                  onPress={() => setRequestForm((current) => ({ ...current, product: productId }))}
                />
              );
            })}
          </View>
          {requestErrors.product ? <Text style={styles.errorText}>{requestErrors.product}</Text> : null}

          <Input
            label="Requested Quantity"
            value={requestForm.requestedQuantity}
            onChangeText={(value) => setRequestForm((current) => ({ ...current, requestedQuantity: value.replace(/[^0-9]/g, '') }))}
            keyboardType="number-pad"
            placeholder="0"
            error={requestErrors.requestedQuantity}
          />
          <Input
            label="Requested By"
            value={requestForm.requestedBy}
            onChangeText={(value) => setRequestForm((current) => ({ ...current, requestedBy: value }))}
            placeholder="Inventory manager name"
            error={requestErrors.requestedBy}
          />
          <Input
            label="Notes"
            value={requestForm.notes}
            onChangeText={(value) => setRequestForm((current) => ({ ...current, notes: value }))}
            placeholder="Why this request is needed"
          />

          <View style={styles.modalActions}>
            <Button title="Cancel" variant="outline" onPress={closeRequestModal} style={{ flex: 1 }} />
            <Button title={requestForm.id ? 'Update' : 'Create'} onPress={saveRequest} loading={saving} style={{ flex: 1 }} />
          </View>
        </ScrollView>
      </Modal>

      <Modal visible={showProductModal} animationType="slide" presentationStyle="formSheet" onRequestClose={closeProductModal}>
        <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.modalTitle}>{productForm.id ? 'Edit Product' : 'Add Product'}</Text>

          <Text style={styles.modalLabel}>Product Image</Text>
          <View style={styles.imageEditorRow}>
            <ProductThumb
              imageUrl={productForm.imageUrl}
              localUri={pendingProductImage?.uri}
              style={styles.modalProductImage}
            />
            <View style={styles.imageEditorActions}>
              <Button title="Choose Image" variant="outline" onPress={pickProductImage} />
              <Button
                title="Clear"
                variant="ghost"
                onPress={() => {
                  setPendingProductImage(null);
                  setProductForm((current) => ({ ...current, imageUrl: '' }));
                }}
              />
            </View>
          </View>
          {pendingProductImage ? (
            <Text style={styles.itemMeta}>Selected file: {pendingProductImage.name}</Text>
          ) : null}

          <Input
            label="Product Name"
            value={productForm.name}
            onChangeText={(value) => setProductForm((current) => ({ ...current, name: value }))}
            placeholder="Product name"
            error={productErrors.name}
          />
          <Input
            label="Description"
            value={productForm.description}
            onChangeText={(value) => setProductForm((current) => ({ ...current, description: value }))}
            placeholder="Product description"
          />
          <Input
            label="Price (Rs.)"
            value={productForm.price}
            onChangeText={(value) => setProductForm((current) => ({ ...current, price: value.replace(/[^0-9.]/g, '') }))}
            keyboardType="decimal-pad"
            placeholder="0.00"
            error={productErrors.price}
          />
          <Input
            label="Stock Quantity"
            value={productForm.stockQuantity}
            onChangeText={(value) => setProductForm((current) => ({ ...current, stockQuantity: value.replace(/[^0-9]/g, '') }))}
            keyboardType="number-pad"
            placeholder="0"
            error={productErrors.stockQuantity}
          />
          <Input
            label="Image URL"
            value={productForm.imageUrl}
            onChangeText={(value) => setProductForm((current) => ({ ...current, imageUrl: value }))}
            placeholder="/uploads/product-images/example.png"
            error={productErrors.imageUrl}
          />

          <Text style={styles.modalLabel}>Category</Text>
          <TouchableOpacity onPress={() => setProductForm((current) => ({ ...current, category: '' }))} style={styles.clearLink}>
            <Text style={styles.clearLinkText}>Clear category</Text>
          </TouchableOpacity>
          <View style={styles.selectList}>
            {categories.map((category) => {
              const id = category._id || category.id;
              return (
                <SelectCard
                  key={id}
                  title={category.name}
                  subtitle={`${categoryProductCounts.get(String(id)) || 0} linked products`}
                  active={String(productForm.category) === String(id)}
                  onPress={() => setProductForm((current) => ({ ...current, category: id }))}
                />
              );
            })}
          </View>

          <View style={styles.modalActions}>
            <Button title="Cancel" variant="outline" onPress={closeProductModal} style={{ flex: 1 }} />
            <Button title={productForm.id ? 'Update' : 'Create'} onPress={saveProduct} loading={saving} style={{ flex: 1 }} />
          </View>
        </ScrollView>
      </Modal>

      <Modal visible={showCategoryModal} animationType="slide" presentationStyle="formSheet" onRequestClose={closeCategoryModal}>
        <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.modalTitle}>{categoryForm.id ? 'Edit Category' : 'Create Category'}</Text>

          <Input
            label="Category Name"
            value={categoryForm.name}
            onChangeText={(value) => setCategoryForm((current) => ({ ...current, name: value }))}
            placeholder="Category name"
            error={categoryErrors.name}
          />

          <View style={styles.modalActions}>
            <Button title="Cancel" variant="outline" onPress={closeCategoryModal} style={{ flex: 1 }} />
            <Button title={categoryForm.id ? 'Update' : 'Create'} onPress={saveCategory} loading={saving} style={{ flex: 1 }} />
          </View>
        </ScrollView>
      </Modal>

      <Modal visible={showHistoryModal} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowHistoryModal(false)}>
        <View style={styles.historyWrap}>
          <Text style={styles.modalTitle}>{historyTitle}</Text>
          <Text style={styles.historySub}>Stock history and warehouse changes</Text>
          {historyLoading ? (
            <LoadingScreen message="Loading stock history..." />
          ) : (
            <FlatList
              data={historyLogs}
              keyExtractor={(item) => item._id || String(item.id)}
              contentContainerStyle={{ paddingTop: SPACING.md, gap: SPACING.sm, paddingBottom: SPACING.xl }}
              ListEmptyComponent={<EmptyState icon="📜" title="No stock history found" />}
              renderItem={({ item }) => (
                <Card>
                  <Text style={styles.historyType}>{item.changeType?.replace(/_/g, ' ')}</Text>
                  <Text style={styles.itemMeta}>Quantity change: {item.quantityChanged >= 0 ? '+' : ''}{item.quantityChanged}</Text>
                  <Text style={styles.itemMeta}>Warehouse: {item.warehouseLocation || 'N/A'}</Text>
                  <Text style={styles.itemMeta}>Status: {item.stockStatus?.replace(/_/g, ' ') || 'N/A'}</Text>
                  <Text style={styles.itemMeta}>Date: {item.changeDate ? new Date(item.changeDate).toLocaleString() : 'N/A'}</Text>
                  {item.note ? <Text style={styles.itemMeta}>Note: {item.note}</Text> : null}
                </Card>
              )}
            />
          )}
          <Button title="Close" variant="outline" onPress={() => setShowHistoryModal(false)} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.cream },
  header: {
    backgroundColor: COLORS.maroon,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: { fontSize: 24, ...FONTS.bold, color: COLORS.white },
  subtitle: { marginTop: 4, fontSize: 13, color: COLORS.lightGold, maxWidth: 240 },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: `${COLORS.gold}30`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, padding: SPACING.md },
  statCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    ...SHADOW.sm,
  },
  statValue: { fontSize: 20, ...FONTS.bold },
  statLabel: { marginTop: 4, fontSize: 12, color: COLORS.gray600 },
  tabRow: { flexDirection: 'row', backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.gray200 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.maroon },
  tabText: { fontSize: 14, ...FONTS.medium, color: COLORS.gray400 },
  tabTextActive: { color: COLORS.maroon, ...FONTS.semibold },
  listContent: { padding: SPACING.md, gap: SPACING.sm, paddingBottom: SPACING.xl },
  catalogContent: { padding: SPACING.md, gap: SPACING.sm, paddingBottom: SPACING.xl },
  sectionTitle: { fontSize: 20, ...FONTS.bold, color: COLORS.dark, marginTop: SPACING.sm, marginBottom: SPACING.xs },
  card: { marginBottom: SPACING.sm },
  catalogCard: { marginBottom: SPACING.sm },
  cardTop: { flexDirection: 'row', gap: SPACING.md, alignItems: 'center', marginBottom: SPACING.sm },
  catalogActions: { marginBottom: SPACING.sm },
  catalogTitle: { fontSize: 18, ...FONTS.bold, color: COLORS.dark },
  catalogSubtitle: { fontSize: 13, color: COLORS.gray600, marginTop: 4 },
  catalogRow: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.md, alignItems: 'flex-start' },
  catalogProductImage: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: COLORS.cream,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.greenLight,
  },
  itemName: { fontSize: 17, ...FONTS.bold, color: COLORS.dark },
  itemMeta: { fontSize: 13, color: COLORS.gray600, marginTop: 2 },
  qtyWrap: { alignItems: 'flex-end' },
  qtyValue: { fontSize: 24, ...FONTS.bold, color: COLORS.green },
  detailBlock: { marginBottom: SPACING.sm },
  actionRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  smallActionRow: { gap: SPACING.xs, minWidth: 88 },
  modalContent: { padding: SPACING.lg, paddingBottom: SPACING.xl },
  modalTitle: { fontSize: 24, ...FONTS.bold, color: COLORS.dark, marginBottom: SPACING.md },
  modalLabel: { fontSize: 14, ...FONTS.medium, color: COLORS.dark, marginBottom: 8 },
  selectList: { gap: SPACING.sm, marginBottom: SPACING.md },
  selectCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.gray200,
    padding: SPACING.md,
    ...SHADOW.sm,
  },
  selectCardActive: { backgroundColor: COLORS.maroon, borderColor: COLORS.maroon },
  selectTitle: { fontSize: 15, ...FONTS.semibold, color: COLORS.dark },
  selectTitleActive: { color: COLORS.white },
  selectSubtitle: { marginTop: 4, fontSize: 12, color: COLORS.gray600 },
  selectSubtitleActive: { color: `${COLORS.white}CC` },
  clearLink: { alignSelf: 'flex-start', marginBottom: 8 },
  clearLinkText: { fontSize: 13, color: COLORS.maroon, ...FONTS.medium },
  imageEditorRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  imageEditorActions: {
    flex: 1,
    gap: SPACING.sm,
  },
  modalProductImage: {
    width: 96,
    height: 96,
    borderRadius: 18,
    backgroundColor: COLORS.cream,
  },
  productThumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6E6BE',
  },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.gray200,
    backgroundColor: COLORS.white,
  },
  statusChipActive: { backgroundColor: COLORS.maroon, borderColor: COLORS.maroon },
  statusChipText: { fontSize: 13, color: COLORS.gray600, ...FONTS.medium },
  statusChipTextActive: { color: COLORS.white },
  errorText: { fontSize: 12, color: COLORS.red, marginTop: -6, marginBottom: SPACING.md },
  modalActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  historyWrap: { flex: 1, backgroundColor: COLORS.cream, padding: SPACING.lg, paddingTop: SPACING.xl },
  historySub: { fontSize: 13, color: COLORS.gray600, marginBottom: SPACING.sm },
  historyType: { fontSize: 15, ...FONTS.semibold, color: COLORS.dark },
});
