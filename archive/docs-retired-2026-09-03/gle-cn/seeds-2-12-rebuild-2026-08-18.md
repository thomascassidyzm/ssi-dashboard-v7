# gle_cn_for_eng — seeds 2–12 rebuilt and banked

Built 2026-08-18 against `docs/gle-cn/rulings-2026-08-18.md`. Eleven seeds, in order, 2 first, 12 last.
**Audio spend £0.00. `course_audio` for this course = 0 rows. Course still `draft` / `not_available`.**
`gle_for_eng` (102 enrolled learners) untouched — 943 legos / 5,975 phrases, last content edit 2026-08-13.

---

## 1. What landed

| seed | known | legos | phrases | source |
|---|---|---|---|---|
| 2 | I'm trying to learn | 2 | 9 | **fresh** |
| 3 | how to speak as often as possible | 3 | 20 | old `seed002.md` + enriched |
| 4 | how to say something in Irish | 2 | 18 | old `seed003.md`, **restructured** |
| 5 | I'm going to practise speaking with someone else | 3 | 30 | old `seed004.md` |
| 6 | I'm trying to remember a word | 2 | 16 | **fresh** |
| 7 | I want to try as hard as I can today | 2 | 16 | **fresh** |
| 8 | I'm going to try to explain what I mean | 3 | 24 | **fresh** |
| 9 | I speak a little Irish now | 2 | 18 | old `seed005.md` |
| 10 | I'm not sure if I can remember the whole sentence | 3 | 28 | old `seed006.md`, **Fork 5 applied** |
| 11 | I'd like to be able to speak after you finish | 4 | 34 | old `seed007.md`, **Fork 5 applied** |
| 12 | I wouldn't like to guess what's going to happen tomorrow | 5 | 42 | old `seed008.md`, **Fork 5 applied** |

**Running DB totals, verified by SQL:** 35 legos, 266 phrases across seeds 1–12
(seed 1's 4 legos / 11 phrases were already there and were not touched).

**Zero seeds refused.**

Audits run over all 290 distinct Irish strings now in the course:

| check | result |
|---|---|
| Connemara dialect gate (`dialect-check.cjs`) | **290 checked, 0 violations** |
| ZUT, lego level (one known → one target) | **0 conflicts** |
| ZUT, component level | **0 conflicts** |
| ZUT, phrase level | **0 conflicts** |
| `an féidir liom` remaining | **0** |
| `ag iarracht` / `ag triail` / `conas` | **0 / 0 / 0** |

Decompositions saved under the NEW numbering as `docs/gle-cn/decompositions/new002.md` … `new012.md`.
The old `seedNNN.md` files were left alone.

---

## 2. The three substantive changes — all applied

**Fork 5 — `an féidir liom` retired.** Substituted to `an bhfuil mé in ann` in seeds 10, 11 and 12.
In seed 10 the lego is `## L2 [A] "if I can" → "an bhfuil mé in ann"` with **no `Components:` line**, as
instructed. `chomh minic agus is féidir` was not touched and remains a frozen unsplit chunk (20 lines).

**Fork 2 — two known prompts, one target. IT PASSED.** The gate accepted
`"I'm trying" → "tá mé ag iarraidh"` (seed 2) sitting alongside `"I want" → "tá mé ag iarraidh"`
(seed 1). Verified in the DB: one target string, two legos, two knowns. No workaround was needed and
no second Irish form was invented.

**Fork 3 — `iarracht a dhéanamh` at seed 8.** Built as ruled. Seed 7 pre-teaches
`mo dhícheall a dhéanamh` as a whole idiom; seed 8's new pieces are `iarracht a dhéanamh`,
`céard atá i gceist agam` (one unsplit chunk) and `a mhíniú` (object-fronted).

---

## 3. Every gate rejection, quoted

Only two submissions were rejected, both on seed 2 and seed 4. Everything else landed first time.

**Rejection 1 — seed 2.** The gate rejects duplicate *target* strings inside one lego, and it does not
care that the known sides differ:

> `S0002L01: 2 duplicate phrase(s) within this LEGO: "tá mé ag iarraidh Gaeilge a labhairt anois", "tá mé ag iarraidh Gaeilge a labhairt leat"`
>
> `S0002L02: 2 duplicate phrase(s) within this LEGO: "tá mé ag iarraidh foghlaim anois", "tá mé ag iarraidh foghlaim"`

Part of this was my own BUILD/USE overlap. But the L2 hit killed the thing I most wanted to build:
**the same-phrase Fork-2 contrast pair.** `I'm trying to learn now` and `I want to learn now` are both
`Tá mé ag iarraidh foghlaim anois`, and the gate will not let both sit in one lego. See §5.

**Rejection 2 — seed 4.** The BUILD/USE minimum ramps at seed 4 and the re-used file was authored for
the old, laxer slot:

> `S0004L01: USE: need 5+, got 2` — `{"build":3,"use":2,"minBuild":3,"minUse":5}`
>
> `S0004L02: USE: need 5+, got 3`

Confirmed in `services/course-builder/lib/phrase-structure.cjs:110-124`: seeds ≤3 need 1 BUILD / 1 USE,
**seed 4 onward needs 3 BUILD / 5 USE.** This is a trap for anyone re-using a renumbered decomposition —
old seeds 2 and 3 were written under the lax rule and are illegal at their new numbers.

**Non-blocking warnings.** Every seed from 5 onward emitted `known_side` warnings of the form
`machinery "going" needs going-to (unlicensed)` on any phrase whose known side is "I'm going to …".
These are warnings, not errors, and they fired even on the seed that *introduces* `I'm going to → tá mé
chun`. The known-side contract's `going-to` construction is not being licensed by that lego's debut.
I did not chase it — it blocked nothing — but it is noise that will fire on hundreds of later phrases,
and it means the known-side gate is currently unable to tell a real "going" breach from a licensed one
in this course.

---

## 4. Changes I made beyond the three I was told to make

Three, all defensive, all inside my range:

**(a) Seed 4 restructured, not just renumbered.** The old file taught `## L2 [M] "to say" → "a rá"` with
`Components: to → a, say → rá`. That plants a component-level ZUT conflict — `to → a` here against
`to → le` in `cén chaoi le` (seed 3) — which is *exactly* the defect the previous run's own report says
it fixed elsewhere but left in this file. I rebuilt seed 4 as one object-fronted lego,
`"to say something" → "rud éigin a rá"` (components `something → rud éigin`, `to say → a rá`), which
matches the doctrine and removes the clash. Component ZUT is now 0 course-wide.

**(b) Seed 11's `after you` unsplit.** The old file had `## L3 [M] "after you" → "tar éis duit"` with
`Components: after → tar éis, you → duit`. `you` recombines — seed 13 is `you speak Irish very well`
(`Labhraíonn tú…`) — so that component would collide one seed outside my range. Now `[A]`, unsplit.

**(c) Two lines of bad Irish in seed 12.** The old file had
`Ba mhaith liom cuimhneamh ar céard atá i nGaeilge` and
`Tá mé ag iarraidh cuimhneamh ar céard atá chun tarlú`. `ar` cannot govern a `céard` clause like that
(Irish wants `ar a bhfuil…`). Both were replaced with `tomhas` phrases that need no preposition.

**Seed 10's `to remember` lego was dropped, not lost.** Under the new order, seed 6 introduces
`"to remember" → "cuimhneamh"`, so seed 10 keeps only its three genuinely new legos. The phrases that
drilled `cuimhneamh` moved to seed 6.

---

## 5. Where the rulings proved awkward

**Seed 2 is starved, and the ruling's own drilling requirement is blocked by the gate.**
Seed 2 has six legos of vocabulary in the whole world and only one of them is a content verb. It banked
9 phrases — the thinnest seed in the course. Worse: the single most valuable drill Fork 2 could
buy — the minimal pair `I'm trying to learn now` / `I want to learn now` on one Irish sentence —
**cannot be built**, because the duplicate-target check is per-lego and both phrases live in the same
lego. The Fork-2 contrast therefore exists at *lego* level (where the gate happily accepted it) and
**nowhere at phrase level**. If Kai wants learners to actually hear the two English prompts collapse
onto one Irish sentence, that needs either a gate change or a deliberate design where the pair is split
across two legos. I did not work around it.

**Seed 8's `iarracht a dhéanamh` placement held, but the seed sentence is heavy.**
`Tá mé chun iarracht a dhéanamh céard atá i gceist agam a mhíniú` is grammatical but stacks a fronted
clause object in front of `a mhíniú` behind a fronted noun object in front of `a dhéanamh`. It is 20
syllables and it is the eighth thing a learner ever says. The complementary-distribution argument in
rulings §C is sound and I found no counter-example while building — after `tá mé chun` you genuinely
cannot stack `ag iarraidh`, so the learner never chooses. **But** I had to write
`Tá mé ag iarraidh iarracht a dhéanamh Gaeilge a labhairt` ("I want to try to speak Irish") to cover
the non-progressive demand, and `ag iarraidh iarracht` one syllable apart is precisely the jangle Kai
worried about. It is in the course now, once, at seed 8 L1. **That is the line to read aloud before
deciding whether Fork 3 stays at seed 8.**

**`mo dhícheall a dhéanamh` (seed 7) still rests on one source.** Rulings §C already flags this:
`dícheall` has **0** hits in the 15,904-item base corpus, and the only support is de Bhaldraithe's
*"déanfaidh mé mo mhíle dícheall"*. Building it did not improve the evidence. Conf **B**, unchanged.

---

## 6. Provenance — whose Irish is this

| string | provenance |
|---|---|
| `tá mé ag iarraidh`, `Gaeilge a labhairt`, `leat`, `anois` | seed 1, pre-existing, untouched |
| `foghlaim`, `cén chaoi le`, `labhairt`, `chomh minic agus is féidir`, `rud éigin a rá`, `i nGaeilge`, `tá mé chun`, `labhairt a chleachtadh`, `le duine éigin eile`, `labhraím`, `beagán Gaeilge`, `níl mé cinnte`, `ar an abairt ar fad`, `ba mhaith liom`, `a bheith in ann`, `tar éis duit`, `críochnú`, `níor mhaith liom`, `tomhas`, `céard atá`, `tarlú`, `amárach` | inherited from the previous run's committed decompositions, which sourced them from the base translation memory (`.a108-gle/base-items.json`) |
| `an bhfuil mé in ann` | **ruling-mandated substitution** (Fork 5). `in ann` is base-corpus attested 646×; the `an bhfuil mé in ann` framing is **mine** |
| `cuimhneamh ar fhocal` | `cuimhnigh ar` is FGB/Ó Dónaill standard; the lenition `ar fhocal` is **mine**, and it is regular |
| `mo dhícheall a dhéanamh` | de Bhaldraithe, single source, conf **B**. Zero base-corpus support |
| `iarracht a dhéanamh` | FGB frame, base corpus 38×, conf **A** |
| `céard atá i gceist agam`, `a mhíniú` | seed 8's translation is **mine**, conf **C**, already on the native-ear list in rulings §F |
| the ~180 phrase sentences I composed this run | **mine** — recombinations of the above legos. Grammatical by construction, but no native has read them |

---

## 7. Explicit gaps

- **No native ear has been applied to any of it.** The three provisional rulings (Fork 7 `labhraím`,
  Fork 11 `cén chaoi le`, Fork 10 `is maith liom`) are now **more** expensive to reverse than when they
  were ruled: `labhraím` is banked at seed 9 and `cén chaoi le` is now load-bearing in seeds 3, 4, 6, 8
  and 10 — it appears in 30 banked phrases. Rulings §D priced Fork 11's reversal at "1 seed, 3 legos,
  17 phrases". **That price has gone up and will keep going up.**
- **I did not verify `iarracht a dhéanamh` + bare VN object against a native source.**
  `iarracht a dhéanamh Gaeilge a labhairt` (no `ar`) follows the seed sentence's own pattern; FGB also
  licenses `déan iarracht ar rud a dhéanamh`. I chose the `ar`-less form for consistency with the seed
  text I was told not to change. Unresolved.
- **`cén chaoi le` + `hiarracht`.** I avoided writing `cén chaoi le iarracht a dhéanamh` because I could
  not determine whether `le` prefixes `h-` to the fronted object there. Nothing in the course depends
  on it yet.
- **I did not commit.** Files are on disk; the branch was not switched and nothing was staged.
