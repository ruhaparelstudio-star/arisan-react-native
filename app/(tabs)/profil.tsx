import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ChevronRight,
  Settings,
  Trophy,
  History,
  RefreshCcw,
  Calendar,
  LogOut,
} from 'lucide-react-native';
import { Avatar } from '@/components';
import { colors, fonts, radii, shadows } from '@/theme';
import { useAuthStore } from '@/stores/auth';

type MenuItem = {
  label: string;
  desc?: string;
  icon: React.ReactNode;
  onPress: () => void;
};

function maskPhone(phone: string | undefined): string {
  if (!phone) return '';
  // +62 8xx-xxxx-xxxx → "+62 ••• ••• 7890"
  const digits = phone.replace(/^\+62/, '');
  if (digits.length < 4) return `+62 ••• ••• ${digits}`;
  return `+62 ••• ••• ${digits.slice(-4)}`;
}

export default function ProfilScreen() {
  const nama = useAuthStore((s) => s.user?.nama) ?? '';
  const phone = useAuthStore((s) => s.user?.phone);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      router.replace('/auth/phone');
    }
  };

  const menus: MenuItem[] = [
    {
      label: 'Notifikasi Pemenang',
      desc: 'Lihat ringkasan saat kamu menang',
      icon: <Trophy size={20} color={colors.primary} strokeWidth={1.75} />,
      onPress: () => router.push('/winner'),
    },
    {
      label: 'Set Tanggal Pelaksanaan',
      desc: 'Pilih tanggal arisan menang kamu',
      icon: <Calendar size={20} color={colors.primary} strokeWidth={1.75} />,
      onPress: () => router.push('/set-date'),
    },
    {
      label: 'Tukar Giliran',
      desc: 'Request tukar dengan anggota lain',
      icon: <RefreshCcw size={20} color={colors.primary} strokeWidth={1.75} />,
      onPress: () => router.push('/tukar'),
    },
    {
      label: 'Approval Tukar Giliran',
      desc: 'Notifikasi request dari anggota lain',
      icon: <RefreshCcw size={20} color={colors.warning} strokeWidth={1.75} />,
      onPress: () => router.push('/approval'),
    },
    {
      label: 'Riwayat Aktivitas',
      desc: 'Catatan semua aktivitas grup',
      icon: <History size={20} color={colors.textBody} strokeWidth={1.75} />,
      onPress: () => router.push('/riwayat'),
    },
    {
      label: 'Pengaturan Grup',
      desc: 'Pengaturan untuk ketua arisan',
      icon: <Settings size={20} color={colors.textBody} strokeWidth={1.75} />,
      onPress: () => router.push('/pengaturan'),
    },
  ];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile hero */}
        <View style={[styles.hero, shadows.card]}>
          <Avatar name={nama || 'Anggota'} size={64} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{nama || 'Anggota'}</Text>
            <Text style={styles.phoneMasked}>{maskPhone(phone)}</Text>
            <View style={styles.ketuaBadge}>
              <Text style={styles.ketuaText}>KETUA · Arisan RT 03</Text>
            </View>
          </View>
        </View>

        {/* Section: Flows */}
        <Text style={styles.sectionHead}>Alur Aplikasi</Text>
        <View style={[styles.card, shadows.card]}>
          {menus.map((m, i) => (
            <Pressable
              key={m.label}
              onPress={m.onPress}
              style={({ pressed }) => [
                styles.row,
                i !== menus.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.borderSoft,
                },
                pressed && { backgroundColor: '#FAFAF7' },
              ]}
            >
              <View style={styles.rowIcon}>{m.icon}</View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.rowLabel}>{m.label}</Text>
                {!!m.desc && <Text style={styles.rowDesc}>{m.desc}</Text>}
              </View>
              <ChevronRight size={18} color={colors.textSubtle} strokeWidth={1.75} />
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.8 }]}
        >
          <LogOut size={18} color={colors.danger} strokeWidth={1.75} />
          <Text style={styles.logoutLabel}>Keluar</Text>
        </Pressable>

        <Text style={styles.version}>Arisan App · v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: radii.cardLg,
    marginBottom: 18,
  },
  name: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
    letterSpacing: -0.18,
  },
  phoneMasked: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textSubtle,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  ketuaBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryTint,
  },
  ketuaText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.primaryDeep,
    letterSpacing: 0.4,
  },

  sectionHead: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.text,
  },
  rowDesc: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSubtle,
    marginTop: 2,
  },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
    height: 44,
    borderRadius: radii.card,
    borderWidth: 1.5,
    borderColor: colors.danger,
    backgroundColor: '#FFF',
  },
  logoutLabel: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.danger,
  },
  version: {
    textAlign: 'center',
    marginTop: 18,
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textSubtle,
  },
});
