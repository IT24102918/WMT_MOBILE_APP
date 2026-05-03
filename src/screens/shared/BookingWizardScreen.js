import React, { useMemo, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Modal, Platform, KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { Button, Card, Input } from '../../components/UI';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { API_BASE } from '../../constants/theme';

const BANK_DETAILS = {
  accountName: 'Miyuru Randeepa',
  bankName: 'Commercial Bank',
  accountNumber: '8028350343',
  branch: 'Matara',
};

function StepBar({ step, total = 3 }) {
  return (
    <View style={styles.stepBar}>
      {Array.from({ length: total }).map((_, i) => (
        <React.Fragment key={i}>
          <View style={[styles.dot, i < step && styles.dotDone, i === step - 1 && styles.dotActive]}>
            {i < step - 1 ? (
              <Ionicons name="checkmark" size={12} color={COLORS.white} />
            ) : (
              <Text style={[styles.dotText, i === step - 1 && { color: COLORS.white }]}>{i + 1}</Text>
            )}
          </View>
          {i < total - 1 && <View style={[styles.line, i < step - 1 && styles.lineDone]} />}
        </React.Fragment>
      ))}
    </View>
  );
}

const toIsoDate = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toDisplayDate = (dateString) => {
  if (!dateString) return '';
  const safeDate = new Date(`${dateString}T12:00:00`);
  return safeDate.toLocaleDateString('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const isTodayOrFuture = (dateString, todayIso) => dateString >= todayIso;

const toPickerDate = (dateString, fallbackDate) => {
  if (!dateString) return fallbackDate;

  const parsedDate = new Date(`${dateString}T12:00:00`);
  return Number.isNaN(parsedDate.getTime()) ? fallbackDate : parsedDate;
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

async function parseJsonResponse(response, fallbackMessage) {
  const rawText = await response.text();
  const data = rawText ? JSON.parse(rawText) : null;

  if (!response.ok) {
    throw new Error(data?.message || fallbackMessage);
  }

  return data;
}

export default function BookingWizardScreen() {
  const { params } = useRoute();
  const nav = useNavigation();
  const { user } = useAuth();

  const performer = params?.performer;
  const availability = params?.availability || [];
  const [step, setStep] = useState(1);
  const [thowilTypes, setThowilTypes] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [preferredDate, setPreferredDate] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [pickerDate, setPickerDate] = useState(() => new Date());
  const [paymentMethod, setPaymentMethod] = useState('CARD');
  const [cardNum, setCardNum] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [bankSlip, setBankSlip] = useState(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const todayIso = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return toIsoDate(date);
  }, []);

  const availDates = useMemo(
    () =>
      availability.filter(
        (slot) => slot.status === 'AVAILABLE' && isTodayOrFuture(toIsoDate(new Date(slot.availableDate)), todayIso)
      ),
    [availability, todayIso]
  );

  const minimumBookingDate = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);
  const currentMonth = useMemo(() => minimumBookingDate.getMonth() + 1, [minimumBookingDate]);
  const currentYear = useMemo(() => minimumBookingDate.getFullYear() % 100, [minimumBookingDate]);

  useEffect(() => {
    fetch(`${API_BASE}/api/thowil-types`)
      .then((r) => r.json())
      .then(setThowilTypes)
      .catch(() => {});
  }, []);

  const formatCard = (value) => value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();

  const bookingDate = selectedDate?.availableDate || preferredDate || null;
  const bookingDateLabel = selectedDate ? toDisplayDate(selectedDate.availableDate) : toDisplayDate(preferredDate);
  const expiryError = getExpiryValidationMessage(cardExp, currentMonth, currentYear);
  const isExpiryValid = Boolean(cardExp) && expiryError === '';

  const canNext = () => {
    if (step === 1) return Boolean(selectedType && bookingDate);
    if (step === 2) {
      if (paymentMethod === 'CARD') {
        return (
          cardNum.replace(/\s/g, '').length === 16 &&
          isExpiryValid &&
          /^\d{3}$/.test(cardCvv) &&
          cardName.trim().length >= 3
        );
      }

      return Boolean(bankSlip);
    }
    return true;
  };

  const openCalendar = () => {
    setPickerDate(toPickerDate(preferredDate, minimumBookingDate));
    setShowCalendar(true);
  };

  const applyPreferredDate = (dateValue) => {
    const normalizedDate = new Date(dateValue);
    normalizedDate.setHours(12, 0, 0, 0);

    const isoDate = toIsoDate(normalizedDate);
    if (!isTodayOrFuture(isoDate, todayIso)) {
      return;
    }

    setPreferredDate(isoDate);
    setSelectedDate(null);
  };

  const handleDateChange = (event, dateValue) => {
    if (Platform.OS === 'android') {
      setShowCalendar(false);

      if (event.type === 'dismissed' || !dateValue) {
        return;
      }

      applyPreferredDate(dateValue);
      return;
    }

    if (dateValue) {
      setPickerDate(dateValue);
    }
  };

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

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const pid = performer._id || performer.id;
      const uid = user._id || user.id;

      const bookRes = await fetch(`${API_BASE}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: uid,
          performer: pid,
          thowilType: selectedType._id || selectedType.id,
          eventDate: bookingDate,
          status: 'PENDING',
          totalAmount: selectedType.basePrice || 0,
        }),
      });
      const booking = await parseJsonResponse(bookRes, 'Unable to create booking');
      const bookingId = booking._id || booking.id;

      if (paymentMethod === 'BANK_TRANSFER') {
        const formData = new FormData();
        formData.append('booking', bookingId);
        formData.append('amount', String(selectedType.basePrice || 0));
        formData.append('paymentMethod', 'BANK_TRANSFER');
        formData.append('paymentStatus', 'PENDING_VERIFICATION');
        formData.append('transactionId', `BANK-SLIP-${Date.now()}`);
        formData.append('paymentReference', paymentReference.trim());
        formData.append('bankAccountName', BANK_DETAILS.accountName);
        formData.append('bankName', BANK_DETAILS.bankName);
        formData.append('bankAccountNumber', BANK_DETAILS.accountNumber);
        formData.append('bankBranch', BANK_DETAILS.branch);
        formData.append('slip', {
          uri: bankSlip.uri,
          name: bankSlip.name || `payment-slip-${Date.now()}.jpg`,
          type: bankSlip.mimeType || 'image/jpeg',
        });

        const paymentRes = await fetch(`${API_BASE}/api/payments`, {
          method: 'POST',
          body: formData,
        });
        await parseJsonResponse(paymentRes, 'Unable to submit bank transfer slip');
      } else {
        const paymentRes = await fetch(`${API_BASE}/api/payments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            booking: bookingId,
            amount: selectedType.basePrice || 0,
            paymentMethod: 'CARD',
            paymentStatus: 'PAID',
            transactionId: `CARD-${Date.now()}`,
          }),
        });
        await parseJsonResponse(paymentRes, 'Unable to save card payment');
      }

      setStep(3);
    } catch (e) {
      Alert.alert('Booking Failed', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
    >
      <StepBar step={step} />

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {step === 1 && (
          <View>
            <Text style={styles.stepTitle}>Choose Ritual & Date</Text>

            <Text style={styles.label}>Ritual Type</Text>
            {thowilTypes.length === 0 ? (
              <Text style={styles.noData}>No ritual types available right now. Please try again in a moment.</Text>
            ) : (
              <View style={styles.chipGrid}>
                {thowilTypes.map((type) => (
                  <TouchableOpacity
                    key={type._id || type.id}
                    onPress={() => setSelectedType(type)}
                    style={[styles.chip, selectedType?._id === type._id && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, selectedType?._id === type._id && styles.chipTextActive]}>
                      {type.name}
                    </Text>
                    {type.basePrice ? (
                      <Text
                        style={[
                          styles.chipPrice,
                          selectedType?._id === type._id && { color: COLORS.lightGold },
                        ]}
                      >
                        Rs. {type.basePrice}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={[styles.label, { marginTop: SPACING.md }]}>Select Available Date</Text>
            {availDates.length === 0 ? (
              <View>
                <Text style={styles.noData}>
                  No availability set by performer yet. Pick your preferred date.
                </Text>
                <TouchableOpacity
                  style={styles.datePickerTrigger}
                  onPress={openCalendar}
                  activeOpacity={0.85}
                >
                  <Ionicons name="calendar-outline" size={20} color={COLORS.maroon} />
                  <Text style={[styles.datePickerText, !bookingDateLabel && styles.datePickerPlaceholder]}>
                    {bookingDateLabel || 'Tap to choose booking date'}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.dateHint}>Only today or future dates can be selected.</Text>
              </View>
            ) : (
              <View style={styles.chipGrid}>
                {availDates.map((slot, index) => {
                  const label = toDisplayDate(slot.availableDate);

                  return (
                    <TouchableOpacity
                      key={index}
                      onPress={() => {
                        setSelectedDate(slot);
                        setPreferredDate('');
                      }}
                      style={[styles.chip, selectedDate === slot && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, selectedDate === slot && styles.chipTextActive]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={styles.stepTitle}>Payment</Text>
            <Card style={{ marginBottom: SPACING.md }}>
              <Text style={styles.summaryTitle}>Booking Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryK}>Performer</Text>
                <Text style={styles.summaryV}>{performer.name}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryK}>Ritual</Text>
                <Text style={styles.summaryV}>{selectedType?.name}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryK}>Date</Text>
                <Text style={styles.summaryV}>{bookingDateLabel}</Text>
              </View>
              <View
                style={[
                  styles.summaryRow,
                  {
                    borderTopWidth: 1,
                    borderTopColor: COLORS.gray200,
                    marginTop: 8,
                    paddingTop: 8,
                  },
                ]}
              >
                <Text style={styles.summaryTotal}>Total</Text>
                <Text style={styles.summaryTotalVal}>Rs. {selectedType?.basePrice || 0}</Text>
              </View>
            </Card>

            <Text style={styles.label}>Payment Method</Text>
            <View style={styles.methodRow}>
              <TouchableOpacity
                style={[styles.methodCard, paymentMethod === 'CARD' && styles.methodCardActive]}
                onPress={() => setPaymentMethod('CARD')}
                activeOpacity={0.85}
              >
                <Ionicons name="card-outline" size={22} color={paymentMethod === 'CARD' ? COLORS.white : COLORS.maroon} />
                <Text style={[styles.methodTitle, paymentMethod === 'CARD' && styles.methodTitleActive]}>Card Payment</Text>
                <Text style={[styles.methodDesc, paymentMethod === 'CARD' && styles.methodDescActive]}>Pay instantly and confirm now.</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.methodCard, paymentMethod === 'BANK_TRANSFER' && styles.methodCardActive]}
                onPress={() => setPaymentMethod('BANK_TRANSFER')}
                activeOpacity={0.85}
              >
                <Ionicons name="business-outline" size={22} color={paymentMethod === 'BANK_TRANSFER' ? COLORS.white : COLORS.maroon} />
                <Text style={[styles.methodTitle, paymentMethod === 'BANK_TRANSFER' && styles.methodTitleActive]}>Bank Transfer</Text>
                <Text style={[styles.methodDesc, paymentMethod === 'BANK_TRANSFER' && styles.methodDescActive]}>Upload your payment slip for verification.</Text>
              </TouchableOpacity>
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
                      placeholder="123"
                      maxLength={3}
                      secureTextEntry
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
                  autoCapitalize="sentences"
                  returnKeyType="done"
                  style={styles.transferNoteInput}
                />

                <Text style={styles.label}>Payment Slip</Text>
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
                <Text style={styles.dateHint}>Your booking will stay pending until the transfer slip is verified.</Text>
              </View>
            )}
          </View>
        )}

        {step === 3 && (
          <View style={styles.confirm}>
            <View style={styles.confirmIcon}>
              <Ionicons
                name={paymentMethod === 'BANK_TRANSFER' ? 'document-attach' : 'checkmark-circle'}
                size={72}
                color={paymentMethod === 'BANK_TRANSFER' ? COLORS.gold : COLORS.green}
              />
            </View>
            <Text style={styles.confirmTitle}>
              {paymentMethod === 'BANK_TRANSFER' ? 'Slip Submitted!' : 'Booking Confirmed!'}
            </Text>
            <Text style={styles.confirmSub}>
              {paymentMethod === 'BANK_TRANSFER'
                ? `Your booking with ${performer.name} has been created and your bank transfer slip is waiting for manual verification.`
                : `Your Thowil ceremony with ${performer.name} has been booked. You'll receive a confirmation shortly.`}
            </Text>
            <Button
              title="Go to My Bookings"
              onPress={() => {
                nav.popToTop();
                nav.navigate('Main', { screen: 'Dashboard' });
              }}
              style={{ marginTop: SPACING.lg }}
            />
          </View>
        )}
      </ScrollView>

      {Platform.OS === 'ios' ? (
        <Modal transparent animationType="fade" visible={showCalendar} onRequestClose={() => setShowCalendar(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Choose Booking Date</Text>
              <Text style={styles.modalSubtitle}>Only today or future dates are available for booking.</Text>
              <DateTimePicker
                value={pickerDate}
                mode="date"
                display="inline"
                minimumDate={minimumBookingDate}
                onChange={handleDateChange}
                accentColor={COLORS.maroon}
                themeVariant="light"
                style={styles.iosDatePicker}
              />
              <Text style={styles.selectedDateLabel}>Selected: {toDisplayDate(toIsoDate(pickerDate))}</Text>
              <View style={styles.modalActions}>
                <Button title="Cancel" variant="outline" onPress={() => setShowCalendar(false)} style={{ flex: 1 }} />
                <Button
                  title="Use Date"
                  onPress={() => {
                    applyPreferredDate(pickerDate);
                    setShowCalendar(false);
                  }}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </View>
        </Modal>
      ) : null}

      {Platform.OS === 'android' && showCalendar ? (
        <DateTimePicker
          value={toPickerDate(preferredDate, minimumBookingDate)}
          mode="date"
          display="calendar"
          minimumDate={minimumBookingDate}
          onChange={handleDateChange}
        />
      ) : null}

      {step < 3 && (
        <View style={styles.navBar}>
          {step > 1 ? (
            <Button title="Back" variant="outline" onPress={() => setStep((s) => s - 1)} style={{ flex: 1 }} />
          ) : (
            <View style={{ flex: 1 }} />
          )}
          <View style={{ width: SPACING.sm }} />
          {step < 2 ? (
            <Button title="Next" onPress={() => setStep((s) => s + 1)} style={{ flex: 1 }} disabled={!canNext()} />
          ) : (
            <Button
              title={paymentMethod === 'BANK_TRANSFER' ? 'Submit Slip' : 'Confirm & Pay'}
              onPress={handleSubmit}
              loading={submitting}
              style={{ flex: 1 }}
              disabled={!canNext()}
            />
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.cream },
  stepBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotActive: { backgroundColor: COLORS.maroon },
  dotDone: { backgroundColor: COLORS.green },
  dotText: { fontSize: 13, ...FONTS.semibold, color: COLORS.gray600 },
  line: { flex: 1, height: 2, backgroundColor: COLORS.gray200 },
  lineDone: { backgroundColor: COLORS.green },
  body: { padding: SPACING.md, paddingBottom: 120 },
  stepTitle: { fontSize: 20, ...FONTS.bold, color: COLORS.dark, marginBottom: SPACING.md },
  label: { fontSize: 14, ...FONTS.medium, color: COLORS.dark, marginBottom: 8 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.gray200,
    backgroundColor: COLORS.white,
  },
  chipActive: { borderColor: COLORS.maroon, backgroundColor: COLORS.maroon },
  chipText: { fontSize: 14, ...FONTS.medium, color: COLORS.dark },
  chipTextActive: { color: COLORS.white },
  chipPrice: { fontSize: 12, color: COLORS.gray400, marginTop: 2 },
  noData: { fontSize: 14, color: COLORS.gray400, lineHeight: 20 },
  datePickerTrigger: {
    marginTop: SPACING.sm,
    borderWidth: 1.5,
    borderColor: COLORS.gray200,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  datePickerText: {
    fontSize: 15,
    color: COLORS.dark,
    ...FONTS.medium,
  },
  datePickerPlaceholder: {
    color: COLORS.gray400,
    ...FONTS.regular,
  },
  dateHint: { fontSize: 12, color: COLORS.gray400, marginTop: 6 },
  transferNoteInput: {
    minHeight: 92,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
  },
  modalTitle: {
    fontSize: 18,
    ...FONTS.semibold,
    color: COLORS.dark,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.gray600,
    marginBottom: SPACING.sm,
    lineHeight: 18,
  },
  iosDatePicker: {
    alignSelf: 'stretch',
  },
  selectedDateLabel: {
    marginTop: SPACING.sm,
    fontSize: 14,
    ...FONTS.medium,
    color: COLORS.maroon,
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  summaryTitle: { fontSize: 15, ...FONTS.semibold, color: COLORS.dark, marginBottom: SPACING.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryK: { fontSize: 14, color: COLORS.gray600 },
  summaryV: { fontSize: 14, ...FONTS.medium, color: COLORS.dark, textAlign: 'right', flex: 1, marginLeft: SPACING.md },
  summaryTotal: { fontSize: 16, ...FONTS.bold, color: COLORS.dark },
  summaryTotalVal: { fontSize: 16, ...FONTS.bold, color: COLORS.maroon },
  methodRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  methodCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.gray200,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: 6,
  },
  methodCardActive: {
    backgroundColor: COLORS.maroon,
    borderColor: COLORS.maroon,
  },
  methodTitle: {
    fontSize: 15,
    ...FONTS.semibold,
    color: COLORS.dark,
  },
  methodTitleActive: { color: COLORS.white },
  methodDesc: {
    fontSize: 12,
    color: COLORS.gray600,
    lineHeight: 18,
  },
  methodDescActive: { color: COLORS.lightGold },
  bankCard: {
    marginBottom: SPACING.md,
    backgroundColor: '#FFF8EA',
    borderWidth: 1,
    borderColor: '#E9D8B4',
  },
  bankTitle: {
    fontSize: 16,
    ...FONTS.semibold,
    color: COLORS.maroon,
    marginBottom: SPACING.sm,
  },
  bankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
    paddingVertical: 5,
  },
  bankKey: {
    fontSize: 13,
    color: COLORS.gray600,
  },
  bankValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    ...FONTS.semibold,
    color: COLORS.dark,
  },
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
  uploadTitle: {
    fontSize: 14,
    ...FONTS.semibold,
    color: COLORS.dark,
  },
  uploadSub: {
    fontSize: 12,
    color: COLORS.gray600,
    lineHeight: 18,
    marginTop: 2,
  },
  confirm: { alignItems: 'center', paddingVertical: SPACING.xxl },
  confirmIcon: { marginBottom: SPACING.md },
  confirmTitle: { fontSize: 26, ...FONTS.bold, color: COLORS.dark, textAlign: 'center' },
  confirmSub: { fontSize: 15, color: COLORS.gray600, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  navBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
  },
});
