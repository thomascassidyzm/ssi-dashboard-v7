# German seed-1 speed — the A/B page, and the numbers behind it

**2026-08-06 · diagnostic only · no content was regenerated, no TTS was spent**

## Listen here

**https://ssi-dashboard-v7-dmblhh0bb-zenjin.vercel.app/german-speed-check**

Twelve real deu_for_eng clips from seeds 1–2 (prompt, target1, target2). Each row has three
big buttons:

| | what it is | rate |
|---|---|---|
| **A** | the original file, exactly as stored | 1.00× |
| **B** | the seed-1 belt ramp alone | 0.80× |
| **C** | belt ramp × course global × learner default — **what a beginner should be hearing** | **0.76×** |

No login. It opens straight on a phone.

## The numbers, and where each came from

Read from `ssi-learning-app` on `origin/dev` (the branch dev is deployed from), 2026-08-06.

| quantity | value | source |
|---|---|---|
| Belt speed at seed 1 (white belt, seeds 1–7) | **0.80** | `beltSpeed()` — `packages/player-vue/src/providers/toSimpleRounds.ts:75-80` |
| Course global speed, deu_for_eng | **0.95** | `courses.voice_config.target_speed.global_speed` in Supabase — the row reads `{"belt_ramp": true, "global_speed": 0.95}` |
| Learner speed setting, app default | **1.00** | `localStorage 'learner_speed'` defaults to `'1.0'` — `LearningPlayer.vue:6457-6461`, `SettingsScreen.vue:390` |
| **Combined** | **0.95 × 0.80 × 1.00 = 0.76** | `computeCycleSpeed()` — `toSimpleRounds.ts:101-113` |

`computeCycleSpeed` multiplies, rounds to two decimal places, then clamps to `[0.70, globalSpeed]`.
0.76 clears both bounds, so 0.76 is the number, unrounded and unclamped.

Note what the "global playback speed" actually is: the **course's** 0.95, not a learner
preference. The learner-facing speed control (Settings → Learning Speed, tester-only,
options 0.7 / 0.8 / 0.9 / 1.0 / 1.1 / 1.25) defaults to **1.0** and therefore contributes
nothing for a fresh learner. So C differs from B only by the course's own 0.95.

## Where it is applied

`SimplePlayer.playAudio()` sets `this.audio.playbackRate = rate` on the HTML `<audio>` element
(`SimplePlayer.ts:1119-1130`, and the retry path at `:400-404`). The rate is
`cycle.playbackSpeed × getPlaybackSpeedMultiplier(cycle)`, where the multiplier is 1.0 outside
Turbo. `cycle.playbackSpeed` is **baked at round-build time**, not computed at play time.

Two important consequences:

1. **Only target audio is slowed.** `if (isTarget && this.currentCycle)` gates the whole block —
   known-language prompt audio always plays at 1.00×, by design. The two prompt clips on the
   page are labelled accordingly.
2. **The ramp also drives the pause.** `computePauseDuration` uses the baked speed as its belt
   proxy (0.8 → White … 1.0 → Green). If the ramp were missing, the beginner would get both the
   fast voice *and* the fully-tapered green-belt pause. That means "sounds fast" can be a
   pause-length perception as much as a rate one — worth separating when ruling.

## What the code reading found

**The 2026-08-05 fix looks complete on `dev`.** The regression was that the instant-playback
round builder baked no speed at all while the legacy builder did; `f995d6d5` +
`164446bc` bake it in `backendCyclesToRounds`, and `speedRampSync.test.ts` pins both builders
to the same curve at every belt band. All six call sites of `backendCyclesToRounds` /
`infPlayCyclesToRounds` / `toSimpleRounds` in `LearningPlayer.vue` thread the real
`currentTargetSpeedConfig()` through. The course object comes from a `select('*')` on `courses`
(`App.vue:428-433`), so `voice_config` is genuinely present and `nativeSpeed` resolves true for
deu_for_eng (target1 voice `ara`, `settings.speed = 1`).

So I could not find a "computed right, applied wrong" defect on `dev`. That leaves the
question the page is built to answer: **is 0.76× simply not slow enough?** If C on this page
sounds right and the app sounds faster than C, the fault is in delivery. If C on this page
sounds as fast as the app does, then 0.76× is doing exactly what it is told and the white-belt
target of 0.80 is the thing to change.

## Method

One `<audio>` element, `playbackRate` set before `play()`, with `preservesPitch = true` set
explicitly (plus the `moz`/`webkit` legacy names). This is the browser's own pitch-preserving
time stretch — the same mechanism `SimplePlayer` uses, so B and C are the app's real
processing, not an approximation. Nothing was rendered server-side; no `atempo`, no resampling.

Clips are fetched from `https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/…` exactly
as stored.

## Gaps, stated honestly

- **Clip choice was constrained by public readability.** Four of the seed-1 target1 clips I
  first picked live under the `repair-candidates/` S3 prefix, which returns 403 to an anonymous
  browser (the app reaches them through its authenticated `/api/audio` proxy). Those were
  swapped for `mastered/` clips from the same seeds. Every clip on the page was HEAD-checked
  at 200 before shipping. The consequence: the page samples the publicly-readable subset of
  seed 1–2, not a uniform random sample.
- **I did not measure the live app.** I read the code and the DB; I did not instrument a real
  learner session on dev to observe the `playbackRate` actually reaching the audio element.
  So "the fix looks complete on dev" is a code-reading conclusion, not a runtime measurement.
  If the page tells Kai C is right and the app is wrong, that runtime probe is the next job.
- **Seeds 1 and 2 are both white belt**, so every target clip here carries the same 0.80.
  Nothing on this page tests the yellow/orange/green steps.
