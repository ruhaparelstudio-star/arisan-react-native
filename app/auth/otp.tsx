import React, { createRef, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputKeyPressEventData,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button, Header } from '@/components';
import { colors, fonts, radii, spacing, typography } from '@/theme';
import { sendOtp, verifyOtp, loadUserProfile } from '@/services/auth';
import { useSignupStore } from '@/stores/signup';
import { useAuthStore } from '@/stores/auth';
import { authErrorMessage } from '@/lib/authErrors';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

export default function OtpScreen() {
  const phone = useSignupStore((s) => s.phone);
  const confirmation = useSignupStore((s) => s.confirmation);
  const setConfirmation = useSignupStore((s) => s.setConfirmation);

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [error, setError] = useState<string | null>(null);

  const refs = useMemo(() => Array.from({ length: OTP_LENGTH }, () => createRef<TextInput>()), []);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  useEffect(() => {
    // Kalau user nyasar ke screen ini tanpa confirmation, balik ke phone
    if (!confirmation || !phone) {
      router.replace('/auth/phone');
    }
  }, [confirmation, phone]);

  const code = digits.join('');
  const canVerify = code.length === OTP_LENGTH && !loading;

  const handleChange = (idx: number, value: string) => {
    const clean = value.replace(/\D/g, '');
    if (!clean) {
      setDigits((prev) => prev.map((d, i) => (i === idx ? '' : d)));
      return;
    }
    // Support paste multi-digit
    const chars = clean.split('').slice(0, OTP_LENGTH - idx);
    setDigits((prev) => {
      const next = [...prev];
      chars.forEach((c, j) => {
        next[idx + j] = c;
      });
      return next;
    });
    const focusTo = Math.min(idx + chars.length, OTP_LENGTH - 1);
    refs[focusTo]?.current?.focus();
  };

  const handleKey = (idx: number, e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[idx] && idx > 0) {
      refs[idx - 1]?.current?.focus();
    }
  };

  const handleVerify = async () => {
    if (!canVerify || !confirmation) return;
    Keyboard.dismiss();
    setError(null);
    setLoading(true);
    try {
      const cred = await verifyOtp(confirmation, code);
      const uid = cred?.user?.uid;
      if (!uid) throw new Error('Verifikasi gagal, coba lagi');
      const profile = await loadUserProfile(uid);
      if (profile) {
        useAuthStore.getState().setUser(profile);
        router.replace('/(tabs)');
      } else {
        router.replace('/auth/consent');
      }
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!phone || resending) return;
    setError(null);
    setResending(true);
    try {
      const newConfirmation = await sendOtp(phone);
      setConfirmation(newConfirmation);
      setDigits(Array(OTP_LENGTH).fill(''));
      setSecondsLeft(RESEND_SECONDS);
      refs[0]?.current?.focus();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <Header title="Verifikasi OTP" onBack={() => router.back()} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.content}>
          <Text style={styles.subtitle}>
            Kode 6 digit dikirim ke <Text style={styles.phone}>{phone ?? ''}</Text>
          </Text>

          <View style={styles.boxes}>
            {digits.map((d, i) => (
              <TextInput
                key={i}
                ref={refs[i]}
                style={[styles.box, !!d && styles.boxFilled]}
                keyboardType="number-pad"
                maxLength={i === 0 ? OTP_LENGTH : 1}
                value={d}
                onChangeText={(v) => handleChange(i, v)}
                onKeyPress={(e) => handleKey(i, e)}
                autoFocus={i === 0}
                editable={!loading}
                selectTextOnFocus
              />
            ))}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.resendRow}>
            {secondsLeft > 0 ? (
              <Text style={styles.resendDim}>Kirim ulang dalam {formatTime(secondsLeft)}</Text>
            ) : (
              <Pressable onPress={handleResend} disabled={resending} hitSlop={8}>
                <Text style={styles.resendLink}>
                  {resending ? 'Mengirim...' : 'Kirim ulang kode'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <Button full onPress={handleVerify} disabled={!canVerify}>
            {loading ? <ActivityIndicator color="#FFFFFF" /> : 'Verifikasi'}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { flex: 1, padding: spacing.xl, paddingTop: spacing.xxl },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginBottom: spacing.xl,
  },
  phone: {
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  boxes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  box: {
    flex: 1,
    height: 56,
    borderRadius: radii.input,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    textAlign: 'center',
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.text,
  },
  boxFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    marginBottom: spacing.md,
  },
  resendRow: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  resendDim: { ...typography.caption, color: colors.textSubtle },
  resendLink: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.primary,
  },
  footer: {
    padding: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.page,
  },
});
