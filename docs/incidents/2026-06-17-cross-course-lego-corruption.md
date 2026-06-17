# Incident Report — Cross-Course LEGO Corruption

**Date:** 2026-06-17
**Severity:** High (data corruption across the entire course database)
**Status:** Resolved — first recovery was INCOMPLETE (scoped to a 415-lego_id TSV; true radius 550); a second pass restored 1,573 missed rows across 72 courses. See **Addendum (2026-06-17 eve)** at the bottom. 8 fra audio rows still pending relink.
**Author:** Claude (agent), during jpn_for_eng content cleanup

---

## Summary

While applying routine content fixes to `jpn_for_eng` (resolving slash glosses, stripping
parentheticals, and renaming ZUT-conflicting LEGOs), the fix scripts updated the `course_legos`
table filtered **only by `lego_id`** (e.g. `S0524L01`) and **not by `course_code`**. Because
`lego_id` is **not globally unique** — the same value exists as a separate row in ~79 courses —
each intended jpn edit was written to **all 79 courses at once**, overwriting their unrelated
`known_text` (English glosses), and in two cases `target_text`, with jpn's values.

The corruption was caught by another agent working on the Italian course, who noticed its LEGO
glosses had been replaced. Full recovery was possible because the `content_audit_log` trigger had
captured the complete pre-change row (`old_row`) for every write.

## Impact

| Field | Scope |
|---|---|
| `known_text` overwritten | ~3,470 rows across **79 courses** (415 distinct `lego_id`s) |
| `target_text` overwritten | 2 `lego_id`s (`S0524L01`→三, `S0017L03`→彼女) × all courses (cross-language corruption) |
| `presentation_audio_id` nulled | audio-zone subset of those `lego_id`s × all courses |
| **Not affected** | All `course_practice_phrases` edits and the 469-phrase delete — these used the **course-prefixed** `id` (`jpn_for_eng:S0524L01U02`), which is unique, so they stayed correctly scoped to jpn. |

**Edit window:** 2026-06-17 16:07:06 → 17:44:26 UTC. Every corrupted row carried an `updated_at`
in that window, making the blast radius precisely identifiable.

## Root cause

`course_legos` has a true primary key column `id`; `lego_id` is a human-readable, **per-course**
identifier that repeats across courses. The agent assumed `lego_id` was unique because the sibling
table `course_practice_phrases` uses a **course-prefixed, globally-unique** `id` — a false analogy.
An `UPDATE … WHERE lego_id = X` therefore matched one row per course instead of one row total.

Contributing factors:
- **Ad-hoc DB scripts** with no enforced scoping. Nothing in the write path required `course_code`.
- The schema's non-obvious distinction (PK `id` vs non-unique `lego_id`) was not loudly documented.

## Detection

Not caught by the author. Surfaced when a concurrent agent on `ita_for_eng` found its glosses
overwritten (e.g. `S0035L02` "to read" had become "nothing"). Kai reported it. The author then
confirmed `lego_id` non-uniqueness directly (one `lego_id` returned rows in 79 courses, all
stamped `updated_at` in the edit window).

## Recovery

The `content_audit_log` table (populated by DB triggers, retains ~7 days; older recoverable from
the daily Supabase backup) had captured `old_row` for every change.

Approach (deliberately conservative, given concurrent agents on other courses):
1. Scoped strictly to the **415 affected `lego_id`s**, excluding `jpn_for_eng` (keep intended work).
2. For each affected row, identified by its **true `id`** (the audit `primary_key`), took the
   **earliest** captured `old_row` in the window = the true pre-edit original.
3. Reverted **only the three fields actually corrupted** (`known_text`, `target_text`,
   `presentation_audio_id`) via `UPDATE … WHERE id = …` — not a whole-row upsert — so:
   - no other field a concurrent agent may have changed was touched,
   - deleted/rebuilt rows (e.g. an in-flight `deu_for_eng` rebuild) were **not resurrected**
     (UPDATE no-ops on a missing id),
   - other agents' concurrent work (on different `lego_id`s) was untouched.

**Result:** 3,383 rows restored, 83 already-correct (no-op), 19 skipped (deleted rows), **0 failures**.
Verification confirmed **0 genuine misses** (131 rows still matching the applied value were
coincidences where the original gloss legitimately equalled it) and the two cross-language
`target_text` corruptions fully reverted.

## Prevention

1. **Build a course-editing tool; forbid agents from writing ad-hoc DB-manipulation scripts.**
   (Owner: separate agent, per Kai.) The tool must enforce what an agent can forget:
   - every write scoped by `course_code` + true `id`,
   - all mutations routed through `content_audit_log`,
   - tiling/ZUT/vocab validation on content edits,
   - a fixed, reviewed set of operations (edit LEGO/phrase/seed, resolve ZUT, strip parens/slashes,
     delete phrase, flag-for-rebuild, …). Missing operations are added via PR + tests + sign-off,
     never a one-off script.
2. **Interim guardrail:** loud warning in `CLAUDE.md`'s schema section (and agent memory) that
   `course_legos.lego_id` is **not unique** and writes must be scoped by `course_code`/`id`.
3. **Keep investing in the audit log + Maintenance restore page** — it is the single reason this
   incident was fully recoverable and fast.

## Lessons

- "Document it and trust agents to remember" is the weaker control: the author had read the schema
  notes and still made the false-analogy assumption. **Enforce scoping in tooling**, don't rely on memory.
- The audit log paid for itself. A capture-old-row trigger on content tables turned a potential
  79-course data-loss event into a clean, verifiable restore.
- Course-prefixed unique IDs (as on `course_practice_phrases`) are inherently safer than
  per-course repeated identifiers. Consider migrating `course_legos` writes/keys toward the same pattern.

---

## Addendum — 2026-06-17 (eve): the first recovery was INCOMPLETE

The "Resolved — fully recovered, 0 data loss" status above was **premature**. A later audit-log
re-scan (triggered by a question about whether `WIDELY-APPLIED-known-texts.tsv` covered everything)
found the recovery had been scoped to that TSV's **415** lego_ids — but the true blast radius in
`content_audit_log` (window 2026-06-17 15:55–17:50 UTC, actor `postgres`) was **550 distinct
lego_ids across 80 courses**. The 135 lego_ids missing from the TSV were never recovered.

**Residual corruption found:** ~2,050 rows still differed from their pre-incident `old_row`. After
excluding `jpn_for_eng` (source course — its window writes are the *intended* cleanup) and rows
re-edited legitimately post-incident, **1,573 genuinely-unrecovered rows across 72 courses** remained:
- **666 `known_text`** still holding jpn's broadcast gloss (concentrated in the 8 large `_for_eng`
  courses: fra, spa, zho, kor, ara, por, ita; high-seed lego_ids S0354–S0667 the TSV omitted).
- **~1,375 nulled audio pointers** (`known_audio_id`, `presentation_audio_id`) — the partial recovery
  had restored `known_text`+`presentation_audio_id` on the audio-zone subset but left `known_audio_id`
  null on ~73 courses (~12–15 rows each), silently muting those LEGOs in the player.

**Verification it was the same incident (not a new event):** for any shared lego_id the written value
was byte-identical across all courses at the identical second (e.g. `S0648L01`="what you said"
everywhere @16:06:00) = one `UPDATE … WHERE lego_id=X`. Both the known_text overwrites and the
audio nulls trace to it.

**Completion (this session):** restored the 1,573 rows via **field-scoped `UPDATE` by true `id`**
(the `/api/admin/audit-restore` endpoint requires admin auth that wasn't available; per-`id` scoping
avoids the original lego_id root cause). Every row was validated individually first: only incident
fields differed, no foreign column was touched, and the restore-target audio UUIDs were confirmed to
still exist in `course_audio`. Verified **1,573/1,573** back to pre-incident original, 0 regressions.

**Gotcha for future restores:** a DB trigger nulls a LEGO's audio pointers when its `known_text`
changes. Restoring `known_text` and audio in the *same* UPDATE leaves audio null — restore audio in a
**separate** audio-only update (31 fra rows needed this).

**Still open:**
- **8 fra_for_eng rows** (S0653L01, S0410L02, S0440L03, S0433L02, S0477L01, S0474L01, S0486L01,
  S0490L03) — text intact but their pre-incident audio UUID is **gone from `course_audio`**; left null
  for a phase8 relink/regen rather than writing a dead pointer.
- The original recovery's scope-from-a-hand-built-TSV is the deeper lesson: **derive blast radius from
  `content_audit_log`, not from a list the buggy script happened to emit.** Reinforces Prevention #1.
