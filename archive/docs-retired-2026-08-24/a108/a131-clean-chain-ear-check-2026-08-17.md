# A-131 — the click is in the voice: final ear check

**Date:** 2026-08-17 · Nothing repaired, trimmed, padded or de-clicked. No live clip touched.

---

## Listen — one question at the bottom

The original take you said sounds best:

https://watson-1.tail4968cb.ts.net/evidence/a131-tail-click-2026-08-17/nld-live-now.mp3

The same line on the new chain, with the compressor removed — this is literally what would ship now:

https://watson-1.tail4968cb.ts.net/evidence/a131-clean-chain-2026-08-17/nld-new-chain.mp3

---

## What your blind test told us

You said: "all good apart from 4 — had a tiny click."

Clip 4 was the exact xAI voice the Dutch pod is cast on, rendered raw, with **none** of our
processing on it at all. The other nine — five other xAI voices and four Azure voices, equally raw
— were clean.

So the click is baked into that one voice's output at source, in the bytes the provider hands us,
before our chain sees them. Our compressor was then lifting the clip's tail by about 12 dB, which
is what turned an inaudible cut into an audible click. Two things were true at once, and the
earlier doc was right about the amplification but wrong to imply that was the whole story.

## What the change does — and what it cannot do

The render chain now masters every clip without the compressor. That stops the amplification, so
the click should be far quieter or gone from the ear. On this take, measured the same way as
before — dB relative to the clip's own speech peak:

| | raw provider bytes | old chain | new chain |
|---|---|---|---|
| tail floor | −68.0 dB | −53.5 dB | −64.9 dB |
| loudness | −21.3 LUFS | −15.6 LUFS | −16.9 LUFS |

The new chain gives back 11 dB of tail. It costs 1.3 LUFS of loudness — clips are slightly quieter,
which is the trade already flagged and accepted.

What it **cannot** do is remove something that is already in the bytes we are given. If you still
hear it, the remaining lever is the **voice**, not the chain: recasting the Dutch pod off
`xai_247783ebdd51` onto a voice that renders clean. That is not done here and no replacement voice
has been picked — it is the next fork, and it is yours to call.

T-21 bulk rendering stays paused until this ear check passes.

---

**The question, one word: does the new-chain take pass your ear — yes or no?**
