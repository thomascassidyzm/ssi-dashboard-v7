# The mapping table read backwards — reverse classes for eng_for_X

The four classes (`pair-mapping-classes.md`) read in the production direction of an eng_for_X
course, worked properly on two pairs — **eng_for_spa** (the easy control) and **eng_for_zho**
(the hard case) — with eng_for_jpn used only where its evidence corroborates. Every piece of
course text below was pulled live from `course_seeds` / `course_legos` on 2026-08-30; none is
transcribed from memory. Machine companion: `reverse-mapping-classes.json`.

The commission, verbatim: *"an ERASURE in one direction is an ADMISSION in the other, and a
SPLIT in one direction is a CONVERGENCE in the other… work out, for at least two pairs, what the
four classes become when read backwards, and name the class that has no name yet."*

The finding in one sentence: **the reverse table cannot be computed from the forward table —
class membership must be re-derived per row, the four class names all survive the reversal, and
one genuinely new class is needed, here named MINT: a fork with no trigger anywhere in the known
sentence and none obtainable by any cut.**

---

## 0. The measured ground — what the eng_for_X courses actually are

Live state, 2026-08-30. All six courses carry 668 seeds. The eng_for_X LEGO layers stop at
**seed 300**: 618 legos (spa), 502 (zho), 719 (jpn). Seeds 301–668 have no cuts yet — every
claim below about cuts is a claim about seeds 1–300.

**The eng_for_X courses are not mirrors of the forward courses.** Normalised comparison of all
668 seed pairs:

| course | target side = forward course's known side | known side = forward course's target side |
|---|---:|---:|
| eng_for_spa | 648/668 | **139/668** |
| eng_for_zho | 608/668 | **192/668** |
| eng_for_jpn | 654/668 | **9/668** |

The English side is the canonical seed set (misses are mostly the language-name swap and light
edits). The known sides were **independently authored** — eng_for_spa seed 2 prompts `estoy
tratando de aprender` where spa_for_eng's target is `estoy intentando aprender`; eng_for_jpn's
known side is polite register throughout (`学ぼうとしています`) where jpn_for_eng's target is
plain (`日本語をやってみてる`), which alone accounts for the 9/668. This is the
known-side-is-a-teaching-instrument ruling already operating in the live data, and it matters
for §3: **prompt differentiation is not a proposal, it is what the authors of these courses were
already doing.**

Tooling note: `extract-patterns.cjs eng_for_spa` does not transfer — only P20 fires, because it
matches a literal `?`. The 31 frame regexes are English-side and the known side is now Spanish.
An eng_for_X inventory would have to be mined from known-side (spa/zho/jpn) matchers, which do
not exist yet. **NOT YET EXTRACTED**, and out of scope tonight.

---

## 1. The general law of the reversal

Reading a row backwards is not relabelling it. What a row becomes depends on where the
information lives, not on what the forward class was called:

| forward class | read backwards, as measured | why |
|---|---|---|
| DETERMINISTIC | DETERMINISTIC — *unless* the forward mapping was many-to-one in disguise | bijective rows survive; nothing else does |
| SPLIT | usually **ERASURE** (the two target forms converge on one English frame) — but the convergence can re-fork on the English side, see §2 | ZUT is one-directional; convergence is harmless, so the forward pair's whole expensive class evaporates |
| INVERSION | INVERSION — same class, different walk, and often carrying a new fork of its own (§4) | the shape mirrors symmetrically; the production cost does not |
| ERASURE | **SPLIT** where the sentence still contains a selector, **MINT** where it does not (§3) | the known side now under-informs the target; the only question is whether the missing information is recoverable |

Measured headline for the control pair: **spa_for_eng's expensive class disappears in reverse.**
spa_for_eng has 18 SPLIT rows; the eng_for_spa LEGO layer (618 cuts, seeds 1–300) contains
exactly **2** known-side divergence groups — and both are the same phenomenon, do-support,
which is forward row P20, an ERASURE:

- `hablas` → *you speak* (S0013L02) vs `¿Hablas...?` → *do you speak ...?* (S0014L02)
- `querías` → *you wanted* (S0031L01) vs `¿querías...?` → *did you want...?* (S0032L01)

The expensive class of eng_for_spa is therefore **not** where spa_for_eng's was. It relocated —
exactly as the forward table's own finding ("the curriculum relocates per pair") predicts, now
confirmed across the direction axis as well as the pair axis.

For the hard pair: the eng_for_zho LEGO layer (502 cuts) contains 5 divergence groups — three
are cut defects (§6), two are structural, and one of those two is the specimen of the new class:

- `那不是` → *That wasn't* (S0151L01) vs *That isn't what* (S0159L01) — identical known chunk,
  English tense forked, and **nothing anywhere in either known sentence selects the tense** (§3).

---

## 2. Forward SPLIT read backwards — ERASURE, with a carrier condition

Every one of spa_for_eng's mood/subjunctive splits converges in reverse, live-attested:

| forward split | eng_for_spa evidence (live) | reverse behaviour |
|---|---|---|
| S1 want + subject switch | `quiero que hables` → *I want you to speak* (S0015L01, components pair `que hables` → *you to speak*) | converges — the known side carries subject and mood morphologically; nothing to guess |
| S2 hope + subject switch | `espero que termines` → *I hope you'll finish* (S0149L01); `espero que puedas venir` → *I hope you'll be able to come* (S0292L02) | converges — but note the minted *'ll*: English demands a future the subjunctive never marked |
| S3 antes de que + subj | `antes de que empieces` → *before you start* (S0281L03) | converges |
| S7 double-'d | `habría`/`hubieras` both → *'d* | converges — the forward pair's crown jewel costs nothing in reverse |
| S12 ser/estar | `es útil` → *it's useful* (S0028L02) | converges (*is* ← es and está) |

**The carrier condition.** Convergence is only free if the cut carries the matrix. The same
known-side frame `que + PRESENT SUBJUNCTIVE` re-expands to *different* English machinery
depending on the matrix verb: after `quiero` it becomes *you to speak* (infinitive raising);
after `espero` it becomes *you'll finish* (minted future). If `que hables` were cut as its own
unit, the learner would face a fork — the live course avoids it by cutting `quiero que hables`
and `espero que termines` whole, matrix verb inside the chunk. That is a re-cut doing exactly
what the ZUT ruling prescribes ("the fix is never to block a word, it is to RE-CUT THE UNIT"),
already present in the shipped cuts. The reverse table records these rows as
**ERASURE (carrier-cut)**.

---

## 3. MINT — the class that has no name yet

**Definition, stated as sharply as the four existing classes:**

> **MINT** — one known frame, two or more target realisations, and the selector is not in the
> known sentence and cannot be put into any cut of it, because the known language does not
> encode the information at all. The selector lives outside the sentence: in discourse state,
> time of speaking, or referent status.

**The test that separates MINT from SPLIT**, checkable by a human or an agent: *hand a competent
bilingual the complete known sentence in isolation. If the sentence still underdetermines the
target form, the row is MINT; if the sentence determines it (even when the chunk alone does
not), the row is SPLIT.* Forward analogues like saber/conocer were classed SPLIT despite "no
English trace" because the sentence always decides (*know the answer* vs *know your sister*).
MINT is the class where the sentence never decides.

**Attested specimens, all live:**

1. **Tense from Chinese — the type specimen.**
   - Seed 151 `那不是我希望会发生的事情` → *That wasn't what I was hoping would happen*;
     seed 159 `那不是我想说的` → *That isn't what I'm trying to say*. Identical chunk `那不是`,
     opposite tenses, and both English tenses are legitimate translations of both sentences.
     This pair is the reverse direction's live, in-database reverse-ZUT divergence that **no
     re-cut can repair**.
   - Seed 31 `你今晚想和我说话` → *You wanted to speak with me tonight* — nothing in the sentence
     licenses past over present; *you want to speak with me tonight* is equally correct.
   - S0230L02 `想和你一起工作的` → *Who wants to work with you* vs S0231L02 `想请求帮助的` →
     *Who wanted to ask for help* — near-minimal pair, same construction, forked tense.
   - Contrast the recoverable case: seed 30 `我昨天想问你一件事` → *I wanted to ask you something
     yesterday* — `昨天` selects past. With a time adverb the row is SPLIT (non-local trigger);
     without one it is MINT. Same English frame, different class per sentence — which is why
     class membership is a property of the row-in-context, not of the frame.

2. **Articles from Chinese.** 81 of 502 eng_for_zho cuts carry an English article. Some have
   sources (`一个词` → *a word*; `这个故事` → *the story* — though 这个 is "this", already a
   normalisation); some have none at all: `长时间` → *a long time* (S0033L01), `同时` → *at the
   same time* (S0062L01), `犯错是好事` → *it's a good thing to make mistakes* (S0047L02 — dummy
   *it* and article both minted). Definiteness in running English (*a* vs *the*) is
   discourse-status, which Chinese leaves unmarked: MINT.

3. **Auxiliary choice under 吗.** The particle maps to a bare-particle cut `吗` → *Do*
   (S0014L01) — but across the layer the same particle surfaces as *Did you want* (S0032L02),
   *Could you say that again* (S0061L02), *Have you heard from your friend* (S0267L01), *Would
   you like to come* (S0271L01). The interrogative itself is triggered (吗 is a real
   known-side word — reverse SPLIT, cleanly cued); **which English auxiliary** is part aspect
   (了 → *have*), part politeness convention, part tense — and the tense component is MINT.

4. **了's fan-out.** One known-side particle, measured across the layer: `我学了` → *I've been
   learning* (S0038L02), `忘了` → *I've forgotten* (S0205L01), `我开始觉得...了` → *I was starting
   to feel* (S0042L03), `该走了` → *It's time to go* (S0093L01), `容易了` → *Easier* (S0122L01),
   `太高兴了` → *So happy that* (S0129L01). Perfect vs past vs change-of-state have no
   sentence-internal selector in the general case.

5. **Number on existentials, from Spanish.** Forward P19 (there is/are → invariant `hay`)
   reversed: `hay` → *there are* (S0131L01) — selected by the downstream plural
   (`demasiadas ideas`), so with the noun in the sentence this is SPLIT with a **non-local
   trigger** (the cut cannot carry it; the frame must); with an elided or number-ambiguous
   noun it degrades to MINT. Spanish sits at the boundary; Chinese (no plural marking at all)
   is past it.

**Why MINT and not ADMISSION.** Tom's commission already uses "admission" for the whole
reverse-of-erasure phenomenon. Measurement splits that phenomenon in two: the part a re-cut
rescues (do-support via `¿...?`/吗 — becomes SPLIT or DETERMINISTIC after the cut, §4) and the
residue no cut can touch. The residue is the new class, and `frame-zut.md` already names its
mechanism: *minting from nothing*. **[SPEC:worker]** The name **MINT** is my call, taken from
that line. One honest objection: *mint* is also the layer verb ("phrases MINT"), so the class
name overloads it. If Tom wants the verb kept clean, the fallback name is **UNCUED** — one word
to overrule.

**Ruled out honestly:** I looked for a second unnamed class in the convergence direction — "a
convergence the learner can only make if they can tell which" (the bien/bueno line of the
commission). In the measured layers it does not arise as a separate class: bien → *well* and
bueno → *good* are two DETERMINISTIC rows on the known side of eng_for_spa, and every measured
convergence-with-a-fork resolved into either the carrier condition (§2) or MINT itself. The
one candidate is recorded in the JSON as `convergence-fork`, subsumed under MINT.

---

## 4. The reverse tables — the frames that carry real evidence

Classes are keyed to the forward P-ids for cross-reference, but read here in the eng_for_X
production direction (known = spa/zho, target = English). Rows I did not measure say NOT YET
EXTRACTED and mean exactly that.

### eng_for_spa

| fwd id | frame (English side) | forward class | reverse class | evidence (live) | what the learner must do |
|---|---|---|---|---|---|
| P1 | want-chain | SPLIT | **ERASURE (carrier-cut)** | S0015L01 `quiero que hables` → *I want you to speak* | nothing to choose; the cut carries the matrix |
| P11 | hope | SPLIT | **ERASURE (carrier-cut) + mint of 'll** | S0149L01, S0292L02 | subjunctive converges, but English futures it: *you'll* |
| P17 | counterfactual | SPLIT | **ERASURE** | `habría`/`hubieras` → *'d* | the double-'d costs nothing in reverse |
| P18 | it's-adjective | SPLIT | **ERASURE** | S0028L02 `es útil` → *it's useful* | ser/estar → *is* |
| P16 | relative clause | SPLIT | **DETERMINISTIC** | S0022L02 `gente que habla inglés` → *people who speak English* | que → *who/that* keyed by head noun, in the sentence |
| P20 | question / do-support | ERASURE | **SPLIT — orthographic/intonational trigger, re-cut fixes** | S0014L02 `¿Hablas...?` → *do you speak ...?*; S0032L01 components pair **`¿` → did** | the live course already cuts the question wrapper into the unit — the trigger is intonation, carried as ¿...? |
| P19 | there is/are | ERASURE | **SPLIT — non-local trigger** | S0131L01 `hay` → *there are* (plural noun downstream) | number agreement with a noun the chunk doesn't contain; frame-level rule, not cut-level |
| P23 | negation | DETERMINISTIC | **SPLIT — do-support again** | *no hablo* → *I don't speak* (do minted, cued by `no`) | deterministic after the negative cut absorbs *don't* |
| P31 | like (dative) | INVERSION | **INVERSION** | S0239L01/L02 `a mi madre` + `le gusta leer` → *my mother likes to read* | walked the other way; experiencer back to subject |
| — | subject pronouns | (invisible fwd) | **DETERMINISTIC after cut** | S0002L01 components pair `yo` → *I'm* | morphology carries person; the cut mints the pronoun with it |
| others | | | NOT YET EXTRACTED | | |

**Reverse-ZUT ledger, eng_for_spa:** 2 divergence groups in 618 cuts, both do-support, both
re-cut-fixable (and seed 14/32 show the fix already applied at the question end). The layer is
otherwise reverse-ZUT clean at LEGO level. Phrase level not examined.

### eng_for_zho

| fwd id | frame | forward class | reverse class | evidence (live) | what the learner must do |
|---|---|---|---|---|---|
| P20 | question / do-support | ERASURE | **SPLIT (吗 cues it) + MINT (auxiliary choice)** | S0014L01 `吗` → *Do*; S0061L02/S0267L01/S0271L01 same particle → *Could/Have/Would* | interrogative is cued; which auxiliary is partly aspect-cued, partly minted |
| P17 | counterfactual | ERASURE | **MINT** | seed 600 (`frame-zut.md`); S0152L02 `如果我知道你想要什么` → *If I had known what you wanted* | counterfactual mood + double perfect minted from an unmarked conditional |
| — | tense (all frames) | (erased fwd) | **MINT** | `那不是` → *wasn't*/*isn't* (S0151L01/S0159L01); seed 31; S0230L02 vs S0231L02 | the type specimen — no selector exists |
| — | articles | (erased fwd) | **MINT** (81/502 cuts carry one) | `长时间` → *a long time*; `同时` → *at the same time* | definiteness from discourse status Chinese never marks |
| — | perfect vs past | (erased fwd) | **MINT, partially cued by 了/过** | `我学了` → *I've been learning*; `看到过` → *Have you seen*; `什么时候开始学的` → *When did you start* (的 cues past) | aspect particles cue some rows; the residue is minted |
| P16 | relative clause | INVERSION | **INVERSION + pronoun fork (sentence-cued)** | S0078L01 `你说的话` → *What you said*; S0230L02 `想和你一起工作的` → *Who wants…* | 的-relative unwinds to *who/what/that* keyed by the head noun — in the sentence, so SPLIT-grade, not MINT |
| P1 | want-chain | DETERMINISTIC | **DETERMINISTIC (structure) + MINT (tense)** | S0001L01 `我想` → *I want*; S0031L02 `想说` → *Wanted to speak* | the frame is easy; the tense riding on it is not |
| P19 | there is/are | INVERSION | **INVERSION + MINT (number)** | fwd seed 131 evidence; no plural marking exists | location-first unwinds AND *is/are* minted |
| P9 | think | DETERMINISTIC | **DETERMINISTIC** | `觉得` + clause, same order | |
| others | | | NOT YET EXTRACTED | | |

**Reverse-ZUT ledger, eng_for_zho:** 5 divergence groups in 502 cuts — 2 structural (`那不是`
tense = MINT, irreparable by cutting; `好` → *Well*/*Yes*, lexical polysemy), 3 cut defects
(§6). The structural tense divergence is the difference between the pairs in one number: the
control pair's divergences are all fixable; the hard pair's are not.

### eng_for_jpn — corroboration only, not worked

The 9/668 known-side mirror rate is the register finding: the authors rebuilt the entire known
side in polite form. Going eng-ward, register is an **ERASURE** (です/ます → nothing) — cheap.
The jpn MINT inventory (articles, plurals, tense-under-relative, a/the) is expected to pattern
with zho and is NOT YET EXTRACTED.

---

## 5. The cut cost, stated plainly

**A LEGO is a cut, and the cut must be deterministic known-to-target.** From the measured
layers:

**English forms with NO deterministic cut from a zho known side** — no re-cut can fix these;
they are MINT and need prompt differentiation or contrast teaching:
- tense on verbs and *be* (`那不是` → *wasn't*/*isn't*; `想` → *want*/*wanted*)
- articles *a*/*the* on bare nouns (81 live cuts already carry minted articles)
- perfect vs simple past where no 了/过/的 appears
- plural marking and *is/are* agreement
- which auxiliary a 吗-question takes, in its tense component

**Forms that LOOK undetermined but re-cutting fixes** — these are SPLITs wearing MINT's
clothes, and the live courses have already found the cuts:
- do-support from Spanish: cut the question wrapper (`¿querías...?` → *did you want...?*, with
  `¿` → *did* in the components — S0032L01)
- do-support from Chinese: 吗 is a word; `X吗` → *do X?* is deterministic once cut
- English infinitive-vs-future after volition/hope verbs: cut the matrix verb into the chunk
  (`quiero que hables`, `espero que termines` — never bare `que + subjunctive`)
- subject pronouns from Spanish: verb morphology carries person; cut mints pronoun + verb
  together (`estoy` → *I'm*)
- past tense from Chinese **when a time word exists**: upchunk it (`我昨天想问` → *I wanted to
  ask … yesterday* is safe only if 昨天 rides in or beside the cut)

**What fixes the residue.** Not cutting — **authoring**. The known side is a teaching
instrument, and the eng_for_X known sides are already independently authored (§0). For a MINT
row the honest fixes are: (a) differentiate the prompt — put 昨天/已经/这个 into the known
sentence so the learner's choice is cued; or (b) teach by contrast — deliver the fork as an
explicit minimal pair inside one basket (S0230L02/S0231L02 sit one seed apart and are almost
that already). Both are basket/authoring operations, not cut operations. That is the reverse
image of the forward doctrine: forwards, re-cut the unit; backwards, **re-cut where a trigger
exists, re-author where none does**.

---

## 6. Defects found in passing (not structure — flagged, not fixed)

Three of eng_for_zho's five divergence groups are mislinked cut rows, provable against their own
seeds: S0057L01 `说` → *Can't remember*, S0059L02 `做` → *Next week*, S0011L01 `我想` → *To be
able* (its sibling S0011L02 `想能` → *I'd like to be able* is the real cut). eng_for_spa's
convergences `así`/`tan` → *so* and `inusual`/`raro` → *unusual* are ZUT-harmless in this
direction. Also: `extract-patterns.test.cjs` currently crashes on origin/main
(`split.outcomes` undefined in `pattern-diversity.cjs` `crossesSplit`) — pre-existing, not
touched by this job. No course content was written or modified tonight.

## 7. Reverse frame-ZUT — the checkable form

Forward frame-ZUT: *for every SPLIT, the known side must carry the trigger.* In reverse there
is, for MINT rows, no trigger to carry and there never will be — so the obligation moves from
the **phrase** to the **basket**, and "carry" becomes "cue or contrast":

```
for each phrase P in a basket for seed S (course eng_for_X):
  for each mapping M applicable to S (from reverse-mapping-classes.json):
    if M.class == SPLIT:
      P's known side must contain M's trigger for the outcome P's target realises
        (the trigger may be non-local: anywhere in P's known sentence)
      else -> REVERSE FRAME-ZUT VIOLATION            # same rule as forward
    if M.class == MINT:
      either P's known side carries a differentiator for the outcome   # authored-in cue
      or the basket contains a contrast phrase P' — minimally different
        known side, different outcome of M                             # taught by contrast
      else -> REVERSE FRAME-ZUT VIOLATION
        (the learner is being drilled into a guess with no way to ever be right)
```

Course-level corollary, path-dependent like all cuts: **a MINT's default outcome must be
established before its contrast arrives** — the basket that first carries *wanted* against an
unmarked 想 must be the basket that brings the contrast pair, or a differentiated prompt.

Delivered as a rule plus one small read-only tool, `tools/frame-layer/reverse-zut-scan.cjs` —
it finds known-side divergence groups in any eng_for_X LEGO layer (the measurement §1 and §4's
ledgers came from), so the scan that produced tonight's numbers is repeatable in one command.
The basket-level checker needs the phrase layer and known-side matchers that don't exist yet:
NOT YET BUILT, named as a gap.

## 8. What was not determined (honest gaps)

- **Phrase layer unexamined.** All measurements are seed- and LEGO-level. Reverse-ZUT at phrase
  level (the forward direction's biggest queue) is unmeasured for all three courses.
- **Seeds 301–668 have no cuts** in any eng_for_X course; the reverse tables describe 1–300.
- **jpn not worked** — corroboration only (register). Its MINT inventory is expected to exceed
  zho's (articles + plurals + tense + register interact) but that is expectation, not
  measurement.
- **No known-side pattern inventory exists** for spa/zho/jpn known sides; the reverse tables
  are keyed to the English frame ids, which is a crutch. A real eng_for_X build wants
  known-side matchers.
- **22 forward rows per pair were never classified** in the forward table (NOT YET EXTRACTED
  there) and are correspondingly absent here.
