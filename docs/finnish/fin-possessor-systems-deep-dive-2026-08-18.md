# fin_for_eng — how possession is expressed, across the whole course

**Read-only investigation, 2026-08-18. Nothing applied. No Supabase writes, no edits, no audio, no course-data commits.**

Data: live Supabase, read 2026-08-18 — **14,123** phrase rows, **1,425** legos, **668** seeds, `course_code='fin_for_eng'`. Kai's proofread progress read from `scripts/proofread-live/tools/proofread/progress/fin_for_eng.json` (2,860 decisions, last phrase `S0105L02B05`).

Measurement note, inherited from the flag triage and re-confirmed here: JavaScript `\b` does not fire next to `ä`/`ö`. Every count below uses `(^|[^\p{L}])word([^\p{L}]|$)` with the `u` flag. The Finnish side of this course has only **1,296 distinct word forms** in 68,910 tokens, so the possessive-morphology inventory below is exhaustive, not sampled — I enumerated every token and classified it, rather than pattern-matching for suffixes I expected to find.

---

## 1. The headline

**The course expresses attributive possession four ways. Three of them are one system with a boundary; the fourth is one row.**

Of the **805 phrase rows** whose English carries a possessive determiner + noun (`my friend`, `her name`, `your hands` …):

| mechanism | rows | share |
|---|---|---|
| **genitive pronoun** — `mun` / `sun` / `sen` / `meidän` / `teidän` / `niiden` + N | **718** | **89.2%** |
| **possessive suffix alone** — `kaverillensa`, `laukkuunsa`, `veljensä`, `siskolleen`, `kätenne` | 51 | 6.3% |
| **genitive pronoun + suffix together** — `teidän kanssanne` | 10 | 1.2% |
| **zero** — possessor in the English, nothing in the Finnish | 26 | 3.2% |

Two further constructions exist and are **not in conflict with any of the above**, because they express something else: the adessive have-construction (`mulla on`, `sillä ei ollut varaa` — 319 rows, from S27) and the genitive **noun** possessor (`sun kaverin`, `Janen laukku` — 162 rows, from S216). Neither is a rival way of saying "her bag"; both are the only way to say what they say. I mention them so the inventory is complete, and then set them aside.

**Is four a problem?** Mostly no, and precisely where it is, it is small.

- The **89.2%** is not a majority — it is the system. Six introducing legos, first at seed 1 (`with you → sun kanssa`), covering every person, running unbroken from seed 1 to seed 667.
- The **suffix rows are not a rival system being taught.** All 51 trace to **five seed sentences authored 2026-01-18** and still `released` — S52, S53, S316, S332, S529 — whose own Finnish text contains the suffix. The decomposition then tiled those seeds faithfully, which is the method working correctly. Nobody chose a second possession system; five sentences arrived with one inside them.
- `teidän kanssanne` is **not a third system either** — it is standard-language double marking, and it appears only inside the formal `(formal)` block S639–S667, where it is the register-correct form.
- The **zero** column is 26 rows and 24 of them are correct: `on my own → itse / yksin` is idiom (14 rows), and `both of her hands up → molemmat kädet ylhäällä` (10 rows at S324) is the normal Finnish body-part possessor drop.

So the real answer to Kai's question is: **the course teaches one possession system and carries five lexical fossils of another.** The problem is not that there are four mechanisms. The problem is that **the fossils leaked** — and where they leaked, the grammar broke.

**What is actually wrong: 7 rows of 14,123.** Three binding violations, three coreference mismatches, one mistiled component. Every one is listed in §3 with its seed and its text.

**What is arguably wrong but is a judgement call, not a defect: the ordering.** A learner meets `kaverillensa` at seed 52 — a fused, opaque, 12-letter form — **78 seeds before** meeting `kaveri` (S130) and **254 seeds before** meeting its exact genitive-pronoun parallel `sun kaverille` (S306). For bags it is worse: `laukkuunsa` at S53, bare `laukku` at S635, `sen laukku` at S637 — **582 and 584 seeds later**. Nothing ever connects the two shapes. That is §5's subject.

---

## 2. The inventory, by mechanism and seed range

### 2a. The genitive pronoun — the system

| form | first LEGO | that lego | legos | phrase rows |
|---|---|---|---|---|
| `sun` | **S1** | `with you → sun kanssa` | 21 | 439 |
| `mun` | **S15** | `with me → mun kanssa` | 32 | 838 |
| `sen` | **S20** | `his name → sen nimen` | 21 | 777 |
| `meidän` | **S104** | `we need to → meidän pitää` | 13 | 259 |
| `niiden` | **S134** | `with them → niiden kanssa` | 7 | 106 |
| `teidän` | **S639** | `with you (formal) → teidän kanssanne` | 2 | 27 |

Every one is taught by a lego at the point it first appears. There is no case anywhere in the course of a genitive pronoun being used before it is introduced.

Distribution of the 805 determiner rows across the course:

| seeds | gen-pronoun | suffix | gen+suffix | zero |
|---|---|---|---|---|
| S0–99 | 127 | 23 | 3 | 0 |
| S100–199 | 159 | 0 | 1 | 4 |
| S200–299 | 145 | 0 | 0 | 0 |
| S300–399 | 98 | 19 | 3 | 20 |
| S400–499 | 77 | 0 | 1 | 0 |
| S500–599 | 65 | 9 | 1 | 1 |
| S600–699 | 47 | 0 | 1 | 1 |

The suffix is not spread thin across the course — it is in **two clusters** (S52–54 and S316–332) plus two isolated sites (S513, S529) and the formal block.

### 2b. The possessive suffix — every form in the course, exhaustively

Seven forms carry a real possessor. Each has an introducing lego except one.

| form | introducing lego | phrase rows | seeds it reaches |
|---|---|---|---|
| `kaverillensa` "to his/her friend" | **S52** `to his friend → kaverillensa` | 18 | 52, 54, 185, 357, 527 |
| `laukkuunsa` "into his/her bag" | **S53** `in her bag → laukkuunsa` | 16 | 53, 314, 332, 349, 466, 636 |
| `veljensä` "his/her brother" | **S316** `her brother → veljensä` | 10 | 316 |
| `siskolleen` "to his/her sister" | **S332** `for his sister → siskolleen` | 8 | 332 |
| `kätenne` "your(pl) hands" | **S529** `your hands → kätenne` | 8 | 529 |
| `kanssanne` "with you(pl)" | **S639** `with you (formal) → teidän kanssanne` | 15 | 639, 642 |
| `päätäni` "my head" | **none — no lego exists** | **1** | 513 |

Twelve further suffixed forms exist and are **lexicalised idioms or reflexives, not possession**. I read them and set them aside; they are listed here so the enumeration is complete and so nobody re-counts them as possessors later: `pahoillani` (S139, 23), `huolissani` (S270, 14), `huolissaan` (S343, 20), `mielellään` (S344, 22), `mielelläni` (S599, 12), `innoissaan` (S122, 13), `tosissaan` (S482, 10), `itsensä` (S65, 22), `itseltäsi` (S99, 11), `toisillemme` (S117, 10), `toisiaan` (S426, 10), `keskenään` (S410, 8). All are taught by a lego at first appearance. **190 rows total.** None is a defect.

**The allomorph split.** The course uses both spoken-Finnish allomorphs of the same 3sg suffix: the `-nsa` form (`kaverillensa`, `laukkuunsa`, `veljensä`) and the `-Vn` form (`siskolleen`). Both are correct Finnish; `-Vn` is the more colloquial of the two on case-marked stems, which makes `kaverillensa` the more literary form of the pair. *This is my Finnish, not corpus evidence — Kai should check it.* It matters only as a symptom: two allomorphs in a course this size means nobody chose either one.

### 2c. Taught, or merely appearing?

Every mechanism in the course is taught by a lego at the point it first appears, **with one exception**: `päätäni`. It exists in exactly one row, `S0513L02C02`, a **component** row with `lego_id = NULL`, and it is inside the `components` array of lego `S513L02`:

```
lego  S513L02   "I move my head"  →  mä liikutan mun päätä
   component 1  "I move"          →  mä liikutan
   component 2  "my head"         →  päätäni        ← not in the lego target
```

`päätäni` is not a substring of `mä liikutan mun päätä`. I ran the containment check over **all 1,732 component rows in the course**: **7 fail**, and six of those are comma/quote artefacts (`it when → "siitä`, `no I haven't → en mä en oo`). `S0513L02C02` is the **only component row in fin_for_eng whose target is a genuinely different word form from the lego it is meant to tile** — and it is a possessor defect. Per the estate note that component rows are displayed as tiles by `generateLearningScript`, a learner reading this basket sees the tile **`my head → päätäni`** while all 16 drilled phrases under it say **`mun päätä`**.

### 2d. What is absent

- **`hänen` — 0 occurrences.** `hän` — 0. `hänelle`/`häntä`/`hänet` — 0. The course is wholly colloquial on the pronoun axis. This matters because Kai's own ruling of 2026-08-17 said *"We should probably also say hänen in the formal ones, if it comes up in the seed? If it doesn't, then we shouldn't use sen in the formal phrases."* **That ruling has not been applied and cannot be, as written, without introducing `hänen`** — and one formal-block row still uses colloquial `sen` for a person: `S0654L01U06` *"i'm not sure what his name is"* → `en ole varma, mikä sen nimi on`. It was not in the 59 edits applied on 2026-08-17. Flagged in §3.
- **`minun` / `sinun` — 0.** No standard-language genitive pronouns anywhere. Consistent.

---

## 3. Every ill-formed, ambiguous or mistiled row

### 3a. Binding violations — 3 rows (the triage found 2)

The 3rd-person possessive suffix `-nsa`/`-Vn` must corefer with the clause subject. In these three the only subject is 1st person `mä`, so the suffix has no licit antecedent anywhere in the sentence.

| id | seed | English | Finnish | created | pipeline |
|---|---|---|---|---|---|
| `S0054L02U01` | 54 | I want to give something to **his** friend | `mä haluun antaa jotain kaverillensa` | 2026-07-15 | — |
| `S0054L02U06` | 54 | I want to give something to **her** friend | `mä haluun antaa jotain kaverillensa` | 2026-08-17 | his-her-expansion |
| **`S0332L04U02`** | **332** | **I want to build a new life for his sister** | **`mä haluun rakentaa uuden elämän siskolleen`** | **2026-07-16** | **—** |

**`S0332L04U02` is new — the 2026-08-18 triage did not find it.** Its own detector searched for a 3rd-person antecedent by regex and `siskolleen` was matched as its own antecedent by the `sisko` stem; the same bug hid it from my first pass too. It is the same defect as the two seed-54 rows, 278 seeds later, and it is 2026-07-16 vintage — older than either.

I checked all 60 rows in the course that carry a 3sg possessive suffix on a real noun. **41 have a licit `se`/`sen` antecedent. 16 are subjectless infinitive fragments** (`to say something to his friend → sanoa jotain kaverillensa`) — the suffix is unbound but nothing contradicts it, so these are neutral, not defects. **3 violate.**

### 3b. Coreference mismatches — 3 rows

Different defect, same cause. Here the suffix *is* licit — but it forces coreference with the clause subject, and the English deliberately names a **different** person. The learner is asked to produce a Finnish sentence that does not mean what the prompt says.

| id | seed | English | Finnish | what the Finnish actually means |
|---|---|---|---|---|
| `S0054L02U02` | 54 | **she** wanted to give something to **his** friend | `se halusi antaa jotain kaverillensa` | …to **her own** friend |
| `S0185L01U08` | 185 | I reckon that **she** gives it to **his** friend | `mä luulen, että se antaa sen kaverillensa` | …to **her own** friend |
| `S0332L04U04` | 332 | **she** needs to build a new life for **his** sister | `sen pitää rakentaa uuden elämän siskolleen` | …for **her own** sister |

All three are pre-campaign (2026-07-15, 2026-07-21, 2026-07-16). None was produced by the his/her expansion. This class is invisible to a gender-balance check, because the Finnish is genderless and well-formed — it only shows up when you read the English against the binding rule.

**Not a defect, and the course gets this right:** `S0053L03U01` *"she wanted to put **his** letter in **her** bag"* → `se halusi laittaa **sen** kirjeen **laukkuunsa**` uses `sen` for the non-subject possessor and the suffix for the subject's own, distinguishing two possessors in one clause. That is precise, idiomatic Finnish and it is the one place in the course where the suffix does work the genitive pronoun could not do. Its twin `S0053L03U06` *"he wanted to put her letter in his bag"* maps to the identical Finnish string, which is correct given `sen` is genderless.

### 3c. The mistiled component — 1 row

| id | seed | English | Finnish | what is wrong |
|---|---|---|---|---|
| `S0513L02C02` | 513 | my head | `päätäni` | Does not tile its lego (`mä liikutan **mun päätä**`); the only such component row in 14,123; contradicts all 16 phrases in its own basket; `päätäni` occurs nowhere else in the course |

### 3d. Mis-glossed component — 1 row

| id | seed | English | Finnish | what is wrong |
|---|---|---|---|---|
| `S0374L01C02` | 374 | in my view | `mielestä` | Lego `S374L01` is *"I thought → mun mielestä"*, split as `my → mun` + `in my view → mielestä`. The split tiles, so the containment check passes, but the tile teaches a bare `mielestä` that never occurs alone in the course, and glosses the possessor onto the wrong half. Cosmetic; listed for completeness. |

### 3e. Register — 1 row, already open with Kai

| id | seed | English | Finnish | what is wrong |
|---|---|---|---|---|
| `S0654L01U06` | 654 | i'm not sure what his name is | `en ole varma, mikä sen nimi on` | Colloquial `sen` for a person inside the `(formal)` block, against Kai's 2026-08-17 ruling. Not among the 59 edits applied that day. The register sweep flagged the same question at `S0654L01#12` (`nimenne` vs `nimi`) and explicitly left it for a Finnish ruling. **Still open.** |

### 3f. ZUT forks among possessor rows — 2, neither a mechanism conflict

I checked all 805 determiner rows for one-known → many-targets. Two forks:

- **"her name"** → `sen nimeä` (S21) and `sen nimi` (S465). Same mechanism, different case, driven by the frame. The lego knowns differ (`her name` vs `what her name is`) so there is no card-level fork. Noted, not a possessor defect.
- **"on my own"** → `itse` (S173) and `yksin` (S351). A genuine translation-choice fork, not possession.

I found **no case anywhere in the course where the same known maps to both a suffixed and a genitive-pronoun target.** The two systems never collide head-on at the string level. They collide at the *card* level, which is §5.

### 3g. What I checked and found clean

- **Person agreement**: no row maps `my`→`sun`, `your`→`mun`, etc.
- **Ambiguous `sen`**: only 1 row in 805 has `sen` twice (`S0346L04U01`, *"I wanted her to know that I liked her book"* → `mä halusin sen tietävän, että mä tykkäsin sen kirjasta`). Both refer to the same person; readable. Not flagged.
- **Genderlessness**: `sen` covers his/her/its by design, exactly as `se` covers he/she/it from seeds 16–17. Not a defect and not counted as ambiguity.
- **Untaught mechanism**: none. Every possessive form except `päätäni` has an introducing lego at its first appearance.

---

## 4. Why the earlier agent used the suffixed form at seed 54 — and whether it holds

There are **three** layers to the reason, and they are not the same reason.

### Layer 1 — the seed sentence itself, 2026-01-18

Seed 52's released Finnish text *is*:

> `Se halusi kirjoittaa kirjeen kaverillensa viime viikolla` — status `released`, v19, created 2026-01-18

So do S53 (`Se halusi laittaa sen kirjeen laukkuunsa`), S316 (`…tuoda veljensä maanantaina`), S332 (`Se voi rakentaa uuden elämän siskolleen`) and S529 (`Voitteko te kaikki nostaa kätenne?`). The decomposition of 2026-07-15/16 then produced the lego `to his friend → kaverillensa`, because **a lego must appear verbatim in its seed**. That is not drift — that is the method working exactly as specified. The suffix entered the course from the original Finnish author, nine months before any agent touched it.

**This reason holds completely, and it is the strongest fact in this document.**

### Layer 2 — the written rule in the backfill playbook

`docs/course-optimization/lego-spread-backfill-playbook.md:76`, in the `fin_for_eng` per-language addendum:

> — Reflexive possessives: bare -nsa ("laukkuunsa"), not "oma…", unless English says "own".

So there **was** an explicit, written, deliberate instruction, and it names `laukkuunsa` by example. This is the rule the seed-54 and seed-332 phrases were written under: the lego-spread backfill campaign of 2026-07 (~500 phrases over three agent runs, per the playbook's own header).

**This reason does not hold for the three violating rows, and the failure is instructive.** The rule answers a different question — *`-nsa` versus `oma`* — and says nothing about *when `-nsa` is licensed*. It presents the suffix as a lexical choice. But `-nsa` is not lexical: it is a bound anaphor with a syntactic requirement. `kaverillensa` was safe in seed 52 because that seed's subject is `se`. The backfill treated it as an atom glossed "to his friend", reused it under `mä haluun…`, and the English gloss gave no hint that anything had broken. **The playbook rule is not wrong; it is incomplete, and the missing clause is the one that would have caught all three violations.**

### Layer 3 — Kai's own review record

This is the part that changes the recommendation, and it is why the "look for the earlier agent's reason" instruction was the right one.

**Kai has personally passed `ok` on the suffixed forms, repeatedly, including today.**

| id | Finnish | Kai's decision | when |
|---|---|---|---|
| `S0052L04B01`, `B02`, `B03`, `U01`–`U05` | `…kaverillensa` | **ok** ×8 | 2026-07-20 |
| `S0053L03B01`–`B03`, `U01`–`U05` | `…laukkuunsa` | **ok** ×8 | 2026-07-21 |
| **`S0054L02U01`** | **`mä haluun antaa jotain kaverillensa`** | **ok** | **2026-07-20 23:59:55** |
| `S0054L02U02` | `se halusi antaa jotain kaverillensa` | **ok** | 2026-07-20 |
| `S0052L04B04`, `U06`, `U07` | `…kaverillensa` | **ok** ×3 | **2026-08-18 09:13 — today** |
| `S0053L03B04`, `U06`, `U07` | `…laukkuunsa` | **ok** ×3 | **2026-08-18 09:14 — today** |
| `S0054L02U06` | `mä haluun antaa jotain kaverillensa` | **flagged** — *"reads a bit awkward."* | 2026-08-18 09:14 |

Two things follow.

1. **Kai does not object to the suffix system.** He read it 22 times and passed it, including three rows this morning, minutes before flagging U06. Any recommendation that rips `kaverillensa` and `laukkuunsa` out of seeds 52–53 is overruling his own repeated, recent, explicit approval.
2. **He passed `S0054L02U01` — the identical binding violation — on 2026-07-20, and flagged its twin U06 four weeks later.** His ear caught it the second time. That is not inconsistency; it is what a real defect looks like when it is 2 rows in 14,123 and the English gloss hides it. It also confirms the triage's judgement that pulling U06 alone would leave the identical defect live.

**His review stops at `S0105L02B05`.** Seeds **316, 332, 513, 529, 637** — where `veljensä`, `siskolleen`, `päätäni`, `kätenne` and the `sen laukku` collision live — are **entirely unreviewed by him**. Everything in §5 below is about territory he has not seen.

---

## 5. The ordering — the thing that is actually worth Kai's attention

Kai asked whether the ordering makes sense to a learner meeting these in sequence. It does not, and the numbers are stark.

**"friend"**, in the order a learner meets it:

| seed | card | mechanism |
|---|---|---|
| S51 | `with my friends → mun kavereiden kanssa` | genitive pronoun |
| **S52** | **`to his friend → kaverillensa`** | **suffix — no visible possessor word at all** |
| S83 / S84 | `about your friend → sun kaverista` / `about my friend → mun kaverista` | genitive pronoun |
| S130 | `friend → kaveri` | the bare noun, **78 seeds after the suffixed form** |
| **S306** | **`to your friend → sun kaverille`** | **the exact parallel of S52, 254 seeds later** |

**"bag"**:

| seed | card | mechanism |
|---|---|---|
| **S53** | **`in her bag → laukkuunsa`** | **suffix** |
| S635 | `bag → laukku` | the bare noun, **582 seeds later** |
| **S637** | **`her bag → sen laukku`** | **genitive pronoun — the same relation, 584 seeds later** |

**"brother / sister"** — and here the order is *reversed*, which is worse:

| seed | card | mechanism |
|---|---|---|
| S233 | `your sister → sun siskon` | genitive pronoun |
| S234 | `your brother → sun veljen` | genitive pronoun |
| S284 | `my sister's → mun siskon` | genitive pronoun |
| **S316** | **`her brother → veljensä`** | **suffix — after 3 seeds of the other system** |
| **S332** | **`for his sister → siskolleen`** | **suffix, and a different allomorph** |

A learner arrives at S316 having built a working rule — *possessor = `mun`/`sun`/`sen` + noun* — used continuously since seed 1 and reinforced 145 times in seeds 200–299 alone. S316 then hands them `veljensä` for "her brother" with no bridge, no contrast card, and no return to `sen veli` ever. `sen laukku` at S637 does eventually appear — 584 seeds after `laukkuunsa` — but as a *new* lego, `is_new = true`, as though the learner had never met a bag.

**Nothing in the course ever connects the two shapes.** There is no card, in 1,425 legos, that shows `sen kaveri` and `kaverillensa` as the same thing.

### What it would actually cost to unify — the triage's estimate is too pessimistic

The 2026-08-18 triage concluded the clean fix at seed 54 "introduces an untaught form and would fail the vocabulary gate", because bare allative `kaverille` is not introduced until seed 306. **The string is not introduced until 306; the morphology and the stem both are, earlier.** Checked against the lego table:

| replacement | what it needs | taught by |
|---|---|---|
| S52 `sen kaverille` | `sen` (S20 ✓) · `-lle` allative (**S32**, `to show me → näyttää mulle` ✓) · `kaveri` stem (S51 `mun kavereiden` ✓, singular at S130) | **one new piece** — the singular allative of a stem met one seed earlier |
| S316 `tuoda sen veljen` | `sen` (S20 ✓) · `veljen` (**S234**, `sun veljen`) — but S234 is *after* S316 | one resequencing, or accept `veljen` debuts at 316 |
| S332 `sen siskolle` | `sen` (S20 ✓) · `sisko` (S233) · `-lle` (S32 ✓) — S233 is after S332 | same |
| S53 `sen laukkuun` | `sen` (S20 ✓) · `laukku` + illative — both new either way, since `laukkuunsa` is itself the debut | **cheaper than the current card**, not dearer |

`kaverillensa` requires the learner to absorb **two** new things at seed 52 (the singular allative *and* the possessive suffix, plus its binding rule). `sen kaverille` requires **one**. The simple form is strictly less new material, not more. **That is a correction to the triage, and it materially changes what "lean simple" costs.**

### The one place the suffix genuinely earns its keep

Seed 53's own sentence has **two different possessors**:

> *she wanted to put **his** letter in **her** bag* → `se halusi laittaa **sen** kirjeen **laukkuunsa**`

Unify this and you get `…laittaa sen kirjeen sen laukkuun` — two `sen`, and the reading "her own bag" is lost. **This is the one sentence in the course where the genitive-pronoun system cannot say what the suffix says.** Any recommendation has to answer for it, and mine does below.

---

## 6. The recommendation

> **Keep the genitive pronoun as the course's single possession system. Do not unify the five seed sentences that already carry a suffix — Kai has approved two of them 22 times, including this morning, and seed 53 needs the suffix to disambiguate two possessors. Instead, seal the boundary: fix the 7 rows where the suffix escaped those five sentences or contradicts them, and add one contrast card so the learner is told the two shapes are the same thing.**

This is "simple" in the sense Kai means — **one system, plus a closed list of five lexical sites** — and it is the version of simple his own review record already endorses.

### Cost

**Rows touched: 7 phrase rows. Seeds touched: 0. Legos touched: 0. Vocabulary-sequencing change: none required. Audio: £0 — fin_for_eng has no Finnish audio at all, so nothing regenerates.**

| # | id | seed | fix | why |
|---|---|---|---|---|
| 1 | `S0054L02U01` | 54 | pull, or reframe the subject to `se` | binding violation |
| 2 | `S0054L02U06` | 54 | pull | binding violation; Kai flagged it |
| 3 | `S0332L04U02` | 332 | pull, or reframe to `se` | binding violation — **not previously found** |
| 4 | `S0054L02U02` | 54 | change English to "her friend" | coreference mismatch |
| 5 | `S0185L01U08` | 185 | change English to "her friend" | coreference mismatch |
| 6 | `S0332L04U04` | 332 | change English to "her sister" | coreference mismatch |
| 7 | `S0513L02C02` | 513 | `päätäni` → `mun päätä` | only mistiled component in 14,123; contradicts its own basket |

Rows 4–6 are **English-side edits**, which cost nothing on the Finnish side and preserve the basket. Rows 1–3 are pulls. Basket floor is USE ≥ 5 (`services/course-builder/lib/validation.cjs:25,40`): `S0054L02` goes 6→4 if both 1 and 2 are pulled, which **breaks the floor** — so at least one of the two seed-54 rows should be *reframed* (`se halusi antaa jotain kaverillensa` already exists as U02, so use a different frame, e.g. `se haluu antaa jotain kaverillensa`) rather than pulled. `S0332L04` holds 5 USE, so pulling U02 takes it to 4 and it too needs a reframe rather than a pull. **Reframing all three is the cleaner route and keeps every basket at floor.**

### The one addition

Add a contrast card at **seed 306**, where `sun kaverille` is already introduced, making the two shapes explicit — e.g. a USE row pairing `to your friend → sun kaverille` with `to his friend → sen kaverille`, so the learner who met `kaverillensa` at 52 is finally shown the regular form. **1 new row, no new vocabulary** (`sen` S20, `kaverille` S306). This is the only thing in this document that adds content, and it is the thing that fixes the *pedagogical* defect rather than the grammatical one.

### What I am explicitly recommending against, and why

**Unifying the five seed sentences (60 rows, 4 legos, 4 seeds, plus a `laukku` resequencing).** It is affordable — §5 shows it is cheaper than the triage thought — but it overrules Kai's own 22 approvals, it loses the two-possessor distinction at seed 53, and it edits `released` seed text authored by a Finnish writer to satisfy a consistency argument. If Kai wants it anyway after reading §5, it is a coherent job and I would scope it; but it is a decision, not a fix, and it is his.

### Left for Kai, one line each

1. **Reframe or pull the 3 binding violations?** *Recommendation: reframe* — pulling breaks the USE floor in both baskets.
2. **`S0332L04U02` is a third binding violation the triage missed, 278 seeds from the other two, and you have not proofread seed 332. Same treatment?** *Recommendation: yes.*
3. **Fix `S0513L02C02` `päätäni` → `mun päätä`?** *Recommendation: yes* — it is the only mistiled component in the course and its own basket contradicts it 16 times.
4. **Add the seed-306 contrast card?** *Recommendation: yes* — it is the only thing here that repairs the ordering rather than the grammar.
5. **`S0654L01U06` still says `sen` for a person inside the formal block, against your 2026-08-17 ruling. `hänen` appears 0 times course-wide, so the ruling as written cannot be applied without introducing it.** *Needs your word; the register sweep flagged the same question and left it open.*

---

## 7. Gaps, honestly

- **Nothing here has been read by a native Finnish speaker.** Every grammatical judgement is mine. Judgements resting on my Finnish rather than on corpus evidence are marked in place: the `-nsa`/`-Vn` allomorph register claim (§2b), and the reading that `laittaa sen kirjeen sen laukkuun` loses the reflexive reading (§5). Kai reads Finnish and should check both.
- **Seeds 108–668 have no proofread decisions at all.** Kai's record covers seeds 1–107. Four of the five suffix sites (316, 332, 513, 529) and the `sen laukku` collision (637) are in unreviewed territory. "No flag" there means "not read", not "passed".
- **I did not re-run the seed-24/56 "her + nimen" job** — the triage shows it is already done, per instruction.
- **`course_practice_phrases.register` is NULL on all 14,123 rows**, so register is inferable only from the `(formal)` tag in the English and from `te`-forms. A formal card carrying neither would be invisible to this audit, as it was to the 2026-08-17 sweep.
- **Two independent second readers** were dispatched (**#107** on all 292 suffix-bearing rows, **#108** on all 812 genitive-pronoun determiner rows) to check this analysis row-by-row. Their verdicts are appended in §8 if they landed before publication; if §8 says they did not, the row-by-row verification in this document is single-pass and mine alone.

---

## 8. Independent reader verdicts

**Status at publication: both readers ran to completion; neither full report had been delivered back into the parent conversation at the time this document was written. This is an explicit gap, not an omission.**

| job | scope | status | what is available |
|---|---|---|---|
| **#107** `fin-poss-suffix-read` (opus) | all **292** rows carrying any possessive suffix — phrases, legos and seeds | **done** (5m36s) | opening line only: *"I read every row. Here are my rulings."* — remainder truncated by the job API |
| **#108** `fin-poss-genitive-read` (opus) | all **812** genitive-pronoun determiner rows | **done** | opening line only: *"# Finnish possession audit — packetB.tsv, second read"* — remainder truncated |

Both were briefed to read every row in its own context, to flag binding violations, coreference mismatches, false alignments, person mismatches, case errors and register doubts, and to state plainly where they stopped. Neither was given my conclusions, so their findings are independent of §1–§6.

**What this means for the confidence of this document:** §3's defect list rests on my own row-by-row reading plus deterministic checks over the full 14,123-row dump (antecedent search across all 60 3sg-suffix rows; containment check across all 1,732 component rows; ZUT fork check across all 805 determiner rows). It is **single-pass and mine** until #107 and #108's reports are folded in. Anything they contradict should override this document, and their reports live in their own chats — they are persistent and readable, not ephemeral.

The reading packets they worked from are preserved for anyone who wants to re-run the check:
`.a74-scratch/fin-poss/packetA.tsv` (292 rows) and `.a74-scratch/fin-poss/packetB.tsv` (812 rows), alongside the full course dump (`phrases.json`, `legos.json`, `seeds.json`).
