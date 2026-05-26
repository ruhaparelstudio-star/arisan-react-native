import { BadgeKind } from '@/components';

export type Group = {
  id: string;
  name: string;
  period: string;
  iuran: number;
  status: BadgeKind;
  myTurn?: boolean;
};

export const GROUPS: Group[] = [
  {
    id: 'rt03',
    name: 'Arisan RT 03',
    period: '3/12',
    iuran: 500000,
    status: 'Lunas',
  },
  {
    id: 'kantor',
    name: 'Arisan Kantor',
    period: '1/10',
    iuran: 750000,
    status: 'Belum',
    myTurn: true,
  },
  {
    id: 'keluarga',
    name: 'Arisan Keluarga',
    period: '7/12',
    iuran: 250000,
    status: 'Lunas',
  },
];

export type Member = { name: string; status: BadgeKind };

export const RT03_MEMBERS: Member[] = [
  { name: 'Budi Santoso', status: 'Lunas' },
  { name: 'Ani Rahayu', status: 'Terlambat' },
  { name: 'Siti Lestari', status: 'Lunas' },
  { name: 'Joko Widodo', status: 'Belum' },
  { name: 'Dewi Sartika', status: 'Lunas' },
  { name: 'Agus Prasetyo', status: 'Lunas' },
  { name: 'Rina Marlina', status: 'Belum' },
  { name: 'Hendra Wijaya', status: 'Lunas' },
];

export type UrutanItem = {
  no: number;
  name: string;
  periode: number;
  status: 'done' | 'active' | 'upcoming';
};

export const URUTAN: UrutanItem[] = [
  { no: 1, name: 'Budi Santoso', periode: 1, status: 'done' },
  { no: 2, name: 'Ani Rahayu', periode: 2, status: 'done' },
  { no: 3, name: 'Siti Lestari', periode: 3, status: 'active' },
  { no: 4, name: 'Joko Widodo', periode: 4, status: 'upcoming' },
  { no: 5, name: 'Dewi Sartika', periode: 5, status: 'upcoming' },
  { no: 6, name: 'Agus Prasetyo', periode: 6, status: 'upcoming' },
  { no: 7, name: 'Rina Marlina', periode: 7, status: 'upcoming' },
  { no: 8, name: 'Hendra Wijaya', periode: 8, status: 'upcoming' },
];

export type ChatMessage = {
  id: number;
  kind: 'system' | 'msg';
  text: string;
  who?: string;
  mine?: boolean;
  ketua?: boolean;
  accent?: boolean;
  time?: string;
};

export const SEED_MESSAGES: ChatMessage[] = [
  { id: 1, kind: 'system', text: 'Siti Lestari memenangkan undian Periode 3 🎉' },
  { id: 2, kind: 'msg', who: 'Budi Santoso', mine: false, text: 'Selamat ya Siti!', time: '14:02' },
  {
    id: 3,
    kind: 'msg',
    who: 'Siti Lestari',
    mine: false,
    text: 'Makasih semua 🙏',
    time: '14:03',
    accent: true,
  },
  { id: 4, kind: 'system', text: 'Siti mengatur pelaksanaan: Sabtu, 15 Juni 2025' },
  {
    id: 5,
    kind: 'msg',
    who: 'Ani Rahayu',
    mine: false,
    text: 'Oke, nanti kita datang bareng ya',
    time: '14:05',
  },
  {
    id: 6,
    kind: 'msg',
    who: 'Pak Budi',
    mine: false,
    ketua: true,
    text: 'Reminder: tagihan periode 4 mulai 1 Juli',
    time: '14:08',
  },
  {
    id: 7,
    kind: 'msg',
    who: 'Joko Widodo',
    mine: false,
    text: 'Siap pak ketua 🫡',
    time: '14:09',
  },
];

export type NotifItem = {
  id: number;
  read: boolean;
  kind: 'winner' | 'swap' | 'chat' | 'paid' | 'reminder' | 'date';
  icon: string;
  bg: string;
  fg: string;
  title: string;
  body: string;
  time: string;
  cta?: string;
};

export const SEED_NOTIFS: NotifItem[] = [
  {
    id: 1,
    read: false,
    kind: 'winner',
    icon: '🏆',
    bg: '#EFEDFB',
    fg: '#4A43A8',
    title: 'Kamu memenangkan undian!',
    body: 'Arisan RT 03 — Periode 3. Set tanggal pelaksanaan sekarang.',
    time: '5 menit lalu',
    cta: 'Set Tanggal',
  },
  {
    id: 2,
    read: false,
    kind: 'swap',
    icon: '🔄',
    bg: '#FAEEDA',
    fg: '#7A4D0E',
    title: 'Request tukar giliran',
    body: 'Rina Marlina ingin tukar giliran #8 dengan giliran #7 kamu',
    time: '1 jam lalu',
  },
  {
    id: 3,
    read: false,
    kind: 'chat',
    icon: '💬',
    bg: '#E8EEF8',
    fg: '#2C4A8A',
    title: 'Pesan baru di Arisan RT 03',
    body: 'Budi Santoso: "Reminder tagihan periode 4 mulai..."',
    time: '3 jam lalu',
  },
  {
    id: 4,
    read: true,
    kind: 'paid',
    icon: '✅',
    bg: '#E1F5EE',
    fg: '#136B4F',
    title: 'Pembayaran dikonfirmasi',
    body: 'Ketua mengkonfirmasi iuran Periode 3 kamu — Arisan Kantor',
    time: 'Kemarin, 14:30',
  },
  {
    id: 5,
    read: true,
    kind: 'reminder',
    icon: '⏰',
    bg: '#FAEEDA',
    fg: '#7A4D0E',
    title: 'Reminder tagihan',
    body: 'Iuran Arisan Keluarga Periode 7 jatuh tempo 3 hari lagi',
    time: 'Kemarin, 09:00',
  },
  {
    id: 6,
    read: true,
    kind: 'date',
    icon: '📅',
    bg: '#E8EEF8',
    fg: '#2C4A8A',
    title: 'Tanggal pelaksanaan dikonfirmasi',
    body: 'Siti Lestari set pelaksanaan Periode 3: Sabtu 15 Juni 2025',
    time: '2 hari lalu',
  },
];

export type RiwayatItem = {
  id: number;
  cat: 'pembayaran' | 'undian' | 'tukar' | 'perubahan';
  emoji: string;
  dot: string;
  title: string;
  desc: string;
  time: string;
};

export const RIWAYAT: RiwayatItem[] = [
  {
    id: 1,
    cat: 'pembayaran',
    emoji: '🟢',
    dot: '#1D9E75',
    title: 'Budi Santoso membayar iuran',
    desc: 'Periode 3 — dikonfirmasi ketua',
    time: '12 Jun, 09:15',
  },
  {
    id: 2,
    cat: 'undian',
    emoji: '🏆',
    dot: '#7F77DD',
    title: 'Undian Periode 3 selesai',
    desc: 'Pemenang: Siti Lestari (random sistem)',
    time: '10 Jun, 20:00',
  },
  {
    id: 3,
    cat: 'perubahan',
    emoji: '📅',
    dot: '#2C4A8A',
    title: 'Siti Lestari set tanggal pelaksanaan',
    desc: 'Sabtu, 15 Juni 2025 — terkunci',
    time: '10 Jun, 20:45',
  },
  {
    id: 4,
    cat: 'tukar',
    emoji: '🔄',
    dot: '#BA7517',
    title: 'Ketua mengubah urutan giliran',
    desc: 'Ani Rahayu ↔ Dewi Sartika · Alasan: permintaan anggota',
    time: '5 Jun, 14:30',
  },
  {
    id: 5,
    cat: 'pembayaran',
    emoji: '🔴',
    dot: '#993C1D',
    title: 'Joko Widodo belum bayar iuran',
    desc: 'Periode 2 — jatuh tempo terlewat',
    time: '31 Mei',
  },
  {
    id: 6,
    cat: 'undian',
    emoji: '🏆',
    dot: '#7F77DD',
    title: 'Undian Periode 2 selesai',
    desc: 'Pemenang: Ani Rahayu',
    time: '28 Mei, 19:30',
  },
  {
    id: 7,
    cat: 'pembayaran',
    emoji: '🟢',
    dot: '#1D9E75',
    title: 'Siti Lestari membayar iuran',
    desc: 'Periode 2 — dikonfirmasi ketua',
    time: '25 Mei, 11:20',
  },
  {
    id: 8,
    cat: 'perubahan',
    emoji: '🎉',
    dot: '#8A8A86',
    title: 'Grup Arisan RT 03 dibuat',
    desc: 'Dibuat oleh Budi Santoso (Ketua)',
    time: '1 Jan 2025',
  },
];

export const SWAP_CANDIDATES = [
  { id: 'rina', name: 'Rina Marlina', period: 8, eligible: true },
  { id: 'hendra', name: 'Hendra Wijaya', period: 9, eligible: true },
  { id: 'dewi', name: 'Dewi Sartika', period: 10, eligible: true },
  {
    id: 'budi',
    name: 'Budi Santoso',
    period: 1,
    eligible: false,
    reason: 'Sudah menang (Periode 1)',
  },
  {
    id: 'ani',
    name: 'Ani Rahayu',
    period: 2,
    eligible: false,
    reason: 'Sudah menang (Periode 2)',
  },
] as const;

export const ELIGIBLE_FOR_UNDIAN = [
  'Joko Widodo',
  'Dewi Sartika',
  'Agus Prasetyo',
  'Rina Marlina',
  'Hendra Wijaya',
];
