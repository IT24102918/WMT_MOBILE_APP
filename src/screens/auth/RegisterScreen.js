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
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../../context/AuthContext';
import { Button, Input } from '../../components/UI';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { requestJson } from '../../config/api';

const MASK_IMAGE = require('../../../assets/icon.png');

const ROLES = [
  { label: 'Customer (Book Rituals)', value: 'CUSTOMER' },
  { label: 'Performer / Kattadiya', value: 'PERFORMER' },
  { label: 'Supplier', value: 'SUPPLIER' },
  { label: 'Driver (Logistics)', value: 'DRIVER' },
  { label: 'Inventory Manager', value: 'INVENTORY_MANAGER' },
];

export default function RegisterScreen() {
  const nav = useNavigation();
  const { login } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
    roleName: 'CUSTOMER',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const validate = () => {
    const nextErrors = {};
    if (!form.name) nextErrors.name = 'Name is required';
    if (!form.email) nextErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) nextErrors.email = 'Invalid email';
    if (!form.phone) nextErrors.phone = 'Phone is required';
    else if (!/^0\d{9}$/.test(form.phone)) nextErrors.phone = 'Enter 10-digit phone (e.g. 0771234567)';
    if (!form.password) nextErrors.password = 'Password required';
    else if (form.password.length < 8) nextErrors.password = 'Minimum 8 characters';
    if (form.password !== form.confirm) nextErrors.confirm = 'Passwords do not match';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await requestJson(`/api/auth/register?roleName=${form.roleName}`, {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          password: form.password,
        }),
      });

      const data = await requestJson('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      await login(data);
    } catch (error) {
      Alert.alert('Registration Failed', error.message);
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
          <Text style={styles.brand}>Join Towile.lk</Text>
          <Text style={styles.sub}>Create your account to book performers, buy ritual supplies, or manage services.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create Account</Text>
          <Text style={styles.cardSub}>Choose your role and start with the correct experience.</Text>

          <Input label="Full Name" value={form.name} onChangeText={(value) => set('name', value)} placeholder="Your full name" error={errors.name} />
          <Input
            label="Email"
            value={form.email}
            onChangeText={(value) => set('email', value)}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="you@example.com"
            error={errors.email}
          />
          <Input
            label="Phone Number"
            value={form.phone}
            onChangeText={(value) => set('phone', value.replace(/\D/g, '').slice(0, 10))}
            keyboardType="phone-pad"
            placeholder="0771234567"
            error={errors.phone}
          />

          <Text style={styles.pickerLabel}>Join As</Text>
          <View style={styles.pickerWrap}>
            <Picker selectedValue={form.roleName} onValueChange={(value) => set('roleName', value)} style={styles.picker}>
              {ROLES.map((role) => (
                <Picker.Item key={role.value} label={role.label} value={role.value} />
              ))}
            </Picker>
          </View>

          <Input
            label="Password"
            value={form.password}
            onChangeText={(value) => set('password', value)}
            secureTextEntry
            placeholder="Minimum 8 characters"
            error={errors.password}
          />
          <Input
            label="Confirm Password"
            value={form.confirm}
            onChangeText={(value) => set('confirm', value)}
            secureTextEntry
            placeholder="Re-enter password"
            error={errors.confirm}
          />

          <Button title="Create Account" onPress={handleRegister} loading={loading} style={styles.primaryButton} />

          <TouchableOpacity onPress={() => nav.navigate('Login')} style={styles.link}>
            <Text style={styles.linkText}>
              Already have an account? <Text style={styles.linkBold}>Sign In</Text>
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
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  hero: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  logoCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
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
    width: 96,
    height: 96,
  },
  brand: {
    marginTop: SPACING.md,
    fontSize: 34,
    ...FONTS.bold,
    color: '#5D0505',
    textAlign: 'center',
  },
  sub: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
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
  pickerLabel: {
    fontSize: 14,
    ...FONTS.medium,
    color: COLORS.dark,
    marginBottom: 6,
  },
  pickerWrap: {
    borderWidth: 1.5,
    borderColor: COLORS.gray200,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
  },
  picker: {
    color: COLORS.dark,
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
