import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { Button, Card, Badge } from '../../components/UI';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../../constants/theme';
import { API_BASE } from '../../constants/theme';

function Stars({ rating = 0 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= Math.round(rating) ? 'star' : 'star-outline'}
          size={16}
          color={COLORS.gold}
        />
      ))}
      <Text style={{ fontSize: 13, color: COLORS.gray600, marginLeft: 6 }}>
        {rating.toFixed(1)} / 5
      </Text>
    </View>
  );
}

export default function PerformerDetailScreen() {
  const { params } = useRoute();
  const nav = useNavigation();
  const { user } = useAuth();
  const performer = params?.performer;
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!performer) return;

    const id = performer.user?._id || performer.user || performer._id || performer.id;
    fetch(`${API_BASE}/api/availability/performer/${id}`)
      .then((r) => r.json())
      .then((d) => setAvailability(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [performer]);

  if (!performer) return null;

  const available = availability.filter((a) => a.status === 'AVAILABLE');

  const handleBook = () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to book a performer.');
      return;
    }
    nav.navigate('BookingWizard', { performer, availability });
  };

  return (
    <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{performer.name?.[0] || 'P'}</Text>
        </View>
        <Text style={styles.name}>{performer.name}</Text>
        <Stars rating={performer.rating} />
        {performer.location ? (
          <View style={styles.location}>
            <Ionicons name="location-outline" size={14} color={COLORS.lightGold} />
            <Text style={styles.locationText}>{performer.location}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statVal}>{performer.experienceYears || 0}</Text>
            <Text style={styles.statLabel}>Years Exp.</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statVal}>{available.length}</Text>
            <Text style={styles.statLabel}>Available Days</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statVal}>{(performer.rating || 0).toFixed(1)}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        <Card style={{ marginTop: SPACING.md }}>
          <Text style={styles.cardTitle}>Availability</Text>
          {loading ? (
            <ActivityIndicator color={COLORS.maroon} style={{ marginTop: 12 }} />
          ) : available.length === 0 ? (
            <Text style={styles.noAvail}>
              No dates listed yet. You can still send a preferred date in the booking step.
            </Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: SPACING.sm }}>
              <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                {available.slice(0, 10).map((a, i) => {
                  const d = new Date(a.availableDate);
                  return (
                    <View key={i} style={styles.dateChip}>
                      <Text style={styles.dateDay}>{d.toLocaleDateString('en', { weekday: 'short' })}</Text>
                      <Text style={styles.dateNum}>{d.getDate()}</Text>
                      <Text style={styles.dateMon}>{d.toLocaleDateString('en', { month: 'short' })}</Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </Card>

        <Button title="Book This Performer" onPress={handleBook} size="lg" style={{ marginTop: SPACING.md }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.cream },
  hero: {
    backgroundColor: COLORS.maroon,
    alignItems: 'center',
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xl,
    gap: 8,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: COLORS.gold + '30',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.gold,
  },
  avatarText: { fontSize: 36, ...FONTS.bold, color: COLORS.gold },
  name: { fontSize: 24, ...FONTS.bold, color: COLORS.white },
  location: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 13, color: COLORS.lightGold },
  body: { padding: SPACING.md },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    ...SHADOW.sm,
  },
  stat: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 22, ...FONTS.bold, color: COLORS.maroon },
  statLabel: { fontSize: 12, color: COLORS.gray400, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: COLORS.gray200 },
  cardTitle: { fontSize: 16, ...FONTS.semibold, color: COLORS.dark, marginBottom: 4 },
  noAvail: { fontSize: 14, color: COLORS.gray400, marginTop: 8, lineHeight: 20 },
  dateChip: {
    backgroundColor: COLORS.cream,
    borderRadius: RADIUS.md,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.gold + '60',
    minWidth: 56,
  },
  dateDay: { fontSize: 11, color: COLORS.gray400 },
  dateNum: { fontSize: 20, ...FONTS.bold, color: COLORS.maroon },
  dateMon: { fontSize: 11, color: COLORS.gray600 },
});
