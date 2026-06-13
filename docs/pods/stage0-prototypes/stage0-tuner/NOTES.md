# Stage-0 Tuner — Irish pod-0 g3

A single self-contained HTML panel that lets the founder tune every timing and
structure parameter of the **Stage 0** listening-pod introduction by ear (live
audio, Web Audio API) and export the resulting config.

- **Output:** `~/Desktop/stage0-tuner.html` (~270 KB, all audio embedded as
  base64 data URIs, no external deps, opens offline).
- **Sentence:** `gle_for_eng:pod-0` global_order 3 (speaker: Neighbour)
  - target: `Táim go maith, go raibh maith agat. An bhfuil tú ag dul chun oibre?`
  - known: `I'm very well, thank you. Are you going to work?`
- **Build:** `node scripts/experiments/stage0-tuner/render-clips.cjs`
  (READ-ONLY DB; reuses cached clips, renders only NEW ones) → `clips.json`,
  then `node scripts/experiments/stage0-tuner/build-html.cjs` → inlines clips
  into `template.html` → `~/Desktop/stage0-tuner.html`.

---

## 2026-06-13 upgrade — three changes

### 1. Granularity tops out at the INTENTION, not the whole row

The row is **two distinct intentions / learnt chunk-units**, each owning a slice
of atoms. **Atoms fuse only within their own intention; the two intentions are
never merged into a whole-row unit, and there is no whole-row tier.**

| Intention | Atoms | Natural take (top granularity) | Translation |
|-----------|-------|--------------------------------|-------------|
| **I1** | Táim go maith · go raibh maith agat | `Táim go maith, go raibh maith agat.` | I'm very well, thank you |
| **I2** | An bhfuil tú ag dul · chun oibre | `An bhfuil tú ag dul chun oibre?` | are you going to work |

- The **top granularity unit = the intention, played as its own NATURAL take** —
  a full-utterance Colm clip, **never atoms concatenated**. (Founder data point:
  the chunked "are you going to work?" sounded markedly less natural than the
  same words as a whole utterance, so the intention unit must be a natural take.)
- The old **whole-row natural take + whole-row translation are dropped**.
- Intention translations = the existing pair glosses
  ("I'm very well, thank you" / "are you going to work").

**Granularity schedule is DERIVED from atoms-per-intention** so it generalises:
`fusionStages(maxAtoms)` walks group sizes 2, 4, … up to the intention, capping
the final stage at the intention (one natural take):

| max atoms / intention | derived schedule (after explainer + plain-atom tiers) |
|-----------------------|--------------------------------------------------------|
| 2 | intention |
| 3 | groups of 2 → intention |
| 4 | groups of 2 → intention |
| 5 | groups of 2 → groups of 4 → intention |

So for these 2-atom intentions the tier list self-scales to:
- **0:1** Explainer (atoms) · spoken cue + gloss · ×1
- **0:2** Translation (atoms) · plain translation, no cue · ×1
- **0:3** Intention (natural take) · meaning = intention translation · **×2**
  (first fusion gets the extra visit)

Longer intentions would insert "groups of N" tiers between 0:2 and the intention
tier automatically.

### 2. Speed ramp across Stage 0 (replaces the single global rate slider)

Each tier has a **playback speed** that ramps gently from **ramp start** (first
enabled tier, slowest) up to **ramp end** (last enabled tier). Full 1.0× is
reserved for later stages — Stage 0 stays under it.

- **Ramp start** default **0.70**, **Ramp end** default **0.90** (number inputs,
  range 0.50–1.00).
- Speeds auto-distribute **linearly across the *enabled* tiers**: with 3 enabled
  tiers and 0.70→0.90 you get 0:1=0.70, 0:2=0.80, 0:3=0.90. Disabling a tier
  re-distributes the ramp across the remaining enabled tiers.
- **Per-tier override**: ± on a tier's speed control pins that tier (a "pin"
  badge + "↺ ramp" button to release it back to auto). "Re-distribute" clears
  all overrides so the ramp fully governs.
- Applied via `AudioBufferSourceNode.playbackRate` for both single-tier play and
  the full arc. The scheduler is **speed-aware**: each tier's score time is
  converted to real time at that tier's resolved speed (between-tier gaps are
  real-ms, unaffected by speed).
- Per-tier resolved speed is included in the exported config.

### 3. Everything else kept

Timing sliders, the T·M·T·T pattern editor, visits-per-tier stepper, per-tier
enable, per-tier + full-arc play, config export, consistent Colm (target) /
Sonia (meaning) voices.

---

## Parameter defaults

### Timings (ms)
| Param | Default | Meaning |
|-------|---------|---------|
| `targetToMeaning` | **240** | gap target → meaning (within a unit) |
| `meaningToTarget` | **240** | gap meaning → target |
| `targetToTarget` | **240** | gap target → target |
| `betweenUnits` | **620** | gap between units in a tier |
| `betweenTiers` | **900** | gap between tiers (real ms; speed-independent) |
| `afterCue` | **380** | settle after the 0:1 cue |
| `fusionPairs` | **140** | fusion gap inside a 2-atom group (pair stage) |
| `fusionWhole` | **70** | fusion gap inside a ≥4-atom group stage |

> With 2-atom intentions the fusion never actually fires at the intention tier
> (the intention is a single natural take, no live fusion). `fusionPairs`/
> `fusionWhole` are kept for longer intentions where "groups of N" tiers appear.

### Speed ramp
- `ramp.start` **0.70**, `ramp.end` **0.90** (Stage 0 caps below 1.0×).
- Per-tier `speedOverride` default `null` (follows the ramp).

### Pattern (per chunk-unit)
- **`T, M, T, T`** — each beat toggleable T↔M; beats addable/removable.

### Visits per granularity (editable per tier)
- 0:1 ×**1**, 0:2 ×**1**, first fusion tier ×**2**, later tiers ×**1**.
- Each tier also has an **enable/disable** toggle (skipped in the arc + drops
  out of the speed ramp distribution).

## Voices (one consistent voice per side)
- **cast / target** (every atom target + both intention takes) = `ga-IE-ColmNeural`.
- **known / meaning / translation / cue** = `en-GB-SoniaNeural`.
- The two **intention natural takes are NEW Colm renders** of the full
  intentions; the old whole-row clips were dropped.

## Embedded clips (13; this run made **2** Azure calls)
`cue` · `atomTarget0–3` (Colm) · `atomGloss0–3` (Sonia) · `intentionGloss0–1`
(Sonia — same as the prior pair glosses) · **`intentionTake0–1`** (Colm — the two
NEW natural-take renders). The reuse layer in `render-clips.cjs` keys clips by
text+voice and only hits Azure for clips not already in `clips.json`.

## Exported config shape (`algorithm_config.pods.stage0`)

```json
{
  "algorithm_config": { "pods": { "stage0": {
    "sentence": { "course": "gle_for_eng", "pod": "gle_for_eng:pod-0", "globalOrder": 3 },
    "intentions": [
      { "id": "I1", "atoms": [{"target":"Táim go maith","known":"I'm very well"},
                              {"target":"go raibh maith agat","known":"thank you"}],
        "targetText": "Táim go maith, go raibh maith agat.", "translation": "I'm very well, thank you" },
      { "id": "I2", "atoms": [{"target":"An bhfuil tú ag dul","known":"are you going"},
                              {"target":"chun oibre","known":"to work"}],
        "targetText": "An bhfuil tú ag dul chun oibre?", "translation": "are you going to work" }
    ],
    "granularity": {
      "topsOutAt": "intention", "wholeRowFusion": false, "maxAtomsPerIntention": 2,
      "schedule": ["atoms (explainer)", "atoms (translation)", "intention (natural take)"]
    },
    "pattern": ["T", "M", "T", "T"],
    "speedRamp": { "start": 0.7, "end": 0.9, "perTierResolved": { "0:1": 0.7, "0:2": 0.8, "0:3": 0.9 } },
    "tiers": {
      "0:1": { "granularity": "atoms",     "meaningSource": "explainer",            "visits": 1, "enabled": true, "speed": 0.7, "speedOverride": null },
      "0:2": { "granularity": "atoms",     "meaningSource": "translation",          "visits": 1, "enabled": true, "speed": 0.8, "speedOverride": null },
      "0:3": { "granularity": "intention", "meaningSource": "intentionTranslation", "visits": 2, "enabled": true, "speed": 0.9, "speedOverride": null }
    },
    "timings": { "targetToMeaning": 240, "meaningToTarget": 240, "targetToTarget": 240,
                 "betweenUnits": 620, "betweenTiers": 900, "afterCue": 380, "fusionPairs": 140, "fusionWhole": 70 },
    "voices": { "cast": "ga-IE-ColmNeural", "known": "en-GB-SoniaNeural" }
  } } }
}
```

## Panel UX
- **Transport** (sticky): big play = "play full arc" (every enabled tier × its
  visit count, in order, at each tier's ramped speed). Shows the playing tier,
  its speed, status, progress, time. On-screen tier labels highlight as it plays
  — no spoken markers.
- **Two intentions** panel: shows I1/I2 as columns with their atoms and their
  natural take (the top-granularity unit).
- **Tier rows:** per-tier play, visits stepper, enable toggle, **speed control**
  (ramp value or pinned override), and a fusing-chips visual grouped by
  intention (atoms → the intention's natural take).
- **Speed ramp** panel: ramp start/end inputs, Re-distribute, and a live
  resolved-per-tier readout.
- **Unit pattern editor:** click a beat to flip T↔M; +/remove beats.
- **Timing sliders:** live ms readout on every slider.
- **Config:** Export / Copy / Reset-to-defaults.

## ffmpeg hazard
Almost all assembly is client-side Web Audio (scheduled buffers), avoiding the
ffmpeg 7.1.1 `acrossfade` segment-drop hazard entirely. The only server-side
ffmpeg is per-piece re-encode (no concat, no acrossfade).

## Founder confirmations
- **Ramp 0.70 → 0.90** across Stage 0 (1.0× reserved for later). Tune start/end
  and per-tier overrides by ear — these are the most audible new controls.
- **Intention takes are NEW Colm renders** of the full intentions — listen to
  confirm they sound natural (the whole point of the change). The chunked
  versions are gone.
- **0:3 (intention) visits = 2**, others 1. Editable per tier.
- **Pattern default `T M T T`** (no meaning-doubling, per Tom 2026-06-13).
- **Pair-gloss / intention-translation wording** ("I'm very well, thank you" /
  "are you going to work") carried over from the prior render.
- The granularity schedule **derives from atom-count-per-intention**, so a
  3+-atom intention would auto-insert "groups of N" tiers before the intention
  tier — confirm that generalisation matches your mental model.
