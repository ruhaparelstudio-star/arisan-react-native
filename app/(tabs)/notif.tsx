import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Check, ChevronRight } from 'lucide-react-native';
import { Toast } from '@/components';
import { colors, fonts, radii } from '@/theme';
import { SEED_NOTIFS, NotifItem } from '@/data/mock';

export default function NotifScreen() {
  const [items, setItems] = useState<NotifItem[]>(SEED_NOTIFS);
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [swapDecision, setSwapDecision] = useState<'accept' | 'reject' | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const unreadCount = items.filter((i) => !i.read).length;
  const visible = tab === 'unread' ? items.filter((i) => !i.read) : items;

  const markRead = (id: number) =>
    setItems((arr) => arr.map((it) => (it.id === id ? { ...it, read: true } : it)));
  const markAllRead = () => {
    if (unreadCount === 0) return;
    setItems((arr) => arr.map((it) => ({ ...it, read: true })));
    setToast('Semua notifikasi ditandai dibaca');
  };
  const decideSwap = (decision: 'accept' | 'reject') => {
    setSwapDecision(decision);
    markRead(2);
    setToast(decision === 'accept' ? 'Request disetujui · menunggu ketua' : 'Request ditolak');
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Notifikasi</Text>
        <Pressable onPress={markAllRead} disabled={unreadCount === 0} hitSlop={6}>
          <Text style={[styles.markAll, unreadCount === 0 && { color: colors.textDisabled }]}>
            Tandai semua dibaca
          </Text>
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TabBtn label="Semua" active={tab === 'all'} onPress={() => setTab('all')} />
        <TabBtn
          label="Belum Dibaca"
          count={unreadCount > 0 ? unreadCount : undefined}
          active={tab === 'unread'}
          onPress={() => setTab('unread')}
        />
      </View>

      {/* List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 12, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {visible.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyCircle}>
              <Check size={26} color={colors.success} strokeWidth={3} />
            </View>
            <Text style={styles.emptyTitle}>Inbox bersih</Text>
            <Text style={styles.emptyDesc}>Tidak ada notifikasi yang belum dibaca</Text>
          </View>
        ) : (
          <View style={{ gap: 6, paddingTop: 6 }}>
            {visible.map((n) => (
              <NotifCard
                key={n.id}
                n={n}
                onTap={() => markRead(n.id)}
                swapDecision={swapDecision}
                onSwapDecide={decideSwap}
                onCta={() => {
                  markRead(n.id);
                  if (n.kind === 'winner') router.push('/winner');
                }}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <Toast message={toast} onHide={() => setToast(null)} variant="dark" />
    </SafeAreaView>
  );
}

function TabBtn({
  label,
  active,
  count,
  onPress,
}: {
  label: string;
  active: boolean;
  count?: number;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.tabBtn}>
      <Text style={[styles.tabLabel, active && { color: colors.primary, fontFamily: fonts.bold }]}>
        {label}
      </Text>
      {typeof count === 'number' && (
        <View style={[styles.countPill, { backgroundColor: active ? colors.primary : '#E0DED6' }]}>
          <Text style={[styles.countPillText, { color: active ? '#FFF' : colors.textMuted }]}>
            {count}
          </Text>
        </View>
      )}
      <View style={[styles.tabUnderline, active && { backgroundColor: colors.primary }]} />
    </Pressable>
  );
}

function NotifCard({
  n,
  onTap,
  swapDecision,
  onSwapDecide,
  onCta,
}: {
  n: NotifItem;
  onTap: () => void;
  swapDecision: 'accept' | 'reject' | null;
  onSwapDecide: (d: 'accept' | 'reject') => void;
  onCta: () => void;
}) {
  const isSwap = n.kind === 'swap';

  return (
    <Pressable
      onPress={onTap}
      style={[
        styles.notifCard,
        n.read
          ? { backgroundColor: '#FFF', borderColor: colors.border }
          : { backgroundColor: '#EEEDFE', borderColor: '#DCD8F4' },
      ]}
    >
      {!n.read && <View style={styles.unreadDot} />}

      <View style={[styles.iconCircle, { backgroundColor: n.bg }]}>
        <Text style={{ fontSize: 20 }}>{n.icon}</Text>
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.notifTopRow}>
          <Text
            style={[styles.notifTitle, !n.read && { fontFamily: fonts.bold }]}
            numberOfLines={2}
          >
            {n.title}
          </Text>
          <Text style={styles.notifTime}>{n.time}</Text>
        </View>
        <Text style={[styles.notifBody, !n.read && { color: '#3A3A36' }]} numberOfLines={2}>
          {n.body}
        </Text>

        {n.cta && (
          <Pressable onPress={onCta} style={styles.ctaBtn}>
            <Text style={styles.ctaLabel}>{n.cta}</Text>
            <ChevronRight size={14} color="#FFF" strokeWidth={2.2} />
          </Pressable>
        )}

        {isSwap && (
          <View style={{ marginTop: 10 }}>
            {!swapDecision ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  onPress={() => onSwapDecide('reject')}
                  style={[styles.swapBtn, styles.swapBtnGhost]}
                >
                  <Text style={[styles.swapBtnLabel, { color: colors.danger }]}>Tolak</Text>
                </Pressable>
                <Pressable
                  onPress={() => onSwapDecide('accept')}
                  style={[styles.swapBtn, styles.swapBtnPrimary]}
                >
                  <Text style={[styles.swapBtnLabel, { color: '#FFF' }]}>Setujui</Text>
                </Pressable>
              </View>
            ) : (
              <View
                style={[
                  styles.statusPill,
                  swapDecision === 'accept'
                    ? { backgroundColor: colors.successBg }
                    : { backgroundColor: colors.dangerBg },
                ]}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    {
                      color: swapDecision === 'accept' ? colors.successInk : colors.danger,
                    },
                  ]}
                >
                  {swapDecision === 'accept' ? '✓ Kamu setujui' : '✕ Kamu tolak'}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  header: {
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 56,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.text,
    letterSpacing: -0.2,
  },
  markAll: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.primary,
  },

  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingTop: 4,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: -1,
  },
  tabLabel: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.textSubtle,
  },
  countPill: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countPillText: { fontFamily: fonts.bold, fontSize: 11 },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'transparent',
  },

  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: radii.card,
    borderWidth: 1,
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    left: -4,
    top: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  notifTitle: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.text,
    lineHeight: 19,
  },
  notifTime: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.textSubtle,
    paddingTop: 2,
  },
  notifBody: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 3,
    lineHeight: 19,
  },
  ctaBtn: {
    alignSelf: 'flex-start',
    marginTop: 10,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ctaLabel: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#FFF',
  },

  swapBtn: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapBtnGhost: {
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: colors.danger,
  },
  swapBtnPrimary: { backgroundColor: colors.primary },
  swapBtnLabel: { fontFamily: fonts.bold, fontSize: 12 },

  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  statusPillText: { fontFamily: fonts.bold, fontSize: 11 },

  empty: {
    marginTop: 60,
    alignItems: 'center',
    gap: 10,
  },
  emptyCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  emptyDesc: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSubtle,
  },
});
