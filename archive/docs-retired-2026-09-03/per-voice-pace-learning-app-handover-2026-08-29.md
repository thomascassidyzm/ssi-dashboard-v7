# Playback speed — what remains for `ssi-learning-app`

**Rewritten 2026-08-29, evening.** The earlier version of this file described a
belt-ramp-as-target design. **Tom retired the belt ramp the same day** and the
measurement it was built on has been replaced, so that design is gone — this
file is the live handover and the old one should not be worked from.

The Popty half has landed on `main`. Nothing in the player has changed yet.
This describes the rule, the numbers, the seam, and the one trap that will bite
whoever does it.

---

## 1. The rule, in four lines (Tom, 2026-08-29)

| What the learner is doing | Easy | Fast |
|---|---|---|
| **Target language** (speaking practice) | **0.80** | **0.90** |
| **Known language** (instruction they already understand) | 1.00 | 1.00 |
| **Listening exercises**, any language | 1.00 | 1.00 |

In his words:

> "slower voices in playback for target language — Always — than when used for
> known language — Listening exercises can always be full speed in any language
> because listening is training them for everyday life"

> "You're probably right to make it 0.8x … on EASY setting. We also have a FAST
> setting — which could perhaps be a flat 0.9x … Then we can dispense with the
> belt ramp chicanery?"

**The belt ramp is retired.** `white 0.8 / yellow 0.9 / orange 0.95 / green 1.0`
no longer exists as a speed policy. Speed is not a function of belt at all.
Belts remain a real thing in the app — they are just no longer what decides how
fast a clip plays.

### 0.8 of WHAT

**0.8 of the LANGUAGE'S reference pace, not 0.8 of each voice's own pace.**
Otherwise a naturally brisk voice on Easy is still faster than a measured voice
on Fast and the setting means nothing to the learner. So:

```
speed = clamp(targetPace / effectivePaceRatio(voice), 0.7, 1.0)
```

A voice at exactly the reference (ratio 1.0) plays at the plain number, so
"Easy = 0.8" keeps its obvious meaning and only the per-voice correction is new.

**Known and listening are 1.0 flat, with NO per-voice correction** — played
exactly as rendered. (Taste default taken in Popty and flagged for Tom:
correcting a slow voice *up* would mean playing a clip faster than it was
rendered, which `MAX_SPEED = 1.0` already forbids.)

---

## 2. Where the numbers come from now

**Not from our recordings.** Tom, 2026-08-29:

> "be careful - Azure voices were recorded at non 1.0x speeds so we can only use
> the providers APIs for the voice as the truth - not the recordings we have in
> the estate"

`tools/voice/measure-provider-pace.cjs` renders **one identical sentence per
language** through each voice's own provider API at speed 1.0 — no SSML rate, no
prosody tag, no post-processing — and times the bytes with `ffprobe`. Because
every voice in a language speaks the same text, length cancels exactly and the
comparison is pure duration. Existing course audio is never read, touched or
re-rendered.

- **173 voices measured** across Azure (164), ElevenLabs (2), Cartesia (2) and
  the 5 xAI voices still cast on live courses.
- **Spread: 0.832× – 1.241×** of the language reference (the estate-derived
  figure was 0.65×–1.32× after correcting for Azure's baked speed, and
  0.57×–1.67× before — which is exactly why Tom's correction mattered).
- `natural_pace_method` on each row reads
  `provider-api@1.0x one-sentence-per-language v2 2026-08-29`, so the old
  estate-derived claim and this one are legible as two different measurements.
- The per-language reference — sentence, source seed, reference read in seconds,
  voices behind it — is committed at `tools/voice/provider-pace-reference.json`
  and served in the `languages` block of `GET /api/voicelab/pace`.

## 3. What Popty provides

| Thing | Where |
|---|---|
| Stored per-voice pace | `voices.natural_pace_ratio` (+ `_cps`, `_samples`, `_measured_at`, `_method`) |
| Human's correction | `voices.natural_pace_nudge` (+ `_nudge_note`) — separate column, never overwritten by re-measurement |
| **The rule + the arithmetic** | `services/shared/voice-pace.cjs` — `targetPace(role, mode)`, `playbackSpeed(voice, role, mode)`, `effectivePaceRatio()`, `paceMultiplier()`, `MIN_SPEED = 0.7`, `MAX_SPEED = 1.0`. 22 tests in `voice-pace.test.cjs` |
| Read endpoint | `GET /api/voicelab/pace` → `{ voices: [{ voiceId, ratio, nudge, effective, easy, fast, easyClamped, fastClamped, … }], languages: { <iso3>: { sentence, reference_seconds, voices, … } } }` |
| Nudge endpoint | `PUT /api/voicelab/voices/:voiceId/pace` `{ nudge, note }` |
| The screen | Voice Lab → Languages: the language's reference read + sentence, and per voice `1.04x pace` / `0.77 easy / 0.87 fast` / `pace unmeasured`, with the nudge box |

**The one number to consume:** `effective` = measurement × nudge. It is `null`,
**never `1.0`**, for an unmeasured voice — "typical for its language" and "we
have not looked" are different claims that share a digit. Branch on null.

`ROLE_ALIASES` in the shared module maps the estate's own slot names:
`target1`/`target2` → target, `known`/`presentation` → known.

---

## 4. ⚠️ THE TRAP — read this before you write a line

`packages/core/src/script/computePauseDuration.ts` holds `beltProgress(speed)`:

```ts
function beltProgress(speed: number): number {
  const p = (speed - 0.8) / (1.0 - 0.8)     // 0.8 → White … 1.0 → Green
  return p < 0 ? 0 : p > 1 ? 1 : p
}
```

The 4th argument of `computePauseDuration` is documented as the target playback
speed and is **used as a proxy for the learner's belt**. `toSimpleRounds.ts`
says so in terms in `computeCycleSpeed`'s header: *"an absent speed therefore
reads as Green and hands a beginner the fully-tapered green-belt pause."*

**Retiring the ramp breaks that proxy.** Concretely, and this is the precise
shape of the regression:

- The **Easy** path is safe by accident: `LearningPlayer.vue:9952` and its
  countdown sibling at `:5779` pin `spd = Math.min(easyConfig.playback_speed,
  1.0)` — Easy already takes the Green taper at every belt, deliberately, and
  that is unchanged by anything here.
- The **Fast** path reads `cycle.playbackSpeed`. Today that walks 0.8 → 1.0
  across the belts, so the pause tapers as the learner climbs. Under the new
  rule a Fast target cycle bakes ~0.9 (times the per-voice correction) **at
  every belt**, so `beltProgress` returns ~0.5 forever: **every Fast learner
  gets a mid-taper pause at every belt** — beginners get a shorter pause than
  they get today, advanced learners a longer one. No error, no alarm, and
  invisible to any test that only asserts on speed.

**The fix, and it lands FIRST, on its own, before any pace change reaches the
player: pause must stop inferring belt from speed and be told the belt.** The
two concerns were only ever coupled because speed happened to encode the belt;
once speed encodes role and mode, the coupling is a bug.

### Recommended signature change

```ts
// packages/core/src/script/computePauseDuration.ts
export function computePauseDuration(
  target1Ms: number,
  target2Ms: number,
  cfg: PauseModeConfig,
  /** DEPRECATED belt proxy. Kept only until every caller passes beltProgress. */
  playbackSpeed = 1,
  /** Belt progress 0 (White) → 1 (Green), explicit. When present, wins. */
  beltProgress01?: number,
): number
```

and export the belt→progress helper so nobody re-derives it:

```ts
export function beltProgressFromSeed(seedNumber: number): number   // 0…1
```

Boundaries are already canonical in
`packages/player-vue/src/composables/useBeltProgress.ts`
(`getBeltIndexForSeed`, `BELTS`, `BELT_MAX_SEEDS`: white ≤ 7, yellow ≤ 19,
orange ≤ 39, green 40+) — read them there rather than re-typing the numbers.
The cycle already carries the seed (`seedNumberFromId(cycle.seedId)` in
`toSimpleRounds.ts`), so nothing new has to be plumbed through the round
builder except the number itself.

Then flip both call sites in `LearningPlayer.vue` (`:9952` runtime override and
`:5779` `startSpeakCountdown` — they must stay byte-identical to each other),
pass `beltProgress01`, and delete the `playbackSpeed` argument once nothing
passes it. **Tests for this commit assert every pause is unchanged**, Easy and
Fast, at each belt.

---

## 5. Then the speed change itself

1. **Delete `beltSpeed()`** from `packages/player-vue/src/providers/toSimpleRounds.ts`
   (lines ~76-81) and rewrite `computeCycleSpeed(seedNumber, config)` as
   `computeCycleSpeed(role, mode, voicePaceRatio, config)`. It no longer takes a
   seed at all — that is the assertion, the same way `computeListeningSpeed`
   ignores the seed it is handed.
2. **Import the rule rather than copying it.** `services/shared/voice-pace.cjs`
   is CommonJS in the Popty repo; the honest options are (a) publish it into
   `@ssi/core` and have Popty require *that*, or (b) port `targetPace()` +
   `paceMultiplier()` into `packages/core/src/learning/ratePolicy.ts` and add a
   test in each repo asserting the same table of numbers. Do NOT grow a second
   independent implementation — `MIN_SPEED = 0.7` already exists in both repos
   and that duplication is the thing to fix, not repeat.
3. **`computeListeningSpeed` is already correct and must not be touched.** It
   ignores the seed and never slows — that IS the new rule for listening. The
   only change is the comment referring to the ramp.
4. **Known-language clips**: confirm nothing applies a correction to them. Under
   the rule they are 1.0 flat, played exactly as rendered.

### Constraints you must respect

- **`nativeSpeed: false` legacy courses skip the ramp entirely today
  (`if (!config.nativeSpeed) return base`) and MUST keep skipping any
  correction.** Their clips already have a pace baked in; a second correction is
  the Azure mistake again.
- **`globalSpeed` is a per-course base multiplier** (`voice_config.target_speed.global_speed`,
  e.g. fra_for_eng 0.95). The current code clamps to `[MIN_SPEED, base]` so a
  per-voice speed cannot escape it. Keep that: `globalSpeed` is a course-level
  correction for how its audio was made, the pace ratio is a voice-level
  correction, and they compose — `clamp(base × targetPace / ratio, 0.7, base)`.
- **`MAX_SPEED = 1.0`** — never play a clip faster than it was rendered.
- **The clamp bites.** fr-FR-VivienneMultilingualNeural at 1.241 wants
  `0.8 / 1.241 = 0.645` on Easy and gets 0.7. The correction is **partial** for
  the briskest voices; say so, don't imply it is exact.
- **An unmeasured voice resolves to the plain target number**, to the digit.

### Tests that will need flipping

| File | What it asserts today |
|---|---|
| `packages/player-vue/src/playback/speedRampSync.test.ts` | the 0.8/0.9/0.95/1.0 table per belt, both round builders in sync, and the belt-proxy note |
| `packages/player-vue/src/playback/listeningSpeedRamp.test.ts` | imports `beltSpeed`; asserts listening is NOT ramped — keep the assertion, drop the import |
| `packages/player-vue/src/playback/listeningOneMode.test.ts` | imports `beltSpeed`; same shape |
| `packages/player-vue/src/playback/easyFastSpeedParity.test.ts` | Easy and Fast bake the SAME speed — **this one changes meaning**: under the new rule they are deliberately 0.8 vs 0.9, so the parity assertion becomes a *difference* assertion |
| `packages/player-vue/src/playback/beltPositionSync.test.ts` | belt position — check it does not read speed |

## 6. The seam: how the player gets a voice's pace

Unchanged from the earlier handover, and still Tom's call:

- **(a)** Popty projects `effective` into
  `voice_config.voices.<role>.settings.natural_pace`, which `LearningPlayer.vue`
  already reads — no new fetch. Popty has deliberately NOT done this: a
  course-row write is exactly what the language cast exists to avoid.
- **(b)** The player calls `GET /api/voicelab/pace` once and caches it. One
  request, no course writes, and the `languages` reference block comes with it.

Recommendation: **(b)**. The measurement is a property of the voice, not of the
course, and (a) would write the same number into 149 course rows and then have
to keep them in step.

## 7. Ship it the way the numbers deserve

Behind a flag, on one course. Listen to a target round on
`fr-FR-VivienneMultilingualNeural` (1.241, clamps) and on
`en-US-SerenaMultilingualNeural` (0.832, barely corrected) and check they feel
like the same lesson at the same setting. That comparison is the whole point and
no test can make it.

## 8. Open, for Tom

- Known and listening at 1.0 with **no** per-voice correction — the conservative
  reading of "always 1.0x". (Default taken.)
- Reference normalised within **language** only, not (language, role) — with one
  controlled sentence there is no role dimension. (Default taken.)
- The seam above: (a) project into `voice_config`, or (b) player fetches.
