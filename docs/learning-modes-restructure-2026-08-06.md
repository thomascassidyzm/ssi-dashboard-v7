# Learning modes restructure — Turbo out, Easy and Fast in (2026-08-06)

## The ruling

Two learning modes, not three. **Easy** and **Fast**. Turbo is deprecated.

The "deprecate turbo / only two modes / Easy and Fast / Fast should be what the
current regular mode is / toggle backwards and forwards on the front page" part
is **Aran's** proposal, relayed by Tom. The doubling-time, doubling-the-reps,
longest-possible-phrase defaults and the bottom-nav placement hunch are **Tom's**
own words.

Fast is a **rename, not a retune** — every one of the current normal-mode
parameter values carries over unchanged. Easy is new, seeded from Fast, and
tuned by hand by Tom in `/admin/configs/speaking`.

## What is live now

| Row | State |
|---|---|
| `fast_mode` | **NEW.** Byte-faithful copy of `normal_mode` + two new fields at no-op values. |
| `easy_mode` | **NEW.** Seeded from Fast, retuned per the values below. |
| `normal_mode` | **Retired but present.** Live fallback for `fast_mode` until the player ships. |
| `turbo_boost` | **Retired but present.** No longer referenced by Popty code. |
| `script_shape` | Unchanged. Still the global base every mode layers over. |

### Deliberate deviation from the literal word "deleted"

The brief said Turbo is deleted, and it is — from all Popty code and the whole
admin UI. But the two **database rows** are left in place, because a live
deployed player is reading `algorithm_config` right now and renaming a row out
from under it is a break. This is the make-before-break rule that exists because
the 2026-08-03 fra_for_eng purge deleted 31,310 rows before re-rendering and left
~2,000 course slots silent for two days.

Dropping the two rows is a one-line follow-up once the learner app is live on
production. **Tom can overrule this and have them gone today** — the full JSON
is recorded below, so the values are recoverable either way.

## The engineering problem this had to solve

Tom named the parameter families himself: "the space repetition patterns, how
many repetitions of each new item, on average what the cap length is and all
that sort of stuff."

Those lived in **two different places**. The pause/playback knobs were per-mode
(`normal_mode` / `turbo_boost`), but the script-shape knobs — `spacedRepOffsets`,
`maxBuildPhrases`, `useConsolidationCount`, `maxSpacedRepPhrases`,
`n1PhraseCount` — were **global**, in `script_shape`, not per-mode. Turbo only
ever expressed itself as a script-side *cull* (`fibKeep`/`buildKeep`/`useKeep`).

So Easy could not differ from Fast on repetitions at all. It needed **per-mode
script-shape overrides**, not just pause knobs.

### The layering rule

Each mode row carries an optional `scriptShape` block whose keys mirror the
global row. Global is the base; the mode's block wins per-key:

```
effective = { ...algorithm_config.script_shape, ...modeRow.scriptShape }
```

`fast_mode` ships an empty override, which is what makes its behaviour provably
identical to the old Normal mode. Defined once in `services/learning-modes.cjs`
and mirrored in the player's `generateLearningScript.ts` — Popty's Script View
and the learner must not diverge (prior art: `docs/voice-engine/script-divergence-report.md`).

### "Longest possible phrase" — the knob that did not exist

There was no phrase-length knob. What existed: BUILD and USE phrases are sorted
**shortest-first** by target syllable count and then truncated at the cap
(`services/learning-script-generator.cjs`, the two sort sites).

So the sort **direction** decides which end survives the cut. The new
`phraseLengthPreference` field on each mode row takes `'shortest'` (historic
default, Fast) or `'longest'` (Easy). It is a labelled pill pair on the admin
page. An unknown or missing value degrades to `'shortest'` — a bad hand-edit
gives today's script rather than a broken round.

## Seeded values for Easy — all of these are Tom's to retune

Reps doubled against Fast (Fast inherits the global values 3 / 7 / 2 / 12):

| Parameter | Fast (inherited) | Easy (seeded) |
|---|---|---|
| `n1PhraseCount` | 3 | **6** |
| `maxBuildPhrases` | 7 | **14** |
| `useConsolidationCount` | 2 | **4** |
| `maxSpacedRepPhrases` | 12 | **24** |
| `spacedRepOffsets` | global | *inherits global* |

Timing — "doubling time" read as a gentler, slower feel:

| Parameter | Fast | Easy | Note |
|---|---|---|---|
| `pause_boot_ms` | 2000 | **4000** | 2× |
| `min_pause_ms` | 1000 | **2000** | 2× |
| `max_pause_ms` | 15000 | 15000 | ceiling left as the ceiling |
| `playback_speed` | 1 | 1 | no explicit slower-speed knob found; left at Fast's |
| `phraseLengthPreference` | `shortest` | **`longest`** | |

No hard caps were breached: the generator reads these values straight from the
config with no clamping. The `adaptation_v2` row's `bounds` (buildCount ceiling
7, spacedRepCap ceiling 12) are the **adaptation engine's** runtime dials, not
validator limits on the scripted shape — worth knowing, because if adaptation is
switched out of shadow mode it would pull Easy's rounds back toward those
ceilings. Flagged, not acted on.

## Recovery — the retired rows in full

Recorded so the values survive the eventual row deletion.

### `normal_mode`

Default learning mode - full pauses, full spaced rep, all practice phrases

```json
{
  "debut_phrases_fraction": 1,
  "max_pause_ms": 15000,
  "min_pause_ms": 1000,
  "pause_assembly_lin": 3.5,
  "pause_assembly_quad": 75,
  "pause_assembly_threshold_ms": 750,
  "pause_base_ms": 0,
  "pause_belt_assembly": 0.95,
  "pause_belt_boot": 0.8,
  "pause_boot_ms": 2000,
  "pause_knee_ms": 1600,
  "pause_multiplier": 1.05,
  "pause_reference": "avg",
  "pause_tail_multiplier": 2,
  "playback_speed": 1,
  "skip_voice2": false,
  "spaced_rep_fraction": 1
}
```

### `turbo_boost`

Turbo mode - faster playback, shorter pauses, 1/3 spaced rep, half debut phrases

```json
{
  "buildKeep": 3,
  "debut_phrases_fraction": 0.5,
  "fibKeep": [
    0,
    1,
    2,
    4,
    6,
    8
  ],
  "max_pause_ms": 12000,
  "min_pause_ms": 1500,
  "pause_assembly_lin": 0.9,
  "pause_assembly_quad": 0,
  "pause_assembly_threshold_ms": 1111,
  "pause_base_ms": 0,
  "pause_belt_assembly": 1,
  "pause_belt_boot": 1,
  "pause_boot_ms": 2000,
  "pause_knee_ms": 1700,
  "pause_multiplier": 0.9,
  "pause_reference": "avg",
  "pause_tail_multiplier": 1.4,
  "playback_speed": 1.1,
  "skip_voice2": false,
  "spaced_rep_fraction": 0.33,
  "useKeep": 2
}
```

## Where the code is

- `services/learning-modes.cjs` — the mode set, the fallback chains, the layering rule, the comparator. One place.
- `services/learning-modes.test.cjs` — 15 tests; the load-bearing one asserts Fast's effective shape equals the global shape exactly.
- `services/learning-script-generator.cjs` — loads the mode row, layers the override, applies the comparator at both sort sites.
- `api/algorithm-config.js` — PATCH is now an **upsert**. It was a bare `.update().eq('key')` that 404'd for a key that did not exist, which made "add a mode" an engineering ticket rather than an admin action. `api/algorithm-config.test.js` pins the create path and the auth guards.
- `src/views/admin/SpeakingConfig.vue` — Easy/Fast switch, per-mode round-shape overrides, phrase-length pills.
- `scripts/learning-modes/create-mode-rows.cjs` — the row seeding, DRY_RUN-gated and skip-if-exists (gitignored workspace).
