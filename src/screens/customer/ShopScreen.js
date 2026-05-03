import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useCart } from '../../context/CartContext';
import { Card, EmptyState } from '../../components/UI';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../../constants/theme';
import { requestJson, resolveApiMediaUrl } from '../../config/api';

function ProductImage({ imageUrl, style, resizeMode = 'cover' }) {
  const sourceUri = resolveApiMediaUrl(imageUrl);

  if (sourceUri) {
    return <Image source={{ uri: sourceUri }} style={style} resizeMode={resizeMode} />;
  }

  return (
    <View style={[style, styles.productFallback]}>
      <Ionicons name="image-outline" size={32} color={COLORS.gold} />
    </View>
  );
}

function ProductCard({ item, onAdd, onPress }) {
  return (
    <Card onPress={() => onPress(item)} style={styles.prodCard}>
      <View style={styles.prodImg}>
        <ProductImage imageUrl={item.imageUrl} style={styles.prodImageAsset} />
      </View>
      <Text style={styles.prodName} numberOfLines={2}>{item.name}</Text>
      <Text style={styles.prodDesc} numberOfLines={2}>{item.description}</Text>
      <View style={styles.prodFooter}>
        <Text style={styles.prodPrice}>Rs. {item.price}</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => onAdd(item)} activeOpacity={0.8}>
          <Ionicons name="add" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>
      {item.stockQuantity <= 5 && item.stockQuantity > 0
        ? <View style={styles.lowStock}><Text style={styles.lowStockText}>Only {item.stockQuantity} left</Text></View>
        : null}
      {item.stockQuantity <= 0
        ? <View style={styles.outOfStock}><Text style={styles.outOfStockText}>Out of Stock</Text></View>
        : null}
    </Card>
  );
}

export default function ShopScreen() {
  const nav = useNavigation();
  const { addItem, cart } = useCart();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState(null);

  useEffect(() => {
    Promise.all([
      requestJson('/api/products'),
      requestJson('/api/categories'),
    ])
      .then(([productData, categoryData]) => {
        setProducts(productData);
        setCategories(categoryData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = products.filter((product) => {
    const matchSearch = product.name?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !catFilter || (product.category?._id === catFilter || product.category?.id === catFilter);
    return matchSearch && matchCategory;
  });

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  const handleAdd = (item) => {
    if (item.stockQuantity <= 0) {
      Alert.alert('Out of Stock');
      return;
    }
    addItem(item);
    Alert.alert('Added!', `${item.name} added to cart`, [{ text: 'OK' }]);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Ritual Supplies</Text>
          <Text style={styles.headerSub}>Authentic Saff & ceremony items</Text>
        </View>
        <TouchableOpacity style={styles.cartBtn} onPress={() => nav.navigate('Cart')}>
          <Ionicons name="cart-outline" size={24} color={COLORS.white} />
          {cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={COLORS.gray400} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.search}
          placeholder="Search products..."
          placeholderTextColor={COLORS.gray400}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {categories.length > 0 && (
        <View>
          <FlatList
            horizontal
            data={[{ _id: null, name: 'All' }, ...categories]}
            keyExtractor={(item) => String(item._id || 'all')}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catRow}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => setCatFilter(item._id)}
                style={[styles.catChip, catFilter === item._id && styles.catChipActive]}
              >
                <Text style={[styles.catText, catFilter === item._id && styles.catTextActive]}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      <FlatList
        data={filtered}
        numColumns={2}
        keyExtractor={(item) => item._id || String(item.id)}
        columnWrapperStyle={{ gap: SPACING.sm, paddingHorizontal: SPACING.md }}
        contentContainerStyle={{ gap: SPACING.sm, paddingVertical: SPACING.md, paddingBottom: 32 }}
        ListEmptyComponent={
          <EmptyState
            icon={loading ? '...' : '📦'}
            title={loading ? 'Loading products...' : 'No products found'}
            subtitle={loading ? 'Please wait a moment' : 'Try a different filter'}
          />
        }
        renderItem={({ item }) => (
          <View style={{ flex: 1 }}>
            <ProductCard item={item} onAdd={handleAdd} onPress={(product) => nav.navigate('ProductDetail', { product })} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.cream },
  header: {
    backgroundColor: COLORS.maroon,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  headerTitle: { fontSize: 22, ...FONTS.bold, color: COLORS.white },
  headerSub: { fontSize: 13, color: COLORS.lightGold },
  cartBtn: { marginLeft: 'auto', position: 'relative' },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: COLORS.gold,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: { fontSize: 11, ...FONTS.bold, color: COLORS.dark },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    ...SHADOW.sm,
  },
  search: { flex: 1, fontSize: 15, color: COLORS.dark },
  catRow: { paddingHorizontal: SPACING.md, gap: 8, paddingBottom: SPACING.sm },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.gray200,
  },
  catChipActive: { backgroundColor: COLORS.maroon, borderColor: COLORS.maroon },
  catText: { fontSize: 13, ...FONTS.medium, color: COLORS.gray600 },
  catTextActive: { color: COLORS.white },
  prodCard: { flex: 1, gap: 6 },
  prodImg: {
    height: 120,
    backgroundColor: COLORS.cream,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    overflow: 'hidden',
  },
  prodImageAsset: { width: '100%', height: '100%', borderRadius: RADIUS.md },
  productFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6E6BE' },
  prodName: { fontSize: 14, ...FONTS.semibold, color: COLORS.dark },
  prodDesc: { fontSize: 12, color: COLORS.gray400, lineHeight: 16 },
  prodFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  prodPrice: { fontSize: 15, ...FONTS.bold, color: COLORS.maroon },
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.maroon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lowStock: { backgroundColor: COLORS.amberLight, borderRadius: 4, padding: 4, marginTop: 4 },
  lowStockText: { fontSize: 11, color: COLORS.amber },
  outOfStock: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#00000030',
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outOfStockText: { ...FONTS.bold, color: COLORS.white, fontSize: 14 },
});
