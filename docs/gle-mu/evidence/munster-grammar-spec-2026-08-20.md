# Munster (Corca Dhuibhne) morphology & syntax — locked spec for `gle_mu_for_eng`

**Date:** 2026-08-20 · **Scope:** GRAMMAR only (sister worker #531 has SOURCES & LEXICON) · **Status:** evidence + spec, no DB writes, no TTS, zero spend.

This is a **prescriptive** document. Translators apply the tables mechanically. Where a cell says *use this*, use exactly that.

---

## 0. The two sources, and what each one is worth

### 0a. Ó Sé, *Gaeilge Chorca Dhuibhne* (ITÉ 2000) — CONSULTED IN FULL

The definitive descriptive grammar of exactly our dialect: "*na Gaeilge a labhartar sa cheantar idir Ceann Sléibhe agus Ceann Sibéal i mbarúntacht Chorca Dhuibhne i gContae Chiarraí*" (Réamhrá). Free full text at
<https://archive.org/stream/gaeilge-chorca-dhuibhne/Gaeilge%20Chorca%20Dhuibhne_djvu.txt> — 1,005,759 characters, downloaded and mined for this document. Section numbers below (§530 etc.) are Ó Sé's own.

Caveat, stated honestly: the archive.org OCR mangles his IPA and occasionally his italics. **Every form I quote from Ó Sé is one where the Irish-orthography gloss survived the OCR legibly.** Where OCR ambiguity mattered I say so in the cell.

### 0b. corpas.ie CNG, dialect-partitioned by source — METHOD BUILT FOR THIS JOB

CNG (113.8M tokens) has **no dialect attribute** — only `doc.source`, `doc.author`, `doc.title`. So dialect evidence had to be manufactured. I did it by partitioning on RTÉ Raidió na Gaeltachta's *regional desks*, which are transcribed speech from known places:

| Bucket | `doc.source` | What it is |
|---|---|---|
| **MU** | `RnaG (An Saol ó Dheas)` | ~104k tokens of transcribed speech, RnaG's southern desk, **based at Baile na nGall in Corca Dhuibhne, Co. Kerry** |
| **CO** | `RnaG (Iris Aniar)` | ~119k tokens, western desk, Connemara |
| **UL** | `RnaG (Barrscéalta)` | ~65k tokens, northern desk, Donegal |

Query recipe (tested working 2026-08-20):
`GET https://www.corpas.ie/noskeproxy.json?command=view&corpname=cng&viewmode=kwic&q=q[word="X"] within <doc source="RnaG \(An Saol ó Dheas\)"/>&refs=doc.source&pagesize=1` → read `concsize`.
**Attribute values are regexes — the parentheses must be escaped.** Unescaped, every query silently returns 0.

**Two traps I hit, recorded so nobody repeats them:**

1. **Raw corpus counts are not dialect evidence.** `bhíos` has 6,578 raw hits in CNG, dominated by *An tUltach* — an **Ulster** magazine. Always partition by source.
2. **Ó Sé's own metalanguage contaminates naive greps of his text.** `uatha` in his book means "singular" (155 hits, none of them the preposition *ó*); `tosaigh` appears in *athruithe tosaigh* "initial mutations" (116 hits, none of them the verb "start"). I disambiguated both in context before using them.

Counts in this document are written **MU / CO / UL** and are all from the buckets above. Two "MU" totals differ between my early and late probes because the early ones also summed `Cork Irish` and `Paróiste Baile Mhuirne` (Cork, not Kerry); the tables below use the **Kerry-only** figure.

### 0c. What I did NOT consult — explicit gaps

- **Ó Sé, *An Teanga Bheo: Corca Dhuibhne* (1995) — NOT CONSULTED.** Not reached.
- **Ó Cuív, *The Irish of West Muskerry* (1944) — NOT CONSULTED.** Cork, not Kerry, so lower value anyway.
- **dúchas.ie — NOT MINED.** Reachable (HTTP 308 → redirect), but I did not build a Ciarraí-filtered extraction; Ó Sé plus the RnaG partition made it unnecessary for grammar. It remains the best untapped source for *older* Kerry narrative syntax.
- **`corkirish.wordpress.com` — seen in search results only**, not fetched page-by-page. It describes **Cork** Irish (Ua Laoghaire's Muskerry), not Corca Dhuibhne, and on at least one point (below) Cork and Kerry **disagree**.

---

## 1. Synthetic verb forms — the core of the course

### 1.0 The two rulings that govern this whole section

**RULING A — `-mid`, never `muid`.** Corca Dhuibhne has no `muid`.

| | MU | CO | UL |
|---|---|---|---|
| `muid` | **36** | 11,150 | 7,091 |
| `táimid` | **649** | 48 | 10 |

`muid` does not occur at all in Ó Sé except inside the author's name *Diarmuid*. **Confident.** The 1pl is always synthetic: *táimid, bhíomar, beimid, dheineamar*.

**RULING B — write `-mar`, not Ó Sé's `-mair`.** Ó Sé's paradigms give 1pl past `bhíomair, chuamair, dúramair, rabhamair` (§530, §540). Modern written Kerry consistently prefers `-mar`:

| 1pl past | `-mair` (Ó Sé) | `-mar` (modern Kerry) |
|---|---|---|
| bí | 135 | **514** |
| téigh | 25 | **109** |
| déan | 31 | **108** |
| faigh | 24 | **104** |
| abair | 5 | **24** |
| raibh | 38 | **87** |

Consistently ~3–4:1 for `-mar`. Both spell the same spoken ending (slender final [-mərʲ]); `-mair` is the narrower transcription. **This is the (a)/(b) line the brief asked me to draw: `-mar` is standard written Munster, `-mair` is closer to eye-dialect. Course writes `-mar`.** Confident. Flagged because it is the one place I have knowingly ruled *against* Ó Sé's literal page, and I have said why.

### 1.1 `bí` — the substantive verb

Ó Sé §530 verbatim (OCR-cleaned; his ordering preserved). *Use* column is the ruling.

**PRESENT (independent)**

| | Ó Sé §530 | Corpus (MU/CO/UL) | **USE** | Confidence |
|---|---|---|---|---|
| 1sg | *táim* | táim 519 / 20 / 2 · tá mé 63 / 1,739 / 790 | **táim** | confident |
| 2sg | *tánn tú*, *táir*, *taoi* | tánn tú 249 / 0 / 0 · tá tú 50 / 1,255 / 611 | **tánn tú** | confident |
| 3sg | *tá sé / tá sí* | — | **tá sé / tá sí** | confident |
| 1pl | *táimid* | 649 / 48 / 10 | **táimid** | confident |
| 2pl | *tánn sibh* | — | **tánn sibh** | best attempt |
| 3pl | *tá siad*, *táid* | — | **tá siad** | confident (*táid* is real but recessive — do not teach it) |
| aut. | *táthar* | — | **táthar** | best attempt |

Note Ó Sé writes *táimíd* with a long í. The corpus says otherwise: `táimid` 649 vs `táimíd` **2**. **Write `táimid`.** This is the same (a)/(b) line as Ruling B.

Ó Sé also records the greeting **`Conas taoi?`** ("*atá fós in úsáid i nDún Urlann ar a laghad*"). Charming, genuinely local, but marked even within Kerry — **do not use in the course**; use *Conas tánn tú?*

**PRESENT (dependent, after `an`/`ná`/`go`)** — Ó Sé §530: stem *fuil-*

| | Ó Sé | Corpus | **USE** | Confidence |
|---|---|---|---|---|
| 1sg | *fuilim* | nílim 142 / 12 / 0 · níl mé 13 / 385 / 131 | **an bhfuilim / nílim** | confident |
| 2sg | *fuileann tú*, *fuil tú* | an bhfuilir **0** / 0 / 0 · an bhfuil tú 25 / 63 / 6 | **an bhfuil tú** | confident |
| 3sg | *fuil sé* | — | **an bhfuil sé** | confident |
| 1pl | *fuilimid* | — | **an bhfuilimid / nílimid** | best attempt |
| 3pl | *fuil siad*, *fuilid* | — | **an bhfuil siad** | confident |

> **The 2sg synthetic `-ir` is dead in modern Kerry speech.** Ó Sé records *táir* and calls it "*foirm tháite annamh*" — a rare synthetic form — and `an bhfuilir` returns **zero** hits in 104k tokens of Kerry broadcast. **The course never uses `-ir`.** This is a case where the brief's expectation ("an bhfuilir or an bhfuil tú?") resolves firmly to the analytic form, and I want that on the record rather than buried.

**PAST** (Ó Sé §530: independent *bhí*, dependent *raibh*)

| | Ó Sé | Corpus | **USE** | Confidence |
|---|---|---|---|---|
| 1sg | *bhíos* | bhíos 1,279 / 16 / 8 · bhí mé 62 / 1,225 / 603 | **bhíos** | confident |
| 2sg | *bhís* | — | **bhís** | best attempt |
| 3sg | *bhí sé* | — | **bhí sé** | confident |
| 1pl | *bhíomair* | bhíomar 514 / 22 / 4 | **bhíomar** | confident |
| 2pl | *bhíobhair* | bhíobhair 65 / 0 / 0 | **bhíobhair** | best attempt |
| 3pl | *bhíodar* | 1,179 / 258 / 0 | **bhíodar** | confident |
| dep. 1sg | *rabhas* | 304 / 2 / 0 | **ná rabhas / an rabhas** | confident |
| dep. 1pl | *rabhamair* | rabhamar 87 / 2 / 2 | **rabhamar** | confident |
| dep. 3pl | *rabhadar* | — | **rabhadar** | confident |
| aut. | *bhíothas* | — | **bhíothas** | best attempt |

**FUTURE** — the one where the synthetic form has genuinely lost.

| | Ó Sé §530 | Corpus | **USE** | Confidence |
|---|---|---|---|---|
| 1sg | *beidh mé*, *bead* (he lists **beidh mé first**) | bead 13 / 9 / 0 · beidh mé 111 / 85 / 55 | **beidh mé** | confident |
| 2sg | *beidh tú*, *beir* | — | **beidh tú** | confident |
| 3sg | *beidh sé* | — | **beidh sé** | confident |
| 1pl | *beimid*, *beam* | beimid **366** / 19 / 2 | **beimid** | confident |
| 2pl | *beidh sibh* | — | **beidh sibh** | confident |
| 3pl | *beidh siad*, *beid* | — | **beidh siad** | confident |

> **This is the most important nuance in the document.** The brief asked "beidh mé or bead?" — and the two 1st-person cells go *opposite ways*. **1sg future is analytic (`beidh mé`); 1pl future is synthetic (`beimid`).** Ó Sé lists *beidh mé* before *bead*, and the Kerry corpus has *beimid* at 366 against *bead* at 13. Anyone who assumes "Munster = synthetic everywhere" will produce wrong Irish here.

**CONDITIONAL**

| | Ó Sé | Corpus | **USE** | Confidence |
|---|---|---|---|---|
| 1sg | *bheinn* | bheinn 171 · bheadh mé 2 | **bheinn** | confident |
| 2sg | *bheifeá* | — | **bheifeá** | confident |
| 3sg | *bheadh sé* | — | **bheadh sé** | confident |
| 1pl | *bheimís(t)* | — | **bheimis** | best attempt (drop Ó Sé's optional final *-t*) |
| 2pl | *bheadh sibh* | — | **bheadh sibh** | best attempt |
| 3pl | *bheidís* | — | **bheidís** | confident |

**HABITUAL PRESENT** (Ó Sé §530): *bím, bíonn tú, bíonn sé, bímid, bíonn sibh, bíonn siad*. Ruling: **bím / bíonn tú / bíonn sé / bímid / bíonn sibh / bíonn siad.** Confident. (Ó Sé's *bíd* for 3pl: recessive, do not use.)

**HABITUAL PAST** (Ó Sé §530): *bhínn, bhíteá, bhíodh sé, bhímís(t), bhíodh sibh, bhídís(t)*.
Ruling: **bhínn / bhíteá / bhíodh sé / bhímis / bhíodh sibh / bhídís.** Confident for 1sg (`bhínn` 52 MU vs `bhíodh mé` 1); best attempt for 2sg/1pl/2pl.

**IMPERATIVE** (§530): *bí / bíodh sé / bímis / bídh / bídís*. Negative: **`ná bí`** (§606).
**VERBAL NOUN** (§531): **`bheith`** — always lenited except after `le`, where many speakers leave it bare (*le beith ann*). Course writes **`a bheith`**.

### 1.2 Irregular verbs

The Kerry stems differ from the Caighdeán *lexically*, not just in ending. Ó Sé's own chapter headings name the verbs: **"An briathar `cíonn`"**, **"An briathar `deineann`"** — i.e. in Corca Dhuibhne the verb "see" *is* `cíonn` and "do/make" *is* `deineann`. That is a headword-level fact, not a spelling variant.

| Verb | Kerry form | MU | CO | UL | Verdict |
|---|---|---|---|---|---|
| **do/make** | `dhein` | **732** | 3 | 0 | decisive |
| | *rinne* | 16 | 1,178 | 647 | **reject** |
| **see** | `chím` | **104** | 0 | 0 | decisive |
| | *feicim* | 6 | 90 | 2 | **reject** |
| **see, past 1sg** | `chonac` | **115** | 0 | 0 | decisive |
| | *chonaic mé* | 4 | 181 | 73 | **reject** |
| **go, past 1sg** | `chuas` | **210** | 1 | 0 | decisive |
| | *chuaigh mé* | 14 | 251 | 85 | **reject** |
| **go, future** | `raghaidh` | **260** | 0 | 0 | decisive |
| | *rachaidh* | 3 | 18 | 183 | **reject** |
| **get, past 1sg** | `fuaireas` | **165** | 1 | 0 | decisive |
| | *fuair mé* | 7 | 180 | 108 | **reject** |
| **say, past 1sg** | `dúrt` | **154** | 0 | 0 | decisive |
| | *dúirt mé* | 24 | 482 | 465 | **reject** |
| **come, past 1sg** | `thánag` | 14 | 0 | 0 | **thin — see below** |
| | *tháinig mé* | 11 | 63 | 35 | |

> **Correction to the brief.** The brief proposed `duart` as the Munster past 1sg of *abair*. **That is the Cork/literary Munster form, not Corca Dhuibhne.** Ó Sé §540 gives the past as *dúrt, dúraís, dúirt sé, dúramair, dúrabhair, dúradar* — and `duart` returns **0** hits in both Ó Sé and the Kerry corpus, while **`dúrt` returns 154**. This is exactly the Cork/Kerry disagreement I flagged in §0c. **Use `dúrt`.**

**Full paradigms** (Ó Sé §§536–545 + corpus). *Where a cell is analytic, that is a ruling, not an omission.*

| | **bí** | **téigh** | **tar** | **déan** | **abair** | **faigh** | **feic** | **clois** |
|---|---|---|---|---|---|---|---|---|
| Pres 1sg | táim | téim | tagaim | deinim | deirim | faighim | **chím** | cloisim |
| Pres 2sg | tánn tú | téann tú | tagann tú | deineann tú | deireann tú | faigheann tú | chíonn tú | cloiseann tú |
| Pres 3sg | tá sé | téann sé | tagann sé | deineann sé | deir sé | faigheann sé | chíonn sé | cloiseann sé |
| Pres 1pl | táimid | téimid | tagaimid | deinimid | deirimid | faighimid | chímid | cloisimid |
| Pres 3pl | tá siad | téann siad | tagann siad | deineann siad | deir siad | faigheann siad | chíonn siad | cloiseann siad |
| Past 1sg | **bhíos** | **chuas** | **thánag** | **dheineas** | **dúrt** | **fuaireas** | **chonac** | **chualas** |
| Past 2sg | bhís | chuais | thánaís | dheinis | dúraís | fuarais | chonaicís | chualaís |
| Past 3sg | bhí sé | chuaigh sé | tháinig sé | dhein sé | dúirt sé | fuair sé | chonaic sé | chuala sé |
| Past 1pl | **bhíomar** | **chuamar** | thángamar | **dheineamar** | **dúramar** | **fuaireamar** | **chonaiceamar** | chualamar |
| Past 3pl | **bhíodar** | **chuadar** | thángadar | **dheineadar** | **dúradar** | fuaireadar | chonaiceadar | chualadar |
| Fut 1sg | beidh mé | raghad | tiocfaidh mé | déanfaidh mé | déarfaidh mé | gheobhaidh mé | chífidh mé | cloisfidh mé |
| Fut 3sg | beidh sé | raghaidh sé | tiocfaidh sé | déanfaidh sé | déarfaidh sé | gheobhaidh sé | chífidh sé | cloisfidh sé |
| Fut 1pl | **beimid** | raghaimid | tiocfaimid | déanfaimid | déarfaimid | gheobhaimid | chífimid | cloisfimid |
| Cond 1sg | bheinn | raghainn | thiocfainn | dhéanfainn | déarfainn | gheobhainn | chífinn | chloisfinn |
| Cond 3sg | bheadh sé | raghadh sé | thiocfadh sé | dhéanfadh sé | déarfadh sé | gheobhadh sé | chífeadh sé | chloisfeadh sé |
| Hab past 1sg | bhínn | théinn | thagainn | dheininn | deirinn | d'fhaighinn | chínn | chloisinn |
| Neg past | ní raibh | ní dheaghaigh | níor tháinig | **ní dhein** | ní dúirt | ní bhfuair | ní fheaca | níor chuala |
| Verbal noun | bheith | dul | teacht | déanamh | rá | fáil | feiscint | clos |

Confidence: **confident** for every bolded cell (all corpus-verified above, or Ó Sé verbatim). **Best attempt** for the unbolded 2sg past forms, the 2pl throughout, and the future/conditional of *clois* and *feic* — these are Ó Sé's paradigm shapes applied regularly, and I did not get independent corpus counts for each.

Two specific flags:
- **`thánag` is my weakest irregular.** 14 MU against 11 for *tháinig mé* — that is not a decisive win, it is a coin-toss with a lean. Ó Sé's paradigm supports it. **Use `thánag`, evidence thin.**
- **"hear" is `clois`, not `airigh`.** The brief expected *airigh* to be the Munster verb. The corpus refutes it for modern Kerry: `airím` **2** MU vs **26** CO, and Ó Sé uses *airím* once. `chualas` is 15 MU / 1 CO. **Use `cloisim` / `chuala` / `chualas`.** Genuinely uncertain whether *airigh* was stronger a generation ago; it is not the live form now.

### 1.3 Regular verbs

**Stem ruling: `tosnaigh`, not `tosaigh`.** `tosnú` **431** MU / 2 CO; `tosú` 2 MU / 188 CO; `thosnaigh` **251** MU / 5 CO. Ó Sé has *tosnaíonn, tosnú, thosnaíos*. **Confident.** Verbal noun **`tosnú`**.

| | ceap | fan | tosnaigh | críochnaigh | cuimhnigh | foghlaim | freagair |
|---|---|---|---|---|---|---|---|
| Pres 1sg | ceapaim | fanaim | tosnaím | críochnaím | cuimhním | foghlaimím | freagraím |
| Pres 3sg | ceapann sé | fanann sé | tosnaíonn sé | críochnaíonn sé | cuimhníonn sé | foghlaimíonn sé | freagraíonn sé |
| Pres 1pl | ceapaimid | fanaimid | tosnaímid | críochnaímid | cuimhnímid | foghlaimímid | freagraímid |
| Past 1sg | cheapas | d'fhanas | thosnaíos | chríochnaíos | chuimhníos | d'fhoghlaimíos | d'fhreagraíos |
| Past 3sg | cheap sé | d'fhan sé | thosnaigh sé | chríochnaigh sé | chuimhnigh sé | d'fhoghlaim sé | d'fhreagair sé |
| Past 1pl | cheapamar | d'fhanamar | thosnaíomar | chríochnaíomar | chuimhníomar | d'fhoghlaimíomar | d'fhreagraíomar |
| Past 3pl | cheapadar | d'fhanadar | thosnaíodar | chríochnaíodar | chuimhníodar | d'fhoghlaimíodar | d'fhreagraíodar |
| Fut 1sg | ceapfaidh mé | fanfaidh mé | tosnóidh mé | críochnóidh mé | cuimhneoidh mé | foghlaimeoidh mé | freagróidh mé |
| Cond 1sg | cheapfainn | d'fhanfainn | thosnóinn | chríochnóinn | chuimhneoinn | d'fhoghlaimeoinn | d'fhreagróinn |
| Verbal noun | ceapadh | fanacht | **tosnú** | críochnú | cuimhneamh | foghlaim | freagairt |

**Rule (INFERRED from Ó Sé's regular-verb classes §§520–529, cross-checked against the `bí` and irregular patterns): the past 1sg in `-as/-íos` and the past 3pl in `-adar/-íodar` are synthetic; the future 1sg is analytic; the conditional 1sg in `-inn` is synthetic.** That is the same shape the corpus proves for the irregulars. Confidence: **best attempt** for the individual regular-verb cells — I verified the *pattern* thoroughly but not each cell.

**`labhair` has no live present tense.** `labhraím` = **0** MU. As with the Connemara course, "I speak Irish" is not *labhraím Gaeilge* — it is **`tá Gaeilge agam`**. Use *labhairt* only as a verbal noun (*Gaeilge a labhairt*). Confident.

**The `do` past particle: DO NOT WRITE IT.** Ó Sé §661 records the affirmative particle *do* before past-tense verbs, and it shows in older Kerry text (*do bhí*, *do labhras*). It is recessive in modern spoken Kerry and would add a particle to several hundred sentences for no learner gain. **Course writes `bhíos`, not `do bhíos`.** Ruling: mine, INFERRED from its near-absence in the broadcast corpus. Confident as a *course decision*; the form itself is real.

---

## 2. The progressive

**`táim ag + verbal noun`.** `táim ag` 93 MU / 3 CO; `tá mé ag` 18 MU / 228 CO. Confident.

**`ag` is written `ag`.** Ó Sé §684 gives the particle as *ag* before all VN types (*ag glanadh an urláir*, *ag ól braon tae*, *ag iascach*). §685 notes it is *elided* after a vowel by ordinary sandhi (*tá sé ag breacadh*) — that is pronunciation, not spelling. **Course writes `ag`.** Confident.

**`foghlaim`, not `foghluim`.** `ag foghlaim` 51 MU; `ag foghluim` **0** in all three dialects. The brief's *foghluim* is not a written Kerry form. Confident.

### 2b. The `a` + VN construction — a real Munster rule, and the one I nearly got wrong

My very first corpus sample showed Kerry speech like *"bhíos **a rá** liom fhéin"* and *"bhíos **a cuimhneamh** ar John A."* where the standard writes *ag rá / ag cuimhneamh*. That looks like `ag` reducing to `a`. **It is not.** Ó Sé §§683, 687 give the actual rule:

> §683: "*Nuair a bhíonn ainmní nó cuspóir an ainm bhriathartha roimhe sa chlásal cuirtear an mhír `a` eatarthu*" — when the VN's subject or object precedes it in the clause, the particle `a` goes between them.
> §687: "*Cuirtear an mhír `a` in ionad `ag` i struchtúir choibhneasta*" — `a` replaces `ag` in relative structures. His examples: *"sin é an gort a bhíodh Seán **a chur**"*, *"cad a bhíodar **a dhéanamh**"*.

**RULE (confident, Ó Sé verbatim):**
- Plain progressive, no fronted object → **`ag` + VN**: *Táim ag foghlaim Gaeilge.*
- Object fronted before the VN → **`a` + VN, lenited**: *Tá Gaeilge agam **a fhoghlaim**.*
- Object relativised out → **`a` + VN**: *An rud a bhíos **a rá**.* / *Cad a bhíodar **a dhéanamh**?*

Munster extends `a` into the **relative progressive** where the Caighdeán would keep *ag*. Translators must watch for this — it will hit every "what I'm saying / the thing he's doing" sentence.

### 2c. "trying to" — `d'iarraidh`

Ó Sé §686 verbatim: "*Cuirtear an mhír `ag` roimh an bhfoirm `d'iarraidh` in ionad `iarraidh` leis féin*", with examples *"tá sí **d'iarraidh** dul lastuas ded chathaoirse"* and *"bhímíst **d'iarraidh** é a leanúint amach"*.

**`táim d'iarraidh + VN` = "I'm trying to".** Confident (Ó Sé verbatim). My corpus probe for `d'iarraidh` returned 0 because the tokeniser splits on the apostrophe — a tooling artefact, not counter-evidence, and I am flagging it rather than pretending the corpus confirmed it.

---

## 3. Negative and interrogative — `ná`, and it is emphatic

**CONFIRMED, decisively.** Ó Sé's chapter heading is literally "*An mhír cheisteach dhiúltach `ná`*" (§600).

| | MU | CO | UL |
|---|---|---|---|
| **`ná fuil`** | **1,161** | 1 | 0 |
| *nach bhfuil* | 209 | 1,987 | 1,205 |
| **`ná raibh`** | **581** | 52 | 1 |
| *nach raibh* | 146 | 730 | 491 |

**RULE (confident): Munster `ná` replaces Caighdeán `nach`, both in negative questions and in negative subordinate clauses. `ná` takes the DEPENDENT form of the verb and does NOT eclipse.**

- *Ná fuil sé anso?* — "Isn't he here?" (not *nach bhfuil sé anseo*)
- *Deir sé ná fuil sé anso.* — "He says he isn't here."
- *Ná raibh tú ann?* — "Weren't you there?"
- Before a vowel, `ná h-`: Ó Sé §600 *"ná hosclaíonn siad ar a dó dhéag?"*
- Past tense: `nár` (§601) — *"nár chaith sé é féin insa chlais sin"*

**The §602 subtlety.** In *confirmation* and *rhetorical* questions, Ó Sé records `ná` used "*gan aon éifeacht ar thús an bhriathair ná ar fhoirm an bhriathair*" — with no effect on the verb at all, which stays **independent**: *"ná tá tigh sa Chom aige"*, *"ná chonac naomhóg"*, *"ná bhíodh sé ag seimint anso, ná bhíodh?"*, *"ná níl sé ach a leathuair tar éis a sé anois"*.

**Course ruling: use only the plain §600 pattern (`ná` + dependent form).** The §602 independent-verb pattern is authentic Kerry and lovely, but it is a *pragmatic* construction (tag/confirmation questions) and mixing both would break ZUT — the same English prompt would get two Irish forms. Recorded here so nobody "corrects" a §602 example if they meet one in a source.

**Other negatives:** `nílim` (142 MU / 13 for *níl mé*) · `ní bhím` · `ní dhein` (14 MU) not *ní dhearna* (1 MU / 28 CO) · negative imperative **`ná`** (§606: *ná bí, ná habair*).

**Answer words:** `sea` 2,689 MU / 644 CO · `ní hea` 99 MU / 50 CO. See §5.

---

## 4. Prepositional pronouns

Forms are Ó Sé's orthographic glosses, with occurrence counts in his text, cross-checked against the corpus for the contested cells.

| | **ag** | **le** | **ar** | **do** | **de** | **ó** | **i** | **chun** | **fé** | **roimh** | **as** | **thar** | **idir** |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1sg | agam | liom | orm | dom | díom | uaim | ionam | chugam | fúm | romham | asam | tharam | — |
| 2sg | agat | leat | ort | duit | díot | uait | ionat | chugat | fút | romhat | asat | tharat | — |
| 3sgM | aige | leis | air | dó | de | uaidh | ann | chuige | fé | roimhe | as | thairis | — |
| 3sgF | aici | léi | uirthi | di | di | uaithi | inti | chuici | fúithi | roimpi | aisti | thairsti | — |
| 1pl | againn | linn | orainn | dúinn | dínn | uainn | ionainn | chugainn | fúinn | romhainn | asainn | tharainn | eadrainn |
| 2pl | agaibh | libh | oraibh | daoibh | díbh | uaibh | ionaibh | chugaibh | fúibh | romhaibh | asaibh | tharaibh | eadraibh |
| 3pl | acu | leo | orthu | dóibh | díobh | uathu | iontu | chucu | fúthu | rompu | astu | tharstu | eatarthu |

**Where Kerry differs from Ó Dónaill's headword — the flagged cells:**

| Item | Kerry | Standard | Evidence | Confidence |
|---|---|---|---|---|
| **`fé` for `faoi`** | **fé** | faoi | corpus **fé 2,573 MU / 25 CO**, *faoi* 730 MU / 5,469 CO. Ó Sé: *fé bhláth, fé thrí, fé mhaidean* | **confident — big marker, carry it** |
| **`chun` for `chuig`** | **chun** | chuig | Ó Sé **chun 203 / chuig 5** | confident |
| `acu` not *aca* | acu | acu | Ó Sé 272 vs 1 | confident |
| `orthu` not *ortha* | orthu | orthu | Ó Sé 96 vs 4 | confident |
| `iontu` not *ionta* | iontu | iontu | Ó Sé 60 vs 3 | confident |
| `eatarthu` not *eatorra* | eatarthu | eatarthu | Ó Sé 9 vs 0 | confident |
| `dom` not *domh/dhom* | **dom** | dom | Ó Sé **dom 60, domh 0** | confident — the brief's *domh* is **Ulster**, not Munster |
| `leo` | leo | leo | Ó Sé 88; *leothu* 11 (his phonetic gloss) | confident — write `leo` |
| `dóibh` | dóibh | dóibh | Ó Sé 44; *dhóibh* 12 | confident |

> **`fé` is the single highest-value lexical-grammatical marker in this section** — 2,573 to 25 against Connacht. Under the binding rail it goes in the course, and a Kerry speaker will recognise it instantly.

**`uathu` — flagged.** Ó Sé's raw count looked like *uatha* 155 vs *uathu* 9, which would have reversed the ruling. **That was the metalanguage trap**: his 155 *uatha* are all the grammatical term "singular" (*an ginideach uatha*). The real preposition is **`uathu`**. Confident, after disambiguation.

**Emphatics:** `agamsa, agatsa, aigesean, aicise, againne, agaibhse, acusan`. Best attempt.
**Possessive contractions** (Ó Sé Ch.10): `im`, `id`, `ina` — *im aonar*, *id shuí*, *ina chónaí*. Best attempt.

---

## 5. Copula vs substantive verb

**`is dóigh liom` is the Kerry "I think".** This is the most lopsided result I found in the whole sweep:

| | MU | CO | UL |
|---|---|---|---|
| **`is dóigh liom`** | **1,617** | 106 | 6 |
| **`is dóigh liom go`** | **489** | 36 | 3 |
| *ceapaim go* | 29 | 37 | 1 |
| *sílim* | 9 | 322 | 442 |

**Never use `sílim` in this course** — it is Connacht/Ulster. **Use `is dóigh liom go`.** Confident.

**The `is ea` classification cleft.** `is ea` 763 MU / 13 CO. Ó Sé writes it constantly in his own prose: *"áit fuar **is ea** é"*, *"áit dainséarach **is ea** é"*, *"Eisceacht **is ea** seo"*.

**RULE (confident): Munster fronts the predicate and follows it with `is ea` + pronoun.**
- *Múinteoir **is ea** mé.* (not *is múinteoir mé*)
- *Gaeilge **is ea** í.*

**`sea` / `ní hea` as answers.** `sea` 2,689 MU / 644 CO; `ní hea` 99 MU / 50 CO.
**RULE: `sea` / `ní hea` answer *copula* questions (`An ea?`, `Ar mhúinteoir é?`). Verb questions still echo the verb (`An bhfuil...?` → `Tá` / `Nílim`).** Confident on the split; the raw *sea* count is inflated by discourse-marker use ("well, so"), which I have not subtracted — **flagged as a soft number.**

**Past/conditional copula** (Ó Sé §§634–637): base **`ba`**, before vowel **`ab`**, negative **`níor(bh)`**, interrogative **`ar(bh)`**, subordinate **`gur(bh)`**, negative subordinate **`nár(bh)`**.

- *Ba mhaith liom* 77 MU — pan-dialectal, use it.
- *Ar mhaith leat?* 14 MU — use it.
- *Níor mhaith liom* 24 MU.
- Ó Sé §634: `ní` and `an` **suppress initial mutation** in copula clauses — *"**ní maith** na bóithre iad so"*, not *ní mhaith*. **Confident, and easy to get wrong.**
- `nach ea!` attested (Ó Sé §634) — note **`nach`**, not `ná`, survives in the copula. Flagged as a genuine exception to §3.

**Copula frames for the course:** *is maith liom, is fearr liom, is dóigh liom, is dócha, is cuma liom, is féidir liom.*

---

## 6. Relative clauses

**Direct relative** — particle `a` + lenition, verb in independent form: *an fear **a bhí** anso*, *an rud **a dhein** sé*.

**Indirect relative** — Munster prefers **`go`** where the Caighdeán uses `a` + eclipsis. Ó Sé's chapter-16 heading is "*An clásal coibhneasta indíreach*"; the negative direct relative he heads separately (§17700).

**"the people who have Irish"** → **`na daoine go bhfuil Gaeilge acu`**. **Confident — corpus-confirmed:**

| | MU | CO | UL |
|---|---|---|---|
| **`daoine go bhfuil`** | **91** | 25 | 14 |
| *daoine a bhfuil* | 9 | 52 | 50 |

10:1 for `go` inside Munster, and the ratio **inverts** in Connacht. This is the Munster indirect relative doing exactly what Ó Sé describes.

**"what I mean / what I said"** → **`an rud a bhí i gceist agam`**, **`an rud a dúrt`**. Direct relative, `a` + lenition. Confident.

**Negative relative** → **`ná`**: *an fear **ná** raibh ann*. Confident (follows §3 + Ó Sé §17700).

**Interrogatives:** `cad` **2,351 MU / 29 CO** (*céard* 5 MU / 2,201 CO — **never use `céard`**) · `cad a` 861 MU · `conas` 918 MU / 16 CO (*cén chaoi* 1 MU / 600 CO — **never**) · `conas a` 271 MU · `cathain` 127 MU / 1 CO (*cén uair* 2 MU / 109 CO — **never**). All confident.

---

## 7. Mutations

**THE Munster rule: preposition + article eclipses, and it eclipses `d` and `t` too** — which the Caighdeán does not.

| | MU | CO | UL |
|---|---|---|---|
| **`ar an dtaobh`** | **118** | 2 | 0 |
| *ar an taobh* | 38 | 97 | 18 |
| **`ag an ndoras`** | **7** | 0 | 0 |
| *ag an doras* | 1 | 13 | 1 |

**RULE (confident): after `ar an`, `ag an`, `leis an`, `ón`, `don`, `insan` — eclipse the following consonant, including `d-` → `nd-` and `t-` → `dt-`.** *ar an dtaobh, ag an ndoras, ar an mbord, leis an bhfear.* Carry it: it is one of the most audible Munster signatures, and the corpus is unambiguous.

**`sa` + lenition, NOT eclipsis.** `sa tigh` **141 MU / 1 CO**; *sa teach* 3 MU / 151 CO. Connacht's *sa mbaile* is not Munster. **`sa` lenites: `sa tigh`, `sa bhaile`.** Confident. (Note *tigh* is also the Munster lexical choice over *teach* — that is #531's territory, but the mutation ruling stands either way.)

**Possessives:** `mo/do/a`(m) lenite; `a`(f) no change + `h-` before vowel; `ár/bhur/a`(pl) eclipse. Standard. Confident.
**`d'` and `t-` prefixes:** *d'ith, d'ól, an t-uisce, an tSeanbhean*. Standard. Confident.
**After `ní`:** lenition — *ní dhein, ní raibh*. But **not in copula clauses** (§5). Confident.

---

## 8. Word order and the `a` particle

**Fronted object + `a` + lenited VN.** *Gaeilge **a labhairt**. Rud **a rá**. Ba mhaith liom Gaeilge **a fhoghlaim**.* Confident (Ó Sé §683, and the standard shares this).

**Rule:** with a *finite* verb the object follows (*Foghlaimím Gaeilge*); with a *verbal noun* the object fronts and takes `a` + lenition (*ag iarraidh Gaeilge a fhoghlaim*). Never *ag foghlaim Gaeilge* when a modal/VN chain precedes it.

**Munster clefting with `is ea`** — see §5. *Ag foghlaim Gaeilge atáim* is also idiomatic Kerry fronting. **Use sparingly**; ZUT requires one form per prompt, so the course default stays *Táim ag foghlaim Gaeilge*.

---

## 9. Stress-driven spelling — the forms the course must carry

Munster stress falls on a long vowel in the second/third syllable (Ó Sé Ch.3, *Béim an Fhocail*). The learner-visible consequences:

| Kerry | Standard | MU | CO | UL | Verdict |
|---|---|---|---|---|---|
| **`anso`** | anseo | **3,352** | 2 | 0 | carry it |
| **`ansan`** | ansin | **7,028** | 14 | 0 | carry it |
| **`conas`** | cén chaoi | **918** | 16 | 0 | carry it |
| **`cad`** | céard | **2,351** | 29 | 486 | carry it |
| **`cathain`** | cén uair | **127** | 1 | 0 | carry it |
| **`fé`** | faoi | **2,573** | 25 | 14 | carry it |
| **`tigh`** | teach | *sa tigh* 141 | 1 | 0 | carry it |
| `aríst` | arís | Ó Sé 9 vs 33 | | | **reject** — Ó Sé prefers *arís* |

**The line between written Munster and eye-dialect.** Everything in the "carry it" column above is normal Irish orthography that appears in edited Kerry text and in RnaG transcripts — a Kerry speaker reads it as their own. **Rejected as eye-dialect / over-narrow:** `táimíd` (write *táimid*), `-mair` endings (write *-mar*), `bhímíst`/`bhídíst` with final *-t* (write *bhímis/bhídís*), `leothu` (write *leo*), `taoi`/`táir` (write *tánn tú*), and every IPA form in Ó Sé. Those belong in a phonology paper, exactly as the brief specified.

---

# 10. THE LOCKED TABLE

**One English frame → exactly one Munster form. No exceptions, no variants. This is the ZUT rail.**

| # | English frame | **MUNSTER FORM — USE THIS** | Confidence |
|---|---|---|---|
| 1 | I am / I'm | **táim** | confident |
| 2 | you are (sg) | **tánn tú** | confident |
| 3 | we are | **táimid** | confident |
| 4 | I'm not | **nílim** | confident |
| 5 | are you…? | **an bhfuil tú…?** | confident |
| 6 | aren't you…? / isn't it…? | **ná fuil…?** | confident |
| 7 | I was | **bhíos** | confident |
| 8 | we were | **bhíomar** | confident |
| 9 | they were | **bhíodar** | confident |
| 10 | I will be | **beidh mé** | confident |
| 11 | we will be | **beimid** | confident |
| 12 | I would be | **bheinn** | confident |
| 13 | **I want to** | **teastaíonn uaim + VN** | best attempt |
| 14 | **I am trying to** | **táim d'iarraidh + VN** | confident (Ó Sé §686) |
| 15 | **I am going to** | **táim ag dul + VN** | confident |
| 16 | **I would like to** | **ba mhaith liom + VN** | confident |
| 17 | **I can / I am able to** | **is féidir liom + VN** | confident |
| 18 | **I have to / I must** | **caithfidh mé + VN** | confident |
| 19 | **I think that** | **is dóigh liom go…** | confident |
| 20 | **I do not** (verb) | **ní + lenited verb** | confident |
| 21 | **do you…?** | **an + eclipsed verb** | confident |
| 22 | **because** | **mar gheall ar** / **toisc go** (clause) | confident |
| 23 | **but** | **ach** | confident |
| 24 | **when** (conj.) | **nuair a** | confident |
| 25 | **when?** (question) | **cathain?** | confident |
| 26 | **if** (real) | **má** | confident |
| 27 | **if** (unreal) | **dá** | confident |
| 28 | **how** / **how to** | **conas** / **conas a** | confident |
| 29 | what | **cad** / **cad a** | confident |
| 30 | here / there | **anso** / **ansan** | confident |
| 31 | I have Irish | **tá Gaeilge agam** | confident |
| 32 | I did / made | **dheineas** | confident |
| 33 | I saw | **chonac** | confident |
| 34 | I see | **chím** | confident |
| 35 | I went | **chuas** | confident |
| 36 | I got | **fuaireas** | confident |
| 37 | I said | **dúrt** | confident |
| 38 | I heard | **chualas** | confident |
| 39 | yes / no (copula qs) | **sea** / **ní hea** | confident |
| 40 | under / about | **fé** | confident |
| 41 | to (motion) | **chun** | confident |
| 42 | X is a Y | **Y is ea X** | confident |
| 43 | in the house | **sa tigh** | confident |
| 44 | on the side | **ar an dtaobh** | confident |
| 45 | I'm learning Irish | **táim ag foghlaim Gaeilge** | confident |

---

## 11. WEAKEST LINKS — what I would most want checked

Ranked. These are the cells where I would not bet the course.

1. **`thánag`** (§1.2). 14 vs 11 is a lean, not a result. My weakest single form.
2. **"I want to" = `teastaíonn uaim`** (locked #13). `teastaíonn uaim` 19 MU / 0 CO — right dialect, thin count. Alternative *ba mhaith liom* collides with #16 and would break ZUT.
3. **Regular-verb paradigm cells** (§1.3). The *pattern* is well-verified; individual 2sg/2pl cells are Ó Sé's classes applied by rule, not separately attested.
4. **The `-mar` over `-mair` ruling** (§1.0B). Corpus-backed 3–4:1, but it is a deliberate departure from Ó Sé's printed paradigm and deserves a second opinion.
5. **`sea` raw count** (§5). Inflated by discourse-marker use; the *rule* is sound, the *number* is soft.
6. **`clois` over `airigh`** (§1.2). Confident for modern Kerry; possibly wrong for the older register a folklore-based course might want.
7. **2pl throughout.** `bhíobhair`, `tánn sibh`, `rabhabhair` — Ó Sé has them, the corpus barely does, because broadcast interviews rarely address a plural "you". Low risk (few of the 668 need it) but genuinely thin.

*Resolved during the sweep and no longer weak:* the `go` indirect relative (§6, now 91:9) and "I can" (`is féidir liom` 44 MU / 9 CO, against `táim ábalta` 1).

## 12. Reproducing this

Probe scripts and the full result logs are at `/tmp/munster-grammar-44b0/` (`p.py`, `slow.py`, `out_slow*.txt`, `ose.txt`). They are scratch, not repo files. The query recipe in §0b is enough to rebuild everything from scratch; remember to escape the parentheses.
