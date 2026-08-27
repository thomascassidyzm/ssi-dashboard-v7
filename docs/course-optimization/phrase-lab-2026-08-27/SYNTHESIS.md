# Phrase prompt v3 — five more languages, and the model question

*27 August 2026. Read-only measurement. Nothing here was written to any course, no audio was generated, and the v3 prompt is still not wired into `build-team-creator.cjs`.*

---

## The answer, before the tables

**1. The improvement replicates, and it replicates in the same shape.** Six courses, 120 measured LEGOs, same 20 English seeds throughout. Live course content clears every floor on **0% of LEGOs in all six courses, on both BUILD and USE.** Spanish was not an outlier; it was representative. The v3 prompt takes that to 61–90% BUILD and 50–85% USE depending on the language, and the gain lands on the same named axes everywhere: USE pattern variety, the filling position, and distinct neighbour x pattern combinations.

**2. On the model question: buy Opus for the build.** Across the 98 comparable LEGOs, Opus 5 leaves **56 of 100 sets needing no human at all**; Sonnet 5 leaves **22**. Weighted for how expensive each kind of fix is, Opus saves **50.5 human touch-units** over five courses. And the trade Tom was expecting to have to make — pay more money for less human time — **does not exist**: every call in this estate runs on the flat-rate subscription, so an Opus call and a Sonnet call cost the same zero dollars. There is no crossover to compute, because there is no price to pay.

**3. The one thing to read before quoting a number.** Opus beats Sonnet 5 on **USE at every floor setting in every course** — that conclusion is robust. On **BUILD the two arms trade places** depending on where the bar sits: loosen every floor one step and Sonnet 5 draws level or ahead in Italian, French and German. So the honest headline is *Opus wins decisively on USE and is a coin-flip on BUILD at a loose calibration.* USE is the role that matters more — USE phrases are the eternal ones that enter spaced repetition forever, BUILD phrases are debut-round scaffolding — so this does not change the recommendation, but it is the sentence a careful reader deserves.

### What I would do

**Run the build on Opus 5.** Not because it is worth paying more for — it costs the same — but because at equal price it hands back roughly two and a half times as many finished sets. Better: 56 clean sets against 22. Simpler: one model, one prompt, no checker tier to build, staff or debug. Cheaper: identical marginal dollars, and every set that arrives clean is human attention never spent.

**On the third option — Sonnet builds, an up-model checker rejects, Opus rewrites the failures — my read is: do not build it.** The data now says it would be strictly worse than just using Opus. It would run Sonnet on all 20 sets, then Opus on the 15-of-20 Sonnet leaves imperfect, so it spends *more* total model time than all-Opus does, plus the cost of building and maintaining a checker tier, and still ends up with rewritten sets rather than sets that were right first time. The split only pays when the expensive tier is genuinely expensive. Here it is not. **One word: Opus.**

---

## (a) Is the improvement consistent across courses?

### The live baseline is uniformly bad — Spanish is not an outlier

| course | live clears floors (BUILD / USE) | LEGOs needing a human | mean layer-1 gate failures (BUILD / USE) | USE neighbour x pattern combos |
|---|---|---|---|---|
| Spanish | 0% / 0% | **20 of 20** | 0.50 / 1.75 | 2.6 |
| Italian | 0% / 0% | **20 of 20** | 0.10 / 1.55 | 3.5 |
| French | 0% / 0% | **20 of 20** | 0.15 / 1.00 | 3.4 |
| German | 0% / 0% | **20 of 20** | 1.60 / 4.40 | 0.9 |
| Japanese | 0% / 0% | **20 of 20** | 2.35 / 4.15 | 0.6 |
| Mandarin | 0% / 0% | **20 of 20** | 1.65 / 3.80 | 1.5 |

Every one of the 120 measured LEGOs in the live estate needs a human. Not one is clean. That is the number behind the ~57,000-phrase retro pass, and it is the same in six languages.

There **is** a gradient inside that uniformity, and it is worth knowing: the non-Romance courses are worse. German, Japanese and Mandarin live content fails the vocabulary gate 12–17 times out of 20 on BUILD, against 2–6 for Italian, French and Spanish, and draws roughly a third as many distinct connections per LEGO. Whatever produced the current estate degraded further the further it got from English.

### The generated arms

| course | live | Opus 5 | Sonnet 5 |
|---|---|---|---|
| Spanish | 0% / 0% | *(not re-run — see gaps)* | *(not re-run)* |
| Italian | 0% / 0% | **70% / 85%** | 80% / 25% |
| French | 0% / 0% | **70% / 75%** | 60% / 35% |
| German | 0% / 0% | **61% / 72%** | 58% / 32% |
| Japanese | 0% / 0% | **65% / 80%** | 40% / 55% |
| Mandarin | 0% / 0% | **75% / 50%** | 30% / 35% |

*(BUILD % / USE %. Spanish figures are from the overnight run: Opus 90/75, Sonnet 5 60/50.)*

**Same axes carry the gain in every course.** USE `axesVaried` — "every phrase is the same shape" — is short on 14–20 of 20 live LEGOs everywhere, and on 1–2 under Opus. The filling position, the one you cannot reach by swapping a tail, goes from 0.07–0.28 live to 0.50–0.61 under Opus. These are not different stories per language; it is one story told six times.

**Where the courses differ is which arm comes second.** Sonnet 5 holds up well on the Romance courses and degrades on the harder ones: it clears 80% of Italian BUILD but 30% of Mandarin BUILD, and its USE `axesVaried` shortfall triples from Italian to Mandarin. Opus stays within a much narrower band (61–75% BUILD) across all five. If you were going to run Sonnet anywhere, it would be Italian and French — and nowhere else.

### Japanese and Mandarin: language effect or tooling effect?

**Mostly tooling, and it was found and fixed before the numbers were taken.** This matters, because the naive version of this experiment would have reported a spectacular false finding.

- The target-coverage gate tokenised the target on **whitespace**. Japanese and Chinese have none, so every correctly-tiled phrase was reported as carrying material no tile accounted for. The two-LEGO smoke probe came back **100% gate failure on both languages** on sets whose tiling reconstructed the target exactly — `场地顶端` tiled correctly as 场地 + 顶端 and was rejected for containing `场地顶端`. Published unexamined, that reads as "Opus cannot write Japanese". The gate now subtracts characters for spaceless scripts and words everywhere else — the same move the 2026-07-04 ZUT rescope was forced into for French inversion and elision.
- **Syllable counters** did not exist for either language and fell through to a Latin-vowel guess that matches nothing, then to a whitespace token count of ~1 per phrase. Counters now live in `tools/phrase-lab/syllables-cjk.cjs`, consulted **only by the lab scorer** — registering them globally would flip `hasSyllableCounter()` and silently switch on the speaking script's known-side filter for every jpn/zho-known course, which is not this job's blast radius. Mandarin is exact, one syllable per Han character. Japanese counts kana morae exactly and estimates each kanji at 2 morae; against hand-counted specimens that lands within about one mora per phrase. **`new edges per syllable` for Japanese is therefore not like-for-like with the Romance courses.** It is in no floor, so no verdict depends on it.

**What survives as a genuine language finding**: Mandarin is the one course where Opus's USE result is weak (50%, its lowest), driven by 5 of 20 sets carrying a layer-1 gate failure and 4 short on `useCompleteShare` — Mandarin USE phrases that do not stand alone as complete thoughts. That is not the tool; the gate is now measuring the right unit and it is finding real defects. Mandarin is where the v3 prompt has the most left to give.

---

## (b) Is Opus worth it on total cost of production?

### The premise had to go first

Tom's question was framed as "a more expensive model might be worth it". **There is no more expensive model.** Every LLM call in this estate goes through the Claude CLI on the flat-rate Max Plan subscription, never the metered API — a hard rule with a $38/day incident behind it, and already established for the 57,000-phrase repair in `docs/spa-repair-unit-costs-2026-08-26.md`: *"$0 marginal... there is no per-token metered spend to multiply."*

So the trade is not dollars against human time. It is: Opus draws more of a capped weekly pool and more wall-clock, against Sonnet leaving more sets on a human's desk. Both sides were measured.

## Human-touch load, per arm, per course

Counted over the measured LEGOs. `clean` costs no human time at all.

| course | Sonnet 4.5 (live): clean/targeted/rewrite/regen | Opus 5: clean/targeted/rewrite/regen | Sonnet 5: clean/targeted/rewrite/regen |
|---|---|---|---|
| Italian | 0/0/4/16 | 12/7/1/0 | 5/14/1/0 |
| French | 0/0/10/10 | 12/8/0/0 | 6/9/4/1 |
| German | 0/0/3/17 | 11/4/1/2 | 4/13/1/1 |
| Japanese | 0/0/3/17 | 12/5/1/2 | 5/9/2/4 |
| Mandarin | 0/0/3/17 | 9/5/1/5 | 2/12/4/2 |

## Weighted human units (targeted=1, rewrite=3, regenerate=1.5)

| course | Sonnet 4.5 (live) | Opus 5 | Sonnet 5 | Sonnet 5 units SAVED by Opus |
|---|---|---|---|---|
| Italian | 36.0 | 10.0 | 17.0 | 7.0 |
| French | 45.0 | 8.0 | 22.5 | 14.5 |
| German | 34.5 | 10.0 | 17.5 | 7.5 |
| Japanese | 34.5 | 11.0 | 21.0 | 10.0 |
| Mandarin | 34.5 | 15.5 | 27.0 | 11.5 |
| **all courses** | | | **50.5 over 98 LEGOs** |

## The machine side — what Opus actually costs more of

Dollar cost is **identical and zero** for both arms: every call runs through the Claude CLI on the flat-rate subscription, never the metered API. What Opus costs more of is wall-clock and weekly-pool draw.

| course | Opus mean sec/call | Sonnet 5 mean sec/call | Opus is slower by |
|---|---|---|---|
| Italian | 230 | 248 | -8% |
| French | 232 | 278 | -17% |
| German | 302 | 351 | -14% |
| Japanese | 282 | 368 | -23% |
| Mandarin | 273 | 306 | -11% |

## The crossover

Across every measured LEGO, Opus saves **0.52 weighted human units per LEGO** against Sonnet 5, at **47 FEWER machine-seconds per LEGO** (see the caveat below on why the machine-time column is not a clean measurement).

Because the marginal dollar cost of both arms is zero, there is no human-minute rate at which Sonnet 5 becomes cheaper on **money**. The only currency Sonnet 5 wins is machine time and weekly pool. So the crossover is stated in the honest units:

> **There is no crossover.** Opus leaves less work on the human's desk AND did not spend more machine time doing it, so there is no human-minute rate at which Sonnet 5 becomes the cheaper arm. A crossover only exists when the cheaper-to-run arm is actually cheaper to run.

> **Read the machine-time column with care.** The arms were NOT run under matched conditions: an account session limit interrupted this experiment mid-flight and the Sonnet arms carry more retries and more contention than the Opus arms do. So "Opus is faster" is NOT a claim this data can make. The claim it CAN make is the weaker and sufficient one: **nothing on the machine side offsets Opus's quality lead.** Per-call latency is the same order of magnitude for both, and the cost that would have to be traded away simply is not there.

**The gap, stated plainly.** No measured minutes-per-human-touch figure exists anywhere in this repo. The nearest thing is the source audit's throughput of ~220 phrases per pass at the full seed-plus-siblings evidence standard, which is a pass size and not a clock. That is why this is reported as a crossover rather than a total: the arithmetic above is measured, and the one judgement left is whether a human touch-unit is worth more than the machine time it costs to avoid.

### The floor-sensitivity check

The floors are **not Tom's ruling** — the only one he set himself is "at least 6 distinct partner x pattern combinations". The rest are the Spanish run's calibration, kept unchanged here so all six courses stay comparable.

| course | BUILD: Opus vs Sonnet 5 (looser / as set / tighter) | USE: Opus vs Sonnet 5 (looser / as set / tighter) |
|---|---|---|
| Italian | 90% vs 90% / 70% vs 80% / 40% vs 5% | 95% vs 75% / 85% vs 25% / 35% vs 5% |
| French | 85% vs 85% / 70% vs 60% / 45% vs 0% | 90% vs 65% / 75% vs 35% / 25% vs 5% |
| German | 67% vs 95% / 61% vs 58% / 33% vs 11% | 83% vs 68% / 72% vs 32% / 39% vs 5% |
| Japanese | 85% vs 75% / 65% vs 40% / 30% vs 10% | 95% vs 70% / 80% vs 55% / 15% vs 5% |
| Mandarin | 90% vs 65% / 75% vs 30% / 50% vs 0% | 60% vs 55% / 50% vs 35% / 15% vs 0% |

**USE: Opus leads at every setting in every course.** That is the robust half and it is the half that matters, because USE phrases are the eternal ones that enter spaced repetition forever.

**BUILD: the ordering flips at a loose calibration.** One step looser, Sonnet 5 draws level in Italian (90 vs 90), level in French (85 vs 85) and ahead in German (95 vs 67). One step tighter, Opus leads everywhere by a wide margin. **This is the single most important caveat in the document**: if Tom loosens the BUILD floors, the BUILD half of the model comparison becomes a coin-flip. The USE half, and therefore the recommendation, does not move.

### The blind "worth having" judgement

The one thing the scorer cannot compute, asked of a model with no arm label attached.

| course | live | Opus 5 | Sonnet 5 | comparable? |
|---|---|---|---|---|
| Italian | 0.77 | **0.82** | 0.77 | yes — all three arms, same 7 LEGOs |
| French | 0.71 | **0.89** | 0.65 | yes — all three arms, same 7 LEGOs |
| Japanese | *withheld* | **0.78** | 0.75 | Opus vs Sonnet only |
| Mandarin | *withheld* | **0.94** | 0.77 | Opus vs Sonnet only |
| German | *withheld* | *withheld* | *withheld* | **no — see gaps** |

Opus is ahead in all four courses where the comparison is valid. The withheld cells are a real gap, described below, not a rounding-down.

---

## Caveats and gaps, stated plainly

**1. The specimens are Spanish, in every course.** The prompt's positive and negative worked examples are the two Spanish rows Tom hand-graded, identical for all six courses and labelled in the prompt as another course's Spanish shown for the *shape* of the set. No other course has a Tom-graded specimen and none has an honest in-course positive to substitute — the live content clears the floors nowhere. Holding them constant is what makes the arms comparable across courses. **The confound is real and the data is mildly consistent with it**: Sonnet 5 does best on the two Romance courses closest to the specimen (Italian 80% BUILD, French 60%) and worst on Mandarin (30%). Opus does not show that gradient. Treat "Sonnet 5 is fine for Romance" as *possibly a specimen artefact*, not an established language finding.

**2. The German blind judge is missing, and so is one German Sonnet set.** The judge was sampling by position in the arm file, so a hole in one arm shifted every subsequent pick and the three German arms were judged on different LEGOs — the live arm "won" on seeds its rivals never saw. That is now fixed (`--seeds` takes the list explicitly), but the re-run was cut off by an account session limit. German's judge scores are withheld rather than reported wrong. Separately, German seed 620 failed three times under Sonnet 5 on the 600-second per-call timeout and is reported as a generation failure in its own column, never averaged in as a zero — so German Sonnet 5 is 19 sets, not 20.

**3. The machine-time column cannot support a claim about speed.** An account session limit interrupted this run twice, and the Sonnet arms carry more retries and more contention than the Opus arms. Opus came out *faster* per call in all five courses, but the arms were not run under matched load, so I am not claiming Opus is faster. The claim the data does support is the weaker and sufficient one: **nothing on the machine side offsets Opus's quality lead.**

**4. No measured human-minute rate exists anywhere in this repo.** The nearest thing is the source audit's throughput of ~220 phrases per pass at the full seed-plus-siblings evidence standard — a pass size, not a clock. Rather than invent one, the touch counts are reported raw and weighted by a stated, overridable relative scale (targeted 1, rewrite 3, regenerate 1.5).

**5. The `ascent` axis is gone, on Tom's ruling** — verbatim, *"One new distinction per practice phrase is not required really. Each new LEGO is the distinction that's being enabled by practice."* It was never in the floors and it was inverted anyway: it counted axis changes between consecutive phrases, so it penalised exactly what pattern variety rewards. No floor, percentage or conclusion in any of these six documents depends on it. No other axis in the scorer penalises a phrase for failing to add a new distinction.

**6. Spanish was not re-run**, per the brief. Its generated-arm figures are quoted from the overnight report. Its live arm *was* re-scored under the current code, which is where its touch tally and sensitivity rows come from.

---

## The six reports

- **Spanish** — the overnight run, published at https://watson-1.tail4968cb.ts.net/d/1dc47bb2
- **Italian** — https://watson-1.tail4968cb.ts.net/d/9afd8130
- **French** — https://watson-1.tail4968cb.ts.net/d/fd46e7cb
- **German** — https://watson-1.tail4968cb.ts.net/d/4da73ad5
- **Japanese** — https://watson-1.tail4968cb.ts.net/d/f1d89081
- **Mandarin** — https://watson-1.tail4968cb.ts.net/d/961984ef

Raw generated arms and blind-judge output for the five new courses are committed under `docs/course-optimization/phrase-lab-2026-08-27/arms/`.
