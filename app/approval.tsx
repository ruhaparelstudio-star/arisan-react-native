import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowRight, Check, Clock, X } from 'lucide-react-native';
import { Avatar, Button, Header } from '@/components';
import { colors, fonts, radii, shadows } from '@/theme';

type Status = 'pending' | 'rejected' | 'approved-waiting';

const STATUS_BADGE: Record<
  Status,
  { label: string; bg: string; fg: string; dot: string }
> = {
  pending: {
    label: 'Request Tukar Giliran',
    bg: colors.primaryTint,
    fg: colors.primaryDeep,
    dot: colors.primary,
  },
  rejected: {
    label: 'Request Ditolak',
    bg: colors.dangerBg,
    fg: colors.danger,
    dot: colors.danger,
  },
  'approved-waiting': {
    label: 'Menunggu Persetujuan Ketua',
    bg: colors.warningBg,
    fg: colors.warningInk,
    dot: colors.warning,
  },
};

export default function ApprovalScreen() {
  const [status, setStatus] = useState<Status>('pending');
  const decided = status !== 'pending';
  const b = STATUS_BADGE[status];

  const borderColor =
    status === 'pending'
      ? '#C7C2EE'
      : status === 'rejected'
      ? colors.dangerBorder
      : colors.warningBorder;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Header title="Notifikasi" onBack={() => router.back()} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>BARU</Text>

        <View
          style={[
            styles.card,
            { borderColor },
            status === 'pending' ? shadows.purpleSoft : shadows.card,
          ]}
        >
          {/* Top badge */}
          <View style={[styles.topBadge, { backgroundColor: b.bg }]}>
            <View style={[styles.dot, { backgroundColor: b.dot }]} />
            <Text style={[styles.topBadgeText, { color: b.fg }]}>{b.label}</Text>
          </View>

          {/* Sender */}
          <View style={styles.sender}>
            <Avatar name="Rina Lestari" size={44} />
            <View style={{ flex: 1 }}>
              <Text style={styles.senderText}>
                <Text style={{ fontFamily: fonts.bold }}>Rina Lestari</Text> ingin
                bertukar giliran
              </Text>
              <Text style={styles.senderTime}>2 menit lalu</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Swap diagram */}
          <View style={styles.swapRow}>
            <SwapCol label="Sebelum">
              <SwapRowCell person="Rina" period={8} />
              <SwapRowCell person="Kamu" period={7} highlight />
            </SwapCol>
            <View style={styles.arrow}>
              <ArrowRight size={16} color={colors.primary} strokeWidth={2} />
            </View>
            <SwapCol label="Sesudah">
              <SwapRowCell person="Rina" period={7} accent />
              <SwapRowCell person="Kamu" period={8} accent highlight />
            </SwapCol>
          </View>

          <View style={styles.divider} />

          {/* Reason */}
          <View>
            <Text style={styles.reasonLabel}>Alasan dari Rina</Text>
            <View style={styles.quote}>
              <Text style={styles.quoteText}>
                "Ada keperluan mendadak di bulan Maret"
              </Text>
            </View>
          </View>

          {/* Warning */}
          <View style={styles.warning}>
            <Text style={{ fontSize: 13 }}>⚠️</Text>
            <Text style={styles.warningText}>
              Keputusan ini tidak bisa dibatalkan setelah disetujui ketua arisan
            </Text>
          </View>

          {!decided ? (
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <Button
                variant="secondary"
                style={{
                  flex: 0,
                  width: '45%',
                  borderColor: colors.danger,
                  borderWidth: 1.5,
                }}
                onPress={() => setStatus('rejected')}
                leading={
                  <X size={16} color={colors.danger} strokeWidth={2.2} />
                }
              >
                <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.danger }}>
                  Tolak
                </Text>
              </Button>
              <Button
                variant="primary"
                full
                style={{ flex: 1 }}
                onPress={() => setStatus('approved-waiting')}
                leading={<Check size={16} color="#FFF" strokeWidth={2.6} />}
              >
                Setujui
              </Button>
            </View>
          ) : (
            <View style={styles.statusBox}>
              <View
                style={[
                  styles.statusIcon,
                  {
                    backgroundColor:
                      status === 'rejected' ? colors.dangerBg : colors.warningBg,
                  },
                ]}
              >
                {status === 'rejected' ? (
                  <X size={18} color={colors.danger} strokeWidth={2.2} />
                ) : (
                  <Clock size={18} color={colors.warningInk} strokeWidth={2} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.statusTitle}>
                  {status === 'rejected'
                    ? 'Kamu menolak request ini'
                    : 'Kamu menyetujui · menunggu ketua'}
                </Text>
                <Text style={styles.statusSub}>
                  Rina akan menerima notifikasi
                </Text>
              </View>
              <Pressable
                onPress={() => setStatus('pending')}
                style={styles.resetBtn}
              >
                <Text style={styles.resetText}>Reset</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SwapCol({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.colLabel}>{label}</Text>
      <View style={{ gap: 6 }}>{children}</View>
    </View>
  );
}

function SwapRowCell({
  person,
  period,
  highlight,
  accent,
}: {
  person: string;
  period: number;
  highlight?: boolean;
  accent?: boolean;
}) {
  return (
    <View
      style={[
        styles.swapCell,
        {
          backgroundColor: accent ? '#EEEDFE' : '#FAFAF7',
          borderColor: accent ? '#C7C2EE' : colors.border,
        },
      ]}
    >
      <Text
        style={{
          fontFamily: highlight ? fonts.bold : fonts.semibold,
          fontSize: 12,
          color: colors.text,
        }}
      >
        {person}
      </Text>
      <Text
        style={{
          fontFamily: fonts.bold,
          fontSize: 12,
          color: accent ? colors.primary : colors.textMuted,
        }}
      >
        #{period}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  sectionLabel: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.textSubtle,
    letterSpacing: 0.5,
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  card: {
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderRadius: radii.cardXl,
    padding: 16,
  },
  topBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  topBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  sender: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  senderText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.text,
  },
  senderTime: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSubtle,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
  },

  swapRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  colLabel: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 6,
  },
  swapCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 10,
  },
  arrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 20,
  },

  reasonLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.text,
  },
  quote: {
    marginTop: 6,
    backgroundColor: '#FAFAF7',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  quoteText: {
    fontFamily: fonts.regular,
    fontStyle: 'italic',
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 19,
  },

  warning: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.dangerBg,
    borderColor: colors.dangerBorder,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  warningText: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.danger,
    lineHeight: 17,
  },

  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  statusIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.text,
  },
  statusSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSubtle,
    marginTop: 1,
  },
  resetBtn: {
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.textSubtle,
  },
});
