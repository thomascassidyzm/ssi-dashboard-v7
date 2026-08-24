# The fading drill — what replaces Stage-0

*Design proposal, 2026-08-24. Nothing built, nothing changed. No DB write, no config edit, no code.*

**The headline: this needs no new plumbing at all.** The mechanism you asked for — one drill pattern
per sentence that thins as the learner meets that sentence more often — is exactly the mechanism
that is already in the player, sitting idle behind a single boolean. What is missing is not
machinery, it is a schedule. This document is that schedule, in numbers.

---

## 1. What is actually there today

### Stage-0 is already dead twice over

`stage0Sequence.ts` still composes the five-tier atom ladder, but it has had **no runtime caller
since 2026-07-14** — the audio breakdown was pulled out of the lap scheduler and the weaving layer
(`buildStage0Tier`, `composeSentenceArc`, `loadStage0ClipMaps`) was deleted outright. The only thing
that still calls it is the admin auditioner at `/admin/pod-auditioner`. Its intended replacement,
the always-visible LEGO tiles built from `atom_map`, was itself replaced on 2026-07-22 by the
karaoke teleprompter. So **there is currently no per-atom breakdown of a pod sentence anywhere on
the learner path, audio or visual** — which means deprecating Stage-0 in principle costs the learner
nothing that is presently reaching them. Your ruling is ratifying a fact, not causing a change.

### What one pod sentence actually plays right now

`usePodLapScheduler.nextLap()` (line 750) does this, per lap:

1. group the pod's sentences into **cohorts** — since 2026-08-09 the rule is **one new sentence per
   pod visit** (two only at the cold start);
2. every lap replays **all accumulated content**, oldest cohort first;
3. for each cohort compute `alive` — the number of laps this sentence has been in play, lifted by
   the shared two-doors drill counter (line 810). **`alive` is an exposure count**;
4. under the 2026-08-07 ONE-MODE rule (line 769), ignore the stage ladder entirely and play the same
   four slots for every cohort at every age: `['ps','trans','ps','ps']` — literally
   **target · known · target · target**, from `DEFAULT_LISTENING_PATTERN`
   (`listeningExposureRamp.ts:84`);
5. the only thing `alive` decides is the single speed all four slots share, via
   `resolveListeningSpeed` — and both shipped ramps are flat at 1.0.

So the pattern you asked for **already ships**. What does not exist is the fade: today sentence #1
on its 300th hearing plays exactly what it played on its first.

### The ladder machinery is intact, wired, and switched off

- `podStageFor(entry, alive, dwell, totalStages, perStageDwell)` (line 177) maps an exposure count
  onto a step, with a per-step dwell in laps. Already written, already tested.
- `buildMainStage()` (`podStageComposition.ts:153`) turns a step's playlist into plays, enforcing the
  **end-on-target invariant** (never strand the learner on English) and the glue flag.
- `ROLE_SPEED` (`podStageComposition.ts:43`) already gives `ps`=1.0, `ps15x`=1.5, **`ps2x`=2.0**.
- The whole ladder is read from `algorithm_config.pods.stagePlaylist` + `stageDurations`, so it is a
  **DB row, not a deploy**.
- It is bypassed by one flag: `listening.listeningUseStagePlaylist`, default `false`
  (`useAlgorithmConfig.ts:1018`).

That is the entire delta between where we are and what you asked for: **a boolean and a table of
numbers.**

### The shape of a pod, measured (not guessed)

129 pods live. Two canonical shapes:

| shape | pods | sentence rows | scenes | rows/scene |
|---|---|---|---|---|
| pod-0 | 65 | **142** | **15** | ~9.5 |
| pod-1 | 60 | **231** | **22** | ~10.5 |

Outliers: `spa_for_eng:travel-situations` 72, `spa_for_eng:music` **749**, two test pods at 2 and 24,
two Welsh pod-0s at **0 sentences**.

Rows are not the learner's unit — the splice splits them. Measured on `spa_for_eng:pod-1`:
**231 rows → 396 split units, mean 1.71 per row, max 5.** Scenes 1–5 hold 24 rows; scenes 1–10 hold
96 rows.

Clip lengths on that pod: target median **2.04 s** (mean 2.31), known median **1.78 s** (mean 2.06).
Gaps from `DEFAULT_PODS`: 100 ms known→target and target→target, 200 ms target→known, **1000 ms
between sentences**.

### The number that makes the fade urgent

One new unit per lap, every lap replaying everything, means a completed pod-1 has **396 laps**, and
the last lap plays 396 units. At today's flat four-slot pattern that lap is

> 396 × (3×2.31 + 2.06 + 0.4 gaps + 1.0 between) ≈ **68 minutes of audio in one lap.**

The fade is not only pedagogy. It is the thing that keeps a mature pod finite. Under the schedule
below the same lap is **≈16 minutes** — and the last 371 units of it are single bare 2× reps, which
is what "by the end" should sound like.

---

## 2. The schedule

**Axis: exposures of that sentence** (`alive`), not position in the pod. This is deliberate and it is
the recommendation: new content needs the most support, and under one-per-lap intake the newest line
in any lap is by definition the one on exposure 1. A position-keyed fade would give the hardest
support to the line the learner already knows best. See open question A if you meant otherwise.

Seven steps. Slot count thins 7 → 4 → 3 → 3 → 3 → 2 → 1; target speed climbs 1.0 → 1.5 → 2.0; the
known clip stays at 1.0 throughout and drops out entirely at the end.

| step | exposures | dwell | pattern | target speed | audio |
|---|---|---|---|---|---|
| 1 | 1–2 | 2 laps | T · K · T · T · K · T · T | 1.0× | ~16.5 s |
| 2 | 3–5 | 3 laps | T · K · T · T | 1.0× | ~9.4 s |
| 3 | 6–10 | 5 laps | T · K · T | 1.0× | ~6.9 s |
| 4 | 11–15 | 5 laps | T · K · T | 1.5× | ~5.4 s |
| 5 | 16–20 | 5 laps | T · K · T | 2.0× | ~4.6 s |
| 6 | 21–25 | 5 laps | T · T | 2.0× | ~2.4 s |
| 7 | 26+ | eternal | T | 2.0× | ~1.2 s |

In `PodPlayRole` vocabulary, which is what the config actually stores:

```
1: ["ps","trans","ps","ps","trans","ps","ps"]
2: ["ps","trans","ps","ps"]
3: ["ps","trans","ps"]
4: ["ps15x","trans","ps15x"]
5: ["ps2x","trans","ps2x"]
6: ["ps2x","ps2x"]
7: ["ps2x"]
stageDurations: {"1":2,"2":3,"3":5,"4":5,"5":5,"6":5}
```

**Why the curve is staged, not linear.** Three things change — slot count, target speed, and whether
meaning is present — and they change *one at a time*. Slots thin first while everything stays at
1.0 (steps 1→3), then speed climbs with the shape held constant (3→5), then meaning is withdrawn
(5→7). A learner never gets two changes in the same promotion, so if a step sounds wrong you know
which knob did it. The dwell pattern 2·3·5·5·5·5 follows the existing precedent
(`DEFAULT_STAGE_DURATIONS` is `{1:1, 2:3}` over a base of 5) rather than a fresh invention.

**Why "twice" is seven slots and not eight.** Your pattern played literally twice is
T K T T · T K T T, which puts **three identical target clips back to back** at the seam. That
breaches the A-64 law ("no mode should ever repeat the same prompt more than twice consecutively"),
which is enforced downstream of all config by `capConsecutiveRepeats` (line 851) — and its
enforcement is to *re-interleave*, so it would pull the next sentence's audio into the middle of the
drill. Dropping the second copy's leading target gives T K T T K T T: two full meaning-anchored
passes, no three-run, nothing to re-interleave. Alternative in open question C.

**Total support before a sentence goes bare:** 25 exposures with the known clip attached, ≈150 s of
audio across 25 laps, then bare target at 2× for ever. First lap of a new sentence: 16.5 s. Lap 3 of
a cold start: ~40 s.

---

## 3. How it lands on the existing mechanism

### Option A — zero code (recommended as the pilot)

Two rows in `algorithm_config`:

1. `pods.stagePlaylist` ← the seven playlists above; `pods.stageDurations` ← the dwell map;
   `pods.stageDuration` ← 5 (the fallback for anything unlisted).
2. `listening.listeningUseStagePlaylist` ← `true`.

Nothing else. `podStageFor` already maps `alive` → step with per-step dwell; `buildMainStage` already
emits the plays; `ROLE_SPEED` already gives 1.5× and 2×; the end-on-target invariant and the A-64 cap
already run downstream. **No deploy, no migration, reversible by flipping one boolean back.**

Three consequences of taking that path, stated plainly rather than buried:

- **The 1.0 listening ceiling stops applying.** `LISTENING_SPEED_CEILING` (`listeningExposureRamp.ts:94`)
  is enforced only inside `resolveListeningSpeed`, which the stage path does not call. So 2× works —
  but it works by *bypassing* your 2026-08-07 rule ("never more than one"). That rule and this
  direction are in direct conflict and you should retire it explicitly for pods rather than let a
  config flag quietly outvote it. Speaking mode is unaffected either way.
- **Course `globalSpeed` stops being folded in.** On the stage path `uniformSpeed` is `undefined`
  (line 827), so plays fall back to raw role rates and `speedIsFinal` is false — which means the
  `computeListeningSpeed` pass in `playPodLap` (LearningPlayer.vue:4703) picks them up instead. Since
  2026-08-16 that pass applies the course speed and no belt term, so a slow-recorded course like
  French at 0.95 still gets its 0.95. Net: globalSpeed survives, by a different route. Worth
  verifying by ear on one course before trusting it.
- **The known clip rides at 1.0 while targets ride at 1.5/2.0**, which contradicts your 2026-08-07
  "all four clips at the same speed". I think that is right here and not a regression — see open
  question B — but it is a change of ruling, not an implementation detail.

### Option B — the durable home (~40 lines, if the schedule survives your ear)

Give the one-mode policy a **pattern ramp** beside its speed ramp: `listening.playPatternRamp` as a
list of `{pattern, speed, plays}` steps, resolved by one new function next to `rampSpeedForExposure`.
Same seven steps, same numbers, but expressed once in the place the 2026-08-07 redesign actually
lives, with `speedIsFinal` set, globalSpeed folded in explicitly, and the ceiling made a per-layer
value rather than a constant that config sneaks around.

**Recommendation: A now to hear it, B to keep it.** A costs nothing and answers the only question
that matters — does the fade sound right. B is worth the 40 lines only once the answer is yes,
because it is the difference between a config that works and a config that is honest about why.

### What would need updating either way

`usePodLapScheduler.test.ts`, `listeningOneMode.test.ts` (line 157 pins the four-slot pattern
exactly), `usePodLapScheduler.a64.test.ts`, and `podStageComposition.test.ts`. The one-mode tests
assert the current behaviour deliberately, so they are a *rewrite*, not a break.

---

## 4. Your calls

**A. Is the fade axis per-sentence exposure, or position in the pod?** I have designed for exposure —
"the end" means the end of a sentence's life, not the end of the dialogue. Consequence: in a late lap
the learner hears 371 old lines bare at 2× and the one new line in full at 1×, which I think is the
sound you want. If you meant the pod itself thins — the last scene played bare regardless of how new
it is — that is a different table and I'll write it.

**B. Does the known clip ride the speed ramp with the targets?** I have it pinned at 1.0 throughout
because speeding up the learner's own language buys no comprehension and costs the anchor. That
reverses your 2026-08-07 "all at the same speed". Your ear, not mine.

**C. Is "twice" seven slots or eight?** Seven (T K T T K T T) is the A-64-legal reading. Eight is
possible only by relaxing the three-in-a-row law for this one case, which I would not do.

**D. Does the 1.0 listening ceiling stand?** It cannot coexist with 2× at the end. I read your
direction as retiring it for pods, and I would leave it standing for Layer-1 seed sandwiches unless
you say otherwise.

**E. What happens to pods below ~26 units?** The two Welsh pod-0s have **zero** sentences; the test
pods have 2 and 24. A 24-unit pod never reaches step 7 for its later lines under any exposure
schedule, because those lines are only ever heard a handful of times. My read: that is correct and
needs no special case — a short pod simply never gets bare, and the learner moves on. Say if you want
a compression for short pods instead.

**F. Same schedule for every language?** The tables are global rows, so today it is one schedule
estate-wide. A per-course fade would need a new key under either option. My read: ship one schedule,
and only fork it if a specific language proves it needs one — a fork is a maintenance cost we should
make a language *earn*.

**G. `spa_for_eng:music`, 749 units.** At one intake per lap that is 749 laps and a final lap around
30 minutes even fully faded. It is out of scope for this design but it is a real pod and something
about it is wrong. Flagging, not fixing.

---

## 5. The content rule this assumes

Your "one sentence at a time, no smuggled content, certainly for the first 5–10 scenes" is an
**authoring** rule for new pods, not a drill rule — but the drill depends on it. Today a single pod
row can carry three sentences of speech (`spa_for_eng:pod-1`, scene 4: *"Sí, tengo un día ocupado
hoy. Espero que tengas un buen día. Hasta luego."*), and it is the splice that breaks those into
units — 231 rows became 396. For **new** pods the rule should hold at authoring time: one sentence
per row, so the split machinery has nothing to rescue. In scene terms that is the first ~24 rows
(scenes 1–5) or ~96 rows (scenes 1–10) of a pod-1-shaped pod.

---

*Written from the code as it stands on `main` and the live DB, 2026-08-24. Nothing in this document
has been applied.*
