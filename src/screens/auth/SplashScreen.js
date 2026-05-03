import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONTS, SPACING } from '../../constants/theme';

const MASK_IMAGE = require('../../../assets/icon.png');

export default function SplashScreen() {
  const nav = useNavigation();

  useEffect(() => {
    const timer = setTimeout(() => nav.replace('Login'), 1800);
    return () => clearTimeout(timer);
  }, [nav]);

  return (
    <View style={styles.container}>
      <View style={styles.glow} />
      <View style={styles.logoShell}>
        <Image source={MASK_IMAGE} style={styles.logo} resizeMode="contain" />
      </View>
      <Text style={styles.brand}>Towile.lk</Text>
      <Text style={styles.tagline}>Ancient rituals, trusted performers, authentic ceremony plates.</Text>
      <Text style={styles.foot}>Sri Lankan ritual platform</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#5D0505',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  glow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255, 214, 42, 0.16)',
    shadowColor: '#FFD62A',
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 10,
  },
  logoShell: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#FCF6EA',
    borderWidth: 3,
    borderColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 160,
    height: 160,
  },
  brand: {
    marginTop: SPACING.lg,
    fontSize: 44,
    ...FONTS.bold,
    color: '#F6E5B3',
  },
  tagline: {
    marginTop: 10,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    color: '#F6E5B3',
  },
  foot: {
    position: 'absolute',
    bottom: 42,
    fontSize: 13,
    color: '#F6E5B388',
  },
});
