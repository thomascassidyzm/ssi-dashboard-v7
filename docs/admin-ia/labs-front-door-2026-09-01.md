# The lab front door, and a tree that says what each lab reaches

*2026-09-01. Branch `feat/admin-labs-blast-radius`, off `origin/main` at `ed5afe481`.*

## The complaint, and the data under it

Tom: *"there is no front door to the script lab. This page isn't findable from
admin/configs. I wonder if admin/configs/labs is a bit much — maybe we should just have it
as admin/labs? we have 7 labs now."*

`canonical_script_versions` holds exactly six rows, all on the sacked slate `pod-0.5`, all
saved between 10:54:25 and 10:55:28 on 2026-08-31 — four rewrites of one line and then a
revert. He reached the lab through the one door that existed, edited the first script it
offered, discovered it was a sacked slate, and put it back inside 63 seconds. Arriving at a
lab sideways means arriving without knowing what you have walked into.

## What the tree was saying

`/admin/configs` claimed everything beneath it *"applies across every course and every
learner"*.

- **Basket Lab** is mounted `readOnly: true` (`services/production-api.cjs:176`) and cannot
  write a byte.
- **Capture A/B** stores nothing and had **no link anywhere in `src/`** — a genuine orphan.
- **Script Lab** could be reached only from inside `/courses` or `/canonical/*`.

Wrong in both directions, and silent about two labs entirely.

## Why blast radius is the axis

The codebase already argued for it. Three separate files — `PodLab.vue`, `VoiceLab.vue`
and `voicelab/ExperimentsPanel.vue` — carry the **same verbatim sentence** refusing to
write config:

> `algorithm_config` writes are immediately global to every learner (~5-min cache TTL, no
> draft/env split), so this Lab never writes config.

Three labs hand-routing around a distinction the information architecture did not carry.
It carries it now, in `src/components/admin/blastRadius.js` — written down **once**, read
by both the index tile and the on-page banner, so the label you chose the lab by is the
label still standing over the controls when you get there.

## The classification, with the write each one rests on

| Lab | Tier | Classified on |
|---|---|---|
| Listening Lab | **LIVE NOW** | `PATCH /api/algorithm-config` via `useAlgorithmConfig` |
| Speaking Lab | **LIVE NOW** | `PATCH /api/algorithm-config` via `useAlgorithmConfig` |
| Voice Lab | **LIVE AT NEXT GENERATION** | `POST /api/voices/declare` — locks a course side to a voice as versioned `algorithm_config`; no audio touched until the next render |
| Pod Lab | **LIVE AT NEXT GENERATION** | `POST /api/pod-cast-voices`; `POST /api/admin/pods/:course/generate-audio` (sample fill, real spend). Never `algorithm_config`. |
| Script Lab | **LIVE AT NEXT GENERATION** | a versioned canonical script save — changes the English master every course flexes from, and changes no generated pod until re-translation |
| VAD Lab | **NOTHING** | analysis POSTs to the recorder API only |
| Basket Lab | **NOTHING** | nothing — mounted `readOnly: true` |
| Capture A/B | **NOTHING** | nothing — records in the browser, prints numbers, uploads nothing |

**Two placements are not where feel would put them**, and they are the entire point of the
middle tier — a deferred change looks safe at the moment you make it and lands long after
you have forgotten making it.

*Pod Lab* says truthfully that it never writes `algorithm_config`, and also casts voices
and can fill missing clips, which is real spend and real audio. Filing it under NOTHING
would have reproduced the exact misdescription this work exists to remove.

*Script Lab* edits the language-neutral English masters and regenerates nothing, so the
change is **owed** to every course rather than applied to it. That is the most deferred
write in the estate — and it is also the distinction the canonical seed and a course's
known text turn on: one canonical set, identical by definition; a course's known English
derived and legitimately differentiated per pair. Editing the canonical does not
propagate. The Script Lab tile says so in its description.

Each tile prints the write it was classified on, so a placement is checkable rather than
merely asserted.

## What changed

1. **`/admin/labs`** — an index and eight surfaces under it. Route *names* unchanged, so
   `router.push({ name })` and the playwright specs keep working. Every old path
   redirects; the table is its own module (`src/router/legacyLabRedirects.js`) because a
   moved path with no redirect is a 404 that surfaces when someone clicks an old link.
2. **The index lists every lab**, Script Lab and Capture A/B included, each tile carrying
   its blast-radius label and its evidence line.
3. **Front doors**: a Labs card on Home, the Admin hub's Configs card becomes Labs, and
   the admin sub-tab is Labs. `/home` and `/admin` both reach it now, not only `/courses`
   and `/canonical/*`.
4. **Both misdescriptions fixed**: Basket Lab no longer sits under a heading promising a
   reach it does not have, and says NOTHING on its own page. Voice Lab gains the deferred
   banner it lacked — until now that fact lived only in a source comment while the visible
   chip said *"writes no course audio"*.

## Verified

- **Driver run**, headless Chromium against `vite dev` on this box: logged in as the
  seeded admin, loaded `/`, **clicked the Labs card** (not a typed URL), landed on
  `/admin/labs`, asserted eight tiles and the three section labels in order, loaded
  `/admin`, followed `/admin/configs` → `/admin/labs` and `/admin/configs/voice` →
  `/admin/labs/voice`, asserted the Voice Lab banner reads LIVE AT NEXT GENERATION and the
  Basket Lab banner reads NOTHING, and re-shot the index at 430px. Six screenshots taken
  and read; one real defect found that way — the banner's two sentences ran together
  because Vue trims whitespace inside a `<template>` tag — fixed and re-shot.
- **Specs**: 10 new, all green (`src/views/admin/LabsIndex.test.js`).
- **Suite**: 3186/3191 passed. The 5 failures and 1 error are **identical on untouched
  `origin/main`**, verified by running the same six files in a baseline worktree:
  autocue session-review-chunks, LearningJourneyAudioFlags, and four `tools/*` scripts.
  None are files this work touched.
- **Build**: `vite build` clean.

## Not verified, and why

- **Not deployed.** Nothing is merged to `main`, so nothing has reached any machine. The
  driver ran against a dev server on this box, which dies with the session that started it.
- **Lint baseline: this repo has none.** Popty has no eslint config and no `lint` script.
  The 155-warning baseline belongs to **ssi-learning-app** (`eslint.config.mjs`,
  `"lint": "pnpm -r lint"`), which this work does not touch. There was no number to hold,
  so none is reported.

## Deliberately not touched

The Script Lab's sacked-slate marking, `canonical_pod_scenarios`, `listening_pods`,
`canonical_script_versions`, any pod slug, the ingest tool, and the `source_text` column
rename. No file under `src/views/ScriptLab*.vue` was modified — the Script Lab gains its
front door and its label entirely from the index page.
