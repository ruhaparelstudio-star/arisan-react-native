import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db, admin } from '../lib/firestore';
import { assertKetua } from '../lib/auth';
import { randomPick } from '../lib/random';
import { sendNotif } from '../lib/notif';

type EligibleMember = {
  userId: string;
  nama: string;
  sudahMenang: boolean;
};

export const triggerUndian = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Wajib login');

  const { groupId, periodeId, method = 'random', manualWinnerId, alasan } = req.data ?? {};
  if (!groupId || typeof groupId !== 'string') {
    throw new HttpsError('invalid-argument', 'groupId wajib');
  }
  if (!periodeId || typeof periodeId !== 'string') {
    throw new HttpsError('invalid-argument', 'periodeId wajib');
  }

  if (method !== 'random' && method !== 'manual' && method !== 'offline') {
    throw new HttpsError('invalid-argument', 'method invalid');
  }

  if (method === 'manual' || method === 'offline') {
    if (!manualWinnerId || typeof manualWinnerId !== 'string') {
      throw new HttpsError('invalid-argument', 'manualWinnerId wajib untuk method manual/offline');
    }
    if (!alasan || typeof alasan !== 'string' || alasan.trim().length === 0) {
      throw new HttpsError('invalid-argument', 'Alasan wajib diisi untuk metode manual/offline');
    }
  }

  const ketua = await assertKetua(req.auth.uid, groupId);
  const groupRef = db.collection('groups').doc(groupId);
  const uid = req.auth.uid;

  const result = await db.runTransaction(async (tx) => {
    const groupSnap = await tx.get(groupRef);
    const group = groupSnap.data();
    if (!group) throw new HttpsError('not-found', 'Grup tidak ditemukan');

    const winnerRef = groupRef.collection('winners').doc(periodeId);
    const winnerSnap = await tx.get(winnerRef);
    if (winnerSnap.exists) {
      throw new HttpsError('failed-precondition', 'Pemenang sudah ditentukan');
    }

    const membersSnap = await tx.get(
      groupRef.collection('members').where('sudahMenang', '==', false),
    );
    if (membersSnap.empty) {
      throw new HttpsError('failed-precondition', 'Semua anggota sudah menang');
    }
    const eligible: EligibleMember[] = membersSnap.docs.map((d) => ({
      userId: d.id,
      ...(d.data() as Omit<EligibleMember, 'userId'>),
    }));

    let winner: EligibleMember;
    if (method === 'random') {
      winner = randomPick(eligible);
    } else {
      const found = eligible.find((m) => m.userId === manualWinnerId);
      if (!found) {
        throw new HttpsError('invalid-argument', 'Anggota tidak ditemukan atau sudah menang');
      }
      winner = found;
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const trimmedAlasan = typeof alasan === 'string' ? alasan.trim() : undefined;

    tx.set(winnerRef, {
      periodeId,
      userId: winner.userId,
      nama: winner.nama,
      decidedAt: now,
      method,
      decidedBy: uid,
      ...(trimmedAlasan ? { alasan: trimmedAlasan } : {}),
    });

    tx.update(groupRef.collection('members').doc(winner.userId), {
      sudahMenang: true,
      giliran: parseInt(periodeId, 10),
    });

    tx.set(groupRef.collection('activityLog').doc(), {
      type: 'undian_done',
      actorId: uid,
      actorNama: ketua.nama,
      timestamp: now,
      metadata: {
        periodeId,
        winnerId: winner.userId,
        winnerNama: winner.nama,
        method,
        ...(trimmedAlasan ? { alasan: trimmedAlasan } : {}),
      },
    });

    return winner;
  });

  // Notif di luar transaction
  const membersSnap = await groupRef.collection('members').get();
  const periodeNum = parseInt(periodeId, 10);
  await Promise.all(
    membersSnap.docs.map(async (m) => {
      const userDoc = await db.collection('users').doc(m.id).get();
      const token = userDoc.data()?.expoPushToken as string | undefined;
      if (!token) return;
      const isWinner = m.id === result.userId;
      await sendNotif({
        token,
        title: isWinner ? 'Selamat! Kamu menang undian 🎉' : 'Pemenang undian sudah diumumkan',
        body: isWinner
          ? `Kamu pemenang periode ${periodeNum}. Set tanggal pelaksanaan sekarang.`
          : `${result.nama} memenangkan periode ${periodeNum}`,
        data: {
          type: 'winner',
          route: isWinner
            ? `arisan://winner?groupId=${groupId}&periode=${periodeId}`
            : `arisan://group/${groupId}?tab=urutan`,
        },
        dedupKey: `undian_${groupId}_${periodeId}_${m.id}`,
      });
    }),
  );

  return { ok: true, winnerId: result.userId, winnerNama: result.nama };
});
