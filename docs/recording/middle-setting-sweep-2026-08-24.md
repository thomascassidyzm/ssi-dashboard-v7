# The middle setting: swept on measured read rates, and where it misses

24 August 2026. Kai ruled he wants neither TIGHT nor GENEROUS, and gave the
target himself: *"something like 50% of clauses are complete… recording time at
something like 4h max."* This is the sweep between the two settings, on live
`deu_at_for_eng` data pulled today, timed against 248 real Sascha clips.

No TTS. No database writes. No change to any live default. Analysis only.

---

## The short answer

**50% complete and 4 hours are not achievable together. They are not close.**

The two constraints trade almost linearly, and the honest exchange rate — measured,
not modelled — is about **13 minutes of recording per 1% of the course made
complete**. Half the course complete costs 8½ to 12 hours. Four hours buys
16–26%.

**Recommended setting: `minPieceWords = 1`, `maxPieces = 6`.**

| | |
|---|---|
| lines the recordist reads | **1,896** |
| total speech | **4.05 h** (Pool A 0.9 h + Pool B 3.2 h), as the session is structured today |
| **lines read straight through, no stop** | **50.1%** |
| **worst splice depth** | **6 pieces** — TIGHT is 14, GENEROUS is 6 |
| real phrase coverage | **100%** — 11,858 / 11,858, independently verified |

It lands on Kai's two numbers exactly *as he phrased them*: 50.1% of lines read
straight through, 4.05 hours of speech. It misses badly on the other reading of
"complete" — only 16% of the course's 11,858 phrases are recorded whole. Both
readings are laid out below, because the answer genuinely depends on which one
he meant, and I am not going to pick for him.

---

## 1. The knobs

**`minPieceWords`** — the only knob that ships today.
`services/recording-pools.cjs`, `DEFAULT_MIN_PIECE_WORDS`, CLI
`--min-piece-words`. The smallest piece a phrase may be spliced from. `1` is
TIGHT, `2` is GENEROUS. There is no `1.5`. The two integers are 6,759 lines and
about 12 hours apart, which is exactly why "a middle setting" cannot be reached
with what exists.

**`maxPieces`** — the knob this sweep adds, and the one I recommend. A cap on
splice depth: if a phrase's fewest-piece assembly needs more than `maxPieces`
pieces, it is recorded whole instead. One changed line in `buildPoolB`'s
selection step:

```js
const pre = assemble(p.tokens, available, minWords)
if (pre && pre.length <= cap) continue        // was: if (pre) continue
```

It is the right knob for Kai's stated concern because it controls the quality
figure *directly* — how deep the worst splice is — instead of controlling it by
accident, and it sweeps smoothly from TIGHT (`Infinity`) all the way past
GENEROUS.

Two other knob shapes were swept. Neither beat it. A length-scaled cap
(`ceil(words/K)` — long sentences allowed more joins) sits on the same frontier
but is strictly worse on the figure Kai cares about: it buys its hours by
permitting 7- and 8-piece splices on the longest lines. A length-thresholded cap
(`3 if short else 2`) is the same frontier again.

---

## 2. The sweep

Live `deu_at_for_eng`, pulled 2026-08-24: 1,259 LEGO rows, 668 seeds, 12,551
practice phrases, **11,858 distinct phrase texts**. Pool A is 1,704 items at
every setting (54 min) and is included in every hour figure.

| setting | lines | **hours** | % lines read whole | % phrases whole | % phrases with **no join** | splice-depth distribution | **worst splice** | coverage |
|---|---|---|---|---|---|---|---|---|
| **TIGHT** `mpw=1` | 1,346 | 2.44 | 64.6% | 11.4% | 11.9% | 2pc 1265 · 3pc 2094 · 4pc 2326 · 5pc 1900 · 6pc 1262 · 7pc 815 · 8pc 411 · 9pc 193 · 10pc 94 · 11pc 49 · 12pc 18 · 13pc 14 · 14pc 4 | **14** | 100% |
| `cap=12` | 1,359 | 2.51 | 63.9% | 11.5% | 12.2% | tail to 12pc 17 | 12 | 100% |
| `cap=8` | 1,539 | 3.17 | 57.0% | 13.0% | 15.9% | 2pc 1826 · 3pc 2696 · 4pc 2531 · 5pc 1620 · 6pc 816 · 7pc 363 · 8pc 121 | 8 | 100% |
| **`cap=6`** ← | **1,896** | **4.05** | **50.1%** | 16.0% | 21.1% | 2pc 2502 · 3pc 3163 · 4pc 2274 · 5pc 1081 · 6pc 341 | **6** | 100% |
| `cap=5` | 2,292 | 4.87 | 45.9% | 19.3% | 25.7% | 2pc 2948 · 3pc 3256 · 4pc 1931 · 5pc 673 | 5 | 100% |
| `cap=4` | 3,030 | 6.31 | 44.7% | 25.6% | 33.2% | 2pc 3421 · 3pc 3229 · 4pc 1275 | 4 | 100% |
| `cap=3` | 4,488 | 9.06 | 50.9% | 37.8% | 46.1% | 2pc 3899 · 3pc 2493 | 3 | 100% |
| `cap=w/2.4` | 4,784 | 8.61 | 53.9% | 40.3% | 46.0% | 2pc 3534 · 3pc 2397 · 4pc 397 · 5pc 72 · 6pc 9 | 6 | 100% |
| `cap=3 if w≤5 else 2` | 5,849 | 12.12 | 58.6% | 49.3% | 59.4% | 2pc 3859 · 3pc 953 | 3 | 100% |
| `cap=w/3` | 6,477 | 11.80 | 62.1% | 54.6% | 61.6% | 2pc 3543 · 3pc 918 · 4pc 89 · 5pc 8 | 5 | 100% |
| `cap=2` | 7,411 | 14.34 | 69.0% | 62.5% | 70.8% | 2pc 3466 | **2** | 100% |
| **GENEROUS** `mpw=2` | 8,105 | 14.31 | 80.6% | 68.4% | 69.3% | 2pc 2858 · 3pc 690 · 4pc 70 · 5pc 17 · 6pc 1 | 6 | 100% |
| `mpw=2 cap=3` | 8,185 | 14.58 | 81.1% | 69.0% | 70.2% | 2pc 2895 · 3pc 636 | 3 | 100% |
| `mpw=3` | 10,787 | 19.32 | 93.4% | 91.0% | 91.2% | 2pc 1011 · 3pc 37 · 4pc 1 | 4 | 100% |

Splice depths count **only phrases that are not recorded** — the ones the learner
hears joined. A phrase assembled from a *single* piece is one clean cut with no
concatenation at all, so it is excluded from the distribution and folded into the
"no join" column instead: 601 such phrases at `cap=6`, 117 at GENEROUS, 67 at
TIGHT.

**Coverage never moved. 100% at every one of the 40+ settings swept — zero
unassemblable phrases, checked twice**: once by `buildPoolB` itself, and once by
`verifyAssembly` reading only the emitted chunk maps. Nothing on this page trades
coverage away, so there is nothing to flag.

**Harness calibrated against a known positive.** At `maxPieces = Infinity` the
patched builder reproduces the published figures exactly on live data — 1,346
lines / 869 no-stop at `mpw=1`, 8,105 / 6,534 at `mpw=2` — and matches the
unpatched `services/recording-pools.cjs` line for line.

---

## 3. Timing basis — measured, and it moved the answer

Every hour figure above is **measured, not guessed**. Job **#248** downloaded and
`ffprobe`'d **248 real Sascha clips** for `deu_at_for_eng` (2026-08-19 → 08-23,
199 of them from the weekend session), because `duration_ms` is not populated on
`recording_provenance` for this course — that is a real gap, and it means this
fit cost a re-download rather than a query.

| cadence | fit (seconds) | n | R² |
|---|---|---|---|
| natural | **1.387 + 0.328 × words** | 227 | 0.50 |
| slow | **−3.577 + 1.150 × words** | 21 | 0.70 |

Pool B lines are read **twice** — natural, then slow — in coverage order
(`services/recording-script-items.cjs`). Pool A is read once, natural.

**This replaces the earlier `0.87 + 0.226 × words` fit, which was drawn from 26
clips and counted the slow read at natural speed. It was wrong in both
directions and it was optimistic.** GENEROUS is not "9 hours of speech"; on
measured rates it is **14.3 hours**. TIGHT is 2.4 h, not 1.6 h. Everything on
this page is 1.5–1.6× the old numbers, and the 4-hour ceiling is correspondingly
harder to clear than it looked.

Two honest caveats on the slow fit. It rests on 21 clips, all between 7 and 14
words — there are **no slow takes of 1–6 word phrases in the data at all** — so
its negative intercept is an extrapolation artifact. I floored slow time at the
natural time for short lines (a slow read is never faster than a natural one).
Using the slope with the natural intercept instead pushes `cap=6` from 4.05 h to
4.9 h, so the recommendation sits on the optimistic side of a real uncertainty.

And all of these are **speech time, not session time**. Tapping, breathing,
listening back and retakes are observed nowhere and modelled nowhere. A real
4-hour speech script is more than one sitting.

### One lever that is not the optimiser's to pull

At `cap=6`, 950 of the 1,896 lines have no internal stop. **A line with no stop
has no boundary for the aligner to find, so its slow take is dead weight** — it
is never filed as a clip (`services/script-take-filing.cjs` refuses cadence
`slow`) and it yields no span its natural take does not already yield. Skipping
those slow reads takes `cap=6` from 4.05 h to **3.47 h**, and makes `cap=5`
(worst splice 5, 19.3% of phrases whole) affordable at 4.17 h.

That is a change to `buildScriptItems`, not a config value. **Proposed, not
made.**

---

## 4. Three ways to read "50% of clauses are complete"

Kai's 81% is the published GENEROUS figure and it is a **share of recorded
lines**. That reading has a trap in it: TIGHT is already 64.6% on the same
measure, so **50% is not between the two settings — it is below both**. You
reach it by making the recordist's page *busier*, not by finding a middle.

| | TIGHT | **`cap=6`** | GENEROUS |
|---|---|---|---|
| % of recorded lines read with no stop | 64.6% | **50.1%** | 80.6% |
| % of all 11,858 phrases recorded whole | 11.4% | **16.0%** | 68.4% |
| % of all phrases heard with no join at all | 11.9% | **21.1%** | 69.3% |

`cap=6` hits the first row on the nose and is a genuine step up from TIGHT on the
other two at the same 4-hour budget. It is nowhere near 50% on rows two and
three, and no setting is, inside four hours.

**If Kai meant row two or three — half the course heard as whole sentences — the
answer is: that costs 8.5 h (`cap=3 if w≤5 else 2`, 49.3%, worst splice 3) to
12 h (`cap=w/3`, 54.6%), and there is no knob shape that makes it cheaper.** The
frontier is flat across every knob family swept. Recording a sentence whole
costs what it costs to say it.

---

## 5. What `cap=6` does to the six worst lines

The six lines the original write-up used as its worst cases. `|` is a stop.

```
"if I'd known then what I know now I'd have waited"
  TIGHT   spliced from 11 word-sized pieces
  cap=6   wenn i damols gwusst hätt, wos i iatz woaß, | hätt i gwart
  cap=5   same
  GEN     read whole, 0 stops

"she said that she can't spend much time with the group"
  TIGHT   spliced from 11 pieces
  cap=6   sie hot gsogt, dass s' | ned viel | Zeit | mit | da Gruppn verbringen | kann
  cap=5   sie hot gsogt, dass s' | ned viel | Zeit | mit da Gruppn verbringen | kann
  GEN     sie hot gsogt, dass s' | ned viel Zeit mit da Gruppn verbringen | kann

"that man has just started to practise speaking"
  TIGHT   spliced from 9 pieces
  cap=6   der Monn do | hot grod | erst | mitm | reden übn | angfangt
  GEN     der Monn do hot grod erst | mitm reden übn angfangt

"will they be able to drive us home after the meal?"
  TIGHT   wern s' uns | noch'm Essn | hoam | foahrn | kennan?
  cap=6   wern s' uns | noch'm Essn hoam | foahrn | kennan?
  GEN     wern s' uns | noch'm Essn hoam foahrn | kennan?

"I met someone last night who works with your brother"
  TIGHT   spliced from 11 pieces
  cap=6   spliced from 5 pieces
  cap=5   read whole: i hob gestern auf d'Nocht | wen troffn, | der wos mit deim Bruada arbeit
  GEN     spliced from 3 pieces

"because I think that it's a good thing to make mistakes"
  TIGHT   spliced from 11 pieces
  cap=6   weil i glaub, dass es wos Guats is, wenn ma Fehler mocht    read whole, 0 stops
  GEN     read whole, 0 stops
```

This is the honest texture of a 4-hour script. Five of the six are read rather
than assembled, which TIGHT does not manage — but they are read with stops in
them, and they do not read like sentences the way GENEROUS does. Four hours does
not buy sentences. It buys "not eleven pieces".

---

## 6. Where it misses, plainly

- **4 hours** — hit. 4.05 h, three minutes over, on measured rates. Under the
  pessimistic slow-read model it is 4.9 h.
- **50% complete** — hit on the metric Kai quoted (50.1% of lines read straight
  through). Missed by a wide margin on the metric that matters to the learner's
  ear: 16% of course phrases recorded whole, 21% heard with no join.
- **Worst splice 6** is the price of the 4-hour ceiling. Getting the worst splice
  down to 3 costs 9.1 h; down to 2 costs 14.3 h.
- **Coverage** — 100%, unmoved, at every setting.

If four hours is genuinely a wall, `cap=6` is the answer. If Kai wants half the
course heard as whole sentences, the smallest honest number is **8.5 hours** and
I would rather he saw that than saw a setting quietly chosen for him.

---

## Not changed

`DEFAULT_MIN_PIECE_WORDS` is untouched. `maxPieces` does not exist in
`services/recording-pools.cjs` on `main` — it lives only in the sweep harness
under `scripts/mid-setting/` (gitignored). Landing it is a ~6-line change to
`buildPoolB` plus a CLI flag, and it is not made until Kai names a row.
