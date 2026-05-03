import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { Button, Input } from '../../components/UI';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { requestJson } from '../../config/api';

const MASK_IMAGE = require('../../../assets/icon.png');

export default function LoginScreen() {
  const nav = useNavigation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const nextErrors = {};
    if (!email) nextErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = 'Invalid email format';
    if (!password) nextErrors.password = 'Password is required';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const data = await requestJson('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      await login(data);
    } catch (error) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.logoCircle}>
            <Image source={MASK_IMAGE} style={styles.logoImage} resizeMode="contain" />
          </View>
          <Text style={styles.brand}>Towile.lk</Text>
          <Text style={styles.sub}>Sign in to book rituals, connect with performers, and shop authentic plates.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome Back</Text>
          <Text style={styles.cardSub}>Continue your ritual planning journey.</Text>

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="you@example.com"
            error={errors.email}
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Enter your password"
            error={errors.password}
          />

          <Button title="Login / Register" onPress={handleLogin} loading={loading} style={styles.primaryButton} />

          <TouchableOpacity onPress={() => nav.navigate('Register')} style={styles.link}>
            <Text style={styles.linkText}>
              Don&apos;t have an account? <Text style={styles.linkBold}>Create one</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6EBD3',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  hero: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logoCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#FCF6EA',
    borderWidth: 3,
    borderColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5D0505',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  logoImage: {
    width: 112,
    height: 112,
  },
  brand: {
    marginTop: SPACING.md,
    fontSize: 40,
    ...FONTS.bold,
    color: '#5D0505',
  },
  sub: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 23,
    color: COLORS.gray600,
    textAlign: 'center',
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 28,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: '#E9D8B4',
    shadowColor: '#5D0505',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 28,
    ...FONTS.bold,
    color: '#5D0505',
  },
  cardSub: {
    marginTop: 4,
    marginBottom: SPACING.md,
    fontSize: 14,
    color: COLORS.gray600,
  },
  primaryButton: {
    marginTop: 8,
  },
  link: {
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  linkText: {
    fontSize: 14,
    color: COLORS.gray600,
  },
  linkBold: {
    color: COLORS.maroon,
    ...FONTS.bold,
  },
});
