# Ulster (Donegal) Irish — 668 seeds translated and checked

**Course: `gle_ul_for_eng`. Built 2026-08-20. Seeds only — no decomposition, no practice
sentences, no audio.**

---

## 1. What exists now

668 of 668 seeds carry a Donegal Irish sentence. Every one was written to the database through a
single validating gate; no worker wrote to the database directly.

| | |
|---|---|
| Seeds translated | **668 / 668** |
| confident | **526** (78.7%) |
| best attempt | **130** (19.5%) |
| genuinely uncertain | **12** (1.8%) |
| Audio clips generated | **0** |
| Rows written to `gle_for_eng` or `gle_cn_for_eng` | **0** (verified after every write) |

### The course was set up from scratch, not copied

This is the fault we were told to avoid, and avoiding it was deliberate: `gle_cn_for_eng` was
created by copying `gle_for_eng` wholesale, which carried over `dialect = 'standard'` and a
`voice_config` whose `courseCode` still named the other course. Verified on the new row:

- `dialect = ulster` — **not** standard
- `display_name = "Ulster Irish for English Speakers"`, `variant_label = "Ulster (Donegal)"`
- `voice_config.courseCode = gle_ul_for_eng` — its own name
- **all four voice slots empty**: `known`, `target1`, `target2`, `presentation` all have
  `voiceId: ""`. No voice decision is implied anywhere.

**One thing to note:** the brief said to leave *target* voices empty. I left the **English/known and
presentation slots empty too**, on the reading that no voice decision has been taken at all. That is
the conservative choice and it is one field to fill if you want the usual English voice there.

### The English side

Read byte-identical from `gle_cn_for_eng`, never re-authored. Verified: the English differs from the
standard course on **exactly 3 seeds — 9, 13 and 22** — which are precisely the three the
Hiberno-English `tá … agam` ruling touched (*"I have a little Irish now"*, *"you have very good
Irish"*, *"people who have Irish"*). So the two dialect courses teach the same English, and the
ruling was inherited rather than re-derived.

---

## 2. Authorities — what was actually consulted

**Ó Dónaill, *Foclóir Gaeilge–Béarla*, via teanglann.ie.** This is the backbone and it is a real
one: every required Donegal form was fetched live and read, not recalled. Ó Dónaill was himself a
Donegal man (Loughros, Ardara) and FGB carries Donegal forms as headwords. Verified as headwords:
`achan` (= gach aon), `uilig` (= uile), `caidé` (= cad é), `domh` (= dom), `fosta`, `ábalta`,
`amharc`, `dada`, `inteacht` (= éigin), `pill/pilleadh` (= fill), `cluin`/`cluinstin`, `doiligh`,
`barraíocht`, `scíste` (= scíth), `dóigh`, `tig le`, `síl`, `muid`, and the full grammatical entry
for `cha`.

**Wikipedia, *Ulster Irish*.** Used for the `cha` mutation rule and its distribution, the `-óch-`
future stem, analytic verb forms, and `tchíom`/`bheiream`/`gheibhim`.

**The existing `gle_for_eng` course**, used only as a *distance yardstick*, never as a correctness
authority — it has never had a content pass and 0 of its 668 seeds are approved.

### Authorities NOT consulted — stated plainly

**Job #530 returned at the very end of the build, and it read more than I did.** It reached
`corpas.ie` at greater depth (1.36M tokens of specifically Donegal speech, including the
**Béaloideas Beo** Donegal folklore archive), mined the **Doegen 1928–31 Donegal recordings** with
their transcripts (98k characters), and read **Quiggin 1906**. It states plainly what it could not
reach: Mac Grianna's *An Druma Mór* (access-restricted), *Caisleáin Óir* (not digitised), and
Wagner, Hamilton, Lucas, Ó Baoill, Ó Searcaigh and Mac Congáil — **all print-only, all unread**.
Sommerfelt's 1922 *Torr*, which is Gweedore itself, was rate-limited before it could be checked and
is flagged as *unchecked, not absent* — the best unpursued lead.

Job **#536, the `cha` ruling, never returned.** That question was instead settled by my own corpus
work below, and #530's independent numbers agree with it.

**A corpus WAS found, late in the job, and it changes this section.** `corpas.ie`'s CNG corpus has
no dialect attribute, but RTÉ Raidió na Gaeltachta's regional desks are transcribed speech from
known places and give a usable three-way partition: **`RnaG (Barrscéalta)`, ~65,000 tokens of
Donegal speech**, against Connemara (~119k) and Kerry (~104k). Calibrated against a known positive
before any count was trusted.

That corpus settled the `cha` question, validated every required form in the spec, confirmed every
forbidden form as belonging to another dialect, and **overturned one of my own decisions**. Full
numbers: `docs/gle-ul/donegal-corpus-evidence-2026-08-20.md`.

It is still thinner than the Connemara base — 65,000 tokens against Ó Curnáin vols I–IV plus a
608,947-character corpus, and it is transcribed radio speech rather than a dialect grammar. **It is
good evidence for lexis and for the negation ratio. It is not evidence that a Gaoth Dobhair speaker
would phrase any particular seed the way we did.**

---

## 3. Is it actually Donegal, or standard Irish with words swapped?

That is the failure mode a per-sentence grammar check cannot see, so it was measured against the
standard course's rendering of the *same* 668 English seeds:

| | |
|---|---|
| Differs from the standard rendering | **558 / 668 (83.5%)** |
| Word-for-word identical to standard | 110 (16.5%) |
| Carrying an explicit Donegal lexical marker | **304 / 668 (45.5%)** |
| Donegal marker types appearing at all | 20 of 23 |

The 16.5% identical is mostly seeds where the dialects genuinely agree — `Tá mé ag iarraidh Gaeilge
a labhairt leat anois` is the same line in all three dialects, and the Connemara course wrote it
identically too. Inventing a difference there would be worse than useless.

Beyond lexis, the grammar carries the dialect: analytic `tá muid`, `ag gabháil a` + verbal noun for
the future, `cad chuige`, `cá huair`, `a bheas` relative futures, and Ulster lenition after a simple
preposition + article (`ar an bhus`, `den chaint`, `leis an mhéid`).

**Two of the three zero markers are correct, not failures.** `fosta` never appears because the
English never says "also" or "as well" — measured, zero occurrences in all 668. `tchí` never appears
because no seed says "sees". The third zero is `cha`, which is §5.

---

## 4. The checking passes

### Correctness

Four independent workers re-checked seeds they did not translate, against Ó Dónaill and the spec.
**Three reported, covering 572 of the 668 seeds.** The fourth, on seeds 481–576, had still not
returned, so **I read those 96 seeds myself**.

That self-check found no new hard defects beyond the five block 6 had already flagged in its own
output (`fíordhóchas` as a coinage at 481/482, a discontinuous predicate at 552, the supplied `orm`
at 575/576, a `-fas` relative future at 493). The range carries the dialect strongly — `madadh`,
`achan`, `cionn is go`, `goidé`, `iontach`, `úr`, `doiligh`, `foscailt`, `tríd an choill` and
`ag an cheann` with Ulster lenition, `shíleadh mé` as an analytic past habitual.

**But it is a weaker check than the other three ranges and should be treated as such.** I wrote the
spec these seeds were judged against, so I am not an independent reviewer of them — that is exactly
the blind spot that let `toisigh` and `caidé` through in the first place. Seeds 481–576 should be
first in the queue if another checking pass is ever run.

Across the 572 seeds actually checked, every one got a verdict — `ok` rows included, so coverage is
demonstrated rather than asserted:

| verdict | count |
|---|---|
| ok | 470 |
| doubt (a speaker should look) | 54 |
| defect | 48 |

Of the 48 defects, **29 were graded "wrong"** (as against 72 style observations). Of those 29:
**8 had already been fixed** by the normalisation sweeps, **19 were applied**, and **2 were
REJECTED on corpus evidence** — see below, because a rejected finding is as much a result as an
accepted one.

**What the correctness pass caught that the consistency pass could not**, all genuine grammar:
`Ba iontas` → `B'iontas` (the past copula elides before a vowel); an unlicensed `a` before `inse` in
three seeds, where there is no fronted object to license it; a stranded partitive genitive
(`gloine nó dhó uisce` → `gloine uisce nó dhó`); a wrong genitive (`na hiarnóine` → `na hiarnóna`);
present indicative after `go dtí go` where the reference is future; and **three seeds where the
English "yes" had been dropped from the Irish entirely** (386, 425, 448).

It also caught **an error I had introduced myself**. My Ulster-lenition sweep changed seed 315 to
`leis an charr` — but there `leis` is the prepositional pronoun "with him" and `an carr` is the
fronted *object* of `a cheannach`. It was never a preposition-plus-article site, and the lenition
broke the parse. Reverted, and the seed is now a permanent named exclusion in the detector so no
future sweep re-breaks it.

**The two rejected findings.** A checker proposed `tuigbheáil` → `tuiscint` on the FGB-headword
test. The corpus says **`tuigbheáil` UL 57 / CO 0 / MU 0** against **`tuiscint` UL 4 / CO 122 /
MU 180** — `tuigbheáil` *is* the Donegal form and the "fix" would have deleted a strong dialect
marker. Rejected. (Same trap as `madadh`, third time; see §5.4.) The second, `an mhí seo caite` →
`an mhí seo a chuaigh thart`, was rejected because `caite` is well attested in Donegal (UL 132) and
the English differs from the seed it was being matched to — style, not defect.

What the translation pass itself caught is worth recording: workers probed FGB before using a word
and **three guesses died on the probe** — `gnaitheach` ("busy") is not an FGB headword, so seed 192
uses `gnóthach` (the corpus later confirmed `gnaitheach` at 0 in all three dialects); `toisigh`
failed in the most useful way of all (below); and `madadh` ("dog") was dropped for `madra` — which
the corpus then proved was the wrong call, and it has been reversed. See §5.4.

### Consistency — every row, no sampling

Final state, after three normalisation rounds:

| Check | Result |
|---|---|
| Forbidden Munster / Connacht forms | **0** |
| Split spellings (17 pairs tested) | **0** |
| ZUT violations (same English → different Irish) | **0** |
| Reverse collisions (same Irish → different English) | **0** |
| Ulster lenition after prep + article | **43 of 43 consistent** |

### False positives hunted, because a raw hit count is not a finding

This is where most of the checking effort went, and it changed the answer every time:

- **"Missing `caidé`/`cad é mar`" — first reported 24, real total 0.** All 13 "what" hits were the
  English *relative* ("what you said" → `an rud a dúirt tú`), not the interrogative. All 11 "how"
  hits used `cén dóigh` / `an méid` / `chomh … is`, all allowed. The detector now triggers on
  interrogative *function*, not on the English word.
- **Ulster lenition — first reported 17 unlenited, real total 2.** After the article, the dentals
  `d`, `t`, `s` do not lenite, so `ar an dóigh`, `sa teach` and `don tsuipéar` are all correct.
- **`tig` marker reach — first counted 7 seeds, real total 62.** Irish mutation breaks
  word-containment: `dtig`, `thig`, `dtiocfadh` are the same lexeme and a bare-stem count misses
  every one.
- **`cuid mhór` vs `go leor` — looked like a split, is not.** `cuid mhór` renders "a lot/many",
  `go leor` renders "enough". Different English, correctly different Irish.

Every detector is calibrated against a known positive *and* a known negative before it reports, and
the script refuses to print counts if any calibration case fails.

### The 44 real defects found and fixed

1. **`toisigh` / `toiseacht` → `tosaigh` / `tosú` (13 rows).** **This one was my error.** The spec's
   own §1f worked example said `Ar thoisigh mé?`, and blocks followed it. FGB reads `toisigh` as a
   variant of **`tomhais`** — *measure* — a different word entirely. Three separate workers flagged
   it independently. Spec corrected, all 13 rows normalised.
2. **Ulster lenition missing (2 rows)** — seeds 245, 315, brought into line with the other 41.
3. **ZUT violation (1 row)** — identical English got `chuardach` at seed 68 and `chuartú` at 194.
4. **"because" split (4 rows)** — `nó` in 4 seeds vs `cionn is go/gur` in 7. Standardised on
   `cionn is`, which is unambiguous; `nó` reads as "or" outside Ulster. Seed-targeted, because
   seeds 38, 44, 217 and 524 also contain `nó` and it means *or* in every one of them.
5. **"rest" split (2 rows)** — `scíste` vs `scíth`; both FGB-attested, standardised on `scíth`.
6. **"dog" split (2 rows)** — `madadh` vs `madra`. Standardised first on the headword form
   `madra`, then **reversed to `madadh`** when the corpus showed `madra` is used zero times in
   Donegal. See §5.4 — this one is worth reading, because the rule that caused it is a spec rule.
7. **19 grammar and consistency defects** from the independent correctness pass (above), including
   one bad fix of my own reverted.

---

## 5. What a Donegal speaker should see FIRST

### 1. `cha` vs `ní` — now MEASURED, and the answer vindicates the seeds

**Not a single `cha`, `chan` or `char` appears in all 668 seeds**, and the corpus says that is
right. Counted in 65,000 tokens of transcribed Donegal speech:

| | Donegal | Connemara | Kerry |
|---|---|---|---|
| `cha` + `chan` + `char` | **561** | 13 | 8 |
| `ní` + `níor` + `níl` | **6,293** | 14,571 | 13,173 |

Two findings that pull opposite ways. `cha` **is** emphatically Ulster — 561 against 13 and 8, better
than 40:1 discrimination. But **`ní` is the default negative even in Donegal, by about 11 to 1**;
the cha-family is roughly **8%** of all negation, and `níl` alone outnumbers it five times over.

So the interim decision was correct and is now evidence-backed rather than a fallback. **A wholesale
`ní`→`cha` sweep would be a serious error** — it would over-apply `cha` more than tenfold and make
the course a caricature of Donegal rather than Donegal.

The open question is now narrower and better posed: **should a minority of the 126 independent-clause
negatives carry `cha`, to reach the natural ~8%?** Natural `cha` use is conditioned by contradiction
and emphasis, which cannot be read reliably off the English. That is a speaker's judgement on a
marked subset — not a mechanical sweep.

**The reversal is already engineered.** Every negative seed carries a clause-type annotation:

| clause type | rows |
|---|---|
| independent | **126** ← a `ní`→`cha` sweep touches exactly these |
| subordinate (`nach`/`nár`) | 26 |
| copula | 19 |
| question | 5 |
| imperative (`ná`) | 1 |
| **total negatives** | **177** |

`cha` is an independent-clause particle: it cannot enter subordinate clauses, relative clauses,
negative questions or the imperative, and cannot take the future tense. So the sweep is those 126
rows and no others, and the 52 rows that must never change are already named. **This is the one
decision that would most improve the course, and it needs a speaker or a corpus.**

### 2. `ag iarracht` for "trying" — four workers objected independently

The brief told translators to use `ag iarracht`, which I imported from Kai's Connemara ruling
(*"not iarracht a dhéanamh, just ag iarracht"*). **Blocks 3, 4, 5 and 7 all objected separately,
without seeing each other's reports.** FGB has `iarracht` as a **noun only**; there is no attested
progressive `ag iarracht` + verbal noun.

The decisive data point is block 7's: at seed 579, *"we've often tried"* has no complement, so
`ag iarracht` **cannot be used at all** and the line had to be written `is minic a rinne muid
iarracht`. The coinage does not cover its own domain, so the course will teach two forms regardless.

Note that Kai's "learners can google it" ruling does **not** rescue this one: `ag iarracht` is not a
Donegal dialect form with discussion to find, it is a pedagogical coinage. Roughly 20 seeds; a
one-line sweep either way. **Kai should rule.**

### 3. The 12 genuinely uncertain seeds

98 · 173 · 236 · 289 · 290 · 372 · 427 · 432 · 480 · 575 · 576 · 593.

The recurring hard cases: **"I wonder"** (289, 290 — the base course used Munster `ní fheadar`,
which is out; `Meas tú` is the natural Donegal move but is formally a question); **objectless
"upsetting"** (575, 576 — FGB's `goill ar` requires a person, so an `orm` had to be supplied that
the English deliberately lacks); **"bored"** (427 — `dubh dóite` is really "fed up").

### 4. Two rulings of mine were REVERSED on evidence — including one I asserted without any

**`caidé` → `goidé` (43 seeds).** Spec §1e originally ruled `caidé`, on my assertion that it is
"what Donegal writers and Ulster-dialect journalism use today". **That was an assertion with no
evidence behind it and it was wrong.** #530 contradicted it and my own partition reproduced the
result exactly: **`goidé` UL 1,477 / CO 0 / MU 0** against **`caidé` UL 45 / CO 3 / MU 0**. Donegal
writes `goidé` 33 times as often. Both are FGB headwords, so the spelling rule admits either — which
means ruling #1 decides, and ruling #1 says what Donegal actually says wins. Reversed.

**`dada` → `a dhath` (4 seeds).** Same correction from #530, same independent reproduction:
`dhath` UL 596 / CO 22 / MU 1 against `dada` UL 6 / CO 40 / MU 5.

**And one of the spec's "required Donegal forms" turns out not to be a dialect marker at all.**
`uilig` is UL 1,510 but CO 1,124 — Connemara uses it nearly as much. It is correct Donegal, but it
is not evidence the dialect landed, and #530 reached the same conclusion independently. `ábalta` is
similar: Donegal *and* Munster (1,021 / 13 / 551), not Ulster-exclusive.

### 5. The dictionary rule was too strict, and it cost a word

The §0 rule "a form must be an Ó Dónaill headword" is what keeps the spelling standard, and it
caught two real problems: `toisigh` is Ó Dónaill's variant of `tomhais` (*measure*), and
`gnaitheach` is not a word at all (corpus: 0 in all three dialects).

But it also made me normalise `madadh` → `madra` across seeds 69 and 546. The corpus:
**`madadh` UL 48 / CO 0 / MU 0; `madra` UL 0 / CO 4 / MU 14.** `madra` is used **zero times** in
Donegal. The rule excluded the correct Donegal word and installed one the dialect does not use —
exactly what ruling #1 forbids. **Reversed; both seeds now read `madadh`.**

The lesson, and it is a spec-level one: **the headword test is necessary but not sufficient, and
corpus evidence outranks it.** Where they disagree, what Donegal actually says wins.

### 6. Open spec questions a speaker should settle

- `cha bhfuil` vs `chan fhuil` for "is not" — FGB shows the second, Wikipedia gives the first as the
  Gweedore form.
- `-óch-` futures (`tosóchaidh`): does the standard-spelling rule survive here?
- `tchí` in writing — universally spoken, but is it dialect lexis or a phonetic respelling?
- `toisigh`/`madadh`/`gnaitheach` were all excluded by the FGB-headword test. That test kept the
  spelling standard and caught a real error — but it also excluded three words Gaoth Dobhair
  actually says. **Is the headword test too strict?**

---

## 6. Honest assessment against the Connemara work

**Comparable on lexical evidence, thinner on idiom, stronger on process.**

The evidence gap narrowed sharply at the end. Every required form in the spec is now backed by BOTH
a live Ó Dónaill probe AND a count in 65,000 tokens of transcribed Donegal speech, and the numbers
are decisive rather than suggestive: `fosta` 1,792/0/0, `achan` 1,864/1/0, `domh` 480/0/1,
`inteacht` 150/0/0. Every forbidden form is confirmed as belonging to another dialect.

Still thinner than Connemara: 65k tokens of radio speech against Ó Curnáin vols I–IV plus a
609k-character corpus, and the deepest Donegal sources named in the brief — Ó Baoill, Quiggin,
Hamilton, Wagner, the Doegen 1931 recordings — **went unread**, because both workers dispatched to
reach them failed.

**And the idiom gap is real and unclosed.** The corpus proves which *words* Donegal uses. Nothing
here proves a Gaoth Dobhair speaker would *phrase* seed 114, 173 or 593 the way we did. That is what
a speaker is still needed for.

Stronger on process: the dialect spec was written *before* the first seed, not retrofitted; the
consistency pass read every row rather than sampling; every detector was calibrated and its false
positives hunted, which killed 39 apparent findings that were not real; and seven workers converged
independently on the same conventions, which is the strongest consistency signal available without a
native speaker.

The most encouraging fact is that the process caught its own author twice. The spec's own worked
example was wrong (`toisigh`), three workers independently flagged it against the dictionary, and it
was fixed in 13 rows before it became 668. Then the corpus caught a normalisation *I* had made on
the strength of that same dictionary rule (`madadh`→`madra`) and reversed it. Neither error survived
to a learner.

**How solid is this?** Solid enough to put in front of a Donegal speaker, and not solid enough to
release. The 526 "confident" rows are confident about *lexis and grammar*, not about how Gaoth
Dobhair would actually say it. The `cha` question alone means the course does not yet sound as
Donegal as it should.
