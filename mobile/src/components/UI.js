import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, TextInput, Platform,
} from 'react-native';
import { COLORS, RADIUS, SPACING, SHADOW, FONTS } from '../constants/theme';

// ─── Button ───────────────────────────────────────────────────────────────────
export const Button = ({ title, onPress, variant = 'primary', size = 'md', disabled, loading, style }) => {
  const isOutline = variant === 'outline';
  const isGhost   = variant === 'ghost';
  const isDanger  = variant === 'danger';

  const bg = isOutline || isGhost ? 'transparent'
    : isDanger ? COLORS.red
    : variant === 'secondary' ? COLORS.gold
    : COLORS.maroon;

  const color = isOutline ? COLORS.maroon
    : isGhost   ? COLORS.gray600
    : variant === 'secondary' ? COLORS.dark
    : COLORS.white;

  const border = isOutline ? { borderWidth: 1.5, borderColor: COLORS.maroon } : {};
  const pad    = size === 'sm' ? { paddingVertical: 8, paddingHorizontal: 14 }
               : size === 'lg' ? { paddingVertical: 16, paddingHorizontal: 32 }
               : { paddingVertical: 13, paddingHorizontal: 24 };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.78}
      style={[styles.btn, { backgroundColor: bg, opacity: disabled ? 0.55 : 1 }, border, pad, style]}
    >
      {loading
        ? <ActivityIndicator color={color} size="small" />
        : <Text style={[styles.btnText, { color, fontSize: size === 'sm' ? 13 : 15 }]}>{title}</Text>
      }
    </TouchableOpacity>
  );
};

// ─── Card ─────────────────────────────────────────────────────────────────────
export const Card = ({ children, style, onPress }) => {
  const Wrap = onPress ? TouchableOpacity : View;
  return (
    <Wrap onPress={onPress} activeOpacity={0.88} style={[styles.card, style]}>
      {children}
    </Wrap>
  );
};

// ─── Input ────────────────────────────────────────────────────────────────────
export const Input = ({ label, error, style, ...props }) => (
  <View style={[styles.inputWrap, style]}>
    {label ? <Text style={styles.label}>{label}</Text> : null}
    <TextInput
      style={[styles.input, error && styles.inputError]}
      placeholderTextColor={COLORS.gray400}
      {...props}
    />
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </View>
);

// ─── Badge / Status pill ──────────────────────────────────────────────────────
const STATUS_COLORS = {
  PENDING:   { bg: COLORS.amberLight, text: COLORS.amber },
  CONFIRMED: { bg: COLORS.greenLight, text: COLORS.green },
  COMPLETED: { bg: COLORS.blueLight,  text: COLORS.blue  },
  CANCELLED: { bg: COLORS.redLight,   text: COLORS.red   },
  CANCELLED_BY_CUSTOMER: { bg: COLORS.redLight, text: COLORS.red },
  AVAILABLE: { bg: COLORS.greenLight, text: COLORS.green },
  BOOKED:    { bg: COLORS.blueLight,  text: COLORS.blue  },
  FULFILLED: { bg: COLORS.greenLight, text: COLORS.green },
  APPROVED:  { bg: COLORS.blueLight,  text: COLORS.blue  },
  PO_CREATED:{ bg: COLORS.amberLight, text: COLORS.amber },
  DELIVERED: { bg: COLORS.greenLight, text: COLORS.green },
  IN_TRANSIT:{ bg: COLORS.amberLight, text: COLORS.amber },
};

export const Badge = ({ label, status, style }) => {
  const c = STATUS_COLORS[status?.toUpperCase()] || { bg: COLORS.gray200, text: COLORS.gray600 };
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }, style]}>
      <Text style={[styles.badgeText, { color: c.text }]}>{label || status}</Text>
    </View>
  );
};

// ─── Section Header ───────────────────────────────────────────────────────────
export const SectionHeader = ({ title, action, onAction }) => (
  <View style={styles.sectionHead}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {action ? <TouchableOpacity onPress={onAction}><Text style={styles.sectionAction}>{action}</Text></TouchableOpacity> : null}
  </View>
);

// ─── Empty State ──────────────────────────────────────────────────────────────
export const EmptyState = ({ icon = '📭', title, subtitle }) => (
  <View style={styles.empty}>
    <Text style={styles.emptyIcon}>{icon}</Text>
    <Text style={styles.emptyTitle}>{title}</Text>
    {subtitle ? <Text style={styles.emptySub}>{subtitle}</Text> : null}
  </View>
);

// ─── Loading overlay ──────────────────────────────────────────────────────────
export const LoadingScreen = ({ message = 'Loading…' }) => (
  <View style={styles.loading}>
    <ActivityIndicator size="large" color={COLORS.maroon} />
    <Text style={styles.loadingText}>{message}</Text>
  </View>
);

// ─── Screen Header ────────────────────────────────────────────────────────────
export const ScreenHeader = ({ title, subtitle, right }) => (
  <View style={styles.screenHeader}>
    <View style={{ flex: 1 }}>
      <Text style={styles.screenTitle}>{title}</Text>
      {subtitle ? <Text style={styles.screenSub}>{subtitle}</Text> : null}
    </View>
    {right}
  </View>
);

// ─── Divider ──────────────────────────────────────────────────────────────────
export const Divider = ({ style }) => <View style={[styles.divider, style]} />;

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  btn: { borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  btnText: { ...FONTS.semibold, letterSpacing: 0.2 },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    ...SHADOW.sm,
  },

  inputWrap: { marginBottom: SPACING.md },
  label: { fontSize: 14, ...FONTS.medium, color: COLORS.dark, marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.gray200,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? 13 : 10,
    fontSize: 15,
    color: COLORS.dark,
    backgroundColor: COLORS.white,
  },
  inputError: { borderColor: COLORS.red },
  errorText: { fontSize: 12, color: COLORS.red, marginTop: 4 },

  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, ...FONTS.semibold },

  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  sectionTitle: { fontSize: 18, ...FONTS.bold, color: COLORS.dark },
  sectionAction: { fontSize: 14, color: COLORS.maroon, ...FONTS.medium },

  empty: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyIcon: { fontSize: 48, marginBottom: SPACING.md },
  emptyTitle: { fontSize: 17, ...FONTS.semibold, color: COLORS.gray600, textAlign: 'center' },
  emptySub: { fontSize: 14, color: COLORS.gray400, marginTop: 6, textAlign: 'center' },

  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.cream, gap: 12 },
  loadingText: { fontSize: 15, color: COLORS.gray600 },

  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
    backgroundColor: COLORS.white,
  },
  screenTitle: { fontSize: 22, ...FONTS.bold, color: COLORS.dark },
  screenSub: { fontSize: 13, color: COLORS.gray400, marginTop: 2 },

  divider: { height: 1, backgroundColor: COLORS.gray200, marginVertical: SPACING.md },
});
