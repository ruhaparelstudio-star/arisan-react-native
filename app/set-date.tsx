import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  AlertCircle,
  Calendar as CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react-native';
import { Button, IconButton, Header } from '@/components';
import { colors, fonts, radii, shadows } from '@/theme';

const TODAY = 12;
const MIN_OFFSET = 3;
const MIN_DATE = TODAY + MIN_OFFSET;
const DOW = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const FIRST_DAY_COL = 6;
const DAYS_IN_MONTH = 30;

export default function SetDateScreen() {
  const [selected, setSelected] = useState<number>(15);
  const [agreed, setAgreed] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const insets = useSafeAreaInsets();

  const cells: (number | null)[] = [];
  for (let i = 0; i < FIRST_DAY_COL; i++) cells.push(null);
  for (let d = 1; d <= DAYS_IN_MONTH; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const canConfirm = agreed && selected != null;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View>
        <Header title="Set Tanggal" onBack={() => router.back()} />
        <View style={styles.warningRow}>
          <AlertCircle size={13} color={colors.danger} strokeWidth={2} />
          <Text style={styles.warningText}>
            Tanggal tidak bisa diubah setelah dikonfirmasi
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Month header */}
        <View style={styles.monthHead}>
          <Text style={styles.monthTitle}>Juni 2025</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <CalNavBtn>
              <ChevronLeft size={18} color={colors.textBody} strokeWidth={1.75} />
            </CalNavBtn>
            <CalNavBtn>
              <ChevronRight size={18} color={colors.textBody} strokeWidth={1.75} />
            </CalNavBtn>
          </View>
        </View>

        {/* Calendar */}
        <View style={[styles.calendar, shadows.card]}>
          <View style={styles.dowRow}>
            {DOW.map((d, i) => (
              <Text
                key={d}
                style={[
                  styles.dowText,
                  i === 0 && { color: colors.danger },
                ]}
              >
                {d}
              </Text>
            ))}
          </View>
          <View style={styles.daysGrid}>
            {cells.map((d, i) => (
              <DayCell
                key={i}
                day={d}
                isToday={d === TODAY}
                isPast={d != null && d < MIN_DATE}
                isSelected={d === selected}
                onPress={d != null && d >= MIN_DATE ? () => setSelected(d) : undefined}
              />
            ))}
          </View>
        </View>

        {/* Selected confirmation */}
        <View style={styles.selectedCard}>
          <View style={styles.selectedIcon}>
            <CalendarIcon size={22} color={colors.primary} strokeWidth={1.75} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.selectedLabel}>Tanggal terpilih</Text>
            <Text style={styles.selectedValue}>Sabtu, {selected} Juni 2025</Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <Info size={18} color={colors.textSubtle} strokeWidth={1.75} />
          <Text style={styles.infoText}>
            Hanya ketua yang bisa mengubah tanggal ini dengan alasan.
          </Text>
        </View>

        {/* Checkbox */}
        <Pressable
          onPress={() => setAgreed((a) => !a)}
          style={[
            styles.checkBox,
            agreed && {
              backgroundColor: colors.primaryTint,
              borderColor: '#C8C2EE',
            },
          ]}
        >
          <View
            style={[
              styles.checkSquare,
              agreed && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
          >
            {agreed && <Check size={14} color="#FFF" strokeWidth={3.2} />}
          </View>
          <Text style={styles.checkLabel}>
            Saya mengerti tanggal tidak bisa diubah sendiri
          </Text>
        </Pressable>

        {confirmed && (
          <View style={styles.confirmedBanner}>
            <Check size={16} color={colors.successInk} strokeWidth={2.5} />
            <Text style={styles.confirmedText}>
              Tanggal terkonfirmasi · Sabtu, {selected} Juni 2025
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Sticky bottom */}
      <View style={[styles.stickyBottom, { paddingBottom: 16 + insets.bottom }]}>
        <Button
          full
          disabled={!canConfirm}
          onPress={() => canConfirm && setConfirmed(true)}
          leading={confirmed ? <Check size={18} color="#FFF" strokeWidth={2.6} /> : undefined}
        >
          {confirmed ? 'Tanggal Terkonfirmasi' : 'Konfirmasi Tanggal'}
        </Button>
      </View>
    </SafeAreaView>
  );
}

function CalNavBtn({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.calNavBtn}>
      {children}
    </View>
  );
}

function DayCell({
  day,
  isToday,
  isPast,
  isSelected,
  onPress,
}: {
  day: number | null;
  isToday: boolean;
  isPast: boolean;
  isSelected: boolean;
  onPress?: () => void;
}) {
  if (day == null) return <View style={styles.dayCell} />;

  let bg: string = 'transparent';
  let textColor: string = colors.text;
  let fontFamily: string = fonts.medium;
  let borderColor: string = 'transparent';

  if (isSelected) {
    bg = colors.primary;
    textColor = '#FFF';
    fontFamily = fonts.bold;
  } else if (isPast) {
    textColor = colors.textVeryDisabled;
  } else if (isToday) {
    borderColor = colors.primary;
    textColor = colors.primary;
    fontFamily = fonts.bold;
  }

  return (
    <Pressable onPress={onPress} style={styles.dayCell} disabled={!onPress}>
      <View
        style={[
          styles.daySquare,
          {
            backgroundColor: bg,
            borderColor,
          },
          isSelected && shadows.purpleSoft,
        ]}
      >
        <Text style={{ color: textColor, fontFamily, fontSize: 14 }}>{day}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },

  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  warningText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.danger,
  },

  monthHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  monthTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.text,
  },
  calNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  calendar: {
    backgroundColor: colors.card,
    borderRadius: radii.cardLg,
    padding: 12,
  },
  dowRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dowText: {
    flex: 1,
    textAlign: 'center',
    paddingVertical: 6,
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 1,
  },
  daySquare: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectedCard: {
    marginTop: 14,
    backgroundColor: colors.primaryTint,
    borderColor: '#DCD8F4',
    borderWidth: 1,
    borderRadius: radii.cardLg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectedIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.primaryDeep,
    letterSpacing: 0.2,
  },
  selectedValue: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
    marginTop: 2,
  },

  infoCard: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  infoText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
  },

  checkBox: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
  },
  checkSquare: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.textDisabled,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkLabel: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.text,
    lineHeight: 19,
    paddingTop: 2,
  },

  confirmedBanner: {
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
  confirmedText: {
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
