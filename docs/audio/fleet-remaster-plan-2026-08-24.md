# The fleet re-master — the plan, ready to fire

You said: *"It's probably good to do it now. But I think the A/B test will be good. It's a no-cost
change really so we should almost certainly do it."*

Agreed, and it is built. This is what it would do, what it costs, and the one thing in it that is
**not** free — which I want you to see before you fire it.

The A/B sample is here: **[Enzo is quieter — measured, and fixed](https://watson-1.tail4968cb.ts.net/d/599f1701)**

---

## What it would do, measured not projected

I dry-ran the real runner against live bucket bytes on four courses. This is the actual output, not
an estimate.

| course | clips sampled | need re-mastering | already on target |
|---|---|---|---|
| Romanian | 150 | 99% | 1% |
| Italian | 300 | 97% | 3% |
| Spanish | 150 | 80% | 20% |
| **German** | 150 | **27%** | **73%** |

German is the outlier for a good reason: the −15.5 band was originally derived from a 25-clip German
test, so German is the one course already living where the target is. Everything else drifted.

**Estate-wide that is roughly 76% of 2,476,446 clips — about 1.9 million clips actually touched.**

The effect, from the Italian dry run of 300:

| | before | after |
|---|---|---|
| median | −16.4 LUFS | **−16.0** |
| **spread, p5–p95** | **3.00 dB** | **0.40 dB** |
| converged | — | 289 of 290 |

That collapse from 3 dB to 0.4 dB is the whole product. It is consistency, which is what you asked
for.

---

## What it costs

**Money: essentially nothing, you were right.** No TTS, no provider call — it re-processes bytes we
already own. About **$9.50** in S3 PUTs for 1.9M objects, and roughly **55 GB** of extra storage
because the old objects are retained as the rollback ledger, call it **£1.30 a month**.

**Time: about 3 to 6 days** of continuous background running. Measured throughput is 7.8 clips/sec at
4 concurrent ffmpeg processes; with the S3 and database writes on top, call it 5/sec sustained. It
runs on our own hardware at a third of the box, so it costs nothing but patience, and it is resumable
— a kill picks up where it stopped rather than starting again.

---

## The one thing that is NOT free — please read this bit

For a re-mastered clip to actually reach a learner, its **address has to change**. That is not a
design choice, it is the only mechanism that works, and it was proved on a real browser on
2026-08-18: swap the bytes without changing the address and the returning learner keeps the old audio
forever — zero bytes off the network, the cache is not even consulted for freshness.

So the address must change. **And a changed address means every learner re-downloads every clip we
touch.** Their offline cache of that course is orphaned in one go.

At ~29 KB a clip, a learner who has a course cached offline re-downloads roughly **0.9–2.3 GB**
depending on the course. That is the true cost of the pass, and it lands on learners' data rather
than on us.

It does not change my recommendation — but "no-cost" is right about our money and not quite right
about their bandwidth, and you should fire it knowing that rather than find out from a support email.

**Two things blunt it**, both already in the runner:

- Clips already on target are **skipped entirely** — no new bytes, no address change, nothing to
  re-download. That is 73% of German, 20% of Spanish, and it is why the estate figure is 76% and not
  100%.
- It runs **course by course**, so the re-download is spread over weeks rather than landing on
  everyone at once.

---

## Why it is safe to run

Every one of these is code, not a promise, and each was earned by a past failure:

- **Make before break.** New S3 key, uploaded first, HEAD-verified in the bucket, and only then is the
  row pointed at it. **The old object is never deleted** — it is kept as `previous_s3_key`, which is
  the rollback ledger. The August 3rd French purge deleted 31,310 rows *before* re-rendering and left
  ~2,000 slots silent for two days; this is the shape that cannot do that.
- **The revision bump is asserted, not assumed.** Every write goes through the one reviewed swap
  module, which re-reads the row afterwards and throws if the bump did not take.
- **It aborts on drift.** If another writer has touched a clip between our read and our write, that
  clip is skipped and logged rather than overwritten. We never land on top of somebody's fresh render.
- **It refuses to replace bytes it could not measure.** An unreadable clip is left alone.
- **Dry by default.** `--apply` is not the default and never will be.
- No deletes, no TTS, no text, no voice, no casting. 14 unit tests on the safety decisions.

---

## How I would run it

1. **Italian Pod 1 first** — the ~900 clips you were listening to. Small, and it is the one you can
   check by ear immediately.
2. **Verify on your actual phone** that the new bytes arrive — not inferred, played.
3. **The rest of `ita_for_eng`**, then the other 81 released courses largest-first.
4. **Unreleased courses last**, or never — they reach nobody, and it is only 4% of the estate.

Each stage reports before/after spread and reconciles exactly: clips touched must equal clips logged.

---

## One recommendation, and it changes the order

**If you are going to say yes to lifting Enzo above 500 Hz, say so before this fires, not after.**

The phone-band tilt and the loudness fix are both applied at the same moment to the same clip. Doing
them in one pass costs one re-download. Doing them in two passes costs two — we would orphan every
learner's cache twice for what could have been a single change. That is the only real coupling in
this job, and it is worth a minute of your time now rather than a repeat pass later.

So the order I would like is: **listen to the A/B, tell me A or B on the tilt, and I fire one pass
that does everything.**

---

## What is ready right now

`tools/audio/fleet-remaster.cjs` on `main`, dry-run proven against live bytes on four courses, 14/14
tests green. It has never been run with `--apply` and will not be until you say so.

**One confirmation from you fires it.**
