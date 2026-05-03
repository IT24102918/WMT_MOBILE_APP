import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../../context/CartContext';
import { Button, Card, Badge } from '../../components/UI';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { resolveApiMediaUrl } from '../../config/api';

function ProductImage({ imageUrl }) {
  const sourceUri = resolveApiMediaUrl(imageUrl);

  if (sourceUri) {
    return <Image source={{ uri: sourceUri }} style={styles.heroImage} resizeMode="cover" />;
  }

  return (
    <View style={styles.heroFallback}>
      <Ionicons name="image-outline" size={72} color={COLORS.gold} />
    </View>
  );
}

export default function ProductDetailScreen() {
  const { params } = useRoute();
  const product = params?.product;
  const { addItem, cart } = useCart();

  if (!product) return null;

  const inCart = cart.find((item) => item._id === product._id || item.id === product.id);
  const inStock = (product.stockQuantity || 0) > 0;

  const handleAdd = () => {
    if (!inStock) {
      Alert.alert('Out of Stock');
      return;
    }
    addItem(product);
    Alert.alert('Added to Cart', `${product.name} added successfully`);
  };

  return (
    <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
      <View style={styles.imgBox}>
        <ProductImage imageUrl={product.imageUrl} />
        {!inStock && (
          <View style={styles.outBadge}>
            <Text style={styles.outText}>Out of Stock</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.price}>Rs. {product.price}</Text>
        </View>

        {product.category?.name && (
          <Badge label={product.category.name} status="AVAILABLE" style={{ marginBottom: SPACING.md }} />
        )}

        <Card style={{ marginBottom: SPACING.md }}>
          <View style={styles.stockRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="cube-outline" size={18} color={inStock ? COLORS.green : COLORS.red} />
              <Text style={styles.stockLabel}>Stock</Text>
            </View>
            <Text style={[styles.stockVal, { color: inStock ? COLORS.green : COLORS.red }]}>
              {product.stockQuantity > 0 ? `${product.stockQuantity} units` : 'Out of Stock'}
            </Text>
          </View>
          {inCart && (
            <View style={[styles.stockRow, { marginTop: 8 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="cart-outline" size={18} color={COLORS.maroon} />
                <Text style={styles.stockLabel}>In your cart</Text>
              </View>
              <Text style={{ fontSize: 14, ...FONTS.semibold, color: COLORS.maroon }}>{inCart.qty} pcs</Text>
            </View>
          )}
        </Card>

        {product.description && (
          <Card style={{ marginBottom: SPACING.md }}>
            <Text style={styles.descTitle}>Description</Text>
            <Text style={styles.desc}>{product.description}</Text>
          </Card>
        )}

        <Button
          title={inStock ? (inCart ? 'Add More to Cart' : 'Add to Cart') : 'Out of Stock'}
          onPress={handleAdd}
          disabled={!inStock}
          size="lg"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.cream },
  imgBox: {
    height: 260,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  heroImage: { width: '100%', height: '100%' },
  heroFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6E6BE',
  },
  outBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: COLORS.red,
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  outText: { color: COLORS.white, ...FONTS.semibold, fontSize: 12 },
  body: { padding: SPACING.md },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.sm },
  name: { fontSize: 22, ...FONTS.bold, color: COLORS.dark, flex: 1, marginRight: SPACING.sm },
  price: { fontSize: 22, ...FONTS.bold, color: COLORS.maroon },
  stockRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stockLabel: { fontSize: 14, color: COLORS.gray600 },
  stockVal: { fontSize: 15, ...FONTS.semibold },
  descTitle: { fontSize: 15, ...FONTS.semibold, color: COLORS.dark, marginBottom: 8 },
  desc: { fontSize: 14, color: COLORS.gray600, lineHeight: 22 },
});
