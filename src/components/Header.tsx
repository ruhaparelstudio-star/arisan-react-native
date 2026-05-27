import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { colors, fonts } from '@/theme';

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
};

export function Header({ title, subtitle, onBack, leading, trailing }: Props) {
  return (
    <View style={styles.container}>
      {leading ??
        (onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={8}
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
          >
            <ChevronLeft size={22} color={colors.text} strokeWidth={1.75} />
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        ))}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {trailing ?? <View style={{ width: 40 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 56,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textSubtle,
    marginTop: 2,
  },
});
