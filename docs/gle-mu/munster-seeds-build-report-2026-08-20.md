# Munster (Kerry) Irish — 668 seeds, build and check report

**20 August 2026.** Course: `gle_mu_for_eng`, "Munster Irish for English Speakers", draft, hidden,
no learner can reach it. **Zero audio. Zero spend.** The course had 0 audio clips before this work
and 0 after — checked directly, both times. Nothing was recorded, queued, or deleted.

The released standard-Irish course and the Connemara course were **read only, never written**. The
sister Ulster job's course was not touched.

---

## 1. The course was set up from scratch, not copied

The fault this brief warned about — a course created by copying another, inheriting an accent label
of "standard" and voice settings carrying the wrong course name inside them — was avoided by
building the row by hand:

| | |
|---|---|
| Code | `gle_mu_for_eng` |
| Name | Munster Irish for English Speakers |
| Variant label | Munster (Kerry) |
| **Dialect label** | **`munster`** — not "standard" |
| **Target voices** | **empty strings, no voice pool key** — no voice decision implied |
| Known-side voice | the English narrator only |
| Status | draft, hidden, `not_available` in both apps |

**No voice decision has been taken and none is implied anywhere in the record.**

---

## 2. Authorities — what was actually consulted

Named explicitly, per the brief. Each was fetched and mined; nothing here is claimed on reputation.

| Source | What it is | Role |
|---|---|---|
| **Diarmuid Ó Sé, *Gaeilge Chorca Dhuibhne*** (ITÉ 2000) | The descriptive grammar of West Kerry. Free full text on archive.org. ~1M characters. | Primary — paradigms, with section numbers |
| **Dillon & Ó Cróinín, *Teach Yourself Irish*** (1961) | A complete graded beginners course **in West Munster Irish** — our exact register. It says so itself. | Primary — teaching frames |
| **Tomás Ó Criomhthain, *An tOileánach*** (1929) | Native Blasket prose; the Blaskets are Corca Dhuibhne. | Primary — idiom |
| **corpas.ie** (National Corpus, 100M words) | Partitioned MU/CO/UL by RnaG regional desk — *An Saol ó Dheas* broadcasts from Baile na nGall in Corca Dhuibhne. | Dialect ratios |
| **Ó Dónaill, *Foclóir Gaeilge–Béarla*** | The standard. | Reference point we deliberately depart from |

**Consulted and found unusable: Dinneen.** Both editions downloaded; the seanchló OCR is garbage —
`agus` returns 2 hits in a 5.8 MB Irish dictionary. Its English glosses and `(M.)` labels survive
and were used; its Irish side is not searchable. Stated as a calibration failure, not a source.

**Could not reach:** Ó Cuív's *The Irish of West Muskerry* (401), *Fiche Blian ag Fás*
(lending-restricted), *Peig* (server error), and **Ó Sé's *An Teanga Bheo*, which was not found at
all**. **dúchas.ie is reachable but yielded nothing** — its search is a JavaScript app whose
filtered HTML is an empty shell; it needs a headless browser. That is the biggest unopened door and
the best remaining source for older Kerry narrative syntax.

### Is the evidence base as rich as Munster's reputation promises?

**Honest answer: thinner as descriptive grammar, richer as teaching material.** Ó Sé is ~450 pages
against Ó Curnáin's 2,700 for Connemara, and most of it is phonology — which is why `try`, `easily`
and `later` came back unresolved or thin. But Connemara had no *Teach Yourself Irish*: a graded
beginners course in the target dialect settles frames a grammar never records, because it teaches
the frame rather than citing a form. For **authoring seeds**, that trade favours Munster. For
**checking morphology**, it does not.

---

## 3. What makes this sound like Kerry rather than the standard

The rulings that carry the course. Every one is a measured departure from the Caighdeán, and several
are departures from the Connemara course as well.

**The language is `Gaelainn`, not `Gaeilge`.** The headline finding, and the raw counts invert the
truth: Ó Sé shows `Gaeilge` 278 against `Gaelainn` 10 — but every one of the 10 sits inside a
phonetically-transcribed line of real Dingle speech, and the 278 are his own standard-Irish prose
*about* the dialect. An tOileánach has `Gaoluinn` 5 and `Gaeilge` **0**. And *Teach Yourself Irish*
confesses the substitution in its own preface: *"Gaoluinn 'Irish' of the dialect, we use the
prescribed spellings … Gaeilge"*. Under the binding rail, that confession decides it. So the course
says **tá Gaelainn agam**.

**`as Gaelainn`, not `i nGaeilge`.** The Connemara course found `as Gaeilge` absent and blessed
`i nGaeilge`. **Kerry is the other way round** — `as Gaelainn` is attested in Ó Sé's transcribed
data, filed beside `as Béarla`; `i nGaeilge` has no Kerry attestation. The Connemara ruling was
explicitly *not* inherited.

**"Want" is `teastaíonn … uaim`, not `tá mé ag iarraidh`.** The single biggest structural break.
`ag iarraidh` occurs **zero times in the whole of Teach Yourself Irish**. And in Munster `d'iarraidh`
means **trying to**, not wanting — so the Connemara spine maps onto a *different meaning* in Kerry.
Getting this wrong would have quietly mistranslated the most frequent frame in the course.

**"Going to" is `chun`, not `ag dul`.** TY states the rule outright: *"chun with a verbal noun
construction: bhíos chun dul ann 'I intended to go there'"*. Ó Sé's data has `cad tá siad chun a
dhéanamh?`; An tOileánach has seven more. In the corpus `ag dul` is literal motion.

**The verb system is synthetic — but not everywhere.** `táim`, `nílim`, `bhíos`, `dheineas`,
`chuas`, `dúrt`, `chualas`, `táimid`, `bhíomar`, `bhíodar`. Never `muid` (36 in Munster against
11,150 in Connacht). **But the future 1sg is analytic** — `beidh mé` 111 against `bead` 13 — while
the 1pl is synthetic, `beimid`. And **the 2sg `-ir` ending is dead**: `an bhfuilir` returns 0 in
104k tokens of Kerry broadcast. Assuming "Munster = synthetic everywhere" produces wrong Irish in
the highest-frequency cells.

**`ná`, not `nach`** — `ná fuil` 1,161 in Munster against 1 in Connacht. **Except in the copula**,
which keeps `nach`: `nach féidir` 7 across the Kerry texts, `ná féidir` **0**.

**The indirect relative takes `go`** — `na daoine go bhfuil Gaelainn acu`. TY teaches this with an
explicit Munster-versus-standard contrast table. `daoine go bhfuil` 91 in Munster against 9 for
`a bhfuil`, and the ratio **inverts** in Connacht.

**Preposition + article eclipses, including `d`→`nd` and `t`→`dt`** — `ar an dtaobh`, `ag an ndoras`.
One of the most audible Munster signatures. **But `sa` lenites**: `sa tigh`, never Connacht's
`sa mbaile`.

**Lexicon:** `conas` (never *cén chaoi*) · `cad` (never *céard*) · `canathaobh` (never *cén fáth*) ·
`cathain` (never *cén uair*) · `anso`/`ansan` · `éigint` · `amáireach` · `gach aoinne` ·
`go tapaidh` · `fé` · `tigh` · `thar n-ais` · `tosnú` · `thógaint` · `lem chairde` ·
`is dóigh liom go` (never *sílim*, which is Connacht/Ulster) · `ana-` as the intensifier.

---

## 4. The two check passes

### 4a. Correctness

Every translated row was run through a detector encoding the rulings above
(`tools/gle-mu/dialect-check.cjs`). **Result: clean — no banned standard or Connacht form
survives in the course.**

Repairs applied along the way, each verified against its English before the edit:
`éigin`→`éigint` (12 rows), `amárach`→`amáireach` (5), `ag iarraidh`→`d'iarraidh` (11 — every one
checked individually to confirm the English said *trying*, not *wanting*), `inniubh`→`inniu` (3).

### 4b. Consistency — every row, no sampling

- **ZUT: 0 English prompts carry more than one Irish form**, across every translated row.
- The one forced pair — seeds **68 and 194**, which share identical English ("what are you looking
  for?") — carry **identical Irish**.
- Spelling drift hunted by variant family, not by eyeball. Found and fixed: **`inniubh`**, which is
  a **fabrication** — 0 hits in all three Kerry sources (it is `inniu`, or `indiu` in the older
  orthography).

### 4c. Three false positives I generated and killed — recorded so nobody re-runs them

The brief required calibrating detectors and hunting my own false positives. All three of these
would have produced confident, wrong findings:

1. **A blanket `sin`→`san` / `seo`→`so` rule flagged 30 rows. It was wrong.** Ó Sé gives the
   inventory *so/san/súd*, but the alternation is **phonologically conditioned** and `sin`/`seo` are
   perfectly good Kerry in the right frame: `mar sin` 49 vs `mar san` 1; `é sin` 57 vs `é san` 3;
   `sin é` 27 vs `san é` 6. `san` turns up after a broad consonant (*an t-am san*, *an lá san*).
   Nobody has found that conditioning stated in print, so the rule was **retired**, not tuned. Had I
   trusted it, I would have corrupted 30 correct sentences.
2. **`nach féidir` is not an error.** The `ná` ruling is about the substantive verb; the copula
   keeps `nach` — measured 7 to 0 in the Kerry texts.
3. **`chun tosaigh` ("ahead") is the noun *tosach*, not the banned verb *tosaigh*.** The 117
   `tosaigh` hits in Ó Sé are a phonology book discussing word-initial position.

And three bugs the detector's own calibration suite caught **in the detector**: case sensitivity
(`Tá mé` did not trip the rule that `tá mé` did); JavaScript's `\w` being ASCII-only, so the pattern
hunting Connemara's `ag iarraidh` could not match "mé"; and the `ar éigin`/`b'éigin` homographs
("barely", "had to") inflating the `éigin` count. **The detector refuses to print counts unless its
calibration passes**, currently 32 of 32.

**One more trap, found in the evidence itself:** the sources scout had downloaded two OCRs of
*Teach Yourself Irish*, and one of them is **accent-stripped** — it renders *tá* as *ta*, so `tá`
counts **0** in a 426 KB Irish course book. Every accented-word zero on that file is an artefact
that looks exactly like a dialect finding. The headline claims were re-run on the clean OCR.

---

## 5. What a Kerry speaker should see first

Ranked. These are where I would not bet the course.

1. ~~**"To try to" — the one real hole.**~~ **RESOLVED WHILE THIS BUILD WAS RUNNING, and the
   resolution is now applied.** A parallel job (#552) settled "try" across all three dialect
   courses: the word is **`iarraidh`**, and Kerry writes it **`d'iarraidh`** — **41 occurrences in
   native Blasket prose** (*"d'iarraidh iad a chur isteach ar an dtráigh"*, *"ag rámhaidheacht
   d'iarraidh teacht suas léi"*), and the West Munster beginners' course glosses the dialect shape
   outright: *"a d'iarraidh (= ag iarraidh)"*.

   This course had already ruled `táim d'iarraidh` for the progressive from Ó Sé §686, so the
   progressive uses and all eleven `ag iarraidh`→`d'iarraidh` repairs were already correct. What
   was **not** right was the four seeds that used `iarracht a dhéanamh` for the bare infinitive
   (**8, 236, 407, 541**); *iarracht* is a discrete attempt, not the general frame. **All four were
   moved to `d'iarraidh`**, so "try to" now has exactly one Munster form across the whole course.

   Two things worth recording. **`féach le` is confirmed dead in Munster** — the real count of it
   meaning "try to" is zero, and the number that suggested otherwise was a trap. And **Kerry has no
   want/try overlap at all**, because "want" is `tá … uaim`, not `iarraidh` — so the one real cost
   this decision carries in Connemara does not arise here.

   **A correction to my own evidence, from the same ruling.** This report earlier leaned on
   "`ag iarraidh` occurs zero times in Teach Yourself Irish". That zero is partly a **spelling
   artefact** — Munster writes the same word `d'iarraidh`. The "want" ruling is unaffected because
   it rests on positive evidence (TY teaches `tá … uaim` and `teastaíonn … uaim` in so many words),
   not on that zero. But the zero should not be quoted as dialect evidence on its own.
2. **The adjective "easy".** `éasca` and `furasta` are both 0 in all three texts; only the adverb
   `go héascaidh` and the comparative `fusa` are attested.
3. **"I want to" = `teastaíonn uaim`.** Right dialect, but a thin count; the alternative
   `ba mhaith liom` is reserved for "would like" and cannot double up without breaking ZUT.
4. **"I can" = `is féidir liom` over `ábalta`.** Defensible and genuinely contestable — the course
   uses `is féidir liom` for "I can" and `ábalta ar` for the infinitive "to be able to", because the
   copula frame will not take an infinitive. Worth a speaker's opinion.
5. **`-mar` over Ó Sé's printed `-mair`** (`bhíomar`, not `bhíomair`). A deliberate departure from
   the primary authority's own page, on 3–4:1 modern-Kerry evidence. Both spell the same spoken
   ending; `-mair` is the narrower transcription.
6. **The 2pl throughout** (`tánn sibh`, `bhíobhair`) and the 2sg past `bhís` — reasoned from Ó Sé's
   classes, not separately attested.
7. **The `san`-after-broad-consonant conditioning** — the inventory is confirmed, the rule is not.
8. **`ar ball` for "later"** — genuinely attested but only once, in An tOileánach.

---

## 6. Honest comparison with the Connemara work

**The dialect rulings here rest on better evidence than Connemara's did**, because Munster has a
graded teaching course in the dialect and Connemara does not — several frames (`want`, `going to`,
the `go`-relative) are settled by a book that *states the rule in words*, rather than by inference
from a corpus. Ó Sé is a weaker grammar than Ó Curnáin, and the morphology tail (2pl, 2sg past)
is correspondingly softer.

**Where this is behind Connemara:** the Connemara course has been through repeated human rulings from
Kai and several rounds of adversarial re-checking; this has had one build and one automated check
pass. And **no Munster speaker has seen a single line of it.** The confidence labels are honest
self-assessment, not verification.

**No decomposition, no practice phrases, no audio** — seeds only, as ruled.

---

## 7. How much is done, and exactly where it stopped

**540 of 668 seeds are translated and in the database.** Contiguous bands **1–500** and **523–562**.

**Not translated: seeds 501–522 (22) and 563–668 (106)** — 128 seeds, all still empty shells with
their English in place. They are untouched, not half-done.

Why it stopped there rather than at 668: the translation was fanned out to ten workers, and seven of
them were killed by an account usage limit partway through — several had already written good rows
straight to the database, which is what survives. The remaining ranges were picked up by two
replacement workers and by this session directly, until the 15-worker fan-out ceiling was reached.
The brief's instruction was to do fewer seeds properly rather than all of them badly, so the
remaining 128 were left clean rather than rushed.

**Everything reported above — the clean dialect pass, the clean ZUT pass, the repairs, the forced
pair — covers all 540 translated rows, every row, no sampling.**
