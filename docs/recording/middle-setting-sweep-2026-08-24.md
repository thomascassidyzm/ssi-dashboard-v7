# The middle setting, measured in sub-clauses

24 August 2026. Kai ruled against both TIGHT and GENEROUS and set the target
himself, then corrected the unit: *"Not lines, sorry, I'm thinking something like
sub-clauses to be honest."* So the target is **~50% of sub-clauses recorded
complete, in ~4 hours max**.

Swept on live `deu_at_for_eng` pulled today, timed against 248 real Sascha clips.
No TTS. No database writes. No live default changed.

---

## The short answer

**In sub-clauses, a genuine middle exists — but 50% and 4 hours still cannot both
be had.** TIGHT is 13.3% of sub-clauses complete, GENEROUS is 78.3%, so 50% sits
properly between them, which it did not under the old lines metric. It costs
**7.1 hours**. Four hours buys **33.6%**.

| | **`maxPieces = 6`** — recommended, respects the 4h ceiling | `cap=3 if ≤5 words else 4` — hits 50% |
|---|---|---|
| **% sub-clauses complete** | **33.6%** (32.3% under the audit-corrected rule) | **51.0%** (49.8% corrected) |
| **hours of speech** | **4.05** | **7.07** |
| % lines read straight through | 50.1% | 48.2% |
| **worst splice depth** | **6 pieces** | **4 pieces** |
| lines | 1,896 | 3,605 |
| coverage | 100% | 100% |

I recommend `maxPieces = 6`, because "4h max" is the harder-edged of the two
things Kai said. But the right-hand column is the one that hits his headline
number, and the choice between them is his, not mine.

---

## 1. What counts as a sub-clause, and how much of that is a guess

**The corpus carries no clause structure.** `course_practice_phrases` has
`target_text` and `known_text` and nothing else; `course_legos` types are
teaching units, not syntax. **Every sub-clause boundary on this page is
inferred.** That is the biggest gap in the report and it is stated here rather
than buried.

The rule (`scripts/mid-setting/subclause.cjs`), in four variants:

- **punct** — cut at internal punctuation only: a token ending in `,` `;` `:`
  `–` `—`. German orthography requires a comma before a subordinate clause and
  this corpus follows it: 2,459 of the 11,977 phrase texts carry one.
- **conservative** (the one used for every headline number) — punctuation, plus
  a token matching `dass` · `weil` · `obwohl` · `bevor` · `nochdem`/`nachdem` ·
  `damit` · `sobald` · `solang(e)` · `falls` · `seitdem` · `wennst` ·
  `während`, clitic-tolerant so `dass'd` / `dassd` / `dass's` / `wennst` match.
- **aggressive** — the above plus `wos` · `wia` · `ob` · `wo` · `wenn` ·
  `warum` · `wer` and the coordinators `und` · `oder` · `oba` · `aber`.
- **corrected** — conservative, with the false-positive classes the hand audit
  actually found removed (below). This is the most accurate rule on the page and
  it is reported alongside, not instead of, conservative, so the two can be
  compared.

**Words deliberately excluded from the conservative rule, each with the
counter-example that excluded it** — these are Bavarian traps a German word list
walks straight into:

| word | why it is out |
|---|---|
| `wer` | Bavarian `wer` is the auxiliary *werde/wird* — "i **wer** reden" — not "who" |
| `wos` | usually the pronoun *something/what* — "host ma **wos** zeign wolln?" — only sometimes the relative particle, "de **wos** Deitsch reden" |
| `wia` | comparative *as…as* — "so oft **wia** möglich" — as well as clausal "how" |
| `ob` | the particle in "auf und **ob**" (up and down) as well as "whether" |
| `wo` | locative adverb as well as relative |
| `und`/`oder` | joins noun phrases — "dreckert **und** noss" — as often as clauses |

Counts: **14,436 sub-clauses** under *punct*, **14,512** under *conservative*,
**15,345** under *aggressive*, **14,293** under *corrected*, over 11,858 distinct phrases — about 1.22
sub-clauses per phrase, because most of the course is short single-clause
material. Zero phrases were dropped by the token-alignment guard.

### The gap is real but it does not change the decision

Every setting was measured under all four rules. **They agree to within 4.5
points everywhere, and the ordering of settings is identical under all four**:

| setting | punct | **conservative** | aggressive | corrected (post-audit) |
|---|---|---|---|---|
| TIGHT | 13.1% | **13.3%** | 16.1% | 12.6% |
| `cap=6` | 33.3% | **33.6%** | 36.8% | 32.3% |
| `cap=3` | 59.1% | **59.4%** | 62.1% | 58.3% |
| GENEROUS | 78.2% | **78.3%** | 80.1% | 77.8% |

Full spread at the recommended setting: **32.3% – 36.8%** — four rules, one
ranking, and no reading of the boundary question gets `cap=6` anywhere near 50%.

So the inference gap moves the *number* by a couple of points and moves the
*answer* not at all.

And the gap is smaller than "inferred" makes it sound. The conservative rule
places **2,699 internal boundaries** across the corpus, and **2,622 of them —
97.1% — come from punctuation the course authors typed**. Only **2.9% come from
my word list**. The segmentation is overwhelmingly *read off the course*, not
guessed at; the word list is a thin correction on top. (The aggressive rule adds
841 more boundaries, a 31% increase, and that is the honest upper bound on how
much a comma-blind reading could differ.)

### The hand audit, and what it changed

Job **#253** judged all **200 phrases** of a random sample by hand against the
German, and scored the rule at the boundary level:

| rule | boundaries placed | true positives | false positives | false negatives | precision | recall |
|---|---|---|---|---|---|---|
| conservative | 53 | 40 | 13 | 5 | **0.755** | **0.889** |
| aggressive | 77 | 43 | 34 | 2 | 0.558 | 0.956 |

Ground truth on that sample was 245 sub-clauses; conservative reported 253, so it
**over-segments by about 3%**. Every one of its 13 false positives came from the
punctuation rule, not from my word list:

- **5×** a comma after a discourse marker — "**jo,** es klingt noch a guate Idee"
- **5×** a comma before an infinitival *zu-/zum-* clause with no finite verb of
  its own — "…Zeit, **zum** lernen"
- **1×** a comma before a vocative — "…kann, **der Herr**"; the corpus also has
  "gnädige Frau" after a comma 43 times
- **2×** the fixed double-relative "de wos" split from its antecedent

The 5 false negatives are the deliberately-excluded coordinators and — the
structural one — the **bare V2 complement clause**: "i glaub **er hot si
täuscht**", with no comma and no *dass*. That construction is common in casual
Bavarian and **no surface rule can reach it without a verb-position parse**. It
is a declared gap, not a tuning knob.

**I rebuilt the rule to remove the three fixable false-positive classes and
re-ran the whole sweep** — that is the `corrected` column. One correction the
audit suggested I did *not* make: a merge rule for "de wos" also swallowed
genuine relative clauses ("des, **wos** sie gsogt hot" = "what she said"),
trading one false positive for several false negatives, so it is left in as a
known residual error.

**The audit reasoned that correcting the rule would shrink the denominator and so
*raise* the completeness percentage. Measured, it does the opposite** — every
setting drops about 1.3 points. The reason is worth stating because it is a real
property of the metric: a spurious boundary at a comma is exactly where a splice
join tends to land, and a join sitting *on* a boundary counts as harmless while a
join *inside* a clause does not. Over-segmenting therefore flatters the score.
So conservative slightly over-reports completeness, and the corrected column is
the more honest one. Either way the recommendation is unchanged.

### One more definitional choice, stated plainly

A sub-clause counts as **complete** when **no splice join falls inside it**. For
a phrase that is recorded, that is automatic: the natural take is one continuous
read, so all its sub-clauses are complete even if its *slow* take has stops in it
(the slow take is alignment material and is never filed as a clip —
`services/script-take-filing.cjs`). For a phrase that is assembled, the piece
boundaries are the joins.

A stricter reading — a sub-clause is complete only if the recordist never paused
inside it either — is also reported, as **strict** below. It runs 3 points lower
at TIGHT and 14 points lower at `cap=2` — the gap widens as more lines get
recorded, because a recorded line is where internal stops live — and it does not
change any ranking.

---

## 2. The knobs

**`minPieceWords`** — the only knob that ships. `services/recording-pools.cjs`,
`DEFAULT_MIN_PIECE_WORDS`, CLI `--min-piece-words`. Smallest piece a phrase may
be spliced from: `1` = TIGHT, `2` = GENEROUS. There is no `1.5`, and the two
integers are 6,759 lines and 12 hours apart. That is why a middle setting cannot
be reached with what exists today.

**`maxPieces`** — the knob this sweep adds and the one I recommend. A cap on
splice depth: if a phrase's fewest-piece assembly needs more than N pieces,
record it whole instead. One changed line in `buildPoolB`'s selection step:

```js
const pre = assemble(p.tokens, available, minWords)
if (pre && pre.length <= cap) continue        // was: if (pre) continue
```

It controls the quality figure directly rather than by accident, and it sweeps
smoothly from TIGHT (`Infinity`) past GENEROUS. Three other knob shapes were
swept — a length-scaled cap `ceil(words/K)`, a length-thresholded cap, and a
greedy value-ordered promotion that buys back the most broken sub-clauses per
second of tape. **None of them beat the plain integer cap at the 4-hour
ceiling** (§4).

---

## 3. The sweep

Live `deu_at_for_eng`, 2026-08-24: 1,259 LEGO rows, 668 seeds, 12,551 practice
phrases, **11,858 distinct phrase texts, 14,512 sub-clauses**. Pool A is 1,704
items (54 min) at every setting and is inside every hour figure.

| setting | lines | hours | **% sub-clauses complete** | corrected | strict | **% lines read whole** | splice-depth distribution | **worst splice** | coverage |
|---|---|---|---|---|---|---|---|---|---|
| **TIGHT** `mpw=1` | 1,346 | 2.44 | **13.3%** | 12.6% | 10.0% | 64.6% | 2pc 1265 · 3pc 2094 · 4pc 2326 · 5pc 1900 · 6pc 1262 · 7pc 815 · 8pc 411 · 9pc 193 · 10pc 94 · 11pc 49 · 12pc 18 · 13pc 14 · 14pc 4 | **14** | 100% |
| `cap=12` | 1,359 | 2.51 | 14.3% | 13.5% | 10.8% | 63.9% | tail to 12pc 17 | 12 | 100% |
| `cap=8` | 1,539 | 3.17 | 24.7% | 23.8% | 19.7% | 57.0% | 2pc 1826 · 3pc 2696 · 4pc 2531 · 5pc 1620 · 6pc 816 · 7pc 363 · 8pc 121 | 8 | 100% |
| `cap=7` | 1,665 | 3.51 | 28.7% | 27.4% | 22.9% | 53.5% | 2pc 2093 · 3pc 2894 · 4pc 2481 · 5pc 1434 · 6pc 606 · 7pc 207 | 7 | 100% |
| **`cap=6`** ← | **1,896** | **4.05** | **33.6%** | **32.3%** | 26.6% | **50.1%** | 2pc 2502 · 3pc 3163 · 4pc 2274 · 5pc 1081 · 6pc 341 | **6** | 100% |
| `cap=5` | 2,292 | 4.87 | 39.5% | 38.2% | 30.8% | 45.9% | 2pc 2948 · 3pc 3256 · 4pc 1931 · 5pc 673 | 5 | 100% |
| `cap=4` | 3,030 | 6.31 | 47.2% | 46.1% | 36.0% | 44.7% | 2pc 3421 · 3pc 3229 · 4pc 1275 | 4 | 100% |
| **`cap=3 if w≤5 else 4`** | **3,605** | **7.07** | **51.0%** | **49.8%** | — | 48.2% | 2pc 3557 · 3pc 3005 · 4pc 870 | **4** | 100% |
| `cap=4 if w≤7 else 3` | 3,338 | 7.21 | 50.6% | 49.5% | — | 45.0% | 2pc 3636 · 3pc 3036 · 4pc 863 | 4 | 100% |
| `cap=3` | 4,488 | 9.06 | 59.4% | 58.3% | 45.3% | 50.9% | 2pc 3899 · 3pc 2493 | **3** | 100% |
| `cap=w/2.4` | 4,784 | 8.61 | 58.5% | 57.3% | 43.6% | 53.9% | 2pc 3534 · 3pc 2397 · 4pc 397 · 5pc 72 · 6pc 9 | 6 | 100% |
| `cap=3 if w≤5 else 2` | 5,849 | 12.12 | 70.0% | 69.3% | 55.2% | 58.6% | 2pc 3859 · 3pc 953 | 3 | 100% |
| `cap=2` | 7,411 | 14.34 | 79.7% | 79.1% | 65.6% | 69.0% | 2pc 3466 | **2** | 100% |
| **GENEROUS** `mpw=2` | 8,105 | 14.31 | **78.3%** | 77.8% | 68.3% | 80.6% | 2pc 2858 · 3pc 690 · 4pc 70 · 5pc 17 · 6pc 1 | 6 | 100% |
| `mpw=3` | 10,787 | 19.32 | 95.4% | 95.3% | 91.2% | 93.4% | 2pc 1011 · 3pc 37 · 4pc 1 | 4 | 100% |

Splice depths count only phrases that are **not** recorded — the ones the learner
hears joined. A phrase assembled from a *single* piece is one clean cut with no
join at all and is excluded from the distribution: 601 of those at `cap=6`, 978
at `cap=3`, 117 at GENEROUS, 67 at TIGHT.

**Coverage never moved. 100% at every one of the 50+ settings swept** — zero
unassemblable phrases, checked twice: once by `buildPoolB` itself, once by
`verifyAssembly` reading only the emitted chunk maps. Nothing here trades
coverage away, so there is nothing to flag.

**Harness calibrated against a known positive.** At `maxPieces = Infinity` the
patched builder reproduces the published figures exactly on live data — 1,346
lines / 869 no-stop at `mpw=1`, 8,105 / 6,534 at `mpw=2` — and matches the
unpatched `services/recording-pools.cjs` line for line.

---

## 4. The two frontier points

**50% of sub-clauses costs 7.07 hours.** The cheapest 50% setting found across
every knob family is `cap = 3 if the phrase is ≤5 words else 4` — 3,605 lines,
51.0%, worst splice 4, coverage 100%. The plain `cap=4` is close behind at 47.2%
for 6.31 h. Nothing reached 50% under 7 hours.

**4 hours buys 33.6%, and that is genuinely the ceiling.** I tried to beat plain
`cap=6` with a greedy promoter that ranks every spliced phrase by *sub-clauses
rescued per second of tape* and buys them in that order until the budget runs
out — the theoretical best a 4-hour budget can do. It did not beat it:

| approach | hours | % sub-clauses |
|---|---|---|
| **plain `cap=6`** | **4.05** | **33.6%** |
| `cap=7` + 25 min greedy | 3.93 | 31.7% |
| `cap=7` + 40 min greedy | 4.18 | 33.3% |
| `cap=8` + 33 min greedy | 3.72 | 29.0% |
| `cap=6` + 15 min greedy | 4.30 | 35.5% |
| `cap=12` + 108 min greedy | 4.32 | 27.3% |

The simple parameter *is* the frontier. There is no clever ordering hiding an
extra 15 points inside four hours — recording a clause whole costs what it costs
to say it, and the exchange rate is about **6 minutes of tape per 1% of
sub-clauses**.

---

## 5. Timing basis — measured, and it moved the answer

Every hour figure is measured. Job **#248** downloaded and `ffprobe`'d **248 real
Sascha clips** for this course (2026-08-19 → 08-23, 199 from the weekend
session), because `recording_provenance.duration_ms` is not populated — a real
gap, and it means this fit cost a re-download rather than a query.

| cadence | fit (seconds) | n | R² |
|---|---|---|---|
| natural | **1.387 + 0.328 × words** | 227 | 0.50 |
| slow | **−3.577 + 1.150 × words** | 21 | 0.70 |

Pool B lines are read **twice** — natural then slow — in coverage order
(`services/recording-script-items.cjs`). Pool A once, natural.

**This replaces the `0.87 + 0.226 × words` fit published 2026-08-22, which came
from 26 clips and priced the slow read at natural speed. It was optimistic by
about 1.6×.** GENEROUS is not "9 hours of speech" — on measured rates it is
**14.3 hours**.

Two caveats on the slow fit. It rests on 21 clips, all 7–14 words; **there are no
slow takes of 1–6 word phrases in the data at all**, so its negative intercept is
an extrapolation artifact. I floored slow time at natural time for short lines. A
pessimistic alternative (natural intercept, slow slope) puts `cap=6` at 4.9 h, so
the recommendation sits on the optimistic side of a genuine uncertainty.

All of these are **speech time, not session time** — tapping, breathing,
listening back and retakes are observed nowhere and modelled nowhere.

### One lever that is not the optimiser's to pull

At `cap=6`, 950 of the 1,896 lines have no internal stop, and **a line with no
stop has no boundary for the aligner to find, so its slow take is dead weight**.
Skipping those takes `cap=6` from 4.05 h to **3.47 h**, which would make `cap=5`
(39.5% of sub-clauses, worst splice 5) affordable at 4.17 h — nearly 6 points of
Kai's target for free. That is a change to `buildScriptItems`, not a config
value. **Proposed, not made.**

---

## 6. What `cap=6` does, sub-clause by sub-clause

`//` separates sub-clauses. `✓` = delivered complete, `✗` = a join lands inside it.

```
"if I'd known then what I know now I'd have waited"
  recorded whole — all 3 complete
  ✓ wenn i damols gwusst hätt,  //  ✓ wos i iatz woaß,  //  ✓ hätt i gwart

"she said that she can't spend much time with the group"
  recorded whole — both complete
  ✓ sie hot gsogt,  //  ✓ dass s' ned viel Zeit mit da Gruppn verbringen kann

"that man has just started to practise speaking"
  recorded whole — 1 sub-clause, complete

"because I think that it's a good thing to make mistakes"
  recorded whole — all 3 complete
  ✓ weil i glaub,  //  ✓ dass es wos Guats is,  //  ✓ wenn ma Fehler mocht

"I met someone last night who works with your brother"
  5-piece splice — both sub-clauses broken
  ✗ i hob gestern auf d'Nocht wen troffn,  //  ✗ der wos mit deim Bruada arbeit
```

Under TIGHT, every one of these five is a 9-to-11-piece splice and every
sub-clause in them is broken. That is the 13.3% → 33.6% move in concrete form:
four of the five worst lines in the course stop being assembled at all.

The fifth is what 33.6% means. It stays broken at four hours, and it is the kind
of line that only stops being broken at seven.

---

## 7. Where it misses, plainly

- **4 hours** — met. 4.05 h, three minutes over, on measured rates. 4.9 h under
  the pessimistic slow-read model.
- **50% of sub-clauses** — **missed, by 16 points.** `cap=6` delivers 33.6%.
  Reaching 50% costs 7.07 h, and no knob family swept gets there for less.
- **Worst splice 6** is the price of the ceiling. Getting the worst splice to 4
  costs 6.3 h; to 3, 9.1 h; to 2, 14.3 h.
- **Coverage** — 100%, unmoved, everywhere.
- **The sub-clause boundary rule is inferred, not measured** (§1). 97.1% of its
  boundaries come from punctuation the course authors typed; a 200-phrase hand
  audit (#253) put it at precision 0.755 / recall 0.889, and correcting the
  errors it found moves `cap=6` from 33.6% to 32.3%. The one error class nothing
  can fix is the bare V2 complement ("i glaub er hot si täuscht") — no
  punctuation, no subordinator, no hook.

**Plainly: Kai's target as stated is not achievable. 50% of sub-clauses complete
costs 7.1 hours, not 4. At 4 hours the best available is 33.6%.** If four hours
is a genuine wall, take `maxPieces = 6`. If half the sub-clauses matters more
than the wall, take `cap = 3 if ≤5 words else 4` and budget seven hours. Both
hold 100% coverage and both are a large improvement on TIGHT's 11-piece splices.

---

## Not changed

`DEFAULT_MIN_PIECE_WORDS` is untouched. `maxPieces` does not exist in
`services/recording-pools.cjs` on `main` — it lives only in the sweep harness
under `scripts/mid-setting/` (gitignored). Landing it is a ~6-line change to
`buildPoolB` plus a CLI flag, and it is not made until Kai names a row.


