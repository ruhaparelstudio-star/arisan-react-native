export const colors = {
  primary: '#7F77DD',
  primaryPress: '#6B63CC',
  primaryTint: '#EFEDFB',
  primaryDeep: '#4A43A8',

  success: '#1D9E75',
  successBg: '#E1F5EE',
  successInk: '#136B4F',
  successBorder: '#BCE5D5',

  warning: '#BA7517',
  warningBg: '#FAEEDA',
  warningInk: '#7A4D0E',
  warningBorder: '#F3DDB3',

  danger: '#993C1D',
  dangerBg: '#FAECE7',
  dangerInk: '#7A2F16',
  dangerBorder: '#F3CFBE',

  page: '#F8F8F8',
  card: '#FFFFFF',
  surface: '#F4F4F0',
  surfaceWarm: '#F4F2EC',

  text: '#1F1F1D',
  textBody: '#444441',
  textMuted: '#6B6B66',
  textSubtle: '#8A8A86',
  textDisabled: '#B5B5B0',
  textVeryDisabled: '#C8C8C2',

  border: '#ECECEC',
  borderSoft: '#F2F2EF',
  borderStrong: '#D8D8D4',
  borderStrongerNeutral: '#E0DED6',

  chatBg: '#F4F2EC',
  modalOverlay: 'rgba(20,20,18,0.55)',
  toastBg: '#2A2A28',
} as const;

export const avatarPalette = [
  { bg: '#EFEDFB', ink: '#4A43A8' },
  { bg: '#E1F5EE', ink: '#136B4F' },
  { bg: '#FAEEDA', ink: '#7A4D0E' },
  { bg: '#FAECE7', ink: '#7A2F16' },
  { bg: '#E8EEF8', ink: '#2C4A8A' },
  { bg: '#F0EAE0', ink: '#5B4A2A' },
] as const;

export function avatarColor(name: string): { bg: string; ink: string } {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return avatarPalette[Math.abs(h) % avatarPalette.length];
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter((p) => !/^(bu|pak|ibu|bpk|mas|mbak)$/i.test(p))
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

export function money(n: number): string {
  return 'Rp ' + Math.abs(n).toLocaleString('id-ID').replace(/,/g, '.');
}
