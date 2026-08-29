# Per-voice natural pace — what remains for `ssi-learning-app`

**Written 2026-08-29 for whoever next works the player side.** The Popty half has
landed on `main`. Nothing in the player has changed and nothing needs to change
today — this describes the wiring, the numbers, and the one trap that will bite
whoever does it.

---

## 1. Why this exists, in one paragraph

Tom, 2026-08-29: *"the speeds are a little different between voices … we're
minting everything at 1.0x but the target languages are then played at lower
speeds for the first few belts on a kind of ramp-up process … White belt = 0.8x,
Y = 0.9, O = 0.95 and G = 1.0 … but that seems a bit too blunt for my liking."*

He is right, and the arithmetic is the reason. **The ladder multiplies.** 0.8× of
a brisk voice and 0.8× of a measured voice are nowhere near each other. Measured
across the estate on clips genuinely rendered at 1.0×, the English `known` voices
span **0.78× to 1.41×** of their own language's median pace. So today:

- a **white belt** on the fastest English voice plays at **1.13** of median pace;
- a **green belt** on the slowest plays at **0.78**.

The beginner hears faster speech than the intermediate. That is not a taste call.

**A correction to the premise, which matters.** We are *not* minting everything at
1.0×. Thirty courses carry a baked `settings.speed` of 0.8, 0.85 or 0.9 — twenty
of them at 0.8 on `target1` — and every one is an Azure voice, which bakes speed
into the mp3. The first uncorrected measurement reported a 3× spread; its ten
"slowest voices" were, exactly and in order, the ten Azure voices rendered at
0.8×. It was measuring a decision somebody had already made, not a voice. The
stored figures exclude those clips.

## 2. What Popty now provides

| Thing | Where |
|---|---|
| Stored per-voice pace | `voices.natural_pace_ratio` (+ `_cps`, `_samples`, `_measured_at`, `_method`) |
| Human's correction | `voices.natural_pace_nudge` (+ `_nudge_note`) — a **separate** column, never overwritten by re-measurement |
| The arithmetic | `services/shared/voice-pace.cjs` — pure, 13 tests. `effectivePaceRatio()` and `paceMultiplier()` |
| The read endpoint | `GET /api/voicelab/pace` → `{ voices: [{ voiceId, name, ratio, nudge, effective, cps, samples, measuredAt }] }` |
| The nudge endpoint | `PUT /api/voicelab/voices/:voiceId/pace` `{ nudge, note }` |
| The measurement tool | `tools/voice/measure-natural-pace.cjs` (dry-run by default) |
| The screen | Voice Lab → Languages: every cast slot shows `1.28x pace` / `pace unmeasured` with a nudge box |

**76 voices are measured today**, ratio 0.771 → 1.322. Another 64 voice ids appear
in `course_audio` with **no row in `voices` at all** — a registry gap, deliberately
not papered over.

### The one number to consume

`effective` = measurement × nudge. It is **`null`, never `1.0`, for an unmeasured
voice**, on purpose: *"typical for its language"* and *"we have not looked"* are
different claims that happen to share a digit. Branch on null; never substitute.

## 3. The change on the player side

Three files:

- `packages/player-vue/src/providers/toSimpleRounds.ts` — holds `beltSpeed()` (the
  literal `0.8 / 0.9 / 0.95 / 1.0` ladder), `computeCycleSpeed()`, and
  `MIN_SPEED = 0.7`.
- `packages/player-vue/src/components/LearningPlayer.vue` — builds `TargetSpeedConfig`
  from `props.course.voice_config` (`target_speed.global_speed`,
  `voices.target1.settings.speed`).
- `packages/core/src/learning/ratePolicy.ts` — the sibling rate policy.

**The belt ladder stops being a multiplier and becomes a TARGET PACE.** Same four
numbers, same boundaries (white ≤ seed 7, yellow ≤ 19, orange ≤ 39, green 40+) —
Tom called the multiplier blunt, not the belt structure. What changes is what the
number *means*: 0.8 stops meaning "80% of whatever this voice does" and starts
meaning "the pace a white belt should hear, as a fraction of this language's
median voice". Then:

```
speed = clamp(beltTarget / effectivePaceRatio, 0.7, 1.0)
```

A voice at exactly its language median (ratio 1.0) gets the belt number
unchanged — so *"white belt = 0.8"* keeps its familiar meaning and **only the
per-voice correction is new**. `services/shared/voice-pace.cjs` already implements
this exactly; port it or import it rather than writing a second copy.

### Existing constraints you must respect

- **`MIN_SPEED = 0.7`** (`toSimpleRounds.ts:61`). Real corrections hit it: eve at
  1.413× wants `0.8 / 1.413 = 0.566` for white belt, which clamps to 0.7. So the
  correction is *partial* for the fastest voices — say so rather than pretending
  it is exact.
- **The `[MIN_SPEED, base]` clamp** in `computeCycleSpeed()` — a per-voice speed
  must not escape `globalSpeed`.
- **`nativeSpeed` gates the ramp entirely.** Legacy slow-recorded courses return
  `base` and skip the ladder. Those courses must keep skipping it: their clips
  already have a pace correction baked in, and applying a second one is the
  0.8×-Azure mistake all over again.
- **Never above 1.0 for target-language material.** Everything is minted at 1.0×,
  so a multiplier above 1.0 means playing a clip faster than it was rendered — a
  new behaviour nobody asked for. `MAX_SPEED = 1.0` in the shared module. It bites:
  `en-GB-HollieNeural` at 0.782 wants 1.023 at white belt and gets 1.0.
- **A voice with no measurement resolves exactly as today**, to the digit. This is
  the first test in `voice-pace.test.cjs` and it is what makes shipping safe.

## 4. ⚠️ THE TRAP — read this before you write a line

`LearningPlayer.vue:9952` and its sibling at `:5779`:

```js
const spd = isEasyMode.value ? Math.min(easyConfig.value.playback_speed, 1.0)
                             : (cycle.playbackSpeed ?? 1)
```

`getPauseDuration` uses the **baked playback speed as a BELT PROXY** —
`beltProgress` maps `0.8 → White … 1.0 → Green`. `toSimpleRounds.ts` says so in
terms: *"an absent speed therefore reads as Green and hands a beginner the fully-
tapered green-belt pause."*

**So the moment a per-voice correction changes what a given speed number means,
every beginner's pause silently moves.** A white belt on eve would bake 0.70 and
be read as *below* white — and a white belt on a slow voice would bake 1.0 and be
read as **Green**, handing a beginner the fully-tapered green-belt pause. That is
a real regression in the learner experience and it would be invisible in every
test that only asserts on speed.

**The fix is to break the proxy first, as its own change, before any pace work
lands.** Pass the belt (or the seed number) onto the cycle explicitly and have
`getPauseDuration` read *that*, not the speed. The proxy was a shortcut that was
correct only while speed and belt were the same fact; per-voice pace is precisely
what makes them different facts. Do it in a separate commit with its own tests
asserting that pauses are unchanged, then wire the pace.

## 5. Suggested order

1. **Break the speed→belt proxy** in `getPauseDuration`. No behaviour change; tests
   assert every pause is byte-identical.
2. **Read `effective` into the course payload.** Cheapest honest seam: Popty
   projects it into `voice_config.voices.<role>.settings.natural_pace`, which
   `LearningPlayer.vue` already reads — no new fetch for the player. (Popty has
   *not* done this projection: it writes into the course row and wants a decision
   from Tom first, since a course-row write is what the language cast exists to
   avoid.) Alternative: the player calls `GET /api/voicelab/pace` once and caches.
3. **Turn `beltSpeed()` into a target** and derive the multiplier through the
   shared module.
4. **Ship behind a flag on one course.** Listen to a white-belt round on eve
   (fast) and on `azure_de-AT-JonasNeural` (0.650, the slowest measured) and check
   they feel like the same lesson. That comparison is the whole point, and no test
   can make it.

## 6. Open, for Tom

- Keep the four belt steps and boundaries? (default taken: yes)
- Express the target as a fraction of the **language's** median? (default: yes —
  it keeps "white = 0.8" meaning what it means today)
- Never speed a clip above 1.0×? (default: yes)
- Should Popty project pace into `voice_config`, or should the player fetch it?
  (default: **neither yet** — this is the seam decision and it is Tom's)
