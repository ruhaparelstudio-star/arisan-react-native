# Phase Prompts — Arisan App

10 prompt session-ready untuk eksekusi MVP Arisan 10-minggu. **1 phase = 1 session Claude Code.**

## Cara pakai

1. Buka session Claude Code baru di repo ini
2. Copy isi file phase yang sesuai (mis. `phase-01-setup.md`)
3. Paste sebagai **pesan pertama** ke Claude
4. Claude akan baca CLAUDE.md + PRD + file existing, lalu eksekusi tasknya
5. Setelah phase selesai → review PR → merge → mulai phase berikutnya di session baru

## Aturan main per session

- **JANGAN** mix dua phase di satu session — konteks jadi pecah
- **JANGAN** skip phase — tiap phase punya prerequisite dari phase sebelumnya
- **JANGAN** ubah CLAUDE.md tanpa konfirmasi user — kalau Claude temukan gap, flag dulu
- Setelah phase selesai → commit di branch `feat/phase-XX-<name>` → PR ke `main`

## Index phase

| #   | File                                                     | Topik                    | Output utama                                                             | Est durasi |
| --- | -------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------ | ---------- |
| 1   | [phase-01-setup.md](phase-01-setup.md)                   | Setup & Fondasi          | Firebase init, RNFirebase, dev client, ESLint, CI, functions scaffold    | 1 minggu   |
| 2   | [phase-02-auth.md](phase-02-auth.md)                     | Auth Flow + OTP          | Splash → HP input → OTP → consent. `rateLimitOTP` function               | 1 minggu   |
| 3   | [phase-03-group.md](phase-03-group.md)                   | Group Management         | Buat grup, invite, join via kode/link. Dashboard wired                   | 1 minggu   |
| 4   | [phase-04-payment.md](phase-04-payment.md)               | Tracking Pembayaran      | `validatePayment`, period picker, scheduler reminder                     | 1 minggu   |
| 5   | [phase-05-undian.md](phase-05-undian.md)                 | Sistem Undian            | Fix §1.5 mismatch #1, #2, #4. Server-side random. Mode 1 vs 3            | 1 minggu   |
| 6   | [phase-06-tanggal.md](phase-06-tanggal.md)               | Set Tanggal Pelaksanaan  | Refactor set-date.tsx, scheduler reminders, ketua override               | 1 minggu   |
| 7   | [phase-07-swap-chat.md](phase-07-swap-chat.md)           | Tukar Giliran + Chat     | Fix limit 2×, Layer 2 screen, inverted FlatList + pagination             | 1 minggu   |
| 8   | [phase-08-activity-test.md](phase-08-activity-test.md)   | Activity Log + Unit Test | Wire riwayat, Jest setup, test cases PRD §8.1                            | 1 minggu   |
| 9   | [phase-09-security-legal.md](phase-09-security-legal.md) | Security & Legal         | Rules 100% coverage, Privacy/ToS, Delete Account, Crashlytics, Analytics | 1 minggu   |
| 10  | [phase-10-polish-release.md](phase-10-polish-release.md) | Polish & Build           | Detox E2E, EAS build APK + TestFlight, store listing, closed beta        | 1 minggu   |

## Konvensi prompt

Tiap file phase mengikuti struktur:

```
## 🎯 Goal               — apa yang harus selesai
## 📋 Prerequisites      — phase sebelumnya + setup user
## 📚 Required reading   — CLAUDE.md sections + PRD sections + file existing
## 🏗️ Tasks              — list konkret dengan file path & spec
## ✅ Definition of Done  — checklist sebelum PR
## 🧪 Acceptance Criteria — dari PRD §10
## ❌ Out of scope        — apa yang BUKAN urusan phase ini
## 🚨 Common pitfalls     — anti-pattern yang harus dihindari
## 🤔 When to ask user   — saat Claude harus konfirmasi user
```

## Verifikasi dari Claude (anti-hallucination guardrails)

Setiap prompt mengandung instruksi:

- **Read first, write after** — Claude wajib baca file existing sebelum modifikasi
- **Reference exact paths** — semua file path sudah diverifikasi ada di repo per Mei 2026
- **Reference exact package names** — tidak ada package fiktif
- **Ask before destructive** — Claude wajib confirm sebelum delete/rewrite besar
- **Verify external state** — Claude tidak boleh asumsi Firebase project ada; wajib instruksikan user buat di Console

## Setelah Phase 10

App ready submit ke Play Store + App Store. Lanjutan ke Phase 2/3 PRD ada di [CLAUDE.md §12](../CLAUDE.md#12-out-of-scope-jangan-disarankan-untuk-mvp).
