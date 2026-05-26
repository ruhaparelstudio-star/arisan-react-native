import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ChevronDown, X } from 'lucide-react-native';
import { Button } from '@/components';
import { colors, fonts, radii, shadows } from '@/theme';

type Option = { id: string; icon: string; title: string; desc: string };

const OPTIONS: Option[] = [
  {
    id: 'random',
    icon: '🎲',
    title: 'Random otomatis',
    desc: 'Sistem memilih secara acak dari anggota belum menang',
  },
  {
    id: 'manual',
    icon: '✋',
    title: 'Assign manual',
    desc: 'Ketua langsung menentukan pemenang',
  },
  {
    id: 'offline',
    icon: '📝',
    title: 'Input hasil kocok offline',
    desc: 'Catat hasil pengocokan fisik di lokasi',
  },
];

type Props = {
  onClose: () => void;
  onConfirm: (winner: string) => void;
  eligible: string[];
};

export function UndianModal({ onClose, onConfirm, eligible }: Props) {
  const [choice, setChoice] = useState('random');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [winner, setWinner] = useState('');
  const [note, setNote] = useState('');

  const showInputs = choice === 'manual' || choice === 'offline';
  const canConfirm = choice === 'random' ? true : winner.trim().length > 0;

  const handleConfirm = () => {
    if (!canConfirm) return;
    const picked =
      choice === 'random'
        ? eligible[Math.floor(Math.random() * eligible.length)]
        : winner.trim();
    onConfirm(picked);
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
              <Text style={styles.title}>Mulai Undian Periode 4</Text>
              <Text style={styles.subtitle}>
                Tentukan siapa pemenang periode berikutnya
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={6}>
              <X size={16} color={colors.textMuted} strokeWidth={2.2} />
            </Pressable>
          </View>

          {/* Radio options */}
          <View style={{ gap: 8, marginTop: 16 }}>
            {OPTIONS.map((o) => (
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
                  style={[
                    styles.picker,
                    pickerOpen && { borderColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.pickerText,
                      !winner && { color: '#A8A8A2' },
                    ]}
                  >
                    {winner || 'Pilih anggota...'}
                  </Text>
                  <ChevronDown
                    size={16}
                    color={colors.textSubtle}
                    strokeWidth={1.75}
                  />
                </Pressable>
                {pickerOpen && (
                  <View style={[styles.dropdown, shadows.sheet]}>
                    {eligible.map((n) => (
                      <Pressable
                        key={n}
                        onPress={() => {
                          setWinner(n);
                          setPickerOpen(false);
                        }}
                        style={[
                          styles.dropdownItem,
                          winner === n && { backgroundColor: '#F8F7FE' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.dropdownItemText,
                            winner === n && {
                              color: colors.primary,
                              fontFamily: fonts.semibold,
                            },
                          ]}
                        >
                          {n}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              <View>
                <Text style={styles.inputLabel}>Alasan / keterangan</Text>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  multiline
                  numberOfLines={3}
                  placeholder={
                    choice === 'offline'
                      ? 'Disaksikan oleh ...'
                      : 'Alasan penunjukan ...'
                  }
                  placeholderTextColor="#A8A8A2"
                  style={styles.textarea}
                />
              </View>
            </View>
          )}

          {/* Buttons */}
          <View style={styles.actions}>
            <Button variant="secondary" full style={{ flex: 1 }} onPress={onClose}>
              Batal
            </Button>
            <Button
              variant="primary"
              full
              style={{ flex: 1 }}
              disabled={!canConfirm}
              onPress={handleConfirm}
            >
              Konfirmasi Undian
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
      <View
        style={[
          styles.radioIcon,
          { backgroundColor: selected ? '#FFF' : '#F4F4F0' },
        ]}
      >
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
  inputLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.text,
    marginBottom: 6,
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
