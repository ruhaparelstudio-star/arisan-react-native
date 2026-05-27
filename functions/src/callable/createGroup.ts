import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db, admin } from '../lib/firestore';
import { generateInviteCode } from '../lib/invite';

export const createGroup = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Wajib login');

  const { nama, nominal, frekuensi, jumlahPeriode, undianMode, tanggalMulai } = req.data ?? {};

  if (typeof nama !== 'string' || nama.trim().length < 3) {
    throw new HttpsError('invalid-argument', 'Nama grup minimal 3 karakter');
  }
  if (typeof nominal !== 'number' || !Number.isFinite(nominal) || nominal < 1000) {
    throw new HttpsError('invalid-argument', 'Nominal minimal Rp 1.000');
  }
  if (frekuensi !== 'mingguan' && frekuensi !== 'bulanan') {
    throw new HttpsError('invalid-argument', 'Frekuensi harus mingguan atau bulanan');
  }
  if (
    typeof jumlahPeriode !== 'number' ||
    !Number.isInteger(jumlahPeriode) ||
    jumlahPeriode < 2 ||
    jumlahPeriode > 50
  ) {
    throw new HttpsError('invalid-argument', 'Jumlah periode 2-50');
  }
  if (undianMode !== 'mode1' && undianMode !== 'mode3') {
    throw new HttpsError('invalid-argument', 'Undian mode harus mode1 atau mode3');
  }
  if (typeof tanggalMulai !== 'number' || !Number.isFinite(tanggalMulai)) {
    throw new HttpsError('invalid-argument', 'Tanggal mulai wajib epoch ms');
  }

  const uid = req.auth.uid;
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists) throw new HttpsError('not-found', 'Profil user tidak ditemukan');
  const userNama = userDoc.data()?.nama as string | undefined;
  if (!userNama) throw new HttpsError('failed-precondition', 'Nama user belum diset');

  const inviteCode = await generateInviteCode(db);
  const groupRef = db.collection('groups').doc();

  await db.runTransaction(async (tx) => {
    tx.set(groupRef, {
      nama: nama.trim(),
      nominal,
      frekuensi,
      jumlahPeriode,
      tanggalMulai,
      status: 'active',
      undianMode,
      ketuaId: uid,
      inviteCode,
      periodeAktif: 1,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    tx.set(groupRef.collection('members').doc(uid), {
      userId: uid,
      nama: userNama,
      role: 'ketua',
      giliran: 0,
      sudahMenang: false,
      jumlahTukar: 0,
      joinedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    tx.set(groupRef.collection('activityLog').doc(), {
      type: 'group_created',
      actorId: uid,
      actorNama: userNama,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      metadata: { undianMode, jumlahPeriode },
    });
  });

  return { groupId: groupRef.id, inviteCode };
});
