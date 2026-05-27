# Phase 4 — Tracking Pembayaran

**Session type:** New Claude Code session. Paste this entire file as your first message.

---

## 🎯 Goal

Ketua dapat konfirmasi pembayaran per-anggota per-periode via Cloud Function `validatePayment` (server-side validation, Firestore Transaction). Status update real-time ke semua anggota grup. Auto-status "Terlambat" H+3 dari jatuh tempo. Reminder otomatis H-3/H-1/H-0 via Cloud Scheduler (cron 08.00 WIB).

---

## 📋 Prerequisites

- Phase 1–3 complete & merged
- Test scenario siap: minimal 1 grup test dengan 3+ anggota (pakai test phone numbers di Firebase Console)
- Verifikasi: dari Beranda dev client, klik grup → masuk detail grup, tab Pembayaran tampil dengan UI shell (data masih mock dari [src/data/mock.ts](../src/data/mock.ts))

---

## 📚 Required reading

1. **CLAUDE.md**:
   - §4 Domain Model — `periods/{periodeId}` + `/payments/{userId}`
   - §5 F03 Tracking Pembayaran + F10 Cloud Scheduler
   - §5b Push Notification Flow — type `payment-reminder`, `payment-confirmed`
   - §6 Security — `validatePayment` Cloud Function pattern
   - §9 Lokalisasi — format Rupiah, tanggal jatuh tempo
   - §11 Test cases wajib — dedup reminder, deny anggota write payments
   - §27 Week 4 checklist
2. **PRD §4.2 F03, §10.2** — acceptance criteria pembayaran
3. **File existing yang akan diubah**:
   - [app/group/[id].tsx](../app/group/%5Bid%5D.tsx) — tab Pembayaran sekarang hardcoded periode 3, tombol Konfirmasi tanpa handler. WAJIB rework per [CLAUDE.md §1.5](../CLAUDE.md#15-known-gaps--mismatch-dengan-prd-️) gap interaksi.
   - [src/data/mock.ts](../src/data/mock.ts) — `RT03_MEMBERS` masih dipakai, ganti dengan Firestore subscription.

---

## 🏗️ Tasks

### Task 1 — Extend shared types

Tambah di [functions/shared/types.ts](../functions/shared/types.ts):

```ts
export type Period = {
  periodeId: string;          // "1", "2", ... (string padded supaya sortable, atau number)
  nomor: number;              // 1..jumlahPeriode
  jatuhTempo: number;         // epoch ms UTC — kapan terakhir bayar
  pemenangId?: string;        // diisi setelah undian
  tanggalPelaksanaan?: number;
  status: 'open' | 'closed';
};

export type Payment = {
  userId: string;
  status: 'belum' | 'lunas' | 'terlambat';
  paidAt?: number;            // epoch ms
  confirmedBy?: string;       // ketua userId
};
```

### Task 2 — Cloud Function `validatePayment`

[functions/src/callable/validatePayment.ts](../functions/src/callable/validatePayment.ts):

```ts
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from '../lib/firestore';
import { assertKetua } from '../lib/auth';
import { sendNotif } from '../lib/notif';
import admin from 'firebase-admin';

export const validatePayment = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Wajib login');
  
  const { groupId, periodeId, userId } = req.data ?? {};
  if (!groupId || !periodeId || !userId) {
    throw new HttpsError('invalid-argument', 'groupId, periodeId, userId wajib');
  }
  
  const ketuaInfo = await assertKetua(req.auth.uid, groupId);
  
  const paymentRef = db
    .collection('groups').doc(groupId)
    .collection('periods').doc(periodeId)
    .collection('payments').doc(userId);
  
  const memberRef = db.collection('groups').doc(groupId).collection('members').doc(userId);
  
  await db.runTransaction(async (tx) => {
    const [paymentSnap, memberSnap] = await Promise.all([tx.get(paymentRef), tx.get(memberRef)]);
    
    if (!memberSnap.exists) {
      throw new HttpsError('not-found', 'Anggota tidak ditemukan di grup');
    }
    
    if (paymentSnap.exists && paymentSnap.data()?.status === 'lunas') {
      throw new HttpsError('failed-precondition', 'Pembayaran sudah dikonfirmasi sebelumnya');
    }
    
    tx.set(paymentRef, {
      userId,
      status: 'lunas',
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      confirmedBy: req.auth!.uid,
    });
    
    // Activity log
    tx.set(
      db.collection('groups').doc(groupId).collection('activityLog').doc(),
      {
        type: 'payment_confirmed',
        actorId: req.auth!.uid,
        actorNama: ketuaInfo.nama,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        metadata: { periodeId, targetUserId: userId, targetNama: memberSnap.data()?.nama },
      }
    );
  });
  
  // Notif ke yang dikonfirmasi (di luar transaction)
  const memberData = (await memberRef.get()).data();
  const userDoc = await db.collection('users').doc(userId).get();
  const token = userDoc.data()?.expoPushToken;
  if (token) {
    await sendNotif({
      token,
      title: 'Pembayaran dikonfirmasi',
      body: `Iuran periode ${periodeId} kamu sudah dikonfirmasi ketua`,
      data: { type: 'payment-confirmed', route: `arisan://riwayat?groupId=${groupId}` },
      dedupKey: `payment-confirmed_${userId}_${periodeId}`,
    });
  }
  
  return { ok: true };
});
```

### Task 3 — Helper `assertKetua` & `sendNotif`

[functions/src/lib/auth.ts](../functions/src/lib/auth.ts):

```ts
import { HttpsError } from 'firebase-functions/v2/https';
import { db } from './firestore';

export async function assertKetua(uid: string, groupId: string) {
  const memberDoc = await db
    .collection('groups').doc(groupId)
    .collection('members').doc(uid).get();
  
  if (!memberDoc.exists || memberDoc.data()?.role !== 'ketua') {
    throw new HttpsError('permission-denied', 'Hanya ketua yang bisa melakukan aksi ini');
  }
  return memberDoc.data()!;
}

export async function assertMember(uid: string, groupId: string) {
  const memberDoc = await db
    .collection('groups').doc(groupId)
    .collection('members').doc(uid).get();
  
  if (!memberDoc.exists) {
    throw new HttpsError('permission-denied', 'Bukan anggota grup ini');
  }
  return memberDoc.data()!;
}
```

[functions/src/lib/notif.ts](../functions/src/lib/notif.ts):

```ts
import { db } from './firestore';
import admin from 'firebase-admin';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export async function sendNotif(args: {
  token: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  dedupKey: string;  // mis. "payment-reminder_userId_2026-05-27"
}) {
  // Dedup check — TTL 24h
  const dedupRef = db.collection('notifLog').doc(args.dedupKey);
  const dedupSnap = await dedupRef.get();
  if (dedupSnap.exists) {
    const sentAt = dedupSnap.data()?.sentAt?.toMillis?.() ?? 0;
    if (Date.now() - sentAt < 24 * 60 * 60 * 1000) return { skipped: 'duplicate' };
  }
  
  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: args.token,
      title: args.title,
      body: args.body,
      data: args.data ?? {},
      sound: 'default',
      priority: 'high',
    }),
  });
  
  await dedupRef.set({ sentAt: admin.firestore.FieldValue.serverTimestamp() });
  
  if (!res.ok) {
    console.error('Expo push failed', await res.text());
  }
  return { ok: res.ok };
}
```

### Task 4 — Period seeding saat group dibuat

Update [functions/src/callable/createGroup.ts](../functions/src/callable/createGroup.ts) (dari Phase 3) — saat create group, generate semua period docs sekaligus dengan jatuh tempo:

```ts
// Dalam transaction createGroup:
const jatuhTempoStep = group.frekuensi === 'mingguan' ? 7 * 86400 * 1000 : 30 * 86400 * 1000;
for (let i = 1; i <= jumlahPeriode; i++) {
  const periodeRef = groupRef.collection('periods').doc(String(i).padStart(2, '0'));
  tx.set(periodeRef, {
    nomor: i,
    jatuhTempo: tanggalMulai + (i - 1) * jatuhTempoStep,
    status: 'open',
  });
}
```

**Catatan:** Periode pertama mulai dari `tanggalMulai`, periode kedua `tanggalMulai + step`, dst. Ini approximation untuk MVP — Phase 2 bisa support tanggal pelaksanaan dinamis.

### Task 5 — Cloud Scheduler `sendPaymentReminder` (cron 08.00 WIB)

[functions/src/scheduled/sendPaymentReminder.ts](../functions/src/scheduled/sendPaymentReminder.ts):

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

export const sendPaymentReminder = onSchedule(
  { schedule: '0 8 * * *', timeZone: TZ, region: 'asia-southeast2' },
  async () => {
    const now = dayjs().tz(TZ);
    
    // Cari semua periode active dengan jatuh tempo H-3, H-1, atau H+0
    const targetDays = [3, 1, 0];
    
    for (const offset of targetDays) {
      const targetStart = now.add(offset, 'day').startOf('day').valueOf();
      const targetEnd = now.add(offset, 'day').endOf('day').valueOf();
      
      const periodSnap = await db.collectionGroup('periods')
        .where('status', '==', 'open')
        .where('jatuhTempo', '>=', targetStart)
        .where('jatuhTempo', '<=', targetEnd)
        .get();
      
      for (const periodDoc of periodSnap.docs) {
        const groupRef = periodDoc.ref.parent.parent!;
        const periodeNomor = periodDoc.data().nomor;
        
        // Get all members yang belum bayar
        const members = await groupRef.collection('members').get();
        const payments = await periodDoc.ref.collection('payments').get();
        const paidUserIds = new Set(payments.docs.filter(p => p.data().status === 'lunas').map(p => p.id));
        
        for (const memberDoc of members.docs) {
          if (paidUserIds.has(memberDoc.id)) continue;
          const userDoc = await db.collection('users').doc(memberDoc.id).get();
          const token = userDoc.data()?.expoPushToken;
          if (!token) continue;
          
          const label = offset === 0 ? 'hari ini' : `${offset} hari lagi`;
          await sendNotif({
            token,
            title: 'Reminder iuran arisan',
            body: `Iuran periode ${periodeNomor} jatuh tempo ${label}`,
            data: { type: 'payment-reminder', route: `arisan://group/${groupRef.id}?tab=pembayaran` },
            dedupKey: `payment-reminder_${memberDoc.id}_${periodDoc.id}_H-${offset}_${now.format('YYYY-MM-DD')}`,
          });
        }
      }
    }
  }
);
```

**Index requirement:** `collectionGroup('periods') where status == 'open' and jatuhTempo range` — tambah ke [firestore.indexes.json](../firestore.indexes.json):
```json
{
  "collectionGroup": "periods",
  "queryScope": "COLLECTION_GROUP",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "jatuhTempo", "order": "ASCENDING" }
  ]
}
```

### Task 6 — Cloud Scheduler `markLatePayments` (cron 09.00 WIB harian)

[functions/src/scheduled/markLatePayments.ts](../functions/src/scheduled/markLatePayments.ts):

```ts
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { db } from '../lib/firestore';
import admin from 'firebase-admin';
import dayjs from 'dayjs';

export const markLatePayments = onSchedule(
  { schedule: '0 9 * * *', timeZone: 'Asia/Jakarta', region: 'asia-southeast2' },
  async () => {
    // H+3 dari jatuh tempo dan belum lunas → mark "terlambat"
    const threshold = dayjs().subtract(3, 'day').valueOf();
    
    const overdueSnap = await db.collectionGroup('periods')
      .where('status', '==', 'open')
      .where('jatuhTempo', '<', threshold)
      .get();
    
    for (const periodDoc of overdueSnap.docs) {
      const groupRef = periodDoc.ref.parent.parent!;
      const members = await groupRef.collection('members').get();
      
      for (const m of members.docs) {
        const paymentRef = periodDoc.ref.collection('payments').doc(m.id);
        const paymentSnap = await paymentRef.get();
        const currentStatus = paymentSnap.data()?.status;
        
        if (currentStatus === 'lunas' || currentStatus === 'terlambat') continue;
        
        await paymentRef.set({
          userId: m.id,
          status: 'terlambat',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }
    }
  }
);
```

Export di [functions/src/index.ts](../functions/src/index.ts), deploy: `firebase deploy --only functions --project dev`.

**Catatan emulator:** Cloud Scheduler tidak fully emulated. Untuk test, panggil function manual via `firebase functions:shell` atau buat test trigger HTTP wrapper.

### Task 7 — Firestore rules untuk periods & payments

Update [firestore.rules](../firestore.rules):

```
match /groups/{groupId}/periods/{periodeId} {
  allow read: if request.auth != null && isMember(groupId);
  allow write: if false;
  
  match /payments/{userId} {
    allow read: if request.auth != null && isMember(groupId);
    allow write: if false;  // ONLY Cloud Function validatePayment
  }
}
```

Deploy rules.

### Task 8 — Rework tab Pembayaran di [app/group/[id].tsx](../app/group/%5Bid%5D.tsx)

Major refactor — pisahkan jadi komponen `PembayaranTab` di [src/screens/PembayaranTab.tsx](../src/screens/PembayaranTab.tsx).

Spec:
- **Period picker** di atas (chip horizontal scroll, current periode highlighted)
- **Progress card** — derive dari real-time payments: collected = sum(lunas) × nominal, target = totalAnggota × nominal
- **Member list** — subscribe ke `groups/{groupId}/periods/{periodeId}/payments` + `groups/{groupId}/members`
  - Tiap row: avatar, nama, status badge (Belum/Lunas/Terlambat)
  - **Khusus ketua**: tap row anggota yang status `belum`/`terlambat` → tombol "Konfirmasi" muncul
  - **Bukan ketua**: row read-only
- **Hapus** tombol blanket "Konfirmasi Pembayaran" di sticky bottom — diganti per-anggota di atas

Konfirmasi flow:
```ts
const confirmPayment = async (userId: string) => {
  setLoading(true);
  try {
    await functions('asia-southeast2').httpsCallable('validatePayment')({
      groupId, periodeId, userId
    });
    // onSnapshot akan auto-update UI, tidak perlu refetch
  } catch (e: any) {
    toast(e.message ?? 'Gagal konfirmasi pembayaran');
  } finally {
    setLoading(false);
  }
};
```

### Task 9 — Notif handler deep link untuk `payment-confirmed` & `payment-reminder`

Update [app/_layout.tsx](../app/_layout.tsx) — handle `Notifications.addNotificationResponseReceivedListener`:

```ts
useEffect(() => {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const route = response.notification.request.content.data?.route as string | undefined;
    if (route) {
      const { hostname, path, queryParams } = Linking.parse(route);
      // Mapping per CLAUDE.md §5b
      if (hostname === 'group') {
        const id = path?.replace('/', '');
        router.push(`/group/${id}?tab=${queryParams?.tab ?? 'pembayaran'}`);
      } else if (hostname === 'riwayat') {
        router.push(`/riwayat?groupId=${queryParams?.groupId}`);
      }
      // ... mapping lain
    }
  });
  return () => sub.remove();
}, []);
```

---

## ✅ Definition of Done

- [ ] Cloud Function `validatePayment` deployed, tested di Emulator: ketua confirm → status lunas; bukan ketua → permission denied; double confirm → error
- [ ] Cloud Scheduler `sendPaymentReminder` deployed, tested manual trigger via functions shell
- [ ] Cloud Scheduler `markLatePayments` deployed, tested manual: periode jatuh tempo > 3 hari & belum bayar → status terlambat
- [ ] Firestore rules `periods` & `payments` deployed (client write deny)
- [ ] Firestore index `periods collectionGroup status+jatuhTempo` deployed
- [ ] `createGroup` updated untuk seed semua periode dengan jatuh tempo
- [ ] [app/group/[id].tsx](../app/group/%5Bid%5D.tsx) PembayaranTab rework: period picker, real-time data, per-anggota konfirmasi (ketua only)
- [ ] Empty/loading/error state handled
- [ ] Push notif `payment-confirmed` & `payment-reminder` received di device fisik (test dengan trigger manual)
- [ ] Deep link dari notif buka tab pembayaran grup yang benar
- [ ] CLAUDE.md §1.5 gap "Pembayaran tab hardcoded periode 3" + "Konfirmasi pembayaran tanpa handler" bisa dicoret
- [ ] `npm run lint && npm run typecheck` green
- [ ] Branch `feat/phase-04-payment` + PR opened

---

## 🧪 Acceptance Criteria (PRD §10.2)

- [ ] Status pembayaran ter-update dalam < 2 detik setelah ketua konfirmasi (real-time via onSnapshot)
- [ ] Konfirmasi bayar diproses via Cloud Function `validatePayment`, bukan direct write
- [ ] Semua anggota melihat status yang sama (konsistensi real-time)
- [ ] Reminder terkirim H-3, H-1, H-0 via Cloud Scheduler, bukan client-triggered

---

## ❌ Out of scope Phase 4

- ❌ JANGAN implement upload bukti transfer — Phase 2 PRD out of scope
- ❌ JANGAN implement payment gateway — permanen out of scope (PRD §14.1)
- ❌ JANGAN implement "tolak konfirmasi" / undo confirm — UI tidak ada di design, leave for Phase 2
- ❌ JANGAN trigger reminder via client onResume / focus effect — server-side ONLY
- ❌ JANGAN handle ketua-anggota promotion (kalau ketua keluar) — Phase 2 / out of scope MVP

---

## 🚨 Common pitfalls

1. **Direct `setDoc` ke `payments` dari client** — security rules akan deny, tapi developer kadang lupa dan write logic langsung di client. Selalu via `httpsCallable('validatePayment')`.
2. **Lupa `region` di httpsCallable** — `functions('asia-southeast2')`, bukan `functions()` (default us-central1).
3. **Reminder duplikat** — pastikan `dedupKey` mengandung tanggal (`YYYY-MM-DD`) agar berbeda per hari, tapi sama dalam 1 hari.
4. **Late detection race**: kalau ketua confirm di jam 09:00:01 saat `markLatePayments` baru jalan jam 09:00:00 — anggota mungkin terlanjur marked terlambat. Acceptable for MVP, fix di Phase 2.
5. **Cron timezone**: default UTC. WAJIB `timeZone: 'Asia/Jakarta'`.

---

## 🤔 When to ask user

- Sebelum rework UI PembayaranTab — konfirmasi: design baru OK untuk hapus blanket confirm button, replace dengan per-anggota? (sesuai §1.5 rekomendasi)
- Jika test push notif gagal — kemungkinan token belum register (Phase 2 task 8) atau permission denied di device, ask user check
- Untuk `markLatePayments` cron time — default 09.00 WIB (1 jam setelah reminder). Konfirmasi.

---

## 📦 Commit message

```
feat(payment): real-time payment tracking with server validation

- Add validatePayment Cloud Function (Firestore Transaction)
- Add sendPaymentReminder + markLatePayments Cloud Schedulers (Asia/Jakarta)
- Add push notif dedup via notifLog
- Rework PembayaranTab: period picker, real-time data, per-anggota confirm
- Seed period docs with jatuhTempo on group creation
- Deep link handler for payment notifications

Acceptance: PRD §10.2
Refs: CLAUDE.md §27 Week 4, fixes §1.5 hardcoded period & blanket confirm
```
