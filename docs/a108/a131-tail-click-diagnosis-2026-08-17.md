# A-131 — the end click: what it is, which step causes it, and one thing to listen to

**Date:** 2026-08-17 · **Method:** offline measurement + chain bisect. Nothing repaired, trimmed,
padded or de-clicked; no live clip touched.

---

## Listen first — one question at the bottom

Same line, same voice, same render. **A** is our chain exactly as it ships today. **B** is the same
render with **one processing step removed** — the compressor. Nothing has been added to B.

Take 1 — A, current chain:
https://watson-1.tail4968cb.ts.net/evidence/a131-tail-click-2026-08-17/take1-A-current-chain.mp3

Take 1 — B, compressor removed:
https://watson-1.tail4968cb.ts.net/evidence/a131-tail-click-2026-08-17/take1-B-compressor-removed.mp3

Take 2 — A, current chain:
https://watson-1.tail4968cb.ts.net/evidence/a131-tail-click-2026-08-17/take2-A-current-chain.mp3

Take 2 — B, compressor removed:
https://watson-1.tail4968cb.ts.net/evidence/a131-tail-click-2026-08-17/take2-B-compressor-removed.mp3

Take 3 — A, current chain:
https://watson-1.tail4968cb.ts.net/evidence/a131-tail-click-2026-08-17/take3-A-current-chain.mp3

Take 3 — B, compressor removed:
https://watson-1.tail4968cb.ts.net/evidence/a131-tail-click-2026-08-17/take3-B-compressor-removed.mp3

And the live original you said sounds best, for reference:
https://watson-1.tail4968cb.ts.net/evidence/a131-tail-click-2026-08-17/nld-live-now.mp3

**The question, one word: does B lose the click off — yes or no?**

---

## What the measurement says

### The click is not at the end of the file

Every clip — the live take, all three refused candidates, the Azure control — ends on an exact zero
sample, with tens of milliseconds of digital silence before EOF. The 8 ms boundary fade
(`ANTI_CLICK_FADE`) is doing its job, and it is doing it in a region that is already silent. It can
never touch what you heard, because what you heard is not at the boundary.

### The click is the provider's tail cut, amplified by our compressor

I rendered three fresh takes on the xAI cast voice and kept the **raw provider buffer** before any of
our processing. The raw tail looks like this, in 2 ms windows, dB relative to the clip's own peak:

```
raw:  … −67 −71 −70 −70 −68 −68 | −99 −99 −99 −99 …
                                 ↑ the noise floor stops dead, ~50 ms before EOF
```

xAI hands us a hard-truncated tail. The room tone does not decay — it is switched off, instantly, to
absolute digital silence. That happens on all three fresh takes, so it is systematic, not a one-off.

At −68 dB relative to peak, that cut is below audibility. Then our chain runs:

| take | raw tail floor | **A: current chain** | **B: compressor removed** | lift the compressor adds |
|------|---------------|---------------------|--------------------------|--------------------------|
| 1 | −69.5 dB | **−54.4 dB** | −66.8 dB | **+12.4 dB** |
| 2 | −66.0 dB | **−52.7 dB** | −64.3 dB | **+11.6 dB** |
| 3 | −68.8 dB | **−53.6 dB** | −65.5 dB | **+11.9 dB** |

(dB relative to each clip's own speech peak, median of 2 ms windows over the last 400–150 ms.)

`PRE_COMPRESS` — `acompressor=threshold=-24dB:ratio=8:...` plus its make-up gain — lifts the room
tone by **12 dB**, and then the provider's cut switches that lifted tone off in a single sample.
That is, precisely and literally, **a sharp switch off of a compression algorithm**. Your ear named
the mechanism before the measurement found it.

The limiter (`alimiter`) was bisected out separately and changes the tail floor by under 1 dB. It is
not the culprit. There is **no `silenceremove` step anywhere in this path** — the trim chains at
`audio-processor.cjs:896` and `pod-explainer-composite.cjs:154` belong to other paths and were not
involved. The loudnorm passes are measurement-only here.

### Why the live original does not click

Its tail **decays** — −55 … −70 … −73 … silence — instead of stopping dead. The provider gave that
render a natural ending, so there is no step for the compressor to make loud.

### One extra thing, for the record

The first refused candidate (`3BC86EF0`) also carries a genuine isolated transient: a 26 dB spike
124 ms before EOF, sitting well above the surrounding floor. That one is in the provider's raw audio,
not made by us. It is not being fixed — that candidate is discarded.

---

## The fix is subtraction, and the code for it already exists

`services/audio-processor.cjs` already has `normalizeAudioClean()` — the same chain with the
compressor and its make-up trick removed, written for the founder ruling of 2026-07-29 about "that
hissy mastering stuff", which is the same defect heard from the other side. Switching the render path
from `normalizeAudio()` to `normalizeAudioClean()` is a one-line change and removes a step. **No
repair, no trim, no pad, no de-click, no tail rewrite.** The `verify-tail-repair-mode` regression
guard passes untouched, and nothing in this pass goes near that machinery.

**Known cost, measured, not estimated.** The compressor exists to hit −16 LUFS on peaky voices. On
these takes:

| | A: current chain | B: compressor removed |
|---|---|---|
| output loudness | −15.6 LUFS | −16.8 / −17.3 / −17.1 LUFS |

So B lands **0.8–1.7 LUFS quieter** — not the 4–6 LUFS shortfall the code comment warns of for xAI
clones. Slightly quieter clips, a 12 dB quieter tail. That trade is yours to call, and the ear sample
above is the way to call it.

## Held pending that one word

Nothing in the render chain has been changed yet. The change is a one-liner and is ready to go the
moment you say B is clean.

**T-21 — the 41-language pod render — should be held until then.** It is waiting on your voice-cast
pick anyway, so the hold costs nothing; but if it runs on the current chain, every xAI clip it
produces gets the +12 dB tail floor and the same switch-off at the end.
