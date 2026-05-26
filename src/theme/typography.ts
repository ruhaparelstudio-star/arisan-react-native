import { TextStyle } from 'react-native';
import { colors } from './colors';

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
} as const;

export const typography = {
  h1: {
    fontFamily: fonts.bold,
    fontSize: 24,
    lineHeight: 32,
    color: colors.text,
    letterSpacing: -0.24,
  } as TextStyle,
  h2: {
    fontFamily: fonts.semibold,
    fontSize: 20,
    lineHeight: 28,
    color: colors.text,
    letterSpacing: -0.1,
  } as TextStyle,
  h3: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    lineHeight: 24,
    color: colors.text,
  } as TextStyle,
  body: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  } as TextStyle,
  bodyStrong: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  } as TextStyle,
  caption: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSubtle,
  } as TextStyle,
  small: {
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSubtle,
  } as TextStyle,
  tiny: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    color: colors.textSubtle,
  } as TextStyle,
};
