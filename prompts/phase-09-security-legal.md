# Phase 9 — Security Hardening + Legal Compliance

**Session type:** New Claude Code session. Paste this entire file as your first message.

---

## 🎯 Goal

(1) Firestore Security Rules complete + 100% coverage test suite. (2) Privacy Policy + Terms of Service in-app accessible from Settings. (3) Delete Account flow (UU PDP No. 27/2022 compliant). (4) Crashlytics + Performance Monitoring runtime active. (5) Firebase Analytics events untuk OKR validation. (6) (Opsional) Sentry untuk JS error tracking.

---

## 📋 Prerequisites

- Phase 1–8 complete & merged
- Firebase Emulator test pass untuk rules existing (`npm run test:rules` green)
- User memiliki Privacy Policy & ToS text yang siap (atau approve placeholder yang Claude akan tulis)

---

## 📚 Required reading

1. **CLAUDE.md**:
   - §1.5 missing F13 Privacy Policy + ToS + Delete Account flow
   - §6 Security non-negotiables
   - §21 Logging, Analytics & Event Tracking (FULL section)
   - §19 Production Readiness Checklist (semua LEGAL & MONITORING items)
   - §27 Week 9 checklist
2. **PRD §4.3 F13, §10.5** — legal & compliance acceptance
3. **UU PDP context**: UU No. 27/2022 — user berhak hapus semua data pribadi. Implementasi: hard delete `users/{userId}` doc + anonymize semua referensi (set fields ke "Pengguna Dihapus").
4. **File existing**:
   - [app/(tabs)/profil.tsx](<../app/(tabs)/profil.tsx>) — sekarang sudah punya menu, tambah entry Privacy/ToS/Delete Account

---

## 🏗️ Tasks

### Task 1 — Firestore Security Rules complete + finalize

Audit [firestore.rules](../firestore.rules) — verify SEMUA collection sudah covered:

- `users/{userId}` ✅ (Phase 2)
- `otpQuota/{phone}` ✅ (Phase 2 — deny all)
- `groups/{groupId}` ✅ (Phase 3)
- `groups/{groupId}/members/{userId}` ✅ (Phase 3)
- `groups/{groupId}/activityLog/{logId}` ✅ (Phase 3 — append-only)
- `groups/{groupId}/periods/{periodeId}` ✅ (Phase 4)
- `groups/{groupId}/periods/{periodeId}/payments/{userId}` ✅ (Phase 4)
- `groups/{groupId}/winners/{periodeId}` ✅ (Phase 5)
- `groups/{groupId}/swapRequests/{requestId}` ✅ (Phase 7)
- `groups/{groupId}/messages/{messageId}` ✅ (Phase 7)
- `notifLog/{key}` — TAMBAH: deny all (dedup log)
- `nps/{key}` — TAMBAH untuk Phase 9 NPS survey

Pastikan default deny tetap di akhir:

```
match /{document=**} {
  allow read, write: if false;
}
```

Test additional cases — extend [**tests**/rules/](../__tests__/rules/):

- `notifLog` — verify deny all client access
- `nps` — verify hanya owner bisa write
- Final sweep: test setiap collection user dengan/tanpa auth, dalam/luar grup

Target: 100% rule coverage. Run `npm run test:rules`, fix sampai green.

Deploy: `firebase deploy --only firestore:rules --project dev`.

### Task 2 — Privacy Policy & Terms of Service screens

Buat folder [app/legal/](../app/legal/):

**[app/legal/\_layout.tsx](../app/legal/_layout.tsx):**

```tsx
import { Stack } from 'expo-router';
export default function LegalLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

**[app/legal/privacy.tsx](../app/legal/privacy.tsx)** — Privacy Policy. Pakai existing [Header](../src/components/Header.tsx). ScrollView dengan section:

1. **Informasi yang Kami Kumpulkan** — nomor HP, nama, foto profil, push token
2. **Cara Kami Menggunakan Informasi** — verifikasi identitas, koordinasi grup arisan, kirim notifikasi
3. **Penyimpanan Data** — Firebase Firestore region Jakarta (Indonesia)
4. **Pihak Ketiga** — Firebase (Google), Expo Push Notifications
5. **Hak Pengguna (UU PDP No. 27/2022)** — akses, koreksi, hapus, portabilitas data
6. **Cookies / Tracking** — Firebase Analytics dengan event tracking (anonim, tanpa PII)
7. **Penyimpanan & Retensi** — data grup disimpan permanen; user delete akan hapus referensi user
8. **Kontak** — email PIC privacy

Buat full text dalam Bahasa Indonesia. Sertakan placeholder `[NAMA TIM]` dan `[EMAIL KONTAK]` untuk di-fill user.

**[app/legal/tos.tsx](../app/legal/tos.tsx)** — Terms of Service:

1. **Penerimaan Syarat** — usia min 18, registrasi via HP
2. **Penggunaan Layanan** — hanya untuk arisan komunitas, bukan judi
3. **Tanggung Jawab Pengguna** — akurasi data, kerahasiaan akun
4. **Disclaimer** — Arisan App TIDAK memproses dana, hanya tracking. Sengketa keuangan tanggung jawab anggota grup
5. **Pembatasan Tanggung Jawab** — bug, data loss, dispute
6. **Aturan Konten** — chat tidak boleh: SARA, kekerasan, spam, ilegal
7. **Penangguhan & Penghentian** — pelanggaran ToS dapat berakibat akun ditangguhkan
8. **Perubahan Layanan** — notify user 30 hari sebelum perubahan material
9. **Hukum Yang Berlaku** — Republik Indonesia

Sama: placeholder `[NAMA TIM]` untuk di-fill user.

**Important:** Konfirmasi ke user — tulis full text sendiri atau user provide. Default: Claude buat draft yang user review & adjust.

### Task 3 — Update auth/consent.tsx + profil.tsx untuk link Privacy/ToS

[app/auth/consent.tsx](../app/auth/consent.tsx) (Phase 2) — text "Saya setuju..." + 2 link clickable:

```tsx
<Text>
  Saya setuju dengan{' '}
  <Text style={styles.link} onPress={() => router.push('/legal/privacy')}>
    Kebijakan Privasi
  </Text>{' '}
  dan{' '}
  <Text style={styles.link} onPress={() => router.push('/legal/tos')}>
    Ketentuan Layanan
  </Text>
</Text>
```

[app/(tabs)/profil.tsx](<../app/(tabs)/profil.tsx>) — tambah menu section "Hukum & Privasi":

- Item 1: "Kebijakan Privasi" → `router.push('/legal/privacy')`
- Item 2: "Ketentuan Layanan" → `router.push('/legal/tos')`
- Item 3 (danger): "Hapus Akun" → `router.push('/akun/hapus')` (Task 4)

### Task 4 — Delete Account flow

[app/akun/hapus.tsx](../app/akun/hapus.tsx) — confirmation screen:

- Warning besar: ⚠️ "Hapus Akun Permanen"
- Penjelasan:
  - Profil & data login akan dihapus permanen
  - Data grup arisan (riwayat, pembayaran) **tetap tersimpan** untuk transparansi grup, tapi nama kamu diganti "Pengguna Dihapus"
  - Tidak bisa dibatalkan
  - Jika ada grup di mana kamu **ketua tunggal**, harus tunjuk ketua baru dulu (atau bubarkan grup)
- TextInput "Ketik HAPUS untuk konfirmasi" (case-sensitive)
- Tombol "Hapus Akun Saya Selamanya" (danger color, disabled sampai text === "HAPUS")
- Submit → `httpsCallable('deleteAccount')()`

Cloud Function [functions/src/callable/deleteAccount.ts](../functions/src/callable/deleteAccount.ts):

```ts
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db, auth as adminAuth } from '../lib/firestore';
import admin from 'firebase-admin';

export const deleteAccount = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Wajib login');
  const uid = req.auth.uid;

  // 1. Cek apakah user adalah ketua tunggal di grup manapun
  const ketuaGroups = await db.collection('groups').where('ketuaId', '==', uid).get();
  if (!ketuaGroups.empty) {
    throw new HttpsError(
      'failed-precondition',
      `Kamu ketua di ${ketuaGroups.size} grup. Tunjuk ketua baru atau bubarkan grup dulu.`,
    );
    // Phase 2 enhancement: bisa transfer ketua flow
  }

  // 2. Anonymize semua referensi di grup yang user adalah anggota
  const memberDocs = await db.collectionGroup('members').where('userId', '==', uid).get();
  const batch = db.batch();

  for (const memberDoc of memberDocs.docs) {
    batch.update(memberDoc.ref, {
      nama: 'Pengguna Dihapus',
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  // 3. Anonymize messages (keep text, anonymize author)
  const messageDocs = await db.collectionGroup('messages').where('authorId', '==', uid).get();
  for (const msg of messageDocs.docs) {
    batch.update(msg.ref, { authorNama: 'Pengguna Dihapus' });
  }

  // 4. Anonymize activityLog actorNama
  const logDocs = await db.collectionGroup('activityLog').where('actorId', '==', uid).get();
  for (const log of logDocs.docs) {
    batch.update(log.ref, { actorNama: 'Pengguna Dihapus' });
  }

  // 5. Hapus user doc
  batch.delete(db.collection('users').doc(uid));

  await batch.commit();

  // 6. Hapus Auth user (last — tidak bisa rollback)
  await adminAuth.deleteUser(uid);

  return { ok: true };
});
```

Update Firestore rules untuk allow Cloud Function update `members.deletedAt`, `messages.authorNama`, `activityLog.actorNama` — semua harus tetap deny client write, hanya admin SDK.

**Catatan UU PDP**: hard delete `users/{userId}` + anonymize referensi = compliant. Audit trail tetap utuh (PRD principle: append-only log).

Setelah Cloud Function sukses, client side:

```ts
await deleteAccount();
await useAuthStore.getState().logout();
router.replace('/auth/phone');
toast('Akun berhasil dihapus');
```

### Task 5 — Firebase Crashlytics runtime initialization

[src/services/crashlytics.ts](../src/services/crashlytics.ts):

```ts
import crashlytics from '@react-native-firebase/crashlytics';

export const initCrashlytics = async () => {
  await crashlytics().setCrashlyticsCollectionEnabled(true);
};

export const setCrashlyticsUser = (uid: string) => {
  crashlytics().setUserId(uid);
  // JANGAN set nomor HP / nama (PII)
};

export const logEvent = (msg: string) => crashlytics().log(msg);

export const recordError = (err: Error, context?: Record<string, any>) => {
  if (context)
    Object.entries(context).forEach(([k, v]) => crashlytics().setAttribute(k, String(v)));
  crashlytics().recordError(err);
};
```

Call `initCrashlytics()` di [app/\_layout.tsx](../app/_layout.tsx) saat app start. Call `setCrashlyticsUser(uid)` di auth listener setelah user login.

**Verifikasi**: force crash di dev (button hidden behind 5 taps di profil debug section):

```ts
import crashlytics from '@react-native-firebase/crashlytics';
crashlytics().crash();
```

Cek di Firebase Console → Crashlytics tab → crash report muncul dalam 5 menit.

### Task 6 — Firebase Performance Monitoring

[src/services/performance.ts](../src/services/performance.ts):

```ts
import perf from '@react-native-firebase/perf';

export const initPerformance = async () => {
  await perf().setPerformanceCollectionEnabled(true);
};

export const startTrace = (name: string) => perf().startTrace(name);
export const newHttpMetric = (url: string, method: string) =>
  perf().newHttpMetric(url, method as any);
```

Call `initPerformance()` di app start.

Tambah custom trace untuk operations kritis:

```ts
// Di confirmPayment:
const trace = await startTrace('payment_confirm_e2e');
await trace.start();
try {
  await httpsCallable('validatePayment')({...});
} finally {
  await trace.stop();
}
```

Cek di Firebase Console → Performance tab → trace muncul (butuh ~30 menit data baru tampil).

### Task 7 — Firebase Analytics events

[src/services/analytics.ts](../src/services/analytics.ts):

```ts
import analytics from '@react-native-firebase/analytics';

export const trackEvent = async (name: string, params?: Record<string, any>) => {
  // SAFETY: filter PII
  const safe = params
    ? Object.fromEntries(
        Object.entries(params).filter(([k]) => !['phone', 'nama', 'fotoUrl', 'text'].includes(k)),
      )
    : undefined;
  await analytics().logEvent(name, safe);
};

export const setUserProperty = async (
  key: 'role_primary' | 'groups_count' | 'timezone',
  value: string,
) => {
  await analytics().setUserProperty(key, value);
};

export const setAnalyticsUser = (uid: string) => analytics().setUserId(uid);
```

Implementasi event taxonomy per [CLAUDE.md §21.3](../CLAUDE.md#21-logging-analytics--event-tracking):

| Trigger                                                           | Event                                                                  |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------- |
| Group create success di [app/grup/baru.tsx](../app/grup/baru.tsx) | `trackEvent('group_created', { frekuensi, jumlahPeriode, nominal })`   |
| Join via kode/link di [app/grup/join.tsx](../app/grup/join.tsx)   | `trackEvent('group_joined', { via: 'code'                              | 'link' })` |
| `validatePayment` success di client                               | `trackEvent('payment_confirmed', { groupId, periodeId, late: false })` |
| `triggerUndian` success di client                                 | `trackEvent('undian_triggered', { mode: 'mode3', method })`            |
| `setTanggalPelaksanaan` success                                   | `trackEvent('winner_set_tanggal', { daysFromWin })`                    |
| `requestSwap` success                                             | `trackEvent('swap_requested')`                                         |
| `approveSwap` success                                             | `trackEvent('swap_approved', { daysToComplete })`                      |
| Chat message send                                                 | `trackEvent('chat_message_sent', { length: bucketed })`                |
| Notif tap                                                         | `trackEvent('notif_opened', { type })`                                 |
| App foreground                                                    | `trackEvent('app_opened', { from })`                                   |

Set user properties saat login:

```ts
await setAnalyticsUser(uid);
await setUserProperty('timezone', user.timezone);
// role_primary & groups_count update saat user.groups changes
```

### Task 8 — NPS survey trigger (optional foundation)

Skema minimum:

- Trigger condition: `winner_set_tanggal` count for user ≥ 2 (track via Firestore `nps/{userId}_state`)
- Modal: rating 0-10 + optional text comment
- Save: `nps/{userId}_{periodeNumber}` document
- Don't show again for 90 days after submit

Bisa stub UI placeholder di Phase 9, full trigger logic di Phase 2 jika overrun.

### Task 9 — (Opsional) Sentry

Jika tim mau Sentry untuk JS error tracking:

```bash
npx @sentry/wizard@latest -i reactNative
```

Set DSN di `EXPO_PUBLIC_SENTRY_DSN` env. Wrap app dengan ErrorBoundary.

**Konfirmasi user**: pakai Sentry atau Crashlytics saja cukup? Crashlytics native sudah cover JS error di production builds (sourcemap auto via EAS).

---

## ✅ Definition of Done

- [ ] Firestore rules 100% coverage di test suite (`npm run test:rules` green untuk semua collection)
- [ ] Privacy Policy screen [app/legal/privacy.tsx](../app/legal/privacy.tsx) ada, accessible dari Profil + auth consent
- [ ] Terms of Service screen [app/legal/tos.tsx](../app/legal/tos.tsx) ada
- [ ] Delete Account flow:
  - Screen [app/akun/hapus.tsx](../app/akun/hapus.tsx) ada
  - Cloud Function `deleteAccount` deployed
  - Test: user delete → users doc hapus, members/messages/activityLog anonymized ke "Pengguna Dihapus"
  - Test: ketua tunggal → throw error "tunjuk ketua baru dulu"
- [ ] Crashlytics initialized, force crash button (dev only) → crash report muncul di Firebase Console
- [ ] Performance Monitoring initialized, trace `payment_confirm_e2e` muncul di console
- [ ] Analytics events ter-fire untuk: group_created, payment_confirmed, undian_triggered, winner_set_tanggal, app_opened (minimum 5 events)
- [ ] User properties `timezone`, `role_primary`, `groups_count` ter-set
- [ ] PII safety: nama, phone, text TIDAK pernah masuk Analytics params (audit code)
- [ ] CLAUDE.md §1.5 missing F13 screens BISA DICORET
- [ ] `npm run lint && npm run typecheck && npm test && npm run test:rules` semua green
- [ ] Branch `feat/phase-09-security-legal` + PR opened

---

## 🧪 Acceptance Criteria (PRD §10.4, §10.5)

- [ ] Anggota tidak bisa write langsung ke Firestore collections kritis (rules + test pass)
- [ ] `activityLog` tidak bisa dihapus atau diupdate oleh siapapun (test pass)
- [ ] Firestore Security Rules 100% ter-cover oleh automated tests di Firebase Emulator
- [ ] Firebase Crashlytics aktif dan menerima crash reports
- [ ] Cloud Scheduler berjalan dan mengirim reminder (verified Phase 4 & 6)
- [ ] Privacy Policy & Terms of Service accessible dari dalam app
- [ ] Flow delete akun berjalan dan menghapus/anonymize data user dari Firestore

---

## ❌ Out of scope Phase 9

- ❌ JANGAN implement transfer ketua flow (untuk ketua tunggal yang mau delete) — flag sebagai Phase 2 enhancement, untuk MVP cukup throw error
- ❌ JANGAN implement export data user (UU PDP right to portability) — Phase 2, MVP cukup delete
- ❌ JANGAN implement granular consent (opt-in/out per analytics event) — MVP: blanket consent at register
- ❌ JANGAN host Privacy Policy / ToS di domain eksternal (untuk URL Store listing) — itu Phase 10 task
- ❌ JANGAN translate Privacy Policy ke English — MVP Indonesia only

---

## 🚨 Common pitfalls

1. **PII di Analytics events** — `nama`, `phone`, `fotoUrl`, `text` chat content — JANGAN log. Filter di `trackEvent` helper.
2. **Crashlytics di dev environment** — by default disabled di debug builds. Untuk verify, enable manual + force crash.
3. **Delete Account leak**: jika `batch.commit()` sukses tapi `adminAuth.deleteUser()` fail, user di-anonymize tapi masih bisa login dengan auth lama. Mitigasi: delete auth user pertama (kalau gagal, batch tidak commit). Atau: tetap urutan ini tapi retry deleteUser.
4. **Privacy Policy lupa nyebut Firebase Analytics tracking** — wajib disclose third-party tools (Google Firebase). Audit teks.
5. **Trace `start()` tanpa `stop()`** akan leak memory + pollute trace data. WRAP dengan try/finally.

---

## 🤔 When to ask user

- Privacy Policy & ToS full text: Claude tulis draft Bahasa Indonesia atau user provide?
- Placeholder `[NAMA TIM]` dan `[EMAIL KONTAK]` — minta user fill
- Sentry: pakai atau Crashlytics-only? Cost (Sentry free tier 5k events/month)
- NPS survey: implement penuh di Phase 9 atau stub untuk Phase 2?
- Delete account untuk ketua tunggal: throw error (MVP) atau buat flow tunjuk ketua baru sekarang (lebih kompleks)?

---

## 📦 Commit message

```
feat(security+legal): rules 100%, Privacy/ToS, delete account, monitoring

- Audit & complete Firestore Security Rules (100% rule coverage tests)
- Add Privacy Policy & Terms of Service screens (Bahasa Indonesia)
- Add Delete Account flow with anonymize-on-delete (UU PDP compliant)
- Add deleteAccount Cloud Function with ketua-tunggal guard
- Initialize Firebase Crashlytics + Performance Monitoring
- Add Firebase Analytics events per OKR taxonomy with PII filter
- Set user properties: timezone, role_primary, groups_count

Acceptance: PRD §10.4, §10.5
Refs: CLAUDE.md §27 Week 9, fixes §1.5 missing F13 screens
```
