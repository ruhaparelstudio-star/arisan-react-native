import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowUpRight, Check, Lock } from 'lucide-react-native';
import { Button, Header } from '@/components';
import { avatarColor, colors, fonts, initials, radii } from '@/theme';
import { SWAP_CANDIDATES } from '@/data/mock';

const MY_PERIOD = 7;

export default function TukarScreen() {
  const [picked, setPicked] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [sent, setSent] = useState(false);
  const insets = useSafeAreaInsets();

  const canSubmit = picked != null && !sent;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Header title="Tukar Giliran" onBack={() => router.back()} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 110 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Text style={styles.infoIconText}>#{MY_PERIOD}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoLabel}>Giliran kamu saat ini</Text>
            <Text style={styles.infoValue}>Periode {MY_PERIOD}</Text>
          </View>
          <View style={styles.sisaBadge}>
            <Text style={styles.sisaText}>1× sisa</Text>
          </View>
        </View>

        {/* Warning */}
        <View style={styles.warning}>
          <Text style={{ fontSize: 14 }}>⚠️</Text>
          <Text style={styles.warningText}>
            Kamu hanya bisa tukar giliran 1 kali selama arisan berlangsung
          </Text>
        </View>

        {/* Section */}
        <View style={{ marginTop: 20, paddingHorizontal: 2 }}>
          <Text style={styles.sectionTitle}>Pilih anggota untuk ditukar</Text>
          <Text style={styles.sectionSub}>
            Hanya anggota yang belum menang dan giliran setelah kamu
          </Text>
        </View>

        {/* Candidates */}
        <View style={{ marginTop: 10, gap: 8 }}>
          {SWAP_CANDIDATES.map((c) => (
            <CandidateCard
              key={c.id}
              c={c}
              selected={picked === c.id}
              onPress={c.eligible && !sent ? () => setPicked(c.id) : undefined}
            />
          ))}
        </View>

        {/* Reason */}
        <View style={{ marginTop: 20 }}>
          <View style={styles.reasonLabelRow}>
            <Text style={styles.reasonLabel}>Alasan tukar</Text>
            <Text style={styles.reasonOpt}>(opsional)</Text>
          </View>
          <TextInput
            value={reason}
            onChangeText={setReason}
            editable={!sent}
            multiline
            numberOfLines={3}
            placeholder="Contoh: ada keperluan mendadak di bulan itu..."
            placeholderTextColor={colors.textSubtle}
            style={[styles.textarea, sent && { backgroundColor: colors.surface }]}
          />
        </View>

        <Text style={styles.note}>
          Request akan dikirim ke anggota yang dipilih untuk disetujui, kemudian menunggu
          persetujuan ketua.
        </Text>

        {sent && (
          <View style={styles.sentBanner}>
            <Check size={16} color={colors.successInk} strokeWidth={2.5} />
            <Text style={styles.sentText}>Request terkirim · menunggu persetujuan</Text>
          </View>
        )}
      </ScrollView>

      {/* Sticky bottom */}
      <View style={[styles.stickyBottom, { paddingBottom: 16 + insets.bottom }]}>
        <Button
          full
          disabled={!canSubmit}
          onPress={() => canSubmit && setSent(true)}
          trailing={!sent ? <ArrowUpRight size={16} color="#FFF" strokeWidth={2.2} /> : undefined}
        >
          {sent ? 'Request Sudah Terkirim' : 'Kirim Request Tukar'}
        </Button>
      </View>
    </SafeAreaView>
  );
}

function CandidateCard({
  c,
  selected,
  onPress,
}: {
  c: (typeof SWAP_CANDIDATES)[number];
  selected: boolean;
  onPress?: () => void;
}) {
  const disabled = !c.eligible;
  const color = avatarColor(c.name);
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.candCard,
        {
          backgroundColor: disabled ? colors.surface : selected ? '#EEEDFE' : '#FFF',
          borderColor: selected ? colors.primary : colors.border,
          opacity: disabled ? 0.75 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.candAvatar,
          { backgroundColor: disabled ? colors.borderStrongerNeutral : color.bg },
        ]}
      >
        {disabled ? (
          <Lock size={16} color={colors.textSubtle} strokeWidth={1.75} />
        ) : (
          <Text style={[styles.candAvatarText, { color: color.ink }]}>{initials(c.name)}</Text>
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.candName, disabled && { color: colors.textMuted }]}>{c.name}</Text>
        <Text style={[styles.candSub, disabled && { color: colors.textSubtle }]}>
          {disabled ? c.reason : `Giliran #${c.period} → akan pindah ke giliran #${MY_PERIOD}`}
          {selected && !disabled ? ' (milik kamu)' : ''}
        </Text>
      </View>
      {!disabled && (
        <View
          style={[styles.radio, { borderColor: selected ? colors.primary : colors.borderStrong }]}
        >
          {selected && <View style={styles.radioInner} />}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },

  infoCard: {
    backgroundColor: '#F1EFE8',
    borderRadius: radii.cardLg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIconText: {
    fontFamily: fonts.extrabold,
    fontSize: 15,
    color: colors.primary,
  },
  infoLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.textMuted,
  },
  infoValue: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
    marginTop: 1,
  },
  sisaBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  sisaText: {
    color: '#FFF',
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.2,
  },

  warning: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.warningBg,
    borderColor: colors.warningBorder,
    borderWidth: 1,
    borderRadius: radii.card,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  warningText: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.warningInk,
    lineHeight: 17,
  },

  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
  },
  sectionSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSubtle,
    marginTop: 2,
  },

  candCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderWidth: 1.5,
    borderRadius: radii.card,
  },
  candAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  candAvatarText: { fontFamily: fonts.bold, fontSize: 12 },
  candName: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.text,
  },
  candSub: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 17,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },

  reasonLabelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 6,
  },
  reasonLabel: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.text,
  },
  reasonOpt: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textSubtle,
  },
  textarea: {
    minHeight: 80,
    padding: 12,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: 10,
    backgroundColor: '#FFF',
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.text,
    textAlignVertical: 'top',
  },
  note: {
    marginTop: 12,
    paddingHorizontal: 2,
    fontFamily: fonts.regular,
    fontStyle: 'italic',
    fontSize: 12,
    color: colors.textSubtle,
    lineHeight: 18,
  },
  sentBanner: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.successBg,
    borderColor: colors.successBorder,
    borderWidth: 1,
    borderRadius: radii.card,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  sentText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.successInk,
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
