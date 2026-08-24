# The pod fade schedule is live

Applied 2026-08-24. Tom's ruling: run his ladder, flip it on, launch on a hard cut.
No audio touched, no TTS, nothing regenerated.

---

## 1. First, the thing you asked me to check before anything else

**The Pod Lab could not do gap experimentation. The Listening Config page always could.**

Your instinct was half right, and pointed at the wrong page.

| | Pod Lab `/admin/configs/pods` | Listening Config `/admin/configs/listening` |
|---|---|---|
| edit the stage ladder | yes (JSON editor) | yes (pill editor, per-stage rounds, ▶ audition) |
| edit the four gaps | **no — did not exist** | **yes — four ms fields, since it was built** |
| write it to `algorithm_config` | never (export to clipboard only, by design) | yes, live, plus draft / version / rollback |
| hear it | yes — **at a flat hardcoded 350 ms** | ▶ per stage |

The evidence, before I changed anything:

- `PodLab.vue:37` — `const DEFAULT_GAP_MS = 350`, and `PodLab.vue:392` played every clip in every
  arc with `sleep(p.gapAfterMs ?? DEFAULT_GAP_MS)`. The four real gap fields appeared **nowhere**
  in the file. Its `loadLiveConfig()` read `byKey.pods.stagePlaylist` and dropped the rest of the
  row on the floor.
- So the Lab auditioned every rung at 350 ms while the live row has carried **0 on all four gaps
  since Aran wrote it on 2026-06-30**. It was not bit-rot — the gap machinery was never there. But
  it was worse than absent: the Lab sounded authoritative and paced like nothing any learner has
  ever heard.
- `ListeningConfig.vue:221-227` — `gapSuperTightMs`, `gapTightMs`, `gapGluedMs`, `gapBetweenMs`,
  four bound `NumField`s in the Layer-2 pods card, with a Save that upserts `algorithm_config`
  directly on the published channel (`algorithmConfigShared.js:106`). That has worked all along.

**What I did about it.** Rather than report the gap and stop, I built it — it was small and it is
exactly what you asked for:

- the four gaps are now editable in the Pod Lab, seeded from the live row
- playback uses `gapAfter()`, a faithful mirror of the learner's own rule (`podGapMs`,
  `LearningPlayer.vue:4648`) — not a flat 350 ms. Change a number, press play, hear the difference.
- a **Hard cut (0)** button (the launch pacing) and a **Live** button
- the gaps ride the existing clipboard export, so a tuned value reaches the config the same
  deliberate way the ladder does

The Lab still never writes `algorithm_config` — I deliberately did not add a Save button. Those
writes are global to every learner inside five minutes with no draft/env split, and that safety
property is why the Lab exists in the shape it does. Tune by ear in the Lab, apply on the Listening
Config page, which has the versioning and the rollback. **If you want a Save button in the Lab
anyway, say so and it is a ten-minute job** — that is a taste call, not a technical one.

One thing I read carefully and left alone: `podGapMs` treats only `ps`/`ps2x` as target roles, so a
`ps08x`→`trans` transition takes the super-tight gap rather than the tight one. It cannot bite your
ladder (which uses only `ps`, `ps2x` and `trans`) and fixing it would change Layer-1 pacing, so it
stays as an observation.

---

## 2. What is now running

`algorithm_config` row `key='pods'`, version 2 — **your** ladder, from the Pod Lab
(`PROPOSED_STAGE_PLAYLIST`, commits `ee759557b` / `97e8e09a5`), not Aran's:

| rung | laps | pattern | reads as |
|---|---|---|---|
| 1 | 1–2 | `ps · trans · ps · ps` | t · k · t · t, all 1× |
| 2 | 3–7 | `ps · trans · ps · ps2x` | closing rep speeds up |
| 3 | 8–12 | `ps · trans · ps2x · ps2x` | both closing reps fast |
| 4 | 13–17 | `ps · trans · ps2x` | one rep drops |
| 5 | 18–22 | `ps2x · trans · ps2x` | the slow rep goes |
| 6 | 23–27 | `ps · ps2x` | **the known clip drops out** |
| 7 | 28–32 | `ps2x · ps2x` | fully fast |
| 8 | 33+ | `ps2x` | bare target at 2×, for ever |

Aran's duplicated stage 1/2 — the fossil of the retired explainer stage — is gone, which is the one
substantive difference between his row and yours.

**"Twice"**, as decided: `stageDurations: {"1": 2}`. The full t·k·t·t at 1× is heard on the
sentence's **first two laps** before anything thins; the third hearing is the first with 2× in it.
Two laps, not the pattern doubled inside one lap — one hearing is four clips, not eight. A literal
double would put three identical target clips in a row, which the A-64 law would re-interleave
anyway.

**The gap**: 0 on all four fields — a hard cut, no pause between clips and none between sentences.
It was already 0 in the row; it is now a deliberate launch value rather than an inherited one, and
it is adjustable from two places without a deploy.

**The ceiling**: retired for pods, on purpose. `LISTENING_SPEED_CEILING` (1.0) lives inside
`resolveListeningSpeed`, which the stage-playlist path does not call — so the fade's closing reps
play at their authored 2×. That was previously an accident of an `undefined` argument; it is now
the stated ruling with the reason attached: a pod has its own completion signal, reaching the
eternal bare-target-at-2× rung, so it needs no speed ceiling on top. **The ceiling mechanism itself
is unchanged and still absolute for every non-pod listening path**, and a test holds it there.

`algorithm_config` row `key='listening'`, version 2 — `listeningUseStagePlaylist: true`. That one
boolean is what puts the ladder on the learner path; without it the scheduler consulted the ladder
and threw the answer away.

---

## 3. Blast radius — read this bit

**It is live now, on existing pods, for every learner, on production.** Not new pods only.

- `algorithm_config` rows are **global**. There is no per-course, per-pod or per-learner fade, and
  dev / staging / production share one Supabase project, so there is no environment to stage this
  in. The write reaches production directly.
- Effective within **~5 minutes** (the config cache TTL) for any session that reloads config; a
  session already running holds its cached config until it reloads.
- **No deploy is needed and none is pending.** Production code already reads both the flag and the
  row — verified against `origin/main`, not inferred: `usePodLapScheduler.ts:816` consumes
  `policy.useStagePlaylist`, and `LearningPlayer.vue:3714/3716` passes the row's `stagePlaylist`
  and `stageDurations` in.
- **Nobody restarts at rung 1.** Which rung a learner lands on is computed from their own exposure
  count for that sentence, so a learner deep into a pod jumps straight to the sparse, fast rung
  their age maps to. Anyone past 32 laps on a sentence hears bare target at 2× immediately. Before
  today every sentence at every age played the same flat four-slot pattern for ever, so for
  well-drilled learners this is a step change in one session, not a gentle onset.
- **No content was touched.** No clip, no audio row, no pod text, no TTS, no regeneration. Nothing
  in the courses changed — only how the existing clips are scheduled.
- **Reversible in one click**, now: uncheck *Layer 2 pod fade → Run the stage playlist* on
  `/admin/configs/listening` and Save. The pre-change snapshot of both rows is kept off-repo in
  this session's scratch directory if the ladder itself ever needs restoring.

---

## 4. What changed, and where

**ssi-learning-app** — branch `feat/pod-fade-schedule-live`, merged to `dev` (`d94e5e08`).
The code side carries no behaviour change on its own; it is what stops the flip drifting later.

- `usePodLapScheduler.ts` — the ceiling carve-out stated as the ruling it now is, with its scope
  ("pods only") and its reason ("the eternal rung IS the completion signal") written down.
- `useAlgorithmConfig.ts` — `resolvePodsConfig()` extracted and exported. Every gap in the live row
  is 0, and 0 is falsy: one `||` anywhere on this path would silently restore the 1000 ms
  between-sentence pause with no error to see. Spread, never `||` — now named, and locked by test.
- `podFadeSchedule.test.ts` — **new, 21 tests**: the eight rungs and their speeds, the known clip
  present through rung 5 and gone from rung 6, every rung ending on a target rep, no duplicated
  rung, "twice", the gap resolving to 0 and staying adjustable, and the ceiling carve-out being
  pod-only (a non-pod path with `maxSpeed: 2.0` still clamps to 1.0).
- `usePodLapScheduler.test.ts` — **+4 tests**, the chain end to end: lap 1 and lap 2 both play
  t·k·t·t at 1×, lap 3 is the first thinning at 2×, a sentence debuting on that same lap is still
  on rung 1, and with the flag off the same live row is inert.

**Popty** — branch `feat/pod-lab-gap-config`, merged to `main` (`4d022bfed`).

- `PodLab.vue` — the four gaps, editable; `gapAfter()` mirroring the learner's rule; Hard cut /
  Live buttons; gaps in the export.
- `ListeningConfig.vue` — the `listeningUseStagePlaylist` master switch, as a checkbox on the
  Layer 1 card (that card, because the field lives on the `listening` row and that is the Save
  which writes it). It had no control anywhere before, which is precisely why the ladder existed
  for eight weeks and reached nobody.

**Tests: 1,065 passed, 0 failed** across `composables/` + `playback/` (98 files), including the 25
new ones. Popty's Vite build is green.

---

## 5. What I did not verify

- **The Pod Lab gap controls are build-verified, not ear-verified.** I did not open the page in a
  browser and listen. The playback rule is a line-by-line mirror of the learner's, but the first
  person to hear it will be you.
- **Nobody has heard the fade end to end at gap 0.** Four zeros over eight rungs with no pause
  between sentences will sound relentless, and that is the one thing likely to want a second pass
  by ear. That is now a number you can change in two places without an agent.
