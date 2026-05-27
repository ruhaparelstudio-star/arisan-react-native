import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Check, Minus, Plus } from 'lucide-react-native';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { Button, Header, Toast } from '@/components';
import { colors, fonts, radii } from '@/theme';
import { callable } from '@/services/firebase';
import type { Frekuensi, UndianMode } from '@arisan/shared/types';

dayjs.locale('id');

type CreateGroupReq = {
  nama: string;
  nominal: number;
  frekuensi: Frekuensi;
  jumlahPeriode: number;
  undianMode: UndianMode;
  tanggalMulai: number;
};
type CreateGroupRes = { groupId: string; inviteCode: string };

const MIN_DATE_OFFSET_DAYS = 1; // tanggalMulai minimum H+1

function formatRupiah(n: number): string {
  if (!n) return '';
  return n.toLocaleString('id-ID');
}

function parseRupiah(s: string): number {
  const digits = s.replace(/\D/g, '');
  return digits ? Number(digits) : 0;
}

export default function BuatGrupScreen() {
  const [nama, setNama] = useState('');
  const [nominal, setNominal] = useState<number>(0);
  const [nominalText, setNominalText] = useState('');
  const [frekuensi, setFrekuensi] = useState<Frekuensi>('bulanan');
  const [jumlahPeriode, setJumlahPeriode] = useState(8);
  const [undianMode, setUndianMode] = useState<UndianMode>('mode1');
  const [tanggalMulai, setTanggalMulai] = useState<number>(() =>
    dayjs().add(MIN_DATE_OFFSET_DAYS, 'day').startOf('day').valueOf(),
  );
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const minDate = useMemo(
    () => dayjs().add(MIN_DATE_OFFSET_DAYS, 'day').startOf('day').valueOf(),
    [],
  );

  const errors = useMemo(() => {
    const e: string[] = [];
    if (nama.trim().length < 3) e.push('Nama grup minimal 3 karakter');
    if (nominal < 1000) e.push('Nominal minimal Rp 1.000');
    if (jumlahPeriode < 2 || jumlahPeriode > 50) e.push('Jumlah periode 2-50');
    if (tanggalMulai < minDate) e.push('Tanggal mulai minimal besok');
    return e;
  }, [nama, nominal, jumlahPeriode, tanggalMulai, minDate]);

  const canSubmit = errors.length === 0 && !submitting;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const fn = callable<CreateGroupReq, CreateGroupRes>('createGroup');
      const res = await fn({
        nama: nama.trim(),
        nominal,
        frekuensi,
        jumlahPeriode,
        undianMode,
        tanggalMulai,
      });
      const { groupId } = res.data;
      router.replace(`/grup/${groupId}/invite`);
    } catch (err) {
      const msg =
        err instanceof Error && err.message ? err.message : 'Gagal membuat grup. Coba lagi.';
      setToast(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Header title="Buat Grup Arisan" onBack={() => router.back()} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Nama grup */}
          <Field label="Nama grup" hint="Misal: Arisan RT 03">
            <TextInput
              value={nama}
              onChangeText={setNama}
              placeholder="Nama grup"
              placeholderTextColor={colors.textDisabled}
              style={styles.input}
              maxLength={60}
            />
          </Field>

          {/* Nominal */}
          <Field label="Nominal iuran" hint="Per anggota per periode">
            <View style={styles.rupiahWrap}>
              <Text style={styles.rupiahPrefix}>Rp</Text>
              <TextInput
                value={nominalText}
                onChangeText={(t) => {
                  const n = parseRupiah(t);
                  setNominal(n);
                  setNominalText(formatRupiah(n));
                }}
                placeholder="500.000"
                placeholderTextColor={colors.textDisabled}
                keyboardType="number-pad"
                style={[styles.input, styles.rupiahInput]}
              />
            </View>
          </Field>

          {/* Frekuensi */}
          <Field label="Frekuensi">
            <View style={styles.radioRow}>
              <RadioCard
                active={frekuensi === 'bulanan'}
                title="Bulanan"
                desc="Iuran tiap bulan"
                onPress={() => setFrekuensi('bulanan')}
              />
              <RadioCard
                active={frekuensi === 'mingguan'}
                title="Mingguan"
                desc="Iuran tiap minggu"
                onPress={() => setFrekuensi('mingguan')}
              />
            </View>
          </Field>

          {/* Jumlah periode */}
          <Field label="Jumlah periode" hint="Sama dengan jumlah anggota target">
            <View style={styles.stepperRow}>
              <Pressable
                onPress={() => setJumlahPeriode((v) => Math.max(2, v - 1))}
                style={({ pressed }) => [styles.stepperBtn, pressed && { opacity: 0.6 }]}
                accessibilityLabel="Kurangi periode"
              >
                <Minus size={18} color={colors.text} strokeWidth={2} />
              </Pressable>
              <View style={styles.stepperValue}>
                <Text style={styles.stepperValueText}>{jumlahPeriode}</Text>
                <Text style={styles.stepperUnit}>periode</Text>
              </View>
              <Pressable
                onPress={() => setJumlahPeriode((v) => Math.min(50, v + 1))}
                style={({ pressed }) => [styles.stepperBtn, pressed && { opacity: 0.6 }]}
                accessibilityLabel="Tambah periode"
              >
                <Plus size={18} color={colors.text} strokeWidth={2} />
              </Pressable>
            </View>
          </Field>

          {/* Tanggal mulai */}
          <Field label="Tanggal mulai" hint="Minimal besok">
            <DateStepper value={tanggalMulai} min={minDate} onChange={setTanggalMulai} />
          </Field>

          {/* Mode undian */}
          <Field label="Mode undian" hint="Pilih sekali saat buat grup, tidak bisa diubah">
            <View style={{ gap: 10 }}>
              <ModeCard
                active={undianMode === 'mode1'}
                title="Mode 1 — Urutan ditentukan di awal"
                desc="Semua pemenang random sekali, urutan fixed sampai arisan selesai. Cocok untuk grup yang ingin tahu kapan dapat giliran sejak awal."
                onPress={() => setUndianMode('mode1')}
              />
              <ModeCard
                active={undianMode === 'mode3'}
                title="Mode 3 — Hybrid"
                desc="Periode pertama random dari semua, periode berikutnya random dari yang belum menang. Cocok untuk yang ingin surprise tiap periode."
                onPress={() => setUndianMode('mode3')}
              />
            </View>
          </Field>

          {errors.length > 0 && (
            <View style={styles.errorsBox}>
              {errors.map((e) => (
                <Text key={e} style={styles.errorText}>
                  • {e}
                </Text>
              ))}
            </View>
          )}

          <Button
            full
            disabled={!canSubmit}
            onPress={onSubmit}
            style={{ marginTop: 18 }}
            leading={submitting ? <ActivityIndicator color="#FFF" size="small" /> : undefined}
          >
            {submitting ? 'Membuat...' : 'Buat Grup'}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
      <Toast message={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {!!hint && <Text style={styles.fieldHint}>{hint}</Text>}
      <View style={{ marginTop: 8 }}>{children}</View>
    </View>
  );
}

function RadioCard({
  active,
  title,
  desc,
  onPress,
}: {
  active: boolean;
  title: string;
  desc: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.radioCard, active && styles.radioCardActive]}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
    >
      <View style={[styles.radioDot, active && styles.radioDotActive]}>
        {active && <View style={styles.radioInnerDot} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.radioTitle}>{title}</Text>
        <Text style={styles.radioDesc}>{desc}</Text>
      </View>
    </Pressable>
  );
}

function ModeCard({
  active,
  title,
  desc,
  onPress,
}: {
  active: boolean;
  title: string;
  desc: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.modeCard, active && styles.modeCardActive]}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
    >
      <View style={styles.modeHead}>
        <View style={[styles.radioDot, active && styles.radioDotActive]}>
          {active && <View style={styles.radioInnerDot} />}
        </View>
        <Text style={styles.modeTitle}>{title}</Text>
        {active && (
          <View style={styles.modeBadge}>
            <Check size={12} color="#FFF" strokeWidth={3} />
          </View>
        )}
      </View>
      <Text style={styles.modeDesc}>{desc}</Text>
    </Pressable>
  );
}

function DateStepper({
  value,
  min,
  onChange,
}: {
  value: number;
  min: number;
  onChange: (v: number) => void;
}) {
  const d = dayjs(value);
  return (
    <View style={styles.dateRow}>
      <Pressable
        onPress={() => {
          const next = dayjs(value).subtract(1, 'day').valueOf();
          if (next >= min) onChange(next);
        }}
        style={({ pressed }) => [styles.stepperBtn, pressed && { opacity: 0.6 }]}
        accessibilityLabel="Mundur 1 hari"
      >
        <Minus size={18} color={colors.text} strokeWidth={2} />
      </Pressable>
      <View style={styles.dateValueBox}>
        <Text style={styles.dateValueDay}>{d.format('dddd')}</Text>
        <Text style={styles.dateValueFull}>{d.format('D MMMM YYYY')}</Text>
      </View>
      <Pressable
        onPress={() => onChange(dayjs(value).add(1, 'day').valueOf())}
        style={({ pressed }) => [styles.stepperBtn, pressed && { opacity: 0.6 }]}
        accessibilityLabel="Maju 1 hari"
      >
        <Plus size={18} color={colors.text} strokeWidth={2} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  field: { marginTop: 18 },
  fieldLabel: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.text,
  },
  fieldHint: {
    marginTop: 3,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSubtle,
  },
  input: {
    height: 48,
    paddingHorizontal: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.input,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.text,
  },
  rupiahWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.input,
    paddingLeft: 14,
  },
  rupiahPrefix: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.textMuted,
    marginRight: 6,
  },
  rupiahInput: {
    flex: 1,
    borderWidth: 0,
    paddingLeft: 0,
    backgroundColor: 'transparent',
  },
  radioRow: { flexDirection: 'row', gap: 10 },
  radioCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: radii.card,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
  },
  radioCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  radioDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDotActive: { borderColor: colors.primary },
  radioInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  radioTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.text,
  },
  radioDesc: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.input,
    padding: 6,
  },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    flex: 1,
    alignItems: 'center',
  },
  stepperValueText: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
  },
  stepperUnit: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textSubtle,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.input,
    padding: 6,
  },
  dateValueBox: {
    flex: 1,
    alignItems: 'center',
  },
  dateValueDay: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.textSubtle,
    textTransform: 'capitalize',
  },
  dateValueFull: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
  },
  modeCard: {
    padding: 14,
    borderRadius: radii.card,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
  },
  modeCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  modeHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modeTitle: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.text,
  },
  modeBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeDesc: {
    marginTop: 6,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
  },
  errorsBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: radii.card,
    backgroundColor: colors.dangerBg,
    gap: 4,
  },
  errorText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.danger,
  },
});
