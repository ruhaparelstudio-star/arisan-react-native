import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ArrowLeftRight, Check } from 'lucide-react-native';
import { Toast } from '@/components';
import { avatarColor, colors, fonts, radii, shadows } from '@/theme';
import { ELIGIBLE_FOR_UNDIAN, URUTAN, UrutanItem } from '@/data/mock';
import { UndianModal } from './UndianModal';

type WinnerMap = Record<number, string>;

export function UrutanTab() {
  const [modalOpen, setModalOpen] = useState(false);
  const [winners, setWinners] = useState<WinnerMap>({});
  const [toast, setToast] = useState<string | null>(null);

  const onConfirm = (winnerName: string) => {
    setWinners((w) => ({ ...w, 4: winnerName }));
    setModalOpen(false);
    setToast(`Undian berhasil! Pemenang Periode 4: ${winnerName}`);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Mode badge */}
        <View style={styles.modeRow}>
          <View style={styles.modePill}>
            <ArrowLeftRight size={12} color={colors.textMuted} strokeWidth={2} />
            <Text style={styles.modePillText}>
              Mode Hybrid — dikocok tiap periode
            </Text>
          </View>
        </View>

        {/* Active winner card */}
        <View style={styles.activeCard}>
          <View style={styles.activeHead}>
            <Text style={{ fontSize: 22 }}>🏆</Text>
            <Text style={styles.activeHeadLabel}>
              Periode 3 — Sedang Berjalan
            </Text>
          </View>
          <Text style={styles.activeName}>Siti Lestari</Text>
          <Text style={styles.activePelaksanaan}>
            Pelaksanaan: Sabtu, 15 Juni 2025
          </Text>
          <View style={styles.confirmBadge}>
            <Check size={12} color={colors.successInk} strokeWidth={2.5} />
            <Text style={styles.confirmBadgeText}>Tanggal Terkonfirmasi</Text>
          </View>
        </View>

        {/* Section */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Urutan Lengkap</Text>
          <Text style={styles.sectionHint}>8 periode</Text>
        </View>

        {/* Ordered list */}
        <View style={[styles.list, shadows.card]}>
          {URUTAN.map((u, i) => (
            <UrutanRow
              key={u.no}
              u={u}
              winners={winners}
              last={i === URUTAN.length - 1}
              onRoll={u.periode === 4 ? () => setModalOpen(true) : undefined}
            />
          ))}
        </View>

        {/* Note */}
        <Text style={styles.note}>
          Ketuk icon ⇄ untuk request tukar giliran. Maks 1× per orang.
        </Text>

        {/* Trigger Ketua */}
        <Pressable
          onPress={() => setModalOpen(true)}
          style={({ pressed }) => [
            styles.triggerBtn,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={{ fontSize: 16 }}>🎲</Text>
          <Text style={styles.triggerLabel}>Mulai Undian Periode 4 (Ketua)</Text>
        </Pressable>
      </ScrollView>

      <Toast message={toast} variant="success" onHide={() => setToast(null)} />

      <Modal
        visible={modalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setModalOpen(false)}
      >
        <UndianModal
          onClose={() => setModalOpen(false)}
          onConfirm={onConfirm}
          eligible={ELIGIBLE_FOR_UNDIAN}
        />
      </Modal>
    </View>
  );
}

function UrutanRow({
  u,
  winners,
  last,
  onRoll,
}: {
  u: UrutanItem;
  winners: WinnerMap;
  last: boolean;
  onRoll?: () => void;
}) {
  const isActive = u.status === 'active';
  const isDone = u.status === 'done';
  const isUpcoming = u.status === 'upcoming';
  const assigned = winners[u.periode];

  let bg: string = '#F0F0EE';
  let fg: string = colors.textMuted;
  let label: string = 'Upcoming';
  if (isDone) {
    bg = '#EAEAE6';
    label = 'Selesai ✓';
  }
  if (isActive) {
    bg = colors.primaryTint;
    fg = colors.primaryDeep;
    label = 'Berjalan';
  }
  if (assigned) {
    bg = colors.successBg;
    fg = colors.successInk;
    label = 'Terpilih ✓';
  }

  const c = avatarColor(u.name);

  return (
    <View
      style={[
        styles.row,
        isActive && { backgroundColor: '#F8F7FE' },
        !last && {
          borderBottomWidth: 1,
          borderBottomColor: colors.borderSoft,
        },
      ]}
    >
      <View
        style={[
          styles.no,
          { backgroundColor: isActive ? colors.primary : '#F4F4F0' },
        ]}
      >
        <Text
          style={[
            styles.noText,
            { color: isActive ? '#FFF' : colors.textMuted },
          ]}
        >
          {u.no}
        </Text>
      </View>
      <View style={[styles.smallAvatar, { backgroundColor: c.bg }]}>
        <Text style={[styles.smallAvatarText, { color: c.ink }]}>
          {u.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
        </Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={[
            styles.rowName,
            isActive && { fontFamily: fonts.bold },
          ]}
          numberOfLines={1}
        >
          {assigned ? `${u.name} → ${assigned}` : u.name}
        </Text>
        <Text style={styles.rowSub}>Periode {u.periode}</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: bg }]}>
        <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
      </View>
      {isUpcoming && (
        <Pressable
          onPress={onRoll}
          style={[
            styles.swapBtn,
            {
              backgroundColor: onRoll ? colors.primaryTint : '#F4F4F0',
            },
          ]}
        >
          <ArrowLeftRight
            size={16}
            color={onRoll ? colors.primary : colors.textMuted}
            strokeWidth={1.75}
          />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  modeRow: { marginBottom: 12 },
  modePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: '#EDEBE3',
  },
  modePillText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 0.2,
  },

  activeCard: {
    backgroundColor: '#EEEDFE',
    borderWidth: 1.5,
    borderColor: '#C7C2EE',
    borderRadius: radii.cardXl,
    padding: 16,
  },
  activeHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activeHeadLabel: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.primaryDeep,
  },
  activeName: {
    fontFamily: fonts.extrabold,
    fontSize: 22,
    color: colors.text,
    letterSpacing: -0.2,
    marginTop: 8,
  },
  activePelaksanaan: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  confirmBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.successBg,
    borderRadius: radii.pill,
    marginTop: 12,
  },
  confirmBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.successInk,
    letterSpacing: 0.2,
  },

  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 18,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
  },
  sectionHint: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.textSubtle,
  },

  list: {
    backgroundColor: colors.card,
    borderRadius: radii.cardLg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  no: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noText: { fontFamily: fonts.bold, fontSize: 12 },
  smallAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallAvatarText: { fontFamily: fonts.bold, fontSize: 11 },
  rowName: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.text,
  },
  rowSub: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textSubtle,
    marginTop: 1,
  },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  badgeText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.2,
  },
  swapBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  note: {
    marginTop: 12,
    paddingHorizontal: 4,
    fontFamily: fonts.regular,
    fontSize: 12,
    fontStyle: 'italic',
    color: colors.textSubtle,
    lineHeight: 18,
  },
  triggerBtn: {
    marginTop: 16,
    height: 48,
    borderRadius: radii.card,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  triggerLabel: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.primary,
  },
});
