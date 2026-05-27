# Phase 7 — Tukar Giliran (2-Layer Approval) + Group Chat Real-time

**Session type:** New Claude Code session. Paste this entire file as your first message.

---

## 🎯 Goal

(1) Tukar giliran 2-layer approval (anggota target setuju → ketua approve final), max 2× per anggota. (2) Group chat real-time via Firestore `onSnapshot`, inverted FlatList, pagination 30 pesan/load, badge KETUA, system messages append-only.

---

## 📋 Prerequisites

- Phase 1–6 complete & merged
- Verifikasi: ada minimal 1 grup dengan urutan ter-set (Mode 1 preset atau Mode 3 sudah jalan beberapa periode)
- Test scenario: 3 user roles ready — Ketua, Anggota A (request), Anggota B (target)

---

## 📚 Required reading

1. **CLAUDE.md**:
   - §1.5 mismatch #3 "Limit tukar 1× → 2×" — Phase 7 fix
   - §1.5 missing screen "Layer 2 — ketua approve setelah recipient setuju" — Phase 7 build
   - §1.5 gap "Chat ScrollView static" — Phase 7 rewrite ke inverted FlatList + pagination 30 + onSnapshot
   - §4 Domain Model — `swapRequests/{requestId}` + `messages/{messageId}`
   - §5 F06 Tukar Giliran + F07 Group Chat
   - §6 Security — messages append-only, swap pakai Firestore Transaction
   - §27 Week 7 checklist
2. **PRD §4.2 F06, F07** — full spec
3. **File existing yang dirombak**:
   - **[app/tukar.tsx](../app/tukar.tsx)** — line 46 `"1× sisa"` (HARDCODED 1), PRD bilang **2×**. Fix.
   - **[app/approval.tsx](../app/approval.tsx)** — saat ini layer 1 (anggota target view) sudah ada, perlu wire ke Cloud Function. Tidak ada layer 2 ketua approve. Phase 7 BUAT screen baru untuk ketua.
   - **[src/screens/ChatTab.tsx](../src/screens/ChatTab.tsx)** — saat ini `ScrollView` static dari SEED_MESSAGES. Rewrite ke inverted FlatList + pagination.

---

## 🏗️ Tasks

### Task 1 — Extend shared types

Update [functions/shared/types.ts](../functions/shared/types.ts):

```ts
export type SwapRequest = {
  requestId: string;
  groupId: string;
  fromUserId: string; // pengaju
  fromNama: string;
  fromPeriode: number; // giliran asal pengaju
  toUserId: string; // target tukar
  toNama: string;
  toPeriode: number; // giliran target (akan jadi milik pengaju)
  alasan?: string;
  status:
    | 'pending_target'
    | 'target_approved'
    | 'rejected_by_target'
    | 'ketua_approved'
    | 'rejected_by_ketua';
  createdAt: number;
  targetActedAt?: number;
  ketuaActedAt?: number;
};

export type Message = {
  messageId: string;
  groupId: string;
  kind: 'msg' | 'system';
  text: string;
  authorId?: string; // null untuk system
  authorNama?: string;
  authorRole?: 'ketua' | 'anggota'; // snapshot saat kirim
  createdAt: number;
};
```

### Task 2 — Cloud Function `requestSwap` (anggota → kirim request)

[functions/src/callable/requestSwap.ts](../functions/src/callable/requestSwap.ts):

```ts
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from '../lib/firestore';
import { assertMember } from '../lib/auth';
import { sendNotif } from '../lib/notif';
import admin from 'firebase-admin';

const MAX_SWAP_PER_MEMBER = 2;

export const requestSwap = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Wajib login');

  const { groupId, toUserId, alasan } = req.data ?? {};
  if (!groupId || !toUserId) {
    throw new HttpsError('invalid-argument', 'groupId & toUserId wajib');
  }
  if (toUserId === req.auth.uid) {
    throw new HttpsError('invalid-argument', 'Tidak bisa tukar dengan diri sendiri');
  }

  const fromMember = await assertMember(req.auth.uid, groupId);
  const toMember = await assertMember(toUserId, groupId);

  // Cek limit
  if ((fromMember.jumlahTukar ?? 0) >= MAX_SWAP_PER_MEMBER) {
    throw new HttpsError(
      'failed-precondition',
      `Sudah mencapai limit ${MAX_SWAP_PER_MEMBER}× tukar`,
    );
  }

  // Cek belum menang (PRD: hanya yang belum menang yang eligible swap)
  if (fromMember.sudahMenang || toMember.sudahMenang) {
    throw new HttpsError('failed-precondition', 'Tidak bisa tukar — salah satu sudah menang');
  }

  // Cek tidak ada pending request aktif dari user yang sama
  const existing = await db
    .collection('groups')
    .doc(groupId)
    .collection('swapRequests')
    .where('fromUserId', '==', req.auth.uid)
    .where('status', 'in', ['pending_target', 'target_approved'])
    .limit(1)
    .get();
  if (!existing.empty) {
    throw new HttpsError('failed-precondition', 'Masih ada request tukar yang pending');
  }

  const reqRef = db.collection('groups').doc(groupId).collection('swapRequests').doc();
  await reqRef.set({
    groupId,
    fromUserId: req.auth.uid,
    fromNama: fromMember.nama,
    fromPeriode: fromMember.giliran,
    toUserId,
    toNama: toMember.nama,
    toPeriode: toMember.giliran,
    alasan: alasan?.trim() || null,
    status: 'pending_target',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Notif ke target
  const targetUserDoc = await db.collection('users').doc(toUserId).get();
  const token = targetUserDoc.data()?.expoPushToken;
  if (token) {
    await sendNotif({
      token,
      title: 'Request tukar giliran',
      body: `${fromMember.nama} ingin tukar giliran #${fromMember.giliran} dengan giliran #${toMember.giliran} kamu`,
      data: {
        type: 'swap-request',
        route: `arisan://approval?requestId=${reqRef.id}&groupId=${groupId}`,
      },
      dedupKey: `swap_request_${reqRef.id}`,
    });
  }

  return { requestId: reqRef.id };
});
```

### Task 3 — Cloud Function `respondSwapTarget` (Layer 1: anggota target setuju/tolak)

[functions/src/callable/respondSwapTarget.ts](../functions/src/callable/respondSwapTarget.ts):

```ts
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from '../lib/firestore';
import { sendNotif } from '../lib/notif';
import admin from 'firebase-admin';

export const respondSwapTarget = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Wajib login');
  const { groupId, requestId, approve } = req.data ?? {};
  if (!groupId || !requestId || typeof approve !== 'boolean') {
    throw new HttpsError('invalid-argument', 'groupId, requestId, approve wajib');
  }

  const reqRef = db.collection('groups').doc(groupId).collection('swapRequests').doc(requestId);

  const updated = await db.runTransaction(async (tx) => {
    const snap = await tx.get(reqRef);
    if (!snap.exists) throw new HttpsError('not-found', 'Request tidak ditemukan');
    const data = snap.data()!;
    if (data.toUserId !== req.auth!.uid) {
      throw new HttpsError('permission-denied', 'Bukan target request ini');
    }
    if (data.status !== 'pending_target') {
      throw new HttpsError('failed-precondition', 'Request sudah direspons');
    }

    const newStatus = approve ? 'target_approved' : 'rejected_by_target';
    tx.update(reqRef, {
      status: newStatus,
      targetActedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { ...data, status: newStatus };
  });

  // Notif ketua (jika approved) atau pengaju (jika rejected)
  const groupSnap = await db.collection('groups').doc(groupId).get();
  const ketuaId = groupSnap.data()?.ketuaId;

  if (approve && ketuaId) {
    const userDoc = await db.collection('users').doc(ketuaId).get();
    const token = userDoc.data()?.expoPushToken;
    if (token) {
      await sendNotif({
        token,
        title: 'Approval tukar menunggu',
        body: `${updated.fromNama} ↔ ${updated.toNama}. Tap untuk review.`,
        data: {
          type: 'swap-target-approved',
          route: `arisan://approval?requestId=${requestId}&groupId=${groupId}&forKetua=true`,
        },
        dedupKey: `swap_target_approved_${requestId}`,
      });
    }
  } else if (!approve) {
    const userDoc = await db.collection('users').doc(updated.fromUserId).get();
    const token = userDoc.data()?.expoPushToken;
    if (token) {
      await sendNotif({
        token,
        title: 'Request tukar ditolak',
        body: `${updated.toNama} menolak request tukar giliran kamu`,
        data: { type: 'swap-rejected', route: `arisan://group/${groupId}?tab=urutan` },
        dedupKey: `swap_rejected_target_${requestId}`,
      });
    }
  }

  return { ok: true, status: updated.status };
});
```

### Task 4 — Cloud Function `approveSwap` (Layer 2: ketua finalize)

[functions/src/callable/approveSwap.ts](../functions/src/callable/approveSwap.ts):

```ts
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from '../lib/firestore';
import { assertKetua } from '../lib/auth';
import { sendNotif } from '../lib/notif';
import admin from 'firebase-admin';

export const approveSwap = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Wajib login');
  const { groupId, requestId, approve } = req.data ?? {};
  if (!groupId || !requestId || typeof approve !== 'boolean') {
    throw new HttpsError('invalid-argument', 'groupId, requestId, approve wajib');
  }

  const ketua = await assertKetua(req.auth.uid, groupId);
  const reqRef = db.collection('groups').doc(groupId).collection('swapRequests').doc(requestId);

  const result = await db.runTransaction(async (tx) => {
    const reqSnap = await tx.get(reqRef);
    if (!reqSnap.exists) throw new HttpsError('not-found', 'Request tidak ditemukan');
    const r = reqSnap.data()!;
    if (r.status !== 'target_approved') {
      throw new HttpsError('failed-precondition', 'Target belum setuju atau status invalid');
    }

    const now = admin.firestore.FieldValue.serverTimestamp();

    if (!approve) {
      tx.update(reqRef, { status: 'rejected_by_ketua', ketuaActedAt: now });
      return { approved: false, request: r };
    }

    // Atomic swap: swap `giliran` di kedua member docs + increment jumlahTukar masing-masing
    const fromMemberRef = db
      .collection('groups')
      .doc(groupId)
      .collection('members')
      .doc(r.fromUserId);
    const toMemberRef = db.collection('groups').doc(groupId).collection('members').doc(r.toUserId);

    const [fromSnap, toSnap] = await Promise.all([tx.get(fromMemberRef), tx.get(toMemberRef)]);
    const fromCur = fromSnap.data()!;
    const toCur = toSnap.data()!;

    // Final check di dalam transaction
    if (fromCur.sudahMenang || toCur.sudahMenang) {
      throw new HttpsError('failed-precondition', 'Salah satu sudah menang, tidak bisa swap');
    }
    if (fromCur.jumlahTukar >= 2 || toCur.jumlahTukar >= 2) {
      throw new HttpsError('failed-precondition', 'Limit 2× tukar sudah tercapai');
    }

    tx.update(fromMemberRef, {
      giliran: toCur.giliran,
      jumlahTukar: fromCur.jumlahTukar + 1,
    });
    tx.update(toMemberRef, {
      giliran: fromCur.giliran,
      jumlahTukar: toCur.jumlahTukar + 1,
    });

    tx.update(reqRef, { status: 'ketua_approved', ketuaActedAt: now });

    tx.set(db.collection('groups').doc(groupId).collection('activityLog').doc(), {
      type: 'swap_approved',
      actorId: req.auth!.uid,
      actorNama: ketua.nama,
      timestamp: now,
      metadata: {
        requestId,
        from: r.fromNama,
        to: r.toNama,
        fromOldGiliran: fromCur.giliran,
        toOldGiliran: toCur.giliran,
      },
    });

    return { approved: true, request: r };
  });

  // Notif semua anggota grup
  const membersSnap = await db.collection('groups').doc(groupId).collection('members').get();
  for (const m of membersSnap.docs) {
    const userDoc = await db.collection('users').doc(m.id).get();
    const token = userDoc.data()?.expoPushToken;
    if (!token) continue;
    await sendNotif({
      token,
      title: result.approved ? 'Tukar giliran disetujui' : 'Tukar giliran ditolak ketua',
      body: `${result.request.fromNama} ↔ ${result.request.toNama}`,
      data: { type: 'swap-approved', route: `arisan://group/${groupId}?tab=urutan` },
      dedupKey: `swap_finalized_${requestId}_${m.id}`,
    });
  }

  return { ok: true, approved: result.approved };
});
```

### Task 5 — Firestore rules untuk swapRequests & messages

Update [firestore.rules](../firestore.rules):

```
match /groups/{groupId}/swapRequests/{requestId} {
  allow read: if request.auth != null && isMember(groupId);
  allow write: if false;
}

match /groups/{groupId}/messages/{messageId} {
  allow read: if request.auth != null && isMember(groupId);
  allow create: if request.auth != null
    && isMember(groupId)
    && request.resource.data.authorId == request.auth.uid
    && request.resource.data.kind == 'msg'
    && request.resource.data.text is string
    && request.resource.data.text.size() > 0
    && request.resource.data.text.size() <= 1000;
  allow update, delete: if false;  // append-only
}
```

**Catatan**: chat `create` boleh dari client (bukan via Cloud Function) untuk latency. System message hanya via Cloud Function (admin SDK bypass rules). PRD F07 spec.

### Task 6 — Fix limit tukar di [app/tukar.tsx](../app/tukar.tsx)

Line 46: `<Text style={styles.sisaText}>1× sisa</Text>`

Ganti dengan dynamic:

```tsx
// Load current user's jumlahTukar from Firestore
const sisaTukar = 2 - (member?.jumlahTukar ?? 0);
// ...
<Text style={styles.sisaText}>{sisaTukar}× sisa</Text>;
```

Disable form jika `sisaTukar === 0`. Replace seluruh SWAP_CANDIDATES mock dengan real query: `groups/{groupId}/members where sudahMenang == false and userId != currentUid`.

Submit handler:

```ts
await functions('asia-southeast2').httpsCallable('requestSwap')({
  groupId,
  toUserId: pickedUserId,
  alasan: reason.trim() || null,
});
```

### Task 7 — Wire [app/approval.tsx](../app/approval.tsx) (Layer 1 anggota target)

Saat ini logic local state pakai `useState<Status>('pending')`. Wire ke real Firestore:

- Receive `requestId`, `groupId` via params
- Subscribe ke `groups/{groupId}/swapRequests/{requestId}`
- Render UI sesuai data real (siapa pengaju, periode swap, alasan)
- Tolak → `httpsCallable('respondSwapTarget')({ groupId, requestId, approve: false })`
- Setujui → `httpsCallable('respondSwapTarget')({ groupId, requestId, approve: true })`
- Setelah action, status box menampilkan state `target_approved` (waiting ketua) atau `rejected_by_target`

### Task 8 — Buat screen Layer 2 (ketua approve final)

Buat [app/grup/[id]/approve-swap.tsx](../app/grup/%5Bid%5D/approve-swap.tsx):

- Receive `requestId`, `groupId` via params atau notif deep link `forKetua=true`
- Verifikasi user adalah ketua (route guard)
- Tampilkan info request (siapa↔siapa, periode lama→baru, alasan dari pengaju)
- Tampilkan badge "Target sudah setuju ✅"
- Tombol Tolak / Approve → `httpsCallable('approveSwap')({ groupId, requestId, approve })`

Akses: dari notif `swap-target-approved`, atau dari notifikasi center, atau dari list di pengaturan (Phase 2 enhancement).

Atau **alternatif**: reuse [app/approval.tsx](../app/approval.tsx) dengan branching berdasarkan param `forKetua` — ketua melihat sama screen tapi dengan label yang beda ("Layer 2 — Approval Ketua"). Pilih salah satu, dokumentasikan.

### Task 9 — Rewrite [src/screens/ChatTab.tsx](../src/screens/ChatTab.tsx)

**HAPUS** ScrollView static + SEED_MESSAGES mock. **GANTI** dengan inverted FlatList real-time:

```tsx
import { FlatList } from 'react-native';
import { firestore } from '@/services/firebase';

const PAGE_SIZE = 30;

export function ChatTab({ groupId }: { groupId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [oldestTimestamp, setOldestTimestamp] = useState<number | null>(null);

  // Subscribe to latest 30
  useEffect(() => {
    const unsub = firestore()
      .collection('groups')
      .doc(groupId)
      .collection('messages')
      .orderBy('createdAt', 'desc')
      .limit(PAGE_SIZE)
      .onSnapshot((snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Message);
        setMessages(list);
        if (list.length > 0) setOldestTimestamp(list[list.length - 1].createdAt);
      });
    return unsub;
  }, [groupId]);

  const loadMore = async () => {
    if (loadingMore || !hasMore || !oldestTimestamp) return;
    setLoadingMore(true);
    const snap = await firestore()
      .collection('groups')
      .doc(groupId)
      .collection('messages')
      .orderBy('createdAt', 'desc')
      .startAfter(oldestTimestamp)
      .limit(PAGE_SIZE)
      .get();

    if (snap.empty) setHasMore(false);
    else {
      const older = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Message);
      setMessages((prev) => [...prev, ...older]);
      setOldestTimestamp(older[older.length - 1].createdAt);
    }
    setLoadingMore(false);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    await firestore().collection('groups').doc(groupId).collection('messages').add({
      kind: 'msg',
      text: text.trim(),
      authorId: user.uid,
      authorNama: user.nama,
      authorRole: myRole, // 'ketua' | 'anggota'
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        inverted
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <MessageBubble msg={item} mine={item.authorId === user.uid} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingMore ? <ActivityIndicator /> : null}
      />
      <ChatInput onSend={sendMessage} />
    </View>
  );
}
```

Render `MessageBubble`:

- `kind === 'system'` → centered text, italic
- `kind === 'msg'` → bubble kiri/kanan tergantung `mine`, badge "KETUA" jika `authorRole === 'ketua'` dan `!mine`
- Time format pakai dayjs (`HH:mm` for today, `D MMM` for older)

### Task 10 — System messages dari Cloud Functions

Setiap Cloud Function yang sudah ada (`validatePayment`, `triggerUndian`, `setTanggalPelaksanaan`, `approveSwap`) — **tambah** write system message ke `groups/{groupId}/messages`:

Helper [functions/src/lib/systemMessage.ts](../functions/src/lib/systemMessage.ts):

```ts
import { db } from './firestore';
import admin from 'firebase-admin';

export async function postSystemMessage(groupId: string, text: string) {
  await db.collection('groups').doc(groupId).collection('messages').add({
    kind: 'system',
    text,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}
```

Tambahkan call di akhir tiap aksi sukses (di luar transaction supaya tidak rollback bila gagal post):

- `validatePayment`: `postSystemMessage(groupId, `${ketua.nama} mengkonfirmasi pembayaran ${memberNama} periode ${periodeId}`)`
- `triggerUndian`: `postSystemMessage(groupId, `${winner.nama} memenangkan undian periode ${periodeId} 🎉`)`
- `setTanggalPelaksanaan`: `postSystemMessage(groupId, `${member.nama} set pelaksanaan periode ${periodeId}: ${formatTanggal(tanggal)}`)`
- `approveSwap` (jika approved): `postSystemMessage(groupId, `Tukar giliran ${from.nama} ↔ ${to.nama} disetujui ketua`)`

---

## ✅ Definition of Done

- [ ] 3 Cloud Functions deployed: `requestSwap`, `respondSwapTarget`, `approveSwap`
- [ ] Helper `postSystemMessage` + integrated ke `validatePayment`, `triggerUndian`, `setTanggalPelaksanaan`, `approveSwap` (re-deploy semua)
- [ ] Firestore rules `swapRequests` (deny client write) + `messages` (create only) deployed
- [ ] [app/tukar.tsx](../app/tukar.tsx) — `"1× sisa"` HAPUS, ganti dynamic `${2 - jumlahTukar}× sisa`
- [ ] [app/tukar.tsx](../app/tukar.tsx) — submit via `httpsCallable('requestSwap')`, candidate list dari real Firestore
- [ ] [app/approval.tsx](../app/approval.tsx) — wire Layer 1 ke `respondSwapTarget`
- [ ] Layer 2 screen tersedia (baik file baru atau branched approval.tsx)
- [ ] [src/screens/ChatTab.tsx](../src/screens/ChatTab.tsx) REWRITE: inverted FlatList + pagination 30 + onSnapshot
- [ ] System messages muncul otomatis di chat saat aksi terjadi
- [ ] Manual test end-to-end:
  - [ ] Anggota A request swap dengan B → B dapat notif → buka approval screen → setuju → ketua dapat notif → buka layer 2 → approve → semua anggota dapat notif + system message muncul di chat
  - [ ] Tolak di layer 1 → pengaju dapat notif rejected, swap status rejected
  - [ ] Tolak di layer 2 → semua anggota dapat notif rejected
  - [ ] Anggota yang sudah 2× tukar → tombol disabled, error jelas
  - [ ] Chat: kirim pesan, muncul real-time di device lain dalam grup
  - [ ] Chat: scroll up → load older messages (pagination)
- [ ] CLAUDE.md §1.5 mismatch #3 (limit 1×→2×), missing screen Layer 2, chat ScrollView gap BISA DICORET
- [ ] `npm run lint && npm run typecheck` green
- [ ] Branch `feat/phase-07-swap-chat` + PR opened

---

## 🧪 Acceptance Criteria

- [ ] Anggota A request → B (Layer 1) → Ketua (Layer 2) — 2-layer flow
- [ ] Swap diproses via `approveSwap` dengan Firestore Transaction (atomic, tidak bisa setengah)
- [ ] Maksimal 2× tukar per anggota, server enforce
- [ ] Group chat real-time via onSnapshot, latency < 1 detik
- [ ] Badge "Ketua" di nama ketua di chat
- [ ] System messages otomatis untuk: konfirmasi bayar, undian, tanggal set, swap approved
- [ ] Pagination 30 pesan per load
- [ ] Messages tidak bisa di-delete / di-edit (rules deny)

---

## ❌ Out of scope Phase 7

- ❌ JANGAN implement attachment/foto di chat — Phase 2
- ❌ JANGAN implement read receipts / typing indicators — Phase 2
- ❌ JANGAN implement reply / thread — Phase 2
- ❌ JANGAN implement notifikasi WA — permanen out of scope
- ❌ JANGAN allow ketua skip Layer 1 — wajib target approve dulu

---

## 🚨 Common pitfalls

1. **Lupa cek limit 2× di dalam transaction** — race condition jika 2 swap diapprove bersamaan. Cek `fromCur.jumlahTukar` di dalam `runTransaction` (yang kita baca di awal akan stale).
2. **Swap partial**: hanya update `from.giliran` tanpa `to.giliran` jika error tengah jalan. Tidak akan terjadi karena transaction, tapi pastikan kedua `tx.update` di-call sebelum return.
3. **System message gagal rollback transaction**: postSystemMessage di luar transaction. Jika post gagal, swap tetap sukses. Acceptable.
4. **Chat security rules**: pastikan `request.resource.data.text.size() > 0 && <= 1000` — hindari empty atau spam huge text.
5. **Inverted FlatList scroll position**: pastikan `inverted={true}` dan data ter-sort descending (`orderBy('createdAt', 'desc')`).
6. **Pagination duplicate**: `startAfter(oldestTimestamp)` butuh exact value yang sama dengan field. Jika `serverTimestamp` belum committed (PendingWrites), bisa miss. Filter `snap.metadata.hasPendingWrites` jika perlu.

---

## 🤔 When to ask user

- Konfirmasi UX: Layer 2 ketua screen reuse [approval.tsx](../app/approval.tsx) dengan branching, atau file baru terpisah?
- Konfirmasi system message wording — beri user contoh tiap tipe untuk approval Bahasa Indonesia
- Konfirmasi: kalau ketua = pengaju swap (ketua tukar dengan anggota lain), apakah Layer 2 self-approve OK atau wajib admin lain? — MVP: self-approve OK (ketua self-trust). Document.

---

## 📦 Commit message

```
feat(swap+chat): 2-layer swap approval + real-time chat with pagination

- Add requestSwap, respondSwapTarget, approveSwap Cloud Functions
- Atomic swap via Firestore Transaction, max 2x per member
- Build Layer 2 ketua approval screen
- Wire app/approval.tsx and app/tukar.tsx to Cloud Functions
- Rewrite ChatTab: inverted FlatList + pagination 30 + onSnapshot
- Add postSystemMessage helper + integrate to existing Cloud Functions
- Add Firestore rules for swapRequests + messages (append-only)

Fixes: CLAUDE.md §1.5 mismatch #3 (limit 2x), missing Layer 2 screen, chat gap
Acceptance: PRD §4.2 F06, F07
Refs: CLAUDE.md §27 Week 7
```
