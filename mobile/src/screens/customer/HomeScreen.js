import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/UI';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../../constants/theme';

const HOME_MASK_IMAGE = require('../../../assets/home-ritual-mask.png');

const FLOATING_RITUALS = [
  { name: 'Rahu Sanniya', top: 18, left: 12, rotate: '-6deg' },
  { name: 'Kola Sanniya', top: 42, left: 124, rotate: '7deg' },
  { name: 'Gara Sanniya', top: 62, right: 132, rotate: '-4deg' },
  { name: 'Butha Sanniya', top: 16, right: 30, rotate: '8deg' },
  { name: 'Pissu Sanniya', bottom: 118, left: 22, rotate: '-7deg' },
  { name: 'Kalu Kumara', bottom: 108, right: 26, rotate: '6deg' },
];

const FEATURE_ITEMS = [
  {
    icon: 'sparkles-outline',
    title: 'Ancient Rituals',
    desc: 'Explore authentic Sri Lankan healing ceremonies for protection, balance, and blessings.',
  },
  {
    icon: 'storefront-outline',
    title: 'Ritual Plates',
    desc: 'Shop ceremony plates, oils, offerings, and ritual essentials prepared for every occasion.',
  },
  {
    icon: 'people-outline',
    title: 'Trusted Performers',
    desc: 'Book experienced performers and manage your ceremony plan from one place.',
  },
];

const QUICK_LINKS = [
  { label: 'Rituals', screen: 'ThowilTypes', icon: 'flower-outline' },
  { label: 'Shop Plates', screen: 'Shop', icon: 'basket-outline' },
  { label: 'Book Performer', screen: 'Booking', icon: 'calendar-outline' },
  { label: 'My Account', screen: 'Dashboard', icon: 'person-outline' },
];

const RitualCard = ({ item }) => (
  <View
    style={[
      styles.ritualCard,
      item.top != null ? { top: item.top } : { bottom: item.bottom },
      item.left != null ? { left: item.left } : { right: item.right },
      { transform: [{ rotate: item.rotate }] },
    ]}
  >
    <Image source={HOME_MASK_IMAGE} style={styles.ritualCardImage} resizeMode="cover" />
    <View style={styles.ritualCardOverlay} />
    <Text style={styles.ritualCardLabel}>{item.name}</Text>
  </View>
);

const HeroAction = ({ filled, title, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.85}
    style={[styles.heroAction, filled ? styles.heroActionFilled : styles.heroActionOutline]}
  >
    <Text style={[styles.heroActionText, filled ? styles.heroActionTextFilled : styles.heroActionTextOutline]}>
      {title}
    </Text>
  </TouchableOpacity>
);

export default function HomeScreen() {
  const nav = useNavigation();

  return (
    <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <View style={styles.brandBadge}>
              <Image source={HOME_MASK_IMAGE} style={styles.brandBadgeImage} resizeMode="cover" />
            </View>
            <Text style={styles.brandText}>Towile.lk</Text>
          </View>
          <TouchableOpacity style={styles.topIconButton} onPress={() => nav.navigate('Dashboard')}>
            <Ionicons name="person-circle-outline" size={26} color={COLORS.lightGold} />
          </TouchableOpacity>
        </View>

        <View style={styles.heroCanvas}>
          {FLOATING_RITUALS.map((item) => (
            <RitualCard key={item.name} item={item} />
          ))}

          <View style={styles.heroCenter}>
            <View style={styles.heroLogoShell}>
              <View style={styles.heroLogoGlow} />
              <View style={styles.heroLogoCircle}>
                <Image source={HOME_MASK_IMAGE} style={styles.heroLogoImage} resizeMode="contain" />
              </View>
            </View>
            <Text style={styles.heroTitle}>Towile.lk</Text>
            <Text style={styles.heroSubtitle}>
              Connect with certified performers for ancient Sri Lankan Thowil rituals, and shop authentic ritual
              plates and ceremony items.
            </Text>
            <View style={styles.heroActionsRow}>
              <HeroAction filled title="Book a Performer" onPress={() => nav.navigate('Booking')} />
              <HeroAction title="Shop Ritual Plates" onPress={() => nav.navigate('Shop')} />
            </View>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.quickNavRow}>
          {QUICK_LINKS.map((item) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => nav.navigate(item.screen)}
              activeOpacity={0.85}
              style={styles.quickNavCard}
            >
              <Ionicons name={item.icon} size={22} color={COLORS.gold} />
              <Text style={styles.quickNavText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Ritual Experience</Text>
          <TouchableOpacity onPress={() => nav.navigate('ThowilTypes')}>
            <Text style={styles.sectionLink}>View all</Text>
          </TouchableOpacity>
        </View>

        {FEATURE_ITEMS.map((item) => (
          <Card key={item.title} onPress={() => nav.navigate(item.title === 'Ritual Plates' ? 'Shop' : item.title === 'Ancient Rituals' ? 'ThowilTypes' : 'Booking')} style={styles.featureCard}>
            <View style={styles.featureIconWrap}>
              <Ionicons name={item.icon} size={26} color={COLORS.gold} />
            </View>
            <View style={styles.featureBody}>
              <Text style={styles.featureTitle}>{item.title}</Text>
              <Text style={styles.featureDesc}>{item.desc}</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={COLORS.gold} />
          </Card>
        ))}

        <View style={styles.storyPanel}>
          <Text style={styles.storyEyebrow}>Traditional Heritage</Text>
          <Text style={styles.storyTitle}>Designed for ritual planning, booking, and authentic ceremony supplies.</Text>
          <Text style={styles.storyText}>
            Keep your performer bookings, sacred ceremony types, and trusted ritual essentials together in one place.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F6EBD3',
  },
  hero: {
    backgroundColor: '#5D0505',
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xl,
    overflow: 'hidden',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.gold,
  },
  brandBadgeImage: {
    width: 28,
    height: 28,
  },
  brandText: {
    marginLeft: 10,
    fontSize: 24,
    ...FONTS.bold,
    color: COLORS.lightGold,
  },
  topIconButton: {
    padding: 6,
  },
  heroCanvas: {
    height: 560,
    marginTop: SPACING.md,
    position: 'relative',
  },
  ritualCard: {
    position: 'absolute',
    width: 86,
    height: 118,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#220202',
    borderWidth: 1,
    borderColor: '#9C5A32',
  },
  ritualCardImage: {
    width: '100%',
    height: '100%',
  },
  ritualCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(40,0,0,0.42)',
  },
  ritualCardLabel: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    right: 6,
    fontSize: 10,
    ...FONTS.semibold,
    color: COLORS.white,
    textAlign: 'center',
  },
  heroCenter: {
    marginTop: 120,
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  heroLogoShell: {
    width: 214,
    height: 214,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLogoGlow: {
    position: 'absolute',
    width: 214,
    height: 214,
    borderRadius: 107,
    backgroundColor: 'rgba(255, 213, 42, 0.18)',
    shadowColor: '#FFD62A',
    shadowOpacity: 0.45,
    shadowRadius: 22,
    elevation: 8,
  },
  heroLogoCircle: {
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: '#FCF6EA',
    borderWidth: 3,
    borderColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLogoImage: {
    width: 138,
    height: 138,
  },
  heroTitle: {
    marginTop: SPACING.lg,
    fontSize: 46,
    ...FONTS.bold,
    color: '#F6E5B3',
    textAlign: 'center',
  },
  heroSubtitle: {
    marginTop: 12,
    fontSize: 17,
    lineHeight: 26,
    color: '#F6E5B3',
    textAlign: 'center',
    maxWidth: 340,
  },
  heroActionsRow: {
    flexDirection: 'row',
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  heroAction: {
    minWidth: 150,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  heroActionFilled: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.gold,
  },
  heroActionOutline: {
    borderColor: COLORS.gold,
    backgroundColor: 'transparent',
  },
  heroActionText: {
    fontSize: 15,
    ...FONTS.semibold,
  },
  heroActionTextFilled: {
    color: '#4A1521',
  },
  heroActionTextOutline: {
    color: COLORS.lightGold,
  },
  content: {
    marginTop: -12,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  quickNavRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  quickNavCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: 18,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: '#E9D8B4',
    ...SHADOW.sm,
  },
  quickNavText: {
    marginTop: 10,
    fontSize: 14,
    ...FONTS.semibold,
    color: COLORS.dark,
  },
  sectionHeaderRow: {
    marginTop: SPACING.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 24,
    ...FONTS.bold,
    color: '#4A1521',
  },
  sectionLink: {
    fontSize: 14,
    ...FONTS.semibold,
    color: COLORS.maroon,
  },
  featureCard: {
    marginTop: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: '#FFF8EA',
    borderWidth: 1,
    borderColor: '#ECD9B4',
  },
  featureIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#6B0D0D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureBody: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    ...FONTS.bold,
    color: '#4A1521',
  },
  featureDesc: {
    marginTop: 4,
    fontSize: 13,
    color: COLORS.gray600,
    lineHeight: 19,
  },
  storyPanel: {
    marginTop: SPACING.xl,
    borderRadius: 24,
    backgroundColor: '#6B0D0D',
    padding: SPACING.lg,
  },
  storyEyebrow: {
    fontSize: 13,
    ...FONTS.semibold,
    color: COLORS.gold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  storyTitle: {
    marginTop: 8,
    fontSize: 26,
    lineHeight: 34,
    ...FONTS.bold,
    color: COLORS.white,
  },
  storyText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    color: '#F5DEC0',
  },
});
