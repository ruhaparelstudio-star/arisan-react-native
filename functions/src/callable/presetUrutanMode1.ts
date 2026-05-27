import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db, admin } from '../lib/firestore';
import { assertKetua } from '../lib/auth';
import { randomShuffle } from '../lib/random';

export const presetUrutanMode1 = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Wajib login');
  const { groupId } = req.data ?? {};
  if (!groupId || typeof groupId !== 'string') {
    throw new HttpsError('invalid-argument', 'groupId wajib');
  }

  const ketua = await assertKetua(req.auth.uid, groupId);

  const groupRef = db.collection('groups').doc(groupId);
  const groupSnap = await groupRef.get();
  const group = groupSnap.data();
  if (!group) throw new HttpsError('not-found', 'Grup tidak ditemukan');
  if (group.undianMode !== 'mode1') {
    throw new HttpsError('failed-precondition', 'Grup ini bukan Mode 1');
  }

  const membersSnap = await groupRef.collection('members').get();
  if (membersSnap.size !== group.jumlahPeriode) {
    throw new HttpsError(
      'failed-precondition',
      `Jumlah anggota (${membersSnap.size}) harus sama dengan jumlah periode (${group.jumlahPeriode}) sebelum preset`,
    );
  }

  const winnersSnap = await groupRef.collection('winners').limit(1).get();
  if (!winnersSnap.empty) {
    throw new HttpsError(
      'failed-precondition',
      'Urutan sudah pernah di-generate, tidak bisa ulang',
    );
  }

  const userIds = membersSnap.docs.map((d) => d.id);
  const shuffled = randomShuffle(userIds);
  const uid = req.auth.uid;

  await db.runTransaction(async (tx) => {
    const now = admin.firestore.FieldValue.serverTimestamp();

    for (let i = 0; i < shuffled.length; i++) {
      const periodeId = String(i + 1).padStart(2, '0');
      const userId = shuffled[i];
      const memberData = membersSnap.docs.find((d) => d.id === userId)!.data();

      tx.set(groupRef.collection('winners').doc(periodeId), {
        periodeId,
        userId,
        nama: memberData.nama,
        decidedAt: now,
        method: 'random',
        decidedBy: uid,
      });

      tx.update(groupRef.collection('members').doc(userId), {
        giliran: i + 1,
      });
    }

    tx.set(groupRef.collection('activityLog').doc(), {
      type: 'urutan_preset_mode1',
      actorId: uid,
      actorNama: ketua.nama,
      timestamp: now,
      metadata: { jumlah: shuffled.length },
    });
  });

  return { ok: true, jumlah: shuffled.length };
});
