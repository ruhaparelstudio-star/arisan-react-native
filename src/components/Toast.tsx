import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { colors, fonts } from '@/theme';

type Props = {
  message: string | null;
  variant?: 'dark' | 'success';
  onHide?: () => void;
  duration?: number;
};

export function Toast({ message, variant = 'dark', onHide, duration = 2400 }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    if (!message) return;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 8, duration: 160, useNativeDriver: true }),
      ]).start(() => onHide?.());
    }, duration);
    return () => clearTimeout(t);
    // Trigger restart hanya saat `message` berubah. `opacity`/`translateY` ref
    // stabil; `duration`/`onHide` sengaja tidak di-track agar parent re-render
    // tidak men-restart timer auto-hide di tengah jalan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  if (!message) return null;

  const bg = variant === 'success' ? colors.success : colors.toastBg;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.toast, { backgroundColor: bg, opacity, transform: [{ translateY }] }]}
    >
      <View style={styles.check}>
        <Check size={14} color="#FFF" strokeWidth={3} />
      </View>
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#111',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1D9E75',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFF',
    fontFamily: fonts.semibold,
    fontSize: 13,
    flex: 1,
  },
});
