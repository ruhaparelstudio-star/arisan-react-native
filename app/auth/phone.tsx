import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button } from '@/components';
import { colors, fonts, radii, spacing, typography } from '@/theme';
import { sendOtp } from '@/services/auth';
import { useSignupStore } from '@/stores/signup';
import { authErrorMessage } from '@/lib/authErrors';

function formatDisplay(digits: string): string {
  // 8 → "8", 812 → "812", 8123 → "812-3", 81234567 → "812-3456-7", dst.
  const d = digits;
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7, 11)}`;
}

export default function PhoneScreen() {
  const [digits, setDigits] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setPhone = useSignupStore((s) => s.setPhone);
  const setConfirmation = useSignupStore((s) => s.setConfirmation);

  const cleaned = useMemo(() => digits.replace(/\D/g, '').slice(0, 13), [digits]);
  const valid = cleaned.length >= 8 && cleaned.length <= 13;

  const handleSubmit = async () => {
    if (!valid || loading) return;
    Keyboard.dismiss();
    setError(null);
    setLoading(true);
    const phone = `+62${cleaned}`;
    try {
      const confirmation = await sendOtp(phone);
      setPhone(phone);
      setConfirmation(confirmation);
      router.push('/auth/otp');
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Masuk dengan Nomor HP</Text>
          <Text style={styles.subtitle}>
            Kami akan kirim kode OTP via SMS untuk verifikasi nomor kamu.
          </Text>

          <View style={styles.inputRow}>
            <View style={styles.prefixBox}>
              <Text style={styles.prefixText}>+62</Text>
            </View>
            <TextInput
              style={styles.input}
              value={formatDisplay(cleaned)}
              onChangeText={setDigits}
              placeholder="812-3456-7890"
              placeholderTextColor={colors.textDisabled}
              keyboardType="phone-pad"
              autoFocus
              maxLength={15}
              editable={!loading}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.helper}>
            Dengan melanjutkan, kamu menyetujui Privacy Policy & Terms of Service Arisan.
          </Text>
        </View>

        <View style={styles.footer}>
          <Button full onPress={handleSubmit} disabled={!valid || loading}>
            {loading ? <ActivityIndicator color="#FFFFFF" /> : 'Kirim Kode OTP'}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: {
    flex: 1,
    padding: spacing.xl,
    paddingTop: spacing.xxl,
  },
  title: { ...typography.h1, marginBottom: spacing.sm },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginBottom: spacing.xl,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  prefixBox: {
    height: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.input,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefixText: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.textBody,
  },
  input: {
    flex: 1,
    height: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.input,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.text,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    marginBottom: spacing.md,
  },
  helper: {
    ...typography.caption,
    color: colors.textSubtle,
    marginTop: spacing.lg,
  },
  footer: {
    padding: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.page,
  },
});
