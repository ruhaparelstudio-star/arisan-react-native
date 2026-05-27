import React from 'react';
import { Pressable, View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors } from '@/theme';

type Props = {
  onPress?: () => void;
  children: React.ReactNode;
  size?: number;
  bordered?: boolean;
  bg?: string;
  style?: StyleProp<ViewStyle>;
  badge?: React.ReactNode;
};

export function IconButton({ onPress, children, size = 40, bordered, bg, style, badge }: Props) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.btn,
        {
          width: size,
          height: size,
          backgroundColor: bg ?? 'transparent',
          borderWidth: bordered ? 1 : 0,
          borderColor: colors.border,
        },
        pressed && { opacity: 0.6 },
        style,
      ]}
    >
      {children}
      {badge ? <View style={styles.badgeWrap}>{badge}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeWrap: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
});
