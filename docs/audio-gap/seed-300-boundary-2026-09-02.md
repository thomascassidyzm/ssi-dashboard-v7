# The seed-300 audio boundary is deliberate

**2 September 2026. Read-only pass against the live database. Nothing was rendered, edited, deleted or moved.**

## The answer

**Deliberate.** Seed audio stops at seed 300 in those courses because **the course itself stops at seed 300** — the seeds beyond it were never decomposed, have no LEGOs, no practice phrases, and do not appear in the round map a learner walks. Audio was never rendered past 300 because there is nothing past 300 to render for.

It is not an unfinished render run. **No learner is affected today.**

## What settles it

Every course carries all 668 seeds of the master seed bank from the moment it is created. What varies is how far it has been *built*. The estate has exactly two build ceilings and almost nothing in between:

| Seeds decomposed | Courses |
|---:|---:|
| **300** | **59** |
| **668** | **35** |
| under 30 (mid-build) | 19 |
| other (267, 305, 313, 334, 467) | 5 |
| none | 12 |

Sixty-odd courses built to exactly 300 and thirty-five built to exactly 668 is a scope convention, not an accident.

For the 31 released courses whose *seed audio* stops at 300, the boundary is the same on every layer at once:

| | dan_for_eng | swe_for_eng | rus_for_eng | tha_for_eng | fra_for_eng |
|---|---:|---:|---:|---:|---:|
| Last decomposed seed | 300 | 300 | 300 | 300 | **668** |
| Last seed with a LEGO | 300 | 300 | 300 | 300 | **668** |
| Last seed with a practice phrase | 300 | 300 | 300 | 300 | **668** |
| Last seed in `course_round_index` | 300 | 300 | 300 | 300 | **668** |
| Seeds with audio | 1–300 | 1–300 | 1–300 | 1–300 | **1–668** |

29 of the 31 line up on 300 across all five rows. Seeds 301–668 in those courses are `status='draft'`, `decomposed_at` NULL, zero LEGOs, zero phrases — raw seed-bank text nobody has touched.

`course_round_index` is the decisive one: it is the materialised view the learner's round map is read from. A learner on Danish cannot reach seed 301 at all, so its audio is not missing — it is unnecessary.

The courses built to 668 have audio to 668. The correlation is exact, and it runs in both directions.

## Three things that looked like a stopped run and are not

**The cut is perfectly sharp.** Seeds 1–300 are 300/300 linked on both the known and target side, then nothing. A run that died would leave a ragged edge.

**It happened 31 separate times over seven months.** The affected courses were rendered on dates from 18 January to 14 July 2026 — different runs, different months, every one landing on exactly 300. Thirty-one independent halts at the same round number is not a coincidence; it is a specification.

**The handful of clips past 300 are reuse hits, not leftovers.** A few courses show audio at seeds 305, 321, 329, 422, 632. Those are the *same S3 objects* shared across unrelated courses — `mastered/1600898B-…mp3` is seed 305's known clip in Afrikaans, Czech, Danish and Hungarian alike. The known side of a `*_for_eng` course is English, so when a draft seed's English text happens to match a clip already in the library, the link is made for free. They were created inside the same batch window as that course's other clips. Reuse, not a partial run.

## What the 12,793 actually is

Reproduced against the nightly counter's own bucket rule (courses with ≥90% practice-phrase coverage):

| | Seed prompts |
|---|---:|
| Seeds that were **never decomposed** — no LEGOs, no phrases, off the round map | **12,078** |
| Seeds that **are** decomposed and genuinely lack audio | **1,083** |

The 12,078 are working as designed. The 1,083 are a real gap, and they have nothing to do with seed 300 — they sit in four courses and start at seed 1:

| Course | Missing | Range |
|---|---:|---|
| English for Hindi speakers | 412 | seeds 1–667 |
| North Welsh for English speakers | 255 | 1–304 |
| North Welsh rebuild | 224 | 1–267 |
| South Welsh for English speakers | 189 | 1–273 |

That is ordinary drift of the kind the nightly already tracks, mis-filed under a boundary it does not belong to.

## One inconsistency worth a line

`eng_for_spa` has seeds 301–668 marked `status='released'` while `decomposed_at` is NULL and they have no LEGOs — the flag disagrees with the content. It also carries 311 target-side seed clips past 300 for seeds that were never built. Cosmetic today, since the round map still stops at 300, but the status flag is lying.

`ara_eg_for_eng` and `ara_lb_for_eng` are the two of the 31 that are decomposed all the way to 668 — those two are genuinely mid-render (roughly half their phrase audio exists) rather than scope-limited, and belong in the "still being built" bucket, not this one.

## What it would take to complete — and whether to

Nothing, unless the decision is to extend those 59 courses from 300 seeds to 668. That is a **content** decision, not an audio one: it means decomposing 368 more seeds per course to methodology standard, then rendering. Rendering seed audio for undecomposed draft text would produce clips no learner path can reach and would cost money for nothing.

**Recommendation:** stop counting the 12,078 as a gap. Change the nightly's seed-track line to count only seeds that are actually decomposed — that turns 12,793 into ~1,083 and makes the number mean something. Then the seed track can be folded into the existing drift alarm instead of sitting beside it as a mystery.

---

*Established from `course_seeds`, `course_legos`, `course_practice_phrases`, `course_round_index` and `course_audio` on the live database, plus the delivery code in `ssi-learning-app/api/courses/[code]/bundle.ts`. Two independent workers (#978 delivery path, #979 render history) reached the same verdict separately.*
