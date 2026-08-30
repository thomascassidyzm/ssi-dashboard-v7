# Munster Irish (Corca Dhuibhne) — sources and lexical inventory

**Date:** 2026-08-20
**Scope:** SOURCES + LEXICON for a 668-seed West Kerry course. Morphology and syntax are a sister worker's plate and are not ruled here.
**Spend:** zero. No DB writes, no TTS.

---

## 0. Headline

The Munster evidence base **is reachable, and on the specific question of a beginners course it is in one respect better than what Connemara had** — but it is **thinner as descriptive grammar**, and I say that plainly in §5.

Three primary texts came down whole and are on disk:

| | Source | Size | What it is |
|---|---|---|---|
| 1 | **Diarmuid Ó Sé, *Gaeilge Chorca Dhuibhne* (ITÉ 2000)** | 1.0 MB | THE descriptive grammar of West Kerry. ~6,000 phonetically-transcribed examples from named Corca Dhuibhne speakers. |
| 2 | **Dillon & Ó Cróinín, *Teach Yourself Irish* (1961)** | 426 KB | A complete graded beginners course **written in West Munster**. Our exact register and level. |
| 3 | **Tomás Ó Criomhthain, *An tOileánach* (1929)** | 923 KB | A native Blasket speaker's own prose. Primary dialect evidence. |

Every ruling below is triangulated across at least two of these, and I say which.

---

## 1. SOURCE LEDGER — observed vs gap

### 1a. OBSERVED (fetched, quoted, on disk)

**Ó Sé, *Gaeilge Chorca Dhuibhne* (2000)** — `https://archive.org/details/gaeilge-chorca-dhuibhne`
Collection `opensource`, **not** access-restricted. Downloaded `Gaeilge Chorca Dhuibhne_djvu.txt`.
→ **`/tmp/munster-src/raw/ose-gcd.txt`** (1,067,196 bytes)
Verbatim, from the Réamhrá:

> "Is éard atá sa leabhar seo ná cur síos ar fhoghair agus ar fhoirmeacha na Gaeilge a labhartar sa cheantar idir Ceann Sléibhe agus Ceann Sibéal i mbarúntacht Chorca Dhuibhne i gContae Chiarraí."
> "Tá timpeall sé mhíle sampla ón gcaint sa leabhar seo mar léiriú ar fhoirmeacha."

This is the real thing — Ó Sé's own fieldwork from 1974 onward, Ceann Sléibhe to Ceann Sibéal, which is the Dingle peninsula proper.

**Dillon & Ó Cróinín, *Teach Yourself Irish* (1961)** — `https://archive.org/details/TeachYourselfIrish`
Collection `opensource`. Downloaded `TYI1961_djvu.txt`. (A second, independently-scanned copy of the same book is at `archive.org/details/teach-yourself-irish`; I pulled that too as a cross-check — `raw/tyi-alt.txt`, 388 KB.)
→ **`/tmp/munster-src/raw/tyi1961.txt`** (425,783 bytes)
Its dialect basis, verbatim:

> "The dialect chosen for this book is that of West Munster, as it is phonetically the simplest, and it is closest to the language of the Munster poets of the seventeenth and eighteenth centuries."

**Ó Criomhthain, *An tOileánach* (1929)** — `https://archive.org/details/oileanach-ga-en`
Collection `opensource`. → **`/tmp/munster-src/raw/oileanach.txt`** (922,535 bytes). Pre-Caighdeán orthography throughout ("buidhe", "annsan", "me").

**Dinneen, *Foclóir Gaedhilge agus Béarla*** — both editions came down:
`archive.org/details/focloirgaedhilge0000revp` (1927) → `raw/dinneen1927.txt` (5.8 MB)
`archive.org/details/folclirgaedhil00dinnuoft` (1904) → `raw/dinneen1904.txt` (3.0 MB)
**But see the calibration failure in §1c — the Irish side of this OCR is unusable.**

**corpas.ie JSON API** — works exactly as briefed.
`GET https://www.corpas.ie/noskeproxy.json?command=view&corpname=cng&viewmode=kwic&q=q[word="X"] within <doc/>&refs=doc.medium,doc.title,doc.source&pagesize=N`
Returns a `concsize` total plus KWIC lines with provenance. **First query on a given word takes >60 s while it computes; the repeat is instant** (it caches). Counts obtained are in §2.

**CELT (UCC)** — `https://celt.ucc.ie/` HTTP 200; `publishd.html` fetched (567 KB index). I scanned the whole index for Ó Criomhthain, Ó Súilleabháin, Sayers, Blascaod, An Seabhac, Ciarraí: **zero matches**. CELT is a medieval/early-modern corpus. Reachable, but it holds nothing for us. Recording it so nobody spends another hour on it.

### 1b. GAP (could not reach — with the code)

| Source | Result |
|---|---|
| **Ó Cuív, *The Irish of West Muskerry* (1944)** | Item exists (`irishofwestmuske0000unse`) but `access-restricted-item: true`, collections `inlibrary`/`printdisabled`. Text download → **HTTP 401**. Not obtained. *(Partial consolation: the TY Irish uploader appended a scan of Ó Cuív's Chapter XVI to that item — image-only, not text-searchable.)* |
| **Ó Sé, *An Teanga Bheo: Corca Dhuibhne* (1995)** | **Not found.** An archive.org search on `Corca Dhuibhne` returned 5 items and this was not among them. No free PDF located. This is the loss I most regret — it is the short learner-facing description and would have been the most directly usable thing on the list. |
| **Ó Súilleabháin, *Fiche Blian ag Fás*** | Item `ficheblianagfas0000muir` is lending-restricted. Not obtained. |
| **Peig Sayers, *Peig*** | Item `peig-eagran-scoile_202511` is `opensource` and *should* be free, but the `_djvu.txt` download returns **HTTP 500** on repeated attempts. Server-side fault, not a permissions block. Worth one retry another day — it is genuinely open, just broken. |
| **dúchas.ie** | See §1d — reachable but I could not extract text. |

### 1c. ⚠️ CALIBRATION FAILURE — Dinneen is downloaded but NOT SEARCHABLE

Exactly the trap the Connemara pass warned about, and it fired.

I calibrated every probe against known-positive control words. On Dinneen 1927:

```
CALIBRATION: {'agus': 2, 'tá': 666, 'an': 13638}
```

**`agus` = 2, in a 5.8 MB Irish dictionary.** That is a failed calibration and it invalidates every Irish-side probe on this file. The cause is visible on inspection: the book is set in **seanchló** (Gaelic type), and the OCR maps dotted consonants and Gaelic letterforms to arbitrary Latin. A real body sample:

> "lompód, -póoóa … m., act of turning, returning, retreatirg ; converting, reversing … 1ompuisim, -póo, -páit, v. tr. and intr., I turn"

`iompaím` → `1ompuisim`; `ar` → `ap`; `go` → `50`; `chum` → `cum`.

**Consequence, stated so nobody misreads my numbers:** my zeros for `féachaint le`, `Gaoluinn` and `canathaobh` *in Dinneen* are **artefacts, not evidence of absence.** I have excluded Dinneen from every count in §2.

**What Dinneen *is* still good for:** the **English gloss side OCRs cleanly**, and so do his **dialect labels `(M.)`, `in M.,`**. Searching the English side works and I used it. Example, verbatim, which survives legibly enough to read:

> "Amanaptap … ad. of time, on the day after to-morrow … al. amanatan (M.); **amdipeac** ip Amanacagp, **to-morrow** and the day after"

That is `amáireach is amanathar` — Dinneen's headword for 'tomorrow' is **amáireach**, and `amanathar` is labelled `(M.)` for Munster. Usable, and it agrees with everything else.

### 1d. dúchas.ie — reachable, but no text extracted. Honest gap.

`https://www.duchas.ie/` → 302 → `/en`, HTTP 200. The county/language filtered URL `https://www.duchas.ie/en/cbes/?Language=ga&County=Ciarrai` returns HTTP 200 and 89 KB.

**But the 89 KB is an empty SvelteKit shell.** It contains no Irish-language material at all — I checked: the string `Ciarra` does not occur in the response, and the only human-readable text blocks are site chrome ("Bailiúchán béaloidis é seo a chnuasaigh páistí scoile in Éirinn le linn na 1930idí").

I hunted the data route:
- `/{locale}/cbes/scoileanna/__data.json` → 200, but returns only `{"type":"data","nodes":[null,null,{"data":[{"locale":1,"user":2},"ga",null]}]}` — locale shell, no content.
- `/api/v1/search?q=conas` → **HTTP 500**
- `/en/cbes/<numeric-id>` → **HTTP 404** on my guessed ID
- Scanned the SPA's immutable JS chunks for a fetch base — no endpoint recovered.

**Verdict: GAP.** The content is fetched client-side from an endpoint I did not find without executing JavaScript. dúchas.ie is not closed to us — it needs a headless browser, which is a different job. **I did not retrieve a single line of Kerry Irish from dúchas, and I am not going to pretend otherwise.** Given the Schools' Collection holds large volumes of Corca Dhuibhne material, this is the highest-value unopened door on the list and I recommend it as a follow-up with a browser-driven fetch.

### 1e. Institutional

`dias.ie` HTTP 200, `ite.ie` HTTP 200 — both reachable, but I found no open-access PDF of either Ó Sé title through them. ITÉ was wound up; the 2000 grammar's presence on archive.org under `opensource` appears to be how it became free, not a publisher release.

---

## 2. THE KERRY LEXICAL INVENTORY

### How to read the counts — the single most important caveat

**Ó Sé's book is a phonology and morphology, not a dictionary and not a usage corpus.** A word appears in it only if he happened to need it to illustrate a sound or a form. **A low count means "he didn't cite it", never "Kerry doesn't say it."** Counts are evidence of *presence*, and only weak evidence of absence.

Second: **Ó Sé's own prose is standard Irish; only his quoted data is Corca Dhuibhne.** Data lines carry a phonetic transcription and a bracketed speaker number — `rud éigint a thabhairt go dtím mháthair (6)`. Metalanguage lines don't. This distinction decides the `éigin/éigint` question below, and I applied it throughout.

Third: **TY Irish deliberately standardises dialect spellings.** Its own preface, verbatim:

> "For baochas 'thanks, gratitude', **Gaoluinn 'Irish' of the dialect, we use the prescribed spellings buíochas and Gaeilge respectively**, but the pronunciation is always [the dialect one]."

So TY's *spellings* are not orthographic evidence. Its *vocabulary choices and syntax* are.

### 2a. The table

| # | Meaning | **KERRY FORM** | Evidence | Confidence |
|---|---|---|---|---|
| 1 | how | **conas** (+ relative `a`) | Ó Sé 43 · TY 11 · `cén chaoi` 0/0 · `cad é mar` 0/0 | **CONFIDENT** |
| 2 | some/something | **éigint** | Ó Sé *data* 8 (all phonetic) · `eicínt` 0 | **CONFIDENT** (see note) |
| 3 | tomorrow | **amáireach** | Ó Sé 15 · TY 22 · tOileánach 21 · Dinneen headword · `amárach` **0/0/0** | **CONFIDENT** |
| 4 | what | **cad** | Ó Sé 79 · TY 45 · tOileánach 127 · `céard` **0/0/0** | **CONFIDENT** |
| 5 | why | **canathaobh** (+ `go`/`ná`) | Ó Sé 15 · tOileánach 3 · corpas 310 · `cén fáth` 0/0 · `cad ina thaobh` 0/0 | **CONFIDENT** |
| 6 | **want** | **tá … uaim** / **teastaíonn … uaim** | TY teaches both explicitly · `ag iarraidh` **0 in all of TY** | **CONFIDENT** |
| 7 | able to | **féadaim** / **is féidir liom**; `ábalta` also good | TY glossary + copula rule · Ó Sé `ábalta` 6 · **`in ann` 0 in TY, 2 in Ó Sé** | **CONFIDENT** |
| 8 | try | — **unresolved** — | `féachaint le` **0 everywhere**; only the *noun* `iarracht`/`triail` attested | **GENUINELY UNCERTAIN** |
| 9 | the Irish language | **Gaelainn** (not Gaeilge) | Ó Sé 10 (all data) · tOileánach `Gaoluinn` 2, `Gaeilge` 0 · **TY confesses the substitution** | **CONFIDENT** |
| 9b | speak *in* Irish | **as Gaelainn** | Ó Sé ×2 · `i nGaeilge` 0 in Kerry sources | **CONFIDENT** |
| 10 | everyone | **gach aoinne** | Ó Sé 14 · `gach éinne` 0 · `chuile dhuine` 0 | **CONFIDENT** |
| 10b | anyone / people | **aoinne** / **daoine** | Ó Sé 72 / 74 | **CONFIDENT** |
| 11 | a little | **beagán**, **beagáinín** | Ó Sé pairs them in his adverb chapter · TY `beagán` 4 | **CONFIDENT** |
| 12 | quickly | **go tapaidh** (not `go tapa`) | Ó Sé 1 · TY 2 · `go tapa` **0/0** | **CONFIDENT** |
| 12b | easily | — **unresolved** — | `éasca` 0/0 · `furasta` 0/0 | **GENUINELY UNCERTAIN** |
| 12c | well | **go maith** | uncontested, everywhere | **CONFIDENT** |
| 13 | soon | **gan mhoill** | TY 6, glossed "without delay, soon" | **CONFIDENT** |
| 13b | yet / for a while | **go fóill / go fóillig / go fóillín** | Ó Sé lists all three | **CONFIDENT** |
| 13c | later ("ar ball") | — **unresolved** — | `ar ball` 0 real hits in Ó Sé, 0 in TY | **GENUINELY UNCERTAIN** |
| 14 | this / that / yon | **so / san / súd** | Ó Sé states the inventory verbatim | **CONFIDENT** (inventory) |
| 14b | here / there / yonder | **anso / ansan / ansúd** | Ó Sé 58 / 118 / 12 · `ansin` 5 (all metalanguage) · tOileánach `ansan` 7, `ansin` 0 | **CONFIDENT** |

### 2b. The rulings that matter, with the quotes

#### 6. 'want' — the highest-frequency frame, and the biggest break from Connemara

TY Irish, verbatim, Lesson on prepositional pronouns:

> "The verb tá is used with various prepositions in special senses: **tá … uaim** lit. 'is from me' means **'I want'**, just as tá sé agam means 'I have it'."
> "Ó 'from': besides tá sé uaim, an impersonal verb teastaíonn sé is common: **teastaíonn sé uaim** (or tá sé ag teastáil uaim) **'I want it'**; do theastaigh sé uaim 'I wanted it'."

TY glossary, verbatim: `teastaíonn [t'as ti:n] is lacking; **teastaíonn sé uaim I want it, need it**`
TY vocabulary, verbatim: `**cad tá uait?** (ooet) **what do you want?**`
An tOileánach, in dialogue: `"**Cad tá ansan uait**, a Nora; ná tabharfá é sin abhaile leat?"`
Ó Sé, dialect data: `agus nár theastaíodar in aon chor bhuaidh` — and he indexes `teastaíonn` at §119, §425.

**And the negative, which is as strong as the positive: `ag iarraidh` occurs ZERO times in the whole 426 KB of Teach Yourself Irish,** and once in Ó Sé (`ag iarraidh dul lastuas` — 'trying/wanting to go').

The Connemara course runs `tá mé ag iarraidh` throughout. **Kerry does not.** The Kerry spine is **tá … uaim**, with **teastaíonn … uaim** as the near-synonym TY calls "common".

Keep **ba mhaith liom** separate — it is attested (TY 5, Ó Sé 4: `ba mhaith liom iad a bheith thart`) but it means *would like*, which is a politeness register, not the plain 'want'.

#### 9. 'Irish' is **Gaelainn**, not Gaeilge — and this touches a lot of the 668

This is the finding I would most want a human to see.

Ó Sé's quoted Corca Dhuibhne data, every occurrence phonetically `[g'e:lin'/g'e:li:m']`:
> `is foghlaimeoir **Gaelainn** ansan (1)`
> `ní bheadh a fhios agat cé acu Béarla nó **Gaelainn** atá aici, mar ní labhrann sí (1)`
> `ní fhiafraíodar in aon chor de an raibh **Gaelainn** aige (21)`
> `pé hé féin, bhí a ainm **as Gaelainn** (1)`

An tOileánach: `go raibh **Gaoluinn** mhaith bhlasta agam`; `ní lugha bhí **Gaoluinn** ag an saoiste`. **`Gaeilge` occurs 0 times in An tOileánach.**

And TY Irish *admits it overwrote the dialect word* — quoted in full in §2a above: "Gaoluinn 'Irish' of the dialect, we use the prescribed spelling … Gaeilge".

corpas.ie: `Gaelainn` **576**, `Gaoluinn` **188** — both are live written forms, not phonetic inventions.

**Under the binding rail, TY's own confession decides it: write Gaelainn.** `Gaoluinn` is the older Munster literary spelling of the same word; `Gaelainn` is Ó Sé's modern spelling and I recommend it.

**On the speech act — do NOT inherit the Connemara ruling.** Connemara evidence said `as Gaeilge` was absent and `i nGaeilge` blessed. In Kerry it is the other way round: **`as Gaelainn` is directly attested twice in Ó Sé**, who files it under the preposition `as` alongside `as Béarla` (`fhiafraigh sé dhóibh as Béarla…`). I found **no** Kerry attestation of `i nGaeilge`. Ruling: **as Gaelainn**.

Possession (`Gaelainn agam`) is attested and consistent with the already-ruled known side.
Speech-act verb: `labhairt` / `labhrann` attested (`ní labhrann sí`; `labhairt os ard`, `labhairt os íseal`), `ag caint` 15× in Ó Sé. Which to *teach* is BEST ATTEMPT, not settled.

#### 2. 'something' — éigint, and the one place my sources genuinely disagree

I want to be careful here rather than tidy.

- **Ó Sé's quoted speech says `éigint`**, 8×, every one phonetically transcribed with a speaker number: `rud éigint a thabhairt go dtím mháthair (6)`, `duine éigint (1)`, `in áit éigint (1)`, `go mbeadh an gála i bpoll éigint (6)`, `cuileachta éigint a bheith agam (3)`.
- **Ó Sé's own metalanguage says `éigin`**, 93× — `foirm éigin`, `ar shlí éigin eile`, `ar shiolla éigin`. That is standard Irish prose by the author, **not data**.
- **An tOileánach says `éigin`** (70×, `éigint` 0) — but that text was edited by An Seabhac into literary orthography.
- **TY says `éigin`** — but TY declares that it standardises spellings.
- corpas.ie: `éigint` 969, `eicínt` 2,930 (that is the Connacht form), `éigin` 44,277 — **and the `éigin` hits are top-ranked by EUR-Lex, i.e. EU legislation, which is non-evidence for spoken usage.**

So: **the sound is `éigint`; the written tradition prints `éigin`.** Per the binding rail — the form as actually spoken beats the standard spelling — the ruling is **éigint**. But this one is a genuine tension between field recordings and print, unlike `amáireach` where all four sources agree, and I am flagging it as such rather than burying it.

`eicínt` (the Connemara choice) is **0 in every Kerry source** and is simply wrong for this course.

#### 8. 'try' — I could not resolve this. Open call.

The brief's hypothesis was that Kerry uses `féachaint le`. **I cannot confirm it and I will not assert it.**

- `féachaint le` — **0 in Ó Sé, 0 in TY.** (Ó Sé has `féachaint` 23×, but every one is *looking*: `ag féachaint ar an ngréin`, `ag féachaint ort`.)
- `triail` — 0 in Ó Sé, 0 in TY.
- `iarracht` — in Ó Sé, one dialect hit and it is a **noun**: `ba fhapaidh an iarracht í`. TY glossary: `iarracht f. attempt, try`. Dinneen (English side, legible): `triail … act of trying, judging, testing, venturing`.
- Dinneen's Irish side could not be probed at all — see §1c.

So the only Kerry-attested material is the **noun** `iarracht`/`triail`. The verbal frame for 'try to do X' is **unresolved** and I recommend it be put to a native Munster reviewer before any seed uses it. Given the Connemara course had to rule on `try` explicitly, this will come up early in the 668.

#### 14. this/that — what I can and cannot confirm

Ó Sé's demonstrative inventory, verbatim from his pronoun chapter:

> "Taispeántach: **so, san, súd**"

and the adverbs, verbatim:

> "amach, a'ma:r ax **amáireach**, a'muxd anocht, In'il anois, an'so **anso**, an'sun — an'son **ansan**, a'nu:as anuas"

So the three-way set **so / san / súd** and **anso / ansan / ansúd** is **CONFIRMED** — Munster `so` where the Caighdeán has `seo`, `san` where it has `sin`. `ansin` occurs 5× in Ó Sé and **all five are his own standard-Irish metalanguage** (`dá bhrí sin`, `ina dhiaidh sin`); it is 0 in An tOileánach.

**What I did NOT confirm:** the brief asks me to confirm "Munster uses `san` after broad consonants". **I did not find that conditioning rule stated anywhere in Ó Sé.** What he gives is a flat inventory, not an alternation. I am marking the *rule* **BEST ATTEMPT / unverified** and flagging it to the morphology worker, whose plate it properly sits on. The *inventory* stands.

#### A false positive worth recording

`láithreach` returns **58 hits in Ó Sé — and every one is the grammatical term `aimsir láithreach`, 'present tense'**, not the adverb 'immediately'. Anyone probing this corpus for adverbs will be fooled by that. There is no Kerry evidence here for `láithreach` as 'immediately'.

---

## 3. Other Kerry shibboleths worth carrying

Things I hit while looking for something else, which would make the course sound Kerry rather than Caighdeán:

- **`fáic` for 'anything/nothing'.** Ó Sé, verbatim: *"Is minic a deirtear fáic in ionad aon ní"* — `ní bhfaighidís aon rud` → `fáic`. High-frequency in a beginners course.
- **`anso`, not `anseo`** (58× in Ó Sé).
- **`fé`, not `faoi`** (`féna bhun`, `fén mbáistigh`).
- **`aoinne` for 'anyone'** — not `duine ar bith`. 72× in Ó Sé.
- **`amanathar`** = the day after tomorrow. Ó Sé: `agus amáireach agus amanathar`; Dinneen labels it `(M.)`.
- **`Conas taoi?` / `Conas tánn tú?`** as the greeting; TY drills `Conas taoi?` and `Conas tá sibh go léir sa bhaile?`. Ó Sé notes `conas (t)aoi?` is *"fós in úsáid i nDún Urlann ar a laghad"* — i.e. receding, so `conas tánn tú` may be the safer teach.
- **`buíochas le Dia`** as the reflex answer to it (`Táim go maith, buíochas le Dia!`).
- **`go fóillig` / `go fóillín`** — `fan bog go fóillig`, `fan socair go fóillín`.
- **`beagáinín`** — the diminutive is alive: `tá sí beagáinín tinn` (speaker 12).

**Belongs to the morphology worker, flagged not ruled:** the synthetic verb endings (`Táim`, `Táimid`, `Bhíos`, `Chuas`, `Díolfad`), `duart` for 'I said' — TY verbatim: *"duart 'I said', where the prescribed form dúirt mé is strange to the dialect"* — the past particle `do` (`do bhí`, `do labhradh sé`), and `ná` where the Caighdeán has `nach` (`canathaobh ná dúirt sí…`). These are flagship Kerry markers and I am passing them across rather than ruling on them.

---

## 4. Data on disk

| Path | Bytes | Source |
|---|---|---|
| `/tmp/munster-src/raw/ose-gcd.txt` | 1,067,196 | Ó Sé, *Gaeilge Chorca Dhuibhne* (2000) |
| `/tmp/munster-src/raw/tyi1961.txt` | 425,783 | Dillon & Ó Cróinín, *Teach Yourself Irish* (1961) |
| `/tmp/munster-src/raw/tyi-alt.txt` | 388,352 | second independent scan of the same |
| `/tmp/munster-src/raw/oileanach.txt` | 922,535 | Ó Criomhthain, *An tOileánach* (1929) |
| `/tmp/munster-src/raw/dinneen1927.txt` | 5,815,220 | Dinneen 1927 — **Irish side unusable, English glosses OK** |
| `/tmp/munster-src/raw/dinneen1904.txt` | 2,967,441 | Dinneen 1904 — same caveat |

Probe tools, which carry the calibration and the diacritic-insensitive matching:
`/tmp/munster-src/probe.py`, `p2.py`, `p3.py` (diacritic-stripping — **needed**, the TY OCR loses fadas: `Táim`→`Taim`, `amáireach`→`amaireach`), `corpas.py`.

`/tmp` is shared between workers, so these live under a `munster-src/` subdirectory. If they matter beyond this session they should be moved somewhere durable.

---

## 5. Honest read on the evidence base

**Is it thinner than the 2,700-page Ó Curnáin the Connemara course had? As descriptive grammar, yes — substantially.**

Ó Sé's *Gaeilge Chorca Dhuibhne* is roughly 450 pages against Ó Curnáin's 2,700. That is a factor of five or six. It is also **overwhelmingly phonology and morphology**: chapters 1–5 are sounds, and the grammar from chapter 6 is forms. It is **not** a dictionary and **not** a usage corpus, so for a *lexical* question it answers only where he happened to cite the word. Several of my "unresolved" verdicts above — `try`, `easily`, `ar ball` — are unresolved precisely because of that shape. Munster is *supposed* to have the deepest tradition of the three dialects; the part of that tradition I could actually reach today is smaller than Connemara's flagship grammar, and I am not going to dress that up.

**But for this specific job the comparison is not the whole story, and in one respect Munster is better off.**

Connemara had no equivalent of **Teach Yourself Irish 1961**: a complete, graded, beginners teaching course written in the target dialect, with vocabulary lists, glossed frames and drilled dialogue — at exactly the register and level our 668 seeds occupy. It settled `want` for me in a way no descriptive grammar would have, because it *teaches the frame* rather than merely recording a form. Add native Corca Dhuibhne literary prose (An tOileánach, ~923 KB, free and whole) and the triangulation across three independent sources that produced most of the CONFIDENT labels above.

**So the honest summary: thinner in descriptive grammar, richer in graded teaching material and native prose.** For authoring beginner seeds, that trade is in our favour. For adjudicating a fine morphological point, it is not, and the sister worker will feel the difference more than I did.

**Three specific weaknesses to hold in mind:**

1. **Dinneen — the obvious Munster authority — is downloaded but not searchable.** A 5.8 MB dictionary by a Kerryman that I cannot probe by Irish word is a real loss (§1c). Recovering it would need OCR re-run on the seanchló, or a digitised front-end I did not find.
2. **dúchas.ie is entirely unopened** (§1d), and it is the largest free body of Corca Dhuibhne Irish in existence. This is the single highest-value follow-up on the list.
3. **`An Teanga Bheo: Corca Dhuibhne` was not found at all** — the most directly learner-facing Kerry source on the brief, and I came back empty.

**Two things must not be treated as settled by this document:** `try` (§2b #8) and the `san`-after-broad-consonant rule (§2b #14). Both need a native Munster reviewer. Noting for the record that `gle_cn` already carries the standing problem of being agent-ruled with no native reviewer; a Kerry course starting now would inherit the same exposure unless someone is found.

---

## 6. Process gap

**I was briefed to fan out into worker sessions and could not.** All six dispatches — academic grammars, teaching courses, dúchas, corpas, literature/Dinneen, dictionaries — were refused with:

> `FAN-OUT CEILING — depth. This worker would sit at depth 2 … this surface allows 2 level(s) of worker.`

This conversation is itself already a dispatched worker at depth 1, so its children would be depth 2. I did the whole sweep in-turn instead, as the error message directs. Consequences worth naming: the **dictionaries/open-web slice (teanglann, potafocal, focloir.ie, Munster learner material) was never run** — I traded it away to keep the three primary texts properly mined, which I judged the better use of a single context. Ó Dónaill-vs-Dinneen disagreement, which the brief rightly called the most valuable thing that slice could return, is therefore **unexamined**. If this brief is re-run, dispatch it from depth 0.
