# Do we need to record the natural phrases, or are the short ones enough?

**For:** Kai · **Date:** 2026-08-21 · **Scope:** read-only. No code changed, no DB writes, no audio
generated, no recordings touched.

---

## The short answer

**Record the natural pass. It is not the optional one — it is the audio learners actually hear.**

The slow pass is the scaffolding. The natural pass is the product. It is the other way round from how
it looks in the booth, and the code is unambiguous about it.

And on "are many of the phrases actually present in the course?" — **yes, all of them.** Every one of
the 496 lines in the Austrian German script is a real course sentence. There is not a single
throwaway line in the script.

---

## 1. What the natural take is actually for

Three separate jobs, all of them learner-facing.

**(a) It is the source the chunks are cut from.** `services/voice-engine/align.cjs:212`
(`alignTakePair`) aligns the **slow** take first, and uses it as *"the authoritative chunk map + QA
gate"* — a map of where the boundaries are. Then:

- if the natural read happens to carry real micro-pauses at those boundaries, chunks are cut straight
  out of the **natural** take (`naturalMethod: 'direct'`, :232–241);
- otherwise the slow take's boundary proportions are **transferred onto the natural take's** voiced
  span, and the chunks are still cut out of the **natural** take (`naturalMethod: 'transferred'`,
  :246–262);
- chunks are cut from the slow take **only when no natural take was uploaded** (:222–226).

So every spliced chunk a learner hears comes from the natural read whenever one exists.

**(b) It is played whole, unspliced, wherever it matches a course item.**
`services/voice-engine/synthesis-job.cjs:302–303`, in its own words:

> `// ---- PHASE: register whole-phrase natural takes` <br>
> `// A recorded whole-phrase natural take ALWAYS beats splicing it.`

**(c) Skipping it is a cliff, not a slope.** `services/voice-engine/splicer.cjs:53` sets
`cadencePreference = ['natural', 'slow']`, and a phrase must be spliced from exactly one cadence —
natural and slow segments are never mixed inside one phrase. So dropping the natural pass on *some*
lines doesn't degrade those lines a bit; any delivery phrase that needs one of those chunks falls
back to an **entirely slow-cadence splice** — deliberately-paused speech, reassembled and served as
if it were normal speech.

**What you could not drop instead:** the slow pass, taken alone, is also not skippable — without it
there are no pause boundaries and the aligner has nothing to transfer. Both passes earn their place,
but they earn it in opposite ways: the slow one is measurement, the natural one is the audio.

---

## 2. Are the recorded lines actually in the course?

Yes — 100% of them, checked two ways.

**The 22 takes Sasha has actually filed for `deu_at_for_eng`** (live DB, 2026-08-21): every one is
real course content — **15 are USE practice phrases, 7 are seed sentences.** None is a script-only
line.

**The full 496-line script** (real generator run, `generate-recording-script.cjs deu_at_for_eng`):

| where the line comes from | lines |
|---|---|
| `course_seeds` sentences | 426 |
| USE practice phrases | 56 |
| BUILD practice phrases | 14 |
| bare LEGOs / direct-record items | **0** |

There are no filler lines and, right now, **no bare-LEGO "short items" at all**. The set-cover hit
100% LEGO coverage using nothing but real sentences.

---

## 3. So where is the "short vs natural" split, really?

There isn't one in the script — there is only a length *range* within the 496 real sentences:

| script lines (n=496) | words |
|---|---|
| min | 2 |
| median | **8** |
| mean | 8.23 |
| p90 | 11 |
| max | 16 |

**1–3 words: 10 lines (2%) · 4–7 words: 180 (36%) · 8+ words: 306 (62%).**

The script is deliberately long-line-heavy, because a long line covers more LEGOs per take — that is
the 60.3% effort reduction the optimiser reports. Trading the long lines for short ones would mean
*more* recording, not less.

And the course those lines have to serve is long-line-heavy too:

| what a learner actually hears (seeds + BUILD + USE; component rows are skipped at runtime) | `deu_at_for_eng` | `fin_for_eng` |
|---|---|---|
| items | 11,919 | 13,056 |
| ≥4 target words | 9,609 (**80.6%**) | 10,026 (**76.8%**) |
| ≥6 target words | 4,827 (40.5%) | 4,437 (34.0%) |
| mean length | 5.30 words | 4.90 words |
| USE phrases alone | 6,567, mean 6.1 words, 96.9% are ≥4 words | 7,854, mean 5.7 words, 96.9% are ≥4 words |

The genuinely short material in the database is almost entirely `component` rows — 1,300 in Austrian
German, 1,732 in Finnish — and **components are never played to a learner**.

---

## 4. Where recording actually stands

`deu_at_for_eng`, live counts today:

| role | clips | human |
|---|---|---|
| target2 (Sasha) | 22 | **22** |
| target1 (Kai) | 12,513 | 0 — all TTS |
| known | 13,095 | 0 |

22 human clips against a ~12,500-item delivery corpus. This is the very start of the campaign, which
is exactly why the question is worth asking now rather than later.

---

## 5. The one thing here that IS a judgement call, not a fact

Everything above is settled by code and data. This is not:

**Is the 2-word tail of the script worth recording as full script lines?** Ten of the 496 lines are
2–3 words (`wos mechatst?`, `wos suachst'n?`). They cost two takes each like everything else, and a
2-word line's slow pass is nearly pointless — there is at most one boundary in it. Nobody has ruled
on whether those should be recorded as one natural take only. It is worth perhaps five minutes of
booth time across the whole campaign, so it is not urgent, but it is a real call and it is Kai's.

**Related, already open and bigger:** the chunk-size calibration for Austrian German — the recorded
chunks are half single words, and 278 of 1,248 LEGOs (22.3%) are not extractable as standalone chunks
from the script as it stands. That is written up separately in
`docs/slow-chunk-calibration/chunk-calibration-deu-at-2026-08-21.md` and awaits a ruling from Kai.

---

## Evidence and gaps

- Code read on branch `docs/gle-cn-lego-consistency-2026-08-21`, working tree, 2026-08-21.
- DB figures are live queries against the production Supabase, 2026-08-21.
- Script figures come from a real read-only run of the wired optimiser, not a reimplementation.
- **EXPLICIT GAP: no audio was listened to.** Every judgement here is structural — what the code
  routes where, and what the tables contain. Whether a slow-cut splice actually sounds bad to a
  listener is Kai's ear, not mine; I have only shown that the pipeline treats natural as primary.
- **EXPLICIT GAP:** `fin_for_eng` currently has essentially no audio linked at all (2 known clips,
  0 target). Its 114 human takes from Kai's August sessions predate the script-filing fix
  (`docs/post-mortem-script-take-never-filed-2026-08-19.md`) and I did not verify whether they have
  since been recovered.
