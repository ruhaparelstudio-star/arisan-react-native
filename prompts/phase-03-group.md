# Phase 3 — Group Management

**Session type:** New Claude Code session. Paste this entire file as your first message.

---

## 🎯 Goal

User dapat: (1) buat grup arisan dengan setup awal (nama, nominal, frekuensi, jumlah periode), (2) generate invite kode + share deep link, (3) join grup via kode atau deep link, (4) lihat dashboard list grup yang diikuti — wired ke Firestore (no more mock).

---

## 📋 Prerequisites

- Phase 1 & 2 complete & merged ke `main`
- User test number bisa login → masuk Beranda (verifikasi: open dev client, login pakai test number)
- Verifikasi Cloud Function `helloWorld` dan `rateLimitOTP` masih deployed di `arisan-dev`

---

## 📚 Required reading

1. **CLAUDE.md**:
   - §4 Domain Model — `groups/{groupId}` + `/members/{userId}`
   - §5 F02 Manajemen Grup
   - §6 Security (deny all client write ke groups & members — semua via Cloud Function)
   - §18 Cloud Functions template
   - §25.2 Deep link route table (untuk join via link)
   - §25.4 Invite link format
   - §27 Week 3 checklist
2. **PRD §4.2 F02** — spec lengkap manajemen grup
3. **File existing**:
   - [app/(tabs)/index.tsx](../app/(tabs)/index.tsx) — Beranda saat ini pakai `GROUPS` mock. FAB di line 99 `onPress={() => {}}` — kosong, perlu wire.
   - [src/data/mock.ts](../src/data/mock.ts) — `GROUPS` array, akan diganti Firestore query
   - [app/pengaturan.tsx](../app/pengaturan.tsx) — tombol "Tambah Anggota via Link" line ~106, perlu wire ke generate invite

---

## 🏗️ Tasks

### Task 1 — Shared types untuk Group & Member

Update [functions/shared/types.ts](../functions/shared/types.ts):

```ts
export type Role = 'ketua' | 'anggota';
export type PaymentStatus = 'belum' | 'lunas' | 'terlambat';
export type GroupStatus = 'active' | 'dissolved' | 'completed';
export type Frekuensi = 'mingguan' | 'bulanan';
export type UndianMode = 'mode1' | 'mode3';  // mode1 = pre-determined, mode3 = hybrid

export type Group = {
  id: string;
  nama: string;
  nominal: number;             // rupiah, integer
  frekuensi: Frekuensi;
  jumlahPeriode: number;       // mis. 12
  tanggalMulai: number;        // epoch ms (UTC)
  status: GroupStatus;
  undianMode: UndianMode;      // ditentukan saat create
  ketuaId: string;             // userId ketua
  inviteCode: string;          // 7 char, mis. "RT03-X9K"
  periodeAktif: number;        // 1..jumlahPeriode
  createdAt: number;
};

export type Member = {
  userId: string;
  nama: string;                // snapshot dari users.nama saat join (bukan join time read)
  role: Role;
  giliran: number;             // urutan menang, 1..jumlahPeriode (0 jika belum ditentukan)
  sudahMenang: boolean;
  jumlahTukar: number;         // 0..2 (max 2 per PRD F06)
  joinedAt: number;
};
```

### Task 2 — Cloud Function `createGroup`

[functions/src/callable/createGroup.ts](../functions/src/callable/createGroup.ts):

```ts
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from '../lib/firestore';
import { generateInviteCode } from '../lib/invite';
import admin from 'firebase-admin';

export const createGroup = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Wajib login');
  
  const { nama, nominal, frekuensi, jumlahPeriode, undianMode, tanggalMulai } = req.data ?? {};
  
  // Validate
  if (typeof nama !== 'string' || nama.trim().length < 3) {
    throw new HttpsError('invalid-argument', 'Nama grup minimal 3 karakter');
  }
  if (typeof nominal !== 'number' || nominal < 1000) {
    throw new HttpsError('invalid-argument', 'Nominal minimal Rp 1.000');
  }
  if (!['mingguan', 'bulanan'].includes(frekuensi)) {
    throw new HttpsError('invalid-argument', 'Frekuensi harus mingguan atau bulanan');
  }
  if (typeof jumlahPeriode !== 'number' || jumlahPeriode < 2 || jumlahPeriode > 50) {
    throw new HttpsError('invalid-argument', 'Jumlah periode 2-50');
  }
  if (!['mode1', 'mode3'].includes(undianMode)) {
    throw new HttpsError('invalid-argument', 'Undian mode harus mode1 atau mode3');
  }
  if (typeof tanggalMulai !== 'number') {
    throw new HttpsError('invalid-argument', 'Tanggal mulai wajib epoch ms');
  }
  
  const uid = req.auth.uid;
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists) throw new HttpsError('not-found', 'Profil user tidak ditemukan');
  const userNama = userDoc.data()?.nama as string;
  
  const inviteCode = await generateInviteCode(db);  // ensure unique
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
    
    // Activity log
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
```

### Task 3 — Helper invite code generator

[functions/src/lib/invite.ts](../functions/src/lib/invite.ts):

```ts
import { Firestore } from 'firebase-admin/firestore';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  // hilangkan O, 0, 1, I — ambigu

export async function generateInviteCode(db: Firestore, length = 7, maxRetry = 10): Promise<string> {
  for (let i = 0; i < maxRetry; i++) {
    let code = '';
    for (let j = 0; j < length; j++) {
      code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
    // Cek unique
    const dup = await db.collection('groups').where('inviteCode', '==', code).limit(1).get();
    if (dup.empty) return code;
  }
  throw new Error('Gagal generate invite code unik setelah retry');
}
```

**Catatan:** `Math.random()` di sini OK karena server-side untuk invite code (bukan untuk pilih pemenang). Invite code bukan security-sensitive secret — kalau ada collision akan retry.

### Task 4 — Cloud Function `joinViaCode`

[functions/src/callable/joinViaCode.ts](../functions/src/callable/joinViaCode.ts):

```ts
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from '../lib/firestore';
import admin from 'firebase-admin';

export const joinViaCode = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Wajib login');
  
  const code = (req.data?.code as string | undefined)?.toUpperCase().trim();
  if (!code || code.length !== 7) {
    throw new HttpsError('invalid-argument', 'Kode invite tidak valid');
  }
  
  const uid = req.auth.uid;
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists) throw new HttpsError('not-found', 'Profil user tidak ditemukan');
  const userNama = userDoc.data()?.nama as string;
  
  // Find group
  const groupSnap = await db.collection('groups').where('inviteCode', '==', code).limit(1).get();
  if (groupSnap.empty) throw new HttpsError('not-found', 'Kode tidak ditemukan');
  const groupDoc = groupSnap.docs[0];
  const group = groupDoc.data();
  
  if (group.status !== 'active') {
    throw new HttpsError('failed-precondition', 'Grup sudah tidak aktif');
  }
  
  // Cek apakah sudah member
  const memberRef = groupDoc.ref.collection('members').doc(uid);
  const memberSnap = await memberRef.get();
  if (memberSnap.exists) {
    return { groupId: groupDoc.id, alreadyMember: true };
  }
  
  // Cek apakah arisan sudah mulai (periode > 1) — tidak boleh join setelah mulai (MVP)
  if (group.periodeAktif > 1) {
    throw new HttpsError('failed-precondition', 'Arisan sudah berjalan, tidak bisa join lagi');
  }
  
  // Cek kuota
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
```

Export keduanya di [functions/src/index.ts](../functions/src/index.ts). Deploy: `firebase deploy --only functions:createGroup,functions:joinViaCode --project dev`.

### Task 5 — Firestore rules untuk groups & members

Update [firestore.rules](../firestore.rules) — tambahkan **sebelum** default deny:

```
// Helper
function isMember(groupId) {
  return exists(/databases/$(database)/documents/groups/$(groupId)/members/$(request.auth.uid));
}

// groups — semua anggota read, no client write
match /groups/{groupId} {
  allow read: if request.auth != null && isMember(groupId);
  allow write: if false;  // hanya Cloud Function
  
  match /members/{memberId} {
    allow read: if request.auth != null && isMember(groupId);
    allow write: if false;
  }
  
  match /activityLog/{logId} {
    allow read: if request.auth != null && isMember(groupId);
    allow write, delete: if false;  // append-only via Cloud Function
  }
}
```

Deploy rules. **Test manual:** dari client coba `firestore().collection('groups').add({})` — harus fail dengan permission-denied.

### Task 6 — Zustand groups store

[src/stores/groups.ts](../src/stores/groups.ts):

```ts
import { create } from 'zustand';
import { firestore } from '@/services/firebase';
import type { Group } from '@arisan/shared/types';  // setup path alias jika belum

type GroupsState = {
  groups: (Group & { id: string })[];
  loading: boolean;
  unsubscribe: (() => void) | null;
  subscribe: (uid: string) => void;
  unsubscribeAll: () => void;
};

export const useGroupsStore = create<GroupsState>((set, get) => ({
  groups: [],
  loading: true,
  unsubscribe: null,
  
  subscribe: (uid) => {
    // Get all groups where this user is a member
    // Firestore RN doesn't support collection group query without index — pakai approach: query memberships
    const unsub = firestore()
      .collectionGroup('members')
      .where('userId', '==', uid)
      .onSnapshot(async (snap) => {
        const groupIds = snap.docs.map((d) => d.ref.parent.parent!.id);
        if (groupIds.length === 0) {
          set({ groups: [], loading: false });
          return;
        }
        // Fetch group docs (batched, max 10 per `in` query)
        const groupDocs = await Promise.all(
          chunked(groupIds, 10).map((chunk) =>
            firestore().collection('groups').where(firestore.FieldPath.documentId(), 'in', chunk).get()
          )
        );
        const groups = groupDocs.flatMap((s) => s.docs.map((d) => ({ id: d.id, ...(d.data() as Group) })));
        set({ groups, loading: false });
      }, (err) => {
        console.error('groups subscribe error', err);
        set({ loading: false });
      });
    set({ unsubscribe: unsub });
  },
  
  unsubscribeAll: () => {
    get().unsubscribe?.();
    set({ unsubscribe: null, groups: [], loading: true });
  },
}));

function chunked<T>(arr: T[], size: number): T[][] {
  return arr.length ? [arr.slice(0, size), ...chunked(arr.slice(size), size)] : [];
}
```

**Index requirement:** `collectionGroup('members') where userId == X` butuh composite index untuk collection group query. Tambah ke [firestore.indexes.json](../firestore.indexes.json):

```json
{
  "indexes": [
    {
      "collectionGroup": "members",
      "queryScope": "COLLECTION_GROUP",
      "fields": [{ "fieldPath": "userId", "order": "ASCENDING" }]
    }
  ],
  "fieldOverrides": []
}
```

Deploy: `firebase deploy --only firestore:indexes --project dev`.

Subscribe groups saat user login (di `app/_layout.tsx` setelah `setUser`).

### Task 7 — Wire dashboard [app/(tabs)/index.tsx](../app/(tabs)/index.tsx) ke Firestore

Replace mock data:
- Hapus `import { GROUPS, Group } from '@/data/mock';` (data mock di-keep dulu untuk reference, hapus di Phase 8)
- Ganti dengan `const { groups, loading } = useGroupsStore();`
- Render skeleton loading saat `loading`, render empty state ("Belum ada grup. Tap + untuk buat grup pertama") saat `groups.length === 0`
- Tetap pakai existing `GroupCard` component, mapping fields:
  - `group.name` → `group.nama`
  - `group.period` → `${group.periodeAktif}/${group.jumlahPeriode}`
  - `group.iuran` → `group.nominal`
  - `group.status` → derive dari payment status user di periode aktif (Phase 4) — sementara hardcode `'Belum'`
  - `group.myTurn` → derive: `member.giliran === group.periodeAktif` (perlu join query, sementara `false`)

**FAB** line 99 — wire onPress: `router.push('/grup/baru')`

### Task 8 — Screen "Buat Grup"

[app/grup/baru.tsx](../app/grup/baru.tsx):

Sequential form (atau single screen scroll):
1. **Nama grup** — TextInput, min 3 char
2. **Nominal iuran** — TextInput numeric dengan formatter Rupiah real-time (Rp 500.000)
3. **Frekuensi** — 2 radio: Mingguan / Bulanan
4. **Jumlah periode** — Stepper 2..50 (default sama dengan jumlah anggota target)
5. **Tanggal mulai** — Date picker (calendar reuse logic dari [app/set-date.tsx](../app/set-date.tsx), tapi standalone fresh dayjs)
6. **Mode undian** — 2 radio dengan deskripsi:
   - **Mode 1 — Urutan ditentukan di awal**: "Semua pemenang random sekali, urutan fixed sampai arisan selesai. Cocok untuk grup yang ingin tahu kapan dapat giliran sejak awal."
   - **Mode 3 — Hybrid**: "Periode pertama random dari semua, periode berikutnya random dari yang belum menang. Cocok untuk yang ingin surprise tiap periode."

Submit → `httpsCallable('createGroup')({...})` → on success: navigate `/grup/[id]/invite` (next task) untuk share invite code.

Reuse komponen [src/components/](../src/components/): `Button`, `Header`, `Toast`.

### Task 9 — Screen Invite (share)

[app/grup/[id]/invite.tsx](../app/grup/%5Bid%5D/invite.tsx):

- Tampilkan invite code besar dengan styling code-block (mis. `RT03-X9K` dipisah dash di tengah)
- Tombol "Copy Kode" → `Clipboard.setStringAsync(code)` + toast "Kode disalin"
- Tombol "Bagikan Link" → `Share.share({ message: \`Yuk gabung arisan! Pakai kode ${code} atau klik: arisan://join/${code}\` })`
- Tombol "Lanjut ke Grup" → `router.replace('/group/${id}')`
- Hint: "Bagikan ke calon anggota. Mereka bisa join via kode atau tap link."

### Task 10 — Screen Join via kode

[app/grup/join.tsx](../app/grup/join.tsx):

- TextInput uppercase autoFocus, autoCapitalize "characters", placeholder "Masukkan kode invite"
- Validasi format 7 char A-Z 2-9
- Tombol "Cek & Gabung" → `httpsCallable('joinViaCode')({ code })` → on success router push ke `/group/[id]`
- Tombol "Atau scan QR" (placeholder, QR scanner Phase 2 atau out of scope MVP)

Tambahkan entry di profil menu atau FAB Beranda untuk akses screen ini ("Gabung grup dengan kode").

### Task 11 — Deep link handler `arisan://join/{code}`

Di [app/_layout.tsx](../app/_layout.tsx), tambahkan:

```ts
import * as Linking from 'expo-linking';

useEffect(() => {
  const handleUrl = (url: string) => {
    const { hostname, path } = Linking.parse(url);
    if (hostname === 'join' && path) {
      const code = path.replace('/', '');
      // Pastikan user sudah login, kalau belum simpan code dan resume setelah login
      if (useAuthStore.getState().user) {
        router.push(`/grup/join?code=${code}`);
      } else {
        AsyncStorage.setItem('pendingInviteCode', code);  // resume setelah consent
      }
    }
  };
  Linking.getInitialURL().then((url) => url && handleUrl(url));
  const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
  return () => sub.remove();
}, []);
```

Update join screen untuk auto-fill kode dari `router.params.code` jika ada.

### Task 12 — Wire pengaturan "Tambah Anggota via Link"

[app/pengaturan.tsx](../app/pengaturan.tsx) line ~106 — tombol "Tambah Anggota via Link" saat ini tanpa handler.

Wire onPress: load invite code dari Firestore (`groups/{groupId}.inviteCode`) → tampilkan modal share (reuse logic Task 9 atau navigate ke `/grup/[id]/invite`).

---

## ✅ Definition of Done

- [ ] Cloud Functions `createGroup`, `joinViaCode` deployed
- [ ] Firestore rules `groups`, `members`, `activityLog` deployed dan tested (client direct write deny)
- [ ] Firestore index `members collectionGroup userId` deployed
- [ ] Zustand `groupsStore` subscribe & unsubscribe properly (subscribe on login, unsub on logout)
- [ ] Dashboard pakai real Firestore data, empty state tampil saat 0 grup
- [ ] FAB wired ke `/grup/baru`
- [ ] Buat grup end-to-end: form → Cloud Function → invite screen → grup ada di dashboard
- [ ] Join grup via kode end-to-end (test pakai 2 test phone number)
- [ ] Deep link `arisan://join/{code}` working — test dari adb shell:
  ```bash
  adb shell am start -W -a android.intent.action.VIEW -d "arisan://join/ABC1234"
  ```
- [ ] Pengaturan "Tambah Anggota via Link" tombol wired
- [ ] `npm run lint && npm run typecheck` green
- [ ] CLAUDE.md §1.5: coret screen "Buat Grup", "Invite", "Join via kode" dari gap list
- [ ] Branch `feat/phase-03-group` + PR opened

---

## 🧪 Acceptance Criteria

- [ ] User dapat buat grup baru dengan setup wajib (nama, nominal, frekuensi, jumlah periode, mode undian)
- [ ] Invite code unique, 7 char, share via system share sheet works
- [ ] Anggota dapat join via kode atau deep link
- [ ] Tidak bisa join grup yang sudah berjalan (periodeAktif > 1) atau sudah penuh
- [ ] Ketua otomatis jadi member pertama dengan role `ketua`

---

## ❌ Out of scope Phase 3

- ❌ JANGAN implement Mode 1 pre-determined urutan generation — Phase 5
- ❌ JANGAN buat payment data — Phase 4
- ❌ JANGAN implement edit grup (nama, nominal) — Phase 2 out of scope; kalau urgent flag ke user
- ❌ JANGAN ubah pengaturan.tsx selain wire tombol Tambah Anggota — hapus member flow sudah ada UI, wire ke Cloud Function di Phase 7
- ❌ JANGAN auto-leave grup yang user keluar — Phase 2 PRD out of scope

---

## 🚨 Common pitfalls

1. **Lupa snapshot `userNama` saat join** — jika user ganti nama nanti, snapshot lama tetap. Trade-off: ketua tidak perlu re-query users untuk render member list (mengurangi reads). Acceptable per PRD.
2. **Direct write ke `groups/...` dari client** — security rules harus deny. Test manual sebelum claim done.
3. **Collection group query tanpa index** — akan error runtime. Pastikan `firebase deploy --only firestore:indexes` jalan.
4. **Deep link race condition** — user buka link sebelum login. Simpan pending code di AsyncStorage, consume di handler post-consent.
5. **Invite code collision** — generator harus retry. Test edge case dengan mock `Math.random` di unit test (kalau ada).

---

## 🤔 When to ask user

- Sebelum deploy index (collection group) — informasikan butuh ~5 menit build di Firebase Console
- Jika design "Buat Grup" screen ambigu (mis. step-by-step wizard vs single scroll form) — tanya preferensi user
- Jika ingin set `tanggalMulai` minimum H+1 atau bebas — default H+1 (mencegah create grup dengan tanggal lampau)

---

## 📦 Commit message

```
feat(group): implement group create/join/dashboard wiring

- Add createGroup, joinViaCode Cloud Functions
- Add screens: buat grup, invite share, join via code
- Wire dashboard to Firestore via groupsStore (Zustand)
- Handle deep link arisan://join/{code}
- Update Firestore rules + collection group index for members
- Wire FAB and pengaturan invite button

Acceptance: PRD §4.2 F02
Refs: CLAUDE.md §27 Week 3, fixes §1.5 missing screens (Buat Grup, Invite, Join)
```
