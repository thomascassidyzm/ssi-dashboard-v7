# Connemara Irish — dialect spec for `gle_cn_for_eng`

**Set 2026-08-18, BEFORE the first seed was translated.** This is the target the translator, the
validator and the reviewer all work to. Retrofitting a dialect is the failure mode of the existing
course; this document exists so that does not happen again.

Kai's ruling: Connemara Irish, leaning further into Connemara than the base course does.

---

## 0. The governing line

> **Orthography = An Caighdeán Oifigiúil. Grammar and lexis = Connemara (Cois Fharraige / south
> Conamara register).**

Two reasons for splitting it that way:

1. **Learners must be able to read Irish that isn't ours.** Road signs, dictionaries, books and
   every other Irish course use standard spelling. A learner taught `aríst` cannot look up `arís`.
2. **The TTS voices are trained on standard orthography.** `ga-IE-OrlaNeural` / `ga-IE-ColmNeural`
   are standard-spelling models. Non-standard respellings are a pronunciation risk, and per Kai's
   ruling voices are deferred — so we must not make the existing voices harder to use.
   *(Risk, not measurement — see Gaps.)*

So a **lexical** Connemara item that Connacht writers spell that way in standard orthography is IN
(`céard`, `cén chaoi`, `chuile`, `tada`, `muid`, `in ann`). A **spelling-only** respelling of a word
that has a standard form is OUT (`aríst` → `arís`, `'bhfuil` → `an bhfuil`, `a'` → `ag`).

## 0b. Register

Irish `tú` / `sibh` is **number only** — there is no T/V politeness split to choose, so unlike
German du/Sie or French tu/vous there is no register decision to make here. (Established by the
A-108 Celtic pass, `docs/a108/celtic-cym_s-cym_n-gle-2026-08-14.md`, and consistent with the base
corpus.) Register work in Irish goes into **verb form choice**, which §1 fixes.

---

## 1. The checklist — what the validator enforces

### 1a. REQUIRED Connemara forms

| Meaning | Connemara form | Base course | Verdict |
|---|---|---|---|
| what | `céard` | 644 | ✅ carry over |
| how | **`cén chaoi`** (+ `a` + eclipsis) | **0** — uses `conas` ×276 | ❌ **CHANGE** |
| I am / I am not | `tá mé` / `níl mé` | 1,858 / 299 | ✅ carry over |
| we are | **`tá muid`** (analytic) | **0** — uses `táimid` ×22 | ❌ **CHANGE** |
| we (pronoun) | `muid` | 51 | ✅ carry over |
| want | `tá … ag iarraidh` | 2,707 (vs `teastaíonn` 21) | ✅ carry over, drop the 21 |
| able to | `in ann` | 646 | ✅ carry over |
| at all | `ar bith` | 119 | ✅ carry over |
| nothing | `tada` | 40 | ✅ carry over |
| think | `ceapaim` / `ceapann` | 382 / 42 | ✅ carry over |
| every | **`chuile`** | **0** — uses `gach` ×213 | ❌ **CHANGE** (for "every"; `gach` survives in fixed phrases) |
| look | **`breathnaigh`** | **0** (`féach` ×1) | ❌ set now, before it debuts |
| also | `freisin` | 0 (never occurs) | set now |
| again | `arís` (standard spelling, not `aríst`) | 55 | ✅ carry over |

### 1b. FORBIDDEN — Munster

`táim` · `nílim` · `táimid` · `bhíos` · `chuas` · `dheineas` · **`conas`** · `cad` (as "what") ·
`ansan` · `ana-` · `in aon chor` · `faic` · `garsún` · `prátaí` · `fé` · `chughat` ·
`is dóigh liom` · `in acmhainn` · `sara`

### 1c. FORBIDDEN — Ulster

`chan` · `cha` · `domh` · `goidé` · `caidé` · `cad é mar` · `uilig` · `tchí` · `fosta` · `ábalta` ·
`amharc` · `achan`

### 1d. Grammar rules Connemara requires (and the base's practice layer breaks)

- Interrogative + verb takes its **particle and mutation**: `Cén chaoi a bhfuil tú?`,
  `Ar thosaigh mé?`, `An bhfuil tú?` — never a bare verb after the question word.
- Direct relative `a` + **lenition**; indirect relative `a` + **eclipsis**.
- Object + `a` + verbal noun: `Gaeilge a labhairt`, not `labhairt Gaeilge`.
- Analytic verb forms for the **1st person plural and the past**: `tá muid`, `bhí mé` — never
  `táimid`, `bhíos`, `chuas`.
  **Correction, 2026-08-18 (review #35):** an earlier draft of this line said "no synthetic endings
  anywhere". That is wrong and a validator written literally from it would reject correct Irish.
  The synthetic **1st-person-singular present** is universal in Connemara and required here —
  `labhraím`, `ceapaim`, `feicim`. The base corpus writes `labhraím`/`labhraíonn` 258 times. The
  rule is: synthetic 1sg present YES; synthetic 1pl and synthetic past NO.

---

## 2. Evidence — the marker census

Run 2026-08-18 over the whole base corpus (`scripts/en-ga-compare/en-ga.json`, 15,904 items:
511 seeds + 1,938 legos + 13,455 phrases; 608,947 characters of Irish). Script:
`.a108-gle/dialect-census.cjs`. 63 markers tested, against the ~9 that had been tested before.

**Detector calibrated first.** Against the known positive `céard` it returns **644**, the figure an
independent earlier pass reported, and `cad` **0**. The counter uses an Irish-aware word boundary
(accented vowels and apostrophes are letters, not separators) — a plain `\b` regex splits `céard`
and miscounts every accented form.

### What the census confirmed

Munster-exclusive verb morphology is a true zero: `táim` 0, `nílim` 0, `bhíos` 0, `chuas` 0,
`dheineas` 0, `ansan` 0, `ana-` 0, `fé` 0, `chughat` 0, `in aon chor` 0, `faic` 0, `garsún` 0,
`prátaí` 0. Ulster is a true zero on every marker tested: `chan` 0, `domh` 0, `goidé` 0, `caidé` 0,
`uilig` 0, `tchí` 0, `fosta` 0, `ábalta` 0, `amharc` 0.

### What the census FOUND — and the earlier nine-marker check could not

**`conas` = 276 items.** This is the Munster word for "how", and it is the base course's word for
"how": seed 21 teaches the LEGO `how → conas` outright, and 275 further items inherit it. Connemara
says `cén chaoi`, which appears **0** times. Read, not just counted — every one of the 276 is the
interrogative:

> S21 `How do you feel at the moment?` → `Conas a mhothaíonn tú faoi láthair?`
> S21 (lego) `how` → `conas`
> S21 `How are you?` → `Conas tá tú?`

This is the largest dialect defect in the material we are carrying over, it was never tested for,
and it sits at **seed 21** — inside the stretch where the median live learner actually is.

**`táimid` = 22 items**, all at seed 274, from one lego `we want → táimid ag iarraidh`. Synthetic
1st-plural; Connemara is analytic `tá muid ag iarraidh`.

**Absence of positive Connemara lexis.** `chuile` 0, `cén chaoi` 0, `breathnaigh` 0, `aríst` 0,
`gasúr` 0. The base is *Connacht-leaning by not being Munster* more than it is *Connemara by
choosing Connemara forms*. That is exactly the gap Kai asked to close.

### Honest reading of the base

Connacht-leaning standard Irish with one substantial Munster import (`conas`) and one minor one
(`táimid`), and without the positive Connemara lexis. **Not** "clean" — "clean on verb morphology,
which is where anyone had looked."

---

## 3. Carry-over policy

**Carried over:** the base's verb-form register (analytic `tá mé`/`níl mé`), `céard`, `ar bith`,
`tada`, `in ann`, `ceapaim`, `ag iarraidh` for "want", the object + `a` + verbal-noun order, and
its seed and lego translations wherever the marker checklist passes. The base's English→Irish
pairs are loaded as a translation memory (`.a108-gle/base-tm.json`, 15,627 distinct English
strings) and consulted for every seed, so a native speaker's choice is the default and a fresh
translation is the exception that has to justify itself.

**Not carried over:** `conas` and everything built on it; `táimid`; `teastaíonn` for "want";
the base's `níl fhios agam` spelling (→ `níl a fhios agam`, per §0); and — pending the reuse
census — the bulk of the practice layer, which is where the concatenation damage lives.
