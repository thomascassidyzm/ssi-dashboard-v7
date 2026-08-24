# Two pools: measured on the real Austrian German script, then built

22 August 2026. Kai's ruling of 2026-08-21, implemented. Nothing recorded was
touched; this changes FUTURE script generation only.

---

## The two numbers you asked for

**Does it hit 100% real phrase coverage? Yes. 11,858 of 11,858.**
Every phrase in `deu_at_for_eng` can be assembled end to end from Pool B pieces,
with no phrase incomplete. Checked twice by two independent paths — the builder's
own check and a separate verifier reading only the emitted chunk maps. Zero
failures either way.

For scale, the same test on **today's live script: 3,350 of 11,858 — 28.3%.**
That is worse than the 68% published yesterday, because 68% was measuring
whether a *block* could be cut out. 28.3% is measuring whether a *phrase* can be
rebuilt, which is the thing learners actually need.

**How many absurd one-word stops are left? That depends on one setting, and the
answer is the most important thing on this page.**

| | today (live) | two pools, setting 1 | two pools, setting 2 |
|---|---|---|---|
| lines the recordist reads | 497 | 1,346 | 8,105 |
| times asked to stop mid-line | 1,427 | **607** | 1,832 |
| stops per line | 2.87 | 0.45 | **0.23** |
| one-word pieces inside stopped lines | 705 | 710 | 747 |
| one-word pieces **per line read** | 1.42 | 0.53 | **0.09** |
| lines read straight through, no stop | 0 | 869 (65%) | **6,534 (81%)** |
| real phrase coverage | 28.3% ✗ | **100%** | **100%** |

Setting 1 allows a phrase to be spliced from single-word pieces. Setting 2
forbids it (`minPieceWords=2`).

---

## The honest finding, and it cuts against the expectation in the brief

The brief said Pool A should "let phrase chunks grow to a natural size and kill
most of the absurd one-word stops around *des*, *i*, *hot*."

**Pool A does half of that, and only half.** Taking the isolate-every-unit job
away from the slow read really does work: mid-line stops drop from 1,427 to 607
straight away. But the surviving stops are still mostly around single words,
because they were never caused by LEGO isolation in the first place.

They are caused by the **other** obligation — reassembly. To rebuild 11,858
arbitrary phrases out of a few hundred recorded lines you need word-sized
material, and in this dialect a word is *des*, *i*, *hot*. The binding constraint
is not "isolate every teaching unit". It is "assemble every phrase".

You can only escape it by refusing to splice at word size — which is setting 2 —
and that means recording far more lines whole. That is the whole trade, and it
is a decision only you can make.

---

## Real lines, before and after

`|` is where Sascha is asked to stop.

**The worst line in the script** — "if I'd known then what I know now I'd have waited"

```
today       wenn i | damols | gwusst | hätt, | wos i | iatz | woaß, | hätt i | gwart      8 stops
setting 1   not read at all — assembled from 11 word-sized pieces
setting 2   wenn i damols gwusst hätt, wos i iatz woaß, hätt i gwart                      0 stops
```

**"she said that she can't spend much time with the group"**

```
today       sie hot | gsogt, dass s' | ned viel | Zeit mit da | Gruppn | verbringen | kann
setting 1   not read at all — assembled from 11 pieces
setting 2   sie hot gsogt, dass s' | ned viel Zeit mit da Gruppn verbringen | kann
```

**"that man has just started to practise speaking"**

```
today       der Monn do hot | grod | erst | mitm | reden übn | angfangt
setting 1   not read at all — assembled from 9 pieces
setting 2   der Monn do hot grod erst | mitm reden übn angfangt
```

**"will they be able to drive us home after the meal?"**

```
today       wern s' uns | noch'm | Essn | hoam | foahrn | kennan?
setting 1   wern s' uns | noch'm Essn | hoam | foahrn | kennan?
setting 2   wern s' uns | noch'm Essn hoam foahrn | kennan?
```

**"I met someone last night who works with your brother"**

```
today       i hob | gestern auf d'Nocht wen | troffn, | der wos | mit deim | Bruada | arbeit
setting 1   not read at all — assembled from 11 pieces
setting 2   not read at all — assembled from 3 pieces:
            "i hob gestern auf d'Nocht" + "wen troffn" + "der wos mit deim Bruada arbeit"
```

**"because I think that it's a good thing to make mistakes"**

```
today       weil i glaub, | dass es | wos Guats is, | wenn ma Fehler mocht
setting 1   not read at all — assembled from 11 pieces
setting 2   weil i glaub, dass es wos Guats is, wenn ma Fehler mocht                      0 stops
```

Look at setting 1 on those lines. The stops go away because the **line** goes
away — it is never read, it is assembled from eleven word-sized fragments. That
is not the win it looks like in the stops column, and it is why the
recommendation below is setting 2.

---

## Pool A

**1,704 items, one clear read each.** 1,248 LEGOs, plus **456 components that
have no clip of their own today**.

Your worked example is exactly right. In `course_legos` a molecular LEGO carries
its components in a `components` jsonb column, not as rows:

```
S0038L02  seit zirka ana Wochn   for about a week
          components: seit / zirka / ana Wochn
```

`zirka` is a component of a longer LEGO and is **not** a LEGO row anywhere in
this course. Under the current tool it never gets a clip.

**Your components question, answered with the number.** Of the 705 one-word
pieces in today's script:

- **472 distinct texts, and all 472 are LEGO rows in their own right.** The
  earlier report was right about that: the tiler physically cannot cut inside a
  unit, so no one-word stop is a fragment of a longer LEGO.
- **97 of those 472 (240 instances of the 705) are also components of a longer
  LEGO** — the same word entered twice, once inside a molecule and once as its
  own teaching unit.
- The report was right on its own question and missed yours by one step: the
  splintering it could not see is the **456 components with no row at all**.
  Those are invisible to a count of one-word chunks, because they were never in
  the script to be counted. Pool A is where they get a clip.

---

## Timing, and how much of it is modelled

**Do not carry the 11-seconds-per-item figure forward. Nobody has ever timed a
real separate-item session, and I have not either.**

Instead I fitted a per-word read rate to **26 real deu_at human clips of
Sascha's**: `0.87s + 0.226s per word`, R² = 0.41. That R² is weak — read speed
varies a lot line to line — so treat these as speech time, not session time. A
session also contains tapping, breathing, listening back and retakes, and none
of that is observed.

| | Pool A (1 read) | Pool B (2 reads) | total |
|---|---|---|---|
| **setting 1** speech only, observed rate | 35 min | 60 min | **95 min** |
| **setting 1** flat 6s/read, as the tool and yesterday's page count it | 170 min | 269 min | **440 min** |
| **setting 2** speech only, observed rate | 35 min | 506 min | **541 min** |
| **setting 2** flat 6s/read | 170 min | 1,621 min | **1,791 min** |

The like-for-like against yesterday's page, which used a flat 6s/read: today's
script is 99 min on that scale, setting 1 is 440 min, setting 2 is 1,791 min.

Setting 2 is roughly **9 hours of speech**, and realistically two to three times
that in session hours. That is a campaign, not a session. It is also the only
option on this page that gives both 100% coverage and lines that read like
sentences.

---

## Something else the measurement turned up, and you should see it

**The chunk floor that landed on 2026-08-21 to shorten the read made phrase
coverage worse, silently.** Same script, same selection, only the floor differs:

| | LEGOs extractable | phrases assemblable |
|---|---|---|
| before the floor | 961 / 1,248 | 4,986 / 11,858 (42.0%) |
| with the floor (live now) | 837 / 1,248 | 3,350 / 11,858 (**28.3%**) |

A note on which number you will see where: every figure on this page counts
**distinct phrase texts** (11,858 of them). The tool's own `realCoveragePercent`
field counts **rows** (13,219, the same phrase appearing under two seeds counted
twice), so it reads 30.4% where this page says 28.3%. Same defect, two
denominators.

The mechanism is concrete: `mit` is a LEGO, but at ≤3 characters the floor
always absorbs it into a neighbour, so `mit` can never be cut back out — and
every phrase needing `mit` at a boundary fails. That is not an argument against
the floor; under the two-pool design the floor is not used at all, because Pool B
prunes to the cuts reassembly actually needs. But it should be on the record.

---

## What was built

- `services/recording-pools.cjs` — new. `buildPoolA`, `buildPoolB`,
  `verifyAssembly`. Pure, no I/O, 12 tests.
- **The coverage test is fixed.** `verifyAssembly` measures whether a phrase can
  be *reassembled from pieces that can actually be cut*, not whether its text
  appears somewhere in what will be read. The old generous number is still
  emitted under its old name so nothing changes shape for existing callers, but
  the honest fields (`extractableLegos`, `phrasesAssemblable`,
  `realCoveragePercent`) now sit beside it on **every** script the tool
  produces, including the live one.
- `--two-pools` on the generator CLI, `?pools=true` on
  `GET /api/production/:courseCode/recording-script`, `--min-piece-words` /
  `?minPieceWords=` for the setting above.
- `buildTwoPoolScriptItems` — Pool A is ONE item per unit, never a natural/slow
  pair.
- **Two guards make your "never spliced" ruling true in code.** A Pool A read
  is tagged `cadence: 'isolated'`, which (a) files as a clip — `'slow'` is
  silently refused by `script-take-filing.cjs`, so tagging it slow would have
  produced a teaching clip that never exists — and (b) is dropped from take
  grouping in `voice-engine/provenance-adapter.cjs`, so it never reaches the
  segment store and can never be pulled into a spliced phrase. Without that
  second guard it would have been: the splicer keys purely on chunk text and
  cadence, and today it cannot tell an isolated read from a chunk cut out of a
  real sentence.
- 28 tests, all passing. 371 tests pass across the voice-engine and recording
  suites; the two failures there are two pre-existing empty test files
  (`recordist-clip-variant`, `recordist-queue`), untouched by this work.

---

## What I did not do, and what is still unknown

- **Nobody has listened to anything.** Whether a phrase assembled from three
  pieces sounds acceptable, and whether one assembled from eleven sounds as bad
  as I think it does, is an ear question and it is unanswered.
- **Session minutes are modelled.** The per-word rate is observed on 26 real
  clips; everything that is not speech — tapping, retakes, pauses between items
  — is not, at either setting.
- **The API route is exercised end to end at the function level, not against a
  running server.** Generator → items → item list runs on the real course and
  produces 4,396 items; the HTTP route was not hit live.
- **Only deu_at_for_eng was measured.** Every hand-recorded course runs the same
  tool and, on yesterday's evidence, has the same shape — unmeasured.
- The 2026-08-21 finding that existing takes carry their own pause map was
  **re-verified today at a larger N: 60 of 60 slow takes** carry a non-empty
  `chunks_string` in `recording_provenance.quality_notes`, read back per-take at
  `voice-engine/provenance-adapter.cjs:50`. Nothing re-derives a chunk map from
  the current generator. Script changes cannot reach backwards.
- Nothing is in flight. Last upload on this course was 2026-08-21 15:32 UTC —
  Sascha's 4-take natural-only course-order session, seed 1, filed as target2.
  Untouched.

---

## What I would do

**Ship setting 2.** It is the only configuration that satisfies both halves of
your ruling at once: 100% real coverage *and* lines that read like sentences —
80% of them with no stop at all, including the worst line in the script.

It costs a campaign rather than a session. If that is too much, setting 1 still
delivers the hard rule and still halves the stops, but it buys the stop count by
never reading the long sentences at all, and I would not call that better audio.

Either way, the coverage-test fix and Pool A should ship regardless of which
setting you pick: 456 components currently have no clip, and until today nothing
told anybody.
