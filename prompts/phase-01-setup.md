# Phase 1 — Setup & Fondasi

**Session type:** New Claude Code session. Paste this entire file as your first message.

---

## 🎯 Goal

Siapkan fondasi teknis end-to-end agar Phase 2+ bisa mulai coding fitur tanpa setup lagi. Output: project bisa di-build ke dev client, deploy Cloud Function "hello world" ke Firebase Emulator + dev project, CI green, ESLint/Prettier/Husky aktif.

---

## 📋 Prerequisites (user kerjakan SEBELUM start)

User wajib lakukan ini dulu di luar Claude — Claude tidak bisa via CLI:

1. **Buat 2 Firebase project** di [console.firebase.google.com](https://console.firebase.google.com):
   - `arisan-dev` — region `asia-southeast2` (Jakarta)
   - `arisan-prod` — region `asia-southeast2` (Jakarta)
2. Di kedua project, **enable**:
   - Authentication → Sign-in method → **Phone** (cukup enable, setup verification number di Phase 2)
   - Firestore Database → **Create database** → Production mode → region `asia-southeast2`
3. Di kedua project, **register 2 apps**:
   - Android: package `com.arisan.app` → download `google-services.json` ke `~/Downloads/`
   - iOS: bundle ID `com.arisan.app` → download `GoogleService-Info.plist` ke `~/Downloads/`
   - (User akan dipandu Claude letakkan file ini ke repo)
4. **Install Firebase CLI + EAS CLI globally** (jika belum):
   ```bash
   npm install -g firebase-tools eas-cli
   firebase login
   eas login
   ```
5. **Punya akun Expo** untuk EAS Build (gratis tier cukup untuk MVP).

Jika user belum siap point di atas — Claude STOP dan minta user kerjakan dulu. Jangan jalan dengan asumsi.

---

## 📚 Required reading (lakukan sebelum modifikasi apapun)

1. **CLAUDE.md** — baca full, terutama:
   - §1.5 (gaps yang akan dibereskan di phase 2+)
   - §2 Tech Stack (catatan keputusan RNFirebase + dev client)
   - §6 Security non-negotiables
   - §17 Environment & Secrets
   - §18 Cloud Functions structure
   - §22 Code Quality
   - §23 Git Workflow & CI
   - §27 Week 1 checklist
2. **PRD §6.1, §6.2, §7.1** (`Arisan_App_PRD_Final_v2.0.docx`) — pastikan paham region Jakarta dan deny-all rules baseline.
3. **File existing** — jangan modifikasi tanpa baca dulu:
   - [package.json](../package.json)
   - [app.json](../app.json)
   - [tsconfig.json](../tsconfig.json)
   - [.gitignore](../.gitignore)
   - [app/_layout.tsx](../app/_layout.tsx)

---

## 🏗️ Tasks

### Task 1 — Update `.gitignore` untuk Firebase & functions

Tambahkan ke `.gitignore` (jangan replace existing entries):

```
# Firebase config (downloaded from Console — DO NOT COMMIT)
google-services.json
GoogleService-Info.plist
service-account*.json

# Cloud Functions build artifacts
functions/lib/
functions/node_modules/

# Firebase Emulator
firebase-debug.log
firebase-debug.*.log
firestore-debug.log
ui-debug.log
.firebase/
```

### Task 2 — ESLint + Prettier + Husky + lint-staged

Install dev deps (npm, bukan yarn — project pakai package-lock.json):

```bash
npm install -D eslint prettier eslint-config-expo eslint-config-prettier eslint-plugin-react-hooks lint-staged husky
```

Buat file persis seperti spec di [CLAUDE.md §22](../CLAUDE.md#22-code-quality):
- `.eslintrc.cjs` — pakai snippet §22.3
- `.prettierrc` — pakai snippet §22.4
- `.husky/pre-commit` — pakai snippet §22.5, jangan lupa `chmod +x`
- `package.json` `lint-staged` field — pakai snippet §22.6
- `package.json` `scripts` — tambah `lint`, `format`, `typecheck` per §22.7 (test scripts belum, Jest belum diinstall)

Jalankan `npx husky init` jika belum ada `.husky/`.

Verifikasi: `npm run lint && npm run typecheck` → exit 0 (mungkin ada warning tapi tidak error).

### Task 3 — Install Expo Dev Client + RNFirebase

```bash
# Dev client (ganti Expo Go)
npx expo install expo-dev-client expo-build-properties

# React Native Firebase core + modules yang akan dipakai
npm install @react-native-firebase/app @react-native-firebase/auth @react-native-firebase/firestore @react-native-firebase/functions @react-native-firebase/crashlytics @react-native-firebase/perf @react-native-firebase/analytics @react-native-firebase/messaging

# Tambahan
npm install zustand dayjs
npx expo install @react-native-community/netinfo expo-notifications expo-application expo-device
```

### Task 4 — Konfigurasi [app.json](../app.json)

Update `expo.plugins` array di [app.json](../app.json), pertahankan plugin existing (`expo-router`, `expo-font`), tambahkan:

```json
"plugins": [
  "expo-router",
  "expo-font",
  "@react-native-firebase/app",
  "@react-native-firebase/auth",
  "@react-native-firebase/crashlytics",
  "@react-native-firebase/perf",
  [
    "expo-build-properties",
    {
      "ios": { "useFrameworks": "static" },
      "android": {}
    }
  ],
  [
    "expo-notifications",
    {
      "icon": "./assets/notification-icon.png",
      "color": "#7F77DD"
    }
  ]
]
```

Tambahkan reference ke google-services di `expo.android` dan `expo.ios`:

```json
"android": {
  "googleServicesFile": "./google-services.json",
  ...existing fields
},
"ios": {
  "googleServicesFile": "./GoogleService-Info.plist",
  ...existing fields
}
```

**Catatan asset:** `notification-icon.png` mungkin belum ada. Buat placeholder 96×96 PNG putih solid atau skip plugin notifications dulu (akan dibuat di Phase 2). Konfirmasi ke user.

### Task 5 — Letakkan Firebase config files

User download `google-services.json` dan `GoogleService-Info.plist` dari Firebase Console (lihat Prerequisites). Instruksikan user untuk:

```bash
# Asumsi user sudah download ke ~/Downloads
mv ~/Downloads/google-services.json /home/arsdev/projects/arisan/
mv ~/Downloads/GoogleService-Info.plist /home/arsdev/projects/arisan/
```

Verifikasi `.gitignore` sudah mengecualikan — `git status` jangan tampilkan kedua file.

**Catatan dev vs prod:** Di Phase 1 cukup file dari project `arisan-dev`. File `arisan-prod` masuk EAS Secret di Phase 10, bukan di filesystem.

### Task 6 — Service layer Firebase

Buat folder `src/services/` dan file [src/services/firebase.ts](../src/services/firebase.ts):

```ts
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import crashlytics from '@react-native-firebase/crashlytics';

// Region Jakarta — match Cloud Functions deployment region
functions().useFunctionsEmulator;  // placeholder — emulator wiring di bawah

// Offline persistence — Firestore RN sudah enabled by default di RNFirebase
// (tidak perlu setting tambahan)

// Emulator switch (dev only)
if (__DEV__ && process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
  auth().useEmulator('http://localhost:9099');
  firestore().useEmulator('localhost', 8080);
  functions('asia-southeast2').useEmulator('localhost', 5001);
}

export { auth, firestore, functions, crashlytics };
```

**Verifikasi:** RNFirebase functions region pass via `functions('asia-southeast2')` — bukan default `us-central1`. Ini WAJIB sesuai PRD region Jakarta.

### Task 7 — Cloud Functions scaffold

Sesuai [CLAUDE.md §18.1](../CLAUDE.md#18-cloud-functions--struktur--konvensi). Dari root project:

```bash
firebase init functions
# - Use existing project → arisan-dev
# - Language: TypeScript
# - ESLint: Yes
# - Install dependencies: Yes
```

Setelah init, **delete** boilerplate dan buat struktur sesuai §18.1:

```
functions/
  src/
    index.ts                    ← export semua functions
    callable/                   ← (kosong dulu, diisi phase 2+)
    scheduled/                  ← (kosong dulu)
    lib/
      firestore.ts              ← admin SDK init
      auth.ts                   ← assertKetua, assertMember helpers
      notif.ts                  ← push notif helper (stub)
      transactions.ts           ← transaction wrappers (stub)
  shared/
    types.ts                    ← shared types antara client & functions
  package.json
  tsconfig.json
  .env
```

Isi minimal:

**[functions/src/index.ts](../functions/src/index.ts):**
```ts
import { onCall } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';

setGlobalOptions({ region: 'asia-southeast2', maxInstances: 10 });

// Hello world untuk verifikasi deployment
export const helloWorld = onCall((req) => {
  return { message: 'Hello from asia-southeast2', uid: req.auth?.uid ?? null };
});
```

**[functions/src/lib/firestore.ts](../functions/src/lib/firestore.ts):**
```ts
import admin from 'firebase-admin';

if (!admin.apps.length) admin.initializeApp();

export const db = admin.firestore();
export const auth = admin.auth();
```

**[functions/shared/types.ts](../functions/shared/types.ts):**
```ts
// Shared types antara client & Cloud Functions
// Diisi seiring phase berikutnya

export type Role = 'ketua' | 'anggota';
export type PaymentStatus = 'belum' | 'lunas' | 'terlambat';
export type GroupStatus = 'active' | 'dissolved' | 'completed';
export type Frekuensi = 'mingguan' | 'bulanan';
```

**[functions/package.json](../functions/package.json)** — pastikan `"engines": { "node": "20" }` dan dependencies `firebase-admin`, `firebase-functions` ^6 (atau latest stable per `firebase init` default).

Verifikasi: `cd functions && npm run build` → exit 0.

### Task 8 — Firebase config files (firestore.rules, firestore.indexes.json, firebase.json)

**[firestore.rules](../firestore.rules)** — baseline deny-all (PRD §7.1):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Deny all by default — buka per-collection di phase berikutnya
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**[firestore.indexes.json](../firestore.indexes.json):**
```json
{ "indexes": [], "fieldOverrides": [] }
```

**[firebase.json](../firebase.json)** (firebase init biasanya sudah buat — verify dan adjust):
```json
{
  "functions": [
    {
      "source": "functions",
      "codebase": "default",
      "ignore": ["node_modules", ".git", "*.local"],
      "predeploy": ["npm --prefix \"$RESOURCE_DIR\" run build"]
    }
  ],
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "emulators": {
    "auth": { "port": 9099 },
    "functions": { "port": 5001 },
    "firestore": { "port": 8080 },
    "ui": { "enabled": true, "port": 4000 },
    "singleProjectMode": true
  }
}
```

### Task 9 — `.firebaserc` (project aliases)

**[.firebaserc](../.firebaserc):**
```json
{
  "projects": {
    "default": "arisan-dev",
    "dev": "arisan-dev",
    "prod": "arisan-prod"
  }
}
```

### Task 10 — Verifikasi: deploy hello world ke Emulator dulu

```bash
firebase emulators:start --only functions,firestore,auth
```

Di terminal lain, test call (cukup browser ke `http://localhost:4000` → Functions tab → invoke `helloWorld`).

Setelah pass emulator, deploy ke dev:
```bash
firebase deploy --only functions --project dev
```

Verifikasi di Firebase Console `arisan-dev` → Functions → `helloWorld` ada dan region `asia-southeast2`.

### Task 11 — `eas.json`

Buat [eas.json](../eas.json) sesuai [CLAUDE.md §16.1](../CLAUDE.md#16-build--release) snippet, plus profile `development`:

```json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_FIREBASE_PROJECT": "arisan-dev",
        "EXPO_PUBLIC_USE_FIREBASE_EMULATOR": "false"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "ios": { "simulator": false },
      "env": { "EXPO_PUBLIC_FIREBASE_PROJECT": "arisan-dev" }
    },
    "production": {
      "android": { "buildType": "app-bundle" },
      "env": { "EXPO_PUBLIC_FIREBASE_PROJECT": "arisan-prod" }
    }
  },
  "submit": { "production": {} }
}
```

Run `eas build:configure` jika belum pernah init EAS untuk project ini.

### Task 12 — GitHub Actions CI

Buat [.github/workflows/ci.yml](../.github/workflows/ci.yml) sesuai [CLAUDE.md §23.4](../CLAUDE.md#23-git-workflow--cicd) (jobs `test` dan `rules-test`).

**Catatan:** `rules-test` job akan FAIL di Phase 1 karena Jest belum diinstall. Komentar out job tersebut sementara, kasih TODO note untuk Phase 8 yang akan install Jest.

### Task 13 — Build dev client (verifikasi end-to-end)

Instruksikan user:

```bash
eas build --profile development --platform android
```

Tunggu build selesai (~15-20 menit), download APK ke device fisik atau emulator, install. Lalu:

```bash
npx expo start --dev-client
```

Buka app di dev client → app harus jalan dengan UI shell existing (belum ada perubahan UI di Phase 1).

**Untuk iOS:** `eas build --profile development --platform ios` — butuh Apple Developer account, bisa di-skip jika tim belum punya, fokus Android dulu.

---

## ✅ Definition of Done

- [ ] User sudah buat 2 Firebase project + enable Phone Auth & Firestore (manual)
- [ ] `.gitignore` updated, `google-services.json` dan `GoogleService-Info.plist` ada di repo tapi NOT staged
- [ ] `.eslintrc.cjs`, `.prettierrc`, `.husky/pre-commit`, `lint-staged` configured
- [ ] `npm run lint` exit 0, `npm run typecheck` exit 0
- [ ] RNFirebase + expo-dev-client + Zustand + dayjs + netinfo + expo-notifications installed
- [ ] [app.json](../app.json) updated dengan plugins RNFirebase dan reference google-services files
- [ ] [src/services/firebase.ts](../src/services/firebase.ts) created dengan emulator switch
- [ ] `functions/` scaffold sesuai §18.1, `helloWorld` deploy SUCCESS ke `arisan-dev`
- [ ] Verified di Firebase Console: function di region `asia-southeast2`
- [ ] [firestore.rules](../firestore.rules) baseline deny-all deployed: `firebase deploy --only firestore:rules --project dev`
- [ ] [firebase.json](../firebase.json), [.firebaserc](../.firebaserc), [eas.json](../eas.json) created
- [ ] [.github/workflows/ci.yml](../.github/workflows/ci.yml) created (rules-test commented out dengan TODO)
- [ ] EAS dev client build SUCCESS, app jalan di device dengan UI shell existing
- [ ] Branch `feat/phase-01-setup` created
- [ ] PR opened dengan checklist filled

---

## 🧪 Acceptance criteria

Tidak ada acceptance criteria PRD yang langsung dicover Phase 1 — ini fondasi. Tapi pastikan tidak break apapun di UI shell yang sudah ada. Buka tiap screen di dev client untuk verifikasi visual masih sama persis.

---

## ❌ Out of scope Phase 1

- ❌ JANGAN tulis logic auth — itu Phase 2
- ❌ JANGAN ubah UI screen apapun di [app/](../app/) atau [src/](../src/) (selain tambah `src/services/`)
- ❌ JANGAN install Jest / Detox — itu Phase 8 / 10
- ❌ JANGAN deploy ke `arisan-prod` — Phase 10 saja
- ❌ JANGAN buat Cloud Function lebih dari `helloWorld` — itu phase berikutnya
- ❌ JANGAN setup Firebase Crashlytics initialization runtime call (cukup install + plugin) — itu Phase 9

---

## 🚨 Common pitfalls

1. **Pakai Firebase JS SDK** (`firebase` package) instead of `@react-native-firebase/*` — JANGAN. PRD wajib native modules untuk Phone Auth + Crashlytics + Performance. Lihat [CLAUDE.md §2](../CLAUDE.md#2-tech-stack) keputusan.
2. **Cloud Function di region default `us-central1`** — WAJIB `asia-southeast2`. Verify dengan setGlobalOptions ATAU per-function `region` option.
3. **Lupa `expo-build-properties` `useFrameworks: 'static'`** — RNFirebase iOS akan fail build tanpa ini.
4. **Commit `google-services.json`** — cek `git status` setelah letakkan file.
5. **Husky tidak executable** — `chmod +x .husky/pre-commit` setelah create.

---

## 🤔 When to ask user

- Sebelum `firebase init functions` — minta user konfirmasi Firebase CLI sudah login & project terpilih
- Sebelum letakkan `google-services.json` — minta user download dari Console dulu
- Sebelum `eas build` — minta user konfirmasi sudah `eas login` dan punya Expo account
- Jika `notification-icon.png` belum ada — tanya: skip plugin notifications dulu atau user provide asset?

---

## 📦 Commit message convention

```
chore(setup): initialize Firebase + RNFirebase + dev client baseline

- Add @react-native-firebase + expo-dev-client + Zustand + dayjs
- Scaffold functions/ with helloWorld in asia-southeast2
- Setup ESLint, Prettier, Husky, lint-staged
- Setup GitHub Actions CI (typecheck + lint)
- Configure eas.json with development/preview/production profiles
- Add firestore.rules deny-all baseline

Refs: CLAUDE.md §27 Week 1
```
