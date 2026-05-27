# Arisan App — Konteks Sistem

Aplikasi mobile **Arisan Indonesia** (iOS & Android) untuk mengelola iuran, undian, dan komunikasi kelompok arisan secara digital. Fokus utama: **transparansi** dan **trust**, menggantikan catatan manual + koordinasi WhatsApp.

Referensi lengkap: [Arisan_App_PRD_Final_v2.0.docx](Arisan_App_PRD_Final_v2.0.docx) (v2.0 Final, Mei 2026).

---

## Daftar Isi

**Konteks & gap**
- [§1 Status Saat Ini](#1-status-saat-ini)
- [§1.5 Known Gaps & Mismatch dengan PRD ⚠️](#15-known-gaps--mismatch-dengan-prd-️)

**Arsitektur**
- [§2 Tech Stack](#2-tech-stack)
- [§3 Struktur Folder](#3-struktur-folder)
- [§4 Domain Model (Firestore)](#4-domain-model-firestore--sesuai-prd-63)
- [§5 Fitur MVP](#5-fitur-mvp-phase-1--15)
- [§5b Push Notification Flow](#5b-push-notification-flow)
- [§6 Security — Aturan Tidak Bisa Ditawar](#6-security--aturan-tidak-bisa-ditawar)
- [§7 Non-Functional Targets](#7-non-functional-targets)

**Standar code & UI**
- [§8 Design System](#8-design-system)
- [§9 Bahasa & Lokalisasi](#9-bahasa--lokalisasi)
- [§10 Konvensi Kode](#10-konvensi-kode)
- [§22 Code Quality (ESLint/Prettier)](#22-code-quality)
- [§24 Accessibility Baseline](#24-accessibility-baseline)

**Testing**
- [§11 Testing](#11-testing-target-week-810)

**Operations**
- [§13 Setup & Cara Menjalankan](#13-setup--cara-menjalankan)
- [§16 Build & Release](#16-build--release)
- [§17 Environment & Secrets](#17-environment--secrets)
- [§18 Cloud Functions — Struktur](#18-cloud-functions--struktur--konvensi)
- [§20 Offline & Network Handling](#20-offline--network-handling)
- [§21 Logging, Analytics & Event Tracking](#21-logging-analytics--event-tracking)
- [§23 Git Workflow & CI/CD](#23-git-workflow--cicd)
- [§25 App Assets & Deep Links](#25-app-assets--deep-links)

**Scope, metrics, risk**
- [§12 Out of Scope](#12-out-of-scope-jangan-disarankan-untuk-mvp)
- [§14 OKR Validasi](#14-okr-validasi-3-bulan-pertama)
- [§19 Production Readiness Checklist](#19-production-readiness-checklist-mirror-prd-11)
- [§26 Risks & Mitigations](#26-risks--mitigations-prd-12--ops)
- [§27 Development Roadmap 10 Minggu](#27-development-roadmap-10-minggu--prd-9)

**Reference**
- [§15 Glosarium Singkat](#15-glosarium-singkat)

---

## 1. Status Saat Ini

Project saat ini berisi **UI shell / design prototype** lengkap dari design system, **belum ada backend**:

- Semua data dari [src/data/mock.ts](src/data/mock.ts) (seed lokal)
- State per-screen pakai `useState` — **belum ada state management global**
- **Tidak ada** persistence, auth, networking, Cloud Functions, atau Firestore
- Semua 10+ screen sudah ada visual-nya (lihat [README.md](README.md))

Roadmap berikutnya adalah men-wire UI ini ke backend Firebase sesuai PRD.

---

## 1.5 Known Gaps & Mismatch dengan PRD ⚠️

UI shell sekarang **bukan sekadar belum di-wire ke backend** — ada mismatch struktural & logical dengan PRD yang harus dibereskan sebelum/saat wiring Firebase. **Jangan ulangi pola ini di kode baru.**

### 🔴 Mismatch kritis (UI ada tapi salah)

1. **Undian pakai `Math.random()` di client** — [src/screens/UndianModal.tsx:54-58](src/screens/UndianModal.tsx#L54-L58)
   - PRD §6.2 & §10.3: random WAJIB server-side via Cloud Function `triggerUndian`.
   - **Aksi:** ganti dengan `httpsCallable('triggerUndian')`. Hapus `Math.random()` selamanya.

2. **Mode undian salah konsep** — [src/screens/UndianModal.tsx:16-35](src/screens/UndianModal.tsx#L16-L35)
   - UI sekarang: Random / Manual / Offline (3 opsi sub-pilihan)
   - PRD §4.2 F04: **Mode 1 (pre-determined: seluruh urutan di-generate di awal arisan)** & **Mode 3 (hybrid: periode 1 random semua, berikutnya dari yang belum menang)**.
   - **Aksi:** rombak modal jadi pilihan Mode 1/Mode 3 di level grup (setup awal), bukan per-undian. Manual/Offline harus jadi sub-opsi override ketua, bukan mode utama.

3. **Limit tukar giliran salah angka** — [app/tukar.tsx:46](app/tukar.tsx#L46) hardcoded `"1× sisa"`
   - PRD §4.2 F06: maksimal **2×** per anggota.
   - **Aksi:** ganti ke `2× sisa` dan tracking `jumlahTukar` di `members/{userId}`.

4. **Alasan undian Manual/Offline tidak diwajibkan** — [src/screens/UndianModal.tsx:50](src/screens/UndianModal.tsx#L50)
   - `canConfirm = winner.trim().length > 0` — field `note` tidak dicek.
   - PRD §4.2 F04: alasan **WAJIB** tersimpan di `winners` + `activityLog`.
   - **Aksi:** `canConfirm = winner && note.trim().length > 0` untuk Manual/Offline.

5. **Profil pakai email, bukan nomor HP** — [app/(tabs)/profil.tsx:75](app/(tabs)/profil.tsx#L75)
   - PRD: identity = nomor HP +62, email tidak ada di domain model.
   - **Aksi:** hapus field email, tambahkan field nomor HP (tidak ditampilkan ke anggota lain — data minimization).

### 🟡 Screen PRD yang belum dibuat (wajib sebelum MVP)

| PRD | Screen yang hilang |
|-----|--------------------|
| F01 | Splash → Input nomor HP (+62) → OTP input → first-run consent (Privacy + ToS) |
| F02 | "Buat Grup" form (nama, nominal, frekuensi bulanan/mingguan, jumlah periode) — FAB di [app/(tabs)/index.tsx:99](app/(tabs)/index.tsx#L99) sudah ada tapi `onPress={() => {}}` |
| F02 | Screen invite (generate kode unik + deep link share) — tombol di pengaturan tanpa handler |
| F02 | Screen join via kode / deep link landing |
| F06 | **Layer 2** — screen ketua approve setelah recipient setuju ([app/approval.tsx](app/approval.tsx) baru cover Layer 1) |
| F13 | Privacy Policy in-app, Terms of Service in-app, Delete Account flow (wajib UU PDP & Play Store) |

### 🟠 Gap interaksi/logic yang harus ditulis ulang saat wiring

- **Calendar set-date**: [app/set-date.tsx:22-27](app/set-date.tsx#L22-L27) hardcoded `TODAY=12`, `Juni 2025`, `DAYS_IN_MONTH=30`. Navigation bulan tombolnya kosong. Saat wiring real date → hampir semua logic ditulis ulang pakai dayjs.
- **Chat**: [src/screens/ChatTab.tsx](src/screens/ChatTab.tsx) pakai `ScrollView` static. PRD F07 minta **inverted FlatList + pagination 30/load + onSnapshot subscription**.
- **Notif badge**: counter `3` hardcoded di [app/(tabs)/_layout.tsx:52](app/(tabs)/_layout.tsx#L52). Item notif "winner" di mock juga belum link ke [winner.tsx](app/winner.tsx).
- **Pembayaran tab**: hardcoded periode 3 di [app/group/[id].tsx](app/group/%5Bid%5D.tsx) — belum ada period picker untuk navigasi periode lain.
- **Konfirmasi pembayaran**: tombol di [app/group/[id].tsx:114](app/group/%5Bid%5D.tsx#L114) tanpa handler. Saat wiring: pilih per-anggota (bukan blanket), call Cloud Function `validatePayment` (bukan direct Firestore write).
- **Pengaturan nominal/periode/tanggal mulai**: di-lock di UI ([app/pengaturan.tsx:98-100](app/pengaturan.tsx#L98-L100)). PRD tidak eksplisit larang edit — verifikasi ke product owner sebelum wire.

### ✅ Yang sudah selaras PRD (jangan ubah strukturnya)

- F03 progress bar + 3-state badge (Lunas / Belum / Terlambat) — token warna sesuai
- F05 lock checkbox + minimum H+3 logic
- F06 eligible/disabled candidate + "sudah menang" disable di tukar.tsx
- F07 badge "Ketua" + system message di chat
- F08 filter chips + timeline dot warna di riwayat
- Pengaturan: zona berbahaya (ketik "BUBARKAN") + hapus anggota dgn confirm dialog

---

## 2. Tech Stack

### Saat ini (frontend shell)
- **Expo SDK 54** (managed workflow) + **React Native 0.81** + **React 19**
- **TypeScript strict** mode (`"strict": true` di [tsconfig.json](tsconfig.json))
- **Expo Router** (file-based, typedRoutes enabled)
- **React Navigation v7** (bottom tabs + native stack)
- **lucide-react-native** untuk ikon
- **Inter** via `@expo-google-fonts/inter`
- **react-native-reanimated** untuk animasi
- Path alias: `@/*` → `./src/*`

### Akan ditambahkan (sesuai PRD)
- **`@react-native-firebase/*`** (native modules — bukan JS SDK)
  - `app`, `auth` (Phone OTP +62), `firestore`, `functions`, `crashlytics`, `perf`, `analytics`, `messaging`
  - **Konsekuensi**: harus pakai **`expo-dev-client`** (bukan Expo Go), build via EAS sekali per device
  - Pilihan ini diambil karena PRD wajib Phone Auth + Crashlytics + Performance Monitoring — Firebase JS SDK tidak support semua ini di RN production
- **Firestore** region `asia-southeast2` / Jakarta
- **Firebase Cloud Functions** (Node.js 20, region Jakarta) untuk semua aksi kritis
- **Firebase Cloud Scheduler** untuk reminder server-side
- **Zustand** untuk state management global
- **Expo Notifications** untuk push (token register, dipicu dari Cloud Functions via FCM)
- **dayjs** + `dayjs/plugin/utc` + `dayjs/plugin/timezone` untuk date/time
- **Jest + `@firebase/rules-unit-testing` + Firebase Emulator** untuk testing
- **Detox** untuk E2E

---

## 3. Struktur Folder

```
app/                          ← Routes (Expo Router file-based)
  _layout.tsx                 ← Root stack
  (tabs)/                     ← Bottom tab group
    _layout.tsx               ← Tab bar config
    index.tsx                 ← Beranda / Dashboard list grup
    notif.tsx                 ← Notifikasi Center
    chat.tsx                  ← Chat standalone
    profil.tsx                ← Profil + entry ke semua screen
  group/[id].tsx              ← Detail Grup (tabs Pembayaran/Urutan/Chat)
  winner.tsx                  ← Notifikasi Pemenang (confetti)
  set-date.tsx                ← Set Tanggal Pelaksanaan
  tukar.tsx                   ← Request Tukar Giliran
  approval.tsx                ← Approval recipient view
  riwayat.tsx                 ← Riwayat Aktivitas (activity log)
  pengaturan.tsx              ← Pengaturan Grup (ketua-only)

src/
  theme/                      ← Design tokens (colors, typography, spacing)
  components/                 ← Reusable UI (Button, Badge, Avatar, Card, Header, IconButton, Toast)
  screens/                    ← Sub-screens & modal (UrutanTab, UndianModal, ChatTab)
  data/mock.ts                ← Seed data — akan diganti Firestore queries
```

---

## 4. Domain Model (Firestore — sesuai PRD §6.3)

```
users/{userId}                                          ← nama, nomor HP, foto
groups/{groupId}                                        ← nama, nominal, frekuensi, jumlah periode, status
  /members/{userId}                                     ← role, giliran, sudahMenang, jumlahTukar
  /periods/{periodeId}                                  ← data periode, pemenang, tanggal
    /payments/{userId}                                  ← status bayar per anggota per periode
  /winners/{periodeId}                                  ← audit trail pemenang
  /swapRequests/{requestId}                             ← 2-layer approval status
  /activityLog/{logId}                                  ← APPEND-ONLY, immutable
  /messages/{messageId}                                 ← chat, IMMUTABLE (no delete)
```

### Role
- **Ketua** — admin penuh: konfirmasi bayar, trigger undian, override tanggal, ubah setting, bubarkan grup
- **Anggota** — read + limited write: lihat status, kirim chat, request tukar giliran

---

## 5. Fitur MVP (Phase 1 + 1.5)

| ID | Fitur | Catatan kritis |
|----|-------|----------------|
| F01 | Auth + OTP (+62) | Rate limit 5/jam/nomor via Cloud Function. First-run consent Privacy Policy & ToS |
| F02 | Manajemen Grup | Buat, invite (kode/deeplink), join, dashboard |
| F03 | Tracking Pembayaran | Belum bayar / Lunas / Terlambat (H+3). Reminder H-3/H-1/H-0 server-side |
| F04 | Undian | Mode 1 (pre-determined) & Mode 3 (hybrid). **Random WAJIB server-side**, bukan `Math.random()` di client |
| F05 | Set Tanggal | Min H+3, lock setelah konfirmasi, auto-notif ketua jika H+3 tidak set |
| F06 | Tukar Giliran | **2-layer approval**: target setuju → ketua approve. Max 2x per anggota |
| F07 | Group Chat | Real-time via `onSnapshot`, inverted FlatList, pagination 30, badge Ketua, system messages |
| F08 | Activity Log | Append-only, filter tipe + timezone (WIB/WITA/WIT) |
| F09 | Cloud Functions validation | `validatePayment`, `triggerUndian`, `approveSwap`, `rateLimitOTP` |
| F10 | Cloud Scheduler reminders | `sendPaymentReminder`, `sendPelaksanaanReminder`, `checkTanggalDeadline` — cron 08.00 WIB |
| F11 | Firestore Transactions | Semua aksi multi-dokumen kritis |
| F12 | Crashlytics + Performance | Crash rate target < 1%, P95 load < 3s |
| F13 | Legal & Compliance | Privacy Policy + ToS in-app, data deletion flow (UU PDP 27/2022), region Jakarta |

---

## 5b. Push Notification Flow

Push notif **selalu dipicu dari Cloud Functions / Cloud Scheduler** — tidak pernah dari client.

### Token lifecycle
1. **Register** — setelah login OTP sukses, panggil `Notifications.getExpoPushTokenAsync()`. Tulis ke `users/{userId}.expoPushToken` + `tokenUpdatedAt` (server timestamp).
2. **Refresh** — pada app start, jika token berubah dari yang tersimpan → update Firestore. Listener `addPushTokenListener` untuk auto-refresh.
3. **Revoke** — saat logout / delete account, set `expoPushToken = null` di Firestore (bukan delete dokumen — append-only spirit).
4. **Multi-device** — MVP: 1 device per user (overwrite token lama). Phase 2: array of tokens.

### Permission flow
- iOS: request permission saat pertama buka app **setelah** consent screen (jangan sebelum), berikan konteks ("Untuk reminder bayar dan pengumuman pemenang").
- Android 13+: request `POST_NOTIFICATIONS` runtime permission.
- Jika user deny: tampilkan banner non-blocking di Beranda dengan link ke Settings OS.

### Sending (dari Cloud Function)
- Pakai Expo Push API server-side (`https://exp.host/--/api/v2/push/send`) atau Firebase Admin SDK FCM langsung.
- **Deduplication**: simpan `notifLog/{userId}_{type}_{date}` di Firestore dengan TTL 24h — cek dulu sebelum kirim. PRD §8.1: "tidak ada duplicate notification untuk satu anggota di hari yang sama".
- Payload include `data.route` untuk deep link (mis. `arisan://group/rt03?tab=urutan`) — handle di [app/_layout.tsx](app/_layout.tsx) dengan `Linking.addEventListener`.

### Notif types & deep targets
| Type | Trigger | Deep link |
|------|---------|-----------|
| `winner` | `triggerUndian` selesai | `arisan://winner?groupId=X&periode=Y` |
| `payment-reminder` | Cloud Scheduler H-3/H-1/H-0 | `arisan://group/X?tab=pembayaran` |
| `payment-confirmed` | `validatePayment` sukses | `arisan://riwayat?groupId=X` |
| `swap-request` | `requestSwap` (recipient) | `arisan://approval?requestId=X` |
| `swap-approved` | `approveSwap` selesai | `arisan://group/X?tab=urutan` |
| `pelaksanaan-reminder` | Cloud Scheduler H-3/H-1/H-0 | `arisan://group/X?tab=urutan` |
| `tanggal-overdue` | `checkTanggalDeadline` (ketua) | `arisan://group/X?tab=urutan` |

---

## 6. Security — Aturan Tidak Bisa Ditawar

1. **Server-side trust** — semua aksi bisnis kritis dijalankan via Cloud Function (admin SDK), client TIDAK boleh direct write ke `payments`, `winners`, `swapRequests`, `activityLog`, `members`, `groups`.
2. **Immutable audit trail** — `activityLog` & `messages` **tidak boleh** di-delete/update oleh siapapun, termasuk ketua. Firestore Security Rules enforce.
3. **Atomic operations** — semua operasi multi-dokumen pakai Firestore Transaction (konfirmasi bayar, swap, trigger undian). Tidak boleh ada partial write.
4. **Rate limiting** — OTP max 5x/nomor/jam via `rateLimitOTP` Cloud Function.
5. **Data minimization** — nomor HP **tidak pernah** ditampilkan ke anggota lain, hanya nama.
6. **Least privilege** — user hanya bisa read data grup yang dia ikuti.

### Anti-pattern yang harus dihindari
- ❌ `Math.random()` di client untuk pilih pemenang
- ❌ Direct `setDoc` / `updateDoc` dari client ke collection kritis
- ❌ Scheduling notifikasi di client side (notif harus terkirim meski user tidak buka app)
- ❌ Soft-delete atau fitur edit pesan chat / activity log
- ❌ Menyimpan nomor HP di profil yang dilihat anggota lain

---

## 7. Non-Functional Targets

| Kategori | Target |
|----------|--------|
| Load dashboard | < 2 detik di 4G |
| Real-time update bayar | < 1 detik latency |
| Uptime | 99.5% (Firebase SLA) |
| Crash rate | < 1% |
| P95 screen load | < 3 detik |
| Android support | API 26+ (Android 8.0+) |
| iOS support | iOS 13+ |

---

## 8. Design System

Tokens dari [src/theme/](src/theme/), spec dari design system Indonesia:

- **Primary** `#7F77DD` (ungu)
- **Success** `#1D9E75` + bg `#E1F5EE`
- **Warning** `#BA7517` + bg `#FAEEDA`
- **Danger** `#993C1D` + bg `#FAECE7`
- **Page** `#F8F8F8`, **Card** `#FFFFFF`, **Text** `#1F1F1D`
- **Font**: Inter — H1 24 / H2 20 / H3 17 / Body 15 / Caption 13
- **Status bayar**: merah (belum) / hijau (lunas) / amber (terlambat) — sesuaikan dengan token Success/Warning/Danger

Saat menambah UI baru, **selalu pakai token dari `src/theme`** — jangan hardcode warna/font.

---

## 9. Bahasa & Lokalisasi

- **UI text wajib Bahasa Indonesia** (target user: 25–45 tahun, urban/semi-urban Indonesia).
- Format tanggal pakai lokal Indonesia ("Senin, 27 Mei 2026", "Juni 2025"), bukan ISO mentah.
- Format mata uang: `Rp 1.500.000` (titik sebagai pemisah ribuan, tanpa desimal untuk Rupiah).
- Nomor HP: format `+62 8xx-xxxx-xxxx`, validasi awalan `+62`.

### Timezone convention (WIB / WITA / WIT)

- **Storage**: SEMUA timestamp di Firestore disimpan UTC (`serverTimestamp()` atau `Timestamp.now()`). Jangan pernah simpan string lokal.
- **Render**: convert ke timezone user pakai `dayjs(ts).tz(userTz)`. Default `Asia/Jakarta` (WIB) jika user belum set.
- **User preference**: simpan `users/{userId}.timezone` saat register (`Asia/Jakarta` | `Asia/Makassar` | `Asia/Jayapura`). Default ambil dari device.
- **Activity log**: tampilkan eksplisit suffix zona (`12 Jun 2025, 14:30 WIB`) — beda timezone user di grup yang sama bisa render beda, tapi UTC yang disimpan sama.
- **Cron jobs**: Cloud Scheduler config explicit `timezone: "Asia/Jakarta"` (cron jam 08.00 WIB). Jangan mix dengan default UTC.
- **Setup dayjs**: `dayjs.extend(utc); dayjs.extend(timezone); dayjs.extend(localizedFormat); dayjs.locale('id');` di [app/_layout.tsx](app/_layout.tsx) — satu kali untuk seluruh app.

---

## 10. Konvensi Kode

- **TypeScript strict** — tidak ada `any` implisit, pakai type yang jelas.
- **Path import**: gunakan alias `@/components/...` bukan relative `../../../`.
- **File naming**: PascalCase untuk komponen (`Button.tsx`), kebab-case untuk routes (`set-date.tsx`).
- **Reuse komponen** dari [src/components/](src/components/) — Button, Badge, Avatar, Card, Header, IconButton, Toast. Jangan duplikasi.
- **State global**: saat menambahkan Zustand, satu store per domain (auth, groups, chat, dst), bukan satu mega store.
- **Side effects**: bungkus call Firebase / Cloud Function di service layer (`src/services/...`), jangan langsung di komponen.
- **Komentar**: hanya tulis bila WHY tidak obvious. Identifier yang baik > komentar.

---

## 11. Testing (target Week 8–10)

| Layer | Tool | Coverage |
|-------|------|----------|
| Unit | Jest | > 80% functions kritis (logic undian, validasi swap, kalkulasi status) |
| Firestore Rules | Firebase Emulator | 100% rules per role per collection |
| Integration | Jest + Emulator | > 70% happy + error path Cloud Functions |
| E2E | Detox | 5 core flows: Register → Buat Grup → Bayar → Undian → Set Tanggal |
| Manual | Device fisik | Min 3 device Android, 2 device iOS |

### Test cases wajib (PRD §8.1)
- Random undian **tidak pernah** memilih anggota `sudahMenang=true`
- Anggota **tidak bisa** write `payments` (rules deny)
- Anggota **tidak bisa** delete `activityLog` (rules deny)
- Reminder terkirim **meski tidak ada user yang login** di hari itu
- Tidak ada duplicate notification per anggota per hari

---

## 12. Out of Scope (jangan disarankan untuk MVP)

**Permanen out of scope:**
- Payment gateway (GoPay/OVO/DANA/transfer) — butuh lisensi fintech OJK
- Notifikasi WhatsApp API
- Web version
- Blockchain
- Integrasi rekening bank / VA / escrow

**Phase 2 (bukan MVP):** Mode 2 rolling undian, export PDF/Excel, upload bukti transfer, dark mode, multi-grup dashboard, kelola anggota keluar di tengah arisan.

**Phase 3:** Analytics dashboard, arisan publik, premium plan, statistik personal.

---

## 13. Setup & Cara Menjalankan

### 13.1 First-time setup

```bash
# 1. Install dependencies
npm install

# 2. Install Firebase CLI (global)
npm install -g firebase-tools eas-cli

# 3. Login Firebase + Expo
firebase login
eas login

# 4. Link Firebase project (dev)
firebase use arisan-dev

# 5. Copy env template
cp .env.example .env.local       # isi sesuai .env.local guide di §17
```

### 13.2 Run mobile app

**⚠️ Setelah Phase 1, app TIDAK bisa lagi pakai Expo Go** karena ada native modules (`@react-native-firebase`). Pakai custom dev client:

```bash
# Build dev client sekali per device (Android contoh)
eas build --profile development --platform android
# Install hasil APK ke device, lalu:

npx expo start --dev-client       # buka di dev client, bukan Expo Go
# atau: i (iOS dev client) / a (Android dev client)
```

Selama masih Phase 0 (UI shell sekarang) Expo Go masih jalan.

### 13.3 Run Cloud Functions secara lokal (Firebase Emulator)

```bash
cd functions && npm install
firebase emulators:start          # Auth + Firestore + Functions + Scheduler
# UI emulator: http://localhost:4000
```

Set env var di `.env.local`: `EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true` supaya client connect ke emulator, bukan production.

### 13.4 Deploy Cloud Functions

```bash
firebase deploy --only functions --project arisan-dev      # ke dev
firebase deploy --only functions --project arisan-prod     # ke prod (manual approval di team)
firebase deploy --only firestore:rules --project arisan-dev
```

### 13.5 Build APK / TestFlight (lihat juga §16)

```bash
eas build --profile preview --platform android       # APK internal testing
eas build --profile preview --platform ios           # TestFlight
eas build --profile production --platform all        # Production release
```

---

## 14. OKR Validasi (3 bulan pertama)

| KR | Target |
|----|--------|
| Grup aktif terdaftar (30 hari) | 50 grup |
| Rata-rata anggota per grup | 8+ |
| Retention setelah 2 periode | 70%+ |
| NPS | 40+ |
| Crash rate bulan 1 | < 1% |

---

## 15. Glosarium Singkat

- **Arisan** — sistem tabungan bergilir; tiap periode 1 anggota menang lewat undian.
- **Ketua / Anggota** — admin grup vs member biasa.
- **Periode** — satu siklus arisan (biasanya 1 bulan).
- **Mode 1** — urutan pemenang ditentukan semua di awal (pre-determined).
- **Mode 3** — hybrid: periode pertama random semua, berikutnya random dari yang belum menang.
- **2-layer Approval** — target setuju dulu, baru ketua approve final (untuk swap giliran).
- **Activity Log** — catatan permanen append-only semua aksi grup.
- **UU PDP** — UU No. 27/2022 Perlindungan Data Pribadi Indonesia.

---

## 16. Build & Release

### 16.1 EAS profiles ([eas.json](eas.json))

| Profile | Distribution | Untuk |
|---------|--------------|-------|
| `development` | Internal (dev client) | Day-to-day dev dengan custom native modules |
| `preview` | Internal (APK / TestFlight) | QA, closed beta 10 grup (PRD §11) |
| `production` | Store (AAB / IPA) | Play Store & App Store |

Minimal `eas.json` yang harus ada:
```json
{
  "build": {
    "preview": {
      "android": { "buildType": "apk" },
      "ios": { "simulator": false },
      "env": { "EXPO_PUBLIC_FIREBASE_PROJECT": "arisan-dev" }
    },
    "production": {
      "env": { "EXPO_PUBLIC_FIREBASE_PROJECT": "arisan-prod" },
      "android": { "buildType": "app-bundle" }
    }
  },
  "submit": { "production": {} }
}
```

### 16.2 Device test matrix (PRD §11)

- **Android**: minimum 3 device fisik — coverage Android 8 (API 26 floor), Android 12, Android 14+. Mix: Samsung mid-tier, Xiaomi, Oppo (target 80% user).
- **iOS**: minimum 2 device fisik — iPhone iOS 13 (floor) dan iPhone iOS terbaru.

### 16.3 Closed beta (Week 10 — PRD §11)

- Target: **10 grup arisan nyata** (bukan internal team). 
- Distribusi APK: Play Console Internal Testing track + TestFlight invite.
- Durasi minimum: 2 minggu = 1 siklus periode arisan, biar cover flow Bayar → Undian → Set Tanggal.
- Exit criteria: zero P0/P1 bug + crash rate < 1% + 8/10 grup completion siklus.

### 16.4 Store submission

- **Google Play**:
  - Upload AAB via `eas submit --platform android --profile production`
  - **IARC Content Rating** wajib — questionnaire di Play Console. Untuk Arisan: rating "Everyone" (tidak ada konten dewasa, tidak ada loot box / gambling — penting: arisan ≠ judi karena pemenang pasti dapat balik modalnya).
  - Data Safety form: declare phone number collection + tujuan auth.
  - Privacy Policy URL (host di domain sendiri, link sama dengan in-app).
- **App Store**:
  - Upload IPA via `eas submit --platform ios --profile production`
  - Age Rating questionnaire di App Store Connect.
  - "Sign in with Apple" — TIDAK perlu karena auth pakai phone OTP (bukan email/social).
  - Justify phone number usage di App Privacy section.

### 16.5 OTA updates (Expo Updates)

- Gunakan EAS Update untuk JS-only bugfix antar store release.
- **Jangan** OTA-update perubahan native (security rules, Cloud Function signature changes butuh native rebuild jika ada SDK upgrade).
- Channel: `preview` untuk beta, `production` untuk live users.

### 16.6 Versioning

- **App version** ([app.json](app.json) `expo.version`): semver, bump `major.minor.patch` saat store submission.
- **Build number**: auto-increment via `eas build --auto-submit` atau manual di `app.json` (`ios.buildNumber`, `android.versionCode`).
- **Cloud Functions**: tag git release `functions-vX.Y.Z` setiap deploy ke prod.

---

## 17. Environment & Secrets

### 17.1 Firebase projects

| Project ID | Tujuan | Region |
|------------|--------|--------|
| `arisan-dev` | Day-to-day dev + closed beta | `asia-southeast2` (Jakarta) |
| `arisan-prod` | Production live | `asia-southeast2` (Jakarta) |

Jangan share Firestore antara dev & prod. Auth users juga terpisah (nomor HP test berbeda).

### 17.2 File config

| File | Lokasi | Commit? | Isi |
|------|--------|---------|-----|
| `.env.local` | root | ❌ `.gitignore` | Local override (EXPO_PUBLIC_USE_FIREBASE_EMULATOR, dst) |
| `.env.example` | root | ✅ commit | Template tanpa value asli |
| `google-services.json` | root | ❌ `.gitignore` | Firebase Android config — download dari Console |
| `GoogleService-Info.plist` | root | ❌ `.gitignore` | Firebase iOS config — download dari Console |
| `functions/.env` | `functions/` | ❌ `.gitignore` | Cloud Functions env (Expo push token, secret keys) |
| Service Account JSON | **JANGAN COMMIT** | ❌ | Disimpan di EAS Secret + GitHub Secrets (CI/CD) |

### 17.3 Expo public env vars

Prefix `EXPO_PUBLIC_*` ter-bundle ke client → **jangan masukkan secret**, hanya config publik:
- `EXPO_PUBLIC_FIREBASE_PROJECT` (dev / prod)
- `EXPO_PUBLIC_USE_FIREBASE_EMULATOR` (true / false)
- `EXPO_PUBLIC_SENTRY_DSN` (kalau pakai)

### 17.4 EAS Secret (untuk build pipeline)

```bash
eas secret:create --scope project --name FIREBASE_SERVICE_ACCOUNT --type file --value ./service-account.json
eas secret:create --scope project --name EXPO_PUSH_ACCESS_TOKEN --value <token>
```

Akses di `eas.json` via `$FIREBASE_SERVICE_ACCOUNT`.

### 17.5 Anti-pattern secrets

- ❌ Commit `google-services.json` / `GoogleService-Info.plist` ke git (sudah di `.gitignore`)
- ❌ Hardcode API key di kode JS
- ❌ Pakai `EXPO_PUBLIC_*` untuk secret (akan ter-bundle ke APK)
- ❌ Share service account JSON via Slack/email — pakai EAS Secret / 1Password

---

## 18. Cloud Functions — Struktur & Konvensi

### 18.1 Folder layout (monorepo dalam 1 git repo)

```
/                              ← React Native app (existing)
  app/, src/, package.json, ...
functions/                     ← Cloud Functions (BUAT BARU)
  src/
    index.ts                   ← Export semua functions
    callable/
      validatePayment.ts       ← onCall: konfirmasi bayar
      triggerUndian.ts         ← onCall: random server-side
      approveSwap.ts           ← onCall: 2-layer approval finalize
      rateLimitOTP.ts          ← onCall: check OTP quota
    scheduled/
      sendPaymentReminder.ts   ← onSchedule cron 08.00 WIB
      sendPelaksanaanReminder.ts
      checkTanggalDeadline.ts
    lib/
      firestore.ts             ← Admin SDK init
      auth.ts                  ← assertKetua(), assertMember()
      notif.ts                 ← Expo Push helper + dedup
      transactions.ts          ← Helper transaction wrappers
  shared/                      ← Types yang di-share dengan client
    types.ts                   ← Group, Member, Payment, Winner, SwapRequest, ActivityLog
  package.json
  tsconfig.json
  .env
firestore.rules
firestore.indexes.json
firebase.json
```

### 18.2 Shared types pattern

Kedua side import dari `functions/shared/types.ts` (alias `@arisan/shared`). **Single source of truth** — kalau ubah `Group` type, kompiler langsung complain di client & function. Setup via TypeScript `paths` di kedua `tsconfig.json`.

### 18.3 Konvensi function

```ts
// Setiap callable function template:
export const validatePayment = onCall(
  { region: 'asia-southeast2', enforceAppCheck: true },
  async (req) => {
    // 1. Auth check
    if (!req.auth) throw new HttpsError('unauthenticated', '...');
    
    // 2. Validate input dengan zod
    const data = ValidatePaymentSchema.parse(req.data);
    
    // 3. Authorization (role check)
    await assertKetua(req.auth.uid, data.groupId);
    
    // 4. Business logic dalam transaction
    await db.runTransaction(async (tx) => { ... });
    
    // 5. Append ke activityLog (selalu)
    await appendActivityLog({ ... });
    
    // 6. Trigger notif (jika perlu)
    await sendNotif({ ... });
    
    return { ok: true };
  }
);
```

### 18.4 Mulai sederhana (PRD §12 risk mitigation)

PRD eksplisit warning: "Kompleksitas Cloud Functions baru bagi tim". Urutan implementasi yang disarankan:

1. **Week 2** — `rateLimitOTP` (paling sederhana, no DB write)
2. **Week 4** — `validatePayment` (single transaction)
3. **Week 5** — `triggerUndian` (transaction + random + notif)
4. **Week 6** — `checkTanggalDeadline` + first scheduled function
5. **Week 7** — `approveSwap` (paling kompleks, 2-layer)
6. **Week 8** — sisanya scheduled reminders

### 18.5 Testing Cloud Functions

- **Local dev**: SELALU pakai Firebase Emulator dulu (`firebase emulators:start`), jangan langsung deploy ke dev project.
- **Unit test**: Jest + `firebase-functions-test` library, mock Firestore admin SDK.
- **Integration test**: Jest + Emulator suite. Test: happy path + auth deny + transaction race.
- **Security Rules test**: `@firebase/rules-unit-testing`, target 100% coverage per role per collection (PRD §10.4).

---

## 19. Production Readiness Checklist (mirror PRD §11)

Centang sebelum submit ke store. Sumber: PRD §11.

**SECURITY**
- [ ] Cloud Functions untuk `validatePayment`, `triggerUndian`, `approveSwap` deployed
- [ ] `rateLimitOTP` aktif (max 5/jam/nomor)
- [ ] Firestore Security Rules test suite 100% coverage di Emulator
- [ ] Firestore Transactions di semua aksi atomic (swap, bayar, undian)

**NOTIFICATIONS**
- [ ] `sendPaymentReminder` cron 08.00 WIB aktif
- [ ] `sendPelaksanaanReminder` cron aktif
- [ ] `checkTanggalDeadline` cron aktif

**MONITORING**
- [ ] Firebase Crashlytics terintegrasi + alert crash rate > 1%
- [ ] Firebase Performance Monitoring aktif (P95 < 3s)

**TESTING**
- [ ] Unit test Jest > 80% coverage functions kritis
- [ ] E2E Detox: Register → Buat Grup → Bayar → Undian → Set Tanggal pass

**LEGAL & COMPLIANCE**
- [ ] Privacy Policy in-app (accessible dari Settings)
- [ ] Terms of Service in-app
- [ ] Delete Account flow berfungsi (anonymize / hard delete sesuai UU PDP)
- [ ] Firestore region `asia-southeast2` confirmed
- [ ] IARC Content Rating filled (Play Console + App Store Connect)

**BUILD & RELEASE**
- [ ] EAS Build Android APK preview profile sukses, test di 3 device
- [ ] EAS Build iOS TestFlight sukses, test di 2 device
- [ ] Closed beta 10 grup arisan nyata selesai, zero critical bug

---

## 20. Offline & Network Handling

Target user: 80% Android di koneksi 4G urban Indonesia — koneksi spotty adalah norm, bukan edge case.

### 20.1 Firestore offline persistence

Aktifkan di [src/services/firebase.ts](src/services/firebase.ts):

```ts
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
```

Efek: read query auto-cached, listener tetap fire dari cache saat offline.

### 20.2 Network state detection

Pakai `@react-native-community/netinfo`:

```ts
// src/stores/network.ts (Zustand)
import NetInfo from '@react-native-community/netinfo';

NetInfo.addEventListener((state) => {
  useNetworkStore.setState({ isOnline: !!state.isConnected && !!state.isInternetReachable });
});
```

### 20.3 UX pattern per state

| State | UI behavior |
|-------|-------------|
| **Online** | Normal — semua tombol aktif |
| **Offline (cache hit)** | Banner kecil di top: "🔌 Mode offline — data terakhir tersinkron 5 menit lalu". Read tetap jalan dari cache. |
| **Offline (action attempted)** | Disable tombol Konfirmasi Pembayaran / Trigger Undian / Approve Swap. Toast: "Butuh koneksi untuk aksi ini." |
| **Reconnect** | Banner success 2 detik: "✅ Tersambung kembali" lalu auto-hide. Trigger refetch listener. |

### 20.4 Optimistic UI policy

**Boleh optimistic** (instant feedback, rollback kalau gagal):
- Kirim chat message (PRD F07 — chat boleh sedikit lag)
- Mark notif as read

**JANGAN optimistic** (wajib server confirm dulu):
- Konfirmasi pembayaran — finansial, harus tunggu Cloud Function response
- Trigger undian — wajib server random
- Approve swap — atomic 2-layer
- Set tanggal — locked setelah confirm, jangan rollback

### 20.5 Retry strategy

- **Cloud Function call gagal karena network**: auto-retry 3× dengan exponential backoff (1s, 2s, 4s). Setelah itu show error dengan tombol "Coba Lagi".
- **Firestore listener disconnect**: SDK auto-reconnect, tidak perlu handle manual.
- **Push notif send**: handle di Cloud Function side dengan retry queue (Cloud Tasks).

### 20.6 Testing offline (wajib PRD §8)

Skenario manual yang harus pass:
1. Buka app dengan airplane mode → dashboard tetap tampil dari cache
2. Bayar saat offline → tombol disabled, toast jelas
3. Kirim chat saat offline → pesan masuk queue, kirim saat reconnect
4. Receive notif saat app closed → tap notif buka deep link ke screen yang tepat

---

## 21. Logging, Analytics & Event Tracking

### 21.1 Error tracking — 2 layer

| Tool | Cakupan | Setup |
|------|---------|-------|
| **Firebase Crashlytics** | Native crash (iOS/Android) | `@react-native-firebase/crashlytics` |
| **Sentry** (opsional) | JS error + breadcrumb | `@sentry/react-native`, DSN di `EXPO_PUBLIC_SENTRY_DSN` |

Kalau pilih Sentry: capture user context (`userId`, `role`, `groupId` saat dalam grup) — JANGAN log nomor HP atau nama (PII).

### 21.2 Logging convention

**Client (React Native)**:
```ts
// src/lib/logger.ts
export const log = {
  info: (msg: string, meta?: object) => __DEV__ && console.log(`[INFO] ${msg}`, meta),
  warn: (msg: string, meta?: object) => Sentry.captureMessage(msg, { level: 'warning', extra: meta }),
  error: (err: Error, meta?: object) => Sentry.captureException(err, { extra: meta }),
};
```

Rules:
- `__DEV__` only untuk `console.log` — production bundle harus bersih dari debug log
- Jangan log payload lengkap (nomor HP, token) — log identifier saja
- Sentry breadcrumb untuk navigation & button press otomatis via `routingInstrumentation`

**Cloud Functions** — structured JSON log:
```ts
import { logger } from 'firebase-functions/v2';

logger.info('payment_validated', { groupId, periodeId, actorId, amount });
logger.error('payment_failed', { groupId, error: err.message, stack: err.stack });
```

Cloud Logging auto-parse JSON → bisa query di Firebase Console: `jsonPayload.groupId="rt03"`.

### 21.3 Analytics events (untuk OKR validation §14)

Pakai **Firebase Analytics** — gratis, terintegrasi dengan Crashlytics & Performance.

Event taxonomy minimum untuk validasi OKR:

| Event | Trigger | Properties | OKR target |
|-------|---------|------------|------------|
| `group_created` | Buat grup sukses | `frekuensi`, `jumlahPeriode`, `nominal` | KR1: 50 grup/30 hari |
| `group_joined` | Join via kode/link | `via` (code/link) | KR2: 8+ anggota/grup |
| `payment_confirmed` | Cloud Function sukses | `groupId`, `periodeId`, `late` (bool) | DAU/MAU 40% |
| `undian_triggered` | Cloud Function sukses | `mode` (1/3), `method` (random/manual/offline) | — |
| `winner_set_tanggal` | Set tanggal sukses | `daysFromWin` | — |
| `swap_requested` | Layer 1 trigger | `groupId` | — |
| `swap_approved` | Layer 2 done | `groupId`, `daysToComplete` | — |
| `chat_message_sent` | Send message | `groupId`, `length` (bucketed) | 5+ pesan/grup/periode |
| `notif_opened` | Tap push notif | `type` | 70%+ buka notif |
| `app_opened` | App foreground | `from` (push/icon/deeplink) | DAU/MAU |

**User properties** (set sekali per session):
- `role_primary` — `ketua` / `anggota` (tergantung role utama user)
- `groups_count` — jumlah grup yang diikuti
- `timezone` — `WIB` / `WITA` / `WIT`

### 21.4 NPS survey

PRD §1.4 KR4: NPS 40+. Implement in-app NPS:
- Trigger: setelah 2× completion siklus arisan (event `winner_set_tanggal` count ≥ 2)
- Tool: pakai Firebase In-App Messaging atau simple modal sendiri
- Simpan response di `nps/{userId}_{periode}` di Firestore
- Survey ulang max 1×/90 hari per user

### 21.5 PII safety di analytics

- ❌ JANGAN kirim: nomor HP, nama, foto URL, message content
- ✅ BOLEH kirim: userId (Firebase Auth UID — opaque), groupId, periode number, count/bucket

---

## 22. Code Quality

### 22.1 Tooling baseline

| Tool | Purpose | Config file |
|------|---------|-------------|
| **ESLint** | Lint errors | `.eslintrc.cjs` |
| **Prettier** | Formatting | `.prettierrc` |
| **lint-staged** | Run linter pre-commit | `.lintstagedrc.json` |
| **Husky** | Git hooks | `.husky/` |
| **TypeScript** | Type check | `tsconfig.json` (sudah ada, strict ✅) |

### 22.2 Install

```bash
npm install -D eslint prettier eslint-config-expo eslint-config-prettier eslint-plugin-react-hooks lint-staged husky
npx husky init
```

### 22.3 `.eslintrc.cjs`

```js
module.exports = {
  extends: ['expo', 'prettier'],
  plugins: ['react-hooks'],
  rules: {
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
};
```

### 22.4 `.prettierrc`

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "arrowParens": "always"
}
```

### 22.5 Pre-commit hook (`.husky/pre-commit`)

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
npx tsc --noEmit
```

### 22.6 `package.json` lint-staged

```json
"lint-staged": {
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md}": ["prettier --write"]
}
```

### 22.7 npm scripts (tambah ke `package.json`)

```json
"scripts": {
  "lint": "eslint . --ext .ts,.tsx",
  "format": "prettier --write \"**/*.{ts,tsx,json,md}\"",
  "typecheck": "tsc --noEmit",
  "test": "jest",
  "test:rules": "firebase emulators:exec --only firestore 'jest --config jest.rules.config.js'",
  "test:e2e": "detox test --configuration android.emu.debug"
}
```

---

## 23. Git Workflow & CI/CD

### 23.1 Branch strategy

- `main` — protected, only PR merge, auto-deploy ke Firebase **dev** project
- `release/x.y.z` — release branch, auto-deploy ke Firebase **prod** project setelah QA approve
- `feat/<name>` — feature branch dari `main`, PR balik ke `main`
- `fix/<name>` — bugfix branch
- `hotfix/<name>` — dari `release/*`, untuk emergency prod fix

### 23.2 Commit convention (Conventional Commits)

```
feat(auth): add OTP rate limiting via Cloud Function
fix(undian): prevent re-selection of already-won member
docs(claude): add §20 offline handling
refactor(chat): switch ScrollView to inverted FlatList
test(rules): cover activityLog deny-delete case
chore(deps): bump expo to 54.0.35
```

### 23.3 PR template (`.github/PULL_REQUEST_TEMPLATE.md`)

```markdown
## Apa yang berubah
<jelaskan dalam 2-3 kalimat>

## PRD reference
F0X — link section atau acceptance criteria

## Checklist
- [ ] Sesuai design system token (warna/font dari src/theme)
- [ ] Bahasa Indonesia di UI
- [ ] No `Math.random()` di client untuk aksi kritis
- [ ] No direct Firestore write ke collection kritis (pakai Cloud Function)
- [ ] Unit test ditambahkan / di-update
- [ ] Test manual di device fisik (sebutkan: Android X / iOS Y)

## Screenshot / video
<jika UI change>
```

### 23.4 GitHub Actions (`.github/workflows/`)

**ci.yml** — run di setiap PR:
```yaml
name: CI
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm test
  rules-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm install -g firebase-tools
      - run: npm ci
      - run: npm run test:rules
```

**deploy-functions.yml** — manual trigger atau push ke `release/*`:
```yaml
name: Deploy Functions
on:
  push:
    branches: ['release/*']
  workflow_dispatch:
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: cd functions && npm ci && npm run build
      - run: firebase deploy --only functions,firestore:rules --project arisan-prod
        env:
          GOOGLE_APPLICATION_CREDENTIALS: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
```

### 23.5 Required GitHub Secrets

- `FIREBASE_SERVICE_ACCOUNT` — JSON service account (prod project)
- `EXPO_TOKEN` — untuk EAS build dari CI
- `SENTRY_AUTH_TOKEN` — upload sourcemap (jika pakai Sentry)

---

## 24. Accessibility Baseline

Minimum untuk MVP — target audience 25–45 tahun, banyak yang menggunakan ukuran font besar di Android.

### 24.1 Wajib (P0)

- **Dynamic font scaling**: text harus respect OS font size setting. Pakai `allowFontScaling={true}` (default React Native — JANGAN set ke false).
- **Touch target minimum 44×44pt**: semua tombol & icon button. Pakai `hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}` untuk icon kecil.
- **Color contrast WCAG AA**: rasio ≥ 4.5:1 untuk body text. Token sudah aman, tapi cek custom combinations.
  - Primary `#7F77DD` di white bg → contrast 4.6 ✅
  - Success `#1D9E75` di white bg → contrast 4.5 ✅
  - Caption `#8A8A86` di white → contrast 3.2 ❌ — JANGAN untuk text penting
- **Accessibility labels** untuk icon-only button:
  ```tsx
  <IconButton accessibilityLabel="Buka notifikasi" accessibilityRole="button">
    <Bell />
  </IconButton>
  ```

### 24.2 Nice-to-have (Phase 2)

- TalkBack / VoiceOver full testing
- Reduced motion support (disable confetti animation di winner.tsx jika `AccessibilityInfo.isReduceMotionEnabled()`)
- High contrast mode

### 24.3 Testing

- Manual: device dengan font size "Largest" → cek tidak ada text terpotong
- Tool: Expo Accessibility Inspector + Android Accessibility Scanner

---

## 25. App Assets & Deep Links

### 25.1 Assets yang harus disiapkan

| Asset | Lokasi | Spec |
|-------|--------|------|
| App icon (iOS) | `assets/icon.png` | 1024×1024 PNG, no alpha, no rounded corners (iOS handle) |
| App icon (Android adaptive) | `assets/adaptive-icon.png` | 1024×1024 PNG foreground, bg color `#7F77DD` (sudah di [app.json](app.json)) |
| Splash screen | `assets/splash.png` | 1242×2436 PNG, brand color bg |
| Notification icon (Android) | `assets/notification-icon.png` | 96×96 white PNG (Android wajib monochrome) |
| Play Store feature graphic | `store/play-feature.png` | 1024×500 PNG |
| Play Store screenshots | `store/play-*.png` | min 2, max 8, 16:9 atau 9:16 |
| App Store screenshots | `store/ios-*.png` | per device size (6.7", 6.5", 5.5") |
| Privacy Policy HTML | host di domain sendiri | URL masuk Play Console + App Store |

### 25.2 Deep link scheme

Scheme: `arisan://` (sudah set di [app.json](app.json) `expo.scheme`).

Route pattern (handle di [app/_layout.tsx](app/_layout.tsx) dengan Expo Router auto-handling):

| URL | Screen | Use case |
|-----|--------|----------|
| `arisan://` | Beranda | Cold start |
| `arisan://join/{code}` | Join group flow | Invite link |
| `arisan://group/{id}` | Detail grup, default tab | Push notif "payment confirmed" |
| `arisan://group/{id}?tab=urutan` | Tab urutan | Push notif "pelaksanaan reminder" |
| `arisan://group/{id}?tab=chat` | Tab chat | Push notif "new message" |
| `arisan://winner?groupId=X&periode=Y` | Winner screen | Push notif "you won!" |
| `arisan://approval?requestId=X` | Approval (recipient) | Push notif "swap request" |
| `arisan://riwayat?groupId=X` | Riwayat | Push notif "payment confirmed" |

### 25.3 Universal Links (iOS) & App Links (Android)

Untuk MVP: pakai custom scheme `arisan://` saja, **TIDAK** perlu Universal Links (butuh apple-app-site-association file & domain — Phase 2).

### 25.4 Invite link format

```
arisan://join/RT03-X9KQ7
```

Format kode: 5-7 char alphanumeric, generate di Cloud Function `createInviteCode`, simpan di `groups/{groupId}.inviteCode`. Validasi pakai Cloud Function `validateInviteCode` saat join (bukan client read directly — biar bisa rate limit & cek expiry).

---

## 26. Risks & Mitigations (PRD §12 + ops)

| Risiko | Probabilitas | Dampak | Mitigasi |
|--------|--------------|--------|----------|
| **Scope creep** — FOMO tambah fitur Phase 2 ke MVP | Tinggi | Tinggi | Strict P0 only. Setiap "kayanya perlu" → masuk backlog Phase 2, JANGAN langsung kode. Lihat §12 Out of Scope. |
| **Kompleksitas Cloud Functions** (tim baru) | Sedang | Sedang | Mulai dari `rateLimitOTP` (paling sederhana). Pakai Emulator untuk dev lokal. Code review wajib dari senior untuk function pertama tim. |
| **OTP abuse** — Firebase bill membengkak | Sedang | Tinggi | `rateLimitOTP` Cloud Function max 5×/jam/nomor. Set budget alert di GCP Console: warn $50, kill switch $200. |
| **Race condition** swap/bayar | Sedang | Tinggi | Wajib Firestore Transaction di semua Cloud Function aksi kritis. Test integration di Emulator. |
| **Push notif tidak reliable** | Rendah (dengan v2.0) | Tinggi | Cloud Scheduler + dedup log. Monitor via event `notif_opened` vs jumlah sent. Target ≥ 95% delivery. |
| **User resistance** — prefer WhatsApp | Sedang | Tinggi | Onboarding tekankan **transparansi** yang WA tidak bisa berikan. Test value-prop di closed beta. |
| **App Store rejection** | Rendah (dengan v2.0) | Tinggi | Privacy Policy + ToS + delete account flow di Week 9. Test submit ke TestFlight Week 10. |
| **UU PDP compliance gap** | Rendah | Tinggi | Data residency Jakarta region. Delete account = anonymize semua referensi user (set `userId` → `deleted-user-xxx`, hapus `users/{userId}` doc). |
| **Firebase free tier limit** | Sedang | Sedang | Monitor di Firebase Console. Free tier: 50K reads/day, 20K writes/day. Closed beta 10 grup × 10 anggota ≈ aman. Naik ke Blaze plan saat hit 80% quota. |
| **Drift design system** | Sedang | Sedang | PR template ada checklist "pakai token dari src/theme". Linter rule untuk reject hex literal (Phase 2). |
| **Onboarding tinggi** untuk ketua | Sedang | Sedang | Empty state Beranda dengan ilustrasi + 1-click "Buat grup pertama". Tooltip first-time untuk FAB. |
| **Member churn pertengahan arisan** | Sedang | Tinggi | OUT OF SCOPE MVP — handle di Phase 2 (PRD §14.2). Untuk MVP: tampilkan warning di pengaturan "Hapus anggota tidak bisa dibatalkan, periodenya akan kosong". |

### 26.1 Budget monitoring

Buat GCP Budget alerts (`arisan-dev` & `arisan-prod` masing-masing):
- 50% threshold → email ke tim
- 90% threshold → email + Slack webhook
- 100% threshold → email + auto-disable billing (development project only)

---

## 27. Development Roadmap (10 Minggu — PRD §9)

Mapping minggu PRD ke artefak konkret di repo ini.

### Week 1 — Setup & Fondasi
- [ ] Buat Firebase project `arisan-dev` & `arisan-prod` region `asia-southeast2`
- [ ] Setup ESLint/Prettier/Husky (§22), commit ke `main`
- [ ] Install Firebase SDK + setup [src/services/firebase.ts](src/services/firebase.ts) dengan offline persistence (§20.1)
- [ ] Scaffold `functions/` folder structure (§18.1) + deploy "hello world" function
- [ ] Setup CI GitHub Actions (§23.4) — typecheck + lint + test
- [ ] Download `google-services.json` & `GoogleService-Info.plist`, masuk `.gitignore`
- [ ] Setup EAS project: `eas build:configure`

### Week 2 — Auth Flow
- [ ] Build screen: Splash → Input HP → OTP → Consent (§1.5)
- [ ] Cloud Function `rateLimitOTP` (paling sederhana, mulai dari sini per §18.4)
- [ ] Zustand store `auth` — current user, login state, logout
- [ ] Firebase Auth phone provider setup
- [ ] Service layer [src/services/auth.ts](src/services/auth.ts)
- [ ] Test: rate limit kicks in after 5 attempts (Emulator)

### Week 3 — Group Management
- [ ] Buat grup form (§1.5)
- [ ] Generate invite code + share deep link (§25.4)
- [ ] Join via code/link landing (§25.2)
- [ ] Dashboard list grup (wire ke Firestore, ganti GROUPS mock)
- [ ] Zustand store `groups`
- [ ] Firestore Security Rules: `groups`, `members` (deny-all client write untuk groups, member self-read)

### Week 4 — Tracking Pembayaran
- [ ] Cloud Function `validatePayment` dengan Firestore Transaction
- [ ] Wire tab Pembayaran ke real data
- [ ] Period picker (§1.5 gap)
- [ ] Per-anggota konfirmasi (bukan blanket button)
- [ ] Cloud Scheduler `sendPaymentReminder` cron 08.00 WIB (§5b dedup)
- [ ] Status terlambat auto H+3 (logic di Cloud Function harian)
- [ ] Unit test: late detection edge cases

### Week 5 — Sistem Undian
- [ ] **Rombak [UndianModal](src/screens/UndianModal.tsx)**: ganti `Math.random()` → `httpsCallable('triggerUndian')` (§1.5 mismatch #1)
- [ ] **Rombak mode**: Mode 1 vs Mode 3 di group setup, bukan per-undian (§1.5 mismatch #2)
- [ ] **Wajibkan alasan** Manual/Offline (§1.5 mismatch #4)
- [ ] Cloud Function `triggerUndian` — random server-side, skip `sudahMenang=true`
- [ ] Pengumuman: push notif ke semua anggota grup
- [ ] Append `winners/{periodeId}` + `activityLog`

### Week 6 — Pemenang & Tanggal
- [ ] **Refactor [set-date.tsx](app/set-date.tsx)**: ganti hardcoded date ke real dayjs (§1.5 gap)
- [ ] Lock tanggal setelah confirm (sudah ada di UI, wire ke Firestore)
- [ ] Cloud Scheduler `checkTanggalDeadline` — notif ketua jika H+3 belum set
- [ ] Cloud Function ketua override tanggal (alasan wajib, log ke activityLog)
- [ ] Cloud Scheduler `sendPelaksanaanReminder` cron H-3/H-1/H-0

### Week 7 — Tukar Giliran & Chat
- [ ] **Fix limit tukar**: 1× → 2× (§1.5 mismatch #3)
- [ ] Cloud Function `requestSwap` (Layer 1) + push notif ke recipient
- [ ] Cloud Function `approveSwap` (Layer 2) dengan Firestore Transaction
- [ ] **Build Layer 2 screen** (§1.5 — belum ada)
- [ ] **Rombak [ChatTab](src/screens/ChatTab.tsx)**: ScrollView → inverted FlatList + pagination 30 + onSnapshot (§1.5 gap)
- [ ] Firestore Security Rules: messages append-only, no delete/update

### Week 8 — Activity Log & Unit Testing
- [ ] Wire [riwayat.tsx](app/riwayat.tsx) ke `activityLog` collection
- [ ] Filter timezone (§9)
- [ ] Setup Jest + Firebase Emulator config (§22.7)
- [ ] Unit test logic kritis PRD §8.1:
  - [ ] Undian skip `sudahMenang`
  - [ ] Anggota cannot write payments
  - [ ] Cannot delete activityLog
  - [ ] Reminder dedup
- [ ] Target coverage > 80% functions kritis

### Week 9 — Security & Legal
- [ ] Firestore Rules complete + test suite 100% (§22.7 `test:rules`)
- [ ] Privacy Policy screen + host HTML version
- [ ] Terms of Service screen
- [ ] Delete Account flow di Profil — anonymize via Cloud Function `deleteAccount`
- [ ] Crashlytics integrate + verify crash captured
- [ ] Performance Monitoring integrate
- [ ] Firebase Analytics events implementation (§21.3)
- [ ] Setup Sentry (opsional)

### Week 10 — Polish & Build
- [ ] Detox E2E setup + 5 core flows pass (§11)
- [ ] EAS Build preview APK Android — test di 3 device fisik
- [ ] EAS Build TestFlight iOS — test di 2 device fisik
- [ ] IARC content rating (§16.4)
- [ ] Play Console listing + Data Safety form
- [ ] App Store Connect listing + Privacy section
- [ ] Closed beta invite 10 grup
- [ ] Run §19 Production Readiness Checklist end-to-end
- [ ] Tag `release/1.0.0`, deploy functions ke prod

### Definition of Done (per fitur)

- [ ] UI sesuai design token + Bahasa Indonesia
- [ ] Wired ke Firestore (atau Cloud Function untuk aksi kritis)
- [ ] No mismatch dengan §1.5 (atau gap tersebut sudah fixed)
- [ ] Unit test untuk logic non-trivial
- [ ] Manual test di 1 Android device + 1 iOS device
- [ ] Empty/loading/error state handled (§20.3)
- [ ] Push notif (jika applicable) tested end-to-end
- [ ] Activity log entry (jika applicable)
- [ ] PR review approved + CI green
