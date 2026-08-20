# `gle_mu_for_eng` — the "try" word is OPEN, pending job #552

**Status 2026-08-20: NOT hardened into the spec.** Job #552 is choosing one word for "try" that all
three dialect courses will inherit. This file is the surgical swap list so that when #552 lands, the
change is mechanical and complete.

## What this course does NOT contain

**`ag iarracht` — ZERO instances.** The disputed coinage was never used here. Checked by regex over
all written rows. This course is not exposed to the misattributed "Kai ruling", and the spec does
not cite it.

For the record, the objection to `ag iarracht` is well founded and this course agrees with it:
Ó Dónaill has `iarracht` as a **noun** only; there is no attested progressive `ag iarracht` + VN;
the idiomatic form is `ag déanamh iarrachta` / `iarracht a dhéanamh`. Kai's "learners will google it"
ruling covers real **dialect** forms, which have discussion attached — a coinage has none, so that
ruling does not rescue it and is not cited in support.

## What this course DOES contain — the swap list

Two shapes are in use. **Both must be swept**, not just the first.

### Shape A — `ag iarraidh` + [obj + `a`] + VN  (7 rows)

| seed | English | current Munster |
|---|---|---|
| 2 | I'm trying to learn | Táim **ag iarraidh** foghlaim |
| 6 | I'm trying to remember a word | Táim **ag iarraidh** cuimhneamh ar fhocal |
| 50 | I'm not trying to finish as quickly as possible | Nílim **ag iarraidh** críochnú chomh tapaidh agus is féidir |
| 102 | we're trying to say that it's not like that | Táimid **ag iarraidh** a rá ná fuil sé mar sin |
| 103 | we're not trying to hear many more words | Nílimid **ag iarraidh** a lán focal eile a chlos |
| 140 | …what you're trying to show me | …cad atá tú **ag iarraidh** a thaispeáint dom |
| 146 | …since we tried to fix it | …ó bhíomar **ag iarraidh** é a dheisiú |

### Shape B — `iarracht a dhéanamh`  (1 row)

| seed | English | current Munster |
|---|---|---|
| 8 | I'm going to try to explain what I mean | Táim chun **iarracht a dhéanamh** cad atá i gceist agam a mhíniú |

**Total affected: 8 rows.** (Seeds 1–150 written at time of writing; this file must be re-derived
against the full 668 before the sweep is executed — see the query below.)

    grep -nE 'ag iarraidh|iarracht' over target_text for course_code = gle_mu_for_eng

## The Munster-specific fact #552 needs

**`ag iarraidh` does not mean the same thing in Kerry as it does in Connemara, and that breaks the
assumption that one word can be swapped in identically across the three courses.**

Measured, corpas.ie CNG, spoken-vs-spoken (`RnaG An Saol ó Dheas` vs `RnaG Iris Aniar`, same size to
within ~10%):

| | Munster (Kerry) | Connacht (Connemara) |
|---|---|---|
| `ag iarraidh` | **288** | **1884** |
| `teastaíonn`-family | **345** | 240 |

In **Connemara**, `ag iarraidh` is the ordinary word for **want** (1884 hits, 89% of the want-slot),
so it is *not available* for "try" without a collision.

In **Kerry**, want is carried by **`teastaíonn ó`**, and `ag iarraidh` runs at one-sixth the
Connemara rate. That leaves `ag iarraidh` free to carry "try" — and the corpus shows it doing so:

> "…bím i gcónaí **ag iarraidh** é sin a bhrú ar aghaidh…"  (= *I'm always trying to push that forward*)

So the collision map is **not the same in all three dialects**. A single word chosen for all three
either collides in Connemara or is non-idiomatic in Kerry, unless it is a third form
(`ag déanamh iarrachta` / `iarracht a dhéanamh`) that is neutral in both. On length, Kai's actual
concern — "iarracht a dhéanamh is a bit long" — is real and I am not arguing against it; I am only
recording that the Kerry evidence changes what the alternatives cost.

**This course's position: `ag iarraidh` is defensible and evidence-backed FOR MUNSTER, but it is a
provisional local answer, held open pending #552, not a ruling.**

## ⚠️ GAP — the Munster try-word job FAILED and was not retried

Checked on the job surface 2026-08-20:

| job | status | note |
|---|---|---|
| `munster-try-word` | **failed, exit 1** (22:42→22:49) | hit the `kai-gmail` account limit mid-turn; **no `munster-try-word-2` exists** |
| `donegal-try-word` | failed | **but was retried as `donegal-try-word-2`, now running** |
| `connemara-word-for-try` | exit 1, re-routing | limit hit |

Donegal got a retry. **Munster did not.** So unless someone re-dispatches it, the Munster arm of the
try-word decision has produced nothing, and the measurements in the section above are the only
Munster evidence currently on the table. Flagging rather than fixing: re-dispatching another
course's workstream is not this job's call, but the silence will otherwise read as "no Munster
issues found" when in fact the job died.

## Also carried forward — the decomposition rule (binding, 2026-08-20)

This course has **no decomposition yet** (seeds only, by brief), so it has not committed the
Connemara defect. Recording it now so the eventual decomposition brief inherits it:

1. **Never split off a preposition as its own teaching unit and invent a gloss for it.** Where a
   preposition is what the verb demands — plumbing with no independent meaning in that sentence — it
   belongs **inside** the unit with the word it serves. Connemara split the preposition demanded by
   the remembering verb and glossed it "about"; seven English practice sentences downstream then read
   "remember about the whole sentence", which is not English. One bad split manufactured seven bad
   sentences.
   **Live risk here:** seed 6 is `cuimhneamh **ar** fhocal` and seed 10 is `cuimhneamh **ar** an
   abairt ar fad` — the same verb, the same demanded preposition, the same trap. `ar` here is
   plumbing and must never be tiled separately or glossed "about".
2. **A seed's teaching units must mirror its own sentence.** If a unit does not appear in the seed
   sentence, it does not belong to that seed. ("about a word" is not in "I'm trying to remember a
   word".)
3. **The governing test:** could a learner holding only what the course has taught so far produce
   this sentence from the English prompt alone? If not, the decomposition is wrong — not the learner.
4. **Do not recycle a "with someone else" unit onto "explain."** The defective shape
   "explain what I mean with someone else" was found at seed 8 in eight other courses on the estate.
   You explain something **to** someone. Seed 8 here is
   `Táim chun iarracht a dhéanamh cad atá i gceist agam a mhíniú` — no "with someone else" attached,
   and it must stay that way.
