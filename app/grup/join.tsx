import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { QrCode } from 'lucide-react-native';
import { Button, Header, Toast } from '@/components';
import { colors, fonts, radii } from '@/theme';
import { callable } from '@/services/firebase';

type JoinReq = { code: string };
type JoinRes = { groupId: string; alreadyMember: boolean };

const CODE_RE = /^[A-Z2-9]{7}$/;

export default function JoinScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const initialCode = (params.code ?? '').toUpperCase();
  const [code, setCode] = useState(initialCode);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (initialCode && CODE_RE.test(initialCode)) {
      // Auto-submit ketika datang dari deep link.
      void submit(initialCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  const canSubmit = CODE_RE.test(code) && !submitting;

  const submit = async (raw: string) => {
    const normalized = raw.toUpperCase().trim();
    if (!CODE_RE.test(normalized)) {
      setToast('Kode harus 7 karakter (A-Z, 2-9)');
      return;
    }
    setSubmitting(true);
    try {
      const fn = callable<JoinReq, JoinRes>('joinViaCode');
      const res = await fn({ code: normalized });
      const { groupId, alreadyMember } = res.data;
      if (alreadyMember) {
        setToast('Kamu sudah jadi anggota');
      }
      router.replace(`/group/${groupId}`);
    } catch (err) {
      const msg =
        err instanceof Error && err.message ? err.message : 'Gagal gabung grup. Coba lagi.';
      setToast(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Header title="Gabung Grup" onBack={() => router.back()} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.container}>
          <Text style={styles.title}>Masukkan kode invite</Text>
          <Text style={styles.hint}>
            Kode terdiri dari 7 karakter huruf besar dan angka. Minta kode ini dari ketua grup.
          </Text>

          <TextInput
            autoFocus
            value={code}
            onChangeText={(t) =>
              setCode(
                t
                  .toUpperCase()
                  .replace(/[^A-Z2-9]/g, '')
                  .slice(0, 7),
              )
            }
            placeholder="Misal: ABC2KX9"
            placeholderTextColor={colors.textDisabled}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={7}
            style={styles.input}
          />

          <Button
            full
            onPress={() => submit(code)}
            disabled={!canSubmit}
            style={{ marginTop: 18 }}
            leading={submitting ? <ActivityIndicator color="#FFF" size="small" /> : undefined}
          >
            {submitting ? 'Memeriksa...' : 'Cek & Gabung'}
          </Button>

          <View style={styles.separator}>
            <View style={styles.sepLine} />
            <Text style={styles.sepText}>atau</Text>
            <View style={styles.sepLine} />
          </View>

          <View style={styles.disabledQr}>
            <QrCode size={18} color={colors.textDisabled} strokeWidth={1.75} />
            <Text style={styles.disabledQrText}>Scan QR (segera hadir)</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
      <Toast message={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  container: { flex: 1, padding: 20 },
  title: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
  },
  hint: {
    marginTop: 6,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSubtle,
    lineHeight: 18,
  },
  input: {
    marginTop: 18,
    height: 64,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: radii.input,
    fontFamily: 'Menlo',
    fontSize: 22,
    color: colors.text,
    letterSpacing: 4,
    textAlign: 'center',
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 24,
    marginBottom: 16,
  },
  sepLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  sepText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textSubtle,
  },
  disabledQr: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    opacity: 0.7,
  },
  disabledQrText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textDisabled,
  },
});
