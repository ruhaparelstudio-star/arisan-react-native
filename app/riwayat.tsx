import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Clock } from 'lucide-react-native';
import { Header } from '@/components';
import { colors, fonts, radii, shadows } from '@/theme';
import { RIWAYAT, RiwayatItem } from '@/data/mock';

const FILTERS = [
  { id: 'all', label: 'Semua' },
  { id: 'pembayaran', label: 'Pembayaran' },
  { id: 'undian', label: 'Undian' },
  { id: 'tukar', label: 'Tukar Giliran' },
  { id: 'perubahan', label: 'Perubahan' },
] as const;

type FilterId = (typeof FILTERS)[number]['id'];

export default function RiwayatScreen() {
  const [filter, setFilter] = useState<FilterId>('all');
  const items = filter === 'all' ? RIWAYAT : RIWAYAT.filter((r) => r.cat === filter);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View>
        <Header title="Riwayat Aktivitas" onBack={() => router.back()} />
        <Text style={styles.subtitle}>
          Arisan RT 03 — Semua aktivitas tercatat & tidak bisa dihapus
        </Text>
      </View>

      {/* Filters */}
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <Pressable
                key={f.id}
                onPress={() => setFilter(f.id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.primary : colors.surface,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: active ? '#FFF' : colors.textBody,
                      fontFamily: active ? fonts.bold : fonts.semibold,
                    },
                  ]}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <Text style={styles.empty}>Tidak ada aktivitas pada filter ini</Text>
        ) : (
          <View style={{ position: 'relative', paddingLeft: 36 }}>
            <View style={styles.line} />
            {items.map((r, i) => (
              <TimelineItem key={r.id} r={r} last={i === items.length - 1} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TimelineItem({ r, last }: { r: RiwayatItem; last: boolean }) {
  return (
    <View style={{ position: 'relative', paddingBottom: last ? 0 : 14 }}>
      <View style={[styles.dot, { borderColor: r.dot }]}>
        <Text style={{ fontSize: 12 }}>{r.emoji}</Text>
      </View>
      <View style={[styles.card, shadows.card]}>
        <Text style={styles.title}>{r.title}</Text>
        <Text style={styles.desc}>{r.desc}</Text>
        <View style={styles.timeRow}>
          <Clock size={12} color={colors.textSubtle} strokeWidth={2} />
          <Text style={styles.timeText}>{r.time}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  subtitle: {
    backgroundColor: colors.card,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSubtle,
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  filterBar: {
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.pill,
  },
  chipText: {
    fontSize: 13,
  },

  empty: {
    marginTop: 40,
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSubtle,
  },

  line: {
    position: 'absolute',
    left: 11,
    top: 6,
    bottom: 12,
    width: 2,
    backgroundColor: colors.border,
    borderRadius: 1,
  },
  dot: {
    position: 'absolute',
    left: -36,
    top: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  card: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.text,
    lineHeight: 19,
  },
  desc: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 17,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  timeText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.textSubtle,
  },
});
