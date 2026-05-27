// Mapping Firebase Auth & rateLimitOTP HttpsError → Bahasa Indonesia (Phase 2 §Task 9)
const FIREBASE_AUTH_MESSAGES: Record<string, string> = {
  'auth/invalid-phone-number': 'Format nomor HP tidak valid',
  'auth/too-many-requests': 'Terlalu banyak percobaan, coba lagi nanti',
  'auth/invalid-verification-code': 'Kode OTP salah',
  'auth/code-expired': 'Kode OTP sudah expired, minta kirim ulang',
  'auth/missing-verification-code': 'Kode OTP belum diisi',
  'auth/network-request-failed': 'Koneksi bermasalah, periksa jaringan kamu',
  'auth/quota-exceeded': 'Kuota SMS tercapai, coba lagi nanti',
  'auth/session-expired': 'Sesi OTP sudah expired, minta kirim ulang',
  'functions/resource-exhausted': 'Terlalu banyak percobaan, coba lagi nanti',
  'functions/invalid-argument': 'Format nomor HP tidak valid',
};

export function authErrorMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    const code = (err as { code?: string }).code;
    if (code && FIREBASE_AUTH_MESSAGES[code]) return FIREBASE_AUTH_MESSAGES[code];
    const message = (err as { message?: string }).message;
    if (typeof message === 'string' && message.length > 0) return message;
  }
  return 'Terjadi kesalahan, coba lagi';
}
