# Pod 1 fleet — full-coverage audio fidelity gate, 2026-08-24

Answers Tom's 2026-08-24 11:19Z ruling, item 3: a permanent, committed verification mechanism
proving EVERY phrase in every pod-1 course actually plays as expected — whole-turn and split, on
both language tracks — through the real serving path. Full coverage, not samples.

**Repair status first** (ruling items 1-2): both were already complete before this ruling reached
me — confirmed by a fresh dry-run against all 22 courses (including isl/hrv/jpn/hin, named in the
stale warning that prompted the ruling) showing zero rows needing repair, and now independently
re-confirmed by the gate below at full coverage. No repair work was re-run; nothing needed it.

## The tool

`tools/pods/verify-pod-audio-fidelity.cjs <course_code> [--json-out <path>] [--concurrency N]` —
committed, permanent, reusable. Run it after any future pod flip, recast, or repair; it is now the
standing release gate for pod work, not a one-off script for this incident.

For every row of every course, for every audio-bearing column, it checks:

1. **resolves** — a `course_audio` row exists for the id (no dangling reference).
2. **text** — DB-level: `course_audio.text` normalizes-matches the row's own text for that side.
3. **cast** — DB-level: the clip's voice (both `xai_`/`azure_` prefixes stripped, per the fix found
   during the repair pass) is one of the pod's declared two-character cast for that side.
4. **served** — a live 1-byte `Range` GET through the **real production learner proxy**
   (`https://saysomethingin.app/api/audio/<id>`) returns 2xx with a non-zero total length. This is
   the "through the real serving path" requirement — it exercises the actual proxy → entitlement →
   S3 chain a learner's device uses, not a DB join. A clip that resolves in the DB but fails here
   would be the "genuinely missing" case for Tom's Popty trigger — none were found (see below).

**Scope decisions, made explicit rather than silently applied:**
- `target_audio_id` / `known_audio_id` (whole-turn) and `sentence_audio_ids` /
  `sentence_known_audio_ids` (split — where the fleet defect actually lived) get the full
  resolves+text+cast+served check, exactly as ruled.
- `takeg_audio_ids` (per-atom "take again" clips) get resolves+served+cast, but text is a
  **contained-in** check, not full-match — they are sub-sentence fragments by design.
- `explainer_audio_id` (construction-explainer narration, text = `explainer_text`, not
  target/known) and `note_audio_id` (no paired text column exists in the schema at all) get
  **resolves+served only** — no cast check, because they are voiced from a separate narrator pool,
  not the two-character dialogue cast. Enforcing the two-voice cast on these produced exactly the 34
  false "off-cast" flags noted as a still-open item in the prior repair report; scoring them as gate
  failures here would misrepresent a different, already-known, already-out-of-scope item as a new
  fidelity defect. They are still fetched and reported — just not scored.

## Result: 22/22 courses run at full coverage

**15,143 checks, 15,038 unique clips, fetched live through the production URL. 20/22 courses:
REPAIRED+VERIFIED, zero scored failures. Zero dangling references, zero unserved clips, anywhere in
the fleet** — nothing to list for Tom's Popty trigger.

| course | checks | unique clips | verdict | failures |
|---|---:|---:|---|---|
| ara_eg_for_eng | 674 | 671 | REPAIRED+VERIFIED | 0 |
| ara_for_eng | 489 | 489 | REPAIRED+VERIFIED | 0 |
| deu_at_for_eng | 462 | 462 | REPAIRED+VERIFIED | 0 |
| deu_for_eng | 547 | 545 | REPAIRED+VERIFIED | 0 |
| eus_for_eng | 799 | 790 | REPAIRED+VERIFIED | 0 |
| fra_ca_for_eng | 654 | 649 | REPAIRED+VERIFIED | 0 |
| fra_for_eng | 655 | 653 | REPAIRED+VERIFIED | 0 |
| gle_for_eng | 808 | 799 | REPAIRED+VERIFIED | 0 |
| hin_for_eng | 769 | 756 | REPAIRED+VERIFIED | 0 |
| hrv_for_eng | 734 | 716 | REPAIRED+VERIFIED | 0 |
| isl_for_eng | 701 | 697 | REPAIRED+VERIFIED | 0 |
| **ita_for_eng** | 764 | 760 | **REPAIRED+VERIFIED** | 0 — confirmed passing the NEW gate too |
| jpn_for_eng | 712 | 710 | REPAIRED+VERIFIED | 0 |
| kor_for_eng | 809 | 804 | REPAIRED+VERIFIED | 0 |
| nld_for_eng | 675 | 671 | REPAIRED+VERIFIED | 0 |
| por_br_for_eng | 688 | 687 | REPAIRED+VERIFIED | 0 |
| por_for_eng | 777 | 772 | REPAIRED+VERIFIED | 0 |
| ron_for_eng | 815 | 804 | REPAIRED+VERIFIED | 0 |
| spa_for_eng | 746 | 742 | **FAILED** | 6 (text-mismatch) |
| spa_mx_for_eng | 613 | 612 | **FAILED** | 4 (text-mismatch) |
| swe_for_eng | 478 | 478 | REPAIRED+VERIFIED | 0 |
| zho_for_eng | 774 | 771 | REPAIRED+VERIFIED | 0 |

Full per-check JSON for every course: `docs/pods/audio-fidelity-gate-2026-08-24/<course>.json`.

## The 2 failures — not new, already escalated, held for Tom's render trigger

`spa_for_eng` (`s16/2`, `s19/2`, `s22/1`, `s22/5`, `s22/9`, `s22/11`) and `spa_mx_for_eng` (`s22/1`,
`s22/5`, `s22/9`, `s22/11`) fail on `target_audio_id` text-mismatch only — the same
gender-agreement defect reported in the previous fleet-repair doc (§1b) and independently confirmed
by `docs/pods/spa-pod1-casting-construction-audit-2026-08-24.md`: the rendered clip says the
masculine adjective form ("no estoy **seguro**"), the row's own text says feminine ("no estoy
**segura**") — the deliberate reading, per the Mexican course's own scenes 153/186 already using it
correctly elsewhere. **These are audio re-renders, not repairable by this tool or the split-array
repair tool — both only ever null/re-point existing clips, never generate.** Per the standing rule,
no audio was generated here; these 10 rows are the concrete re-render list for Tom's Popty trigger.
Everything else on both courses (740 and 608 other checks respectively) is clean.

## Gaps

- The `served` check uses a 1-byte `Range` GET, not a full download — it proves the id resolves
  end-to-end through the real proxy (S3 key valid, entitlement clears, bytes exist) but does not
  independently re-verify clip *content* against text the way the earlier byte/F0 census did for 5
  courses. Content correctness here rests on the DB-level `text`/`cast` checks (proven trustworthy:
  the entire original defect and this run's 10 real failures were both caught by exactly that
  layer) plus the fact that `course_audio.s3_key` is the single join every serving path uses — a
  swapped-file-same-row defect (right DB row, wrong bytes at that S3 key) would not be caught by
  this gate. No evidence such a defect exists; not independently ruled out at full-fleet scale.
- `note_audio_id` has no paired text column anywhere in the schema — its content can only ever be
  resolves+served checked, never text-verified, by any tool, not just this one.
- Entitlement: no 403s were observed anywhere in 15,038 fetches, consistent with pod audio having
  no `lego_id` (the entitlement gate keys on premium-seed progress, which pod rows don't carry) —
  not an assumption, an empirical result of this run.

## Landing line

Branch: `fix/ita-pod1-scene15-rootcause-2026-08-24`. This document, the gate tool
(`tools/pods/verify-pod-audio-fidelity.cjs`), and all 22 per-course JSON reports are committed here
and pushed to origin. **Not merged to `main`** — branch pushed only. **No deploy step required** —
the gate is a read-only verification tool; nothing it does changes what's live. The two remaining
failures (spa/spa_mx gender-agreement) need an audio re-render, which needs Tom's trigger — not
part of this landing.
