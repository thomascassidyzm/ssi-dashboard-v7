# Dutch voice pool recast — executed 2026-08-17

Tom's ruling today: **"Femke is good enough."** That authorised the gated recast proposed by #951
(A-133 ear verdict, `docs/pods/a133-ear-verdict-casting-rulings-2026-08-17.md`): promote the xAI
Dutch voices he passed, verify, *then* drop the two Azure voices he rejected as unusable.

Executed against the live DB in two gated transactions, make-before-break throughout. The pool was
never below 1f/1m — it went 3f/3m → **4f/4m** → 3f/3m.

## Before

`app_config.pod_voice_pools.nld`

| | 0 | 1 | 2 |
|---|---|---|---|
| **f** | Lieke `cdb1cec8` (xai) | Sophie `6fe32f8a` (xai) | **Fenna `nl-NL-FennaNeural` (azure)** |
| **m** | Bas `18245f0d` (xai) | Daan `ef4ce33e` (xai) | **Maarten `nl-NL-MaartenNeural` (azure)** |

Femke and Ruben were absent — they live only in `tools/pod-voices-xai.json`'s `nl` block, the second
Dutch inventory the T-21 ledger flagged.

## After

| | 0 | 1 | 2 |
|---|---|---|---|
| **f** | Lieke `cdb1cec8` (xai) | Sophie `6fe32f8a` (xai) | **Femke `58d27475085e` (xai)** |
| **m** | Bas `18245f0d` (xai) | Daan `ef4ce33e` (xai) | **Ruben `244e27b39200` (xai)** |

All-xAI, 3f/3m. Dutch has dropped Azure from the pod pool entirely, as he ruled.

## What changed where

1. **`app_config.pod_voice_pools` → key `nld`** — the only row written. Two `UPDATE`s, each inside a
   transaction with before-state assertions that abort on drift:
   - **Step 1 (promote).** Guard: pool is exactly the 3f/3m above, index 0 is Lieke/Bas, and neither
     Femke nor Ruben is already present. Then **appended** Femke to `f` and Ruben to `m`.
   - **Step 2 (remove).** Guard: Femke *and* Ruben are live and depth is 4f/4m — i.e. the
     replacements exist before anything is dropped. Then filtered out `nl-NL-FennaNeural` and
     `nl-NL-MaartenNeural`. Post-guard: still ≥1f/1m, index 0 unmoved, no `azure` left in `nld`.
2. **`voices.notes`** for the four voices — the stored notes said "NOT in the live pool" /
   "NOT YET REMOVED", which is now false. Appended a dated correction to each. No other column
   touched.

**Appended, not inserted at index 0, deliberately.** `tools/pod-sync.cjs` casts from index 0 only
(`POD_VOICES_PER_GENDER` defaults to 1), so index 0 *is* the cast. T-21 locked Dutch to **Bas +
Lieke** and that lock is untouched: this pass changed pool *membership*, not the cast. Seating Femke
and Ruben at index 0 would be a new cast with a re-render consequence — that is Tom's call, and it is
not what "Femke is good enough" was asked about. Flagged below.

## Verification, from the live DB after each step

- `loadVoicePools()` re-read after the write returns the table above.
- `poolKeysForCourse()` for `nld_for_eng` (its `voice_pool_key` is NULL) → `{target:"nld", known:"eng"}`.
- `resolveCast(['Anna (F)','Jan (M)'], 'nld', 'eng', livePools)` → Anna → **Lieke** (xai `cdb1cec8`),
  Jan → **Bas** (xai `18245f0d`), `_default` → Bas. Identical before and after — the locked cast
  survived the recast, which is the point of appending.
- Removal was dry-run in memory first (filter Azure, re-resolve) before being written: no empty
  gender list, so no `No target voice available` hard-fail at `pod-sync.cjs:452`.
- All 48 language keys in the pool store still non-empty; nothing outside `nld` was written.
- `nld_for_eng` is the only course resolving to the `nld` pool. No course carries
  `voice_pool_key = 'nld'`, so the `voice_pool_key` refusal path at `pod-sync.cjs:302` cannot fire.
- `pod_voice_approvals` has **no `nld` row** (T-21 deliberately declined to record one behind the
  #800 render hold), so there is no `cast_fingerprint` to invalidate.

No blocker was found, so the removal proceeded. Nothing was deleted beyond the two pool entries: the
4,798 Fenna clips and 4,787 Maarten clips in `nld_for_eng` are untouched, and no render was run.

## What was NOT touched, and why

- **Thijs `a13662ba951c`** — passed A-133 perfectly, but T-21 rejected him the same day. That
  contradiction is unresolved, so he stays out.
- **Noor `247783ebdd51`** — held UNDER REVIEW (fails p1/p3, pending the click diagnosis). Not in the
  pool before, not added, not rejected. Untouched.
- **The A-131 clip** `nld_for_eng` pod-0 `SC08-S004` (`7e08e470-…`) — Tom's original take stays. A
  pool edit cannot reach it; nothing was relinked.
- **The #800 end-click render hold on Dutch** — still in force. This pass rendered nothing.

## Two things for Tom, one line each

1. **`courses.voice_config` for `nld_for_eng` still has `target1 = Fenna` and `target2 = Maarten`** —
   the exact Azure pair he called unusable. That is the *course* audio config, a different store from
   the pod pool, and changing it means re-rendering ~9,585 Dutch clips, so it is left as-is and
   flagged rather than changed.
2. **Who sits at index 0?** Dutch currently casts Bas + Lieke (T-21 lock). If "Femke is good enough"
   meant she should be the Dutch female *voice* rather than merely pool-eligible, that is a one-line
   reorder — say the word and it moves.
