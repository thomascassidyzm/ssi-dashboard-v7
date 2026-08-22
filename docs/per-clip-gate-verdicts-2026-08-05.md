# Per-clip gate verdicts — the audio preview page now states a measurement

**2026-08-05.** Follow-on from the gate audit. The page used to work out whether a clip had been
quality-checked by looking at how old it was. It now reads a verdict the renderer wrote onto the
clip.

---

## 1. What was wrong

`docs/gate-bypass-audit-2026-08-05.md` measured the old label: of the **1,413 clips** the page
called "rendered under the gate", **zero** had been through the gate. The label was false for 100%
of the rows it selected.

A date can never fix that, because two different things share one timestamp:

- a clip the gate checked and passed, and
- a clip the gate **could not** check and published anyway.

The gate has always carried an explicit `unchecked` outcome precisely because those are not the
same claim. Nothing persisted it, so the page had nothing to read and reached for `created_at`
instead.

## 2. What is true now

Every clip carries its own verdict, written by the code that rendered it. Three states, and the
third is the point:

| badge | means |
|---|---|
| **checked · passed** | a machine transcribed the clip without being shown the script, and the words matched |
| **checked · FAILED** | it was checked, it failed, and the row exists anyway. Impossible on the gated path — shown loudly, never hidden |
| **unchecked** | no check ever ran on it, **or** the checker ran and could not examine it. Never a pass |

Clips the gate checked and **withheld** are not in the clip table at all — that is what withholding
means — so they come from the quarantine ledger and appear in their own block on the same page. A
surface that could only show what published would report "no problems" by construction.

The tabs are now verdict lookups: **Checked and passed** / **Not confirmed passed** / Recently
rendered / All. "Not confirmed passed" is deliberately defined as everything that is *not* a pass,
so a failure cannot hide in a tab nobody opens.

## 3. What the page says today, live

Verified on watson-1 at 14:56 UTC:

| course | checked and passed | not confirmed passed |
|---|---:|---:|
| `fra_for_eng` | **0** | **49,348** |
| `deu_for_eng` | **0** | **47,266** |

**That zero is the honest answer, not a fault.** Verdicts are recorded from the render that
produces them, and nothing is backfilled — a clip is never given a verdict it did not earn. The
number climbs as audio is generated from now on. The page says exactly this where the list would
otherwise look empty.

## 4. The thing the audit could not see

The audit concluded no production render had gone through the gate because nothing routed one
through it. The deeper reason, found while building this: **the gate had never been merged to
`main` at all.** `services/audio-veracity.cjs` and its phase8 wiring lived only on
`feat/audio-veracity-gate-2026-08-04` and branches downstream of it. The deployed service had no
gate module on disk. It could not have run.

It is merged now, which is the standing ruling ("gate ON everywhere, all courses") finally being
true of the running code rather than of a branch. Whisper and the model are present and configured
on the box; the gate announces itself loudly at start-up either way.

## 5. What a pass does and does not cover

Unchanged, and stated on the page itself: the check is validated on **silence and truncation
only**. It says nothing about pronunciation, and nothing about a tail clipped by less than ~300 ms.
Ears remain the check for how a clip sounds. A green badge is a floor, not a verdict on quality.

## 6. Two things the live run taught that no test would have

Both are recorded in the migrations, because both contradicted the obvious choice.

- **The worst case for this page is "none".** The list query filters on the verdict and orders by
  render time. With no matching row — the state every course is in today — the planner walked the
  whole course to prove a negative, and the first live request timed out. The indexes now carry the
  sort column, so "none" comes back in 0.03 ms.
- **A partial index has to match the query verbatim.** One index on `veracity_pass IS NOT NULL` was
  measurably *not* used for `veracity_pass IS TRUE`. Two indexes whose predicates are the two
  queries exactly are both chosen. 8 KB each.

Neither index covers the unchecked population and neither ever will — that predicate matches nearly
all 2.5M rows. It is stated as `total − passed − failed` instead.

## 7. Explicit gaps

- **popty.app's default backend is not this machine.** The frontend is live on popty.app with the
  new tabs, and the API is live and verified on watson-1. But popty.app defaults its API to the
  Camberley Mac (`ssi-machine.ngrok.app`), which runs an older checkout that **404s the entire
  audio-preview API** — not just this change, but the page's earlier work too. Camberley is not
  reachable by ssh from watson-1. To see any of this, the Environment Switcher has to point at
  "SSi Machine (Cloud)" (`watson-1.tail4968cb.ts.net:8443`). Camberley needs a pull, a restart, and
  the staleness watchdog installing (`sh ops/watchdog/install-staleness-watchdog.sh`).
- **The four ungated phase8 endpoints still bypass the gate** (`regenerate-single`,
  `regenerate-presentation`, `regenerate-phrase`, `generatePodAudio`), as does `revoice-clips.cjs`,
  whose checks are level and duration only. Clips they write correctly read as **unchecked** — the
  honest outcome — but routing them through the gate is a separate build.
- **No production clip has yet been rendered through the gate**, so the "checked · passed" badge is
  proven by a controlled end-to-end probe (real S3 bytes → real gate → real database write → the
  page's own read model → `passed`, CER 0; probe row deleted) rather than by a live render. No TTS
  was spent, per the approval gate.
- **`repair-silent-clips` records verdicts from now on**, but the 1,020 clips it repaired earlier
  today were whisper-checked to the same standard and left no record. They read as unchecked. They
  are not backfilled, because a verdict recovered after the fact is about bytes nobody re-examined.

---

*Code: `services/audio-veracity.cjs` (`verdictColumns`), `services/phases/phase8-audio-v13.cjs`,
`tools/repair-silent-clips.cjs`, `services/audio-preview-router.cjs`,
`src/views/production/AudioPreview.vue`, `.../components/AudioPreviewClip.vue`.
Migrations: `database/migrations/20260805_course_audio_veracity_verdict*.sql`, both applied to
production. 75 unit tests green across the three suites.*
