# Second opinion — Spanish padded phrases (A-61) and the estate-wide padding diagnosis (A-30)

2026-08-06. Independent re-examination, read-only on content. Every number below was re-derived
from live Supabase by this reviewer, not taken from either document. Where a figure could not be
reproduced, that is said plainly.

**Verdict in one line: keep the 349 rewrites, hold the clip spend until 11 named rows are repaired,
and do not sweep the other 73 courses on this detector as it currently stands.**

---

## 0. What I actually ran

`.env.psql` is present and the live database is reachable. `psql` is not installed on this machine,
so I queried through `node` + the `pg` client (`scripts/second-opinion/db.cjs`, gitignored
workspace). All queries read-only. No content was written, no audio generated, no audio pass queued,
no reverter run.

Scripts written for this review (all in the gitignored `scripts/second-opinion/`):
`detect2.cjs` (my own detector, written from the A-30 spec, not copied), `before.cjs` (reconstructs
the pre-rewrite state), `estate.cjs` / `estate-target.cjs` (estate recount), `checks.cjs`
(containment, ZUT, register, parentheses, duplicates), `prereq.cjs` (independent prerequisite
check), `sensitivity.cjs` (detector bias), `sample.cjs` (stratified taste sample).

One sonnet worker was dispatched for mechanical detector-sensitivity counting. Because the dispatch
surface was draining, I did that work myself as well; the numbers in §3.3 are mine.

---

## 1. Are the 349 rewrites good?

**Yes, clearly — with one real defect class I found that A-61 did not report.**

### 1.1 The sample

58 rows, stratified proportionally across round band × role (15 build / 43 use), drawn with a fixed
seed from all 349 and re-read live from the database rather than only from the JSON. I also pulled
every row the first worker itself flagged as doubtful.

First, an integrity check: **all 349 rows in `docs/spa-padding-rewrites-2026-08-06.json` match the
live database exactly** — 349/349 known and target text identical after normalisation, 0 mismatched,
0 missing. The artefact is a faithful record of what is live. That is not nothing; it means a revert
would be clean.

### 1.2 Scoring

| | count | share |
|---|---|---|
| **Better** — old row was broken, new row is a good phrase | 33 | 57% |
| **Neutral** — old row was already acceptable and so is the new one (23), or old was broken and the new one still fails (1) | 24 | 41% |
| **Worse** | 1 | 2% |

These reconcile with §2.1 by construction: the 24 neutral rows are the 24 whose old text I judge
acceptable, i.e. the false positives. Nothing was made worse by rewriting them; the cost is purely
the clips.

The one I score as **worse** is `spa_for_eng:S0661L01B03` — the row A-61 flagged itself, discussed
in §1.5: a decent phrase spent to fix a missing `lo`.

The one I score as **neutral-but-still-failing** is `spa_for_eng:S0547L02U04` (R1156, USE): *"it's
your turn to look for somewhere safe in the mud"* / *"te toca a ti buscar un lugar seguro en el
barro"*. That is a tier-2 POSSIBLE-BUT-CLUNKY phrase — you need a lot of context before "somewhere
safe in the mud" means anything. USE is tier-1-or-die, so it fails. It replaced *"in the mud
before"*, which also failed, so nothing was lost; but a USE row that still fails the clunkiness test
after a deliberate rewrite pass is a miss, and it belongs in the repair batch.

The wins are large and they are exactly Deborah's complaint. Her *"I am feeling sad before"* is now
*"I am feeling sad because he has been playing alone"*. *"probably here"* → *"she's probably gone to
look for somewhere safe to park the car"*. *"the dog is for everyone"* → *"the dog is in the office
while I fetch the keys"*. `S0561L01B04`'s old Spanish was literally *"no me importa si antes, no"* —
not a sentence in any language. These are not marginal improvements.

### 1.3 The rails, checked mechanically across all 349

| Rail | Result |
|---|---|
| No parentheses / brackets / pipe annotations | **0 violations** |
| tu-first register (no `usted`/`ustedes` leak) | **0 violations** |
| Duplicate phrases introduced | **0** |
| ZUT collisions course-wide involving a rewritten row | **0** (81 collisions exist course-wide; none touches a rewritten row) |
| English contains its LEGO's known text | **349/349 pass** |
| Prerequisite vocabulary — unseen Spanish word | **0/349** |
| Prerequisite vocabulary — unseen English word | **0/349** |

The prerequisite result deserves emphasis because it is A-61's strongest claim and it **reproduces
independently and exactly**. I rebuilt the cumulative vocabulary myself (every LEGO and component
target/known up to and including each round, from `course_round_index`), applied an English free
class for glue words, and got 0 leaks on both sides. For calibration I ran the identical check
against the 1,403 *untouched* build/use rows in R1000–1200: **1.0% Spanish leaks and 3.6% English
leaks**. And against the rows' own *old* text: 0.3% / 1.7%. So the rewritten rows are measurably
*cleaner* on prerequisites than both the content they replaced and the content sitting next to them.

### 1.4 The defect A-61 missed

A-61 claims "every row still contains its own LEGO". On the English side that is true (349/349). On
the **Spanish side it is false for 19 rows**, and about 11 of those are genuine divergences rather
than artefacts of my matching rule:

| Rows | LEGO Spanish | What the rewrite wrote | My read |
|---|---|---|---|
| `S0519L03B03/U02/U05` (R1096) | `su bebé nuevo` | `su nuevo bebé` | **Real.** Word order flipped. The learner is taught one order and drilled the other. This is a ZUT split below phrase level. |
| `S0115L04B02/B05/U04` (R262) | `no siento como si estuviera listo…` | `no me siento como si…` | **Real, but the rewrite is right and the LEGO is wrong.** `sentirse` is reflexive here. Escalate the LEGO, don't revert the phrase. |
| `S0116L04B04/B05` (R265) | `…la mejor opción que podría hacer` | `…que podría tomar` | **Real.** Lexical swap `hacer`→`tomar`. Same problem as above and less defensible. |
| `S0567L02U04` (R1190) | `pasar tiempo al aire libre` | `seguir pasando tiempo…` | **Real.** Re-conjugation. The methodology says phrases tile from whole introduced chunks and never re-conjugate. |
| `S0567L03U05` (R1191) | `viendo a los niños jugar` | `sin ver a los niños jugar` | **Real.** Same, `viendo`→`ver`. |
| `S0555L02U03`, `S0557L02U04` | `para buscar una nueva`, `no pusieran música` | dropped `para`; `música`→clitic `la` | **Real but benign.** Both read naturally. |
| `S0550L01U01–U04` (R1159) | `el final del pueblo` | `al final del pueblo` | **Not a defect.** `al` = `a`+`el`, the documented contraction false-positive this estate already knows about. |
| `S0552L01U01/U03/U04` (R1161) | `al otro extremo del pueblo` | `en el otro extremo…` | **Judgement fork.** Spanish needs `en` for location with `vivir`; the LEGO's own `al` is the odd one. Deborah's call. |

Eleven rows out of 349 is 3.2%. Every one of them is a case where the rewritten Spanish is *better
Spanish* than the LEGO it is attached to — which is why they slipped past A-61's own gate. They are
still defects, because the learner meets the LEGO first and then hears a different form. **This is
a targeted repair job, not a reason to revert 349 rows.**

### 1.5 The row A-61 flagged itself

`S0661L01B03` (R1332): *"you're all doing very well"* / *"estáis haciendo muy bien"* became *"what
you're all doing"* / *"lo que estáis haciendo"*. A-61's self-criticism is correct: the fault was a
missing `lo` (`lo estáis haciendo muy bien`) and the minimal fix was to add it. Instead a decent
sentence became a bare fragment. It is a BUILD row so a fragment is legal and extensible, and the
Spanish is now correct — but a good phrase was spent to fix a one-word bug. Score: mildly worse.
Honest self-reporting; I'd add it to the same targeted repair batch.

The 3 rows at R256 that A-61 declared as never adjudicated are genuinely absent from the rewrite set
— I confirmed 0 R256 rows in the JSON. The declared gap is real and honest.

---

## 2. Is "~30% false positives" the right frame, and is it accurate?

### 2.1 The number is accurate — if anything it is understated

My own criterion, stated explicitly: *would a competent native accept the old row, in isolation, as
a well-formed utterance appropriate to its role — a complete natural sentence for USE, a naturally
extensible fragment for BUILD?* That is the house clunkiness test, tier 1.

On my 58-row sample, **24 old rows pass (41%)** on that criterion; **19 (33%)** pass on a stricter
reading that demands a complete natural utterance. A-61 reported ~30% with a 95% CI of 23–38%. My
33–41% band sits at or above the top of their interval. So: honest disclosure, and if anything they
were generous to themselves.

### 2.2 But the aggregate rate is the wrong unit, and this is the finding that matters

Split by round band, the sample stops being ambiguous:

| Band | rewrites in sample | old row was acceptable |
|---|---|---|
| **Below R1000** | 15 | **13 (87%)** |
| **R1000 and above** | 43 | **11 (26%)** |

Below R1000 the detector is almost always wrong. *"Did you have a good time last night?"*, *"What do
you want to do this afternoon?"*, *"they came last night"*, *"I'd like to read my book tomorrow"* —
these are good phrases and they were replaced for no reason.

And this was **predicted in A-30 itself**, which measured ~96% precision inside R1050–1199 and ~33%
outside it, and recommended a bounded pilot on **R1050–R1199 only**, in front of Deborah, before
touching anything else. A-61 rewrote the whole course: **268 of the 349 rows are inside R1050–1199,
but 81 are outside it** — and it is those 81, where precision collapses to roughly one in eight,
that account for essentially all of the false-positive cost. The first document called the shot and
the second worker overran it.

That reframing matters because it changes what the ~30% *means*. It is not "the detector is 70%
right everywhere." It is "the detector is ~96% right inside one batch window and near-useless
outside it," and the 30% is what you get by averaging those two together.

### 2.3 Is LEGO-plus-stock-tail a defect even when each sentence is natural? My position

Yes, at the level of the *basket*; no, at the level of the *row*. Those are different objects and
conflating them is what produced the 81 over-reaches.

The forcing function is real and the evidence for it is in the data: before the rewrites, R1100–1199
ran at **30.4% padded** against 0.4–2.3% in every band below R1000, and the whole band drew on a
pool of **31 distinct tails**, with `here` alone used 97 times, `before` 64, `yesterday` 52. That is
not authorship, that is a generator meeting a quota. A basket of five USE rows that differ only by
which of five stock adverbials is bolted to the end teaches the learner nothing about production —
it drills one frame five times and charges five phrase slots and fifteen audio clips for it. In
Tom's terms: the tail pool is a *frozen* answer to a live question, and the round pays full price
for it. That is the defect, and it is a defect about the basket, about *variety*, not about grammar.

But a single phrase like *"I'd like to read my book tomorrow"*, sitting in a basket whose other four
rows are varied, is simply a good phrase that happens to end in an adverb. Rewriting it costs three
audio clips and buys nothing. The correct unit of judgement is the basket; A-30 encoded exactly that
in its CONFIRMED/PLAUSIBLE split (two or more hits in a round = confirmed) and it was the right
call. A-61 rewrote **113 rows that are PLAUSIBLE-only** by that rule — alone in their round — and
that is where the waste is.

So: the criterion argument is right, and the first worker was right to defend it. It just does not
license row-level action outside a confirmed basket.

---

## 3. Do A-30's numbers hold?

**Yes. Every headline figure reproduces, several of them to the row.** This is unusually good audit
work and I could not break it.

### 3.1 Spanish

I reconstructed the pre-rewrite state by restoring `old_known`/`old_target` from the JSON over the
live rows and re-running my own detector.

| Claim (A-30 / A-61) | My independent number | Verdict |
|---|---|---|
| Build+Use denominator 15,205 | **15,205** | exact |
| 394 padded before (291 use / 103 build) | **389 (288 use / 101 build)** CONFIRMED | reproduced within 1.3% |
| 30% of phrases in R1100–1199 | **30.4%** (265 / 871) | exact |
| "sharp on, sharp off" | R1000–1099 6.5%, **R1100–1199 30.4%**, R1200–1299 0.8% | confirmed |
| 34 padded rows remaining | **34** CONFIRMED | exact |

Two notes on that table. First, A-30's "394" is a **CONFIRMED** count, not a raw hit count — the raw
count before the rewrites was 491. The doc does not make that explicit and a reader will assume 394
is everything. Second, and more usefully for Tom: **147 rows still match the padding pattern today**,
not 34. The rewrites demoted rows rather than eliminating them — when one of a round's two hits is
rewritten, the survivor stops being CONFIRMED and becomes PLAUSIBLE. PLAUSIBLE went *up*, from 102
before to 113 after. "34 remaining" is true on the doc's own definition and misleading in plain
English.

### 3.2 The estate

| Claim | My number | Verdict |
|---|---|---|
| 12,341 padded estate-wide | **11,992 CONFIRMED today** | **exact** — 11,992 + the 349 rows A-61 has since rewritten = **12,341** |
| eng_for_zho 17.0% | **16.96%** | exact |
| eng_for_kan 8.5% | **8.49%** | exact |
| ces_for_eng 7.3% | **7.28%** | exact |
| hun_for_eng 7.2% | **7.23%** | exact |
| eng_for_mar 7.1% | **7.01%** | within 0.1pp |
| 74 of 99 courses affected | 61 courses known-side + 19 eng_for_* target-side with hits | consistent |

I could not reproduce the estate table at all on my first pass — `eng_for_zho` returned **zero**
hits. The reason is worth recording because the document does not state it: **A-30's detector runs
on the ENGLISH side, which is `known_text` for `X_for_eng` courses and `target_text` for `eng_for_X`
courses.** Once I ran the target-side variant for the 19 `eng_for_*` courses, every figure landed on
the nose. The methodology is right — an English adjunct list must be pointed at the English — but
the doc reads as though a single known-side rule produced the whole table, and it did not. Anyone
re-running this will hit the same wall.

Spanish, on my recount, is **rank 31 of 99 today at 0.97% raw / 0.22% confirmed** — the rewrites
moved it from the middle of the pack to near the bottom.

### 3.3 Is the detector checking the right unit?

This is the failure mode this estate has been burned by before, so I tested it directly.

**Component rows: cleanly excluded, and it does not matter anyway.** Every query filters
`phrase_role in ('build','use')`. I then asked the counterfactual: if the 84,626 component rows
estate-wide *had* been included, how many would have matched? **One.** Zero in spa_for_eng. The
component-row trap that made 93% of the 2026-07-04 ZUT queue noise is simply not present here. That
is a genuine strength of this audit and I want it on the record.

**The 30-adjunct list, however, is doing real work in both directions.**

*Inflation.* Two adjuncts carry 54% of all hits: `now` (5,232) and `today` (4,825). They are also
the two least vacuous items on the list. I eyeballed random samples of `now`, `today` and `here`
hits across the estate. A large share are perfectly good phrases: *"are you all ready now?"*, *"I
don't remember now"*, *"how do you feel today?"*, *"I watched the football today"*, *"we are here"*,
*"I'm waiting here"*, *"to stay here"*. Alongside genuine rubbish: *"and now"*, *"if now"*, *"last
time now"*, *"when she saw me now"*, *"supper today"*, *"next here"*. My estimate is that **40–50%
of estate-wide hits outside a confirmed batch window are acceptable phrases** — consistent with
A-30's own 33% out-of-band precision figure.

*Deflation.* The list is also arbitrary and under-inclusive. Ranking every lego-plus-tail shape in
the estate, tails *not* on the list include `with everyone` (363), `already` (352), `with you` (340),
`quickly` (243), `together` (196) — every bit as vacuous as `soon` (334) or `a lot` (326), which are
on the list. A fair, non-arbitrary list would add roughly 1,500–2,500 rows.

Net: **the 12,341 figure is arithmetically correct and semantically soft.** It is a good screening
number for finding batch windows. It is not a work-list, and it must not be treated as one — which
is precisely the lesson §5 of the QA rubric records from the last sweep: *never assume a violation
count is a work count.*

---

## 4. Is the generator diagnosis right, and is the fix the right one?

### 4.1 The three mechanisms, verified against today's code

All three reproduce. Line numbers below are current HEAD, and one has moved.

- **`minUse = 5`** — `services/course-builder/lib/phrase-structure.cjs:111`, still there, still
  enforced at line 159 with a hard error. The ramp (0/0 for S1L1, 1/1 through S3, 3/5 from S4)
  is intact at lines 114–124. **Confirmed.**
- **The comma requirement** — `services/course-builder/lib/validation.cjs:928`,
  `FILLER_TAG_RE = /,\s*¿?[^,]{1,18}$/`. **Confirmed.** "small yesterday" has no comma and passes.
- **BUILD-only application** — `services/course-builder/routes/seed-complete.cjs:**1223**` (A-30
  says 1218; the line moved when `ad9b41b0` landed). `checkBuildRecombination` reads
  `lego.build || []` and never touches `lego.use`. **Confirmed**, and this is the bigger of the two
  blind spots: 74% of the defect lives in USE, where the gate has never run.

Two things A-30 did not say that sharpen the diagnosis:

**The gate tests the wrong language.** `FILLER_TAG_RE` and the whole recombination check operate on
the **Spanish target**; the padding detector operates on the **English known side**. They are not
looking at the same string. `S0540L02U02` is the clean illustration: English *"you want to leave
here"* is a detector hit, but the Spanish was `quieres irte de aquí`, which is fine. Any gate built
from this detector has to run on the known side, and the known side is a different language in every
`eng_for_X` course.

**The recombination arm actively certifies padding as good.** The check counts a BUILD row as
"recombining" when the leftover after removing the LEGO's words touches prior vocabulary
(`validation.cjs:1010–1013`). `ahora`, `aquí`, `hoy` are all prior vocabulary. So *"Estar callado
ahora"* does not merely slip past the gate — it is **scored as evidence the basket is healthy**.
That is worse than blindness.

**And `ad9b41b0` has made the pressure slightly worse, not better.** It stops the generator meeting
the floor by emitting the bare LEGO as a phrase. That is correct and I would not undo it — but the
floor is unchanged at five, and the cheapest remaining legal way to reach it is exactly the
adverbial bolt-on. Closing the bare-LEGO escape without touching the quota pushes the next
generation run further toward padding. **This raises the priority of the generator fix; it does not
lower it.**

### 4.2 The three proposed changes, judged

**(1) Run the gate on USE as well as BUILD — SHIP IT.**
Better: 74% of the defect is in USE and nothing has ever looked at it. Simpler: the classifier
already exists; this is a second call site, not new machinery. Cheaper: one function call at submit
time, no runtime cost, no content cost. The one thing to get right is that USE has a stricter
contract than BUILD — a USE row must be a complete sentence, so the bare-repeat and comma-tag arms
apply *more* strongly there, not less. False rejections: near zero, because the arms it inherits
(bare LEGO, LEGO-plus-comma-tag) are things a USE row should never be anyway.

**(2) Drop the comma requirement, add a bare-adjunct arm with a per-language closed list, hard-reject
on the second occurrence in a basket — SHIP IT, with two changes.**
The "second occurrence in a basket" rule is the important part and it is right: it is the CONFIRMED
rule promoted into the gate, it is exactly the unit the data supports, and it would have caught the
R1100–1199 batch (31 tails, 97 uses of `here`) while leaving a lone *"I'd like to read my book
tomorrow"* alone. My two changes:
- **Run it on the known side, not the target side**, and key the adjunct list to the *known*
  language. The current gate's target-side habit is what makes it miss the defect entirely in the
  `eng_for_X` half of the estate.
- **Do not put `now` and `today` in the closed list on their own.** They generate 54% of hits and
  the highest share of good phrases. Either exclude them, or admit them only under the second-
  occurrence rule with a higher threshold. Falsely rejecting *"how do you feel today?"* at submit
  time will teach agents to route around the gate, which is how you get the next template stamp.
Better/simpler/cheaper all hold: it is one regex arm plus a per-basket counter, it costs nothing at
runtime, and it prevents the defect instead of paying to repair it afterwards.

**(3) Make the quota of five satisfiable honestly — DO NOT SHIP AS PROPOSED. Ship the second half
only.**

The proposal has two halves and they are not equal.

*Ramping the floor down when prior vocabulary is thin* goes directly against Tom's standing ruling
of 2026-06-16: floors are floors, *"more frames is good, but FEWER PHRASES IS A FAIL."* The
eng_for_hin 1,215→475 drop is the documented mistake and it was sold with this exact argument —
"the vocabulary pool won't support more." I am not going to argue around that ruling, so let me
argue against it directly and then concede: the honest case for a ramp is that padding is *evidence*
the pool genuinely cannot support five, so the floor is already being met dishonestly and a ramp
would just make the accounting truthful. The case fails on the evidence in front of me. The padding
is concentrated at **R1100–1199**, which is 1,100 rounds deep into the course — the vocabulary pool
there is the largest it will ever be. `S0548`'s basket, with the whole course behind it, produced
*"I am feeling sad before / about everything / yesterday / for everyone"*, and a single rewrite pass
produced four good varied USE rows from **the same vocabulary with zero prerequisite leaks**. The
pool was never thin. The generator was lazy. A ramp would have handed that laziness a legal excuse.
**Reject.**

*Counting distinct frames rather than raw rows* is a different proposal and it is the good one. It
does not reduce the phrase count by a single row — five rows are still required — it only refuses to
let five rows that are the same frame five times *count* as five. That is not "fewer phrases," it is
"the floor means what it says," and it is the same move `ad9b41b0` already made for bare-LEGO rows
and that Tom already approved. Note the existing `checkBasketFrameCoverage` (`validation.cjs` ~720)
was built for this and currently scores three different adverbials as three distinct signatures, so
it reads 1.0 on a fully padded basket — the fix is to normalise trailing closed-list adjuncts to a
single signature before scoring, and to promote the check from warn-only to blocking. **Ship this.**

So: **ship (1), ship (2) with known-side keying and `now`/`today` held back, ship the second half of
(3) and reject the ramp.** Three changes become three changes, but a different three.

---

## 5. Recommendations

**A-61 — the Spanish rewrites: KEEP.** They replaced genuinely broken content 57% of the time, they
are cleaner on prerequisite vocabulary than the course around them, and they introduced zero ZUT
collisions, zero parentheses and zero register leaks. Reverting live text that passes every gate,
to restore *"the dog is for everyone"*, would be the larger and worse move. The 81 out-of-band rows
were an over-reach against A-30's own advice and cost about 240 unnecessary clips, but they are not
damaged content — they are neutral swaps, already written and already paid for in effort.

**Before the clips are paid for: repair 11 rows.** The LEGO-containment breaks in §1.4
(`S0519L03B03/U02/U05`, `S0115L04B02/B05/U04`, `S0116L04B04/B05`, `S0567L02U04`, `S0567L03U05`,
plus `S0547L02U04` for clunkiness and `S0661L01B03` for the over-heavy edit). Every one of them is a
case where the rewrite's Spanish is better than the LEGO it hangs off, which means the *LEGO* may be
what needs fixing in three of them — that is Deborah's call, not mine. Repairing text is free;
regenerating a clip you then decide to change is not. **This is the only reason to hold, and it is
a days-not-weeks hold.**

**The 1,041 clips are Tom's separate call and are not approved by this review.** If the 11 rows are
repaired first, the count changes slightly and the spend is clean.

**A-30 — "fix / hold": FIX the generator, HOLD the estate sweep.** These are not the same question
and the document is right to separate them. The generator fix is cheap, preventative, and `ad9b41b0`
has just increased the pressure it relieves. The estate sweep is not ready: the 12,341 figure is
arithmetically sound but roughly half of it, outside confirmed batch windows, is good phrases, and
the adjunct list is arbitrary at both ends. What the estate needs first is not a repair pass but a
**batch-window detector** — the R1100–1199 signature (a contiguous round band running 10–30× the
course's own baseline, drawing on a tail pool of a few dozen items) is sharp, cheap to compute, and
would tell you which of the 74 courses have a real generator event rather than ordinary noise.
`ben_for_eng` (12.6% raw), `ces_for_eng` (10.1%), `hun_for_eng` (9.0%) and `ara_eg_for_eng` (6.9%)
are where I would point that first, and `eng_for_zho` at 17.0% on the target side is the single
worst thing in the estate.

**What would change my verdict:** if Deborah reads a sample of the R1050–1199 rewrites and finds
Spanish faults my English-side reading cannot see, the balance shifts. I flagged three rows as
judgement-forks needing a native ear (the `S0552` `al`/`en` group). Nothing else in my sample turned
on native judgement I do not have.

---

## 6. Gaps and limits, declared

- **Sample size.** 58 of 349 rewrites read in full context. My better/neutral/worse rates carry a
  95% CI of roughly ±11pp. The mechanical checks in §1.3 and §1.4 ran on all 349.
- **`psql` is not installed** on this machine; all SQL went through the `pg` node client. This
  changes nothing about the results but is worth knowing if someone tries to re-run by hand.
- **The 394 vs 389 gap** (1.3%) I did not chase to the row. Most likely explanation is boundary
  movement in the CONFIRMED/PLAUSIBLE split, or rows edited by other work between the two
  measurements. I trust my 389 for my own reasoning and I do not think the difference is decision-
  relevant either way.
- **I did not audit the other 73 courses' content.** My estate work is counting only; the §3.3
  precision estimate for the estate comes from eyeballing ~36 sampled rows across three adjuncts,
  which is enough to say "roughly half" and not enough to say a number.
- **Native-speaker Spanish judgement.** I read the Spanish carefully but I am not the right last
  word on register or idiom. The three `S0552` rows are marked as forks rather than scored.
