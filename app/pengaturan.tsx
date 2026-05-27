import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeftRight, Lock, Pencil, Plus } from 'lucide-react-native';
import { Button, Header, Toast } from '@/components';
import { colors, fonts, radii, shadows } from '@/theme';

type Member = {
  id: string;
  name: string;
  role?: string;
  period?: number;
  protected?: boolean;
};

const MEMBERS_INITIAL: Member[] = [
  { id: 'budi', name: 'Budi Santoso', role: 'Ketua — kamu', protected: true },
  { id: 'ani', name: 'Ani Rahayu', period: 2 },
  { id: 'siti', name: 'Siti Lestari', period: 3 },
  { id: 'joko', name: 'Joko Widodo', period: 4 },
];

export default function PengaturanScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const groupId = typeof params.id === 'string' ? params.id : null;
  const [groupName, setGroupName] = useState('Arisan RT 03');
  const [editingName, setEditingName] = useState(false);
  const [members, setMembers] = useState<Member[]>(MEMBERS_INITIAL);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [dissolveOpen, setDissolveOpen] = useState(false);
  const [dissolved, setDissolved] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const confirmDeleteMember = () => {
    if (!memberToDelete) return;
    setMembers((m) => m.filter((x) => x.id !== memberToDelete.id));
    setToast(`${memberToDelete.name} dikeluarkan dari grup`);
    setMemberToDelete(null);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Header
        title="Pengaturan Grup"
        onBack={() => router.back()}
        trailing={
          <View style={styles.ketuaBadge}>
            <Text style={styles.ketuaText}>Hanya Ketua</Text>
          </View>
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Grup */}
        <SectionHeader>Informasi Grup</SectionHeader>
        <View style={[styles.cardGroup, shadows.card]}>
          <SettingsRow
            label="Nama Grup"
            valueNode={
              editingName ? (
                <TextInput
                  autoFocus
                  value={groupName}
                  onChangeText={setGroupName}
                  onBlur={() => setEditingName(false)}
                  onSubmitEditing={() => setEditingName(false)}
                  style={styles.inlineInput}
                />
              ) : (
                <Text style={styles.rowValue}>{groupName}</Text>
              )
            }
            trailing={
              <Pressable onPress={() => setEditingName((v) => !v)} style={styles.editBtn}>
                <Pencil size={16} color={colors.primary} strokeWidth={1.75} />
              </Pressable>
            }
          />
          <SettingsRow label="Nominal Iuran" valueText="Rp 500.000 / bulan" locked />
          <SettingsRow label="Jumlah Periode" valueText="12 periode" locked />
          <SettingsRow label="Tanggal Mulai" valueText="1 Januari 2025" locked last />
        </View>

        {/* Manajemen Anggota */}
        <SectionHeader>Manajemen Anggota</SectionHeader>
        <Pressable
          style={styles.addBtn}
          onPress={() => {
            if (groupId) {
              router.push(`/grup/${groupId}/invite`);
            } else {
              setToast('Buka pengaturan dari grup terkait untuk bagikan invite');
            }
          }}
        >
          <Plus size={16} color={colors.primary} strokeWidth={2} />
          <Text style={styles.addBtnText}>Tambah Anggota via Link</Text>
        </Pressable>
        <View style={[styles.cardGroup, shadows.card]}>
          {members.map((m, i) => (
            <MemberRow
              key={m.id}
              m={m}
              last={i === members.length - 1}
              onDelete={() => setMemberToDelete(m)}
            />
          ))}
        </View>
        <Text style={styles.othersText}>+8 anggota lainnya</Text>

        {/* Urutan */}
        <SectionHeader>Urutan Giliran</SectionHeader>
        <Pressable style={styles.outlineBtn}>
          <ArrowLeftRight size={16} color={colors.primary} strokeWidth={1.75} />
          <Text style={styles.outlineBtnText}>Ubah Urutan Manual</Text>
        </Pressable>
        <Text style={styles.urutanNote}>
          Semua anggota akan mendapat notifikasi. Wajib isi alasan.
        </Text>

        {/* Zona Berbahaya */}
        <Text style={styles.dangerSection}>Zona Berbahaya</Text>
        <View style={styles.dangerCard}>
          <Text style={styles.dangerTitle}>Bubarkan Grup</Text>
          <Text style={styles.dangerDesc}>Semua data akan diarsipkan. Tidak bisa dibatalkan.</Text>
          <Pressable
            disabled={dissolved}
            onPress={() => setDissolveOpen(true)}
            style={[
              styles.dangerBtn,
              dissolved && {
                borderColor: colors.borderStrong,
              },
            ]}
          >
            <Text style={[styles.dangerBtnText, dissolved && { color: '#A8A8A2' }]}>
              {dissolved ? 'Grup Terbubarkan' : 'Bubarkan Grup Arisan'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Delete confirm */}
      <Modal
        transparent
        animationType="fade"
        visible={!!memberToDelete}
        onRequestClose={() => setMemberToDelete(null)}
      >
        {memberToDelete && (
          <ConfirmDialog
            icon="⚠️"
            iconBg={colors.warningBg}
            title={`Keluarkan ${memberToDelete.name}?`}
            subtitle="Anggota tidak akan bisa kembali tanpa diundang ulang. Riwayat pembayarannya tetap tersimpan."
            primaryLabel="Ya, Keluarkan"
            primaryColor={colors.danger}
            onClose={() => setMemberToDelete(null)}
            onPrimary={confirmDeleteMember}
          />
        )}
      </Modal>

      {/* Dissolve */}
      <Modal
        transparent
        animationType="fade"
        visible={dissolveOpen}
        onRequestClose={() => setDissolveOpen(false)}
      >
        <DissolveDialog
          onClose={() => setDissolveOpen(false)}
          onConfirm={() => {
            setDissolveOpen(false);
            setDissolved(true);
            setToast('Grup arisan dibubarkan dan diarsipkan');
          }}
        />
      </Modal>

      <Toast message={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionHead}>{children}</Text>;
}

function SettingsRow({
  label,
  valueText,
  valueNode,
  trailing,
  locked,
  last,
}: {
  label: string;
  valueText?: string;
  valueNode?: React.ReactNode;
  trailing?: React.ReactNode;
  locked?: boolean;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.settingsRow,
        !last && { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
      ]}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={{ flex: 1, alignItems: 'flex-end' }}>
        {valueNode ?? <Text style={styles.rowValue}>{valueText}</Text>}
      </View>
      {locked ? <Lock size={16} color={colors.textDisabled} strokeWidth={1.75} /> : trailing}
    </View>
  );
}

function MemberRow({ m, last, onDelete }: { m: Member; last: boolean; onDelete: () => void }) {
  return (
    <View
      style={[
        styles.memberRow,
        !last && { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
      ]}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.memberName}>{m.name}</Text>
        <Text style={styles.memberSub}>{m.role ? m.role : `Giliran #${m.period}`}</Text>
      </View>
      {m.protected ? (
        <View style={styles.notDeletablePill}>
          <Text style={styles.notDeletableText}>Tidak bisa dihapus</Text>
        </View>
      ) : (
        <Pressable onPress={onDelete} hitSlop={4}>
          <Text style={styles.deleteText}>Hapus</Text>
        </Pressable>
      )}
    </View>
  );
}

function ConfirmDialog({
  icon,
  iconBg,
  title,
  subtitle,
  primaryLabel,
  primaryColor,
  onClose,
  onPrimary,
}: {
  icon: string;
  iconBg: string;
  title: string;
  subtitle: string;
  primaryLabel: string;
  primaryColor: string;
  onClose: () => void;
  onPrimary: () => void;
}) {
  return (
    <Pressable style={styles.overlay} onPress={onClose}>
      <Pressable style={styles.dialog} onPress={(e) => e.stopPropagation()}>
        <View style={styles.dialogHead}>
          <View style={[styles.dialogIcon, { backgroundColor: iconBg }]}>
            <Text style={{ fontSize: 20 }}>{icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.dialogTitle}>{title}</Text>
            <Text style={styles.dialogSubtitle}>{subtitle}</Text>
          </View>
        </View>
        <View style={styles.dialogActions}>
          <Button variant="secondary" full style={{ flex: 1 }} onPress={onClose}>
            Batal
          </Button>
          <Pressable
            onPress={onPrimary}
            style={[styles.primaryActionBtn, { backgroundColor: primaryColor }]}
          >
            <Text style={styles.primaryActionText}>{primaryLabel}</Text>
          </Pressable>
        </View>
      </Pressable>
    </Pressable>
  );
}

function DissolveDialog({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  const [text, setText] = useState('');
  const ok = text.trim() === 'BUBARKAN';

  return (
    <Pressable style={styles.overlay} onPress={onClose}>
      <Pressable style={styles.dialog} onPress={(e) => e.stopPropagation()}>
        <View style={styles.dialogHead}>
          <View style={[styles.dialogIcon, { backgroundColor: colors.dangerBg }]}>
            <Text style={{ fontSize: 20 }}>⚠️</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.dialogTitle}>Bubarkan grup ini?</Text>
            <Text style={styles.dialogSubtitle}>
              Semua data akan diarsipkan dan anggota dikeluarkan. Tindakan ini tidak bisa
              dibatalkan.
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 16 }}>
          <Text style={styles.dissolveLabel}>
            Ketik <Text style={styles.dissolveLabelMono}>BUBARKAN</Text> untuk konfirmasi
          </Text>
          <TextInput
            autoFocus
            autoCapitalize="characters"
            value={text}
            onChangeText={setText}
            placeholder="BUBARKAN"
            placeholderTextColor="#A8A8A2"
            style={[styles.dissolveInput, ok && { borderColor: colors.danger }]}
          />
        </View>

        <View style={styles.dialogActions}>
          <Button variant="secondary" full style={{ flex: 1 }} onPress={onClose}>
            Batal
          </Button>
          <Pressable
            disabled={!ok}
            onPress={onConfirm}
            style={[
              styles.primaryActionBtn,
              {
                backgroundColor: ok ? colors.danger : '#E0DED6',
              },
            ]}
          >
            <Text style={[styles.primaryActionText, !ok && { color: '#A8A8A2' }]}>
              Bubarkan Permanen
            </Text>
          </Pressable>
        </View>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },

  ketuaBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.primaryTint,
    borderRadius: radii.pill,
  },
  ketuaText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.primaryDeep,
    letterSpacing: 0.2,
  },

  sectionHead: {
    marginTop: 18,
    marginBottom: 8,
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 4,
  },
  cardGroup: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  rowLabel: {
    width: '36%',
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textMuted,
  },
  rowValue: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.text,
    textAlign: 'right',
  },
  inlineInput: {
    minWidth: 140,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 6,
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.text,
    textAlign: 'right',
  },
  editBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: radii.card,
    marginBottom: 10,
  },
  addBtnText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.primary,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  memberName: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.text,
  },
  memberSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSubtle,
    marginTop: 1,
  },
  notDeletablePill: {
    backgroundColor: colors.surface,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  notDeletableText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.textSubtle,
  },
  deleteText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.danger,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  othersText: {
    marginTop: 8,
    paddingHorizontal: 4,
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textSubtle,
  },

  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radii.card,
  },
  outlineBtnText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.primary,
  },
  urutanNote: {
    marginTop: 8,
    paddingHorizontal: 4,
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.danger,
    lineHeight: 17,
  },

  dangerSection: {
    marginTop: 24,
    marginBottom: 8,
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.danger,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 4,
  },
  dangerCard: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: radii.card,
    padding: 16,
  },
  dangerTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
  },
  dangerDesc: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSubtle,
    marginTop: 4,
    lineHeight: 17,
  },
  dangerBtn: {
    alignSelf: 'flex-start',
    marginTop: 12,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerBtnText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.danger,
  },

  overlay: {
    flex: 1,
    backgroundColor: colors.modalOverlay,
    justifyContent: 'flex-end',
    padding: 12,
  },
  dialog: {
    backgroundColor: '#FFF',
    borderRadius: radii.cardXxl,
    padding: 18,
    marginBottom: 24,
  },
  dialogHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  dialogIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
  },
  dialogSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 18,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  primaryActionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#FFF',
  },

  dissolveLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.text,
    marginBottom: 6,
  },
  dissolveLabelMono: {
    fontFamily: 'Menlo',
    backgroundColor: colors.dangerBg,
    color: colors.danger,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  dissolveInput: {
    height: 44,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: 10,
    fontFamily: 'Menlo',
    fontSize: 14,
    color: colors.text,
    letterSpacing: 0.5,
    backgroundColor: '#FFF',
  },
});
