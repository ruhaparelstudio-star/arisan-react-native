// Shared types antara client & Cloud Functions

export type Role = 'ketua' | 'anggota';
export type PaymentStatus = 'belum' | 'lunas' | 'terlambat';
export type GroupStatus = 'active' | 'dissolved' | 'completed';
export type Frekuensi = 'mingguan' | 'bulanan';
export type UndianMode = 'mode1' | 'mode3'; // mode1 = pre-determined, mode3 = hybrid

export type Group = {
  id: string;
  nama: string;
  nominal: number; // rupiah, integer
  frekuensi: Frekuensi;
  jumlahPeriode: number; // mis. 12
  tanggalMulai: number; // epoch ms (UTC)
  status: GroupStatus;
  undianMode: UndianMode;
  ketuaId: string; // userId ketua
  inviteCode: string; // 7 char, mis. "RT03X9K"
  periodeAktif: number; // 1..jumlahPeriode
  createdAt: number;
};

export type Member = {
  userId: string;
  nama: string; // snapshot dari users.nama saat join
  role: Role;
  giliran: number; // urutan menang, 1..jumlahPeriode (0 jika belum ditentukan)
  sudahMenang: boolean;
  jumlahTukar: number; // 0..2 (max 2 per PRD F06)
  joinedAt: number;
};

export type UndianMethod = 'random' | 'manual' | 'offline';

export type Winner = {
  periodeId: string; // "01", "02", ... padded
  userId: string;
  nama: string;
  decidedAt: number;
  method: UndianMethod;
  decidedBy: string; // ketua userId
  alasan?: string; // wajib jika method = manual/offline
  // Untuk Mode 1 entries, decidedBy adalah ketua yang trigger generate, decidedAt sama untuk semua
};
