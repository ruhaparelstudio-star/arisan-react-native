import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChevronDown, X } from 'lucide-react-native';
import { Button } from '@/components';
import { colors, fonts, radii, shadows } from '@/theme';
import { callable } from '@/services/firebase';

type Choice = 'random' | 'manual' | 'offline';
type Option = { id: Choice; icon: string; title: string; desc: string };

const OPTION_RANDOM: Option = {
  id: 'random',
  icon: '🎲',
  title: 'Random otomatis',
  desc: 'Sistem memilih secara acak dari anggota belum menang',
};
const OPTION_MANUAL: Option = {
  id: 'manual',
  icon: '✋',
  title: 'Assign manual',
  desc: 'Ketua langsung menentukan pemenang (alasan wajib)',
};
const OPTION_OFFLINE: Option = {
  id: 'offline',
  icon: '📝',
  title: 'Input hasil kocok offline',
  desc: 'Catat hasil pengocokan fisik di lokasi (alasan wajib)',
};

export type UndianModalEligible = { userId: string; nama: string };

type Props = {
  groupId: string;
  periodeId: string; // padded "01", "02", ...
  periodeNomor: number; // untuk display
  eligibleMembers: UndianModalEligible[];
  groupMode: 'mode1' | 'mode3';
  onClose: () => void;
  onSuccess?: (winnerNama: string) => void;
  onError?: (msg: string) => void;
};

export function UndianModal({
  groupId,
  periodeId,
  periodeNomor,
  eligibleMembers,
  groupMode,
  onClose,
  onSuccess,
  onError,
}: Props) {
  // Mode 1: random tidak relevan (sudah preset), default ke manual.
  const initialChoice: Choice = groupMode === 'mode1' ? 'manual' : 'random';
  const [choice, setChoice] = useState<Choice>(initialChoice);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [winnerId, setWinnerId] = useState<string>('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const options = useMemo<Option[]>(
    () =>
      groupMode === 'mode1'
        ? [OPTION_MANUAL, OPTION_OFFLINE]
        : [OPTION_RANDOM, OPTION_MANUAL, OPTION_OFFLINE],
    [groupMode],
  );

  const showInputs = choice !== 'random';
  const selectedNama = eligibleMembers.find((m) => m.userId === winnerId)?.nama ?? '';

  const canConfirm = (() => {
    if (loading) return false;
    if (choice === 'random') return true;
    return winnerId.trim().length > 0 && note.trim().length > 0;
  })();

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setLoading(true);
    try {
      const fn = callable<
        {
          groupId: string;
          periodeId: string;
          method: Choice;
          manualWinnerId?: string;
          alasan?: string;
        },
        { ok: boolean; winnerId: string; winnerNama: string }
      >('triggerUndian');

      const res = await fn({
        groupId,
        periodeId,
        method: choice,
        ...(choice !== 'random' && { manualWinnerId: winnerId, alasan: note.trim() }),
      });

      onSuccess?.(res.data.winnerNama);
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal menjalankan undian';
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable style={styles.overlay} onPress={onClose}>
      <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerIcon}>
              <Text style={{ fontSize: 20 }}>🎲</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>
                {groupMode === 'mode1' ? 'Override Pemenang' : 'Mulai Undian'} Periode{' '}
                {periodeNomor}
              </Text>
              <Text style={styles.subtitle}>
                {groupMode === 'mode1'
                  ? 'Urutan Mode 1 sudah preset. Override hanya untuk kasus khusus.'
                  : 'Tentukan siapa pemenang periode berikutnya'}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={6}
              accessibilityLabel="Tutup undian"
            >
              <X size={16} color={colors.textMuted} strokeWidth={2.2} />
            </Pressable>
          </View>

          {/* Radio options */}
          <View style={{ gap: 8, marginTop: 16 }}>
            {options.map((o) => (
              <RadioCard
                key={o.id}
                option={o}
                selected={choice === o.id}
                onSelect={() => setChoice(o.id)}
              />
            ))}
          </View>

          {/* Conditional inputs */}
          {showInputs && (
            <View style={styles.inputs}>
              <View>
                <Text style={styles.inputLabel}>Nama pemenang</Text>
                <Pressable
                  onPress={() => setPickerOpen((v) => !v)}
                  style={[styles.picker, pickerOpen && { borderColor: colors.primary }]}
                >
                  <Text style={[styles.pickerText, !selectedNama && { color: '#A8A8A2' }]}>
                    {selectedNama || 'Pilih anggota...'}
                  </Text>
                  <ChevronDown size={16} color={colors.textSubtle} strokeWidth={1.75} />
                </Pressable>
                {pickerOpen && (
                  <View style={[styles.dropdown, shadows.sheet]}>
                    {eligibleMembers.map((m) => (
                      <Pressable
                        key={m.userId}
                        onPress={() => {
                          setWinnerId(m.userId);
                          setPickerOpen(false);
                        }}
                        style={[
                          styles.dropdownItem,
                          winnerId === m.userId && { backgroundColor: '#F8F7FE' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.dropdownItemText,
                            winnerId === m.userId && {
                              color: colors.primary,
                              fontFamily: fonts.semibold,
                            },
                          ]}
                        >
                          {m.nama}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              <View>
                <View style={styles.labelRow}>
                  <Text style={styles.inputLabel}>Alasan</Text>
                  <Text style={styles.labelWajib}>Wajib</Text>
                </View>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  multiline
                  numberOfLines={3}
                  placeholder={
                    choice === 'offline' ? 'Disaksikan oleh ...' : 'Alasan penunjukan ...'
                  }
                  placeholderTextColor="#A8A8A2"
                  style={styles.textarea}
                />
              </View>
            </View>
          )}

          {/* Buttons */}
          <View style={styles.actions}>
            <Button
              variant="secondary"
              full
              style={{ flex: 1 }}
              onPress={onClose}
              disabled={loading}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              full
              style={{ flex: 1 }}
              disabled={!canConfirm}
              onPress={handleConfirm}
            >
              {loading ? 'Memproses...' : 'Konfirmasi Undian'}
            </Button>
          </View>
        </ScrollView>
      </Pressable>
    </Pressable>
  );
}

function RadioCard({
  option,
  selected,
  onSelect,
}: {
  option: Option;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Pressable
      onPress={onSelect}
      style={[
        styles.radioCard,
        selected && {
          backgroundColor: '#EEEDFE',
          borderColor: colors.primary,
        },
      ]}
    >
      <View style={[styles.radioIcon, { backgroundColor: selected ? '#FFF' : '#F4F4F0' }]}>
        <Text style={{ fontSize: 18 }}>{option.icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.radioTitle}>{option.title}</Text>
        <Text style={styles.radioDesc}>{option.desc}</Text>
      </View>
      <View
        style={[
          styles.radioDot,
          {
            borderColor: selected ? colors.primary : colors.borderStrong,
          },
        ]}
      >
        {selected && <View style={styles.radioDotInner} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.modalOverlay,
    justifyContent: 'flex-end',
    padding: 12,
  },
  sheet: {
    backgroundColor: '#FFF',
    borderRadius: radii.cardXxl,
    padding: 18,
    maxHeight: '90%',
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.text,
    letterSpacing: -0.05,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 18,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F4F4F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  radioCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.card,
  },
  radioIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
  },
  radioDesc: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 17,
  },
  radioDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },

  inputs: {
    marginTop: 14,
    padding: 12,
    gap: 12,
    backgroundColor: '#FAFAF7',
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  inputLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.text,
  },
  labelWajib: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.dangerInk,
    backgroundColor: colors.dangerBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    letterSpacing: 0.3,
  },
  picker: {
    height: 42,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: 10,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.text,
  },
  dropdown: {
    marginTop: 4,
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 180,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F4F0',
  },
  dropdownItemText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.text,
  },
  textarea: {
    minHeight: 70,
    padding: 10,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: 10,
    backgroundColor: '#FFF',
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.text,
    textAlignVertical: 'top',
  },

  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
});
