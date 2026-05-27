import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ArrowLeftRight, Check } from 'lucide-react-native';
import { collection, doc, onSnapshot } from '@react-native-firebase/firestore';
import { Toast } from '@/components';
import { avatarColor, colors, fonts, radii, shadows } from '@/theme';
import { callable, firestore } from '@/services/firebase';
import { useAuthStore } from '@/stores/auth';
import type { Group, Member, Winner } from '@arisan/shared/types';
import { UndianModal } from './UndianModal';

type RowStatus = 'done' | 'active' | 'pending' | 'upcoming';

type PeriodeRow = {
  periode: number;
  periodeId: string; // "01", "02", ...
  winner?: Winner;
  status: RowStatus;
};

type Props = {
  groupId: string;
};

function padPeriode(n: number) {
  return String(n).padStart(2, '0');
}

export function UrutanTab({ groupId }: Props) {
  const user = useAuthStore((s) => s.user);
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [winners, setWinners] = useState<Map<string, Winner>>(new Map());
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalPeriode, setModalPeriode] = useState<{ id: string; nomor: number } | null>(null);
  const [toast, setToast] = useState<{ msg: string; variant: 'success' | 'dark' } | null>(null);
  const [presetLoading, setPresetLoading] = useState(false);

  useEffect(() => {
    const db = firestore();
    const groupRef = doc(collection(db, 'groups'), groupId);

    const unsubGroup = onSnapshot(groupRef, (snap) => {
      if (!snap.exists) {
        setGroup(null);
      } else {
        setGroup({ id: snap.id, ...(snap.data() as Omit<Group, 'id'>) });
      }
      setLoading(false);
    });

    const unsubMembers = onSnapshot(collection(groupRef, 'members'), (snap) => {
      setMembers(snap.docs.map((d) => ({ userId: d.id, ...(d.data() as Omit<Member, 'userId'>) })));
    });

    const unsubWinners = onSnapshot(collection(groupRef, 'winners'), (snap) => {
      const map = new Map<string, Winner>();
      snap.docs.forEach((d) => {
        map.set(d.id, d.data() as Winner);
      });
      setWinners(map);
    });

    return () => {
      unsubGroup();
      unsubMembers();
      unsubWinners();
    };
  }, [groupId]);

  const me = members.find((m) => m.userId === user?.uid);
  const isKetua = me?.role === 'ketua';

  const rows = useMemo<PeriodeRow[]>(() => {
    if (!group) return [];
    const out: PeriodeRow[] = [];
    for (let i = 1; i <= group.jumlahPeriode; i++) {
      const periodeId = padPeriode(i);
      const winner = winners.get(periodeId);
      let status: RowStatus;
      if (i < group.periodeAktif) {
        status = 'done';
      } else if (i === group.periodeAktif) {
        status = winner ? 'active' : 'pending';
      } else {
        // future periode
        status = winner ? 'upcoming' : 'pending';
      }
      out.push({ periode: i, periodeId, winner, status });
    }
    return out;
  }, [group, winners]);

  const eligibleMembers = useMemo(
    () => members.filter((m) => !m.sudahMenang).map((m) => ({ userId: m.userId, nama: m.nama })),
    [members],
  );

  const activeRow = rows.find((r) => r.status === 'active');
  const pendingForKetua = rows.find(
    (r) => r.periode === group?.periodeAktif && r.status === 'pending',
  );

  const canPresetMode1 =
    isKetua &&
    group?.undianMode === 'mode1' &&
    winners.size === 0 &&
    members.length === group?.jumlahPeriode;

  const openUndianFor = (periodeNomor: number) => {
    setModalPeriode({ id: padPeriode(periodeNomor), nomor: periodeNomor });
    setModalOpen(true);
  };

  const handlePresetMode1 = async () => {
    setPresetLoading(true);
    try {
      const fn = callable<{ groupId: string }, { ok: boolean; jumlah: number }>(
        'presetUrutanMode1',
      );
      const res = await fn({ groupId });
      setToast({
        msg: `Urutan ${res.data.jumlah} periode berhasil di-generate`,
        variant: 'success',
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal generate urutan';
      setToast({ msg, variant: 'dark' });
    } finally {
      setPresetLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!group) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Grup tidak ditemukan</Text>
      </View>
    );
  }

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
              {group.undianMode === 'mode1'
                ? 'Mode Pre-determined — urutan ditentukan di awal'
                : 'Mode Hybrid — dikocok tiap periode'}
            </Text>
          </View>
        </View>

        {/* Active winner card */}
        {activeRow?.winner ? (
          <View style={styles.activeCard}>
            <View style={styles.activeHead}>
              <Text style={{ fontSize: 22 }}>🏆</Text>
              <Text style={styles.activeHeadLabel}>
                Periode {activeRow.periode} — Sedang Berjalan
              </Text>
            </View>
            <Text style={styles.activeName}>{activeRow.winner.nama}</Text>
            <View style={styles.confirmBadge}>
              <Check size={12} color={colors.successInk} strokeWidth={2.5} />
              <Text style={styles.confirmBadgeText}>Pemenang Terkonfirmasi</Text>
            </View>
          </View>
        ) : (
          <View style={styles.emptyActiveCard}>
            <Text style={styles.emptyActiveLabel}>
              Periode {group.periodeAktif} — Belum ada pemenang
            </Text>
          </View>
        )}

        {/* Section */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Urutan Lengkap</Text>
          <Text style={styles.sectionHint}>{group.jumlahPeriode} periode</Text>
        </View>

        {/* Ordered list */}
        <View style={[styles.list, shadows.card]}>
          {rows.map((r, i) => (
            <UrutanRow key={r.periodeId} row={r} last={i === rows.length - 1} />
          ))}
        </View>

        {/* Mode 1: preset button */}
        {canPresetMode1 && (
          <Pressable
            onPress={handlePresetMode1}
            disabled={presetLoading}
            style={({ pressed }) => [
              styles.triggerBtn,
              pressed && { opacity: 0.85 },
              presetLoading && { opacity: 0.6 },
            ]}
          >
            <Text style={{ fontSize: 16 }}>✨</Text>
            <Text style={styles.triggerLabel}>
              {presetLoading ? 'Memproses...' : 'Generate Urutan (sekali jalan)'}
            </Text>
          </Pressable>
        )}

        {/* Mode 3: trigger undian periode aktif */}
        {isKetua && group.undianMode === 'mode3' && pendingForKetua && (
          <Pressable
            onPress={() => openUndianFor(pendingForKetua.periode)}
            style={({ pressed }) => [styles.triggerBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={{ fontSize: 16 }}>🎲</Text>
            <Text style={styles.triggerLabel}>Mulai Undian Periode {pendingForKetua.periode}</Text>
          </Pressable>
        )}
      </ScrollView>

      <Toast
        message={toast?.msg ?? null}
        variant={toast?.variant ?? 'success'}
        onHide={() => setToast(null)}
      />

      <Modal
        visible={modalOpen && modalPeriode !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setModalOpen(false)}
      >
        {modalPeriode && (
          <UndianModal
            groupId={groupId}
            periodeId={modalPeriode.id}
            periodeNomor={modalPeriode.nomor}
            eligibleMembers={eligibleMembers}
            groupMode={group.undianMode}
            onClose={() => setModalOpen(false)}
            onSuccess={(nama) =>
              setToast({
                msg: `Undian berhasil! Pemenang Periode ${modalPeriode.nomor}: ${nama}`,
                variant: 'success',
              })
            }
            onError={(msg) => setToast({ msg, variant: 'dark' })}
          />
        )}
      </Modal>
    </View>
  );
}

function UrutanRow({ row, last }: { row: PeriodeRow; last: boolean }) {
  const isActive = row.status === 'active';
  const isDone = row.status === 'done';
  const winner = row.winner;
  const displayNama = winner?.nama ?? 'Belum ditentukan';

  let bg: string = '#F0F0EE';
  let fg: string = colors.textMuted;
  let label: string = 'Belum';

  if (row.status === 'pending') {
    bg = '#F0F0EE';
    fg = colors.textMuted;
    label = 'Menunggu';
  }
  if (row.status === 'upcoming') {
    bg = colors.successBg;
    fg = colors.successInk;
    label = 'Terpilih ✓';
  }
  if (isDone) {
    bg = '#EAEAE6';
    fg = colors.textMuted;
    label = 'Selesai ✓';
  }
  if (isActive) {
    bg = colors.primaryTint;
    fg = colors.primaryDeep;
    label = 'Berjalan';
  }

  const c = avatarColor(displayNama);
  const initialsText = winner
    ? displayNama
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
    : '?';

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
      <View style={[styles.no, { backgroundColor: isActive ? colors.primary : '#F4F4F0' }]}>
        <Text style={[styles.noText, { color: isActive ? '#FFF' : colors.textMuted }]}>
          {row.periode}
        </Text>
      </View>
      <View style={[styles.smallAvatar, { backgroundColor: c.bg }]}>
        <Text style={[styles.smallAvatarText, { color: c.ink }]}>{initialsText}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.rowName, isActive && { fontFamily: fonts.bold }]} numberOfLines={1}>
          {displayNama}
        </Text>
        <Text style={styles.rowSub}>Periode {row.periode}</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: bg }]}>
        <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textMuted,
  },

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
  emptyActiveCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.cardXl,
    padding: 16,
  },
  emptyActiveLabel: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.textMuted,
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
