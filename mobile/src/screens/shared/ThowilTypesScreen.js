import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, EmptyState, LoadingScreen } from '../../components/UI';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { API_BASE } from '../../constants/theme';

const RITUAL_ICONS = ['🪘', '🌺', '🕯️', '🌿', '🔥', '✨', '🎭', '💧'];

export default function ThowilTypesScreen() {
  const [types, setTypes]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/thowil-types`)
      .then(r => r.json()).then(setTypes).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.cream }}>
      <View style={styles.header}>
        <Text style={styles.title}>Thowil Rituals</Text>
        <Text style={styles.sub}>Traditional Sri Lankan healing ceremonies</Text>
      </View>
      <FlatList
        data={types}
        keyExtractor={i => i._id || String(i.id)}
        contentContainerStyle={{ padding: SPACING.md, gap: SPACING.sm, paddingBottom: 32 }}
        ListEmptyComponent={<EmptyState icon="🪘" title="No ritual types found" subtitle="Check back soon" />}
        renderItem={({ item, index }) => (
          <Card style={styles.card}>
            <View style={styles.iconBox}>
              <Text style={styles.icon}>{RITUAL_ICONS[index % RITUAL_ICONS.length]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.ritualName}>{item.name}</Text>
              {item.description ? <Text style={styles.ritualDesc}>{item.description}</Text> : null}
              {item.basePrice ? (
                <View style={styles.priceRow}>
                  <Ionicons name="pricetag-outline" size={13} color={COLORS.gold} />
                  <Text style={styles.price}>Starting from Rs. {item.basePrice}</Text>
                </View>
              ) : null}
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header:      { backgroundColor: COLORS.maroon, padding: SPACING.md, paddingTop: SPACING.xl, paddingBottom: SPACING.lg },
  title:       { fontSize: 24, ...FONTS.bold, color: COLORS.white },
  sub:         { fontSize: 13, color: COLORS.lightGold, marginTop: 4 },
  card:        { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md },
  iconBox:     { width: 56, height: 56, backgroundColor: COLORS.cream, borderRadius: RADIUS.md,
                 alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.gold + '40' },
  icon:        { fontSize: 28 },
  ritualName:  { fontSize: 16, ...FONTS.semibold, color: COLORS.dark, marginBottom: 4 },
  ritualDesc:  { fontSize: 13, color: COLORS.gray600, lineHeight: 18, marginBottom: 6 },
  priceRow:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  price:       { fontSize: 13, ...FONTS.medium, color: COLORS.gold },
});
