import { HttpsError } from 'firebase-functions/v2/https';
import { db } from './firestore';

type MemberSnapshot = {
  userId: string;
  nama: string;
  role: 'ketua' | 'anggota';
};

export async function assertMember(uid: string, groupId: string): Promise<MemberSnapshot> {
  const memberSnap = await db
    .collection('groups')
    .doc(groupId)
    .collection('members')
    .doc(uid)
    .get();
  if (!memberSnap.exists) {
    throw new HttpsError('permission-denied', 'Bukan anggota grup');
  }
  const data = memberSnap.data() as MemberSnapshot | undefined;
  if (!data) throw new HttpsError('permission-denied', 'Data anggota tidak valid');
  return data;
}

export async function assertKetua(uid: string, groupId: string): Promise<MemberSnapshot> {
  const member = await assertMember(uid, groupId);
  if (member.role !== 'ketua') {
    throw new HttpsError('permission-denied', 'Hanya ketua yang bisa melakukan aksi ini');
  }
  return member;
}
