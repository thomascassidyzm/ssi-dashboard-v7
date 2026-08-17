# A-133 Part B — per-voice raw-tail screen for T-21 casting

**Date:** 2026-08-17 · Design + working script. Not run across the T-21 pool — that is a bulk
render and it is Tom's call.

Tool: `tools/a108/a133-voice-tail-screen.cjs`
Sibling: `tools/a108/a133-tail-probe.cjs` (Part A — the render-time treatment; supplies the
envelope/event primitives this screen imports)

---

## The commission

Tom, 2026-08-17: *"I think the trick is to not use voices that generate clicks right?"*

T-21 is casting voices for 41 languages. A clicking voice caught **before** casting costs one short
render. Caught **after** casting it costs a whole language's audio, plus the make-before-break dance
to replace it. So the screen is worth building even if it only catches the obvious cases.

## What the signal actually is

The A-131 blind test proved a voice can ship a click in the provider's own bytes with none of our
processing on it. A-133 then measured what that click *is*, and it is not what everyone assumed.

It is **not** an end-of-file hard cut. On `xai_247783ebdd51` the file ends in ordinary decay and
then true digital silence. The click is **one or more isolated impulses sitting in the dead room
tone after the last phonation** — 261 ms and 380 ms after speech ends, on a clip whose room floor is
−66.5 dB.

That reframing matters for the screen: measuring the level at the last non-silent sample (the
obvious "hard cut" test) finds **nothing** on this voice. It reads −70.9 dB, indistinguishable from
the clean voices. A hard-cut screen would have passed the one voice we know is broken.

## The measurement

All levels are **dB relative to the clip's own speech peak**, never absolute dBFS — xAI clones run a
crest factor around 19 dB, so a fixed floor means a different thing on every voice.

1. Decode the **raw** provider bytes to mono 44.1 kHz. No processing of ours is applied first; the
   point is to judge the voice, not the chain.
2. Build an envelope of **5 ms window peaks**.
3. Group windows above **−45 dB** into events, merging across gaps of ≤20 ms.
4. Label each event: **speech** if ≥40 ms of it is actually above threshold, otherwise **impulse**.
   The summed-energy test is load-bearing — a decaying tick rings across a 45 ms *span* on only
   20 ms of real energy, and span-based counting mislabelled the first Dutch tick as speech on the
   first pass.
5. **End of speech** = the end of the last speech event.
6. **Room floor** = median of 2 ms window peaks over `[eos+30 ms, eos+130 ms]` — a fixed physical
   region, so it is comparable across clips of different lengths.
7. **Verdict**: any post-speech impulse **≥ +20 dB over the room floor** ⇒ `suspect`. Otherwise
   `pass`. No sustained speech at all ⇒ `unreadable` (failed render).

## Where the +20 dB threshold comes from

Measured on the four voices A-133 rendered — one known positive (Tom's blind-test slot 4) and three
known negatives:

| voice | room floor | post-speech impulses | worst, over floor | verdict |
|---|---|---|---|---|
| `xai_247783ebdd51` (Noor) — **known clicker** | −66.5 dB | 2 | **+41.7 dB** | suspect |
| `xai_58d27475085e` (Femke) | −83.4 dB | 0 | — | pass |
| `xai_a13662ba951c` (Thijs) | −54.3 dB | 0 | — | pass |
| `azure_nl-NL-FennaNeural` | −57.9 dB | 0 | — | pass |

The separation is +41.7 dB against literally nothing. +20 dB sits roughly halfway down that gap and
is a long way clear of both sides. It is not a tuned number and it does not need to be — there is no
borderline case in this evidence to tune against.

Running `node tools/a108/a133-voice-tail-screen.cjs` with no argument re-screens exactly these four
and asserts the expected verdicts, so the shape is regression-checked without new spend.

## How confident to be — read this before trusting an output

**n = 1 known positive, 3 known negatives, one line, one language.** That is the whole evidence
base. Be honest about what follows from it:

- It screens the **obvious** case: a voice that fires a loud, isolated tick into dead air. On that
  case the margin is enormous and I'd expect near-perfect agreement with an ear.
- It **will miss** marginal ones: a tick only a few dB over floor; a tick landing *during* speech,
  where it is masked by the envelope test; a voice that only ticks on some lines or some lengths
  (one render per voice is one sample — a voice that clicks 1 line in 5 has a 20% chance of being
  caught).
- It says nothing about any other voice defect — breathiness, hiss, pace, gender, pronunciation.
- A `suspect` verdict means **"a human listens before this voice is cast"**. It is never an
  automatic reject, and it must never be wired to reject one.

The estate has already been burned once by a tail detector taken more seriously than its precision
justified: `flagTailDefect` is 9% precise by ear and used to drive a repair that amputated taught
words from live German course clips (`docs/DECISIONS.md`, 2026-08-05). This screen is read-only by
construction — it renders, measures and prints, and modifies no audio anywhere — but the lesson that
matters is the epistemic one, not the code one. Report the number next to the verdict, always, so a
human can overrule it with the evidence in hand.

## Cost of a full T-21 screen

- **Renders**: one short line (~2–3 s of speech) per candidate voice. The T-21 casting pool is
  roughly 250 voices across 41 languages (xAI's per-language lists plus the Azure candidates), so
  ~250 renders.
- **Money**: ~$0.002 per xAI render, less on Azure ⇒ **~$0.50 total**.
- **Wall clock**: at the default concurrency of 4, **10–15 minutes**.
- **Output**: a `screen.json` plus the raw mp3s kept on disk, so every `suspect` can be listened to
  immediately rather than re-rendered.

Use each voice's own language and a line with a clear phrase-final consonant — a click hides behind
a trailing vowel's decay. The Dutch probe line (`Ik wil graag een glas bitter, alstublieft.`) is a
good shape: sentence-final, two syllables of decay, no trailing breath.

**Not authorised by this document.** A 250-render sweep is bulk rendering and Tom rules on it as its
own piece of work. Nothing in A-133 unpauses T-21.

## Open question for Tom

If the screen flags a voice already cast on a live pod, the answer is a recast under
make-before-break, not a repair — but no replacement-voice policy exists for "the clean voice of the
right gender in that language is already taken". Worth a ruling before the sweep runs, not after.
