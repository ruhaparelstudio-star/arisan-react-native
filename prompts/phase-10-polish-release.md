# Phase 10 — Polish, E2E Tests, Build & Closed Beta

**Session type:** New Claude Code session. Paste this entire file as your first message.

---

## 🎯 Goal

Final push: (1) Detox E2E tests untuk 5 core flows, (2) EAS Build preview APK + TestFlight, (3) Store listing prep (IARC, Privacy form, screenshots), (4) Closed beta invite 10 grup arisan nyata, (5) Run §19 Production Readiness Checklist end-to-end, (6) Tag `release/1.0.0` & deploy ke prod.

---

## 📋 Prerequisites

- Phase 1–9 complete & merged
- All unit + rules tests green (`npm test && npm run test:rules && npm run test:functions`)
- User memiliki:
  - Google Play Console account (one-time $25)
  - App Store Connect account ($99/year Apple Developer)
  - Domain untuk Privacy Policy URL (atau pakai GitHub Pages free)
  - 10 calon grup arisan nyata yang ready untuk beta test (real anggota, real komitmen 2 minggu)

---

## 📚 Required reading

1. **CLAUDE.md**:
   - §16 Build & Release (FULL)
   - §19 Production Readiness Checklist (semua 14 items akan dicentang phase ini)
   - §21 Logging dst — verify analytics events ter-fire
   - §22 Code Quality — lint/typecheck wajib green
   - §25 App Assets & Deep Links — semua asset siap
   - §26 Risks & Mitigations — GCP budget alerts
   - §27 Week 10 checklist
2. **PRD §11 Production Readiness Checklist** — sumber of truth
3. **PRD §10 Acceptance Criteria** — final verification

---

## 🏗️ Tasks

### Task 1 — App assets finalize

Sesuai [CLAUDE.md §25.1](../CLAUDE.md#25-app-assets--deep-links):

| Asset                                      | Status       | Action                                      |
| ------------------------------------------ | ------------ | ------------------------------------------- |
| `assets/icon.png` 1024×1024                | Cek existing | Kalau placeholder, minta user provide final |
| `assets/adaptive-icon.png` 1024×1024       | Cek existing | Foreground untuk Android adaptive icon      |
| `assets/splash.png` 1242×2436              | Cek existing | Splash dengan brand ungu                    |
| `assets/notification-icon.png` 96×96 white | Cek          | Wajib monochrome PNG putih                  |
| `store/play-feature.png` 1024×500          | BUAT         | Banner Play Store                           |
| `store/play-screenshots/`                  | BUAT         | Min 2, max 8 screenshot Android             |
| `store/ios-screenshots/`                   | BUAT         | Per device 6.7", 6.5", 5.5"                 |

**Cara screenshot Android:**

```bash
adb shell screencap -p /sdcard/screen.png && adb pull /sdcard/screen.png ./store/play-screenshots/
```

**Cara screenshot iOS Simulator:**

- Cmd+S di iOS Simulator → save to Desktop

Screenshot core flows: Beranda (dashboard list grup), Detail grup (tab pembayaran), Urutan giliran, Chat, Notif center.

### Task 2 — Privacy Policy hosting

Privacy Policy URL diperlukan untuk Play Console + App Store Connect (cannot be in-app only).

Option A: **GitHub Pages** (gratis):

- Buat repo public `arisan-app-legal`
- File `privacy.html` (copy text dari [app/legal/privacy.tsx](../app/legal/privacy.tsx) jadi HTML semantic)
- File `tos.html`
- Enable GitHub Pages di repo settings → URL `https://[org].github.io/arisan-app-legal/privacy.html`

Option B: **Domain sendiri** — kalau tim sudah punya.

Output: 2 URL public yang akan dimasukkan ke store form. Test buka URL di incognito.

### Task 3 — Detox E2E setup

```bash
npm install -D detox @types/detox jest-circus
npx detox init -r jest
```

Update [eas.json](../eas.json) tambah profile `e2e`:

```json
"e2e": {
  "developmentClient": true,
  "distribution": "internal",
  "env": { "EXPO_PUBLIC_FIREBASE_PROJECT": "arisan-dev" }
}
```

Build E2E APK:

```bash
eas build --profile e2e --platform android --local
# Output: ~/Library/.../arisan-e2e.apk
```

Update `.detoxrc.js`:

```js
module.exports = {
  testRunner: { args: { $0: 'jest', config: 'e2e/jest.config.js' } },
  apps: {
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'path/to/arisan-e2e.apk',
    },
  },
  devices: {
    emulator: { type: 'android.emulator', device: { avdName: 'Pixel_5_API_33' } },
  },
  configurations: {
    'android.emu.debug': { device: 'emulator', app: 'android.debug' },
  },
};
```

### Task 4 — 5 core E2E flows (PRD §8)

[e2e/01-register.test.ts](../e2e/01-register.test.ts):

```ts
describe('Register flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, permissions: { notifications: 'YES' } });
  });

  it('register → OTP → consent → beranda', async () => {
    await element(by.id('phone-input')).typeText('81200000001');
    await element(by.id('btn-send-otp')).tap();
    await waitFor(element(by.id('otp-input-0')))
      .toBeVisible()
      .withTimeout(5000);

    // Type 6 digit OTP
    for (let i = 0; i < 6; i++) {
      await element(by.id(`otp-input-${i}`)).typeText('123456'[i]);
    }
    await element(by.id('btn-verify-otp')).tap();

    // Consent
    await waitFor(element(by.id('consent-checkbox')))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.id('nama-input')).typeText('Test User E2E');
    await element(by.id('consent-checkbox')).tap();
    await element(by.id('btn-consent-continue')).tap();

    // Beranda
    await waitFor(element(by.id('beranda-greeting')))
      .toBeVisible()
      .withTimeout(5000);
  });
});
```

Tambah `testID` di komponen UI yang diperlukan E2E.

[e2e/02-create-group.test.ts](../e2e/02-create-group.test.ts) — Buat grup → invite code muncul.

[e2e/03-payment.test.ts](../e2e/03-payment.test.ts) — Ketua konfirmasi pembayaran → status update.

[e2e/04-undian.test.ts](../e2e/04-undian.test.ts) — Trigger undian random → pemenang ditentukan → winner screen muncul.

[e2e/05-set-tanggal.test.ts](../e2e/05-set-tanggal.test.ts) — Pemenang pilih tanggal H+5 → tombol confirm aktif → tanggal locked.

Run: `detox test --configuration android.emu.debug`.

Target: 5 flows pass. Document kalau ada yang gagal/flaky.

### Task 5 — EAS Build Preview (untuk closed beta)

```bash
eas build --profile preview --platform android       # APK
eas build --profile preview --platform ios           # TestFlight IPA
```

Wait time: ~15-25 menit per platform.

**Android APK distribution:**

- Download APK dari EAS dashboard
- Upload ke Google Drive folder, share link untuk 10 beta grup
- ATAU upload ke Play Console "Internal Testing" track (lebih clean, terkait dengan user akun Google)

**iOS TestFlight:**

- `eas submit --profile preview --platform ios` → upload ke App Store Connect
- Add beta testers via email di TestFlight tab → mereka install via TestFlight app

Test di:

- **Android min 3 device fisik**: low-end (RAM 2-3GB Android 8), mid (Android 12), high (Android 14+)
- **iOS min 2 device fisik**: iPhone iOS 13 (floor), iPhone iOS latest

Catat issue di GitHub Issues, fix hotfix di branch `hotfix/*` sebelum lanjut prod.

### Task 6 — Store listing — Google Play Console

Manual steps user lakukan (Claude tidak bisa via CLI):

1. **App listing**:
   - Title: "Arisan: Kelola Arisan Komunitas"
   - Short description (80 char): "Catat iuran, undian transparan, dan koordinasi grup arisan dalam satu app"
   - Full description (4000 char): tulis copy yang highlight transparansi + zero-fintech
   - Screenshots (Task 1)
   - Feature graphic (Task 1)
   - App icon (Task 1)

2. **Content rating** (IARC questionnaire):
   - Category: Tools / Utilities (NOT Casino/Gambling)
   - Violence: None
   - Sexual content: None
   - Profanity: None
   - Controlled substances: None
   - User-generated content: Yes, chat (with rules in ToS)
   - Result: **Everyone** rating

3. **Data Safety form**:
   - Data collected: Phone number (required for auth), Name (for display), Push token (for notifications)
   - Data shared with third parties: None (Firebase Google = service provider, not "shared")
   - Encryption in transit: Yes (HTTPS via Firebase SDK)
   - Data deletion: Yes (user-initiated delete account flow)

4. **Privacy Policy URL**: dari Task 2

5. **Target audience**: 18+, Indonesia

### Task 7 — Store listing — App Store Connect

Manual steps user:

1. **App Information**:
   - Name: "Arisan: Kelola Arisan"
   - Subtitle: "Transparan & Terpercaya"
   - Category: Finance (or Productivity — debate, Finance lebih akurat tapi reviewer mungkin minta proof bukan payment app)
   - Age rating: 17+ (User-Generated Content flag) OR 12+ (kalau chat moderation strict)

2. **Privacy section**:
   - Data Used to Track You: None
   - Data Linked to You: Identifiers (phone), Contact Info (phone), User Content (chat)
   - Data Not Linked to You: Diagnostics (Crashlytics)
   - Privacy Policy URL: Task 2

3. **Sign in with Apple**: NOT REQUIRED (auth via phone, no email/social)

4. **In-App Purchases**: None

5. **Screenshots** per device size

6. **App Review Information**:
   - Demo account: phone `+62 812 0000 0001` OTP `123456`
   - Notes: "Arisan adalah aplikasi koordinasi grup tabungan bergilir tradisional Indonesia. TIDAK memproses dana, hanya tracking & komunikasi. Bukan gambling — pemenang pasti dapat balik modal mereka."

### Task 8 — GCP Budget alerts

Setup di GCP Console untuk kedua project (`arisan-dev` & `arisan-prod`):

- 50% threshold → email tim
- 90% threshold → email + Slack webhook (jika ada)
- 100% threshold → email + auto-disable billing (dev only — prod jangan, biar service tidak down)

Budget: konfirmasi user. Default suggestion:

- `arisan-dev`: $20/bulan (cukup untuk dev + closed beta 10 grup)
- `arisan-prod`: $100/bulan (estimasi 500 user awal)

### Task 9 — Closed beta invite & feedback collection

- Buat Google Form / Typeform untuk feedback beta:
  - "Apa fitur yang paling bermanfaat?"
  - "Apa yang paling membingungkan?"
  - "Bug yang kamu temui (screenshot kalau ada)"
  - "Apakah kamu akan rekomendasi ke grup lain? (NPS 0-10)"
- Email/WA 10 grup beta dengan:
  - Link APK / TestFlight invite
  - Quick start guide (PDF 2 halaman)
  - Link feedback form
  - Direct line untuk emergency (admin contact)

Durasi beta: **2 minggu = 1 siklus periode arisan minimum** (PRD §16.3).

Exit criteria (PRD §16.3):

- Zero P0/P1 bug
- Crash rate < 1%
- 8/10 grup completion siklus

### Task 10 — Run §19 Production Readiness Checklist

Buka [CLAUDE.md §19](../CLAUDE.md#19-production-readiness-checklist-mirror-prd-11) — centang setiap item sebelum lanjut deploy prod.

Untuk item yang belum checked, fix dulu di branch `hotfix/*` atau document sebagai known issue.

### Task 11 — Deploy ke production

**Hanya setelah closed beta SUKSES** (exit criteria met):

```bash
# 1. Switch project
firebase use prod

# 2. Pastikan google-services.json & GoogleService-Info.plist untuk PROD ada
#    (jangan commit — pakai EAS Secret)

# 3. Deploy semua ke prod
firebase deploy --only firestore:rules,firestore:indexes,functions --project prod

# 4. Build production
eas build --profile production --platform all

# 5. Submit ke store
eas submit --profile production --platform android
eas submit --profile production --platform ios

# 6. Tag release
git tag release/1.0.0
git push --tags
```

Wait Apple review (~24-48 hours) + Google Play review (~few hours).

### Task 12 — Post-launch monitoring (week 1)

- Cek Firebase Console daily:
  - Crashlytics: crash rate < 1%?
  - Performance: P95 < 3s?
  - Auth: berapa user baru per hari?
  - Firestore: reads/writes per hari (anticipate quota)
  - Functions: error rate? cold start time?
- Cek Play Console / App Store Connect:
  - Rating & reviews
  - Crash reports (kedua platform punya tracker independen)

---

## ✅ Definition of Done

- [ ] App assets final (icon, splash, screenshots, feature graphic)
- [ ] Privacy Policy & ToS HTML hosted di public URL
- [ ] Detox E2E setup, 5 core flows pass minimum (atau document flaky tests)
- [ ] EAS Preview build SUCCESS Android APK, tested di 3 device fisik
- [ ] EAS Preview build SUCCESS iOS TestFlight, tested di 2 device fisik
- [ ] Play Console listing complete: title, description, screenshots, IARC, Data Safety, Privacy URL
- [ ] App Store Connect listing complete: name, screenshots, Privacy section, demo account
- [ ] GCP Budget alerts active (50/90/100%) untuk dev & prod
- [ ] Closed beta 10 grup invited, feedback form ready
- [ ] **EXIT criteria beta met** sebelum deploy prod: zero P0/P1, crash < 1%, 8/10 grup complete cycle
- [ ] §19 Production Readiness Checklist 100% checked
- [ ] `firebase deploy ... --project prod` SUCCESS
- [ ] `eas build --profile production` SUCCESS, submitted to stores
- [ ] Git tag `release/1.0.0` pushed
- [ ] Apple + Google store review submitted (wait approval)
- [ ] Post-launch monitoring schedule established

---

## 🧪 Final Acceptance Criteria (PRD §10.5)

- [ ] Firebase Crashlytics aktif dan menerima crash reports
- [ ] Cloud Scheduler berjalan dan mengirim reminder tanpa user membuka app
- [ ] Privacy Policy & Terms of Service accessible dari dalam app
- [ ] Flow delete akun berjalan dan menghapus/anonymize data user dari Firestore
- [ ] App berhasil build via EAS Build untuk Android (APK) dan iOS (TestFlight)
- [ ] Closed beta 10 grup arisan nyata selesai tanpa critical bug

---

## ❌ Out of scope Phase 10

- ❌ JANGAN deploy ke prod tanpa beta exit criteria met — flag sebagai BLOCKER ke user
- ❌ JANGAN auto-submit ke store tanpa explicit user approval — minta confirm sebelum `eas submit`
- ❌ JANGAN start Phase 2 features (Mode 2 rolling, export PDF, upload bukti) — tahan sampai launch + 2 minggu observation
- ❌ JANGAN delete `arisan-dev` project setelah prod live — tetap dipakai untuk testing future fixes

---

## 🚨 Common pitfalls

1. **Lupa pisah Firebase config dev vs prod** — `google-services.json` di repo adalah dev. Untuk prod build, set via EAS Secret atau replace lokal sebelum `eas build --profile production`. Periksa `EXPO_PUBLIC_FIREBASE_PROJECT` di build log.
2. **App Store rejection — "looks like gambling"** — Reviewer mungkin flag karena ada "undian". Counter-argument di App Review Notes: "Pemenang sudah pasti, tidak ada chance of loss — semua anggota balik modal mereka". Sertakan bukti dari PRD.
3. **IARC questionnaire over-claim** — kalau check "user-generated content (chat)", rating naik. Pastikan ToS dan in-app moderation flow (Phase 2) bisa support.
4. **Privacy URL 404** — test buka di incognito sebelum submit. Reviewer akan langsung reject.
5. **TestFlight build expire** dalam 90 hari — kalau beta lebih lama, rebuild.
6. **Production Crashlytics tidak nampak crash** — pastikan `setCrashlyticsCollectionEnabled(true)` jalan dan sourcemap ter-upload (EAS auto via Sentry-style integration).
7. **Forgot to disable emulator in production build** — verify `EXPO_PUBLIC_USE_FIREBASE_EMULATOR=false` di production profile.

---

## 🤔 When to ask user

- **Sebelum `eas submit`** — confirm explicit "ya, deploy ke store sekarang"
- Privacy Policy hosting: GitHub Pages atau domain own?
- Budget alert thresholds di GCP: confirm $20 dev / $100 prod atau adjust?
- 10 beta grup: user sudah identify? Atau Claude bantu draft outreach message?
- Apakah user mau tunggu Apple review (~48h) sebelum submit Android, atau parallel?
- App description marketing copy: Claude draft atau user provide?
- Demo account credentials di App Review: pakai test number existing atau buat dedicated reviewer account?

---

## 📦 Commit message (untuk release tag)

```
release: v1.0.0 — MVP closed beta complete, production deployed

- E2E Detox tests: 5 core flows passing
- EAS Build preview tested on 3 Android + 2 iOS devices
- Closed beta 10 grup completed 1 full cycle (8/10 success, zero P0)
- Production Readiness Checklist (PRD §11) 100% complete
- Deployed to arisan-prod (asia-southeast2), submitted to Play Store + App Store

Acceptance: PRD §10.5 ALL criteria met
Refs: CLAUDE.md §27 Week 10, §19 Production Readiness
```

---

## 🎉 Post-launch

Setelah app live di store:

1. Update CLAUDE.md §1 Status — ganti "UI shell" jadi "Production v1.0.0"
2. Clean up CLAUDE.md §1.5 gap list — semua sudah dibereskan
3. Archive [src/data/mock.ts](../src/data/mock.ts) — sudah tidak dipakai
4. Plan Phase 2 features per PRD §14.2: Mode 2 rolling, export PDF, upload bukti transfer, dark mode, multi-grup dashboard
5. Track OKR validation (3 bulan pertama) per CLAUDE.md §14:
   - 50 grup aktif (30 hari)
   - 8+ anggota per grup
   - 70%+ retention setelah 2 periode
   - NPS 40+
   - Crash rate < 1%
