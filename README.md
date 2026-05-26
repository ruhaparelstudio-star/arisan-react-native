# Arisan Mobile App

Aplikasi mobile **Arisan Indonesia** dibangun dengan React Native + Expo dari design system yang diserahkan via Claude Design.

## Stack

- **Expo 52** (managed workflow) + **React Native 0.76**
- **TypeScript** strict mode
- **Expo Router** untuk file-based navigation
- **React Navigation Bottom Tabs**
- **lucide-react-native** untuk ikon
- **Inter** (via @expo-google-fonts/inter)

## Struktur

```
app/                       ← Routes (Expo Router)
  _layout.tsx              ← Root stack
  (tabs)/                  ← Bottom tab group
    _layout.tsx            ← Tab bar config
    index.tsx              ← Beranda / Dashboard
    notif.tsx              ← Notifikasi Center
    chat.tsx               ← Chat (standalone)
    profil.tsx             ← Profil + entry ke semua screen
  group/[id].tsx           ← Detail Grup (tabs Pembayaran/Urutan/Chat)
  winner.tsx               ← Notifikasi Pemenang (confetti)
  set-date.tsx             ← Set Tanggal Pelaksanaan
  tukar.tsx                ← Request Tukar Giliran
  approval.tsx             ← Approval (recipient view)
  riwayat.tsx              ← Riwayat Aktivitas
  pengaturan.tsx           ← Pengaturan Grup (ketua)

src/
  theme/                   ← Design tokens
    colors.ts              ← Color palette + avatar helpers
    typography.ts          ← Inter font scale
    spacing.ts             ← Spacing + radii + shadows
  components/              ← Reusable UI
    Button, Badge, Avatar, Card, Header, IconButton, Toast
  screens/                 ← Sub-screens & modals dipakai oleh tabs
    UrutanTab.tsx          ← Tab Urutan Giliran
    UndianModal.tsx        ← Modal Mulai Undian
    ChatTab.tsx            ← Chat content reusable
  data/
    mock.ts                ← Seed data (anggota, urutan, notifikasi, riwayat)
```

## Cara menjalankan

```bash
npm install
npx expo start
```

Lalu scan QR code dengan **Expo Go** di HP, atau tekan:
- `i` untuk iOS simulator
- `a` untuk Android emulator
- `w` untuk web

## Screen yang sudah diimplementasi

Semua 10+ screen dari design system:

1. **Beranda** — header sapaan, summary card ungu, list grup arisan, FAB
2. **Detail Grup** — info bar, 3 tabs (Pembayaran / Urutan / Chat), progress bar, list anggota
3. **Urutan Giliran** — active winner card, ordered list, swap icon, trigger undian
4. **Modal Undian** — 3 radio options (Random / Manual / Offline) + conditional inputs
5. **Chat** — bubble kiri/kanan, badge KETUA, system message, send button
6. **Notifikasi** — read/unread, inline tolak/setujui untuk swap, mark-all, empty state
7. **Pemenang** — confetti animation, trophy bob, stat card, set-tanggal CTA
8. **Set Tanggal** — kalender Juni 2025, checkbox konfirmasi, sticky button
9. **Tukar Giliran** — eligible/disabled candidates, radio, alasan textarea
10. **Approval** — sender card, before/after diagram, tolak/setujui, status box
11. **Riwayat** — filter chips, timeline vertikal dengan dot warna
12. **Pengaturan Grup** — info (editable nama), member list (hapus dgn confirm), zona berbahaya (ketik BUBARKAN)

## Caveats

- Belum ada state management global — masing-masing screen pakai `useState` lokal
- Tidak ada persistence (AsyncStorage) — refresh = reset
- Tidak ada backend / API — semua data dari `src/data/mock.ts`
- Status bar di iOS pakai SafeAreaView edges, sudah ditest di simulator
- Beberapa interaksi (FAB tambah grup, edit nominal iuran, dll) belum diimplementasi karena di luar scope design

## Design tokens

Lihat `src/theme/colors.ts` untuk warna dan `src/theme/typography.ts` untuk scale font. Semua mengikuti spec design system:

- Primary `#7F77DD`
- Success `#1D9E75` + bg `#E1F5EE`
- Warning `#BA7517` + bg `#FAEEDA`
- Danger `#993C1D` + bg `#FAECE7`
- Page `#F8F8F8`, Card `#FFFFFF`, Text `#1F1F1D`
- Inter font, scale H1=24 / H2=20 / H3=17 / Body=15 / Caption=13
# arisan-react-native
