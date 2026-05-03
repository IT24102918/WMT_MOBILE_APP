import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, Card } from '../../components/UI';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { requestJson, requestMultipart } from '../../config/api';

const BANK_DETAILS = {
  accountName: 'Miyuru Randeepa',
  bankName: 'Commercial Bank',
  accountNumber: '8028350343',
  branch: 'Matara',
};

const formatExpiryInput = (value, previousValue = '') => {
  const digits = value.replace(/\D/g, '').slice(0, 4);

  if (!digits) return '';

  if (digits.length === 1) {
    const firstDigit = Number(digits);
    if (firstDigit === 0) return '0';
    if (firstDigit > 1) return `0${firstDigit}/`;
    return digits;
  }

  const monthDigits = digits.slice(0, 2);
  const month = Number(monthDigits);
  if (month < 1 || month > 12) {
    return previousValue;
  }

  if (digits.length === 2) {
    return `${monthDigits}/`;
  }

  return `${monthDigits}/${digits.slice(2)}`;
};

const getExpiryValidationMessage = (expiryValue, currentMonth, currentYear) => {
  if (!expiryValue) return '';
  if (!/^\d{2}\/\d{2}$/.test(expiryValue)) return 'Enter expiry as MM/YY';

  const month = Number(expiryValue.slice(0, 2));
  const year = Number(expiryValue.slice(3, 5));

  if (month < 1 || month > 12) {
    return 'Month must be between 01 and 12';
  }

  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return 'Use the current month or a future expiry date';
  }

  return '';
};

function PaymentMethodCard({ active, icon, title, desc, onPress }) {
  return (
    <TouchableOpacity style={[styles.methodCard, active && styles.methodCardActive]} onPress={onPress} activeOpacity={0.85}>
      <Ionicons name={icon} size={22} color={active ? COLORS.white : COLORS.maroon} />
      <Text style={[styles.methodTitle, active && styles.methodTitleActive]}>{title}</Text>
      <Text style={[styles.methodDesc, active && styles.methodDescActive]}>{desc}</Text>
    </TouchableOpacity>
  );
}

export default function CheckoutScreen() {
  const nav = useNavigation();
  const { cart, total, clearCart } = useCart();
  const { user } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState('CARD');
  const [cardNum, setCardNum] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [bankSlip, setBankSlip] = useState(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const formatCard = (value) => value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  const today = useMemo(() => new Date(), []);
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear() % 100;
  const expiryError = getExpiryValidationMessage(cardExp, currentMonth, currentYear);
  const isExpiryValid = Boolean(cardExp) && expiryError === '';

  const canSubmit =
    paymentMethod === 'CARD'
      ? cardNum.replace(/\s/g, '').length === 16 &&
        isExpiryValid &&
        /^\d{3}$/.test(cardCvv) &&
        cardName.trim().length >= 3
      : Boolean(bankSlip);

  const handlePickSlip = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets?.length) {
        setBankSlip(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Slip Selection Failed', error.message);
    }
  };

  const handlePay = async () => {
    if (paymentMethod === 'CARD') {
      if (cardNum.replace(/\s/g, '').length !== 16) { Alert.alert('Invalid card number'); return; }
      if (!isExpiryValid) { Alert.alert('Invalid expiry', expiryError || 'Enter a valid expiry date'); return; }
      if (!/^\d{3}$/.test(cardCvv)) { Alert.alert('Invalid CVV'); return; }
      if (!cardName.trim()) { Alert.alert('Enter cardholder name'); return; }
    }

    if (paymentMethod === 'BANK_TRANSFER' && !bankSlip) {
      Alert.alert('Payment Slip Required', 'Upload your bank transfer slip before submitting.');
      return;
    }

    setLoading(true);
    try {
      const uid = user?._id || user?.id;
      const order = await requestJson('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          user: uid,
          totalAmount: total,
          status: paymentMethod === 'CARD' ? 'PAID' : 'PENDING',
        }),
      });
      const orderId = order._id || order.id;

      for (const item of cart) {
        await requestJson('/api/order-items', {
          method: 'POST',
          body: JSON.stringify({
            order: orderId,
            product: item._id || item.id,
            quantity: item.qty,
            price: item.price,
          }),
        });
      }

      if (paymentMethod === 'BANK_TRANSFER') {
        const formData = new FormData();
        formData.append('order', orderId);
        formData.append('amount', String(total));
        formData.append('paymentMethod', 'BANK_TRANSFER');
        formData.append('paymentStatus', 'PENDING_VERIFICATION');
        formData.append('transactionId', `ORDER-BANK-${Date.now()}`);
        formData.append('paymentReference', paymentReference.trim());
        formData.append('bankAccountName', BANK_DETAILS.accountName);
        formData.append('bankName', BANK_DETAILS.bankName);
        formData.append('bankAccountNumber', BANK_DETAILS.accountNumber);
        formData.append('bankBranch', BANK_DETAILS.branch);
        formData.append('slip', {
          uri: bankSlip.uri,
          name: bankSlip.name || `order-slip-${Date.now()}.jpg`,
          type: bankSlip.mimeType || 'image/jpeg',
        });

        await requestMultipart('/api/payments', formData, { method: 'POST' });
      } else {
        await requestJson('/api/payments', {
          method: 'POST',
          body: JSON.stringify({
            order: orderId,
            amount: total,
            paymentMethod: 'CARD',
            paymentStatus: 'PAID',
            transactionId: `CARD-${Date.now()}`,
          }),
        });
      }

      clearCart();
      setDone(true);
    } catch (error) {
      Alert.alert('Payment Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <View style={styles.confirm}>
        <Ionicons
          name={paymentMethod === 'BANK_TRANSFER' ? 'document-attach' : 'checkmark-circle'}
          size={80}
          color={paymentMethod === 'BANK_TRANSFER' ? COLORS.gold : COLORS.green}
        />
        <Text style={styles.confirmTitle}>
          {paymentMethod === 'BANK_TRANSFER' ? 'Slip Submitted!' : 'Order Placed!'}
        </Text>
        <Text style={styles.confirmSub}>
          {paymentMethod === 'BANK_TRANSFER'
            ? 'Your order was created and the bank transfer slip is waiting for manual verification.'
            : 'Your order has been placed successfully.'}
        </Text>
        <Button
          title="Back to Shop"
          onPress={() => {
            nav.popToTop();
            nav.navigate('Main', { screen: 'Shop' });
          }}
          style={{ marginTop: SPACING.lg, minWidth: 200 }}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{ padding: SPACING.md, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Card style={{ marginBottom: SPACING.md }}>
          <Text style={styles.cardTitle}>Order Summary</Text>
          {cart.map((item) => (
            <View key={item._id || item.id} style={styles.row}>
              <Text style={styles.itemName}>{item.name} x {item.qty}</Text>
              <Text style={styles.itemPrice}>Rs. {(item.price * item.qty).toFixed(2)}</Text>
            </View>
          ))}
          <View style={[styles.row, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalVal}>Rs. {total.toFixed(2)}</Text>
          </View>
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Payment Details</Text>
          <Text style={styles.sectionLabel}>Payment Method</Text>
          <View style={styles.methodRow}>
            <PaymentMethodCard
              active={paymentMethod === 'CARD'}
              icon="card-outline"
              title="Card Payment"
              desc="Pay instantly and confirm now."
              onPress={() => setPaymentMethod('CARD')}
            />
            <PaymentMethodCard
              active={paymentMethod === 'BANK_TRANSFER'}
              icon="business-outline"
              title="Bank Transfer"
              desc="Upload your payment slip for verification."
              onPress={() => setPaymentMethod('BANK_TRANSFER')}
            />
          </View>

          {paymentMethod === 'CARD' ? (
            <View>
              <Input label="Cardholder Name" value={cardName} onChangeText={setCardName} placeholder="Name on card" />
              <Input
                label="Card Number"
                value={cardNum}
                onChangeText={(value) => setCardNum(formatCard(value))}
                keyboardType="numeric"
                placeholder="1234 5678 9012 3456"
                maxLength={19}
                secureTextEntry
                autoCorrect={false}
                autoComplete="off"
                contextMenuHidden
              />
              <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Expiry"
                    value={cardExp}
                    onChangeText={(value) => setCardExp(formatExpiryInput(value, cardExp))}
                    keyboardType="numeric"
                    placeholder="MM/YY"
                    maxLength={5}
                    error={expiryError || undefined}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Input
                    label="CVV"
                    value={cardCvv}
                    onChangeText={(value) => setCardCvv(value.replace(/\D/g, '').slice(0, 3))}
                    keyboardType="numeric"
                    secureTextEntry
                    placeholder="123"
                    maxLength={3}
                  />
                </View>
              </View>
            </View>
          ) : (
            <View>
              <Card style={styles.bankCard}>
                <Text style={styles.bankTitle}>Bank Transfer Details</Text>
                <View style={styles.bankRow}>
                  <Text style={styles.bankKey}>Account Name</Text>
                  <Text style={styles.bankValue}>{BANK_DETAILS.accountName}</Text>
                </View>
                <View style={styles.bankRow}>
                  <Text style={styles.bankKey}>Bank</Text>
                  <Text style={styles.bankValue}>{BANK_DETAILS.bankName}</Text>
                </View>
                <View style={styles.bankRow}>
                  <Text style={styles.bankKey}>Account Number</Text>
                  <Text style={styles.bankValue}>{BANK_DETAILS.accountNumber}</Text>
                </View>
                <View style={styles.bankRow}>
                  <Text style={styles.bankKey}>Branch</Text>
                  <Text style={styles.bankValue}>{BANK_DETAILS.branch}</Text>
                </View>
              </Card>

              <Input
                label="Transfer Note / Reference"
                value={paymentReference}
                onChangeText={setPaymentReference}
                placeholder="Optional bank transfer note"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                autoCorrect={false}
                style={styles.transferNoteInput}
              />

              <Text style={styles.sectionLabel}>Payment Slip</Text>
              <TouchableOpacity style={styles.uploadCard} onPress={handlePickSlip} activeOpacity={0.85}>
                <Ionicons name="cloud-upload-outline" size={22} color={COLORS.maroon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.uploadTitle}>{bankSlip ? 'Slip selected' : 'Upload transfer slip'}</Text>
                  <Text style={styles.uploadSub}>
                    {bankSlip ? bankSlip.name : 'Choose an image or PDF of your bank transfer receipt.'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.gray400} />
              </TouchableOpacity>
              <Text style={styles.hintText}>Your order stays pending until the transfer slip is verified.</Text>
            </View>
          )}

          <Button
            title={paymentMethod === 'BANK_TRANSFER' ? 'Submit Slip' : `Pay Rs. ${total.toFixed(2)}`}
            onPress={handlePay}
            loading={loading}
            size="lg"
            style={{ marginTop: 8 }}
            disabled={!canSubmit}
          />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.cream },
  cardTitle: { fontSize: 16, ...FONTS.semibold, color: COLORS.dark, marginBottom: SPACING.sm },
  sectionLabel: { fontSize: 14, ...FONTS.medium, color: COLORS.dark, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  itemName: { fontSize: 14, color: COLORS.gray600, flex: 1, paddingRight: SPACING.sm },
  itemPrice: { fontSize: 14, ...FONTS.medium, color: COLORS.dark },
  totalRow: { borderTopWidth: 1, borderTopColor: COLORS.gray200, marginTop: 6, paddingTop: 10 },
  totalLabel: { fontSize: 16, ...FONTS.bold, color: COLORS.dark },
  totalVal: { fontSize: 16, ...FONTS.bold, color: COLORS.maroon },
  methodRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  methodCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.gray200,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: 6,
  },
  methodCardActive: { backgroundColor: COLORS.maroon, borderColor: COLORS.maroon },
  methodTitle: { fontSize: 15, ...FONTS.semibold, color: COLORS.dark },
  methodTitleActive: { color: COLORS.white },
  methodDesc: { fontSize: 12, color: COLORS.gray600, lineHeight: 18 },
  methodDescActive: { color: COLORS.lightGold },
  bankCard: {
    marginBottom: SPACING.md,
    backgroundColor: '#FFF8EA',
    borderWidth: 1,
    borderColor: '#E9D8B4',
  },
  bankTitle: { fontSize: 16, ...FONTS.semibold, color: COLORS.maroon, marginBottom: SPACING.sm },
  bankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
    paddingVertical: 5,
  },
  bankKey: { fontSize: 13, color: COLORS.gray600 },
  bankValue: { flex: 1, textAlign: 'right', fontSize: 13, ...FONTS.semibold, color: COLORS.dark },
  transferNoteInput: { minHeight: 92 },
  uploadCard: {
    borderWidth: 1.5,
    borderColor: COLORS.gray200,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  uploadTitle: { fontSize: 14, ...FONTS.semibold, color: COLORS.dark },
  uploadSub: { fontSize: 12, color: COLORS.gray600, lineHeight: 18, marginTop: 2 },
  hintText: { fontSize: 12, color: COLORS.gray400, marginTop: 6 },
  confirm: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: COLORS.cream, padding: SPACING.xl },
  confirmTitle: { fontSize: 28, ...FONTS.bold, color: COLORS.dark },
  confirmSub: { fontSize: 15, color: COLORS.gray600, textAlign: 'center' },
});
