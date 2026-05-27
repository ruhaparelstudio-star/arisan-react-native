# Phase 8 — Activity Log Wiring + Unit Testing

**Session type:** New Claude Code session. Paste this entire file as your first message.

---

## 🎯 Goal

(1) Wire screen [app/riwayat.tsx](../app/riwayat.tsx) ke `activityLog` Firestore real-time (replace mock RIWAYAT). (2) Setup Jest + Firebase Emulator test infrastructure. (3) Tulis unit tests untuk logic kritis PRD §8.1 dengan target coverage > 80% functions kritis.

---

## 📋 Prerequisites

- Phase 1–7 complete & merged
- Verifikasi: activityLog sudah dapat data dari semua phase sebelumnya — Phase 3 (group_created, member_joined), Phase 4 (payment_confirmed), Phase 5 (undian_done, urutan_preset_mode1), Phase 6 (tanggal_set, tanggal_overridden), Phase 7 (swap_approved)
- Firebase Emulator pernah dipakai (di Phase 1)

---

## 📚 Required reading

1. **CLAUDE.md**:
   - §5 F08 Activity Log
   - §9 Timezone (untuk filter timezone WIB/WITA/WIT)
   - §11 Testing layers + test cases wajib
   - §22.7 npm scripts test
   - §27 Week 8 checklist
2. **PRD §4.2 F08, §8, §8.1, §10.4** — testing requirements
3. **File existing yang akan diubah**:
   - [app/riwayat.tsx](../app/riwayat.tsx) — saat ini pakai mock RIWAYAT, filter chips OK tapi data static. Wire ke real Firestore.
   - [src/data/mock.ts](../src/data/mock.ts) — RIWAYAT array, akan tidak dipakai lagi (boleh keep file dulu, hapus Phase 9 atau 10 saat full cleanup)

---

## 🏗️ Tasks

### Task 1 — Extend shared types

Update [functions/shared/types.ts](../functions/shared/types.ts):

```ts
export type ActivityLogType =
  | 'group_created'
  | 'member_joined'
  | 'payment_confirmed'
  | 'urutan_preset_mode1'
  | 'undian_done'
  | 'tanggal_set'
  | 'tanggal_overridden'
  | 'swap_requested'
  | 'swap_target_acted'
  | 'swap_approved';

export type ActivityLog = {
  logId: string;
  type: ActivityLogType;
  actorId: string;
  actorNama: string;
  timestamp: number;
  metadata: Record<string, any>;
};

export type ActivityCategory = 'pembayaran' | 'undian' | 'tukar' | 'perubahan';

// Helper untuk categorize tipe ke kategori UI
export const ACTIVITY_CATEGORY: Record<ActivityLogType, ActivityCategory> = {
  group_created: 'perubahan',
  member_joined: 'perubahan',
  payment_confirmed: 'pembayaran',
  urutan_preset_mode1: 'undian',
  undian_done: 'undian',
  tanggal_set: 'perubahan',
  tanggal_overridden: 'perubahan',
  swap_requested: 'tukar',
  swap_target_acted: 'tukar',
  swap_approved: 'tukar',
};
```

### Task 2 — Wire [app/riwayat.tsx](../app/riwayat.tsx) ke Firestore

Replace mock data dengan subscription. Params: `groupId` (optional — kalau tidak ada, query semua grup user).

```tsx
import { firestore } from '@/services/firebase';
import { ACTIVITY_CATEGORY, type ActivityLog, type ActivityCategory } from '@arisan/shared/types';
import dayjs from 'dayjs';

export default function RiwayatScreen() {
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();
  const user = useAuthStore(s => s.user)!;
  const [filter, setFilter] = useState<ActivityCategory | 'all'>('all');
  const [items, setItems] = useState<(ActivityLog & { groupId: string })[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    let unsub: (() => void) | null = null;
    
    if (groupId) {
      // Single group log
      unsub = firestore()
        .collection('groups').doc(groupId).collection('activityLog')
        .orderBy('timestamp', 'desc')
        .limit(100)
        .onSnapshot((snap) => {
          setItems(snap.docs.map(d => ({ logId: d.id, groupId, ...(d.data() as any) })));
          setLoading(false);
        });
    } else {
      // All groups user is member of — collection group query
      unsub = firestore()
        .collectionGroup('activityLog')
        .orderBy('timestamp', 'desc')
        .limit(100)
        .onSnapshot(async (snap) => {
          // Filter only groups user is member of (security rules akan deny otomatis untuk yang bukan)
          // Jika ada permission error per doc, akan logged tapi tidak crash
          const filtered = snap.docs.map(d => {
            const groupRef = d.ref.parent.parent!;
            return { logId: d.id, groupId: groupRef.id, ...(d.data() as any) };
          });
          setItems(filtered);
          setLoading(false);
        }, (err) => {
          console.error('riwayat error', err);
          setLoading(false);
        });
    }
    
    return () => unsub?.();
  }, [groupId]);
  
  const filteredItems = filter === 'all' 
    ? items 
    : items.filter(i => ACTIVITY_CATEGORY[i.type as keyof typeof ACTIVITY_CATEGORY] === filter);
  
  // Render filter chips + timeline (reuse existing UI from riwayat.tsx)
  // Format timestamp: dayjs(ms).tz(user.timezone).format('D MMM, HH:mm') + ' WIB/WITA/WIT'
}
```

Mapping `type` → emoji + dot color (replicate dari mock RIWAYAT mapping):
- `payment_confirmed` → 🟢 green
- `undian_done` / `urutan_preset_mode1` → 🏆 purple
- `tanggal_set` / `tanggal_overridden` → 📅 blue
- `swap_approved` → 🔄 amber
- `group_created` → 🎉 gray
- `member_joined` → 👋 gray

Title & desc template per tipe — derive dari `actorNama` + `metadata`. Contoh:
- `payment_confirmed`: title `"${actorNama} mengkonfirmasi pembayaran ${metadata.targetNama}"`, desc `"Periode ${metadata.periodeId}"`
- `undian_done`: title `"Undian Periode ${metadata.periodeId} selesai"`, desc `"Pemenang: ${metadata.winnerNama} (${metadata.method})"`

**Index requirement** — tambah [firestore.indexes.json](../firestore.indexes.json):
```json
{
  "collectionGroup": "activityLog",
  "queryScope": "COLLECTION_GROUP",
  "fields": [{ "fieldPath": "timestamp", "order": "DESCENDING" }]
}
```

### Task 3 — Setup Jest + Firebase Emulator testing infra

```bash
npm install -D jest @types/jest ts-jest jest-environment-node @firebase/rules-unit-testing firebase-functions-test
```

**`jest.config.js`** (root):
```js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '/.expo/', '/functions/lib/'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@arisan/shared/(.*)$': '<rootDir>/functions/shared/$1',
  },
};
```

**`jest.rules.config.js`** (root) — khusus Firestore rules:
```js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/rules/**/*.test.ts'],
  testTimeout: 30000,
};
```

Update [package.json](../package.json) scripts:
```json
"test": "jest",
"test:rules": "firebase emulators:exec --only firestore 'jest --config jest.rules.config.js'",
"test:functions": "cd functions && npm test"
```

### Task 4 — Unit tests untuk shared helpers

[__tests__/random.test.ts](../__tests__/random.test.ts) — test `functions/src/lib/random.ts`:

```ts
import { randomPick, randomShuffle } from '../functions/src/lib/random';

describe('randomPick', () => {
  it('throws on empty array', () => {
    expect(() => randomPick([])).toThrow();
  });
  
  it('returns element from array', () => {
    const arr = ['a', 'b', 'c'];
    const picked = randomPick(arr);
    expect(arr).toContain(picked);
  });
  
  it('distributes roughly uniform across 10k samples', () => {
    const arr = ['a', 'b', 'c', 'd'];
    const counts = { a: 0, b: 0, c: 0, d: 0 };
    for (let i = 0; i < 10000; i++) {
      counts[randomPick(arr) as keyof typeof counts]++;
    }
    // each should be within ~10% of 2500
    Object.values(counts).forEach(c => expect(c).toBeGreaterThan(2200));
    Object.values(counts).forEach(c => expect(c).toBeLessThan(2800));
  });
});

describe('randomShuffle', () => {
  it('returns same length', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(randomShuffle(arr).length).toBe(5);
  });
  
  it('returns same elements (set equality)', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(randomShuffle(arr).sort()).toEqual(arr);
  });
  
  it('does not mutate input', () => {
    const arr = [1, 2, 3];
    const original = [...arr];
    randomShuffle(arr);
    expect(arr).toEqual(original);
  });
});
```

### Task 5 — Firestore Security Rules tests (PRD §8.1)

Buat folder [__tests__/rules/](../__tests__/rules/).

[__tests__/rules/users.test.ts](../__tests__/rules/users.test.ts):

```ts
import { initializeTestEnvironment, RulesTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import * as fs from 'fs';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'arisan-test',
    firestore: {
      rules: fs.readFileSync('firestore.rules', 'utf8'),
      host: 'localhost',
      port: 8080,
    },
  });
});

beforeEach(async () => { await env.clearFirestore(); });
afterAll(async () => { await env.cleanup(); });

describe('users rules', () => {
  it('user can read own doc', async () => {
    const alice = env.authenticatedContext('alice').firestore();
    await assertSucceeds(getDoc(doc(alice, 'users/alice')));
  });
  
  it('user cannot read other user doc', async () => {
    const alice = env.authenticatedContext('alice').firestore();
    await assertFails(getDoc(doc(alice, 'users/bob')));
  });
  
  it('user can write own doc', async () => {
    const alice = env.authenticatedContext('alice').firestore();
    await assertSucceeds(setDoc(doc(alice, 'users/alice'), { nama: 'Alice' }));
  });
  
  it('user cannot delete own doc', async () => {
    const alice = env.authenticatedContext('alice').firestore();
    await assertFails(deleteDoc(doc(alice, 'users/alice')));
  });
});
```

[__tests__/rules/payments.test.ts](../__tests__/rules/payments.test.ts):

```ts
// ... setup similar
describe('payments rules — PRD §10.4', () => {
  beforeEach(async () => {
    // Seed: grup test, alice = ketua, bob = anggota
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'groups/g1'), { ketuaId: 'alice' });
      await setDoc(doc(db, 'groups/g1/members/alice'), { role: 'ketua', userId: 'alice' });
      await setDoc(doc(db, 'groups/g1/members/bob'), { role: 'anggota', userId: 'bob' });
      await setDoc(doc(db, 'groups/g1/periods/01'), { nomor: 1 });
    });
  });
  
  it('ketua cannot write payments directly (must use Cloud Function)', async () => {
    const alice = env.authenticatedContext('alice').firestore();
    await assertFails(setDoc(doc(alice, 'groups/g1/periods/01/payments/bob'), { status: 'lunas' }));
  });
  
  it('anggota cannot write payments', async () => {
    const bob = env.authenticatedContext('bob').firestore();
    await assertFails(setDoc(doc(bob, 'groups/g1/periods/01/payments/bob'), { status: 'lunas' }));
  });
  
  it('member can read payments', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'groups/g1/periods/01/payments/bob'), { status: 'lunas' });
    });
    const bob = env.authenticatedContext('bob').firestore();
    await assertSucceeds(getDoc(doc(bob, 'groups/g1/periods/01/payments/bob')));
  });
  
  it('non-member cannot read payments', async () => {
    const charlie = env.authenticatedContext('charlie').firestore();
    await assertFails(getDoc(doc(charlie, 'groups/g1/periods/01/payments/bob')));
  });
});
```

[__tests__/rules/activityLog.test.ts](../__tests__/rules/activityLog.test.ts):

```ts
describe('activityLog rules — append-only', () => {
  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'groups/g1'), { ketuaId: 'alice' });
      await setDoc(doc(db, 'groups/g1/members/alice'), { role: 'ketua' });
      await setDoc(doc(db, 'groups/g1/activityLog/log1'), {
        type: 'group_created', actorId: 'alice', timestamp: Date.now(),
      });
    });
  });
  
  it('member can read log', async () => {
    const alice = env.authenticatedContext('alice').firestore();
    await assertSucceeds(getDoc(doc(alice, 'groups/g1/activityLog/log1')));
  });
  
  it('NO ONE can write activityLog from client', async () => {
    const alice = env.authenticatedContext('alice').firestore();
    await assertFails(setDoc(doc(alice, 'groups/g1/activityLog/log2'), { type: 'x' }));
  });
  
  it('NO ONE can delete activityLog from client', async () => {
    const alice = env.authenticatedContext('alice').firestore();
    await assertFails(deleteDoc(doc(alice, 'groups/g1/activityLog/log1')));
  });
});
```

[__tests__/rules/messages.test.ts](../__tests__/rules/messages.test.ts):

```ts
describe('messages rules', () => {
  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'groups/g1'), { ketuaId: 'alice' });
      await setDoc(doc(db, 'groups/g1/members/alice'), { role: 'ketua' });
      await setDoc(doc(db, 'groups/g1/members/bob'), { role: 'anggota' });
    });
  });
  
  it('member can create message with own authorId', async () => {
    const bob = env.authenticatedContext('bob').firestore();
    await assertSucceeds(addDoc(collection(bob, 'groups/g1/messages'), {
      kind: 'msg', text: 'halo', authorId: 'bob', createdAt: serverTimestamp(),
    }));
  });
  
  it('member cannot create message with different authorId (spoof)', async () => {
    const bob = env.authenticatedContext('bob').firestore();
    await assertFails(addDoc(collection(bob, 'groups/g1/messages'), {
      kind: 'msg', text: 'halo', authorId: 'alice',  // spoofing
    }));
  });
  
  it('cannot create empty message', async () => {
    const bob = env.authenticatedContext('bob').firestore();
    await assertFails(addDoc(collection(bob, 'groups/g1/messages'), {
      kind: 'msg', text: '', authorId: 'bob',
    }));
  });
  
  it('cannot create text > 1000 chars', async () => {
    const bob = env.authenticatedContext('bob').firestore();
    await assertFails(addDoc(collection(bob, 'groups/g1/messages'), {
      kind: 'msg', text: 'x'.repeat(1001), authorId: 'bob',
    }));
  });
  
  it('cannot update or delete message', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'groups/g1/messages/m1'), { text: 'old', authorId: 'bob' });
    });
    const bob = env.authenticatedContext('bob').firestore();
    await assertFails(updateDoc(doc(bob, 'groups/g1/messages/m1'), { text: 'edited' }));
    await assertFails(deleteDoc(doc(bob, 'groups/g1/messages/m1')));
  });
});
```

### Task 6 — Cloud Functions integration tests (Emulator)

[functions/__tests__/triggerUndian.test.ts](../functions/__tests__/triggerUndian.test.ts):

```ts
import * as admin from 'firebase-admin';
import functionsTest from 'firebase-functions-test';

const test = functionsTest({
  projectId: 'arisan-test',
});

// Set env supaya admin SDK connect ke emulator
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

import { triggerUndian } from '../src/callable/triggerUndian';

const wrapped = test.wrap(triggerUndian);

beforeAll(() => {
  admin.initializeApp({ projectId: 'arisan-test' });
});

afterAll(async () => {
  await test.cleanup();
});

describe('triggerUndian', () => {
  beforeEach(async () => {
    // Clear firestore via emulator REST API
    await fetch('http://localhost:8080/emulator/v1/projects/arisan-test/databases/(default)/documents', {
      method: 'DELETE',
    });
    
    // Seed: grup dengan ketua + 3 anggota
    const db = admin.firestore();
    await db.collection('groups').doc('g1').set({
      ketuaId: 'alice', undianMode: 'mode3', jumlahPeriode: 3, periodeAktif: 1,
    });
    await db.collection('groups/g1/members').doc('alice').set({
      userId: 'alice', nama: 'Alice', role: 'ketua', giliran: 0, sudahMenang: false, jumlahTukar: 0,
    });
    await db.collection('groups/g1/members').doc('bob').set({
      userId: 'bob', nama: 'Bob', role: 'anggota', giliran: 0, sudahMenang: false, jumlahTukar: 0,
    });
    await db.collection('groups/g1/members').doc('charlie').set({
      userId: 'charlie', nama: 'Charlie', role: 'anggota', giliran: 0, sudahMenang: true, jumlahTukar: 0,
    });
  });
  
  it('PRD §8.1 — random NEVER picks sudahMenang=true', async () => {
    for (let i = 0; i < 20; i++) {
      // Reset winners between iterations
      await admin.firestore().collection('groups/g1/winners').doc('01').delete().catch(() => {});
      
      const result = await wrapped({
        data: { groupId: 'g1', periodeId: '01', method: 'random' },
        auth: { uid: 'alice' },
      } as any);
      
      expect(result.winnerId).not.toBe('charlie');  // sudahMenang
    }
  });
  
  it('rejects manual without alasan', async () => {
    await expect(wrapped({
      data: { groupId: 'g1', periodeId: '01', method: 'manual', manualWinnerId: 'bob' },
      auth: { uid: 'alice' },
    } as any)).rejects.toThrow(/alasan/i);
  });
  
  it('rejects when not ketua', async () => {
    await expect(wrapped({
      data: { groupId: 'g1', periodeId: '01', method: 'random' },
      auth: { uid: 'bob' },  // bukan ketua
    } as any)).rejects.toThrow(/ketua/i);
  });
  
  it('rejects double trigger for same period', async () => {
    await wrapped({
      data: { groupId: 'g1', periodeId: '01', method: 'random' },
      auth: { uid: 'alice' },
    } as any);
    
    await expect(wrapped({
      data: { groupId: 'g1', periodeId: '01', method: 'random' },
      auth: { uid: 'alice' },
    } as any)).rejects.toThrow(/sudah ditentukan/i);
  });
});
```

Buat tests serupa untuk:
- [functions/__tests__/validatePayment.test.ts](../functions/__tests__/validatePayment.test.ts) — ketua only, no double confirm, status update
- [functions/__tests__/approveSwap.test.ts](../functions/__tests__/approveSwap.test.ts) — atomic swap, jumlahTukar increment, sudahMenang check
- [functions/__tests__/rateLimitOTP.test.ts](../functions/__tests__/rateLimitOTP.test.ts) — 5 boleh, ke-6 throw

[functions/package.json](../functions/package.json) scripts:
```json
"test": "FIRESTORE_EMULATOR_HOST=localhost:8080 jest"
```

### Task 7 — Coverage report

```bash
npm install -D @vitest/coverage-v8  # OR jest --coverage native
```

Update `jest.config.js` add:
```js
collectCoverageFrom: [
  'functions/src/**/*.ts',
  '!functions/src/index.ts',  // re-export only
],
coverageThreshold: {
  global: {
    statements: 70,
    branches: 60,
    functions: 80,  // PRD §8 target
    lines: 70,
  },
},
```

Run `npm test -- --coverage` — target functions kritis (validatePayment, triggerUndian, approveSwap, requestSwap, presetUrutanMode1) > 80%.

### Task 8 — Enable `rules-test` job di GitHub Actions

Uncomment job `rules-test` di [.github/workflows/ci.yml](../.github/workflows/ci.yml) (was commented in Phase 1). Verify jalan green.

---

## ✅ Definition of Done

- [ ] [app/riwayat.tsx](../app/riwayat.tsx) wired ke real `activityLog` Firestore (collection group atau per-grup)
- [ ] Filter chips berfungsi mapping ACTIVITY_CATEGORY
- [ ] Timestamp format pakai dayjs locale Indonesia + timezone user (WIB/WITA/WIT suffix)
- [ ] Firestore index `activityLog collectionGroup timestamp desc` deployed
- [ ] Jest + ts-jest installed + configured
- [ ] [jest.config.js](../jest.config.js) + [jest.rules.config.js](../jest.rules.config.js) ada
- [ ] `npm test` jalan green (helper random tests pass)
- [ ] `npm run test:rules` jalan green dengan emulator started (4 test files: users, payments, activityLog, messages — semua acceptance PRD §10.4 covered)
- [ ] `npm run test:functions` jalan green (triggerUndian, validatePayment, approveSwap, rateLimitOTP tests)
- [ ] Coverage > 80% untuk functions kritis (verifikasi `npm test -- --coverage`)
- [ ] CI GitHub Actions `rules-test` job uncommented dan green
- [ ] `npm run lint && npm run typecheck` green
- [ ] Branch `feat/phase-08-activity-test` + PR opened

---

## 🧪 Acceptance Criteria (PRD §8.1, §10.4)

- [ ] Test: random tidak pernah memilih anggota `sudahMenang = true` (loop 20× verify)
- [ ] Test: anggota tidak bisa write `payments` (rules deny)
- [ ] Test: anggota tidak bisa delete `activityLog` (rules deny)
- [ ] Test: reminder dedup — 2 trigger di hari sama hanya kirim 1× (jika ada time untuk integration test scheduler — opsional, manual verify OK)
- [ ] Test: user di luar grup tidak bisa read data grup
- [ ] Test: ketua tidak bisa write langsung ke `winners` — harus lewat Cloud Function

---

## ❌ Out of scope Phase 8

- ❌ JANGAN tulis E2E Detox tests — Phase 10
- ❌ JANGAN snapshot test UI components — fokus logic dulu
- ❌ JANGAN tulis test untuk setiap line code — 80% functions kritis cukup
- ❌ JANGAN setup CI/CD deployment automation untuk prod — Phase 10
- ❌ JANGAN hapus [src/data/mock.ts](../src/data/mock.ts) — keep untuk reference & development convenience, cleanup Phase 10

---

## 🚨 Common pitfalls

1. **Firebase Emulator harus running** sebelum `npm run test:rules` — kalau lupa, error connection. Pakai `firebase emulators:exec` yang auto-start & shutdown.
2. **`FIRESTORE_EMULATOR_HOST` env var** wajib untuk integration tests di functions — kalau ngga, admin SDK akan hit production Firestore (DESTRUCTIVE).
3. **Lupa `await env.clearFirestore()` di beforeEach** — test sebelumnya leak data. Hasil test inkonsisten.
4. **Coverage threshold gagal** — drop threshold di awal, naikkan bertahap. Jangan paksakan 80% jika realistic 70%.
5. **`firestore.collectionGroup` membutuhkan composite index** — index sudah dideploy tapi build di Firebase butuh 5-10 menit. Cek Firebase Console Indexes tab.

---

## 🤔 When to ask user

- Coverage threshold global (statements/branches/lines): konfirmasi target — default 70% atau lebih agresif?
- Filter timestamp di riwayat (selain by category): mau tambah date picker? — MVP: skip, keep filter category saja
- Pre-commit hook tambahan: jalankan `npm test` pre-commit? Akan slow down commit. Default: NO, biarkan di CI

---

## 📦 Commit message

```
feat(activity+tests): wire activityLog UI + Jest test suite

- Wire app/riwayat.tsx to real Firestore activityLog (collection group)
- Format timestamp with dayjs Indonesia locale + timezone
- Setup Jest + ts-jest + @firebase/rules-unit-testing
- Add Firestore Rules tests: users, payments, activityLog, messages (PRD §10.4)
- Add Cloud Functions integration tests: triggerUndian, validatePayment, approveSwap, rateLimitOTP
- Add helper tests for random utilities
- Enable rules-test job in CI

Coverage: functions kritis > 80%
Acceptance: PRD §8.1, §10.4
Refs: CLAUDE.md §27 Week 8
```
