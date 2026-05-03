import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../../context/CartContext';
import { Button, EmptyState, Card } from '../../components/UI';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../../constants/theme';

function CartItem({ item, onInc, onDec, onRemove }) {
  return (
    <Card style={styles.item}>
      <View style={styles.itemImg}><Text style={{ fontSize: 32 }}>🧿</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemPrice}>Rs. {item.price} × {item.qty}</Text>
      </View>
      <View style={styles.qtyRow}>
        <TouchableOpacity onPress={onDec} style={styles.qtyBtn}>
          <Ionicons name="remove" size={16} color={COLORS.maroon} />
        </TouchableOpacity>
        <Text style={styles.qtyText}>{item.qty}</Text>
        <TouchableOpacity onPress={onInc} style={styles.qtyBtn}>
          <Ionicons name="add" size={16} color={COLORS.maroon} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={onRemove} style={{ marginLeft: 8 }}>
        <Ionicons name="trash-outline" size={18} color={COLORS.red} />
      </TouchableOpacity>
    </Card>
  );
}

export default function CartScreen() {
  const { cart, updateQty, removeItem, total } = useCart();
  const nav = useNavigation();

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>My Cart</Text>
        {cart.length > 0 && <Text style={styles.count}>{cart.reduce((s,i)=>s+i.qty,0)} items</Text>}
      </View>

      {cart.length === 0
        ? <EmptyState icon="🛒" title="Your cart is empty" subtitle="Browse the shop to add items" />
        : (
          <>
            <FlatList
              data={cart}
              keyExtractor={i => i._id || String(i.id)}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <CartItem
                  item={item}
                  onInc={() => updateQty(item._id || item.id, item.qty + 1)}
                  onDec={() => updateQty(item._id || item.id, item.qty - 1)}
                  onRemove={() => removeItem(item._id || item.id)}
                />
              )}
            />
            <View style={styles.footer}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalVal}>Rs. {total.toFixed(2)}</Text>
              </View>
              <Button title="Proceed to Checkout" onPress={() => nav.navigate('Checkout')} size="lg" />
            </View>
          </>
        )
      }
    </View>
  );
}

const styles = StyleSheet.create({
  screen:     { flex: 1, backgroundColor: COLORS.cream },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                paddingHorizontal: SPACING.md, paddingTop: SPACING.xl, paddingBottom: SPACING.md,
                backgroundColor: COLORS.maroon },
  title:      { fontSize: 22, ...FONTS.bold, color: COLORS.white },
  count:      { fontSize: 14, color: COLORS.lightGold },
  list:       { padding: SPACING.md, gap: SPACING.sm, paddingBottom: 160 },
  item:       { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  itemImg:    { width: 52, height: 52, backgroundColor: COLORS.cream, borderRadius: RADIUS.md,
                alignItems: 'center', justifyContent: 'center' },
  itemName:   { fontSize: 14, ...FONTS.semibold, color: COLORS.dark },
  itemPrice:  { fontSize: 13, color: COLORS.gray600, marginTop: 2 },
  qtyRow:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn:     { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5,
                borderColor: COLORS.maroon, alignItems: 'center', justifyContent: 'center' },
  qtyText:    { fontSize: 15, ...FONTS.bold, color: COLORS.dark, minWidth: 20, textAlign: 'center' },
  footer:     { position: 'absolute', bottom: 0, left: 0, right: 0,
                backgroundColor: COLORS.white, padding: SPACING.md,
                borderTopWidth: 1, borderTopColor: COLORS.gray200, ...SHADOW.md },
  totalRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.md },
  totalLabel: { fontSize: 18, ...FONTS.semibold, color: COLORS.dark },
  totalVal:   { fontSize: 20, ...FONTS.bold, color: COLORS.maroon },
});
