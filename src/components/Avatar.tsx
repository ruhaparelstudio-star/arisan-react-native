import React from 'react';
import { StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import { avatarColor, fonts, initials } from '@/theme';

type Props = {
  name: string;
  size?: number;
  rounded?: 'full' | 'card';
  style?: StyleProp<ViewStyle>;
  bgOverride?: string;
  fgOverride?: string;
  text?: string;
};

export function Avatar({
  name,
  size = 40,
  rounded = 'full',
  style,
  bgOverride,
  fgOverride,
  text,
}: Props) {
  const c = avatarColor(name);
  const bg = bgOverride ?? c.bg;
  const ink = fgOverride ?? c.ink;
  const radius = rounded === 'full' ? size / 2 : 12;
  return (
    <View
      style={[
        styles.base,
        { width: size, height: size, backgroundColor: bg, borderRadius: radius },
        style,
      ]}
    >
      <Text
        style={{
          color: ink,
          fontFamily: fonts.bold,
          fontSize: size * 0.36,
        }}
      >
        {text ?? initials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
