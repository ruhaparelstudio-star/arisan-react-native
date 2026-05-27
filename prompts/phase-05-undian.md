# Phase 5 — Sistem Undian (FIX 3 MISMATCH KRITIS)

**Session type:** New Claude Code session. Paste this entire file as your first message.

---

## 🎯 Goal

Implement sistem undian sesuai PRD: **server-side random** via Cloud Function `triggerUndian`, dukung **Mode 1** (pre-determined, generate semua urutan di awal grup mulai) dan **Mode 3** (hybrid, random per periode), wajibkan alasan untuk Manual/Offline override. Phase ini WAJIB membereskan 3 mismatch kritis dari [CLAUDE.md §1.5](../CLAUDE.md#15-known-gaps--mismatch-dengan-prd-️).

---

## 📋 Prerequisites

- Phase 1–4 complete & merged
- Grup test dengan minimal 5 anggota sudah ada (kalau belum, create lewat dev client dulu)
- Test scenario: salah satu grup pakai Mode 1, satu pakai Mode 3 (kalau belum punya 2 grup, create dulu)

---

## 📚 Required reading

1. **CLAUDE.md** — **WAJIB BACA INI DULU**:
   - §1.5 mismatch #1, #2, #4 — Phase 5 EXIST untuk fix ketiganya
   - §4 Domain Model — `winners/{periodeId}` + `members/{userId}.sudahMenang`
   - §5 F04 Sistem Undian
   - §6 Security — anti-pattern: NO `Math.random()` di client
   - §11 Test cases wajib — random tidak boleh pilih `sudahMenang=true`
   - §15 Glosarium — definisi Mode 1, Mode 3
   - §27 Week 5 checklist
2. **PRD §4.2 F04, §6.2, §10.3** — acceptance criteria undian
3. **File existing yang HARUS dirombak**:
   - **[src/screens/UndianModal.tsx](../src/screens/UndianModal.tsx)** — saat ini:
     - Line 54-58: `Math.random()` di client ❌ HAPUS, ganti `httpsCallable('triggerUndian')`
     - Line 16-35: opsi Random/Manual/Offline ❌ Konsep salah — Random harus bukan opsi user, tapi auto-trigger sesuai mode grup. Manual/Offline jadi sub-opsi override.
     - Line 50: `canConfirm = winner.trim().length > 0` ❌ HARUSNYA cek juga `note.trim().length > 0` untuk Manual/Offline
   - [app/grup/baru.tsx](../app/grup/baru.tsx) — sudah ada Mode 1/Mode 3 di Phase 3 task 8, verify
   - [src/screens/UrutanTab.tsx](../src/screens/UrutanTab.tsx) — tab Urutan saat ini pakai mock URUTAN; rework untuk subscribe ke real data
   - [app/winner.tsx](../app/winner.tsx) — wire ke real data winner

---

## 🏗️ Tasks

### Task 1 — Extend shared types

Update [functions/shared/types.ts](../functions/shared/types.ts):

```ts
export type Winner = {
  periodeId: string;
  userId: string;
  nama: string;
  decidedAt: number;
  method: 'random' | 'manual' | 'offline';
  decidedBy: string;        // ketua userId
  alasan?: string;          // wajib jika method = manual/offline
  // Untuk Mode 1 entries, decidedBy adalah ketua yang trigger generate, decidedAt sama untuk semua
};
```

### Task 2 — Cloud Function `presetUrutanMode1`

Khusus Mode 1: generate seluruh urutan pemenang sekaligus saat ketua memutuskan untuk start (atau auto saat grup penuh).

[functions/src/callable/presetUrutanMode1.ts](../functions/src/callable/presetUrutanMode1.ts):

```ts
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from '../lib/firestore';
import { assertKetua } from '../lib/auth';
import { randomShuffle } from '../lib/random';
import admin from 'firebase-admin';

export const presetUrutanMode1 = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Wajib login');
  const { groupId } = req.data ?? {};
  if (!groupId) throw new HttpsError('invalid-argument', 'groupId wajib');
  
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
    throw new HttpsError('failed-precondition', `Jumlah anggota (${membersSnap.size}) harus sama dengan jumlah periode (${group.jumlahPeriode}) sebelum preset`);
  }
  
  // Cek belum pernah preset
  const winnersSnap = await groupRef.collection('winners').limit(1).get();
  if (!winnersSnap.empty) {
    throw new HttpsError('failed-precondition', 'Urutan sudah pernah di-generate, tidak bisa ulang');
  }
  
  // Server-side random shuffle
  const userIds = membersSnap.docs.map((d) => d.id);
  const shuffled = randomShuffle(userIds);
  
  await db.runTransaction(async (tx) => {
    const now = admin.firestore.FieldValue.serverTimestamp();
    
    for (let i = 0; i < shuffled.length; i++) {
      const periodeId = String(i + 1).padStart(2, '0');
      const userId = shuffled[i];
      const memberData = membersSnap.docs.find((d) => d.id === userId)!.data();
      
      tx.set(groupRef.collection('winners').doc(periodeId), {
        periodeId, userId, nama: memberData.nama,
        decidedAt: now, method: 'random', decidedBy: req.auth!.uid,
      });
      
      tx.update(groupRef.collection('members').doc(userId), {
        giliran: i + 1,
      });
    }
    
    tx.set(groupRef.collection('activityLog').doc(), {
      type: 'urutan_preset_mode1',
      actorId: req.auth!.uid, actorNama: ketua.nama,
      timestamp: now, metadata: { jumlah: shuffled.length },
    });
  });
  
  return { ok: true, jumlah: shuffled.length };
});
```

### Task 3 — Cloud Function `triggerUndian` (Mode 3 per-periode)

[functions/src/callable/triggerUndian.ts](../functions/src/callable/triggerUndian.ts):

```ts
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from '../lib/firestore';
import { assertKetua } from '../lib/auth';
import { randomPick } from '../lib/random';
import { sendNotif } from '../lib/notif';
import admin from 'firebase-admin';

export const triggerUndian = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Wajib login');
  
  const { groupId, periodeId, method = 'random', manualWinnerId, alasan } = req.data ?? {};
  if (!groupId || !periodeId) {
    throw new HttpsError('invalid-argument', 'groupId & periodeId wajib');
  }
  
  if (method !== 'random' && method !== 'manual' && method !== 'offline') {
    throw new HttpsError('invalid-argument', 'method invalid');
  }
  
  if ((method === 'manual' || method === 'offline')) {
    if (!manualWinnerId) throw new HttpsError('invalid-argument', 'manualWinnerId wajib untuk method manual/offline');
    if (!alasan || alasan.trim().length === 0) {
      throw new HttpsError('invalid-argument', 'Alasan wajib diisi untuk metode manual/offline');
    }
  }
  
  const ketua = await assertKetua(req.auth.uid, groupId);
  const groupRef = db.collection('groups').doc(groupId);
  
  const result = await db.runTransaction(async (tx) => {
    const groupSnap = await tx.get(groupRef);
    const group = groupSnap.data();
    if (!group) throw new HttpsError('not-found', 'Grup tidak ditemukan');
    
    // Cek belum ada pemenang untuk periode ini
    const winnerRef = groupRef.collection('winners').doc(periodeId);
    const winnerSnap = await tx.get(winnerRef);
    if (winnerSnap.exists) {
      throw new HttpsError('failed-precondition', 'Pemenang sudah ditentukan');
    }
    
    // Ambil eligible members (belum menang)
    const membersSnap = await tx.get(groupRef.collection('members').where('sudahMenang', '==', false));
    if (membersSnap.empty) {
      throw new HttpsError('failed-precondition', 'Semua anggota sudah menang');
    }
    const eligible = membersSnap.docs.map((d) => ({ userId: d.id, ...(d.data() as any) }));
    
    let winner;
    if (method === 'random') {
      winner = randomPick(eligible);  // server-side crypto.randomInt
    } else {
      winner = eligible.find((m) => m.userId === manualWinnerId);
      if (!winner) {
        throw new HttpsError('invalid-argument', 'Anggota tidak ditemukan atau sudah menang');
      }
    }
    
    const now = admin.firestore.FieldValue.serverTimestamp();
    
    tx.set(winnerRef, {
      periodeId, userId: winner.userId, nama: winner.nama,
      decidedAt: now, method, decidedBy: req.auth!.uid,
      ...(alasan ? { alasan: alasan.trim() } : {}),
    });
    
    tx.update(groupRef.collection('members').doc(winner.userId), {
      sudahMenang: true, giliran: parseInt(periodeId),
    });
    
    tx.set(groupRef.collection('activityLog').doc(), {
      type: 'undian_done',
      actorId: req.auth!.uid, actorNama: ketua.nama,
      timestamp: now,
      metadata: { periodeId, winnerId: winner.userId, winnerNama: winner.nama, method, alasan: alasan?.trim() },
    });
    
    return winner;
  });
  
  // Notif ke semua anggota di luar transaction
  const membersSnap = await groupRef.collection('members').get();
  for (const m of membersSnap.docs) {
    const userDoc = await db.collection('users').doc(m.id).get();
    const token = userDoc.data()?.expoPushToken;
    if (!token) continue;
    const isWinner = m.id === result.userId;
    await sendNotif({
      token,
      title: isWinner ? 'Selamat! Kamu menang undian 🎉' : 'Pemenang undian sudah diumumkan',
      body: isWinner
        ? `Kamu pemenang periode ${parseInt(periodeId)}. Set tanggal pelaksanaan sekarang.`
        : `${result.nama} memenangkan periode ${parseInt(periodeId)}`,
      data: {
        type: 'winner',
        route: isWinner
          ? `arisan://winner?groupId=${groupId}&periode=${periodeId}`
          : `arisan://group/${groupId}?tab=urutan`,
      },
      dedupKey: `undian_${groupId}_${periodeId}_${m.id}`,
    });
  }
  
  return { ok: true, winnerId: result.userId, winnerNama: result.nama };
});
```

### Task 4 — Helper `random.ts` (crypto-grade)

[functions/src/lib/random.ts](../functions/src/lib/random.ts):

```ts
import { randomInt } from 'crypto';

export function randomPick<T>(arr: T[]): T {
  if (arr.length === 0) throw new Error('Cannot pick from empty array');
  return arr[randomInt(0, arr.length)];
}

export function randomShuffle<T>(arr: T[]): T[] {
  // Fisher-Yates with crypto
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
```

**Catatan:** `crypto.randomInt(min, max)` — `max` exclusive. Tidak boleh pakai `Math.random()` even di Cloud Function untuk konsistensi (meskipun teknis OK di server side).

### Task 5 — Firestore rules untuk winners

Update [firestore.rules](../firestore.rules):

```
match /groups/{groupId}/winners/{periodeId} {
  allow read: if request.auth != null && isMember(groupId);
  allow write: if false;
}
```

Deploy rules.

### Task 6 — Rombak [src/screens/UndianModal.tsx](../src/screens/UndianModal.tsx)

**HAPUS** seluruh logic `Math.random()` (line 54-58).

Spec baru:
- Modal dipanggil dari [src/screens/UrutanTab.tsx](../src/screens/UrutanTab.tsx) saat ketua tap "Mulai Undian Periode X"
- Props: `groupId`, `periodeNomor`, `eligibleMembers: {userId, nama}[]`, `groupMode: 'mode1' | 'mode3'`
- **Untuk grup Mode 1**: modal ini TIDAK dipakai untuk undian per-periode (sudah di-preset). Hanya dipakai untuk ketua override (manual/offline).
- **Untuk grup Mode 3**: 3 opsi seperti sebelumnya, tapi:
  - Default & recommended: **Random otomatis** (no input needed) — server akan random
  - Manual: pilih anggota + alasan wajib
  - Offline: pilih anggota + alasan wajib (mis. "Disaksikan oleh ...")

```tsx
const canConfirm = (() => {
  if (choice === 'random') return true;
  // manual / offline: WAJIB ada winner DAN alasan
  return winner.trim().length > 0 && note.trim().length > 0;
})();

const handleConfirm = async () => {
  setLoading(true);
  try {
    await functions('asia-southeast2').httpsCallable('triggerUndian')({
      groupId, periodeId,
      method: choice,  // 'random' | 'manual' | 'offline'
      ...(choice !== 'random' && { manualWinnerId: winner, alasan: note.trim() }),
    });
    onClose();
    // Winner screen akan trigger via push notif kalau pemenang adalah user
  } catch (e: any) {
    toast(e.message ?? 'Gagal undian');
  } finally {
    setLoading(false);
  }
};
```

Visual: untuk pilihan Random, hide section "Nama pemenang" dan "Alasan". Untuk Manual/Offline, tampilkan keduanya + label "Wajib" di "Alasan".

### Task 7 — Rework [src/screens/UrutanTab.tsx](../src/screens/UrutanTab.tsx)

- Subscribe ke `groups/{groupId}/winners` (all periods sudah ada untuk Mode 1, atau bertahap untuk Mode 3)
- Subscribe ke `groups/{groupId}/members`
- Tampilkan list periode 1..jumlahPeriode dengan status:
  - `done` — pemenang sudah ada di winners + member.sudahMenang
  - `active` — periode = group.periodeAktif, pemenang sudah ada
  - `pending` — pemenang belum di-decide (hanya untuk Mode 3, periode > periodeAktif)
  - `upcoming` — untuk Mode 1, pemenang sudah preset tapi periode belum aktif
- **Khusus ketua di grup Mode 3 untuk periode aktif (yang belum ada pemenang)**: button "🎲 Mulai Undian" → open UndianModal
- **Khusus ketua di grup Mode 1 saat anggota sudah lengkap + belum preset**: button "Generate Urutan (sekali jalan)" → call `presetUrutanMode1`

### Task 8 — Wire [app/winner.tsx](../app/winner.tsx) ke real data

Saat ini [app/winner.tsx](../app/winner.tsx) standalone screen. Wire param `groupId` & `periode`:
- Fetch `groups/{groupId}/winners/{periodeId}` untuk konfirmasi user benar pemenang
- Tampilkan: nama grup, periode, nominal total (= group.nominal × group.jumlahPeriode)
- CTA "Set Tanggal Pelaksanaan" → `router.push('/set-date?groupId=X&periode=Y')` (set-date akan di-rework di Phase 6)
- Confetti animation tetap, hanya untuk render saat user yang akses adalah pemenang

---

## ✅ Definition of Done

- [ ] Cloud Functions `triggerUndian` + `presetUrutanMode1` deployed
- [ ] Helper `crypto.randomInt`-based random (NOT Math.random)
- [ ] Firestore rules `winners` deployed (client write deny)
- [ ] [UndianModal.tsx](../src/screens/UndianModal.tsx): `Math.random()` HAPUS, ganti `httpsCallable`
- [ ] [UndianModal.tsx](../src/screens/UndianModal.tsx): alasan WAJIB untuk Manual/Offline
- [ ] [UrutanTab.tsx](../src/screens/UrutanTab.tsx): subscribe winners + members real-time
- [ ] [UrutanTab.tsx](../src/screens/UrutanTab.tsx): Mode 1 dapat trigger preset sekali, Mode 3 trigger per-periode
- [ ] [winner.tsx](../app/winner.tsx) wire real data + deep link param
- [ ] Push notif undian sent ke semua anggota, beda pesan untuk pemenang vs lainnya
- [ ] Manual test scenario:
  - [ ] Grup Mode 3, ketua trigger random → satu pemenang random terpilih, semua anggota dapat notif
  - [ ] Grup Mode 3, ketua trigger manual tanpa alasan → tombol disabled
  - [ ] Grup Mode 3, ketua trigger manual dengan alasan → sukses, alasan ter-record di winners + activityLog
  - [ ] Grup Mode 1 (anggota penuh), ketua tap "Generate Urutan" → semua periode auto-fill pemenang
  - [ ] Trigger 2× untuk periode yang sama → error "Pemenang sudah ditentukan"
- [ ] CLAUDE.md §1.5 mismatch #1, #2, #4 BISA DICORET — update CLAUDE.md di akhir phase
- [ ] `npm run lint && npm run typecheck` green
- [ ] Branch `feat/phase-05-undian` + PR opened

---

## 🧪 Acceptance Criteria (PRD §10.3)

- [ ] Random undian dijalankan server-side via Cloud Function `triggerUndian`
- [ ] Random tidak pernah memilih anggota `sudahMenang = true` (filter di query `where sudahMenang == false`)
- [ ] Setiap penentuan pemenang (manual/offline) wajib menyertakan alasan
- [ ] Hasil undian tercatat di `activityLog` dan tidak bisa dihapus (rules append-only)

---

## ❌ Out of scope Phase 5

- ❌ JANGAN implement Mode 2 (rolling undian) — Phase 2 PRD §14.2
- ❌ JANGAN biarkan ketua override pemenang yang sudah di-decide — PRD: sekali decide, lock. Edit hanya via "swap giliran" di Phase 7.
- ❌ JANGAN tampilkan list lengkap eligible candidates ke anggota biasa di UndianModal — modal hanya untuk ketua
- ❌ JANGAN auto-trigger undian saat semua bayar — selalu manual trigger ketua (PRD spec)

---

## 🚨 Common pitfalls

1. **`Math.random()` di client** — anti-pattern utama PRD. Phase 5 ada untuk fix ini. ZERO TOLERANCE.
2. **`Math.random()` di Cloud Function** — meskipun secure di server, untuk konsistensi pakai `crypto.randomInt`. Reviewer akan flag.
3. **Lupa filter `where sudahMenang == false`** — bisa pilih ulang pemenang lama.
4. **Race condition double-trigger**: 2 ketua tap bersamaan (impossible di MVP karena 1 ketua per grup, tapi tetap pakai transaction).
5. **Mode 1 generate ulang**: pastikan throw error jika `winners` sudah ada satu pun.
6. **Alasan tidak ke-record di winners**: bug umum — pastikan `alasan` field masuk `tx.set(winnerRef, {...})` (bukan hanya di activityLog).

---

## 🤔 When to ask user

- Sebelum delete file UndianModal.tsx existing logic — informasikan jangan delete file, hanya replace logic. UI structure (RadioCard, dropdown) tetap dipakai.
- Untuk grup Mode 1, kapan trigger `presetUrutanMode1` boleh: saat anggota terkumpul lengkap (auto?) atau manual ketua tap button? **Default: manual ketua tap, dengan validasi `membersSnap.size === jumlahPeriode`.** Konfirmasi.
- Untuk pesan push notif pemenang vs non-pemenang — review copywriting dengan user (Bahasa Indonesia, sesuaikan tone Arisan).

---

## 📦 Commit message

```
feat(undian): server-side random + mode 1/3 + mandatory reason

- Add triggerUndian Cloud Function with crypto.randomInt
- Add presetUrutanMode1 for pre-determined order grups
- Fix UndianModal: remove Math.random(), call httpsCallable
- Make alasan required for manual/offline methods
- Rework UrutanTab to subscribe winners + members realtime
- Wire winner.tsx to real data via deep link params

Fixes: CLAUDE.md §1.5 mismatch #1, #2, #4
Acceptance: PRD §10.3
Refs: CLAUDE.md §27 Week 5
```
