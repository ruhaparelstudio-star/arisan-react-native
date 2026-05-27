import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, ChevronLeft, Settings } from 'lucide-react-native';
import { Avatar, Badge, Button, IconButton } from '@/components';
import { colors, fonts, money, radii, shadows } from '@/theme';
import { RT03_MEMBERS } from '@/data/mock';
import { UrutanTab } from '@/screens/UrutanTab';
import { ChatTab } from '@/screens/ChatTab';

type TabKey = 'pembayaran' | 'urutan' | 'chat';

export default function DetailScreen() {
  const params = useLocalSearchParams<{ id: string; tab?: TabKey }>();
  const initial = (params.tab as TabKey) ?? 'pembayaran';
  const [tab, setTab] = useState<TabKey>(initial);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton onPress={() => router.back()}>
          <ChevronLeft size={22} color={colors.text} strokeWidth={1.75} />
        </IconButton>
        <Text style={styles.title}>Arisan RT 03</Text>
        <IconButton onPress={() => router.push('/pengaturan')}>
          <Settings size={22} color={colors.textBody} strokeWidth={1.75} />
        </IconButton>
      </View>

      {/* Info bar (only on pembayaran) */}
      {tab === 'pembayaran' && (
        <View style={styles.infoBar}>
          <InfoCell label="Periode" value="3/12" />
          <View style={styles.infoDivider} />
          <InfoCell label="Anggota" value="12" />
          <View style={styles.infoDivider} />
          <InfoCell label="Iuran/bln" value="Rp 500K" />
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        <TabPill
          label="Pembayaran"
          active={tab === 'pembayaran'}
          onPress={() => setTab('pembayaran')}
        />
        <TabPill
          label="Urutan Giliran"
          active={tab === 'urutan'}
          onPress={() => setTab('urutan')}
        />
        <TabPill label="Chat" active={tab === 'chat'} onPress={() => setTab('chat')} />
      </View>

      {tab === 'pembayaran' && <PembayaranTab />}
      {tab === 'urutan' && <UrutanTab />}
      {tab === 'chat' && <ChatTab embedded />}
    </SafeAreaView>
  );
}

function PembayaranTab() {
  const collected = 5500000;
  const target = 6000000;
  const pct = Math.round((collected / target) * 100);
  const insets = useSafeAreaInsets();

  return (
    <>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress */}
        <View style={[styles.progressCard, shadows.card]}>
          <View style={styles.progressTop}>
            <Text style={styles.progressLabel}>Terkumpul</Text>
            <Text style={styles.progressPct}>{pct}%</Text>
          </View>
          <View style={styles.progressAmountRow}>
            <Text style={styles.progressAmount}>{money(collected)}</Text>
            <Text style={styles.progressTarget}>dari {money(target)}</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
        </View>

        {/* Members header */}
        <View style={styles.membersHead}>
          <Text style={styles.membersTitle}>Anggota ({RT03_MEMBERS.length})</Text>
          <Text style={styles.membersHint}>Periode ke-3</Text>
        </View>

        {/* Members list */}
        <View style={[styles.membersCard, shadows.card]}>
          {RT03_MEMBERS.map((m, i) => (
            <View
              key={m.name}
              style={[
                styles.memberRow,
                i !== RT03_MEMBERS.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.borderSoft,
                },
              ]}
            >
              <Avatar name={m.name} size={36} />
              <Text style={styles.memberName}>{m.name}</Text>
              <Badge kind={m.status} />
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Sticky bottom CTA */}
      <View style={[styles.stickyBottom, { paddingBottom: 16 + insets.bottom }]}>
        <Button full leading={<Check size={18} color="#FFF" strokeWidth={2.2} />}>
          Konfirmasi Pembayaran
        </Button>
      </View>
    </>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoCell}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function TabPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.tabBtn} hitSlop={4}>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
      <View style={[styles.tabUnderline, active && styles.tabUnderlineActive]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.text,
  },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoCell: { flex: 1, alignItems: 'center' },
  infoLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
    marginTop: 2,
  },
  infoDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingTop: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    marginBottom: -1,
  },
  tabLabel: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.textSubtle,
  },
  tabLabelActive: { color: colors.primary, fontFamily: fonts.bold },
  tabUnderline: {
    marginTop: 8,
    height: 2,
    backgroundColor: 'transparent',
  },
  tabUnderlineActive: { backgroundColor: colors.primary },

  progressCard: {
    backgroundColor: colors.card,
    borderRadius: radii.cardLg,
    padding: 14,
    marginBottom: 14,
  },
  progressTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  progressLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textSubtle,
  },
  progressPct: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.success,
  },
  progressAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 4,
  },
  progressAmount: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.text,
    letterSpacing: -0.2,
  },
  progressTarget: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSubtle,
  },
  progressBar: {
    marginTop: 12,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.successBg,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 4,
  },

  membersHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  membersTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
  },
  membersHint: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textSubtle,
  },
  membersCard: {
    backgroundColor: colors.card,
    borderRadius: radii.cardLg,
    overflow: 'hidden',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  memberName: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.text,
  },

  stickyBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: colors.page,
  },
});
