import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db, admin } from '../lib/firestore';

const MAX_PER_HOUR = 5;
const WINDOW_MS = 60 * 60 * 1000;

export const rateLimitOTP = onCall(async (req) => {
  const phone = req.data?.phone as string | undefined;
  if (!phone || !/^\+62\d{8,13}$/.test(phone)) {
    throw new HttpsError('invalid-argument', 'Format nomor HP tidak valid');
  }

  const docRef = db.collection('otpQuota').doc(phone);
  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    const now = Date.now();
    const data = snap.data();
    const attempts: number[] = (data?.attempts ?? []).filter((t: number) => now - t < WINDOW_MS);
    if (attempts.length >= MAX_PER_HOUR) {
      return { allowed: false as const, retryAfterMs: WINDOW_MS - (now - attempts[0]) };
    }
    attempts.push(now);
    tx.set(docRef, {
      attempts,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { allowed: true as const };
  });

  if (!result.allowed) {
    const minutes = Math.ceil(result.retryAfterMs / 60000);
    throw new HttpsError(
      'resource-exhausted',
      `Terlalu banyak percobaan. Coba lagi dalam ${minutes} menit`,
    );
  }
  return { ok: true };
});
