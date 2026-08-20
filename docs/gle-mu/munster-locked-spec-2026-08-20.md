# Munster (Corca Dhuibhne) — THE LOCKED SPEC for `gle_mu_for_eng`

**This document overrides both evidence documents where they disagree.** It is the single authority
for translating the 668 seeds. Reconciled 2026-08-20 by the coordinating session from
`evidence/munster-sources-and-lexicon-2026-08-20.md` (#531) and
`evidence/munster-grammar-spec-2026-08-20.md` (#532), plus the coordinator's own re-probes.

**BINDING RAIL (Kai, 2026-08-20):** the dialect form *as actually spoken* beats the standard
spelling, always. "A learner cannot look this up in the standard dictionary" is an explicitly
REJECTED objection.

**ZUT RAIL:** one English prompt → exactly one Munster form. If two Munster forms are both good,
the course picks one and uses it everywhere. Never vary for elegance.

---

## 0. Sources, and what each is worth

| Source | What it is | Weight |
|---|---|---|
| **Ó Sé, *Gaeilge Chorca Dhuibhne*** (ITÉ 2000) | The West Kerry descriptive grammar. Free on archive.org. | **Primary.** But see the data/metalanguage trap below. |
| **Dillon & Ó Cróinín, *Teach Yourself Irish*** (1961) | A complete graded beginners course *in West Munster Irish*. Our exact register. | **Primary for frames.** But it standardises *spellings* — it says so itself. |
| **Ó Criomhthain, *An tOileánach*** (1929) | Native Blasket prose — Corca Dhuibhne. | **Primary for idiom.** Older orthography. |
| corpas.ie CNG, source-partitioned MU/CO/UL | 100M-word national corpus | Good for MU-vs-CO-vs-UL ratios. Not dialect-tagged natively. |

Texts on disk (gitignored): `scripts/gle-mu/corpus/{ose-gcd,tyi-alt,oileanach}.txt`

### THREE TRAPS. Read these before you quote a number at anyone.

1. **`tyi1961.txt` is an ACCENT-STRIPPED OCR.** It renders *tá* as *ta* and *Seán* as *Sean*, so
   `tá` counts **0** in it. Every accented-word zero on that file is an artefact. **Use `tyi-alt.txt`**
   (calibrates clean: tá=178, bhí=45, agus=262).
2. **Ó Sé's own prose is standard Irish; only his quoted data is Corca Dhuibhne.** Data lines carry a
   phonetic transcription and a bracketed speaker number. This single distinction reverses the
   `Gaeilge`/`Gaelainn` and `éigin`/`éigint` results.
3. **Word-boundary your regexes.** A probe for `éasca` matches inside `pléascach` ("plosive") and
   returns 55 false hits. `láithreach` returns 58 hits in Ó Sé and *every one* is the grammatical
   term `aimsir láithreach`, "present tense". `éigin` raw counts are inflated by `ar éigin` ("barely").
   **Calibrate against a known positive before trusting any zero.**

---

## 1. THE LOCKED TABLE — one English frame, one Munster form

| # | English frame | **USE THIS** | Confidence | Evidence |
|---|---|---|---|---|
| 1 | I am | **táim** | confident | Ó Sé §530; MU 519 / CO 20 |
| 2 | you are (sg) | **tánn tú** | confident | tánn tú MU 249 / CO 0 |
| 3 | he/she is | **tá sé / tá sí** | confident | |
| 4 | we are | **táimid** | confident | MU 649 / CO 48. **Never `muid`** — MU 36 vs CO 11,150 |
| 5 | you are (pl) | **tánn sibh** | best attempt | |
| 6 | they are | **tá siad** | confident | *táid* is real but recessive — do not teach |
| 7 | I'm not | **nílim** | confident | MU 142 vs *níl mé* 13 |
| 8 | are you…? | **an bhfuil tú…?** | confident | **`an bhfuilir` is 0** — the 2sg `-ir` is dead. Never use it |
| 9 | isn't / aren't…? | **ná fuil…?** | confident | `ná fuil` MU 1,161 / CO 1 |
| 10 | I was | **bhíos** | confident | MU 1,279 / CO 16 |
| 11 | you were | **bhís** | best attempt | |
| 12 | we were | **bhíomar** | confident | write `-mar` not Ó Sé's `-mair` (3–4:1 in modern Kerry) |
| 13 | they were | **bhíodar** | confident | MU 1,179 |
| 14 | I will be | **beidh mé** | confident | |
| 15 | we will be | **beimid** | confident | |
| 16 | I would be | **bheinn** | confident | |
| 17 | **I want to** | **teastaíonn uaim + [obj] a + VN** | best attempt | TY verbatim: *"do theastaigh uaim é do dhéanamh 'I wanted to do it'"*. **NOT `ag iarraidh`** — 0 in all of TY |
| 18 | **I'm trying to** | **táim d'iarraidh + VN** | confident | Ó Sé §686 verbatim |
| 19 | **I'm going to** | **táim chun + [obj] a + VN** | **confident** | TY verbatim: *"chun with a verbal noun: bhíos chun dul ann 'I intended to go there'"*; Ó Sé data *cad tá siad chun a dhéanamh?*; tOileánach ×7 |
| 20 | I'd like to | **ba mhaith liom + VN** | confident | keep separate from #17 — politeness register |
| 21 | I can / am able to | **is féidir liom + VN** | confident | Ó Sé *is féidir* 257; **`in ann` 0 in TY** |
| 22 | I have to / must | **caithfidh mé + VN** | confident | |
| 23 | I think that | **is dóigh liom go…** | confident | MU 1,617 / CO 106. **Never `sílim`** (Connacht/Ulster) |
| 24 | I don't (verb) | **ní + lenited verb** | confident | |
| 25 | do you…? | **an + eclipsed verb** | confident | |
| 26 | because | **mar gheall ar** / **toisc go** | confident | |
| 27 | but | **ach** | confident | |
| 28 | when (conj.) | **nuair a** | confident | |
| 29 | when? | **cathain?** | confident | MU 127 / CO 1. Never `cén uair` |
| 30 | why? | **canathaobh** | confident | Ó Sé 15, tOileánach 3. **Never `cén fáth`** (0 in Kerry) |
| 31 | if (real / unreal) | **má** / **dá** | confident | |
| 32 | how / how to | **conas** / **conas a** | confident | MU 918 / CO 16. **Never `cén chaoi`** |
| 33 | what | **cad** / **cad a** | confident | MU 2,351 / CO 29. **Never `céard`** (0 in Kerry) |
| 34 | here / there | **anso** / **ansan** | confident | MU 3,352 / 7,028; `anseo`/`ansin` ≈0 |
| 35 | this / that / yon | **so / san / súd** | confident | Ó Sé's inventory verbatim |
| 36 | **the Irish language** | **Gaelainn** | confident | **see §2 — this overrides #532** |
| 37 | **in Irish** (speech act) | **as Gaelainn** | confident | Ó Sé data ×2. **Do NOT inherit Connemara's `i nGaeilge`** |
| 38 | I have Irish | **tá Gaelainn agam** | confident | |
| 39 | something / some | **éigint** | confident | see §3. **Never `eicínt`** (Connemara; 0 in Kerry) |
| 40 | everyone | **gach aoinne** | confident | Ó Sé 14; `chuile dhuine` 0 |
| 41 | anyone / people | **aoinne** / **daoine** | confident | |
| 42 | tomorrow | **amáireach** | confident | Ó Sé 15, TY 24, tOil 21; **`amárach` 0/0/0** |
| 43 | a little | **beagán** / **beagáinín** | confident | |
| 44 | quickly | **go tapaidh** | confident | `go tapa` 0/0 |
| 45 | easily | **go héascaidh** | best attempt | tOileánach 7 (`go h-éascaidh`). Bare `éasca` is 0 |
| 46 | soon | **gan mhoill** | confident | TY glosses it "without delay, soon" |
| 47 | later / by and by | **ar ball** | best attempt | tOileánach, adverbial sense. Thin but genuine |
| 48 | I did / made | **dheineas** | confident | `ní dhein` not `ní dhearna` |
| 49 | I saw / I see | **chonac** / **chím** | confident | |
| 50 | I went | **chuas** | confident | |
| 51 | I got | **fuaireas** | confident | |
| 52 | I said | **dúrt** | confident | |
| 53 | I heard | **chualas** | confident | |
| 54 | yes / no (copula qs) | **sea** / **ní hea** | confident | verb questions still echo the verb: *An bhfuil…?* → *Tá* / *Nílim* |
| 55 | under / about | **fé** | confident | MU 2,573 / CO 25 |
| 56 | X is a Y | **Y is ea X** | confident | *Múinteoir is ea mé*, not *is múinteoir mé* |
| 57 | in the house | **sa tigh** | confident | `sa` LENITES. Connacht's *sa mbaile* is not Munster |
| 58 | to try (as infinitive) | **`d'iarraidh`** | confident | **§5 RESOLVED** by job #552: the word is `iarraidh`, and Kerry writes `d'iarraidh` — 41 hits in native Blasket prose. `iarracht` is a *discrete attempt*, not the frame. `féach le` meaning "try to" is 0 in Munster. |

---

## 2. `Gaelainn`, not `Gaeilge` — THE headline ruling

**This overrides #532's locked table, which wrote `Gaeilge`.**

- Every `Gaelainn` in Ó Sé sits inside a **phonetically-transcribed line of real Dingle speech**
  (`is foghlaimeoir Gaelainn ansan (1)`, `ní fhiafraíodar in aon chor de an raibh Gaelainn aige (21)`,
  `bhí a ainm as Gaelainn (1)`). His 278 `Gaeilge` hits are his **own standard-Irish prose about the
  dialect** — metalanguage, not data.
- **An tOileánach: `Gaoluinn` ×5, `Gaeilge` ×0.** (`Gaoluinn` is the older Munster spelling of the
  same word; `Gaelainn` is Ó Sé's modern spelling and the one we write.)
- **Teach Yourself Irish confesses the substitution in its own preface**, verbatim:
  > "For baochas 'thanks', **Gaoluinn 'Irish' of the dialect, we use the prescribed spellings buíochas
  > and Gaeilge respectively**, but the pronunciation is always [the dialect one]."
- corpas.ie: `Gaelainn` 576, `Gaoluinn` 188 — both are live written forms, not phonetic inventions.

Under the binding rail, TY's confession decides it. **Write `Gaelainn` everywhere.**

**And `as Gaelainn`, not `i nGaeilge`.** Connemara evidence found `as Gaeilge` absent there and blessed
`i nGaeilge`. **Kerry is the other way round.** Ó Sé files `as Gaelainn` under the preposition `as`
alongside `as Béarla`. No Kerry attestation of `i nGaeilge` was found. **Do not inherit the Connemara ruling.**

---

## 3. `éigint`, not `éigin` — and why the raw count lies

- Ó Sé's **quoted speech** says `éigint`, 8×, every one phonetically transcribed with a speaker
  number: *rud éigint a thabhairt go dtím mháthair (6)*, *duine éigint (1)*, *in áit éigint (1)*.
- Ó Sé's **own metalanguage** says `éigin`, 93× — *foirm éigin*, *ar shlí éigin eile*. Not data.
  (And 6 of those 93 are `ar éigin`, "barely" — a different lexeme.)
- An tOileánach and TY print `éigin`, but both are editorially standardised texts.

**The sound is `éigint`; the print tradition writes `éigin`.** Per the binding rail: **`éigint`.**
This is a genuine tension between field recording and print, unlike `amáireach` where all sources agree.
Flagged honestly rather than buried.

---

## 4. Grammar rules that will hit dozens of seeds

### 4a. `ná`, not `nach` — Munster negative
`ná fuil` MU **1,161** / CO 1. Ó Sé's chapter heading is literally *"An mhír cheisteach dhiúltach ná"*.

**RULE: `ná` replaces `nach`, in negative questions AND negative subordinate clauses. It takes the
DEPENDENT form and does NOT eclipse.**
- *Ná fuil sé anso?* — "Isn't he here?"
- *Deir sé ná fuil sé anso.* — "He says he isn't here."
- Before a vowel: `ná h-`. Past: `nár`.
- **Exception: the copula keeps `nach`** (`nach ea!`) — but the strength varies by predicate, and
  a later build measured it rather than assuming:
  - **`nach féidir` is decisive** — 6 across the three Kerry texts, **`ná féidir` 0**. Always `nach féidir`.
  - **`maith` / `miste` are genuinely mixed** — `nach maith` 6 vs `ná maith` 5. The course uses
    `ná maith leat` / `ná miste leat` and that is defensible; do not "correct" it toward `nach`.
  So the exemption is real but is not a blanket rule. State the predicate before applying it.

### 4b. The indirect relative is `go` — **CONFIRMED, upgraded**
#532 listed this as its #1 unverified claim. **It is now confirmed** — Teach Yourself Irish teaches it
explicitly with a Munster-vs-standard contrast table, verbatim:
> `An fear go bhfuil a mhac san ospidéal` | (standard) `An fear a bhfuil a mhac san ospidéal`
> "an fear go bhfuil an t-airgead aige — the man who has the money"

Plus Ó Sé dialect data (*pén áit go bhfuil siad (7)*) and An tOileánach (*Aon duine go bhfuil cúntas
cruinn uaidh*). Corpus: `daoine go bhfuil` MU 91 / CO 25; `daoine a bhfuil` MU 9 / CO 52 — 10:1 for
`go` in Munster, and the ratio **inverts** in Connacht.

**"people who have Irish" → `na daoine go bhfuil Gaelainn acu`.** Confident.

### 4c. Preposition + article ECLIPSES — including `d` and `t`
`ar an dtaobh` MU **118** / CO 2. **RULE: after `ar an`, `ag an`, `leis an`, `ón`, `don`, `insan` —
eclipse, including `d-`→`nd-` and `t-`→`dt-`.** *ar an dtaobh, ag an ndoras, ar an mbord, leis an bhfear.*
One of the most audible Munster signatures.

**But `sa` LENITES:** `sa tigh` MU 141 / CO 1. Never Connacht's `sa mbaile`.

### 4d. `a` + verbal noun when the object fronts
- Plain progressive → **`ag` + VN**: *Táim ag foghlaim Gaelainne.*
- Object fronted → **`a` + lenited VN**: *Gaelainn a labhairt. Rud a rá.*
- Object relativised out → **`a` + VN**: *Cad a bhíodar a dhéanamh?* (Munster extends `a` into the
  relative progressive where the Caighdeán keeps `ag`.)

*(Note: TY sometimes writes this particle `do` — `é do dhéanamh`. We follow Ó Sé §683 and write `a`.
Flagged as a knowing choice.)*

### 4e. Copula
- `ní` and `an` **suppress mutation** in copula clauses: *ní maith*, NOT *ní mhaith*. Easy to get wrong.
- Past/conditional: `ba` / `ab` (before vowel) / `níor(bh)` / `ar(bh)` / `gur(bh)` / `nár(bh)`.

### 4f. Eye-dialect line — REJECTED spellings
Write `táimid` not *táimíd*; `-mar` not *-mair*; `bhímis/bhídís` not *bhímíst/bhídíst*; `leo` not
*leothu*; `tánn tú` not *taoi/táir*; `arís` not *aríst*. And never an IPA form.

---

## 5. THE ONE REAL HOLE — "to try to"

**`táim d'iarraidh + VN` covers "I'm TRYING to"** and is confident (Ó Sé §686 verbatim).

What is **not** resolved is `try` as a bare infinitive — "I'm going to **try to** explain", "I want to
**try**". The evidence:
- `féachaint le` — **0 in Ó Sé, 0 in TY, 0 in An tOileánach.** The brief's hypothesis is unconfirmed
  and must not be asserted. (Ó Sé has `féachaint` 23×, every one meaning *looking*.)
- `triail` as a verb — **0 everywhere.**
- `iarracht` — attested as a **noun** (TY glossary: *iarracht f. attempt, try*), but all three
  `iarracht a dhéanamh` hits in Ó Sé are **his own metalanguage prose**, not dialect.

**RULING (best attempt, flagged for a Kerry speaker):** use **`iarracht a dhéanamh + [obj] a + VN`**.
It is built from a Kerry-attested noun and a Kerry-attested frame, and it does not assert an
unattested collocation. **Label every seed that uses it `genuinely uncertain`.**

---

## 6. Known-side English — DO NOT EDIT

The 668 English prompts are copied verbatim from the Connemara course so both courses teach the same
English. This includes Kai's Hiberno-English ruling at seeds 9, 13, 22 — "I have Irish", not
"I speak Irish". **Translators must not change the English side.** No bracketed glosses — they get
read aloud.

Seeds **68 and 194** carry the *identical* English prompt ("what are you looking for?"). They must get
the identical Irish. Forced pair.

---

## 7. Confidence labels — MANDATORY

Every seed gets one:
- **confident** — the frame and every word in it are in the locked table above, or directly attested.
- **best attempt** — reasoned from attested Kerry material, but this exact sentence is not attested.
- **genuinely uncertain** — contains an unresolved item (chiefly `try`), or a construction the
  sources do not settle.

"Needs a native speaker" is **not** an acceptable answer. We have no Munster speaker. Kai's ruling is
that we attempt the work and flag the weak ones for a speaker later.
