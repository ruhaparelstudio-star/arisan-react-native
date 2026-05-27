import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Bell, Plus, Star } from 'lucide-react-native';
import { Avatar, Badge, IconButton } from '@/components';
import { avatarColor, colors, fonts, initials, money, radii, shadows } from '@/theme';
import { useAuthStore } from '@/stores/auth';
import { useGroupsStore, type GroupWithId } from '@/stores/groups';

export default function DashboardScreen() {
  const user = useAuthStore((s) => s.user);
  const groups = useGroupsStore((s) => s.groups);
  const loading = useGroupsStore((s) => s.loading);

  const total = groups.reduce((s, g) => s + g.nominal, 0);
  useSafeAreaInsets();

  const greetingName = user?.nama?.split(' ')[0] ?? '';

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Avatar name={user?.nama ?? 'A'} size={44} />
          <View>
            <Text style={styles.greeting}>Selamat datang</Text>
            <Text style={styles.hello}>Hai, {greetingName || 'Anggota'}! 👋</Text>
          </View>
        </View>
        <IconButton
          bordered
          bg={colors.card}
          onPress={() => router.push('/(tabs)/notif')}
          badge={<View style={styles.bellDot} />}
        >
          <Bell size={20} color={colors.textBody} strokeWidth={1.75} />
        </IconButton>
      </View>

      {/* Scroll area */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary card */}
        <View style={styles.summary}>
          <View style={styles.summaryRing} pointerEvents="none" />
          <View style={styles.summaryHeader}>
            <View style={styles.smallDot} />
            <Text style={styles.summaryLabel}>{groups.length} Arisan Aktif</Text>
          </View>
          <View style={{ marginTop: 12 }}>
            <Text style={styles.summaryHint}>Total iuran per periode</Text>
            <Text style={styles.summaryAmount}>{money(total)}</Text>
          </View>
        </View>

        {/* Section header */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Grup arisan saya</Text>
          <Pressable onPress={() => router.push('/grup/join')} hitSlop={8}>
            <Text style={styles.sectionLink}>Gabung dengan kode</Text>
          </Pressable>
        </View>

        {/* Groups */}
        {loading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : groups.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Belum ada grup</Text>
            <Text style={styles.emptyDesc}>
              Tap + untuk buat grup pertama, atau gabung lewat kode dari ketua.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {groups.map((g) => (
              <GroupCard key={g.id} group={g} onPress={() => router.push(`/group/${g.id}`)} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <Pressable
        onPress={() => router.push('/grup/baru')}
        accessibilityLabel="Buat grup baru"
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.fab,
          { bottom: 16 },
          shadows.purple,
          pressed && { transform: [{ scale: 0.96 }] },
        ]}
      >
        <Plus size={26} color="#FFF" strokeWidth={2.2} />
      </Pressable>
    </SafeAreaView>
  );
}

function GroupCard({ group, onPress }: { group: GroupWithId; onPress: () => void }) {
  const c = avatarColor(group.nama);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.groupCard,
        shadows.card,
        pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
      ]}
    >
      <View style={[styles.groupIcon, { backgroundColor: c.bg }]}>
        <Text style={[styles.groupIconText, { color: c.ink }]}>
          {initials(group.nama.replace(/^Arisan\s+/, ''))}
        </Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.groupNameRow}>
          <Text style={styles.groupName} numberOfLines={1}>
            {group.nama}
          </Text>
          {/* myTurn akan derive dari member.giliran di phase 4-5. Sementara false. */}
          {false && (
            <View style={styles.starWrap}>
              <Star size={11} color={colors.warning} fill={colors.warning} />
            </View>
          )}
        </View>
        <Text style={styles.groupMeta}>
          Periode {group.periodeAktif}/{group.jumlahPeriode} · {money(group.nominal)}
        </Text>
      </View>
      {/* status pembayaran user di periode aktif akan derive di phase 4. */}
      <Badge kind="Belum" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  greeting: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textSubtle,
  },
  hello: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
    letterSpacing: -0.18,
  },
  bellDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: '#FFF',
  },

  summary: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    padding: 18,
    overflow: 'hidden',
    ...shadows.purple,
  },
  summaryRing: {
    position: 'absolute',
    right: -40,
    top: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 24,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  smallDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF',
  },
  summaryLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
  },
  summaryHint: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
  },
  summaryAmount: {
    fontFamily: fonts.bold,
    fontSize: 28,
    color: '#FFF',
    letterSpacing: -0.28,
    marginTop: 2,
  },

  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 22,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.text,
  },
  sectionLink: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.primary,
  },

  loaderBox: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    backgroundColor: colors.card,
    borderRadius: radii.cardLg,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
  },
  emptyDesc: {
    marginTop: 6,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSubtle,
    textAlign: 'center',
    lineHeight: 18,
  },

  groupCard: {
    backgroundColor: colors.card,
    borderRadius: radii.cardLg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  groupIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupIconText: {
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  groupNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  groupName: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.text,
    flexShrink: 1,
  },
  starWrap: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.warningBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupMeta: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSubtle,
    marginTop: 3,
  },

  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
