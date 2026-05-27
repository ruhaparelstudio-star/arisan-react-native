import type { Firestore } from 'firebase-admin/firestore';

// Hilangkan karakter ambigu (O, 0, 1, I) supaya kode mudah dibaca user.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export async function generateInviteCode(
  db: Firestore,
  length = 7,
  maxRetry = 10,
): Promise<string> {
  for (let i = 0; i < maxRetry; i++) {
    let code = '';
    for (let j = 0; j < length; j++) {
      code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
    const dup = await db.collection('groups').where('inviteCode', '==', code).limit(1).get();
    if (dup.empty) return code;
  }
  throw new Error('Gagal generate invite code unik setelah retry');
}
