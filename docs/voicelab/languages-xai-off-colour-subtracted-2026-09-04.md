# Voice Lab · Languages — xAI off the screen, colour down to one meaning

*2026-09-04. Tom, at the screen: it "still presents xAI as a live provider", and
"it's also colour nightmare times".*

## Before

![Before](https://watson-1.tail4968cb.ts.net/evidence/voicelab-languages-2026-09-04/before.png)

An "xAI · retiring 28" chip in the live provider row. Red xAI badges on nine
language rows. A bare "azure" in IF RE-RENDERED for every language. And red
three times over on one row — for the status word *uncast*, for the `0 / 2`
count beside it, and again for a provider badge that only meant "provider".

## After

![After](https://watson-1.tail4968cb.ts.net/evidence/voicelab-languages-2026-09-04/after.png)

## What changed

**xAI is off the live screen, and its audio is still named.** It is gone from
the "In use now" filter row and from the live provider badges. It is *not*
deleted: retirement is from selection only, the clips keep playing, and voice_id
is part of clip identity. So the fact is demoted — a dashed, dimmed
`xAI 13 · historic` pill on the row, and its own quiet **Historic** filter line
reading "retired provider · audio already rendered, nothing new renders on it".
The filter still works, so "which languages still hold xAI audio?" is still one
tap. Nothing in clip identity, voice-id spelling or any read path was touched.

**IF RE-RENDERED says why.** The column was never hardcoding "azure" — it asks
`services/shared/tts-provider-policy.cjs`, the same module the render path asks.
What it was missing was the policy's own cause. It now reads:

> **Azure**
> no Cartesia voice cast

with the policy's full sentence on hover. Three causes exist and the column
distinguishes them: *no Cartesia voice cast* (the ladder tried Cartesia and fell
through), *Cartesia does not cover it* (Galician, Irish, Gaelic — the vendor
does not publish the language), and *human-recorded — no TTS* (Welsh, Breton).

**The honest number: zero languages resolve to Cartesia today.** Every synthetic
language answers Azure; the human-voice languages answer Human. The reason is in
the policy itself — the estate's one Cartesia voice (`tom_001`) carries
`autoCast: false`, deliberately, because auto-assigning Tom's own clone to every
English line is a casting decision with his name on it. Until a voice is cast
with `autoCast: true`, or a DB-backed Cartesia voice map is passed in, Cartesia
has nothing to offer and the ladder falls to Azure. **Casting, not coverage, is
what is missing** — which is now what the screen says.

**Colour means one thing.** Six statuses wore five hues; providers wore three
more; the count wore red/amber/green. Colour now carries **a complete cast**,
and nothing else. Everything else is drawn, per the doctrine already written
into `src/assets/ui-tokens.css` (2026-09-02):

| state | treatment |
|---|---|
| complete | green, filled — the one measured fact colour is spent on |
| partial, human | solid, filled, ink |
| uncast, no Cartesia, known only | dashed, unfilled, dimmed, text still in ink |
| `2 / 2` | solid, heavy · `1 / 2` solid, plain · `0 / 2` dimmed |
| provider badge | ink and grey — a provider is not a measurement |
| retired provider | dashed and dimmed, labelled *historic* |

No fact left the screen with the paint: the status word, the counts, the
human-recorded warnings and the slot detail are all unchanged.

## What was deliberately left alone

The clone panel's own hues (consent state, clone-source chips) — a different
surface, and job #443 is live in it. The page chrome above the table (the pink
mode switch, the amber blast-radius banner) lives in `VoiceLab.vue`; this was a
subtraction on the Languages table, not a redesign.

## Verification

- `node services/voicelab/registry.default-render.test.cjs` — 4/4, locking that
  the provider stays policy-derived and the cause tracks it.
- Screenshots above at 1440px against the real API.
