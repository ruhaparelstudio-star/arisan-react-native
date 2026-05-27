import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Check, X } from 'lucide-react-native';
import { getAuth } from '@react-native-firebase/auth';
import { Button } from '@/components';
import { colors, fonts, radii, spacing, typography } from '@/theme';
import { auth as authService } from '@/services/firebase';
import { createUserProfile, loadUserProfile } from '@/services/auth';
import { registerPushToken } from '@/services/notifications';
import { useAuthStore, type Timezone } from '@/stores/auth';
import { useSignupStore } from '@/stores/signup';
import { authErrorMessage } from '@/lib/authErrors';

const PRIVACY_SHORT =
  'Arisan mengumpulkan nomor HP, nama, dan riwayat aktivitas kamu di grup arisan untuk menjalankan layanan: verifikasi identitas via OTP, kirim notifikasi reminder bayar dan pengumuman pemenang, serta menyimpan audit trail transaksi sesuai UU Perlindungan Data Pribadi (UU 27/2022). Data disimpan di server region Jakarta. Nomor HP kamu TIDAK pernah ditampilkan ke anggota lain — hanya nama. Kamu bisa hapus akun kapan saja dari menu Profil.';

const TOS_SHORT =
  'Dengan menggunakan Arisan, kamu setuju: (1) data arisan yang kamu input bersifat sosial, bukan transaksi finansial yang dijamin platform; (2) Arisan TIDAK memfasilitasi transfer uang — pembayaran dilakukan langsung antar anggota di luar aplikasi; (3) kamu wajib menjaga kerahasiaan OTP; (4) ketua grup bertanggung jawab atas keputusan undian, tukar giliran, dan dispute internal grup; (5) Arisan berhak menonaktifkan akun yang melanggar (penipuan, spam, ujaran kebencian). Versi lengkap akan tersedia di menu Profil.';

const PRIVACY_FULL_PLACEHOLDER =
  PRIVACY_SHORT +
  '\n\n[Placeholder] Versi lengkap Privacy Policy akan dirilis pada Phase 9 sebelum store submission. Akan mencakup: (a) daftar lengkap data yang dikumpulkan, (b) tujuan tiap data, (c) retensi, (d) prosedur hak akses/koreksi/hapus sesuai UU PDP, (e) kontak DPO.';

const TOS_FULL_PLACEHOLDER =
  TOS_SHORT +
  '\n\n[Placeholder] Versi lengkap Terms of Service akan dirilis pada Phase 9 sebelum store submission. Akan mencakup: definisi layanan, hak & kewajiban pengguna, batasan tanggung jawab, prosedur dispute resolution, ketentuan terminasi akun, dan governing law (Indonesia).';

type ModalKind = 'privacy' | 'tos' | null;

export default function ConsentScreen() {
  const [nama, setNama] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState<ModalKind>(null);
  const phone = useSignupStore((s) => s.phone);
  const resetSignup = useSignupStore((s) => s.reset);
  const setUser = useAuthStore((s) => s.setUser);

  const canSubmit = useMemo(
    () => agreed && nama.trim().length >= 2 && !loading,
    [agreed, nama, loading],
  );

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const fbUser = getAuth().currentUser ?? authService().currentUser;
    if (!fbUser || !phone) {
      setError('Sesi tidak valid, silakan ulangi dari awal');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const timezone = detectTimezone();
      await createUserProfile(fbUser.uid, {
        phone,
        nama: nama.trim(),
        timezone,
      });
      // Push token register — minta permission setelah consent (CLAUDE.md §5b)
      // Failure non-blocking — user tetap bisa lanjut ke home.
      try {
        await registerPushToken(fbUser.uid);
      } catch {
        // Silent: token bisa di-retry saat app start berikutnya
      }
      const profile = await loadUserProfile(fbUser.uid);
      setUser(profile);
      resetSignup();
      router.replace('/(tabs)');
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
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Sebelum lanjut...</Text>
          <Text style={styles.subtitle}>
            Kami butuh persetujuanmu untuk Privacy Policy & Terms of Service, serta nama untuk
            ditampilkan ke anggota grup.
          </Text>

          <PolicyCard
            title="Privacy Policy"
            body={PRIVACY_SHORT}
            onExpand={() => setOpenModal('privacy')}
          />
          <PolicyCard
            title="Terms of Service"
            body={TOS_SHORT}
            onExpand={() => setOpenModal('tos')}
          />

          <Pressable onPress={() => setAgreed((v) => !v)} style={styles.checkboxRow} hitSlop={8}>
            <View style={[styles.checkbox, agreed && styles.checkboxOn]}>
              {agreed ? <Check size={16} color="#FFFFFF" strokeWidth={3} /> : null}
            </View>
            <Text style={styles.checkboxLabel}>
              Saya setuju dengan Privacy Policy dan Terms of Service
            </Text>
          </Pressable>

          <Text style={styles.label}>Nama lengkap</Text>
          <TextInput
            style={styles.input}
            value={nama}
            onChangeText={setNama}
            placeholder="Contoh: Budi Santoso"
            placeholderTextColor={colors.textDisabled}
            maxLength={50}
            editable={!loading}
          />
          <Text style={styles.helper}>
            Nama ini yang ditampilkan ke anggota grup. Nomor HP kamu tidak akan ditampilkan ke siapa
            pun.
          </Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>

        <View style={styles.footer}>
          <Button full onPress={handleSubmit} disabled={!canSubmit}>
            {loading ? <ActivityIndicator color="#FFFFFF" /> : 'Lanjutkan'}
          </Button>
        </View>
      </KeyboardAvoidingView>

      <PolicyModal kind={openModal} onClose={() => setOpenModal(null)} />
    </SafeAreaView>
  );
}

function PolicyCard({
  title,
  body,
  onExpand,
}: {
  title: string;
  body: string;
  onExpand: () => void;
}) {
  return (
    <View style={styles.policyCard}>
      <Text style={styles.policyTitle}>{title}</Text>
      <Text style={styles.policyBody} numberOfLines={5}>
        {body}
      </Text>
      <Pressable onPress={onExpand} hitSlop={8}>
        <Text style={styles.policyLink}>Baca selengkapnya</Text>
      </Pressable>
    </View>
  );
}

function PolicyModal({ kind, onClose }: { kind: ModalKind; onClose: () => void }) {
  const visible = kind !== null;
  const title = kind === 'privacy' ? 'Privacy Policy' : 'Terms of Service';
  const body = kind === 'privacy' ? PRIVACY_FULL_PLACEHOLDER : TOS_FULL_PLACEHOLDER;
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalScreen} edges={['top', 'bottom']}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={8} style={styles.modalClose}>
            <X size={22} color={colors.text} strokeWidth={1.75} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.modalBody}>
          <Text style={styles.modalBodyText}>{body}</Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function detectTimezone(): Timezone {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz === 'Asia/Jakarta' || tz === 'Asia/Makassar' || tz === 'Asia/Jayapura') {
      return tz;
    }
  } catch {
    // Fallthrough ke default
  }
  return 'Asia/Jakarta';
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl },
  title: { ...typography.h1, marginBottom: spacing.sm },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginBottom: spacing.xl,
  },
  policyCard: {
    backgroundColor: colors.card,
    borderRadius: radii.cardLg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  policyTitle: {
    ...typography.h3,
    marginBottom: spacing.sm,
  },
  policyBody: {
    ...typography.body,
    color: colors.textBody,
    marginBottom: spacing.sm,
  },
  policyLink: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.primary,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  checkboxOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxLabel: {
    ...typography.body,
    flex: 1,
    color: colors.text,
  },
  label: {
    ...typography.bodyStrong,
    marginBottom: spacing.sm,
  },
  input: {
    height: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.input,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  helper: {
    ...typography.caption,
    color: colors.textSubtle,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    marginTop: spacing.md,
  },
  footer: {
    padding: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.page,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalScreen: { flex: 1, backgroundColor: colors.page },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { ...typography.h2, flex: 1 },
  modalClose: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: { padding: spacing.xl },
  modalBodyText: {
    ...typography.body,
    color: colors.textBody,
  },
});
