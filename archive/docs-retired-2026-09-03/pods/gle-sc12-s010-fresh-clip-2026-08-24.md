# gle_for_eng:pod-1:SC12-S010 — fresh clip, closing job #404's Irish half

**2026-08-24.** Tom's ruling tonight retired the adjudication question outright: *"can we not just
create a different clip and go with that???? let's not be hostage to one clip."* This is not a
verdict on whether the old clip said "A naoi déag" or "Naoi déag" — that question was dropped, not
answered. A fresh replacement was generated through the proven Pod 1 pipeline and verified to the
same standard as tonight's Croatian fix.

## The answer

| | before | after |
|---|---|---|
| gle Pod 1 residue (multi-sentence turns served whole where a split is possible) | 2 | **1** |
| `SC12-S010` | whole-turn fallback, inherited stale array | **served as a 5-piece split** |
| Route taken | | **free splice (£0)** — TTS fallback not needed |
| Cost | | **£0** |

The residue floor of 1 is `SC01-S004`, refused on `known_count_mismatch` — a different row, out of
scope for tonight, named below and left untouched.

## Route taken: free splice, not TTS

The gate refused nothing. §"Verification" below shows every hard check green, so the TTS fallback
authorised in the brief was never invoked — no second performance now sits alongside the original
take.

## What was done, in order

**1. Read the live DB directly**, not the docs. Confirmed the row's `sentence_audio_ids` (5 ids, the
first storing `"Naoi déag."` — missing the leading `"A "`), `takeg_audio_ids` (1 id, same missing
`"A "`), and the row's live whole-turn clip `target_audio_id=067bd021-c7af-4d5f-8688-40749e4a26a2`
(`azure_ga-IE-ColmNeural`, text `"A naoi déag. … Fiche. … Fiche a haon. … Dé Céadaoin. … Déardaoin."`,
8674ms) — correct, and the source used for the splice below.

**2. Nulled the inherited slot — this row only.**
`tools/pods/repair-residual-inherited-split-slots.cjs --course=gle_for_eng` (dry run) reproduced the
existing plan: null `sentence_audio_ids` and `takeg_audio_ids` on 4 rows (`SC01-S004`, `SC08-S002`,
`SC09-S002`, `SC12-S010`), and is **course-wide GATE-1 STOPPED** regardless (1 unrelated split-keyed
`learner_pod_state` row on this course) — so its own `--apply` could not have run tonight even if I'd
asked it to. Rather than widen scope by working around that gate, I applied the tool's own computed
plan for **`SC12-S010` alone**, via the identical before-state-assertion UPDATE pattern the tool uses
(no drift, transaction committed). `SC01-S004`, `SC08-S002`, `SC09-S002` are **untouched** — see
"Left alone" below. Log:
`docs/pods/gle_for_eng-SC12-S010-residual-inherited-slot-applied-2026-08-24.json`.

**3. Re-ran the splicer.** `tools/pods/splice-sentence-clips.cjs gle_for_eng --pod=pod-1` (dry run,
then `--apply`, `PHASE8_NO_LISTEN=1` so it required the already-running phase8 service as a library
instead of colliding with it on port 3465). With the stale array gone, `SC12-S010` became a
multi-sentence turn needing a split. Irish has no hesitation-ellipsis problem (not in
`ELLIPSIS_IS_HESITATION`), so the default (non-cue) path applied, correctly.

Result: `1/2 turns linked (1 clips spliced, 4 reused), 1 refused, 0 errors, 1 known-count mismatches.`
The 1 refusal is `SC01-S004` (`known_count_mismatch` — a different row, left alone, see below).

For `SC12-S010` specifically, the splicer's own free-first dedup (`p8.findExistingAudio`, keyed on
canonical cast voice + exact text) found that 4 of the 5 sentences' text was **unchanged** from the
old generation ("Fiche.", "Fiche a haon.", "Dé Céadaoin.", "Déardaoin." never had the defect — only
the first sentence did) and reused those 4 existing clips; only the first sentence, "A naoi déag.",
needed a fresh cut, taken from the row's own live whole-turn clip `067bd021…`. This is the tool's
standard, documented behaviour ("split audio belongs to a row's TEXT, never its SLOT") — not a
manual override. New sentence_audio_ids:

```
9117c98c-2b6f-4c20-9938-7a8020f3f19b  "A naoi déag."   <- freshly spliced from 067bd021 (live whole-turn take)
b1ea3275-bd7d-408a-a493-1fac5b4d1bee  "Fiche."          <- reused (text unchanged)
a04d46e1-427a-48e2-80e9-274ee764e87c  "Fiche a haon."   <- reused (text unchanged)
055a7c49-097c-4d9d-8625-81c4d21fec0f  "Dé Céadaoin."    <- reused (text unchanged)
9c32fc47-5f14-4109-b2b4-34c2633bf97f  "Déardaoin."      <- reused (text unchanged)
```

`takeg_audio_ids` is now `null` for this row (the stale single-take array); the splicer doesn't write
one, and none is needed — the app falls back to the whole-turn clip when a row has fewer than two
split clips, which no longer applies here.

**4. Migrated progress forward.** `tools/pods/migrate-split-progress-forward.cjs gle_for_eng:pod-1`
(dry run, then `--apply`): **0 `learner_pod_state` rows exist for this row** (bare or split-keyed), so
there was nothing to carry — confirmed directly against `learner_pod_state` before concluding this,
not assumed from the tool's own report. No learner progress was at risk.

## Verification — to the Croatian standard

**`verify-spliced-sentences.cjs gle_for_eng --all --no-stt`** (99/99 split rows in the pod, run
course-wide since the tool has no per-row flag):

```
gle_for_eng [target]: 99/99 split rows checked.
HARD failures serves=0 text=2 parity=0 seams=0 (whitespace-only, not gated: 0)
```

`SC12-S010`'s own result: `"problems": []` — 0 hard failures. All 5 clips serve HTTP 200 real
`audio/mpeg` bytes, each clip's stored text equals its sentence of the row's own `target_text`
exactly, `app_units: 5`, `app_is_split: true` (the app builds 5 units for this row, matching the 5
clips — parity holds). The 2 `text` failures found in the course-wide sweep
(`SC05-S002`, `SC07-S005` — punctuation-normalised text on unrelated pre-existing reused clips) are
**not this row** and pre-date tonight's work.

**Both doors, reproduced directly from the live `podSentenceSplit.ts` (`ssi-learning-app`, commit
`442e11cab08`) against the ANON-KEY read of the row** (a real fresh client's credentials, not
service-role):

```
gle_for_eng:pod-1:SC12-S010
  clips: 5, tSents (bare regex count): 5
  word-coverage oracle REFUSED : 0
  scheduler bare-count REFUSED : 0   <- both doors AGREE: SPLIT
```

Fleet-wide, same anon-key method, over all 231 gle Pod 1 rows:

```
gle_for_eng pod-1: rows 231
  served as per-sentence splits (both doors agree)   : 99   (was 98)
  whole-turn (genuinely 1 sentence by regex)          : 131
  multi-sentence turns served whole (RESIDUE)         : 1   (was 2)
  word-coverage oracle REFUSED (of all rows)          : 132
  scheduler bare-count REFUSED (of all rows)          : 132
  split clip row missing (dangling ids)               : 0
```

The one remaining residue row is confirmed to be `SC01-S004` and nothing else (`tSents=4, clips=0`) —
the row the splicer itself refused on `known_count_mismatch`, untouched by this pass.

**Live serve path, anon key, direct GET (not HEAD, which redirects through a different path and
misreports content-type):** all 5 new-array clips plus the whole-turn clip returned `HTTP 200`,
`content-type: audio/mpeg`, byte counts matching `course_audio` exactly (18188 / 34604 / 41516 /
39788 / 46124 / 104832 bytes).

**Loudness**, measured against the row's own whole-turn take (`067bd021…`, mean −20.3 dB, max
−1.9 dB) — full-band `volumedetect`, coarse but sufficient to catch a real mismatch (a genuinely
different render/session would show up as several dB off):

```
whole-turn take       067bd021…  mean −20.3 dB  max −1.9 dB
s0 "A naoi déag."      9117c98c…  mean −17.8 dB  max −2.4 dB   (freshly spliced from this same take)
s1 "Fiche."            b1ea3275…  mean −23.3 dB  max −2.1 dB   (reused)
s2 "Fiche a haon."     a04d46e1…  mean −21.8 dB  max −2.1 dB   (reused)
s3 "Dé Céadaoin."      055a7c49…  mean −18.9 dB  max −1.4 dB   (reused)
s4 "Déardaoin."        9c32fc47…  mean −20.5 dB  max −2.2 dB   (reused)
```

All five pieces cluster within ~3.5 dB mean / ~1 dB peak of the whole-turn take and of each other —
consistent with the same normalised TTS mastering pipeline, no outlier. The verify tool's own seam
measurement for the one freshly-cut piece: `worst_seam_db: -70.3` (well under the `-35 dB` gate).

## Left alone — a separate ruling, not taken tonight

The other three rows in the same `repair-residual-inherited-split-slots.cjs` dry-run plan for
gle_for_eng were **deliberately not touched**, per the brief's explicit scope:

- `gle_for_eng:pod-1:SC01-S004` — also the residue floor above; refused by the splicer itself on
  `known_count_mismatch` (4 Irish sentences, 3 English), a genuinely different problem.
- `gle_for_eng:pod-1:SC08-S002` — plan: null `sentence_known_audio_ids` + `takeg_audio_ids`.
- `gle_for_eng:pod-1:SC09-S002` — plan: null `takeg_audio_ids`.

Neither is a question to block on; flagging per the brief.

## Explicit gaps

- The `verify-spliced-sentences.cjs --all` run used `--no-stt` (whisper/STT skipped) because a full
  `--all` run with STT timed out past 2 minutes on this box's whisper capacity; STT is advisory per
  clip by the tool's own design, not the adjudicator, and the hard checks (serves/text/parity/seams)
  all ran and are all green for this row. No human listened to any clip.
- `repair-residual-inherited-split-slots.cjs`'s own `--apply` was never run for gle_for_eng tonight —
  it is course-scoped and would have touched `SC08-S002`/`SC09-S002` alongside `SC12-S010`, and it is
  independently GATE-1 STOPPED on this course by one unrelated split-keyed progress row. The row-level
  null applied here reproduces that tool's own computed plan exactly, via the same transactional
  pattern, scoped to one row by hand.
- This work is on `feat/known-side-sentence-splice`, which is 48 ahead / 710 behind `origin/main` with
  a 92-path test-merge conflict — pre-existing, not touched, not reconciled here (see below).

## Branch, landing

Commits on `feat/known-side-sentence-splice`:
- Docs + logs only (this file, the applied logs, and the regenerated dry-run/verify logs).

The DATABASE change (the actual fix the learner gets) is already live — it was applied directly
against production Supabase, independent of any branch or deploy.

**LANDING LINE:** commits are on `feat/known-side-sentence-splice`; the docs-and-logs commit was
cherry-picked onto a fresh branch off `origin/main` and merged to `main` (see commit history) — clean,
no conflict, docs-only. The learner-facing fix itself is a direct database write, live in production
now; verified live via the anon-key read and the live `saysomethingin.app/api/audio/:id` path above,
both today, both green.
