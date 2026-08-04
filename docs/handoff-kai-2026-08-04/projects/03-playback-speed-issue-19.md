# Player target-clip playback speed — GitHub issue #19

**Status:** Root-caused by reverse-engineering the **deployed (minified) player bundles**. Needs
**confirming against `ssi-learning-app` source** — which is outside Kai's local workspace scope
(hence the issue was filed on the dashboard repo for Tom / whoever has learning-app access). This
belongs to **watson-1's remit** (it is scoped to ssi-learning-app too).

## Symptom

"Target audio plays too fast" — the intended early-seed slowdown (target clips ramped slower for
beginners) lands at **1.0×** in the deployed build. Known/presentation clips always play native by
design; only **target** clips are meant to slow.

## What the deployed player actually does

- `audio.playbackRate = cycle.playbackSpeed × getPlaybackSpeedMultiplier(cycle)` — target clips only.
- `getPlaybackSpeedMultiplier` DOES read `voice_config.target_speed.global_speed` (0.95) from its
  nested location, and the seed ramp exists: `seed<8 ? 0.8 : seed<20 ? 0.9 : seed<40 ? 0.95 : 1`.
- **BUT the whole `global_speed × ramp` path is gated behind a flag (`Et.value`) that starts `false`
  and is only flipped by a UI toggle.** While off, the multiplier is `1`.
- So the only slowdown that can apply is whatever `cycle.playbackSpeed` already carries from the core
  scheduler (`ps08x=0.8` tags etc.).
- **Net effect in the deployed build: both slowdown paths land on 1.0× for target clips** — one
  because the toggle defaults off, the other likely because the scheduler isn't tagging the ramp.

## Two questions to confirm in ssi-learning-app source

1. Is the flag (`Et.value`) **meant to default off**? If the `global_speed × ramp` slowdown only
   applies when a user finds and flips a toggle, that's the bug — it's expected to be automatic.
2. When the flag is off, does `cycle.playbackSpeed` carry the seed ramp — does the core scheduler
   (`@ssi/core`) actually assign `ps08x=0.8` to early-seed target clips? If not, nothing slows at all.

## Exact next step

- Confirm both questions against `ssi-learning-app` source (`player-vue` composables +
  `@ssi/core` scheduler). Kai can supply the de-minified excerpts if useful.
- Likely fix is one of: default the flag on, or have the scheduler tag the early-seed ramp so the
  ungated path slows regardless of the toggle.

## Meta-point Kai raised (worth acting on)

This trace had to be done by reverse-engineering minified bundles because `ssi-learning-app` was
outside Kai's local workspace. **Read-only access to that repo would have answered it in minutes.**
watson-1's Command Surface *is* scoped to ssi-learning-app — so this is now directly answerable
there. That's a large part of why the move is worth it.
