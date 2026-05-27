import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db, admin } from '../lib/firestore';

export const joinViaCode = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Wajib login');

  const code = (req.data?.code as string | undefined)?.toUpperCase().trim();
  if (!code || code.length !== 7) {
    throw new HttpsError('invalid-argument', 'Kode invite tidak valid');
  }

  const uid = req.auth.uid;
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists) throw new HttpsError('not-found', 'Profil user tidak ditemukan');
  const userNama = userDoc.data()?.nama as string | undefined;
  if (!userNama) throw new HttpsError('failed-precondition', 'Nama user belum diset');

  const groupSnap = await db.collection('groups').where('inviteCode', '==', code).limit(1).get();
  if (groupSnap.empty) throw new HttpsError('not-found', 'Kode tidak ditemukan');
  const groupDoc = groupSnap.docs[0];
  const group = groupDoc.data();

  if (group.status !== 'active') {
    throw new HttpsError('failed-precondition', 'Grup sudah tidak aktif');
  }

  const memberRef = groupDoc.ref.collection('members').doc(uid);
  const memberSnap = await memberRef.get();
  if (memberSnap.exists) {
    return { groupId: groupDoc.id, alreadyMember: true };
  }

  // Tidak boleh join setelah arisan sudah berjalan (MVP).
  if (typeof group.periodeAktif === 'number' && group.periodeAktif > 1) {
    throw new HttpsError('failed-precondition', 'Arisan sudah berjalan, tidak bisa join lagi');
  }

  const membersCount = (await groupDoc.ref.collection('members').count().get()).data().count;
  if (membersCount >= group.jumlahPeriode) {
    throw new HttpsError('failed-precondition', 'Grup sudah penuh');
  }

  await db.runTransaction(async (tx) => {
    tx.set(memberRef, {
      userId: uid,
      nama: userNama,
      role: 'anggota',
      giliran: 0,
      sudahMenang: false,
      jumlahTukar: 0,
      joinedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    tx.set(groupDoc.ref.collection('activityLog').doc(), {
      type: 'member_joined',
      actorId: uid,
      actorNama: userNama,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      metadata: {},
    });
  });

  return { groupId: groupDoc.id, alreadyMember: false };
});
