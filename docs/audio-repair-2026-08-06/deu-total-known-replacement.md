# German known side — total replacement, and what your ear caught that four checks did not

**2026-08-06, 21:00Z.** Answering the two screenshots and the four tracers.

---

## Play this

**German, from the start, through the first two or three minutes.** Everything you named is on new
audio. If anything still sounds rushed, it will be past that point, and it is being rebuilt as you read.

---

## What is done

**Seeds 1-10 known side: 324 of 324 slots on the current generation. Zero exceptions.**

That is the whole known side of where you were listening — phrase prompts, lego prompts, seed
prompts and presentation lines, enumerated from the course structure itself, not from any staleness
test. Every one now resolves to an object rendered today, on a versioned URL, with the course audio
stamp bumped so your device drops its cached list.

All six clips you named are in that set, and I fetched the bytes the dev app actually hands out for
each of them:

| what you heard | was | now |
|---|---|---|
| I want to learn as often as possible | 1.70s | **2.18s** |
| I want to speak German as often as possible | 2.33s | **2.57s** |
| I want to learn how to speak as often as possible | — | **2.88s** |
| I'm trying to learn something as often as possible | 2.09s | **2.74s** |
| I'm trying to learn how to speak as often as possible | — | **3.10s** |
| I want to learn now how to speak as often as possible | — | **3.22s** |

Seventeen "as often as possible" clips exist in seeds 1-10. All seventeen are current generation,
all seventeen fetched and measured from dev, all on `.v2`/`.v3` URLs. Dev and prod return
byte-identical files — I checked the hashes, not the database.

## What is still running

**16,110 of 17,128 known-side slots are not yet replaced** — 14,000-odd distinct clips. A rebuild is
running now, in rounds, re-deriving what is left from the database each round so a restart never
repeats work. Nothing is deleted; every old object is retained.

**The floor is about seven and a half hours, and it is not money.** It is this machine's CPU. Every
clip is rendered, then listened to by whisper before it is allowed anywhere near the course, and
whisper is what saturates eight cores. Twelve parallel renderers move at the same rate as six —
load average 21 on 8 cores — so throwing more processes or more agents at it makes it slower, not
faster. That is the honest floor rather than a compromise: the only lever that would genuinely cut
it is dropping to a smaller whisper model, which trades away the one check that catches a clip
rendered in the wrong language. I have not taken that trade unasked.

You do not need to wait for it. Seeds 1-10 is where you listen and it is finished.

## Why the last four passes missed these

Every sweep so far, including this morning's 57-slot one, defined "stale" as *the row's text carries
the `::superseded-regen` marker*. Your two screenshot clips never carried it. They were revision 1,
untouched since February, and no marker, no file-age test and no tail-decay test put them in scope.

But the deeper problem is that **the defect is not visible to any check we had.** I fetched both
clips and ran them through the same whisper gate the pipeline uses:

- "I want to learn as often as possible" → transcribed **perfectly**, every word, CER 0, PASS.
- "I want to speak German as often as possible" → transcribed **perfectly**, CER 0, PASS.

Nothing was missing. They were just *fast* — 1.70s for a sentence the current generation delivers in
2.18s. A transcription check cannot hear pace, so it waved them through, and so would have any
sharper definition of "stale" built on the same evidence. That is why the enumeration approach kept
failing and why replacing everything is the right shape of the job.

## So you never have to play-test for this again

There is now a tool that measures what your ear measured: `tools/audio-pace-gate.cjs`. It fits how
long the *current* generation takes to say text of a given length — robustly, per role, so one bad
take cannot bend the line — and fails any clip materially faster than that. It is calibrated by the
voice's own behaviour, not by a number someone picked.

On the German known side it reports the current generation as **very consistent** (its own 2nd
percentile sits at −14%), and against that yardstick **3,418 of 16,666 clips — 21% — are rushed**.
That is the size of what your ear was sampling.

One thing I have written into the tool in large letters: it is an **output check on a finished set,
never a selector for what to replace**. Wiring it the other way would make its own blind spots the
next stale set, which is exactly how we got here.

## "And will be across all of them" — what I can and cannot say

I ran the gate across every for-English course. **I cannot confirm or refute this yet, and here is
the specific reason rather than a number dressed up as one.**

The estate's English known side is not one generation. It is a patchwork of different voices —
Azure Sonia, Ryan, Libby, Hollie, several ElevenLabs ids, human recordings in the Welsh courses —
and German is the only course that shares none of them. So there is no current generation anywhere
else to measure against, and German's cannot be borrowed: pace is voice-specific.

What I could measure is each course against *its own* central pace, which finds clips rushed
relative to their siblings but is blind to a course that is uniformly rushed. On that weaker check:

| course | known clips | rushed vs its own siblings |
|---|---|---|
| cym_s_for_eng | 7,307 | 1,305 (18%) |
| cym_n_for_eng | 6,998 | 671 (10%) |
| ara_sy, bul, cat, dan, ara_eg, ell | 631–10,555 | 1–3% each |
| afr, ara_lb, ben, ces, bre | 217–7,991 | under 1% |

Read that carefully: it does **not** say the other courses are fine. It says they have no *internal*
inconsistency of the kind German had. The Welsh numbers are almost certainly the mix of human and
synthetic recordings rather than damage. **The only way to actually test your claim is to rebuild a
reference generation in one other course and measure against it** — a few hundred clips in, say,
fra_for_eng would settle it. I have not started that; it is outside this run's scope and I said I
would report before expanding.

Three courses could not be measured at all — `cor_for_eng` and `deu_ch_for_eng` have no usable
clips, and `ara_for_eng`, `deu_at_for_eng` timed out on the query. Gaps, stated as gaps.

## Hygiene

Make-before-break throughout: every clip was rendered and verified before any link moved, links swap
atomically at a bumped revision so the URL changes, and **nothing was deleted on this pass** — every
superseded object is retained. Per-slot logs are in the repo alongside this note. One accident worth
recording: parallel `propose` runs of equal size collide on their log filename, so accept manifests
are now rebuilt from the database's pending-candidate table rather than from those logs.

---

**Play German from the start.** That is all I need from you.
