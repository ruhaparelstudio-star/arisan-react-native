import React from 'react';
import { StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import { colors, fonts, radii } from '@/theme';

export type BadgeKind = 'Lunas' | 'Belum' | 'Terlambat' | 'Menang' | 'Pending';

type Props = {
  kind: BadgeKind;
  children?: React.ReactNode;
  showDot?: boolean;
  style?: StyleProp<ViewStyle>;
};

const KINDS: Record<BadgeKind, { bg: string; fg: string }> = {
  Lunas: { bg: colors.successBg, fg: colors.success },
  Belum: { bg: colors.dangerBg, fg: colors.danger },
  Terlambat: { bg: colors.warningBg, fg: colors.warning },
  Menang: { bg: colors.primaryTint, fg: colors.primaryDeep },
  Pending: { bg: '#F0F0EE', fg: colors.textMuted },
};

export function Badge({ kind, children, showDot = true, style }: Props) {
  const s = KINDS[kind] ?? KINDS.Pending;
  return (
    <View style={[styles.base, { backgroundColor: s.bg }, style]}>
      {showDot && <View style={[styles.dot, { backgroundColor: s.fg, opacity: 0.8 }]} />}
      <Text style={[styles.label, { color: s.fg }]}>{children ?? kind}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 24,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    letterSpacing: 0.1,
  },
});
