# Ó Curnáin vols I–IV — five probes, all four volumes

`gle_cn_for_eng` (Connemara Irish). **Read-only research. No database writes. No TTS. £0.00.**

Source: Brian Ó Curnáin, *The Irish of Iorras Aithneach, County Galway* (DIAS 2007), 4 vols.
Downloaded 2026-08-20 from `https://www.dias.ie/wp-content/uploads/2010/08/Iorras_Aithneach_Volume_{1,2,3,4}.pdf`.

The 2026-08-18 rulings mined **only vols II and IV**. This document adds **vols I and III**, and
re-runs every probe against **all four** volumes so each question has a complete answer.

---

## 0. Method, and why you can trust a zero

**All four volumes downloaded and extracted. No gaps.** HTTP 200 on all four; 5.5–6.4 MB each.
Extracted with the existing `docs/gle-cn/pdfx.py`, then re-encoded UTF-8 with the phonetic-font
bytes blanked (they are a custom font and extract as garbage — that caveat was already known and is
confirmed). Irish **orthography** extracts cleanly in all four volumes.

**One extraction trap, found and fixed.** `pdfx.py` emits latin-1 bytes with embedded NULs. Plain
`grep` therefore treats vols I–III as *binary* and silently reports **0 for every search**. My first
calibration run returned `Gaeilge 0, iarraidh 0, bíonn 0` for vols I, II and III — those were not
real zeros. Anyone re-running this must decode to UTF-8 and use `grep -a` or a Python regex.
Harness used: `scripts/gle-cn-probe.py` (gitignored workspace).

**Calibration — known positives, all four volumes.** Every one is non-zero in every volume, so a
zero below is a real zero:

| calibrator | vol I | vol II | vol III | vol IV |
|---|---|---|---|---|
| `Gaeilge` | 30 | 9 | 12 | **71** |
| `iarraidh` | 33 | 62 | 127 | **98** |
| `bíonn` | 11 | 41 | 79 | **101** |
| `cén chaoi` | 2 | 6 | 28 | **29** |
| `chuile` | 38 | 37 | 147 | **105** |

The vol IV column reproduces the 2026-08-18 figures (`Gaeilge` 71, `iarraidh` 105, `bíonn` 101,
`cén chaoi` 29, `chuile` 139) — so this run and that one are measuring the same thing. The small
deltas on `iarraidh` (98 vs 105) and `chuile` (105 vs 139) are **method, not disagreement**: I count
with word boundaries (`\biarraidh\b`), the earlier run counted substrings, which also catches
`hiarraidh`, `iarraidhe`, `achuile`, `dhá chuile`. Word-boundary counts are used throughout below.

**The instrument that matters most.** Ó Curnáin's own abbreviation key (vol I, Preface) defines the
asterisk:

> `*` … (ii) **non-attested form, or, in query, impermissible or very doubtful form**

So an asterisked form in the vol IV index is *the author stating he did not record it in this
dialect*. That is far stronger evidence than any hit count, and it decides Probe 4 outright. 284
index entries carry an asterisked variant.

---

## PROBE 1 — `labhraím` vs `tá … Gaeilge agam`

### Counts

| form | vol I | vol II | vol III | vol IV | total |
|---|---|---|---|---|---|
| **`labhraím` / `labhraim`** (1sg pres) | **0** | **0** | **0** | **0** | **0** |
| `labhraíonn` / `labhrann` (3sg pres) | 0 | 0 | 0 | 0 | **0** |
| `labhair` (impv / past) | 8 | 14 | 12 | 11 | 45 |
| `labhairt` (VN) | 1 | 3 | 8 | 4 | 16 |
| `labhrós` (rel fut) | 0 | 0 | 3 | 1 | 4 |
| `labhraíodh` | 0 | 1 | 1 | 2 | 4 |
| `labhradh` | 0 | 1 | 1 | 1 | 3 |
| `labhradar` | 0 | 1 | 0 | 1 | 2 |
| `labhróidh` | 0 | 0 | 1 | 1 | 2 |

**Control set — 1sg present of common verbs, same volumes** (the noise floor):

| control | vol I | vol II | vol III | vol IV | total |
|---|---|---|---|---|---|
| `deirim` | 0 | 6 | 0 | 1 | 7 |
| `tuigim` | 3 | 0 | 0 | 4 | 7 |
| `ólaim` | 0 | 2 | 4 | 1 | 7 |
| `feicim` | 2 | 4 | 1 | 2 | 9 |
| `ceapaim` | 0 | 1 | 1 | 0 | 2 |
| `bím` | 0 | 2 | 2 | 3 | 7 |

The noise floor across four volumes is 2–9. `labhraím` is 0. **On counts alone that is still
inside the noise floor** — the 2026-08-18 caution was right and I am not overturning it on counts.

### The evidence that is not a count

Ó Curnáin's vol IV index gives a **form-by-form paradigm** for each verb. Compare:

> **`abair`**, v, `say`, 5.238-242, 9.130, impv 2sg abair 8.16, deir 5.400 n., 2pl abraigí,
> abraígí 5.85, emph abraigísan 6.53, **pres 1sg deirim 5.233**, emph (a) deirimse 5.88, 6.53,
> 8.31, **3sg abraíonn** 1.194, 4.47, 8.25, déar-, déarann, éarann …

> **`ceap2`**, v, `fashion, think, assign`, 5.235, 7.22, (n)gc~ 9.143, **pres 1sg ~aim 6.6**,
> **3sg ~ann** 5.343, 3pl ~anndar 5.406, rel ~anns, pst 3sg 5.343 …

> **`labhair`**, v, `speak`, 5.170, impv 2sg 6.23, pst 3sg 1.159, -368, 2.20, 3pl labhradar,
> imprs labhraíodh 5.81-82, labhradh 5.415, psthab labhraíodh 10.94, imprs ~tí 5.53, fut
> labhróidh, rel labhrós 8.86, cond 1sg ~eoinn 8.57, emph labhróinnse 6.53, 3sg labhródh 1.263,
> labhaireot sí 14 s.v. spiorad, imprs labhróifí 5.55, **pstsbj 1sg labhrainn\*** 10.87, vadj
> labhartha 5.174, ~te 5.174, VN ~t 1.407, 5.24, -207, gsg labhartha 5.227.

`abair` and `ceap` both list **`pres 1sg`** explicitly. The `labhair` entry lists imperative, past,
past-habitual, future, relative, conditional, past-subjunctive, verbal adjective and verbal noun —
and **no present tense at all**, neither 1sg nor 3sg nor habitual. The single 1sg form in the whole
entry, `labhrainn*`, carries the **non-attested asterisk**.

This also corrects a false negative in my own control counts: `ceapaim` scores 0 in vol IV by string
search **only because the index writes it `~aim`**. The tilde abbreviation defeats substring search
inside the vol IV glossary and index — a genuine trap for anyone counting there.

### What the dialect uses instead

The language-possession idiom is alive in running speech in **all four** volumes (2/1/10/6 hits):

- *tá Gaeilge **aici** chomh maith liomsa* — vol I, speaker 21Pt
- *daoiní TÁ Gaeilge **ACÚ*** — vol III
- *níl aon Ghaeilge chomh maith sin **ACÚ*** — vol III, a son of 24P
- *bhí teanga mhaith Bhéarla **aige**, ach thug sé an teanga i gceart …* — vol I, speaker 892M
- *scoil ná Béarla fóghlamtha **aige*** — vol II, 894C9
- *Bhí Gaeilge, bhíodh Gaeilge **ag an dream** a theagadh thiar a inne froisin* — vol IV, sample text
- *ní raibh Béarla mórán **ag** aon-nduine. Is Gaeilge uiliug a bhí gach, ann* — vol IV, 70M
- *Béarla a bhí **acú*** … *Béarla a bheadh **ag an gclann*** — vol IV, 70M

And where `labhair` *does* take a language, it is the **act** of speaking, in a finite past or
imperative — never a present-tense statement of ability:

- *Aon-nduine a **labhair** Béarla, u- dhéanfí magadh fúthub* — vol IV, 70M
- *Do dh-~ thusa **labhair** aon fhocal Gaeilge leis sin agus tigthe se thú* — vol IV, M
  (*"I bet you no matter what Irish word you speak to him he will understand"*)
- *Gaeilge is mó A MBÍONN chuile dhuine (**a labhairt**)* — vol III, 78Rb

**False-positive hunt.** `Gaeilge` raw counts overstate badly in vol I: of 30 hits, most are
bibliography and institution names — *Foclóir Gaeilge-Béarla*, *Scoil na Gaeilge*, *Gaeilge Chorca
Dhuibhne*, *Gaeilge Chois Fhairrge*, *Roinn na Nua-Ghaeilge*, *Corpas na Gaeilge* — not Iorras
Aithneach speech. `Gaeilge` **cannot** be counted by string search as a measure of running usage.
The eight citations above were each read in context.

> ### Verdict — Probe 1
> **`Tá beagán Gaeilge agam anois`.** Not because `labhraím` is 0 (it is, but that is inside the
> noise floor and proves nothing on its own), but because Ó Curnáin's paradigm for `labhair` records
> **no present tense whatsoever** while explicitly recording `pres 1sg` for comparable verbs, its
> only 1sg form is marked non-attested, and the possession idiom `tá [language] ag X` is attested in
> running speech in all four volumes including a first-person comparison. `labhair` in this dialect
> is an act, not an ability. **Confidence: high.** Fork 7 should be reversed while it costs 1 lego,
> 11 phrases and 1 seed.

---

## PROBE 2 — `dícheall a dhéanamh` vs `a thabhairt`

### Counts

| form | vol I | vol II | vol III | vol IV | total |
|---|---|---|---|---|---|
| `dícheall` (all spellings incl. `deoicheall`, `dicheall`) | 7 | 2 | 6 | 18 | 33 |
| **`dícheall` + `déanamh` frame** | 0 | **2** | 0 | 0 | **2** |
| **`dícheall` + `tabhairt` frame** | 0 | 0 | 0 | **1** | **1** |
| `ar a/mo/do dhícheall` (stative) | 0 | 0 | 3 | 1 | 4 |

### Citations

**`a dhéanamh` — attested, in vol II, which the 18 August run had already mined:**

- *do dhícheall **a dhéanamh**, ar sise* — vol II, speaker **04B10tn**
- *ag **déanamh** mo mhíle dícheall* — vol II, **04B6** (VN + genitive object, same verb)

**`a thabhairt` — attested, vol IV glossary headword:**

- *deoicheall, (dícheall). m. Utmost. (a) … SM **tá mo dh-~ tugthaí a m**, I have done my utmost.*

**The most frequent frame is neither** — it is the stative `ar a dhícheall`:

- *ar a sheacht míle **DHÍCHEALL*** — vol III, 866ESemr104
- *This echoes common **ar a dhícheall** (also pronounced dicheall, deoicheall)* — vol III, Ó
  Curnáin's own words
- *agus é ag obair, **ar a mhíle DICHEALL*** — vol III, 04B
- *892M -Tá mé **ar mo dhícheall**. -Ní ~ sin leat.* — vol IV

**False-positive hunt.** Two real traps here. (1) The vol IV *`a thabhairt`* attestation is written
`tá mo **dh-~** tugthaí a m` — the tilde stands in for the headword, so **no string search for
`dícheall a thabhairt` can ever find it**; it has to be found via the headword entry. (2) Vol I's 7
hits are **all phonology**, not usage: they are citations of how the word is *pronounced*
(`in d(h)ícheall … generally, including dhícheall 12J, but a dhícheall 12J, do dhícheall 04B`), and
several are duplicate context windows on the same passage. Counting them as usage evidence would be
wrong.

> ### Verdict — Probe 2
> **The vol IV finding of "`dícheall a dhéanamh` ZERO" is refuted.** It is zero *in vol IV*, but
> **`do dhícheall a dhéanamh` is directly attested in vol II** from speaker 04B, plus a second
> `déanamh` collocation from the same speaker. Both frames are attested and both are rare; on raw
> frequency `déanamh` (2) marginally leads `tabhairt` (1), and the genuinely *common* dialect frame
> is the stative `ar a dhícheall` (4). **Seed 7's existing `a dhéanamh` does not need changing.**
> Item 4 on the native-speaker list can be closed, or downgraded to "either is fine". **Confidence:
> high** for "both attested"; the two frames are too rare to rank by frequency.

---

## PROBE 3 — the how-to frame

### Counts

| | vol I | vol II | vol III | vol IV | total |
|---|---|---|---|---|---|
| `cén chaoi` (all) | 2 | 6 | 28 | 29 | **65** |
| **`conas`** | **0** | **0** | **0** | **0** | **0** |

### What follows `cén chaoi`, classified

| what follows | vol I | vol II | vol III | vol IV | total |
|---|---|---|---|---|---|
| **`a` / `ar` / `an` + FINITE verb** | 1 | 4 | 17 | 26 | **48** |
| `le` | 0 | 0 | 1 | 0 | **1** |
| **bare verbal noun, NO object** | **0** | **0** | **0** | **0** | **0** |
| **object + `a` + verbal noun** | **0** | **0** | **0** | **0** | **0** |
| metalinguistic mention / no clause | 1 | 2 | 10 | 3 | 16 |

Every real how-question in all four volumes takes an **indirect relative clause with a finite
verb**. Representative citations:

- *Cén chaoi **a ndíontaí** im fadó?* — vol II
- *Cén chaoi **a scanródh** mise í?* — vol II, 41S
- *Cén chaoi **an bhfaightheá** é sin?* — vol II / vol III, 79S
- *Cén chaoi **a bhféadfadh** sé LE clann mac Uisne a chur chun báis* — vol III, 866ESc35.26
- *CÉN CHAOI **A D ÉIRIGH** lib?* … *CÉN CHAOI **A D ÉIRIGH** leis sin?* — vol III, M
- *Cén chaoi **a ndéantaí** anseo sa taobh seo tíre é?* — vol IV, sample text
- *Cén chaoi **a bhfuil** tú thiar?* — vol IV, M
- *Cén chaoi **ar bhris** sí a láimh?* — vol IV

The single `le` hit is a **song line**, and the same line is recorded elsewhere with `a`:
*cén chaoi **LE** mbíonn mo chroí* (vol III) against *cén chaoi **a** mbíonn mo chroí* (vol IV). It
is register/older relative marking, not a productive `cén chaoi le` + VN frame.

**False-positive hunt.** 16 of the 65 hits are not questions at all — they are Ó Curnáin discussing
the words (*"elided … before caoi in cén chaoi, sé an chaoi"*; *"cén chaoi, cén fáth, cén t-údar,
cén uair, etc."*). These are excluded from the classification above. The vol IV index confirms the
frame is interrogative: *`caoi`, f, manner, way, … **interr cén chaoi `how`** 2.91, 6.88 n., 8.51…*

> ### Verdict — Probe 3
> **No.** `cén chaoi labhairt` — bare, objectless verbal noun — has **zero support in 65 instances
> across all four volumes**. So does object + `a` + verbal noun *directly after `cén chaoi`*. The
> dialect frame is exclusively **`cén chaoi` + `a`/`ar` + finite verb** (48/48 of the classifiable
> how-questions). Seed 3's objectless form should be rebuilt as a finite clause. **Confidence:
> high** — this is the largest and cleanest sample in the whole job.
> **Bonus: `conas` is 0 in all four volumes**, confirming the 18 August ruling estate-wide, not just
> in vol IV.

---

## PROBE 4 — orthography pairs

### The two named pairs

| | vol I | vol II | vol III | vol IV | total |
|---|---|---|---|---|---|
| **`eicínt`** | 8 | 25 | 75 | 58 | **166** |
| `éigin` (raw) | 9 | 9 | 21 | 16 | 55 |
| — of which **`ar éigin` "hardly, barely"** (different word) | 2 | 1 | 18 | 11 | **32** |
| — of which `b'éigin` / `is éigean` "must, obliged" (different word) | 1 | 7 | 2 | 3 | **13** |
| — of which metalinguistic mention / index / cross-reference | 6 | 1 | 1 | 1 | **9** |
| **`éigin` as a genuine indefinite in running speech** | **0** | **0** | **0** | **1** | **1** |
| | | | | | |
| **`amáireach`** | 6 | 14 | 31 | 22 | **73** |
| **`amárach`** | 0 | 0 | 1 | 1 | **2** |

**This is the probe where a raw count would have misled you most.** `éigin` looks like 55 against
166 — a respectable 1:3. It is not. Every one of the 55 was classified, and the residue read by
hand:

- **32 are `ar éigin` / `ar éigean`, "hardly, barely"** — an unrelated lexeme. (*"AR ÉIGIN a
  tharrainn muid as í"*; *"Air éigin Dé chuir mé aon phínn air"* M; *"Thug mé an ~ liom ar éigin,
  I passed through by the skin of my teeth"*.)
- **13 are `b'éigin` / `ab éigin` / `narbh éigin` / `is éigean`**, "must, was obliged to", from
  *éigean* 'necessity' — also unrelated. They dominate vol II's column because vol II is discussing
  the copula before `fh-`. Vol IV indexes this separately: *`éigean, éigin, in is ~ dho `necessary,
  has to``*.
- **9 are Ó Curnáin naming the word to discuss it**, or index cross-references (*"For éigin … see
  1.382"*; *"The adjective éigin ~ éigean is classified under fhV"*).
- **That leaves exactly 1 genuine indefinite "some" in the whole four volumes** — and it is not
  speech: *rud **éigin** a deir tú* — vol IV, **43M`lt`**, where the `lt` suffix marks a **written
  letter**.

⚠️ **A methodological warning for anyone re-running this.** My first partition script reported 18
"genuine" hits. That was a **case-sensitivity bug** — vols III and IV print highlighted citations in
capitals, so `AR ÉIGIN` slipped past a case-sensitive `ar` test and landed in the residual bucket.
The corrected figures are above. A partition script is not to be trusted until its residual bucket
has been read line by line.

One more piece of context Ó Curnáin supplies himself, vol III: *"**éigin**, 45Có often, probably
used by 45Có **not just in my presence**"* — the author flagging `éigin` as one speaker's marked
usage and explicitly weighing **observer effect**. And vol I §1.416 states the dialect form plainly:
*"The indefinite adjective **eicínt** (éigin) is consistently transcribed as cliticised…"*

**Decisively, `éigin` is asterisked non-attested in the vol IV index**, on the `eicín` headword,
which carries eleven dialect variants and the standard form marked as not recorded:

> **`eicín`, eicíneach, eicíneacht, `eicínt`, eicínteach, eicínteacht, eichín, eichíneacht, icín,
> icíneach, cínt, `éigin*`, a., `some`**, 1.238, -382, 5.381, 8.151, -243 …

**`amárach` is decided by the asterisk, not the count.** Vol IV index:

> **`amáireach`, máireach, `amárach*`, adv, `tomorrow`**, 1.190, -211, 5.375, 6.74, 7.41, 8.150,
> -200-201, 9.14 …

Per the vol I key, `amárach*` is a **non-attested form**. Of its 2 raw hits: one is the vol IV index
line itself (i.e. the asterisked non-attestation), and one is vol III `866E-Sc34.15`, a **published
folklore transcription** — a genre Ó Curnáin elsewhere warns about explicitly, in this very corpus:
*"this may have been normalised by the folklore collector."* So `amárach` has **zero unqualified
attestations in Iorras Aithneach speech**.

### Running speech vs headword/glossary

Vols I–III are grammar and are almost entirely *citations* — short quoted utterances with a speaker
code (`11C`, `892M`, `04B`, `Mq` = elicited from Máire by query). Vol IV is glossary + index +
transcribed sample texts. So:

- **`eicínt`**: 21 of the vol IV hits are inside running sample-text speech (e.g. *"rud eicínt sa,
  sa gcloigeann, mar a déarthá"*, *"rud eicínt agus gur maraíobh é"* 11C), plus glossary entries
  *`eicínt, (as adv) somewhat`* and *`eicínt, see EICÍN`*. It is both a headword **and** pervasive in
  speech.
- **`amáireach`**: glossary headword *`amáireach, adv. Tomorrow. Anocht agus ~`* **and** running
  speech (*"is dóichí go mbeidh na postáchaí osclaí amáireach"* M; *"seachtain S AN oíche
  amáireach"* 43M; *"go dtiocthadh P san oíche amáireach"* M).
- **`amárach`**: zero in running speech, as above.

I could not automate this split reliably and did it by reading; treat the per-context numbers as
hand-counted, and the raw per-volume totals as machine-counted.

### Other standard-vs-Connemara pairs I noticed while reading

All word-boundary counts, all four volumes:

| Connemara | count | Standard | count | ratio | note |
|---|---|---|---|---|---|
| `aríst` | 16 / 37 / 76 / 50 = **179** | `arís` | 3 / 7 / 7 / 2 = **19** | 9:1 | **vol IV index: `aríst, ríst, arís*`** — `arís` is asterisked **non-attested**. Its 19 hits are metalinguistic or older song/folklore text. |
| `chuile` | 38 / 37 / 147 / 105 = **327** | `gach uile` | 7 / 4 / 28 / 5 = **44** | 7:1 | vol I lists `achuile` → `gach uile` as a *dialect-spelling* convention, so many `gach uile` hits are Ó Curnáin's own standard-form glosses, not speech. |
| `céard` | 33 / 37 / 172 / 82 = **324** | `cad` | 11 / 0 / 9 / 4 = **24** | 13:1 | `cad` is heavily false-positive: vol I's 11 include a **Seán Ó Ríordáin epigraph in Munster Irish** at the front of the volume; vol III's are a historical discussion of `cad eile > …`, `cad ar a shon`. |
| `tá muid` | 0 / 3 / 15 / 16 = **34** | `táimid` | **0 / 0 / 0 / 0** | ∞ | confirms the 18 Aug vol IV finding across all four. |
| `acub` | 47 / 75 / 207 / 147 = **476** | `acu` / `acú` | 18 / 19 / 121 / 51 = **209** | 2:1 | both are dialect; vol I's spelling key lists `acub`/`acú` **both** as dialect spellings for standard `acu`. **Not a standard-vs-dialect pair** — do not use it as one. |

The three pairs worth acting on are `aríst`/`arís*`, `eicínt`/`éigin*` and `amáireach`/`amárach*` —
in all three the standard form is **asterisked as non-attested** in Ó Curnáin's index.

> ### Verdict — Probe 4
> **The corpus is not merely "against us" — it is emphatic, and stronger than the 18 August read.**
> **All three standard forms — `éigin*`, `amárach*`, `arís*` — are formally marked non-attested** in
> this dialect by Ó Curnáin's own asterisk convention. `éigin` survives as a genuine indefinite in
> exactly **one** instance across four volumes, and that one is a written letter, not speech.
> Fork 9 is a policy question about the ratified orthography line, and that remains Kai's call — but
> the evidence side of it is now closed: **`eicínt`, `amáireach`, `aríst`.** **Confidence: high.**

---

## PROBE 5 — `iarracht` and `iarraidh`

### Counts

| form | vol I | vol II | vol III | vol IV | total |
|---|---|---|---|---|---|
| **`iarracht`** | 2 | **0** | 6 | 1 | **9** |
| **`iarracht a dhéanamh` frame** | **0** | **0** | **0** | **0** | **0** |
| `iarraidh` | 33 | 62 | 127 | 98 | **320** |
| — of which `ag iarraidh` | 21 | 34 | 68 | 64 | **187** |

### The false-positive hunt is the finding

All 9 `iarracht` hits were read. **None is an ordinary Iorras Aithneach use of "an attempt":**

- **vol I (2 hits)** — both are the **Seán Ó Ríordáin epigraph** printed at the front of the volume:
  *"Cad is fear nó bean, tar éis an tsaoil, ach **iarracht** a deineadh ar an gcinniúint a throid. Dá
  chalma an **iarracht** is ea is mó is fear é nó is bean í."* This is **Munster literary Irish**
  (`deineadh`, `cad`), by a Cork poet, quoted as a dedication. It is not dialect evidence at all.
- **vol III (6 hits)** — **all six are one elicitation session about lenition after ordinals**, with
  `iarracht` used purely as the test noun: *"seod é a shéú **IARRACHT**"*, *"seod é a thríú
  **IARRACHT** déag"*, *"a GCÉAD / a DTRÍÚ / a SHÉÚ / a THRÍÚ **iarracht** (déag) Mq, a CEATHRÚ
  **iarracht** / hiarracht Mq"*. `Mq` = elicited from Máire under direct questioning, and the sense
  is "go, turn" (*his sixth go*), not "attempt to do something". Six hits, **one** underlying datum.
- **vol IV (1 hit)** — the bare index line: *`iarracht, f, attempt, try, 9.110.`*

So: **`iarracht` in genuine running Connemara speech across 4 volumes ≈ 0**, and the frame
**`iarracht a dhéanamh` is 0 in all four volumes** — not one instance, in either order, within 30
characters.

By contrast `ag iarraidh` is everywhere (187), in exactly the "trying to / wanting to" sense:

- *an fear a bheadh **ag iarraidh** na mná óige le pósadh* — vol IV, sample text
- *Teachtaire **ag iarraidh** mná* — vol IV, 869P, a text title
- *Bhíd se **ag iarraidh** bheith chun cinn ar chuile dhuine* — vol IV
- *ag guibhe, **ag iarraidh** orthub* — vol III, 881J

**And the dialect does have a "try" word — it just isn't `iarracht`.** Vol IV glossary:

> **`traíáil2`, (triail2), v. 1. `Try`.** … é a th-~. ~ anis e, *Tá me ag cheapadh go dtraíála me
> síos í* M *(try to put an infant down…)*
>
> **`traíáil1`, (triail1), f. 1. `Attempt, chance at, go`.** *Ba mhaith liom ~ a fháil air.*

⚠️ **`triail` cannot be counted by string search** — this is the `caith` problem again. Vol II's 3
`triail` hits are a **different lexeme**: *"Noun triall > verb triail ~ trial `journey, head (for)`"*,
indexed as *`triail, trial, triall*, v, journey, travel`*. Three homographs (`triail1` attempt,
`triail2`/`traíáil` try, `triall` journey) share one spelling. Any count of `triail` mixes them.

> ### Verdict — Probe 5
> **`iarracht a dhéanamh` has zero support in all four volumes**, and `iarracht` itself has zero
> unqualified running-speech attestations — its 9 hits are a Munster epigraph (2), one ordinal
> elicitation counted six times (6), and an index line (1). This is the strongest negative result in
> the job. **Fork 3 / seed 8 (`Tá mé chun iarracht a dhéanamh …`) is unsupported by Ó Curnáin.** The
> report already rated it confidence **C** and "the ruling I most expect you to challenge"; the
> corpus now agrees with that instinct. If a "try" word is wanted, the dialect's own is
> **`traíáil`** (< English *try*), attested as a glossary headword with the gloss "Try" —
> **but note this collides with the course's standing ban on `ag triail`**, so it is a native-ear
> question, not something to apply. **Confidence: high** on the negative; **do not act on `traíáil`
> without a native ruling.**

---

## Summary table

| probe | question | answer | confidence |
|---|---|---|---|
| **1** | `Labhraím beagán Gaeilge` or `Tá beagán Gaeilge agam`? | **`Tá beagán Gaeilge agam`.** No present tense of `labhair` is recorded anywhere in Ó Curnáin's paradigm; the possession idiom is attested in all 4 vols | high |
| **2** | `dícheall` + `dhéanamh` or `thabhairt`? | **Both attested; vol IV's "dhéanamh ZERO" refuted by vol II (04B).** Seed 7 needs no change | high |
| **3** | Is bare `cén chaoi labhairt` possible? | **No. 0 of 65.** Frame is `cén chaoi` + `a`/`ar` + finite verb (48/48). `conas` 0/4 vols | high |
| **4** | `eicínt`/`éigin`, `amáireach`/`amárach` | **`eicínt`, `amáireach`, `aríst`.** All three standard forms marked **non-attested** by Ó Curnáin's own asterisk | high |
| **5** | `iarracht a dhéanamh`? | **Zero in all four volumes.** All 9 `iarracht` hits are artefacts. Fork 3 unsupported | high |

## Gaps and limits

- **No download or extraction gap.** All four volumes fetched (HTTP 200) and extracted.
- **Phonetic transcription is unreadable** — custom font, extracts as garbage. Every count here is
  **orthography only**. A form that Ó Curnáin records *only* in phonetic transcription would be
  invisible to me. This is the single biggest limitation and it applies to all five probes.
- **Absence in vol IV is weak evidence** (glossary), as flagged in the brief. Absence across all
  four, with a working calibrator, is much stronger — and Probes 3 and 5 are that.
- **The running-speech vs headword split in Probe 4 is hand-counted**, not machine-derived.
- **I have not touched the database, the course, or any audio.** Nothing here is applied. Every
  verdict is a recommendation for a native ear or for Kai's ratified-orthography policy call.
