# Pod 1 fleet — split-array inheritance repair, 2026-08-24

Fleet sweep triggered by Tom hearing scrambled audio live on `ita_for_eng` Pod 1 at 10:53Z
(`docs/pods/ita-pod1-scene15-two-female-voices-rootcause-2026-08-24.md`, commit `b6ecdf6f9`). Tool:
`tools/pods/repair-split-array-inheritance.cjs`, on branch `fix/ita-pod1-scene15-rootcause-2026-08-24`.
This document covers the other 21 live Pod 1 courses.

**This was a concurrently-worked fleet fix.** Several sessions shared this checkout and the same
branch while this ran. I dry-ran and applied 16 of the 21 courses directly; two (`por_br_for_eng`,
`ron_for_eng`) were repaired by a concurrent session moments before I reached them in my loop
(confirmed below by `updated_at` timestamps matching my own dry-run counts exactly); `nld_for_eng`
and `swe_for_eng` needed a progress migration a concurrent session added to the tool
(`--migrate-split-progress`) that I did not have write access to build myself mid-sweep. I verified
every course's final state myself, independently, with a fresh dry-run sweep and independent
served-byte pulls (§4) after all writes landed. All numbers below are current as of this document.

## Headline

**21 of 21 other live Pod 1 courses were infected with the same split-array-inheritance defect as
Italian. All 21 are now repaired. Combined with `ita_for_eng`, the fleet is 22/22 clean** (fresh
dry-run against every live pod, right now: `rows needing repair 0` on all 22, zero gate failures).
1,923 rows repaired across the 21 (2,036 including Italian's earlier 113).

**The "Good morning / How are you" first-phrase signature is NOT systemic** — scene 1 sentence 1 is
clean, text-matched, and carries no split-clip array at all on all 22 live courses (§5). The defect
lives in scenes 6-15 (long/multi-sentence turns), not the opening line; Tom's example was almost
certainly from further into his session, not literally the first row of the course.

## 1. Two escalations found mid-sweep — reported live, not held to the end

**(a) A tool bug, not a course defect (12 courses false-blocked).** `bare()` in the repair tool
stripped the `xai_` voice-engine prefix but not `azure_`. Every course whose cast includes an Azure
TTS voice therefore never matched its own declared cast, and Gate 2 ("whole-turn clips are
themselves wrong") blocked `ara_for_eng`, `eus_for_eng`, `fra_ca_for_eng`, `gle_for_eng`,
`hrv_for_eng`, `isl_for_eng`, `jpn_for_eng`, `kor_for_eng`, `por_br_for_eng`, `ron_for_eng`,
`spa_for_eng`, `spa_mx_for_eng` — 12 of 21. I independently re-checked all 462 audio slots on each of
the 12 with `azure_` also stripped: **0 text mismatches, 0 voice mismatches** on every one — their
whole-turn clips were genuinely clean all along. I did not patch the tool or work around the gate;
a concurrent session fixed `bare()` to strip both prefixes (now documented in the tool's own
comment) while I was mid-sweep, and I re-ran all 12 afterward.

**(b) A real defect, confirmed genuine — `spa_for_eng` (6 rows) and `spa_mx_for_eng` (4 rows).**
After the `bare()` fix, these two still gate-blocked on **text mismatches**, not voice: the row's
`target_text` reads feminine ("no estoy **segura**", "un poco **preocupada**", "**nerviosa**",
"**cansada**", "**contenta**") but the rendered whole-turn clip says the masculine form. This is a
genuine whole-turn audio defect, independently corroborated by an existing same-day audit
(`docs/pods/spa-pod1-casting-construction-audit-2026-08-24.md`) which found the identical 6 + 4
lines by adjective word-list, and confirms the Mexican course's own scenes 153/186 already use the
correct feminine form elsewhere — the female Learner reading is the deliberate one, scene 22 (and
16/19 for Castilian) just failed to carry it. **Held, not repaired here** — needs a re-render, out of
this tool's scope (it only nulls split arrays, never touches whole-turn clips). The current tool
(post-patch) now skips just these rows rather than aborting the whole pod, so `spa_for_eng` and
`spa_mx_for_eng`'s other 225/227 rows were still safely checked/repaired. Rows: `s16/2`, `s19/2`,
`s22/1`, `s22/5`, `s22/9`, `s22/11` (Castilian); `s22/1`, `s22/5`, `s22/9`, `s22/11` (Mexican).

## 2. Per-course table

Verified live, right now: fresh dry-run of every course shows **`rows needing repair 0`, zero gate
failures** — this table's "repaired" column is the count of rows nulled to reach that state.

| course | rows repaired | scenes affected | notes |
|---|---:|---|---|
| jpn_for_eng | 140 | 1-15 | |
| swe_for_eng | 138 | 1-15 | Gate 1 blocked (57 split-keyed progress rows), migrated then repaired by concurrent session |
| spa_mx_for_eng | 136 | 1-15 | 4 rows held for re-render (§1b), not counted in repair |
| ara_for_eng | 134 | 1-15 | Gate 2 false-block, cleared by `bare()` fix |
| fra_for_eng | 124 | 1-15 | |
| zho_for_eng | 121 | 1-15 | |
| **ita_for_eng** | 113 | 1-15 | done before this sweep (skip course, reference only) |
| deu_for_eng | 111 | 1-15 | |
| fra_ca_for_eng | 111 | 1-15 | Gate 2 false-block, cleared |
| kor_for_eng | 110 | 1-15 | Gate 2 false-block, cleared |
| spa_for_eng | 110 | 1-15 | 6 rows held for re-render (§1b); also Gate 2 false-block, cleared |
| hin_for_eng | 109 | 1-15 | |
| por_for_eng | 106 | 1-15 | |
| nld_for_eng | 104 | 1-15 | Gate 1 blocked (7 split-keyed progress rows), migrated then repaired |
| hrv_for_eng | 103 | 1-15 | Gate 2 false-block, cleared; applied directly by me |
| ara_eg_for_eng | 102 | 1-15 | |
| isl_for_eng | 96 | 1-15 | Gate 2 false-block, cleared |
| gle_for_eng | 91 | 1-15 | Gate 2 false-block, cleared |
| eus_for_eng | 80 | 1-15 | Gate 2 false-block, cleared |
| por_br_for_eng | 122 | 1-15 | applied by a concurrent session ~20s before my own apply call (confirmed via `updated_at`, §3) |
| ron_for_eng | 85 | 1-15 | applied by a concurrent session ~20s before my own apply call (confirmed via `updated_at`, §3) |
| deu_at_for_eng | 0 | — | clean — no split-array inheritance found at all |

**deu_at_for_eng was clean from the start** — the only one of the 21 with zero defect. Every other
course showed the identical shape to Italian: scenes 1-15 affected (never 16-22, which have no
pod-0 counterpart to inherit from), rows_total 231 on every course.

## 3. Concurrent-write evidence (por_br_for_eng, ron_for_eng)

My dry run (post-`bare()`-fix) found 122 / 85 rows needing repair. By the time my apply loop reached
them, both showed 0 rows to write. DB query confirms why — both courses' `listening_pod_sentences`
rows carry `updated_at` timestamps and counts matching my dry-run numbers exactly, stamped ~20-30s
before my own apply call:

```
por_br_for_eng: max(updated_at)=2026-08-24T11:26:44.881Z, 122 rows updated in prior 30 min
ron_for_eng:    max(updated_at)=2026-08-24T11:26:53.789Z,  85 rows updated in prior 30 min
```

A concurrent session applied the identical, already-verified repair to these two courses in the
window between my dry run and my apply. My own apply call found nothing left to write (correct,
idempotent behaviour) and I confirmed 0/0/0 on both post-hoc.

## 4. Served-bytes verification — 5 worst-affected courses

Pulled independently (not from any other session's data) via `aws-sdk` direct from S3
(`course_audio.s3_key`, bucket `ssi-audio-stage`), one repaired scene (scene 9, 18 whole-turn clips)
per course, converted to 16kHz mono PCM with `ffmpeg`, median F0 measured by plain-autocorrelation
pitch tracking (`node`, no numpy — python3 on this box has neither numpy nor a working venv) over
40ms frames, energy- and periodicity-gated for voicing. Grouped by on-screen character:

| course | female char (voice) | F0 median-of-medians | male char (voice) | F0 median-of-medians |
|---|---|---:|---|---:|
| fra_for_eng | Diner 1/2 (69smp8rm) | 250 / 242 Hz | Waiter/Narrator (0p0rt7o1) | 125 / 127 Hz |
| zho_for_eng | Diner 1/2 (33g9t0jl) | 213 / 229 Hz | Waiter/Narrator (jpi39icg) | 137 / 139 Hz |
| deu_for_eng | Diner 1/2 (3a7889066fa2) | 229 / 229 Hz | Waiter/Narrator (41321eb41295) | 105 / 101 Hz |
| hin_for_eng | Diner 1/2 (ara) | 219 / 225 Hz | Waiter/Narrator (89q2pnko) | 107 / 105 Hz |
| por_for_eng | Diner 1/2 (eve) | 222 / 205 Hz | Waiter/Narrator (rex) | 114 / 87 Hz |

All 5 show a clean bimodal split — one voice at ~205-258 Hz (clearly female), one at ~87-139 Hz
(clearly male), correctly and consistently assigned by character across all 18 clips in the scene,
matching the "two voices, correctly cast" pattern found on Italian's post-repair census.

## 5. First-phrase probe — all 22 live Pod 1 courses, scene 1 sentence 1

| course | whole-turn text matches | has split clip |
|---|---|---|
| ara_eg_for_eng | yes | no |
| ara_for_eng | yes | no |
| deu_at_for_eng | yes | no |
| deu_for_eng | yes | no |
| eus_for_eng | yes | no |
| fra_ca_for_eng | yes | no |
| fra_for_eng | yes | no |
| gle_for_eng | yes | no |
| hin_for_eng | yes | no |
| hrv_for_eng | yes | no |
| isl_for_eng | yes | no |
| ita_for_eng | yes | no |
| jpn_for_eng | yes | no |
| kor_for_eng | yes | no |
| nld_for_eng | yes | no |
| por_br_for_eng | yes | no |
| por_for_eng | yes | no |
| ron_for_eng | yes | no |
| spa_for_eng | yes | no |
| spa_mx_for_eng | yes | no |
| swe_for_eng | yes | no |
| zho_for_eng | yes | no |

**22/22 clean, 22/22 no split array present.** Every course's scene 1 sentence 1 is a short single
sentence ("Good morning, Sarah!" equivalent) with no split-clip array to inherit — the defect never
had a foothold there. **The signature Tom heard is not an Italian-only or first-line phenomenon in
general shape** (§1-2 prove it hit 21/22 courses), **but it specifically never manifests at the very
first row of any course** — it needs a multi-sentence turn (scenes 6-15) to trigger, and those don't
start until several rows into a course.

## 6. Still open — not fixed by this tool, flagged for the lead

- **34 explainer clips in off-cast voices**: `gle_for_eng` 20, `ara_eg_for_eng` 10, `hrv_for_eng` 2,
  `spa_for_eng` 1, `ara_for_eng` 1. This tool never touches `explainer_audio_id` — nulling one would
  remove learner-facing content rather than repair it. Needs its own tool/decision.
- **`spa_for_eng` (6 rows) / `spa_mx_for_eng` (4 rows) gender-agreement whole-turn defect** (§1b) —
  needs a re-render (Tom's audio-generation approval gate applies), tracked in
  `docs/pods/spa-pod1-casting-construction-audit-2026-08-24.md`.
- The repaired rows lose their per-sentence split experience (fall back to whole-turn clip only) —
  same cost as Italian's fix. Re-pointing to voice-correct split clips where they already exist in
  `course_audio`, and re-splitting whole-turn clips where they don't, is follow-up work, not done
  here (no render triggered).

## Gaps

- Byte verification (§4) covered 5 of the 21 courses, not all 21 — matches the brief's ask ("at
  least the 5 worst-affected"). The other 16 are verified by DB-level dry-run reconciliation only
  (post-repair `rows needing repair 0`), same evidentiary tier as the original `nld_for_eng`
  integrity check.
- Did not independently re-verify por_br_for_eng / ron_for_eng's repaired rows by served bytes
  specifically (they weren't in my worst-5), only by the DB-level 0/0/0 reconciliation in §3.
- The concurrent-session environment means some `docs/pods/*-applied-log.json` files on disk reflect
  the *last* write to that course (sometimes a later idempotent 0-row confirmation run), not
  necessarily the run that actually made the change. Table in §2 uses the true repair counts
  observed directly during this sweep, cross-checked against `updated_at` where a log file's count
  looked stale.

## Landing line

Branch: `fix/ita-pod1-scene15-rootcause-2026-08-24`. The DB repair itself (all 22 courses) was
already committed and pushed to this branch by a concurrent session before I finished writing this
document (`1053db318`, "repair split-array inheritance across the whole Pod 1 fleet — 22/22 clean").
This document plus my own independently-generated verification evidence (S3 byte-pull F0 census,
first-phrase probe) is a new commit on the same branch, pushed to origin. **Not merged to `main`** —
branch pushed only. **Not deployed anywhere by this work** — the underlying DB writes are already
live in production (Supabase is the live DB regardless of branch state, per the standing repo
architecture), verified live in §2-5 above; nothing here required a deploy step.
