# Quality sweep — `por_br_for_eng` (Brazilian Portuguese for English speakers)

**Date:** 2026-08-06 · **Course status at time of sweep:** `status=beta`, `visibility=public` — **LIVE**
**Scope:** 668 seeds / 1,570 LEGOs / 14,179 practice phrases (counts read from the live DB).
**Writer:** single writer, this session. No other course touched.
**Audio:** no TTS generated, regenerated or queued. See §6.

Backups of every changed row (id + old value) were written to this directory as
`por_br_for_eng-backup.json`, `-backup2.json`, `-backup3.json`. **These are gitignored and therefore
exist only on this machine's working tree — they are NOT committed and NOT on origin.** If the
reversibility record matters beyond this machine, they need copying somewhere durable.

---

## 1. Method and calibration

All work was done against the **live database over direct SQL** (`scripts/_q.cjs`), not against a dump
and not via PostgREST — so no `IN`-clause truncation and no anon-key row hiding applies.

**Unicode boundary calibration (the trap named in the brief).** Every detector uses
`(?<!\p{L})word(?!\p{L})` with `/u`. Calibration assertion run before counting:

| test | expected | got |
|---|---|---|
| `W('você')` on `onde você está` | true | true |
| `W('até')` on `até agora` | true | true |
| `W('ate')` on `até agora` | **false** | false |

The third row is the important one: it proves the lookaround is accent-aware and that a naive `\b`
build would have silently under-reported on this course.

**Detector calibration.** Stated per detector below, including one that **failed and had to be
re-grounded**.

---

## 2. Step 1 — verifying the pre-run structural findings

| Pre-run finding | Verdict after hand-check |
|---|---|
| Parentheticals ×2 | 1 real and fixed; **1 correctly NOT fixed** (see below) |
| Slash ×1 | Real, fixed |
| Identical `known==target` | **All false positives** — and there are 18, not 2 |
| Presentation drift, 8 SEVERE | Real, all 8 unlinked |
| ZUT (Check 10) = 0 | **Under-scoped** — see §3.1 |
| Lowercase `i` | Not touched — another worker owns it |

### 2.1 The parenthetical I deliberately did NOT strip

`S0195L01 "the (masculine)" → "o"` — **left as-is, on purpose.** Stripping the disambiguator would
have minted a live ZUT conflict against `S0196L01 "the" → "a"`. This is exactly the trap the brief
warned about, and it is a real one here, not hypothetical.

What I found underneath it is worse than the label, and *is* fixed: **both LEGOs carried a BUILD
phrase drilling the bare article** — `S195L1p1 "the" → "o"` and `S196L1p1 "the" → "a"`. The learner
was being drilled on the bare prompt "the" and required to produce two different words. The
parenthetical on the LEGO was papering over a collision that was already live at phrase level.

Swept course-wide for bare-article drills: **51 rows, of which 48 are `component` rows** (intentionally
partial, never drilled bare — false positives per the role rule) and **3 are BUILD**. Two were the
collision above; both reworded to carry a noun. Post-fix, bare `"the"` as a build/use prompt returns
**0 rows**.

The LEGO gloss itself still needs a decomposition change (M-expansion with an already-introduced noun
on both sides) which must go through the course-builder. **Not fixed — flagged, see §5.**

### 2.2 Identical known==target — 18 hits, 0 defects

All 18 are `component` rows and all are genuine: `me`→`me` (×12 — correct Portuguese), plus `favor`,
`hotel`, `real`, `hospital`, `Jane`. Cognates and a proper noun. **No action.** The pre-run count of 2
was an undercount, and the true count is entirely false-positive.

---

## 3. Step 2 — what hand-reading found (the part a structural checker cannot see)

**Seeds read in full** (seed row + all LEGOs + all component/build/use phrases), spread across the
range: 5, 28, 44, 53, 86, 105, 140, 187, 190, 195, 196, 206, 209, 219, 230, 248, 251, 277, 289, 400,
480, 560, 640 — **23 seeds read in full**, plus partial inspection of ~15 more reached through the
pattern sweeps (120, 379, 421, 462, 467, 468, 479, 481, 484, 487, 488, 541, 545, 558, 573, 605, 614, 641).

### 3.1 THE BIG ONE — seeds whose own sentence does not tile from their own LEGOs

Found by reading **seed 53** and then swept. This is a decomposition-level defect, not a typo.

**Seed 53** — `"she wanted to put his letter in her bag"`. Three independent faults in one live seed:

| | was | should be |
|---|---|---|
| L1 teaches | `to put` → **`colocar`** | — |
| but 20 phrases said | **`pôr`** | `colocar` |
| and the seed itself said | `ela queria **pôr** a carta dele no **saco** dela` | — |
| L3 teaches | `in her bag` → `na bolsa dela` | — |
| but 13 phrases said | **`no bolsa dela`** | `na bolsa dela` |

- `pôr` is **never introduced anywhere before seed 314** — the learner was asked to produce it at
  seed 53, and it contradicts the seed's *own first LEGO*, which teaches `colocar`.
- **`no bolsa` is outright ungrammatical** — `bolsa` is feminine, so it must be `na bolsa`. 13 rows,
  including the component gloss `"in" → "no"`. Swept course-wide: `no bolsa` occurs **only** in seed 53.
- `saco dela` for a woman's handbag is the wrong word *and* the wrong register in BR Portuguese;
  the LEGO's own `bolsa` is correct.

**Fixed.** Seed target is now `ela queria colocar a carta dele na bolsa dela`, which tiles exactly
from L1 + L2 + L3.

**Seed 289** — same shape, found independently: the seed is `me pergunto se ela vai estar lá esta
tarde` but its LEGO taught `I wonder → pergunto`. Bare `pergunto` means "I ask", not "I wonder", and
the seed did not tile. **Fixed** — LEGO target is now `me pergunto`.

### 3.2 Verb FORM used hundreds of seeds before the course teaches it

Detector: build a debut map of every word appearing in any LEGO target, then flag phrases using a
word whose debut is later. **First version over-fired at 303** because it ignored earlier seeds
entirely; second version, with a same-lemma guard (plural/inflection variants are a known
false-positive class), gives **88 rows over 17 words**.

**Calibration — and an honest correction.** My first calibration positive was my own hand-read claim
that `S196L1p8` forward-referenced `ideia`. The detector said no. **The detector was right and I was
wrong**: `ideia` actually debuts at S123 (`good idea` → `boa ideia`). I re-grounded on `pôr`
(used S53, debuts S314) — verified by hand against the seed 53 LEGOs — and the detector fired
correctly, 20 rows.

High-confidence members of the family, all Portuguese forms the course has not yet taught at the
point of use:

| form | used at | debuts at | rows | note |
|---|---|---|---|---|
| `pôr` | S53 | S314 | 22 | **fixed** (→ `colocar`) |
| `fizer` | S190 | S489 | 10 | future subjunctive — **not fixed, flagged** |
| `quiser` | S44 | S97 | 8 | future subjunctive — **not fixed, flagged** |
| `foi` | S86 | S112 | 3 | preterite — **fixed** (→ `era`) |

`fizer` and `quiser` are **correct Portuguese** — seed 190's `você se importa se eu fizer algumas
perguntas?` genuinely needs the future subjunctive. The defect is that the course never introduces
the form. That is a decomposition fix, not a phrase fix, so per §1 of the rule block ("you cannot
fully fix a phrase whose underlying gloss is broken — fix that or flag it") these are **flagged, not
forced**. See §5.

Rejected from this family as false positives: `diferentes` (plural of `diferente`, debuts S60 —
tokenizers don't stem), `minha` (feminine of `meu` — gender pair), `novo` (`novas` debuts S109).

### 3.3 ZUT — the check the pre-run scan under-scoped

Pre-run Check 10 returned **0**, but it only covered `is_new` LEGOs. Re-run across **all LEGOs plus
all build and use phrases** (components excluded — never drilled bare): **45 raw same-known →
multiple-target hits.** Hand-adjudicated:

- **~8 gender pairs — false positives, left alone** per §4 resolution 4: `kind`→simpático/simpática,
  `my`→meu/minha, `a friend`→um amigo/uma amiga, `thank you`→obrigado/obrigada, `some`→algum/alguma.
- **~14 optional-subject-pronoun variation** — `eu concordo`/`concordo`, `eles acham`/`acham`,
  `nós não queremos`/`não queremos`. Both are correct Portuguese (the language is pro-drop), but the
  course applies it **inconsistently for the same English prompt**. This is real, and it is
  Kai's "is there a REASON?" question with the answer "no". **Not fixed — this is a course-wide
  convention decision, not mine to impose.** See §5.
- **The remainder were genuine.** Fixed, high confidence:

| seed | was | now | why |
|---|---|---|---|
| S219L2p3 | `for a while` → **`durante algum`** | `durante algum tempo` | ungrammatical fragment; its own LEGO (S92L2) says `durante algum tempo` |
| S112L2p1 | `expecting` → **`à espera`** | `esperando` | `à espera` is **European** Portuguese; contradicts its own LEGO |
| S277L2p1 | **`early`** → `início` | `beginning` → `início` | its LEGO is `beginning`; `early`→`cedo` already exists at S139 |
| S248L1p3 | `it was rubbish` → **`foi lixo`** | `era lixo` | seed says `era`; same era/foi family as S86 |

### 3.4 Capitalisation mid-sentence — 99 rows

Found by reading **seed 640** (`ele acha que **É** o vermelho`). Swept: **14 LEGO targets** beginning
`É ` (all `it's …` chunks that only ever appear mid-sentence) and **85 phrase rows** carrying a
mid-sentence `É ` or `Porque `. All learner-facing, all wrong. **Fixed, 99 rows.**

`África` and `Itália` also matched a first-pass regex and are **correct** (proper nouns) — excluded
by hand, not by the regex.

### 3.5 A candidate I raised and then cleared myself

**Seed 560.** The English of 13 phrases reads `it goes down` while the Portuguese is just `vai`, with
no `desce`. I initially logged this as a translation mismatch. On checking rule 4 it is the
**harmless direction** — two English prompts (`it goes`, `it goes down`) converging on one target.
Redundant at worst. **Not a defect; not fixed.** Recording it because "considered and cleared" is
worth as much as "found".

---

## 4. What was fixed — counts

| # | Fix | Rows |
|---|---|---|
| 1 | Seed 53 target rewritten so the seed tiles from its own LEGOs | 1 seed |
| 2 | Seed 53 phrases `pôr` → `colocar` (untaught form) | 20 |
| 3 | Seed 53 phrases `no bolsa` → `na bolsa` (gender agreement) | 13 |
| 4 | Seed 53 component gloss `in` → `na` | 1 |
| 5 | S86 `não foi possível` → `não era possível` (ZUT consolidation onto the taught form) | 3 |
| 6 | Bare-article ZUT drills reworded (S195L1p1, S196L1p1) | 2 |
| 7 | English indefinite vs definite target (S196L1p7, S206L1p6) | 2 |
| 8 | Slash gloss `until/so far` → `until` | 1 LEGO |
| 9 | Grammar label `meeting (gerund)` → `meeting` | 1 LEGO |
| 10 | `até` duplicate debut at S251 → `is_new=false` | 1 LEGO |
| 11 | Presentation-drift SEVERE unlinks | 8 LEGOs |
| 12 | ZUT genuine defects (S219, S112, S277, S248) | 4 |
| 13 | S289 LEGO `pergunto` → `me pergunto` (seed did not tile) | 1 LEGO |
| 14 | Mid-sentence capitalisation (`É`, `Porque`) | 99 |
| | **Total rows changed** | **157** |

**Fix clusters, not flags:** these 157 rows are **8 distinct fixes** — two non-tiling seeds, one
untaught-form family, one gender-agreement error, one bare-article ZUT collision, one
label/slash cleanup, one ZUT consolidation set, one capitalisation class.

### Post-fix verification

Every detector that *defined* an issue was re-run **across the whole course** and required to return
zero — not a curated list of the ids I touched:

```
no_bolsa=0   pôr@S53=0   "não foi possível"@S86=0   slashes_in_lego_known=0
bare "the" build/use prompts=0   "durante algum"=0   "à espera"=0   "foi lixo"=0
mid-sentence É / Porque = 0
```

Integrity checks: phrase total **14,179 before and after** (nothing vaporised by the LEGO edits —
this is the `spa_for_eng` S53 failure mode and it did not occur); seed 251 still has an `is_new`
LEGO after the debut suppression; seed 53 and seed 289 now tile from their own LEGOs.

**ZUT re-checked across the course after every `known_text` edit** (the required order). Every prompt
I created or reworded — `until`, `meeting`, `the good idea`, `I want the dog`, `she wants the friend`,
`nobody wanted the chance to speak` — maps to exactly **one** target course-wide. No conflict minted.

---

## 5. Found but NOT fixed, and why

1. **`S0195L01 "the (masculine)"` gloss.** Stripping mints a ZUT conflict with `S0196L01 "the"→"a"`.
   Needs M-expansion on both sides through the course-builder. The *learner-facing* half of this
   (the bare drills) **is** fixed. Also note `S196L01` carries `is_new=false` while teaching a
   genuinely new target (`a`), which is a misapplied debut suppression.
2. **Future-subjunctive family — `fizer` (10 rows, S190), `quiser` (8 rows, S44).** The Portuguese is
   correct; the course never introduces the form. Requires a new LEGO/decomposition, not a rewrite.
3. **Optional-subject-pronoun inconsistency, ~14 ZUT pairs.** Needs a course-wide convention ruling
   from Kai. Both forms are grammatical; the defect is the inconsistency.
4. **`S157L1p3`** `"I won't be able to be there"` → `eu não vou conseguir estar` — English says
   "there", Portuguese doesn't. Can't be fixed without either awkward English or a same-seed forward
   reference to L2 (`there`→`lá`). Skipped rather than forced.
5. **`S484L1 "it's meant to be" → "É suposto ser"`** — `é suposto` is **European** Portuguese; BR
   would be `deveria ser`. Capitalisation fixed; the EU/BR wording left, as it changes a taught LEGO.
6. **`S379L3 "até África"`** — BR Portuguese normally takes the article (`até a África`). Low
   severity, left.
7. **`S480L1 "whatever he says" → "diga ele o que disser"`** — grammatical but literary/inverted for
   this level, and the English of `p12` ("whatever he still says") is not idiomatic. Judgement call
   on register; left, reported.
8. **Underpopulated LEGOs (105).** Informational, per the brief; not spent this run. Note `S195L1`
   sits at 3 build / 4 use, below the 3/5 floor, and my rewording kept the count level (did not
   reduce it).

**Other courses:** patterns 3.1 (seed not tiling from own LEGOs), 3.2 (untaught verb form) and 3.4
(mid-sentence capitals) are generic generator-shaped defects and are **worth checking in the other
Romance courses**. Per rule 1, **reported, not fixed** — I touched no course but this one.

---

## 6. AUDIO NOW OUT OF SYNC — NEEDS APPROVAL

**No TTS was generated, regenerated or queued. No `course_audio` row was deleted.**

| Cause | Clips unlinked |
|---|---|
| Seed 53 phrase target rewrites (`pôr`/`no bolsa`) | 21 |
| Seed 53 seed-row target rewrite | 1 |
| S86 target rewrites | 3 |
| S195/S196/S206 known/target rewrites | 4 |
| Presentation drift SEVERE (Check 18) | 8 |
| Round-2 ZUT fixes (S219, S112, S277, S248) + S289 LEGO | 5 |
| **Total unlinked, awaiting an approved audio pass** | **42** |

**One deliberate exception, flagged for Kai's ruling.** The 99 capitalisation rows (§3.4) were
**not** unlinked. The change is `É` → `é` and `Porque` → `porque` — the **spoken content is
identical**, so the existing clips still match what is said. Unlinking would have created a 99-clip
missing-audio backlog on a live course while audio work is on hold, for no change to what the learner
hears. If you would rather have exact orthographic parity, say so and I will unlink those 99.

---

## 7. Explicit gaps

1. **No native BR Portuguese review.** Judgements here are mine. The register calls (§5.7 `diga ele o
   que disser`, §5.5 `é suposto`) and the `saco`→`bolsa` register argument would benefit from a
   native speaker. Marked uncertain rather than asserted.
2. **The course-builder was not used.** All edits were direct SQL, so the builder's tiling/ZUT/vocab
   gates did **not** re-run over my changes. I verified tiling by hand for seeds 53 and 289 and
   re-ran ZUT myself course-wide, but that is my check, not the builder's.
3. **`course_round_index` was not refreshed.** These were direct DB writes. If the learner-facing app
   reads the materialised view, the text changes may not surface until it is refreshed. **Not done —
   outside what I was asked to touch, and flagged for whoever lands this.**
4. **Fan-out was refused.** I attempted to dispatch 4 read-only hand-readers to widen seed coverage;
   the surface refused at the depth ceiling (already at depth 2). All reading was therefore done in
   this one session, which is what bounds §3 to 23 full seed reads rather than more.
5. **Coverage is a sample, not a census.** 23 seeds of 668 read in full. The pattern sweeps behind
   each finding *are* course-wide, but a defect shape I never happened to read is a defect shape I
   never swept for.
6. **`is_new` correctness was not audited generally.** I found one misapplied `is_new=false`
   (S196L01) incidentally; I did not sweep the class.
