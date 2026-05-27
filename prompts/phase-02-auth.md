# Phase 2 — Auth Flow + OTP

**Session type:** New Claude Code session. Paste this entire file as your first message.

---

## 🎯 Goal

User dapat register dengan nomor HP +62 → terima OTP < 60 detik → verifikasi → setuju Privacy Policy & ToS (first-run) → masuk Beranda. Rate limit OTP 5×/jam/nomor aktif via Cloud Function. Session persist (tidak login ulang saat reopen app).

---

## 📋 Prerequisites

- Phase 1 complete & merged ke `main`
- Verifikasi: `git log --oneline -5` ada commit "chore(setup): initialize Firebase..."
- Verifikasi: `firebase deploy --only functions --project dev` masih jalan, `helloWorld` callable
- **User wajib:** di Firebase Console `arisan-dev` → Authentication → Settings → **Phone numbers for testing** → tambah min 1 test number (mis. `+62 812 0000 0001` dengan OTP `123456`) supaya bisa testing tanpa kena rate limit SMS Firebase

---

## 📚 Required reading

1. **CLAUDE.md**:
   - §4 Domain Model — `users/{userId}` structure
   - §5 F01 Auth + §5b Push Notification Flow
   - §6 Security (data minimization untuk nomor HP)
   - §9 Lokalisasi (format `+62 8xx-xxxx-xxxx`)
   - §18.3 Konvensi Cloud Function template
   - §27 Week 2 checklist
2. **PRD §4.2 F01, §10.1** — acceptance criteria auth
3. **File existing untuk audit gap (§1.5)**:
   - [app/(tabs)/profil.tsx](../app/(tabs)/profil.tsx) — saat ini hardcode `budi.santoso@email.com`. Phase 2 WAJIB hapus email field, ganti nomor HP (tidak ditampilkan ke anggota lain).
   - [app/_layout.tsx](../app/_layout.tsx) — sekarang tidak ada auth gate. Phase 2 wajib tambah.

---

## 🏗️ Tasks

### Task 1 — Cloud Function `rateLimitOTP`

Buat [functions/src/callable/rateLimitOTP.ts](../functions/src/callable/rateLimitOTP.ts):

```ts
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from '../lib/firestore';
import admin from 'firebase-admin';

const MAX_PER_HOUR = 5;
const WINDOW_MS = 60 * 60 * 1000;

export const rateLimitOTP = onCall(async (req) => {
  const phone = req.data?.phone as string | undefined;
  if (!phone || !/^\+62\d{8,13}$/.test(phone)) {
    throw new HttpsError('invalid-argument', 'Format nomor HP tidak valid');
  }
  
  const docRef = db.collection('otpQuota').doc(phone);
  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    const now = Date.now();
    const data = snap.data();
    const attempts: number[] = (data?.attempts ?? []).filter(
      (t: number) => now - t < WINDOW_MS
    );
    if (attempts.length >= MAX_PER_HOUR) {
      return { allowed: false, retryAfterMs: WINDOW_MS - (now - attempts[0]) };
    }
    attempts.push(now);
    tx.set(docRef, { attempts, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    return { allowed: true };
  });
  
  if (!result.allowed) {
    throw new HttpsError('resource-exhausted', `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil((result as any).retryAfterMs / 60000)} menit`);
  }
  return { ok: true };
});
```

Export di [functions/src/index.ts](../functions/src/index.ts):
```ts
export { rateLimitOTP } from './callable/rateLimitOTP';
```

Deploy: `firebase deploy --only functions:rateLimitOTP --project dev`.

### Task 2 — Zustand auth store

Buat [src/stores/auth.ts](../src/stores/auth.ts):

```ts
import { create } from 'zustand';
import auth from '@react-native-firebase/auth';

type UserProfile = {
  uid: string;
  phone: string;        // +62 format, NEVER show to other members
  nama: string;
  fotoUrl?: string;
  timezone: 'Asia/Jakarta' | 'Asia/Makassar' | 'Asia/Jayapura';
  consentAt: number;    // epoch ms — first-run consent timestamp
};

type AuthState = {
  user: UserProfile | null;
  initializing: boolean;
  setUser: (u: UserProfile | null) => void;
  setInitializing: (v: boolean) => void;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  initializing: true,
  setUser: (user) => set({ user }),
  setInitializing: (initializing) => set({ initializing }),
  logout: async () => {
    await auth().signOut();
    set({ user: null });
  },
}));
```

### Task 3 — Service layer auth

Buat [src/services/auth.ts](../src/services/auth.ts) dengan helper:

```ts
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import functions from '@react-native-firebase/functions';
import { firestore } from './firebase';

export const sendOtp = async (phone: string): Promise<FirebaseAuthTypes.ConfirmationResult> => {
  // Validate format
  if (!/^\+62\d{8,13}$/.test(phone)) throw new Error('Format nomor HP tidak valid');
  
  // Rate limit check via Cloud Function
  await functions('asia-southeast2').httpsCallable('rateLimitOTP')({ phone });
  
  // Send OTP
  return auth().signInWithPhoneNumber(phone);
};

export const verifyOtp = async (
  confirmation: FirebaseAuthTypes.ConfirmationResult,
  code: string
): Promise<FirebaseAuthTypes.UserCredential> => {
  return confirmation.confirm(code) as Promise<FirebaseAuthTypes.UserCredential>;
};

export const createUserProfile = async (uid: string, phone: string, nama: string, timezone: string) => {
  await firestore().collection('users').doc(uid).set({
    phone,
    nama,
    timezone,
    consentAt: firestore.FieldValue.serverTimestamp(),
    createdAt: firestore.FieldValue.serverTimestamp(),
  });
};

export const loadUserProfile = async (uid: string) => {
  const doc = await firestore().collection('users').doc(uid).get();
  return doc.data();
};
```

### Task 4 — Firestore rules untuk `users` & `otpQuota`

Update [firestore.rules](../firestore.rules):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // users — user only read/write own doc
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow delete: if false;
    }
    
    // otpQuota — DENY all client access (only Cloud Function via admin SDK)
    match /otpQuota/{phone} {
      allow read, write: if false;
    }
    
    // Default deny
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Deploy: `firebase deploy --only firestore:rules --project dev`.

### Task 5 — Splash screen (initial routing)

Buat [app/splash.tsx](../app/splash.tsx) atau handle di [app/_layout.tsx](../app/_layout.tsx). Pakai pattern:

```tsx
// app/_layout.tsx (modify existing)
import { useEffect } from 'react';
import auth from '@react-native-firebase/auth';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth';
import { loadUserProfile } from '@/services/auth';

// Inside RootLayout, after fonts loaded:
useEffect(() => {
  const unsub = auth().onAuthStateChanged(async (fbUser) => {
    if (fbUser) {
      const profile = await loadUserProfile(fbUser.uid);
      if (profile) {
        useAuthStore.getState().setUser({ uid: fbUser.uid, ...profile } as any);
        router.replace('/(tabs)');
      } else {
        // Auth ada tapi profile belum — direct ke consent (kasus user verify OTP tapi belum complete profile)
        router.replace('/auth/consent');
      }
    } else {
      router.replace('/auth/phone');
    }
    useAuthStore.getState().setInitializing(false);
  });
  return unsub;
}, []);
```

Tambahkan splash visual sederhana (background `colors.primary` + logo) saat `initializing === true`.

### Task 6 — Auth screens

Buat folder [app/auth/](../app/auth/) dengan:

**[app/auth/_layout.tsx](../app/auth/_layout.tsx):**
```tsx
import { Stack } from 'expo-router';
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

**[app/auth/phone.tsx](../app/auth/phone.tsx)** — input nomor HP:
- Header: "Masuk dengan Nomor HP"
- Prefix box "+62" disabled, TextInput numeric untuk sisanya
- Format display real-time: `812-3456-7890`
- Validasi: min 8 digit, max 13 digit setelah +62
- Tombol "Kirim Kode OTP" → call `sendOtp('+62' + cleanDigits)` → router.push('/auth/otp')
- Pass confirmation result via state (Zustand temp store atau router params)
- Pakai komponen [src/components/Button.tsx](../src/components/Button.tsx)

**[app/auth/otp.tsx](../app/auth/otp.tsx)** — input 6-digit OTP:
- 6 separate TextInput boxes (otomatis fokus next saat digit ketik)
- Countdown timer "Kirim ulang dalam 0:60" → setelah expire jadi tombol "Kirim ulang"
- Tombol "Verifikasi" → `verifyOtp(confirmation, code)`
- Setelah verify sukses, cek apakah profile ada → router push consent atau nama input
- Error handling: kode salah, expired, network error — toast jelas dalam Bahasa Indonesia

**[app/auth/consent.tsx](../app/auth/consent.tsx)** — first-run consent:
- Sapaan: "Sebelum lanjut..."
- Card scrollable berisi Privacy Policy ringkas (placeholder text, full PP di Phase 9)
- Card scrollable berisi Terms of Service ringkas (placeholder, full ToS di Phase 9)
- Link "Baca selengkapnya" → buka modal full text (placeholder)
- Checkbox "Saya setuju dengan Privacy Policy dan Terms of Service"
- TextInput "Nama lengkap" (untuk tampilan di grup, bukan nomor HP)
- Tombol "Lanjutkan" disabled sampai checkbox + nama filled
- Submit → `createUserProfile()` → router.replace('/(tabs)')

### Task 7 — Update profil.tsx (fix §1.5 mismatch #5)

Edit [app/(tabs)/profil.tsx](../app/(tabs)/profil.tsx):

1. **HAPUS** baris `<Text style={styles.email}>budi.santoso@email.com</Text>` (line ~75)
2. **GANTI** dengan: `<Text style={styles.phoneMasked}>+62 ••• ••• {last4}</Text>` (masked, hanya 4 digit terakhir tampil untuk user sendiri sebagai konfirmasi)
3. Hardcoded `name="Budi Santoso"` → ganti pakai `useAuthStore((s) => s.user?.nama)`
4. Tombol "Keluar" (currently no handler) → handle `useAuthStore.getState().logout()` lalu router.replace('/auth/phone')

### Task 8 — Push notification token register (foundation)

Buat [src/services/notifications.ts](../src/services/notifications.ts):

```ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { firestore } from './firebase';
import Constants from 'expo-constants';

export const registerPushToken = async (uid: string) => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return null;
  
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  
  await firestore().collection('users').doc(uid).update({
    expoPushToken: token,
    tokenUpdatedAt: firestore.FieldValue.serverTimestamp(),
  });
  
  return token;
};
```

Call dari consent flow setelah `createUserProfile` sukses (per [CLAUDE.md §5b](../CLAUDE.md#5b-push-notification-flow): minta permission setelah consent, bukan sebelum).

### Task 9 — Loading & error states

Setiap screen auth wajib handle:
- Loading: tombol jadi spinner saat call in-flight
- Error: toast dengan pesan Bahasa Indonesia. Mapping common error code Firebase Auth:
  - `auth/invalid-phone-number` → "Format nomor HP tidak valid"
  - `auth/too-many-requests` → "Terlalu banyak percobaan, coba lagi nanti"
  - `auth/invalid-verification-code` → "Kode OTP salah"
  - `auth/code-expired` → "Kode OTP sudah expired, minta kirim ulang"

---

## ✅ Definition of Done

- [ ] Cloud Function `rateLimitOTP` deployed ke `arisan-dev`, tested via Emulator: kelima request pass, request ke-6 throw `resource-exhausted`
- [ ] Firestore rules `users` & `otpQuota` deployed
- [ ] Screens auth/phone, auth/otp, auth/consent berfungsi end-to-end di dev client
- [ ] Test number (`+62 812 0000 0001` dengan OTP `123456`) bisa login sampai Beranda
- [ ] User profile tersimpan di `users/{uid}` Firestore dengan field `phone`, `nama`, `timezone`, `consentAt`
- [ ] `expoPushToken` tersimpan di `users/{uid}` setelah consent
- [ ] App reopen → langsung Beranda tanpa login ulang (session persist via Firebase Auth)
- [ ] Logout dari profil → kembali ke auth/phone
- [ ] [app/(tabs)/profil.tsx](../app/(tabs)/profil.tsx) tidak ada lagi `budi.santoso@email.com` — diganti masked phone
- [ ] [app/(tabs)/profil.tsx](../app/(tabs)/profil.tsx) ambil nama dari `useAuthStore`, bukan hardcoded
- [ ] `npm run lint && npm run typecheck` green
- [ ] CLAUDE.md §1.5 mismatch #5 (email vs HP) bisa dicoret — update CLAUDE.md di akhir phase
- [ ] Branch `feat/phase-02-auth` + PR opened

---

## 🧪 Acceptance Criteria (PRD §10.1)

- [ ] User dapat register dengan nomor HP Indonesia (+62) dan verifikasi OTP dalam < 60 detik (pakai test number untuk verifikasi)
- [ ] OTP request dibatasi maksimal 5x per nomor per jam
- [ ] User yang sudah login tidak perlu login ulang saat buka app
- [ ] Error message jelas saat OTP salah atau expired (Bahasa Indonesia)
- [ ] First-run: user harus setuju Privacy Policy & ToS sebelum bisa lanjut

---

## ❌ Out of scope Phase 2

- ❌ JANGAN tulis full Privacy Policy / ToS — placeholder OK, full text Phase 9
- ❌ JANGAN implement Delete Account flow — Phase 9
- ❌ JANGAN ubah screen non-auth selain profil.tsx (Beranda, Detail Grup, dst.) — masih pakai mock
- ❌ JANGAN setup Firestore listener untuk groups/members — Phase 3
- ❌ JANGAN handle "user verify OTP tapi crash sebelum consent" recovery edge case — assume happy path, log issue untuk Phase 9 hardening

---

## 🚨 Common pitfalls

1. **`Math.random()` di client** — JANGAN dipakai untuk apapun yang security-sensitive. Untuk Phase 2 belum ada, tapi waspada.
2. **Direct write ke `users/{userId}` tanpa cek auth.uid match** — security rules akan deny, tapi pastikan client side juga konsisten.
3. **Tampilkan nomor HP user lain** — JANGAN. Hanya `nama` yang muncul di list anggota. Data minimization per PRD.
4. **Lupa region `asia-southeast2`** saat `httpsCallable` — default ke `us-central1` yang tidak ada function-nya.
5. **Pass confirmation result via Zustand persist** — JANGAN. ConfirmationResult adalah object kompleks dengan reference, hanya hidup di memory. Gunakan in-memory Zustand atau context.

---

## 🤔 When to ask user

- Sebelum deploy `rateLimitOTP` — pastikan emulator test green
- Jika test number belum ditambah di Firebase Console — minta user setup dulu
- Sebelum hapus baris email dari [profil.tsx](../app/(tabs)/profil.tsx) — informasikan ke user bahwa email field memang harus dihapus (per §1.5 mismatch #5)
- Jika muncul question soal teks Privacy Policy / ToS placeholder — tanya: pakai lorem ipsum atau draft 1 paragraf real

---

## 📦 Commit message

```
feat(auth): implement phone OTP flow with rate limiting

- Add rateLimitOTP Cloud Function (max 5/hour/phone)
- Add auth screens: phone input, OTP verify, first-run consent
- Add Zustand auth store + service layer
- Wire profil.tsx to real user data, remove hardcoded email
- Register Expo push token after consent
- Add Firestore rules for users/ and otpQuota/

Acceptance: PRD §10.1
Refs: CLAUDE.md §27 Week 2, fixes §1.5 mismatch #5
```
