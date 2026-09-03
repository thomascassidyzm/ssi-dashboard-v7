# fur_for_eng — decomposition build report

**2026-08-15 · Friulian for English speakers · TEXT ONLY, NO AUDIO GENERATED**

---

## How far it got

| | Before tonight | After tonight | Remaining |
|---|---|---|---|
| Translated seeds | 668 | 668 | 0 |
| Seeds decomposed | **0** | **25** | **643** |
| LEGOs | **0** | **74** (21 A, 53 M) | — |
| Practice phrases | **0** | **582** (214 BUILD + 342 USE + 26 component) | — |
| Component rows inside M-LEGOs | 0 | 67 | — |
| Audio clips | 1 (pre-existing) | **1 — unchanged** | — |

**25 of 668 seeds (3.7%) are decomposed.** The course is **not built**. It is a quality-checked
opening block with everything downstream of decomposition in place for those 25 seeds, and a clean
runway from seed 26.

**No TTS was run. No audio was generated. `course_audio` still holds exactly the one clip it held
before this session, and not one of the 582 new phrases carries an audio link.** Kai's hard rule was
observed without exception.

Shape: 3.0 LEGOs per seed, 23.3 practice phrases per seed, USE outnumbering BUILD 1.6 : 1,
self-assessed USE score average **7.47** (163 eights, 177 sevens, 2 sixes, nothing below 6).

---

## The self-check on my own output — the estate mis-pairing defect

Run against the **database**, not my drafts, after the last submission. Four tests, none of which
needs Friulian. Numbers first, method under each.

| Test | Result |
|---|---|
| **T1 round-trip** — does the DB hold what I POSTed? | **74 of 74 LEGOs byte-identical** — known side, target side and every component. **0 drift.** |
| **T2 self-contradiction** — same known → different targets, or same target → different knowns | **141 pairings checked. 0 forks. 0 same-seed forks (the estate signature).** 1 convergence, deliberate. |
| **T3 coverage** — is any word of a seed sentence taught by no LEGO? | **25 seeds, 0 unteaching words.** No missing-LEGO defect. |
| **T4 untaught-word rule** — re-tiled from scratch in learner order | **582 phrases, 0 violations.** |

**The estate mis-pairing defect does not appear in this output. That is the expected-good answer, and
here is exactly what was tested so the zero means something.**

- **T1** compares the five authored JSON files against the stored rows field by field, including the
  component arrays. This is the third independent confirmation (after Neapolitan's 93/93) that the
  shared decomposition machinery does not corrupt what is submitted to it.
- **T2** builds every (known, target) pairing — LEGO-level *and* component-level, 141 of them — and
  looks for one English gloss landing on two Friulian forms, or one Friulian form under two English
  glosses. The estate signature is the same-seed case: two cards in one sentence holding each other's
  material. **Zero of both.**
- **T3** re-tiles each seed sentence against everything taught **up to and including** that seed, and
  reports any word no LEGO ever teaches.
- **T4** rebuilds the learner's vocabulary in strict seed-then-LEGO order and re-tiles all 582
  phrases, which is the untaught-word rule re-checked independently of the API that already enforced
  it at submission time.

**Two false-positive classes were disarmed rather than reported as defects,** per the field note from
the Neapolitan build:

1. **Apostrophes are letters, not punctuation, on the target side.** Friulian has `l'ore`, `l'an`,
   `l'ultime` (8 distinct apostrophe tokens across the corpus). Stripping the apostrophe would merge
   distinct words and manufacture a defect. My normaliser drops sentence punctuation only.
2. **Intentional overlap is not double-claiming.** All 25 seeds contain words covered by more than
   one LEGO — that is the overlap ladder working. The discriminator used is the one that works: a
   real defect points two rows at *different* parts of the sentence with swapped counterparts;
   intentional overlap has one target as a literal **substring** of the other with the glosses
   nesting the same way.

**The one convergence, stated openly:** `il so non` is taught as both *his name* (S20) and *her name*
(S21). That is one Friulian form under two English glosses, which ZUT permits and which is a real
property of Friulian possessives (they agree with the thing possessed). It is question **D** for a
speaker.

### The honest limit of this result

**The self-contradiction test can only catch a pairing that contradicts another pairing in the same
course. It cannot catch a pairing that is wrong consistently everywhere, because nothing contradicts
it.** If `impegnâmi` does not mean "try", nothing in my output will ever say so. **A clean self-check
is not a statement that the content is correct — only a native speaker closes that gap.** That is
what the speaker-question list is for, and four of its items are marked BLOCKING.

---

## Premise check — done first, against the live database

The census description was verified before anything was written, and **it was wrong in one respect
that matters**:

- `fur_for_eng` exists, created 2026-07-07, status `draft`, visibility `hidden`, `seed_count` NULL.
- **668 seeds**, numbered 1–668 with **no gaps**, **every one** carrying a Friulian `target_text`
  (0 untranslated). None approved (`approved_at` null on all 668), all `status: draft`.
- **0 LEGOs, 0 practice phrases** before this session; **1** row in `course_audio`.

**The census called this "a 300-seed standard-tier build". The database holds a 668-seed corpus.**
The census flagged that the tier was inferred rather than read, and it was: nothing in the `courses`
row states a tier — `seed_count` is NULL. So the honest statement is that **the corpus on disk is
668 seeds and there is no database field that says where this build is meant to stop.** I did not
treat 300 as a ceiling; I built from seed 1 and stopped where the session stopped, at 25.

---

## Orthography of the existing translations — measured, not assumed

I measured all 668 Friulian seed texts myself. **I am not a Friulian speaker**, so below I separate
what was *measured* from what is *believed* about the standard.

**Measured — mechanical cleanliness (hard facts):**

| Check | Result |
|---|---|
| Doubled spaces | **0 seeds** |
| Leading whitespace | **0 seeds** |
| Trailing `.` `,` `;` | **0 seeds** |
| Brackets / parens / stray tags | **0 seeds** |
| Curly apostrophes (’) mixed with straight (') | **0** — all 8 apostrophe tokens use the straight form |

**Measured — Grafie uficiâl diagnostics present in the corpus (believed to indicate the standard
orthography):** circumflex long vowels in **506** seeds (`â ê î ô û`), grave accents in **306**,
c-cedilla `ç` in **23**, digraph `cj` in **91**, `gj` in **19**, and **zero** acute accents (which
Friulian does not use). On that evidence the corpus reads as consistently written in the standard
orthography, and I found **no seed that looks like a different variety or a different language**.

**Measured — the one genuine same-word divergence I can prove:**

| Seed | Text | Same English |
|---|---|---|
| S127 | `nol è par chel che o volevi **viodîti**` | "I wanted to see you" |
| S178 | `no ai vût timp, ancje se o volevi **vioditi**` | "I wanted to see you" |

One with the circumflex, one without, identical phrase. **Neither seed is in the block built
tonight,** so nothing built tonight depends on it. It is question **K** for a speaker. **Nothing was
normalised** — that is a human's ruling, per the brief.

**A second, independent pass (#702) agrees and adds two cases I had dismissed.** That worker checked
sentence context for every algorithmically flagged variant and came out at **6 genuine word-pairs,
~17 seeds** — a low rate across 668 seeds. Beyond `vioditi`/`viodîti` it found two I had wrongly
written off as minimal pairs, and it is right: **`fat`/`fât`** ("done", 5 vs 3 seeds — both the past
participle after *vê*, same syntactic slot) and **`mal`/`mâl`** ("badly", 1 vs 3). It also flags
`podarès`/`podarês`, `cirìn`/`cirin` and `scugnìn`/`scugnin` without confirming them; on those I
looked at the subject clitics in context (`o cirìn` vs `a cirin`, `o scugnìn` vs `a scugnin`) and
read them as **first person plural vs third person plural — different forms, not two spellings**.
That reading needs a speaker's yes, so it is question **K2**. None of the six is in seeds 1–25.
It found **0 Italian or Venetian leakage** and **0 seeds in a non-standard variety** — though it
records an honest gap there: no surface diagnostic separates Carnian/Western/Gorizian from the
central standard without a native reader.

**Not a divergence, and worth saying because a naive scan reports it as one:** 27 word-pairs differ
only by a diacritic (`di`/`dî`/`dì`, `la`/`lâ`/`là`, `e`/`è`, `si`/`sì`, `su`/`sù`, `an`/`àn`,
`lat`/`lât` …). I checked these in context and they are **minimal pairs — different words**
(*of* / *to say* / *day*; *the* / *to go* / *there*; *milk* / *gone*). Likewise `cirìn`/`cirin` and
`scugnìn`/`scugnin` are **first person plural vs third person plural**, not two spellings of one
form. Reporting those as inconsistencies would have been a false alarm.

### Three of my committed glosses are contradicted later in the corpus — needs a decision

The ZUT-fork worker (#703) checked the 11 glosses seeds 1–25 commit to against all 668 seeds.
**Six hold. Two are genuinely contradicted, one is a sense-split, one is unverifiable.** Every claim
below was re-queried against the database by me before being written here.

| Gloss I taught | Where it breaks | The later text |
|---|---|---|
| **`I have to` → `o scugni`** (S25) | **S181, S293** | `ma o **ai di** puartâ mê mari dal miedi` / `o **ai di** vignî a savê…` |
| **`soon` → `chi di pôc`** (S23) | **S149, S431** | `o speri che tu finissis **prest**` / `a saran pronts **prest**` |
| **`to try` → `impegnâmi`** (S7) | **S236, S541** | `e varès **cirût di** judâ` / `**cirî di** respirâ planc` |

**What each one means, plainly:**

1. **`I have to`** is the sharpest. Two Friulian constructions — `o scugni` and `o ai di` — answer
   the same English prompt. Whoever reaches seed 181 must either use my gloss (and change that
   seed's translation) or differentiate the English. **The ZUT gate will force the choice at S181;
   better to decide it now.**
2. **`soon`** is the same shape: `chi di pôc` (mine, S23) vs `prest` (S149, S431). Collides at S149.
3. **`to try` confirms question B and sharpens it.** `impegnâsi` is the *try hard* idiom; plain
   "try to do X" is `cirî di` throughout the corpus. The likely resolution is to re-gloss S7's LEGO
   as **"to make an effort"** and let `cirî di` carry "try to". That is a change to live content,
   so I have not made it.
4. **`more` → `di plui`** is *not* contradicted — S73/75 (`ancjemò alc`, "more to learn") and S103
   (`tantis altris peraulis`, "more words") are different senses of English *more*, not different
   renderings of mine. A fork risk to watch, not a defect.
5. **`to meet up` → `cjatâsi` cannot be checked**: the phrase "meet up" appears nowhere else in the
   668 seeds. Question **C** stands unresolved either way.

**Re-glossing is cheap right now, and this is the moment.** Kai's rule is that changing a LEGO's
text means fixing the presentation that introduces it in the same pass — I checked, and
`/api/seed/complete` writes only to `course_legos` and `course_practice_phrases`; **it creates no
presentation rows at all**, and none exist for these 74 LEGOs. So a re-gloss today touches the LEGO
and its phrases and nothing else.

**#703's own honest gap, worth repeating:** it frequency-scanned and hand-verified the
highest-signal candidates rather than every recurring English word, so **absence from its list is
not proof that no other fork exists.**

### A cross-course content leak in the existing translations — needs a decision

**Four seeds carry the word `yoruba` where the Friulian word for "Friulian" belongs.** Found by the
replacement orthography worker (#702) and **verified first-hand against the database** before being
written here:

| Seed | English prompt | Friulian as stored |
|---|---|---|
| S283 | Which of your friends speak Friulian? | cuâi dai tiei amîs fevelino **yoruba**? |
| S285 | She speaks Friulian. | e fevele **yoruba** |
| S286 | People who like speaking Friulian. | int che i plâs fevelâ **yoruba** |
| S297 | I don't know many people who speak Friulian. | no cognòs tante int che e fevele **yoruba** |

This is not a spelling variant — it is another course's language name left in the Friulian text,
almost certainly from a batch translation run shared with `yor_for_eng`. **None of the four is in
seeds 1–25, so nothing built tonight teaches it** and no LEGO or practice phrase contains it.

**Nothing was changed.** These are seed `target_text` values in a course a human owns; the fix is
one word in each of four rows (`yoruba` → `furlan`) and it is cheap and safe *now* — the four seeds
have no LEGOs and no audio, so no downstream rows would be orphaned. It gets expensive once someone
decomposes seed 283. **This is Kai's call to make, not a build-time normalisation.**

---

## What was built, and how

Method: `ralph-methodology.md` + `.claude/commands/layered-decomposition-brief.md` +
`synonym-choice-architecture.md`. Every seed went in through `POST /api/seed/complete` on the live
course-builder, so every one passed atomically: tiling, ZUT, the syllable cap, the known/target
length-ratio gate, phrase containment, BUILD/USE structure and the vocabulary gate.

### The one place this language forced a departure, and why

**Friulian requires a subject clitic on every finite verb, and the clitic changes shape under
negation and inverts under question.** `o vuei` (I want) → `no vuei` (I don't want) → and for
*speak*: `tu fevelis` (you speak) → `fevelistu?` (do you speak?). A bare finite verb is not
producible.

The methodology's default move for a small grammatical particle is to bury it inside an M-LEGO as a
silent construction-feature. **I did not split the clitic off as a feature.** Every finite form is
taught as a whole clitic+verb M-LEGO with its own English gloss, and each face of a verb —
affirmative, negative, interrogative — is a separate debut that overlaps the previous one:
`o vuei` (S1) → `no vuei` (S19); `tu fevelis` (S13) → `fevelistu` (S14) → `imparistu` (S21).
That is the overlap ladder revealing the pattern, exactly as the brief prescribes for hidden grammar,
rather than a grammar label the learner can produce nothing from.

**The second pair-specific rule: the linker belongs to the governing verb, never to the infinitive.**
`o cîr **di**` + `imparâ`, `smeti **di**` + `fevelâ`, `o fasarai pratiche **a**` + `fevelâ`. Both
rules are written up in the new pair-contract.

### The untaught-word rule — checked as it was built, and again afterwards

> *A practice phrase may only use LEGOs the learner has already been taught at that point.*

Enforced three ways: a pre-flight linter that re-implements the server's tiler (caught most problems
before they cost a round trip), the API itself (which **rejected 7 seed submissions outright** — each
was fixed, never bypassed), and the independent T4 re-tile above. **582 phrases, 0 violations.**

Three things the gates caught that are worth knowing:

- **The known side is policed and does no stemming.** `speaking`, `saying`, `learning` were all
  rejected as unintroduced even though `to speak`, `to say`, `to learn` were taught. Where the
  English genuinely needed the gerund (S5 *practise speaking*), I introduced `speaking → a fevelâ`
  as a **component** so the form is properly taught, and elsewhere I rewrote the prompt. Nothing was
  waved through.
- **A character-length ratio gate rejects tight pairs.** Friulian is compact: *to say something* →
  `dî alc` is a 2.7× ratio and was rejected. Prompts were lengthened, not forced.
- **`can't` and other contractions are brittle** on the known side, so sentences wanting them were
  rewritten.

### Two ZUT decisions I made rather than fudged

1. **"to meet" forks in the existing translations** — S18 `cjatâsi` (meet at six) vs S22 `cognossi`
   (meet people). One English prompt may not have two Friulian answers, so I split the English:
   `cjatâsi` = **"to meet up"**, `cognossi` = **"to get to know"**. Question **C**.
2. **"to try" also forks** — S2 `o cîr di` ("I'm trying to") vs S7 `impegnâmi` ("to try"). Kept
   apart by gloss; whether `impegnâsi` really means *try* is question **B**.

Both are flagged rather than hidden, because both may be wrong in a way no self-check can detect.

---

## Two things produced alongside the content

1. **A pair-contract for the language pair** — `docs/pair-contracts/fur_for_eng.contract.cjs`. There
   was none, and the methodology says to derive one on first contact. It records the subject-clitic
   rule, the verb-linker table, the `il so non` convergence, the bound English units
   (*as often as possible*, *as hard as I can*, *what I mean*), and which English machinery is
   licensed by which Friulian carrier (the "going to" future by the synthetic future at S5;
   negation by `no` at S10; do-support questions by the enclitic at S14). It is deliberately
   `ratified: null` — nobody here speaks Friulian, so it runs advisory until a speaker signs it off.

2. **A native-speaker question list** —
   `docs/a108/fur-for-eng-native-speaker-questions-2026-08-15.md`. Sixteen areas in plain English,
   answerable one line each by someone who knows nothing about our system. **Four are BLOCKING**
   (A, B, C and the new F2), meaning the course teaches a guess today: the `-mi` reflexives being
   locked to *I*, the two verbs for *try*, the two verbs for *meet*, and the two ways the corpus says
   *I have to* and *soon*.

---

## Explicit gaps

1. **643 of 668 seeds are not decomposed.** The course is 3.7% built. Seeds 26 onward are untouched.
2. **No Friulian speaker has reviewed any of this.** The USE scores average 7.47, but a self-score
   from a non-speaker is a statement about pedagogical shape, not about whether a Friulian would say
   it. See the honest-limit paragraph above.
3. **The tier is still not readable from the database.** 668 seed rows exist; no field says whether
   the build target is 300 or 668. Reported, not guessed.
4. **Two sonnet workers died on an account limit** (`⚙ hit kai-gmail's limit`) before writing
   anything — the orthography audit and the corpus scout. The orthography section above began as my
   own first-hand measurement of all 668 seeds; the replacement **#702** has since landed and its
   findings are folded in above (and independently verified where they changed a claim — the
   `yoruba` leak was re-queried against the database before being written down). **#703**, the ZUT-fork map and verb-linker
   table for seeds 26+, has also landed and is folded in above, with each of its contradiction
   claims re-verified against the database. Its own coverage gap is recorded with it.
5. **The pair-contract is written but not live.** The running course-builder executes from a
   different checkout (`ssi-dashboard-v7-clean-prod`, on `main`), outside this session's workspace,
   so the build ran against the generic `_default_eng` fallback. Practical effect: the gate was
   **stricter**, not looser — it emitted harmless "machinery `going` unlicensed" warnings because no
   contract licensed the Friulian future. No bad content got through because of it. The contract
   becomes active only when the branch reaches `main` and the service restarts.
6. **No QA checkpoint agent ran.** `/checkpoint-qa` and `/scan-course` have not been run against this
   content; the verification above is the self-check plus the API's own gates.

---

## Where the next agent picks up

Next seed is **26** (`mi plâs sintîmi come se o fos cuasi pront a lâ` — "I like feeling as if I'm
nearly ready to go"). Everything needed is on the branch: the authored seed files under `.a108-fur/`
show the working format, `submit.cjs` posts them, `lint.cjs` catches most rejections before they cost
a round trip (including the length-ratio and untaught-word traps), and `mispair-selfcheck.cjs`
re-runs all four tests above from the database.

Before seed 26 someone should settle question **A** — the `-mi` reflexives — because S26 introduces
`sintîmi` and will inherit the same guess.
