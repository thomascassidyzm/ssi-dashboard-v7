# gle_cn_for_eng — the `labhair` present-tense sweep

**Date:** 2026-08-20
**Status:** READ-ONLY analysis. No database writes, no audio generated, nothing applied.
**Course:** `gle_cn_for_eng` (Connemara Irish for English speakers)
**Trigger:** Kai's ruling that seed 9 (`Labhraím beagán Gaeilge anois`) is wrong and should read `Tá beagán Gaeilge agam anois`.

---

## 0. Headline

The ruling holds, and it is **narrower than feared but deeper than a text swap**.

- The finite **present tense** of `labhair` is **unattested in Ó Curnáin's 2,700 pages of Iorras Aithneach Irish** — zero tokens, every person, all four volumes. Volume IV's own paradigm entry for the verb lists eleven forms and **no present tense of any person**. Kai's negative evidence is confirmed exactly as stated.
- The **verbal noun `labhairt` is fine** and is by far the bulk of what this course uses: **104 of the 121 hits** are the verbal noun and need no change at all.
- The class in question is **16 rows: 4 seeds, 1 lego, 11 practice phrases.** That is the whole measured reversal cost.
- **`course_audio` for `gle_cn_for_eng` is zero rows** (verified live). Nothing here touches audio.
- **But the 11 phrases at seed 9 do not all convert the same way.** Roughly half are *proficiency* statements that become `tá … agam`; the rest are *speech acts* that need a habitual `bíonn mé ag caint` instead. There is no single find-and-replace. This is the most important finding in the document and it is §6.

I also **challenge two of Kai's four provisional readings** — seed 13 and seed 14 — on corpus evidence. Details in §5.

---

## 1. Method, and the detector reproduced

**Database.** Supabase REST via `scripts/gle-cn-open-calls/q.cjs`, `Prefer: count=exact`, explicit `order=` on every request, paged at 1,000, totals reconciled against the `content-range` header on each table:

| Table | content-range | rows fetched | reconciled |
|---|---|---|---|
| `course_seeds` | `0-667/668` | 668 | ✅ |
| `course_legos` | `0-34/35` | 35 | ✅ |
| `course_practice_phrases` | `0-265/266` | 266 | ✅ |
| `course_audio` | `*/0` | 0 | ✅ |

Detector: case-insensitive `labhr | labhair | labhart` over NFC-normalised `target_text`. No sampling — every row of all three tables was fetched and tested.

**Detector calibration against Kai's known positive.** Seed 9 returns **1 lego** and **16 phrase hits**, of which **exactly 11 contain `labhraím`** — the other 5 contain the verbal noun `labhairt` (`beagán Gaeilge a labhairt` and friends), which is a different class and correctly not part of Kai's 11. **Kai's "1 lego and 11 practice phrases" is reproduced exactly.** The detector is sound and deliberately over-catches at the stem so that classification, not matching, does the discriminating.

**Corpus.** Ó Curnáin, *The Irish of Iorras Aithneach* (DIAS 2007), vols I–IV, from `/tmp/vol{1..4}.txt`. Read **with Python** (`errors='replace'`, NFC-normalised, `re` over the decoded string) — never grep, per the control-byte trap.

**Corpus calibration (mandatory, and it matters):**

| Probe | v1 | v2 | v3 | v4 | **total** | Kai's expectation |
|---|---|---|---|---|---|---|
| `Gaeilge` (substring) | 30 | 9 | 12 | 71 | **122** | ~121 ✅ |
| `Gaeilge` (whole-word) | 27 | 9 | 9 | 60 | 105 | — |
| `duine` (substring) | 85 | 72 | 221 | 276 | **654** | ~521 |
| `duine` (whole-word) | 66 | 66 | 146 | 219 | 497 | — |

The reader works — `Gaeilge` lands on 122 against an expected ~121. `duine` brackets Kai's 521 between my whole-word 497 and substring 654; the difference is where the boundary is drawn around compounds (`duineata`, `dhuine`), not a broken reader. **I report both figures throughout rather than picking the flattering one.** Every count below is whole-word unless marked otherwise.

---

## 2. The sweep — every hit, classified

**121 rows** in `gle_cn_for_eng` contain the stem: **11 seeds, 4 legos, 106 practice phrases.**

| Class | What | Seeds | Legos | Phrases | **Rows** | Verdict |
|---|---|---|---|---|---|---|
| **(a)** | Verbal noun `labhairt` | 6 | 3 | 95 | **104** | ✅ Fine — leave alone |
| **(b)** | **Finite present** | **4** | **1** | **11** | **16** | ⚠️ **In question** |
| **(c)** | Conditional `labhrófá` | 1 | 0 | 0 | **1** | ✅ Fine (see §5.5) |
| **(d)** | Anything else | 0 | 0 | 0 | **0** | — |
| | | | | | **121** | |

**Class (d) is empty** — there is nothing in this course that the three classes above don't account for. Class (a) touches seeds 1, 2, 3, 5, 7, 8, 9, 10, 11, 12, 29, 31 and is out of scope by Kai's own framing; Ó Dónaill attests `Gaeilge a labhairt, to speak Irish` and it stands.

### Class (b) in full — the 16 rows

**The four seeds:**

| Seed | English | Irish (current) |
|---|---|---|
| **9** | I speak a little Irish now | `Labhraím beagán Gaeilge anois` |
| **13** | you speak Irish very well | `Labhraíonn tú Gaeilge go han-mhaith` |
| **14** | do you speak Irish all day? | `An labhraíonn tú Gaeilge an lá ar fad?` |
| **22** | because I want to meet people who speak Irish | `Mar tá mé ag iarraidh bualadh le daoine a labhraíonn Gaeilge` |

**The one lego** (seed 9, `S0009`): `I speak` || `labhraím`

**The eleven practice phrases** (all seed 9):

| # | English | Irish (current) |
|---|---|---|
| 1 | I speak Irish | `labhraím Gaeilge` |
| 2 | I speak now | `labhraím anois` |
| 3 | I speak with you | `labhraím leat` |
| 4 | I speak Irish now | `labhraím Gaeilge anois` |
| 5 | I speak Irish with you | `labhraím Gaeilge leat` |
| 6 | I speak Irish with you now | `labhraím Gaeilge leat anois` |
| 7 | I speak Irish as often as possible | `labhraím Gaeilge chomh minic agus is féidir` |
| 8 | I speak with someone else | `labhraím le duine éigin eile` |
| 9 | I speak a little Irish | `labhraím beagán Gaeilge` |
| 10 | I speak a little Irish now | `labhraím beagán Gaeilge anois` |
| 11 | I speak a little Irish with you now | `labhraím beagán Gaeilge leat anois` |

**Seeds 13, 14 and 22 have zero legos and zero practice phrases** — verified live (`*/0` on both tables for `seed_number=in.(13,14,15,22)`). Only 36 of 668 seeds are translated and only 35 legos exist course-wide, so the downstream layer for those three has not been built yet. **Fixing them now is free; fixing them after decomposition would not be.**

---

## 3. The corpus verdict on the present tense

### 3.1 Zero, every person, all four volumes

| Form | v1 | v2 | v3 | v4 | **Total** |
|---|---|---|---|---|---|
| `labhraím` / `labhraim` | 0 | 0 | 0 | 0 | **0** |
| `labhraíonn` / `labhraionn` | 0 | 0 | 0 | 0 | **0** |
| `labhrann` | 0 | 0 | 0 | 0 | **0** |
| `labhraímid` / `labhraimid` | 0 | 0 | 0 | 0 | **0** |

This is a real zero, not a broken-reader zero: the same reader returns 122 for `Gaeilge` in the same pass.

### 3.2 The attested paradigm, and my false positives

The stem `labhr` returns **75 substring hits**. That raw number is not a finding. Enumerating every distinct token containing `labhr` and excluding the non-verb homographs:

**Excluded as false positives (37 tokens, 49% of the raw count):**

| Token | n | Why excluded |
|---|---|---|
| `slabhra`, `shlabhra`, `slabhraí`, `slabhrthaí` | 15 | *chain* — unrelated noun |
| `labhrás` | 7 | personal name (Labhrás a Ghréasaí) |
| `labhrú`, `labhradha` | 16 | **surname Lavery** (`Labhrú, Lábhrú, Láfrú, Labhradha*, surname, Lavery`, vol IV) — the 9 `labhradha` hits are all phonological discussion of that surname |
| `urlabhra`, `urlabhraidheacht` | 5 | *faculty of speech* — noun, not the verb |
| `labhraidh` | 3 | **Labhraidh Loingseach**, legendary name |
| `labhras` | 1 | inside a **book title** in the bibliography (*is fann guth an éin a labhras leis féin*, Rann na Feirste — Donegal, not Iorras Aithneach) |

**Genuine verb tokens (clean count: ~26)** — `labhraíodh` 4, `labhrós` 4, `labhródh` 3, `labhráis` 3, `labhradh` 3, `labhradar` 2, `labhróinnse` 2, `labhróidh` 2, `labhrainn` 2, `labhróifí` 1, `labhraigí` 1. **Every one is past, past-habitual, impersonal, future, relative, conditional, past-subjunctive or imperative. Not one is a present.**

### 3.3 The volume IV index entry — verbatim

Kai's claim about the vol IV paradigm entry is **confirmed word for word**. The entry reads:

> `labhair, v, speak, 5.170, impv 2sg 6.23, pst 3sg 1.159, -368, 2.20, 3pl labhradar, imprs labhraíodh 5.81-82, labhradh 5.415, psthab labhraíodh 10.94, imprs ~tí 5.53, fut labhróidh, rel labhrós 8.86, cond 1sg ~eoinn 8.57, emph labhróinnse 6.53, 3sg labhródh 1.263, labhaireot sí 14 s.v. spiorad, imprs labhróifí 5.55, pstsbj 1sg labhrainn* 10.87, vadj labhartha 5.174, ~te 5.174, VN ~t 1.407, 5.24, -207, gsg labhartha 5.227.`

Imperative, past, 3pl, impersonal, past-habitual, future, relative, conditional 1sg/3sg/emphatic/impersonal, past-subjunctive, verbal adjective, verbal noun, genitive of the verbal noun. **No present tense of any person.** It also confirms the other half of the ruling: `VN ~t` — the verbal noun `labhairt` is squarely attested.

**An honest caveat.** `labhraíonn` is *not* ungrammatical Irish — Ó Dónaill's headword itself gives `labhair, v.t. & i. (pres. -bhraíonn, vn. ~t, pp. -artha)` and the example `Ní labhraíonn siad le chéile, they are not on speaking terms`. The case against these four seeds is therefore **two independent arguments**, and it is worth keeping them apart:
1. **Semantic** — a habitual present means *habitually speaks*, not *knows/can speak*. This kills seeds 9, 13 and 22 in **any** dialect.
2. **Dialectal** — the finite present of this particular verb is absent from Connemara. This is what makes the fix mandatory for a course branded `gle_cn`.

Seed 14 is the interesting one, because argument (1) does **not** apply to it — see §5.3.

---

## 4. How Connemara actually says it

| Probe | v1 | v2 | v3 | v4 | **Total** |
|---|---|---|---|---|---|
| `caint` (whole-word) | 15 | 37 | 69 | 46 | **167** |
| `caint*` (substring) | 35 | 51 | 89 | 114 | 289 |
| **`ag caint`** | 5 | 15 | 41 | 18 | **79** |
| **`ag labhairt`** | 1 | 0 | 3 | 1 | **5** |
| `labhairt` | 1 | 3 | 8 | 4 | 16 |
| **`as Gaeilge`** | 0 | 0 | 0 | 0 | **0** |
| **`i nGaeilge`** | 1 | 0 | 1 | 6 | **8** |
| `Gaeilge a labhairt` | 0 | 0 | 0 | 0 | **0** |
| `an lá ar fad` | 0 | 0 | 0 | 0 | **0** |
| `i gcónaí` / `i gcúnaí` | 12/0 | 15/1 | 20/17 | 29/12 | **76 / 30** |
| `ar feadh an lae` | 1 | 0 | 1 | 0 | **2** |
| `achuile lá` / `chuile lá` | 0/0 | 4/1 | 4/2 | 2/6 | **10 / 9** |
| `bíonn` | 8 | 23 | 32 | 77 | **140** |
| `bíonn mé` | 0 | 2 | 1 | 6 | **9** |
| `bím` | 0 | 2 | 2 | 3 | **7** |
| `a bhfuil` | 15 | 23 | 94 | 60 | **192** |
| `Gaeilge mhaith` | 1 | 0 | 0 | 1 | **2** |
| `an-Ghaeilge` | 0 | 0 | 0 | 0 | **0** |
| `beagán` | 5 | 4 | 11 | 3 | **23** |
| `beagán Gaeilge` | 0 | 0 | 0 | 0 | **0** |

**`ag caint` beats `ag labhairt` 79 to 5.** Kai's memory of "79 against 1" has the ratio and the direction right; my clean count for `ag labhairt` is **5**, not 1. Reporting the higher number because it is mine and it is what the corpus says — it does not weaken the case, it strengthens the honesty of it. A 16:1 preference is decisive either way.

### 4.1 The possession idiom — citations

Adjacent `Gaeilge` + `ag`-pronoun is sparse (2 hits) because this is a *grammar*, not a conversation corpus; a ±40-character proximity search returns **7**. The ones that matter:

> **`tá Gaeilge aici chomh maith liomsa`** — 21Pt, vol I
> *"she has Irish as well as I do."*

This is the single best citation in the whole sweep. It is the possession idiom **and** a proficiency comparison **and** it is Iorras Aithneach speech. It validates the frame behind seed 9 *and* seed 13 in one line.

> **`Níl dor Gaeilge acub`** — 43M, vol IV (s.v. *dor*, "word, slightest utterance")
> *"They haven't a word of Irish."*

Quantifier + `Gaeilge` + `ag`-pronoun, negative. Note **`acub`**, confirming Kai's dialect note. Compare Ó Dónaill's `Níl focal Gaeilge aige, he hasn't a word of Irish` — the same frame, and the frame `[quantifier] + Gaeilge + ag X` is what seed 9 needs.

> **`is mór an náire … an bhail atá acub ar an nGaeilge`** — S, vol I
> *(of speakers abandoning Irish)*

> **`bhíodar i ndan Gaeilge a léabh go leor acub`** — 11C, vol III
> *"They were able to read Irish, a lot of them."*

### 4.2 `as Gaeilge` is zero — and Ó Curnáin says why

`as Gaeilge` returns **0 across all four volumes**. `i nGaeilge` returns 8, but **7 of those 8 are bibliography or metalanguage** (`Nua-Iasachtaí i nGaeilge Chois Fhairrge`, `Réimniú an bhriathair i nGaeilge Charna`) — a false positive I would have reported as a finding had I not read the contexts. The **eighth is the one that counts**, because it is Ó Curnáin ruling on the dialect in his own voice (vol III):

> `bíonn naíonra trí Ghaeilge aici … 43M88 (note the official and revivalist context (the naíonra in question was situated in the Galltacht or English-speaking area);` **`i nGaeilge is more idiomatic for our dialect`**`).`

That is a dialectologist explicitly ruling `i nGaeilge` idiomatic for Iorras Aithneach against a revivalist alternative. **Anything in this course that reaches for `as Gaeilge` should be `i nGaeilge`.**

Happily, **the course is already right on this axis**: `i nGaeilge` appears in 37 rows (1 seed + 36 phrases) and `as Gaeilge` in **zero**. Whatever replaces seed 14 must not break that.

### 4.3 Two dialect notes worth banking

**`bíonn mé` is replacing `bím`.** Vol II states it directly:

> `habitual present` **`bíonn mé is rapidly replacing bím`**

So where the fixes below need a habitual, they use **`bíonn mé`**, not `bím`. This is a live-dialect call, not a stylistic one.

**`Gaeilge mhaith` is attested, and so is unlenited `Gaeilge maith`.** Vol I, in Ó Curnáin's own voice:

> **`Both Gaeilge maith and Gaeilge mhaith are common.`**

And in a sample text, vol IV:

> **`An gceapthá go bhfuil Gaeilge mhaith thart anseo mar sin?`**
> *"Would you think there's good Irish around here, then?"*

That is `tá` + `Gaeilge mhaith` in running Iorras Aithneach speech. It bears directly on seed 13 — see §5.2.

---

## 5. The four seeds — recommendations

Ó Dónaill was checked on teanglann.ie. **Kai's cited authority is verified verbatim.** Under `ag`, sense **3(f)**, headed *"(Of knowledge, or possession of a skill or of an intellectual acquirement)"*:

> **`Tá Gaeilge agus Spáinnis acu, they know Irish and Spanish.`**
> `Tá snámh aige, he can swim.`
> `Dá mbeadh caint ag na clocha, if stones could speak.`

That is the dictionary's own idiom for possessing a language, exactly as Kai stated it, under a sense heading that could not be more on point.

> **⚠️ EXPLICIT GAP.** Teanglann's entry pages also surface examples from *other* headwords in a side panel, and the tilde (`~`) in those does not expand to the page's headword. I saw `Tá ~ Gaeilge aige, he knows some Irish` and `Níl ~ Gaeilge aige, he hasn't a word of Irish` rendered under both `ag` and `Gaeilge`, where the tilde cannot mean either word. I tried to pin the first to `roinnt` and **it is not in the `roinnt` entry** — so I could not resolve which headword those examples belong to. I am therefore **not** citing them as attestations of any specific quantifier. The *frame* `[quantifier] + Gaeilge + ag X` is independently attested by Ó Curnáin's `Níl dor Gaeilge acub`, and that is what I rely on below.

### 5.1 Seed 9 — `I speak a little Irish now`

**Recommendation: `Tá beagán Gaeilge agam anois`** — Kai's reading, endorsed.
**Confidence: confident** (frame), **best attempt** (choice of `beagán`).

- The frame is Ó Dónaill `ag` 3(f) verbatim, plus Ó Curnáin's `tá Gaeilge aici chomh maith liomsa` and `Níl dor Gaeilge acub`.
- **Word order** — the `ag`-phrase precedes the time adverbial, matching `tá Gaeilge aici chomh maith liomsa` (possessor, then adverbial). `Tá beagán Gaeilge agam anois` is correctly ordered. *Confident.*
- **`beagán` + genitive** — `beagán` does govern the genitive, and the genitive singular of `Gaeilge` **is `Gaeilge`** (Ó Dónaill: `Gaeilge, f. (gs. ~, pl. -gí)`). So `beagán Gaeilge` is formally correct with no visible change. *Confident.*
- **`beagán Gaeilge` as a collocation is unattested** — 0 in Ó Curnáin, and absent from Ó Dónaill's `beagán` entry (which gives `~ de rud`). `beagán` itself is attested 23 times in Ó Curnáin, including `bhí beagán eile ansin acUB` (894C). So the collocation is regular but unwitnessed. It is the honest weak point of this recommendation and I flag it rather than bury it. If Kai wants an attested-quantifier alternative, `Níl ach beagán Gaeilge agam` is the widely-current modern idiom, but it adds a negative the English doesn't have. **I would ship `Tá beagán Gaeilge agam anois`.**

### 5.2 Seed 13 — `you speak Irish very well` — ⚠️ **I CHALLENGE THIS**

**Kai's provisional reading:** `Tá Gaeilge an-mhaith agat`.
**My recommendation: `Tá Gaeilge mhaith agat`, and change the English to "you speak Irish well".**
**Confidence: confident** that Kai's *frame* is right; **confident** that `Gaeilge mhaith` is the attested form; **genuinely uncertain** about how to carry "very".

Kai is right that this is a proficiency statement and right to move it to `tá … ag`. But the specific adjective phrase does not survive the corpus:

- **`Gaeilge mhaith` is attested twice** and endorsed in Ó Curnáin's own words (`Both Gaeilge maith and Gaeilge mhaith are common`), including in running speech: `An gceapthá go bhfuil Gaeilge mhaith thart anseo mar sin?`
- **`Gaeilge an-mhaith` is unattested** — 0 hits.
- **`an-Ghaeilge` is unattested** — 0 hits. So the obvious intensified alternative is *worse*, not better. Rule it out.
- `an-mhaith` as a bare adjective **is** attested (6 hits: `i do tháilliúr an-mhaith`, `rinne siad AN-MHAITH`, and `bhí fhios ad GO HAN-MHAITH`). So `Gaeilge an-mhaith` is morphologically regular and not *wrong* — it is simply unwitnessed where its unintensified sibling is witnessed and explicitly blessed.

**The real problem is the English, not the Irish.** "Very well" pushes an intensifier into a slot the dialect doesn't evidence. The methodology rail here is ZUT — one known prompt, one target form — and the cleanest way to honour it is to make the known side match the form Connemara actually produces:

- **Preferred:** EN `you speak Irish well` → GA `Tá Gaeilge mhaith agat`. *Confident.*
- **If "very" must stay:** EN `you speak Irish very well` → GA `Tá Gaeilge an-mhaith agat` (Kai's form). *Best attempt* — regular, unattested, and not contradicted.
- **Rejected:** `Tá an-Ghaeilge agat` — 0 attestations, do not use.

Since seed 13 has **no legos and no phrases yet**, changing the English costs one row today.

### 5.3 Seed 14 — `do you speak Irish all day?` — ⚠️ **I CHALLENGE THE DETAILS**

**Kai's provisional reading:** `bíonn` + `ag caint` rather than a present of `labhair`. **Agreed on the structure — corrected on two specifics.**
**My recommendation: `An mbíonn tú ag caint i nGaeilge ar feadh an lae?`**
**Confidence: confident** on `bíonn` and on `i nGaeilge`; **best attempt** on `ar feadh an lae`; **best attempt** overall.

This seed is different from the other three and deserves saying so plainly: **the habitual reading is the *correct* reading of the English.** "Do you speak Irish all day?" genuinely *is* habitual. So the semantic argument (§3.3, argument 1) does **not** condemn this seed — only the dialectal one does. If `gle_cn` were a Standard-Irish course, `An labhraíonn tú …?` would be defensible. It is not, so it goes; but Kai's instinct that this one is "genuinely habitual" is exactly right.

Two corrections to how it should be rebuilt:

1. **`i nGaeilge`, not `as Gaeilge`.** `as Gaeilge` is **0 across 2,700 pages**, and Ó Curnáin explicitly writes that **`i nGaeilge` is more idiomatic for our dialect** (§4.2). The course already uses `i nGaeilge` in 37 rows and `as Gaeilge` in zero — this keeps that record clean. *Confident.*
2. **`an lá ar fad` is unattested — 0 hits.** `ar fad` occurs 35 times but not in this collocation. The attested time expressions are `ar feadh an lae` (2), `achuile lá` (10), `chuile lá` (9) and `i gcónaí`/`i gcúnaí` (106 combined). For "all day" the closest attested match is **`ar feadh an lae`**. If Kai would rather have the highest-frequency option and can live with the English shifting to "all the time", **`i gcónaí`** is by far the best-attested. *Best attempt.*

Also `bíonn` (140) is overwhelmingly attested and `An mbíonn …?` is supported by `mbíonn` (78). Use **`bíonn`**, not `bím` (§4.3).

> **Honest weakness:** direct `bíonn … ag caint` co-occurrence in the corpus is thin — 4 loose habitual-`bí` + `ag caint` hits (`bhíodar ag caint agus ag comhrá`, `bhídís ag caint, agus ag siúl`, `tá siad ag caint`). The two components are each massively attested; the exact string is assembled, not quoted. I am flagging that rather than implying I found the sentence.

### 5.4 Seed 22 — `because I want to meet people who speak Irish`

**Recommendation: `Mar tá mé ag iarraidh bualadh le daoine a bhfuil Gaeilge acu`** — Kai's reading, endorsed.
**Confidence: confident.**

- The **indirect relative** is correct here and Kai is right to choose it. Possession relatives take `a bhfuil … ag`, and Ó Curnáin attests the structure repeatedly: `Ní lia duine a bhfuil sé aige ná a leagan féin aige air` (SÓC1.84), `an bhean a bhfuil tusa ag fanacht aige`, `gurb iad a bhfuil an saol mar tá sé acub` (S). `a bhfuil` occurs 192 times. A direct relative would be wrong — there is no way to strand the `ag`-pronoun otherwise.
- **`acu` vs `acub`:** Iorras Aithneach writes **`acub`** (attested: `Níl dor Gaeilge acub` 43M, `go leor acub` 11C, `an bhail atá acub ar an nGaeilge` S). But **this course has committed to standard orthography** — `acu`/`acub`/`aige`/`aici` appear **zero times** in all 300 translated rows, and the one existing `a bhfuil` seed (seed 21, `Cén fáth a bhfuil tú ag foghlaim a hainm?`) uses standard spelling throughout. **Recommend `acu`.** Switching to `acub` is a course-wide orthography decision, not a seed-22 decision, and it should not be smuggled in through this fix. *Flagging for Kai as a separate call.*
- Alternative `daoine le Gaeilge` exists in modern usage but is unattested here and weaker; a `labhairt`-based relative can't express proficiency. Kai's form is the right one.

### 5.5 Seed 15 — the conditional — **fine as-is**

`Agus tá mé ag iarraidh go labhrófá Gaeilge liom amárach`. **Leave alone. Confident.**

Two independent reasons: (1) the conditional is squarely in the attested Iorras Aithneach paradigm — vol IV lists `cond 1sg ~eoinn`, `emph labhróinnse`, `3sg labhródh`, and `labhróinnse`/`labhródh`/`labhróidh`/`labhrós` all occur in running text; 2sg `labhrófá` is the regular member of a paradigm the dialect demonstrably uses. (2) Semantically this is a **speech act** ("I want you to *do the speaking*"), not a proficiency claim — `labhair` is the right verb, and the habitual-present objection has no purchase on a conditional. This seed does not inherit the problem.

---

## 6. ⚠️ The finding that isn't a count: seed 9's eleven phrases split in two

**This is the part that a find-and-replace would get wrong, and it is why the reversal cost is not simply "16 rows".**

Kai's ruling turns on a semantic distinction — *possessing* a language vs *performing* an act of speech. The seed-9 head is a possession statement, so it converts to `tá … agam`. But **the 11 practice phrases derived from it are not all possession statements.** Several have a `leat` / `le duine éigin eile` complement, and `Tá Gaeilge agam leat` is not Irish — you cannot "have Irish *at* someone". Those are speech acts and need the habitual `bíonn mé ag caint`.

| # | English | → Class | Proposed Irish |
|---|---|---|---|
| 1 | I speak Irish | **possession** | `Tá Gaeilge agam` |
| 4 | I speak Irish now | **possession** | `Tá Gaeilge agam anois` |
| 9 | I speak a little Irish | **possession** | `Tá beagán Gaeilge agam` |
| 10 | I speak a little Irish now | **possession** | `Tá beagán Gaeilge agam anois` |
| 2 | I speak now | *speech act* | `Bíonn mé ag caint anois` |
| 3 | I speak with you | *speech act* | `Bíonn mé ag caint leat` |
| 5 | I speak Irish with you | *speech act* | `Bíonn mé ag caint leat i nGaeilge` |
| 6 | I speak Irish with you now | *speech act* | `Bíonn mé ag caint leat i nGaeilge anois` |
| 7 | I speak Irish as often as possible | *speech act* | `Bíonn mé ag caint i nGaeilge chomh minic agus is féidir` |
| 8 | I speak with someone else | *speech act* | `Bíonn mé ag caint le duine éigin eile` |
| 11 | I speak a little Irish with you now | **mixed — recommend retiring** | — |

**Phrase 11 does not convert.** "A little Irish" is possession, "with you now" is a speech act, and no single Irish clause carries both without becoming clumsy (`Bíonn mé ag caint beagán Gaeilge leat anois` is poor). **Recommend dropping it** rather than forcing it. *Confident that it shouldn't ship as-is; the drop-versus-rewrite call is Kai's.*

**Phrase 2 (`I speak now`) is weak in English too** — as a standalone it barely means anything. Worth a look while the seed is open.

### 6.1 The lego consequence

The lego `I speak || labhraím` **has no replacement.** Under this ruling there is no single Connemara lego meaning "I speak" — it splits into two:

- `I have / I know` → `tá … agam` (possession)
- `I'm talking` → `bíonn mé ag caint` (habitual speech act)

So seed 9 does not keep 1 lego; it needs **2**, or it needs its scope narrowed to the possession sense only. **This is a curriculum decision, not a text edit**, and it is the single largest consequence of the ruling.

### 6.2 A methodology flag Kai should weigh

The known-side rail says never use structures the learner hasn't been given. **`tá … agam` has not been taught as a productive structure at seed 9.** `agam` appears 16 times in the course so far, but **every single one is inside the frozen chunk `céard atá i gceist agam`** (seed 8, "what I mean") — the learner has never met `tá X agam` as "I have X".

Two ways to read that, and both are worth stating:
- **Against:** the fix introduces a new structure at seed 9 that hasn't been built up to.
- **For:** `tá Gaeilge agam` is arguably *the* highest-value structure in the entire language for a beginner, and seed 9 is a perfectly good place to introduce it deliberately. Seed 8 has already put `agam` in the learner's ear.

**My read: introduce it deliberately at seed 9 and let it be a taught structure** rather than an accident. But this is Kai's methodology call, not mine, and I flag it as the one place where the fix is more than a correction.

---

## 7. MEASURED reversal cost

**Rows that must change if class (b) is corrected:**

| Table | Rows | Detail |
|---|---|---|
| `course_seeds` | **4** | seeds 9, 13, 14, 22 |
| `course_legos` | **1** | `S0009` `I speak \|\| labhraím` — and see §6.1, it may become 2 rows, not 1 |
| `course_practice_phrases` | **11** | all at seed 9; **10 convert, 1 recommended for retirement** (§6) |
| **Total** | **16** | |

**Rows that must NOT change:** 104 class-(a) verbal-noun rows + 1 class-(c) conditional = **105 rows explicitly cleared.**

**Audio impact: NONE. Verified live —**

```
GET /rest/v1/course_audio?course_code=eq.gle_cn_for_eng&select=id&order=id.asc&limit=1
→ 200, content-range: */0, body: []
```

**Zero rows of `course_audio` for this course.** Nothing here nulls an audio link, nothing here strands a clip, and the standing make-before-break doctrine is not engaged. This is text-only, and it is the cheapest moment this fix will ever have — 632 of 668 seeds are still empty shells, and seeds 13/14/22 have no decomposition layer yet.

**Under the content-change migration protocol:** these are `course_seeds`/`course_legos`/`course_practice_phrases` rows in a `draft` course with no learner progress filed against them, not live pod content. The protocol's in-place-edit hazard does not apply here — but that should be confirmed against learner-progress tables before anything is written, and **this document authorises nothing.**

---

## 8. Gaps and weak points, stated plainly

1. **`beagán Gaeilge` is unattested** in both Ó Curnáin and Ó Dónaill's `beagán` entry. Regular, but unwitnessed. (§5.1)
2. **`Gaeilge an-mhaith` is unattested**; `Gaeilge mhaith` is attested and explicitly blessed. Hence the challenge to seed 13. (§5.2)
3. **`bíonn … ag caint` is assembled, not quoted** — both components heavily attested, the exact string is not in the corpus. (§5.3)
4. **The teanglann tilde examples could not be resolved to a headword** and are therefore not cited as evidence. Explicit gap. (§5)
5. **`as Gaeilge` = 0 may be partly a genre artefact** — Ó Curnáin is a grammar, and its Irish is mostly cited examples rather than free discourse. But `i nGaeilge` gets an explicit authorial endorsement for this dialect, which does not depend on frequency. (§4.2)
6. **No native reviewer has seen any of this.** Per the standing note that `gle_cn` is agent-ruled with no native attribution, these remain agent rulings on documentary evidence. That is a real limitation — but every call above has been attempted and labelled rather than deferred.
7. `duine` calibration came in at 497 whole-word / 654 substring against Kai's ~521. Reader proven by `Gaeilge` = 122; the spread is a boundary-definition difference, not an error. (§1)

---

## 9. What I recommend, in one table

| Seed | English (recommended) | Irish (recommended) | Confidence |
|---|---|---|---|
| 9 | I speak a little Irish now | `Tá beagán Gaeilge agam anois` | confident (frame) / best attempt (`beagán`) |
| 13 | **you speak Irish well** *(English changed)* | `Tá Gaeilge mhaith agat` | confident |
| 14 | do you speak Irish all day? | `An mbíonn tú ag caint i nGaeilge ar feadh an lae?` | best attempt |
| 22 | because I want to meet people who speak Irish | `Mar tá mé ag iarraidh bualadh le daoine a bhfuil Gaeilge acu` | confident |
| 15 | *(unchanged)* | `Agus tá mé ag iarraidh go labhrófá Gaeilge liom amárach` | confident — leave alone |

Plus **10 of seed 9's 11 phrases rewritten on the possession/speech-act split in §6**, **1 retired**, and **the seed-9 lego split in two or narrowed** per §6.1.

**Nothing in this document has been applied. No rows were written. No audio exists or was generated.**
