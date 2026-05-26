import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Bell, Plus, Star } from 'lucide-react-native';
import { Avatar, Badge, IconButton } from '@/components';
import {
  avatarColor,
  colors,
  fonts,
  initials,
  money,
  radii,
  shadows,
} from '@/theme';
import { GROUPS, Group } from '@/data/mock';

export default function DashboardScreen() {
  const total = GROUPS.reduce((s, g) => s + g.iuran, 0);
  const insets = useSafeAreaInsets();
  const tabBarHeight = 56 + Math.max(insets.bottom, 8);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Avatar name="Budi Santoso" size={44} />
          <View>
            <Text style={styles.greeting}>Selamat pagi</Text>
            <Text style={styles.hello}>Hai, Budi! 👋</Text>
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
            <Text style={styles.summaryLabel}>3 Arisan Aktif</Text>
          </View>
          <View style={{ marginTop: 12 }}>
            <Text style={styles.summaryHint}>Iuran bulan ini</Text>
            <Text style={styles.summaryAmount}>{money(total)}</Text>
          </View>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryStatLabel}>Lunas</Text>
              <Text style={styles.summaryStatValue}>2 grup</Text>
            </View>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryStatLabel}>Belum bayar</Text>
              <Text style={styles.summaryStatValue}>1 grup</Text>
            </View>
          </View>
        </View>

        {/* Section header */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Grup arisan saya</Text>
          <Text style={styles.sectionLink}>Lihat semua</Text>
        </View>

        {/* Groups */}
        <View style={{ gap: 10 }}>
          {GROUPS.map((g) => (
            <GroupCard
              key={g.id}
              group={g}
              onPress={() => router.push(`/group/${g.id}`)}
            />
          ))}
        </View>
      </ScrollView>

      {/* FAB */}
      <Pressable
        onPress={() => {}}
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

function GroupCard({ group, onPress }: { group: Group; onPress: () => void }) {
  const c = avatarColor(group.name);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.groupCard,
        shadows.card,
        pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
      ]}
    >
      <View
        style={[styles.groupIcon, { backgroundColor: c.bg }]}
      >
        <Text style={[styles.groupIconText, { color: c.ink }]}>
          {initials(group.name.replace(/^Arisan\s+/, ''))}
        </Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.groupNameRow}>
          <Text style={styles.groupName}>{group.name}</Text>
          {group.myTurn && (
            <View style={styles.starWrap}>
              <Star size={11} color={colors.warning} fill={colors.warning} />
            </View>
          )}
        </View>
        <Text style={styles.groupMeta}>
          Periode {group.period} · {money(group.iuran)}
        </Text>
      </View>
      <Badge kind={group.status} />
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
  summaryGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  summaryStat: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  summaryStatLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
  },
  summaryStatValue: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: '#FFF',
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
