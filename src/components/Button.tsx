import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle, StyleProp, PressableProps } from 'react-native';
import { colors, fonts, radii, shadows } from '@/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = {
  variant?: Variant;
  full?: boolean;
  disabled?: boolean;
  onPress?: PressableProps['onPress'];
  style?: StyleProp<ViewStyle>;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  children?: React.ReactNode;
};

export function Button({
  variant = 'primary',
  full,
  disabled,
  onPress,
  style,
  leading,
  trailing,
  children,
}: Props) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variantStyle(variant),
        full && styles.full,
        pressed && !disabled && { transform: [{ scale: 0.98 }], opacity: 0.9 },
        disabled && { opacity: 0.5 },
        variant === 'primary' && !disabled && shadows.purpleSoft,
        style,
      ]}
    >
      {leading}
      {typeof children === 'string' ? (
        <Text style={[styles.label, labelColor(variant)]}>{children}</Text>
      ) : (
        children
      )}
      {trailing}
    </Pressable>
  );
}

function variantStyle(v: Variant): ViewStyle {
  switch (v) {
    case 'primary':
      return { backgroundColor: colors.primary };
    case 'secondary':
      return {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.borderStrong,
      };
    case 'ghost':
      return { backgroundColor: 'transparent' };
    case 'danger':
      return { backgroundColor: colors.danger };
  }
}

function labelColor(v: Variant): { color: string } {
  if (v === 'primary' || v === 'danger') return { color: '#FFF' };
  if (v === 'ghost') return { color: colors.primary };
  return { color: colors.textBody };
}

const styles = StyleSheet.create({
  base: {
    height: 48,
    paddingHorizontal: 20,
    borderRadius: radii.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  full: { width: '100%' },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 15,
  },
});
