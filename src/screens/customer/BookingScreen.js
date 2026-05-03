import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Card, EmptyState, SectionHeader } from '../../components/UI';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../../constants/theme';
import { API_BASE } from '../../constants/theme';

function Stars({ rating = 0 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <Ionicons key={i} name={i <= Math.round(rating) ? 'star' : 'star-outline'} size={13} color={COLORS.gold} />
      ))}
      <Text style={{ fontSize: 12, color: COLORS.gray600, marginLeft: 4 }}>{rating.toFixed(1)}</Text>
    </View>
  );
}

function PerformerCard({ item, onPress }) {
  return (
    <Card onPress={() => onPress(item)} style={styles.card}>
      <View style={styles.cardAvatar}>
        <Text style={styles.avatarText}>{item.name?.[0] || 'P'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardName}>{item.name}</Text>
        <Stars rating={item.rating} />
        <View style={styles.cardMeta}>
          <Ionicons name="time-outline" size={13} color={COLORS.gray400} />
          <Text style={styles.cardMetaText}>{item.experienceYears || 0} yrs exp</Text>
          {item.location ? (
            <>
              <Ionicons name="location-outline" size={13} color={COLORS.gray400} style={{ marginLeft: 8 }} />
              <Text style={styles.cardMetaText}>{item.location}</Text>
            </>
          ) : null}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.maroon} />
    </Card>
  );
}

export default function BookingScreen() {
  const nav = useNavigation();
  const [performers, setPerformers] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/api/performers`)
      .then(r => r.json())
      .then(d => setPerformers(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = performers.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.location?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Book a Performer</Text>
        <Text style={styles.headerSub}>Choose a certified Kattadiya</Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={COLORS.gray400} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.search}
          placeholder="Search by name or location…"
          placeholderTextColor={COLORS.gray400}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.maroon} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i._id || String(i.id)}
          contentContainerStyle={{ padding: SPACING.md, gap: SPACING.sm, paddingBottom: 32 }}
          ListEmptyComponent={<EmptyState icon="🎭" title="No performers found" subtitle="Try a different search" />}
          renderItem={({ item }) => (
            <PerformerCard item={item} onPress={p => nav.navigate('PerformerDetail', { performer: p })} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: COLORS.cream },
  header:       { backgroundColor: COLORS.maroon, paddingHorizontal: SPACING.md, paddingTop: SPACING.xl, paddingBottom: SPACING.lg },
  headerTitle:  { fontSize: 24, ...FONTS.bold, color: COLORS.white },
  headerSub:    { fontSize: 14, color: COLORS.lightGold, marginTop: 4 },
  searchWrap:   { flexDirection: 'row', alignItems: 'center', margin: SPACING.md,
                  backgroundColor: COLORS.white, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md,
                  paddingVertical: 10, ...SHADOW.sm },
  search:       { flex: 1, fontSize: 15, color: COLORS.dark },
  card:         { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  cardAvatar:   { width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.maroon + '20',
                  alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.maroon + '30' },
  avatarText:   { fontSize: 22, ...FONTS.bold, color: COLORS.maroon },
  cardName:     { fontSize: 16, ...FONTS.semibold, color: COLORS.dark, marginBottom: 4 },
  cardMeta:     { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 3 },
  cardMetaText: { fontSize: 12, color: COLORS.gray400 },
});
