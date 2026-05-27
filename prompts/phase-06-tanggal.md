# Phase 6 — Pemenang & Tanggal Pelaksanaan

**Session type:** New Claude Code session. Paste this entire file as your first message.

---

## 🎯 Goal

Pemenang dapat set tanggal pelaksanaan (min H+3, lock setelah confirm). Auto-notif ke ketua jika pemenang tidak set dalam 3 hari, ketua bisa override dengan alasan. Reminder pelaksanaan H-3/H-1/H-0 via Cloud Scheduler ke semua anggota grup.

---

## 📋 Prerequisites

- Phase 1–5 complete & merged
- Verifikasi Phase 5: ada minimal 1 grup test dengan 1 pemenang sudah di-decide (lewat trigger undian Mode 3)

---

## 📚 Required reading

1. **CLAUDE.md**:
   - §1.5 gap "Calendar set-date hardcoded `TODAY=12`, `Juni 2025`" — Phase 6 BERTUGAS fix ini
   - §5 F05 Set Tanggal + F10 Scheduler `checkTanggalDeadline`, `sendPelaksanaanReminder`
   - §9 Timezone convention (`dayjs.tz('Asia/Jakarta')`)
   - §27 Week 6 checklist
2. **PRD §4.2 F05** — spec set tanggal & override
3. **File existing yang HARUS dirombak**:
   - [app/set-date.tsx](../app/set-date.tsx) — line 22-27 hardcoded `TODAY=12`, `Juni 2025`, `DAYS_IN_MONTH=30`. Navigation bulan tombol kosong. Phase 6 rewrite calendar logic pakai dayjs real.

---

## 🏗️ Tasks

### Task 1 — Extend shared types

Update [functions/shared/types.ts](../functions/shared/types.ts):

```ts
// Period type sudah ada dari Phase 4 — tambah tanggalPelaksanaan, lockedAt
export type Period = {
  periodeId: string;
  nomor: number;
  jatuhTempo: number;
  pemenangId?: string;        // set saat triggerUndian sukses
  tanggalPelaksanaan?: number; // set saat pemenang/ketua confirm
  pelaksanaanLockedAt?: number;
  pelaksanaanSetBy?: string;   // userId (pemenang biasanya, ketua jika override)
  pelaksanaanOverrideReason?: string;
  status: 'open' | 'closed';
};
```

### Task 2 — Cloud Function `setTanggalPelaksanaan` (pemenang)

[functions/src/callable/setTanggalPelaksanaan.ts](../functions/src/callable/setTanggalPelaksanaan.ts):

```ts
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from '../lib/firestore';
import { assertMember } from '../lib/auth';
import { sendNotif } from '../lib/notif';
import admin from 'firebase-admin';

export const setTanggalPelaksanaan = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Wajib login');
  
  const { groupId, periodeId, tanggal } = req.data ?? {};
  if (!groupId || !periodeId || typeof tanggal !== 'number') {
    throw new HttpsError('invalid-argument', 'groupId, periodeId, tanggal (epoch ms) wajib');
  }
  
  // Validasi min H+3 (dari now)
  const minTanggal = Date.now() + 3 * 86400 * 1000;
  if (tanggal < minTanggal) {
    throw new HttpsError('invalid-argument', 'Tanggal minimal H+3 dari hari ini');
  }
  
  const member = await assertMember(req.auth.uid, groupId);
  const periodeRef = db.collection('groups').doc(groupId).collection('periods').doc(periodeId);
  const winnerRef = db.collection('groups').doc(groupId).collection('winners').doc(periodeId);
  
  await db.runTransaction(async (tx) => {
    const [periodeSnap, winnerSnap] = await Promise.all([tx.get(periodeRef), tx.get(winnerRef)]);
    if (!winnerSnap.exists) {
      throw new HttpsError('failed-precondition', 'Pemenang belum ditentukan untuk periode ini');
    }
    if (winnerSnap.data()?.userId !== req.auth!.uid) {
      throw new HttpsError('permission-denied', 'Hanya pemenang yang bisa set tanggal');
    }
    if (periodeSnap.data()?.pelaksanaanLockedAt) {
      throw new HttpsError('failed-precondition', 'Tanggal sudah dikunci, tidak bisa diubah');
    }
    
    const now = admin.firestore.FieldValue.serverTimestamp();
    tx.set(periodeRef, {
      tanggalPelaksanaan: tanggal,
      pelaksanaanLockedAt: now,
      pelaksanaanSetBy: req.auth!.uid,
    }, { merge: true });
    
    tx.set(db.collection('groups').doc(groupId).collection('activityLog').doc(), {
      type: 'tanggal_set',
      actorId: req.auth!.uid, actorNama: member.nama,
      timestamp: now,
      metadata: { periodeId, tanggal },
    });
  });
  
  // Notif ke semua anggota grup
  const membersSnap = await db.collection('groups').doc(groupId).collection('members').get();
  for (const m of membersSnap.docs) {
    const userDoc = await db.collection('users').doc(m.id).get();
    const token = userDoc.data()?.expoPushToken;
    if (!token) continue;
    await sendNotif({
      token,
      title: 'Tanggal pelaksanaan dikonfirmasi',
      body: `${member.nama} set pelaksanaan periode ${parseInt(periodeId)}: ${formatTanggal(tanggal)}`,
      data: { type: 'tanggal-set', route: `arisan://group/${groupId}?tab=urutan` },
      dedupKey: `tanggal_set_${groupId}_${periodeId}_${m.id}`,
    });
  }
  
  return { ok: true };
});

function formatTanggal(ms: number): string {
  // Quick format - real localized format pakai dayjs di client
  return new Date(ms).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
```

### Task 3 — Cloud Function `overrideTanggal` (ketua)

[functions/src/callable/overrideTanggal.ts](../functions/src/callable/overrideTanggal.ts):

```ts
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from '../lib/firestore';
import { assertKetua } from '../lib/auth';
import { sendNotif } from '../lib/notif';
import admin from 'firebase-admin';

export const overrideTanggal = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Wajib login');
  
  const { groupId, periodeId, tanggal, alasan } = req.data ?? {};
  if (!groupId || !periodeId || typeof tanggal !== 'number') {
    throw new HttpsError('invalid-argument', 'groupId, periodeId, tanggal wajib');
  }
  if (!alasan || alasan.trim().length === 0) {
    throw new HttpsError('invalid-argument', 'Alasan override wajib diisi');
  }
  
  const minTanggal = Date.now() + 3 * 86400 * 1000;
  if (tanggal < minTanggal) {
    throw new HttpsError('invalid-argument', 'Tanggal minimal H+3 dari hari ini');
  }
  
  const ketua = await assertKetua(req.auth.uid, groupId);
  const periodeRef = db.collection('groups').doc(groupId).collection('periods').doc(periodeId);
  
  await db.runTransaction(async (tx) => {
    const periodeSnap = await tx.get(periodeRef);
    if (!periodeSnap.exists) throw new HttpsError('not-found', 'Periode tidak ditemukan');
    
    const now = admin.firestore.FieldValue.serverTimestamp();
    tx.set(periodeRef, {
      tanggalPelaksanaan: tanggal,
      pelaksanaanLockedAt: now,
      pelaksanaanSetBy: req.auth!.uid,
      pelaksanaanOverrideReason: alasan.trim(),
    }, { merge: true });
    
    tx.set(db.collection('groups').doc(groupId).collection('activityLog').doc(), {
      type: 'tanggal_overridden',
      actorId: req.auth!.uid, actorNama: ketua.nama,
      timestamp: now,
      metadata: { periodeId, tanggal, alasan: alasan.trim() },
    });
  });
  
  // Notif semua anggota
  const membersSnap = await db.collection('groups').doc(groupId).collection('members').get();
  for (const m of membersSnap.docs) {
    const userDoc = await db.collection('users').doc(m.id).get();
    const token = userDoc.data()?.expoPushToken;
    if (!token) continue;
    await sendNotif({
      token,
      title: 'Ketua mengubah tanggal pelaksanaan',
      body: `Periode ${parseInt(periodeId)} → ${new Date(tanggal).toLocaleDateString('id-ID')}. Alasan: ${alasan.trim()}`,
      data: { type: 'tanggal-override', route: `arisan://group/${groupId}?tab=urutan` },
      dedupKey: `tanggal_override_${groupId}_${periodeId}_${m.id}_${Date.now()}`,
    });
  }
  
  return { ok: true };
});
```

### Task 4 — Cloud Scheduler `checkTanggalDeadline` (cron 10.00 WIB harian)

[functions/src/scheduled/checkTanggalDeadline.ts](../functions/src/scheduled/checkTanggalDeadline.ts):

```ts
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { db } from '../lib/firestore';
import { sendNotif } from '../lib/notif';
import dayjs from 'dayjs';

export const checkTanggalDeadline = onSchedule(
  { schedule: '0 10 * * *', timeZone: 'Asia/Jakarta', region: 'asia-southeast2' },
  async () => {
    // Cek winners yang sudah > 3 hari tapi belum ada tanggalPelaksanaan
    const threshold = dayjs().subtract(3, 'day').valueOf();
    
    const winnersSnap = await db.collectionGroup('winners')
      .where('decidedAt', '<', new Date(threshold))
      .get();
    
    for (const winnerDoc of winnersSnap.docs) {
      const groupRef = winnerDoc.ref.parent.parent!;
      const periodeId = winnerDoc.id;
      
      const periodeSnap = await groupRef.collection('periods').doc(periodeId).get();
      if (periodeSnap.data()?.pelaksanaanLockedAt) continue;  // sudah set, skip
      
      // Notif ketua untuk override
      const groupSnap = await groupRef.get();
      const ketuaId = groupSnap.data()?.ketuaId;
      if (!ketuaId) continue;
      
      const userDoc = await db.collection('users').doc(ketuaId).get();
      const token = userDoc.data()?.expoPushToken;
      if (!token) continue;
      
      const winner = winnerDoc.data();
      await sendNotif({
        token,
        title: 'Pemenang belum set tanggal',
        body: `${winner.nama} belum set tanggal pelaksanaan periode ${parseInt(periodeId)}. Pertimbangkan override.`,
        data: { type: 'tanggal-overdue', route: `arisan://group/${groupRef.id}?tab=urutan` },
        dedupKey: `tanggal_overdue_ketua_${groupRef.id}_${periodeId}_${dayjs().format('YYYY-MM-DD')}`,
      });
    }
  }
);
```

### Task 5 — Cloud Scheduler `sendPelaksanaanReminder` (cron 11.00 WIB harian)

[functions/src/scheduled/sendPelaksanaanReminder.ts](../functions/src/scheduled/sendPelaksanaanReminder.ts):

```ts
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { db } from '../lib/firestore';
import { sendNotif } from '../lib/notif';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = 'Asia/Jakarta';

export const sendPelaksanaanReminder = onSchedule(
  { schedule: '0 11 * * *', timeZone: TZ, region: 'asia-southeast2' },
  async () => {
    const now = dayjs().tz(TZ);
    const offsets = [3, 1, 0];
    
    for (const offset of offsets) {
      const targetStart = now.add(offset, 'day').startOf('day').valueOf();
      const targetEnd = now.add(offset, 'day').endOf('day').valueOf();
      
      const periodSnap = await db.collectionGroup('periods')
        .where('tanggalPelaksanaan', '>=', targetStart)
        .where('tanggalPelaksanaan', '<=', targetEnd)
        .get();
      
      for (const periodDoc of periodSnap.docs) {
        const groupRef = periodDoc.ref.parent.parent!;
        const periode = periodDoc.data();
        
        // Notif semua anggota grup
        const members = await groupRef.collection('members').get();
        for (const m of members.docs) {
          const userDoc = await db.collection('users').doc(m.id).get();
          const token = userDoc.data()?.expoPushToken;
          if (!token) continue;
          
          const label = offset === 0 ? 'hari ini' : `${offset} hari lagi`;
          await sendNotif({
            token,
            title: 'Reminder pelaksanaan arisan',
            body: `Pelaksanaan periode ${periode.nomor} ${label} (${new Date(periode.tanggalPelaksanaan).toLocaleDateString('id-ID')})`,
            data: { type: 'pelaksanaan-reminder', route: `arisan://group/${groupRef.id}?tab=urutan` },
            dedupKey: `pelaksanaan_reminder_${groupRef.id}_${periodDoc.id}_${m.id}_H-${offset}_${now.format('YYYY-MM-DD')}`,
          });
        }
      }
    }
  }
);
```

**Index requirement** — tambah [firestore.indexes.json](../firestore.indexes.json):
```json
{
  "collectionGroup": "periods",
  "queryScope": "COLLECTION_GROUP",
  "fields": [{ "fieldPath": "tanggalPelaksanaan", "order": "ASCENDING" }]
}
```

Export semua function di [functions/src/index.ts](../functions/src/index.ts), deploy.

### Task 6 — Rewrite [app/set-date.tsx](../app/set-date.tsx) dengan dayjs real

**HAPUS** hardcoded constants `TODAY = 12`, `FIRST_DAY_COL = 6`, `DAYS_IN_MONTH = 30`, "Juni 2025" string.

Spec baru:
- Receive params: `groupId`, `periodeId` (via `useLocalSearchParams`)
- Verify: user adalah pemenang periode tersebut (load `winners/{periodeId}`, cek `userId === currentUser.uid`)
- State: `currentMonth` (dayjs object, default = bulan saat ini), `selected` (dayjs object | null)
- Calendar render: pakai dayjs `startOf('month').day()` untuk offset, `daysInMonth()` untuk jumlah hari
- Tombol prev/next month (functional now)
- `minDate = dayjs().add(3, 'day')` — disable cell sebelum minDate
- Selected → render confirmation card "Tanggal terpilih: {dayjs.format('dddd, D MMMM YYYY')}"
- Checkbox "Saya mengerti tanggal tidak bisa diubah sendiri"
- Tombol Konfirmasi → `httpsCallable('setTanggalPelaksanaan')({ groupId, periodeId, tanggal: selected.valueOf() })`
- After sukses → router.back() ke detail grup

**Setup dayjs locale Indonesia** di app/_layout.tsx (kalau belum di Phase 1):
```ts
import dayjs from 'dayjs';
import 'dayjs/locale/id';
dayjs.locale('id');
```

### Task 7 — Screen ketua override tanggal

Buat [app/grup/[id]/override-tanggal.tsx](../app/grup/%5Bid%5D/override-tanggal.tsx):
- Params: `periodeId`
- Pemilik calendar widget sama seperti set-date, plus TextInput "Alasan override (wajib)"
- Submit → `httpsCallable('overrideTanggal')`
- Akses: dari UrutanTab card periode yang `pelaksanaanLockedAt = null && winner.decidedAt < now - 3day`, atau dari notif `tanggal-overdue`

### Task 8 — Update [src/screens/UrutanTab.tsx](../src/screens/UrutanTab.tsx)

Tampilkan tanggal pelaksanaan untuk setiap periode yang sudah set:
- Format: "Sabtu, 15 Juni 2025" (pakai dayjs format Bahasa Indonesia)
- Badge "Terkunci" jika `pelaksanaanLockedAt` ada
- Untuk ketua, button "Override Tanggal" jika ada periode dengan `winner.decidedAt < now - 3day && !pelaksanaanLockedAt`

---

## ✅ Definition of Done

- [ ] Cloud Functions `setTanggalPelaksanaan`, `overrideTanggal` deployed
- [ ] Cloud Scheduler `checkTanggalDeadline`, `sendPelaksanaanReminder` deployed (timeZone Asia/Jakarta)
- [ ] Firestore index `periods collectionGroup tanggalPelaksanaan` deployed
- [ ] [app/set-date.tsx](../app/set-date.tsx) REWRITTEN — no more hardcoded "Juni 2025", `TODAY=12`. Calendar navigasi bulan working.
- [ ] Min H+3 enforced (client validation + server validation)
- [ ] Set tanggal end-to-end: pemenang tap "Set Tanggal" → pilih → confirm → tanggal terkunci, notif ke semua anggota
- [ ] Ketua override flow: jika pemenang tidak set H+3 → ketua dapat notif → buka override screen → submit
- [ ] Push notif `tanggal-set`, `tanggal-override`, `pelaksanaan-reminder`, `tanggal-overdue` semua received di device test
- [ ] [UrutanTab.tsx](../src/screens/UrutanTab.tsx) tampilkan tanggal pelaksanaan dengan format Indonesia, badge "Terkunci"
- [ ] CLAUDE.md §1.5 gap "Calendar set-date hardcoded" bisa dicoret — update CLAUDE.md
- [ ] `npm run lint && npm run typecheck` green
- [ ] Branch `feat/phase-06-tanggal` + PR opened

---

## 🧪 Acceptance Criteria

- [ ] Pemenang wajib pilih tanggal minimum H+3 dari hari ini
- [ ] Checkbox persetujuan wajib di-tick sebelum konfirmasi
- [ ] Tanggal terkunci setelah confirm (UI disable + server reject change)
- [ ] Jika pemenang tidak set dalam 3 hari → ketua dapat notif untuk override
- [ ] Ketua override wajib isi alasan, tercatat di `activityLog`

---

## ❌ Out of scope Phase 6

- ❌ JANGAN implement bulk-set tanggal (semua periode sekaligus) — design tidak ada
- ❌ JANGAN biarkan pemenang ubah tanggal yang sudah locked — hanya ketua override
- ❌ JANGAN handle case "pemenang pindah grup setelah menang" — out of scope MVP
- ❌ JANGAN buat fitur "ingatkan saya nanti" di sisi pemenang — push reminder otomatis sudah cover

---

## 🚨 Common pitfalls

1. **Hardcoded tanggal tersisa** — full search untuk "Juni 2025", `TODAY = `, `DAYS_IN_MONTH` dan pastikan semua kena rewrite.
2. **Timezone mismatch**: `tanggal` epoch ms harus di-store UTC, tapi user pilih di local time. Pakai `dayjs(selected).startOf('day').valueOf()` supaya konsisten (tengah malam local time).
3. **Min H+3 di server vs client**: clock drift bisa bikin client validation pass tapi server reject. Tambah margin 1 jam atau pesan error jelas.
4. **`checkTanggalDeadline` jalan terlalu cepat**: jika pemenang baru menang kemarin, jangan langsung notify hari ini. Threshold `> 3 day` strict.
5. **Cron timezone**: WAJIB `'Asia/Jakarta'` di `onSchedule` config, jangan default UTC.

---

## 🤔 When to ask user

- Sebelum rewrite [set-date.tsx](../app/set-date.tsx): konfirmasi UI design boleh berubah sedikit karena bulan tidak lagi static Juni 2025
- Konfirmasi default month saat buka set-date: bulan saat ini, atau bulan dari `period.jatuhTempo`?
- Cron time `sendPelaksanaanReminder` 11.00 WIB (1 jam setelah `checkTanggalDeadline`) — konfirmasi

---

## 📦 Commit message

```
feat(tanggal): pemenang set tanggal + ketua override + reminder scheduler

- Add setTanggalPelaksanaan + overrideTanggal Cloud Functions
- Add checkTanggalDeadline + sendPelaksanaanReminder Schedulers
- Rewrite set-date.tsx with real dayjs (no more hardcoded Juni 2025)
- Add ketua override screen + flow
- Display locked tanggal in UrutanTab with Indonesian format

Fixes: CLAUDE.md §1.5 calendar hardcoded gap
Refs: CLAUDE.md §27 Week 6
```
