# How Iorras Aithneach says "try": corpus evidence from Ó Curnáin

**Course:** gle_cn_for_eng (Connemara Irish for English speakers)
**Source:** Brian Ó Curnáin, *The Irish of Iorras Aithneach, County Galway* (DIAS 2007), volumes I–IV
**Date:** 2026-08-20 · **Status:** EVIDENCE ONLY — no ruling, no database touched, no audio generated, zero spend

## Calibration

Every probe in this document ran behind the same three known-positive controls, and every
one of them passed on every run:

| control | expected | got |
|---|---|---|
| `Gaeilge` | 121 | **121** |
| `duine` | 521 | **521** |
| `bhí` | 3133 | **3133** |

The four volumes are present in both the durable `$HOME` copy and the `/tmp` copy, and the
two are byte-identical in size. **Every zero reported below is therefore a real zero**, not
an extraction artefact. All searching was done in Python; `grep` was never used on these
files.

---

## The short version

Ó Curnáin states the answer himself, twice, in his own words.

On `féachtáil` (§5.212, vol II): *"The by-form féachtáil means **try to** and is used with
the preposition **le**."* And then, six lines later: ***"féachtáil is now obsolescent, it is
unfamiliar to 21Ptq, for example."***

On `síl` (§5.212, vol II): *"síl: meaning **try** and think, senses expressed **more commonly
by traíáil** and ceap respectively."*

And in the vol IV glossary, under the entry for `traíáil2`, sense 2: ***"(Used by younger
generation for `ag iarraidh` of older generation)."***

That is the whole shape of it. The dialect has **one dominant, fully-inflected, running-speech
verb for "try": `traíáil`**, an old English borrowing. Before it — and still, in the mouths of
the oldest speakers — the job was done by **`ag iarraidh`**. `féach le` is real but archaic and
Ó Curnáin himself calls it obsolescent. `iarracht` is not attested in running speech at all.

---

## (1) `féach le` — is it a live Connemara "try to"?

### The homograph split

Raw hits for the string `féach` across all four volumes: **245** (case-insensitive; 210 as
word-initial forms). That raw number is worthless on its own, so here is the breakdown by
what actually follows the word:

| sense | approx. count | how you spot it |
|---|---|---|
| **(a) LOOK / SEE** — imperative `féach(a)`, `féachaigí`, discourse marker | ~142 | bare, or + noun; vol IV glossary lists only this sense |
| **(d) "to see if / to try to"** — `féachaint aN` + finite clause | ~59 | + eclipsing `a`/`an`; this is §8.137, a *conjunction* |
| **(c) TRY TO** — `féach(aint/ain) le` + verbal noun | **5 textual attestations → 3 distinct running-speech tokens** | + `le` |
| **(e) TEST (to exhaustion)** — `féachaint do` | 3 | + `do` |

`ag féachaint ar` = "watching" is, notably, **not** the big contaminant Kai expected.
Ó Curnáin says at §5.212 that *"féachaint also generally means look at and is used with the
preposition ar (**far more common is breathnú ar**)"* — the watching sense is real but the
dialect prefers `breathnú`.

### (c) — every instance, quoted

There are exactly **three distinct running-speech tokens** of `féach … le` + verbal noun in
the entire four-volume corpus, and all three come from speakers born between 1869 and 1889:

**1. Speaker 889P (vol I, §1)** — conditional, 2sg:
> *"**dfhéachfá le dhul** …"* — 889P

**2. Speaker 869P2 (vol III, §7, on `le na`)** — Ó Curnáin cites it to illustrate `le na`
before a verbal-noun clause:
> *"**féachain LE NA geasa chur dhíom**"* — 869P2
> ("trying to get the spells off me")

**3. Speaker 875P (vol II §6.55 and again vol III §8.142)** — cited twice, same token:
> *"—Agus tá sé chomh maith dhuit, a deir sé, an chrú a chuir ina thosach, **FÉACHAINT LE
> duine a fháil dhuit héin** chomh toibeann in Éirinn s fhéadthas tú."* — 875P
> ("…**trying to get** yourself someone as suddenly in Ireland as you can")

Plus **Ó Curnáin's own metalinguistic entry** at §5.212 (vol II), which is where the gloss
lives:
> *"féach, féachtáil, féachaint, féachain … 869P **féachain test, féachain le … 869P2**. The
> by-form **féachtáil** (S) **means try to and is used with the preposition le**; féachaint
> means test (to exhaustion) … The form féachaint also generally means look at and is used
> with the preposition ar (far more common is breathnú ar). … **féachtáil is now obsolescent,
> it is unfamiliar to 21Ptq**, for example."*

### The related-but-different construction: `féachaint aN` (§8.137)

This one is genuinely alive, and it is worth Kai seeing it because it is the nearest thing the
dialect has to a *native* "try" idiom. Ó Curnáin gives it a whole numbered section, vol III
§8.137, headed **`féachaint a`**:

> **"FÉACHAINT AN, AG FÉACHAINT AN, GO BHFÉACHAINT A/GON, NÓ GO BHFÉACHAINT AN, FÉACH AN.**
> This conjunction is used to **express endeavour as in English *to see if, to try to***. The
> main lexical item is the verbal noun of féach. … Also **nonfinite use with le** (8.142)."

Attested examples, all running speech:
- *"chruinnigh naonúr nú deichniúr eile daoine isteach ann, **FÉACHAINT A lagthadh an bháisteach**, le leisce an bóthar a thabhairt dóib héin chomh maith linne"* — 869Pt
- *"ach **AG FÉACHAINT A mbogthadh sé an chasacht orm**"* — 05M
- *"chuaigh sé siar ann **FÉACHAINT A dtiúrthadh Maidhcil isteach carr móna dhó**"* — 19P3
- *"—Cuir séideog, a deir sé, faoin sáspan **FÉACHAINT A ndíonthadh sé deifir**."* — 11C
- *"**FÉACHAINT A mbogfí an deabhal**"* — S (also 16M, 35E7261)
- *"**FÉACHAINT A bhfuigheadh muid**"* — 05M
- *"bhí siad ag cuir tuairisc orm héin **FÉACHAINT A raibh aon phaca robair**…"* — 19Pt
- *"**FÉACHAINT A gcoinneoinn súil orthub**"* — M
- *"**bhí mé ag féachtáil FÉACHAINT AN ndéanthainn é**"* — S ← the only running-speech token of `féachtáil` anywhere
- *"**GO BHFÉACHAINT A mbéarthaidís eir**"* — 852S4; *"**GO BHFÉACHAINT A n-aireot sé rud a bith**"* — 875T1

**Critically, this takes a FINITE clause ("try to see whether he'd…"), not a verbal noun.**
It cannot be used to translate a bare "I'll try to do it."

### On `féachtáil` specifically

7 hits, all in vol II/III. Six of them are **paradigm and word-list entries** (§5.199, §5.207,
§5.208, §5.218) — Ó Curnáin listing `féach → féachtáil` alongside `bac → bactáil`,
`cas → castáil`. He attributes the form to one speaker, **S**, and there is exactly one
sentence of it in use anywhere (the `ag féachtáil féachaint an` token above, also S). He then
declares it obsolescent and unrecognised by 21Ptq.

### Zero results (trustworthy, given the calibration above)

- `ag féachaint le` — **0**
- `dfhéach sé le` — **0** (the only `dfhéach sé` tokens are `dfhéach sé soir agus dfhéach sé siar`, 04B = *looked*)
- `féachaint le` in vol IV — **0**. The vol IV glossary entry is only:
  *"**féacha, v. (As discourse marker)** … Cf. BREATHNAIGH."* — no "try" sense at all.

### Verdict on (1)

`féach le` **is** a real Connemara "try to" — but it is a **museum piece**. Three tokens, all
from speakers born 1869–1889, zero from anyone born later, zero in the vol IV glossary or
transcribed-speech volume, and Ó Curnáin's own word that the by-form carrying the sense is
"now obsolescent" and unfamiliar to a speaker born in 1921.

**A learner-facing course could not honestly present `féach le` as how Connemara says "try to."**
It could honestly present it as an archaism attested in the dialect. Those are different claims.

---

## (2) `traiáil` / `triail` — the borrowing

### The homograph is fully resolved, and it is decisive

Ó Curnáin's own vol IV word index carries **two separate, unrelated entries**:

> **`triail, trial, triall*, v, journey, travel`**, 5.18, -137, -235 …
> **`traíáil2, v, try`**, 5.20, -325, impv 1pl ~álamuid, pres 1sg ~álaim, pst 3sg, 3pl ~áladar,
> imprs ~eadh, fut ~álthaidh, Echo 1sg ~álthad, 2sg ~álthair, imprs ~álfear, cond imprs ~álfí,
> pstsbj ~áladh, VN …

And the English-borrowings index: **"try-áil, v, 45, see TRAÍÁIL2."**

**So: Kai's suspicion is correct. In this dialect, `triail` spelled that way is the verb
`triall` "journey, head for" — NOT "try."** All six `triail` hits are the journey verb:
- *"Noun **triall** > verb **triail ~ trial** journey, head (for)"* — Ó Curnáin, §5.18
- *"mara **dtriaileamuid**"* — 04B (present subjunctive)
- *"dhá **dtrialadh** muid"* — 43Js
- *"**thrial ar**"* — 889P; *"**thrial sé ar** an solas"* — 11C
- *"mairg a **thrial ort**"* — M

The only `triail` that means "try" is the **parenthesised standard-spelling cross-reference**
inside the glossary headword `traíáil2, (triail2)`. That is lexicographic apparatus, not
dialect attestation.

### The vol IV glossary entries, verbatim and in full

> **`traíáil1, (triail1 1.), f.` 1. Attempt, chance at, go.** Ba mhaith liom ~ a fháil air.
> **2. Respite.** Tabhair ~ dó, ní raibh ~ a bith am é a dhíonamh, má bhíonn an ~ am,
> *tabhair ~ dhom* 11C. … ní bhfuair mé mo dhóthain ~. **3. Opportunity, chance.** dhá
> bhfaighidís ~ ar bith S. **4. Patience.** bíodh ~ ad! M — *wait (up) a while!* níl ~ ar
> bith aige M.
>
> **`traíáil2, (triail2), v.` 1. Try.** *é a th-~* 897St. *~ anis e*. *Tá me ag cheapadh go
> dtraíála me síos í* M (**try to** put an infant to bed). **2. (Used by younger generation
> for `ag iarraidh` of older generation)** *ag ~ í a choinneáil in áit* 80A.
>
> **`traíáil le`, 1. Try.** *chuaigh sé ag ~ leis an dinnéar a ghoid* 897St. **2. Try it on.**
> *caithidh mé ~ eile a bheith am leat* 897St, *… another attempt*.

### Is it running speech, or a propped-up headword? Running speech, overwhelmingly.

Precise lemma counts: **23** hits for `tra[ií][aá]il` + **19** for the `-ál`/inflected shapes,
across all four volumes. Elicited (`Mq`) tokens are a small minority — I count 4
(`traíálfear` Mq, `traíálfí` Mq, and two Echo-form elicitations). The rest is speech. Named
running-speech tokens, by speaker:

**11C** (the single heaviest user):
- *"**Traíálthaidh mé é sin a dhéanamh**."* — 11C ← **the exact "I'll try to do that" frame**
- *"—Mar, níl muid i ndan thusa **a thraíáil**, a dúradar."* — 11C
- *"nó go bhfaighead sé **traíáil ar iad íoc** … ní bhfuair sé aon tseans ar iad íoc"* — 11C
- *"nach bhfuil mórán gnothasa acub ag goil **ag traíáil aon-nduine**."* — 11C
- *"dhá bhfuighinn ceathair nó cúig dhe **mhóiméadaí traíála**"* — 11C
- *"dhá mbeadh **traíáil ad lena gcomhaireamh**"* — 11C1049
- *"Tháinic sé go Gaillimh agus, ar an bpoínte agus **a bhfuair sé traíáil** chuaigh sé isteach tigh Ruáin"* — 11C
- *"**tabhair traíáil dhom**"* — 11C

**894Cs** — with `tabhair`, twice (also quoted in the vol IV glossary s.v. `as`):
> *"Nuair a bheadh an fheamainn du, ansin amuich, coidhcís ad an oiread s go bhfuighead sí
> báisteach … chaitheá, **traíáil a thabhairt di** go bhfaighead sí báisteach a bhaineadh an
> salann sáile di."* — 894Cs

**66N** — with Ó Curnáin's own English gloss attached:
> *"**TRAÍÁIL siad é** — **they tried him**"* (in court of law) — 66N

**M (Máire)**:
- *"dhá **dtraíáladh tusa leis iad**"* — M
- *"Muise a mhanam dfhéadthá a rá **go dtraíálthad**! … **go dtraíálthad**!"* — M
- *"Tá me ag cheapadh **go dtraíála me síos í**"* — M

**Others:** *"ní **thraíáilthidh** mé"* 05M · *"an **dtraíálthair**?"* 37M · *"bhíodh mé **ag
traíáil** …"* 20A · *"tá neart **traíála** fós agaí"* ARN7235 · *"trí nó ceathair dhe chuarta
**traíáileadh**"* 35E (vol IV transcript 13.21) · *"**é a th-~**, **~ anis e**"* 897St ·
*"chuaigh sé **ag traíáil leis an dinnéar a ghoid**"* 897St · *"**ag traíáil í a choinneáil in
áit**"* 80A · *"dhá bhfaighidís **traíáil** ar bith"* S.

Ó Curnáin also classes it morphologically as fully naturalised: *"There are verbs in -áil which
are **not synchronically derived**: robáil, sábháil, spáráil, **traíáil**. (These are **older
borrowings** without borrowed nominal bases.)"* (§5.—, vol II)

### Verdict on (2)

**`traíáil` is common running speech, not a glossary headword.** At least **twelve distinct
speakers**, spanning birth years **1897 to 1980** (897S → 80A) — i.e. every generation in the
corpus. It has a complete inflectional paradigm in the index, Ó Curnáin names it as the
*more common* expression of "try" over `síl`, and he names it as **the younger generation's
replacement for `ag iarraidh`**. Both `traíáil + VN` (*traíálthaidh mé é sin a dhéanamh*) and
`traíáil le + VN` (*ag traíáil leis an dinnéar a ghoid*) are attested in speech.

**A learner-facing course can honestly claim `traíáil` is Connemara.** It is a borrowing, and
that will feel uncomfortable to anyone with a purist reflex — but attested-in-dialect beats
standard-dictionary, and this is about as attested as anything gets in this corpus.

---

## (3) `iarracht` — the harsh conclusion HOLDS

I re-verified independently, classifying every hit rather than accepting the prior pass.
Raw count: **40** (the previous pass said 38; the two extra are index lines).

| class | count | notes |
|---|---|---|
| (a) compound prefix forms | **28** | `binniarracht`, `móriarracht`, `tréaniarracht`, `glaniarracht`, `dearg-bhinniarracht`, `géar-bhinniarracht`, `corr-bhinniarracht`, `fíor-bhinniarracht`, `binn-ghéariarracht`, `binn-deargiarracht`, `an-bhinniarracht`, `mo bhinn-bhinniarracht` — §§3.93, 3.132, 3.144, 3.146, 9.42 |
| (b) Munster quotation from outside the dialect | **2** | the Seán Ó Ríordáin epigraph |
| (c) elicited grammar-test token (`Mq`) | **7** | the ordinal-lenition session, vol III §9.110 |
| (d) index / table-of-contents line | **2** | vol IV indexes |
| (e) **genuine running Connemara speech** | **1** | and it is disputed — see below |
| (f) glossary entry | **0** | **there is no `iarracht` entry in the vol IV glossary at all** |

**(b) The Munster epigraph**, vol I front matter — and the Munster form `deineadh` (Connemara
would be `rinneadh`/`díonadh`) confirms the attribution:
> *"Cad is fear nó bean, tar éis an tsaoil, ach **iarracht a deineadh** ar an gcinniúint a
> throid. Dá chalma an **iarracht** is ea is mó is fear é nó is bean í."* — Seán Ó Ríordáin

**(c) The elicitation session**, vol III §9.110 — Máire, `Mq` throughout, using `iarracht`
purely as a test noun for lenition after ordinals, in the sense "go / turn":
> *"seod é a **shéú IARRACHT**"* Mq; *"seod é a **thríú IARRACHT déag**"* Mq; *"a GCÉAD / a
> DTRÍÚ / a SHÉÚ / a THRÍÚ **iarracht** (déag)"* Mq; *"a CEATHRÚ **iarracht** / **hiarracht**"* Mq.

Ó Curnáin's framing is itself telling: *"In response to query about possessives governing
ordinals, however, **the only instance of aspiration on the noun iarracht that Máire produced**
was following the 3f possessive aH…"* — this is a phonology probe, not usage.

**(e) The single spontaneous token**, vol I §3.93 — and Ó Curnáin immediately undermines it:
> *"ar mo **bhinniarracht**"* — 23B
> *"This prefix is uncommon; it was heard in conversation from **23B only**. In response to
> query, **her husband 12J did not recognise this usage, upon which 23B then became unsure of
> her actual usage.** Similarly, speakers 20C and 20My **do not permit** mo bhinniarracht."*

That is a compound noun meaning "utmost effort", recorded from one speaker, contradicted by
her husband, and retracted by her.

### The verb-frame probes — all hard zeros

| probe | all four volumes |
|---|---|
| `iarracht a dhéanamh` | **0** |
| `déanamh iarracht` | **0** |
| `iarracht a dh…` (any verb) | **0** |
| `rinne … iarracht` | **1** — and it is `rinne sé a bhinniarracht` **Mq**, elicited, compound |
| `dhéan… iarracht` | **0** |
| `thug / tabhair / tabhairt … iarracht` | **0** |
| `iarracht a thabhairt` | **0** |
| `ar an gcéad iarracht` | **0** (the `a gcéad iarracht` tokens are the Mq ordinal set) |

The only place Ó Curnáin glosses `iarracht` as "try" is the **vol IV word index**:
*"`iarracht, f, attempt, try`, 9.110."* — and its single cross-reference, **9.110**, is the
Máire ordinal-lenition elicitation. Even his own index points at the elicited token.

### Verdict on (3)

**The harsh conclusion holds. It was not too harsh — if anything it was too generous**, in
that it credited an `iarracht` glossary entry that does not exist. Zero running-speech
attestation of `iarracht` as a free noun; zero attestation of `iarracht a dhéanamh` in any
form; one disputed compound from one speaker.

Kai's distinction is exactly the right one and it is worth keeping sharp: `iarracht` = "a
go / a turn / an attempt-quantity" is a *different thing* from `iarracht a dhéanamh` = "to
make an attempt". **In Iorras Aithneach neither is attested in speech, and the second is a
categorical zero.**

**A learner-facing course could not honestly claim `iarracht a dhéanamh` is Connemara.**

---

## (4) `ag iarraidh` in the TRY sense

Raw `iarraidh` hits: **341** across the four volumes (higher than the 173 Kai had, because
this counts every orthographic shape including `dhá iarraidh`, `gá iarraidh` and the noun).

### Ó Curnáin lists "Trying" as a distinct sense — in two places

**The vol IV glossary**, which is the strongest evidence in the corpus:

> **`iarr, v.` 1. Ask.** (a) (With muc and mada, of strong exhortation) *thug sé iarraidh na
> muice agus an mhada air* M. (b) **Request.** *Ní iarrthainn breathú go brách air mara
> mbeadh aon-nduine istigh* P. (c) *—Tá se chomh dona is diarrthá* 12J. (d) **Iarr ag, ask to
> come.** *Tá Nóra dho miarraidh ag bingó*. **2. Want.** *Tá sé ag iarraidh thú fheiceál, he
> wants to see you.*
>
> **`iarraidh, f.` 1. Request, plea.** *Thugadar ~ na déirce orainn ag ~ orainn a ghoil síos*
> M … *Tá ~ a chodach ann* S. **2. VN, Trying.** *Go raibh sórt píosaí filíocht ag ~ bheith gá
> chumadh dho bhean eicínt acub. Ach bhíodh píosaí dhá chumadh is ní raibh sé ceart.* **11C**.
> **3. Blow, stroke.** *Na hiarrantaí a bhí aige* M. **4. Ar iarraidh, over, past.**

Note the split precisely: **`iarr` the verb has *Ask* and *Want* but NOT try. "Trying" lives
only on the verbal noun `iarraidh`, as sense 2.**

**The vol IV word index** agrees: *"`iarraidh, f, request, **trying**, turn, blow`."*

### The TRY-glossed instances, quoted

**1. Vol IV glossary s.v. `buíochas`** — Ó Curnáin's own gloss:
> *"**ag iarraidh a bheith ag obair dhen bh-~**"* — S — *"**trying** to work despite it all,
> despite all difficulties."*

**2. Vol IV glossary s.v. `butún`** — the try-reading is *forced* by the failure clause:
> *"chuir sé amach a bh-~ **ag iarraidh rud a dhéanamh** is **chinn sé air**"* — S
> (glossed under the idiom as *"he **tried** his utmost"*; `chinn sé air` = he failed — you
> cannot fail at wanting)

**3. Vol IV glossary s.v. `iarraidh` sense 2 "VN, Trying"**:
> *"Go raibh sórt píosaí filíocht **ag iarraidh bheith gá chumadh** dho bhean eicínt acub. Ach
> bhíodh píosaí dhá chumadh is ní raibh sé ceart."* — **11C**

**4. Vol IV glossary s.v. `traíáil2` sense 2** — the diachronic statement, which is the single
most useful line in this whole document:
> *"**(Used by younger generation for `ag iarraidh` of older generation)**"* — *ag traíáil í a
> choinneáil in áit*, 80A

**5. Vol IV glossary s.v. `oiliúint`** — genuinely ambiguous, reported as such:
> *"…é mbíonn sí tóraíocht ~? é mbíonn sí **ag iarraidh bheith tóigthí** is chuile shórt?"* — M

Kai's known example (*"Bhí muid ag iarraidh finiseáil stuf"*) is not in these four volumes
under that spelling; **EXPLICIT GAP** — I could not locate it here, so it presumably comes
from a different source in the gle-cn pile and I have not verified it.

### The ratio

Of the places where Ó Curnáin attaches an English gloss directly to an `ag iarraidh` clause,
I count **12 glossed instances: 4 TRY, 8 WANT/WISH**.

The eight WANT/WISH glosses:
- *"Bhfuil tú **ag iarraidh mé a bhearáil**?"* 64M — *"… **want** to get me barred?"*
- *"chomh luath is a fhliuchthas sí tá sí **ag iarraidh í a athrú**"* M — *"she **wants** to be changed"* (infant in nappies)
- *"tá sé **ag iarraidh caint muide**"* 72C — *"he **wants** our speech"*
- *"daoiní ag caint nach mbeadh **ag iarraidh a chloisteáil**"* 12J — *"people talking who would not **wish** to be heard"*
- *"**AG IARRAIDH A BHRISEADH**"* — *"… **want** it to get broken"*
- *"ach cén deabhal dháit a bhfuil sé **ag iarraidh ghoil**?"* M — *"but what damn place does he **want** to go?"*
- vol IV s.v. `iarr` 2: *"Tá sé **ag iarraidh thú fheiceál**, he **wants** to see you."*
- *"tá mé **ag iarraidh a chloisint e**"* 86R — want

**Genuinely undecidable between want and try:** the large majority of the ~330 unglossed
hits. `ag iarraidh` + verbal noun is structurally identical in both senses, and Ó Curnáin only
disambiguates when he happens to translate. I am not going to pretend to a ratio over the
unglossed mass.

### Is the try-reading ever *forced* by context?

**Yes, twice** — and this is the answer to Kai's question 3:
- the `butún` example, where `chinn sé air` ("he failed at it") makes a want-reading impossible;
- the `iarraidh` sense-2 example from 11C, where the poems were in fact being composed badly —
  attempting, not desiring.

Plus the decisive *systemic* evidence: Ó Curnáin's statement that younger speakers use
`traíáil` **where older speakers used `ag iarraidh`**. That is a lexicographer asserting a
straight generational substitution in the TRY slot. It is worth more than any single token.

### Verdict on (4)

**`ag iarraidh` + verbal noun IS the older generation's "try to" in Iorras Aithneach**, on
Ó Curnáin's own explicit authority, with "Trying" listed as sense 2 of the verbal noun in both
his glossary and his index. It is also, far more often, "want to" — the ambiguity is inherent
to the dialect and is not something a course can define away.

**A learner-facing course can honestly claim `ag iarraidh` is Connemara for "trying to."** It
would be dishonest to claim it *unambiguously* means that.

---

## (5) Discovery — forms nobody named

### ★ `oipinne` — a real Connemara attempt-noun, previously unnoticed

This is the find. Vol IV glossary, in full:

> **`oipinne, n.` 1. (Sudden) attempt.** *Rinne mé ~ é a shábháilt*, *An ndearna tú ~ a bith é
> a mharú?* *Thug mé ~ ach níor éirigh liom* **S**. *Ní dhearna sé ~ a bith héin* **S**.
> **2. Concession, surrender** (in) *bhí an bhean ag ul dó nó go dtug sé ~ ar a dhul ag ithe*
> **875T1** *… until he agreed …*

Vol IV index: *"`oipinne, oipne*, oibne*, n, attempt`, 1.143, -207, 6.63."*
Vol II §héin: *"Ní dhearna sé **oipinne** a bith héin"* — S.

Translated, sense 1: **"I made an attempt to save it" / "Did you make any attempt to kill
it?" / "I made an attempt but I didn't succeed."**

This is the construction `iarracht` was supposed to supply and does not — a native attempt-noun
in the `rinne mé X + [é a VN]` frame, plus `thug mé X`, attested in running speech from
speaker S and speaker 875T1, with a full glossary entry and an index headword. It is not in
FGB under this shape.

**Caveat, stated honestly:** all sense-1 tokens are from **one speaker (S)**, and the noun
carries "sudden" in Ó Curnáin's definition, so it may be aspectually narrower than a plain
"try". But it is a genuine, glossed, running-speech Connemara word for *make an attempt*, and
nobody had named it.

### ★ `síl` — "attempt" is a listed sense

Vol II §5.212: *"**síl: meaning try and think**, senses expressed more commonly by traíáil and
ceap respectively. Vadj (rare) bhí sílte aige é dhíonamh Mq …"*
Vol IV index: *"**`síl, saoil*, v, think, attempt`**."*

So `síl` carries "try" in the dialect — but Ó Curnáin explicitly says `traíáil` is the more
common vehicle for it, and his own examples of `síl` = try are marked *rare*.

### `dícheall` → the local form is **`deoicheall`**, and the auxiliary is **`tabhair`**

Kai asked which auxiliary appears. The answer is **`tabhair`**, not `déan`. Vol IV glossary:

> **`deoicheall, (dícheall). m. Utmost.** (a) *tá mo dh-~ **tugthaí** am* **SM** — *"**I have
> done my utmost**."* (b) *Bfhéidir go bhfuil sí scór, se a ~ é* **S** — *"… that's the most
> she could be."* (c) (With non-personal subject) *"… éireoidh dusta ar bhóithrí fós." —Sé a
> dh-~ é* **12J** — *"it hardly will."*

Also vol IV s.v. `cosúil`: *"—**Tá mé ar mo dhícheall.** —Ní cosúil sin leat."* — **892M**.

Index: *"`deoicheall, deicheall, dicheall, dícheall, díthcheall*, m, utmost`."*

34 raw hits, but the great majority are the compound-prefix table again
(`binndeicheall`, `géardhícheall`, `glandheicheall`, `rí-bhinndeicheall`,
`dearg-bhinndhícheall` — Mq elicitations at §3.146). Genuine running-speech idiom tokens:
**4** (SM, S, 12J, 892M).

**Note for the course:** `dícheall` means *utmost/best*, not *try*. `Tá mé ar mo dhícheall` =
"I'm doing my best". It takes no verbal-noun complement, so it cannot render "try to do X."

### `ag brath ar` — INTEND / HOPE TO, and it *does* take a verbal noun

Not "try", but a live construction Kai should know about because it competes for the same
slot in translation:
- *"an bhfuil sib **ag brath AR TOSAÍ** amáireach?"* — M
- *"bhíodar **ag brath ar é a mharú**, faoin triobló-, faoi an focal sin a rá…"* — 892M2275
- Ó Curnáin glosses the parallel `bhíodar le pósadh` as *"… were **hoping or intending** to marry"*

### Candidates that turned out to be nothing — homograph contamination, reported honestly

| form | raw | what it actually is |
|---|---|---|
| **`ag plé le`** | ~19 | **WORK AT**, not try. Vol IV: *"`plé, m.` **Work.** Ag plé le, (a) **work at**. Ag ~ le féar, múin, farraige. (b) **Deal with, affect**. (c) **Be associated with**."* Running speech: *"ag plé le farraige"* 21Pt, *"ag plé leis an talmhaíocht"* 01Pt, *"ag plé le bróibéis"* 79S. Zero try-sense. |
| **`tabhair/tabhairt faoi`** | 3, not 8 | **ZERO attempt sense.** The hits are `ag tabhairt **faoistíne**` (confession) 892M and *"bhí sé i riocht an carr a thabhairt **fúithi**"* 894Cs (bring the cart to it). Kai's "8 hits" was pure contamination. |
| **`iarraidh a thabhairt`** | 0 | hard zero |
| **`ag saothrú`** | 4 | **EARN**, not strive. All four are *"ag saothrú an bhuilín / a ghreim"* = earning a living (66J, 18Bm, S). |
| **`ag streachailt`** | 6 | Local form is **`strachail`**; index gives *"`strachail, streachail*, v, tear, struggle`"*. Struggle, not try, and **no verbal-noun-complement frame is attested**. |
| **`déanamh amach`** | 8 | **RECKON / MAKE OUT / GET ON.** *"bhídís ag déanamh amach go raibh leasú sa mbáisteach"* S; *"bhí siad ag déanamh amach go raibh a dhuine caillte"*; vol IV: *"**déan amach, make out, get on.** Cén chaoi bhfuil sib ag díonamh amach?"* S. Not try. |
| **`ceap`** | — | vol II §5.212 assigns it **think**, not try (paired against `síl`). |

### Backwards search from Ó Curnáin's English

Scanning his own English glosses for *try / tried / trying / attempt* and reading back to the
Irish, the forms that surface are exactly: **`traíáil`** (*"they tried him"* 66N; *"Try"* ×3 in
the glossary), **`ag iarraidh`** (*"trying to work despite it all"* S; *"VN, Trying"*),
**`féachaint a(N)`** (*"to see if, to try to"* §8.137), **`féachtáil le`** (*"means try to"*
§5.212), **`oipinne`** (*"attempt"*), **`síl`** (*"attempt"*), and **`deoicheall`** (*"I have
done my utmost"*). No eighth construction emerged.

---

## Summary table

| form | disambiguated running-speech count | speakers | glossed by Ó Curnáin as | honest for a course? |
|---|---|---|---|---|
| **`traíáil` (+ VN / + le)** | **~38 of 42** | 897St, 11C, 894Cs, M, 05M, 37M, 20A, 66N, 35E, 80A, S, ARN | **"Try"** (glossary v.); "**more commonly**" than síl | **YES** — every generation, full paradigm |
| **`ag iarraidh` + VN** | large but ambiguous; **4 TRY-glossed vs 8 WANT-glossed** | S, 11C, M, 12J, 64M, 72C | **"VN, Trying"** (glossary sense 2) | **YES**, as the older generation's form — but not as unambiguous |
| **`féachaint aN` + finite** | ~15 | 869P, 875T, 852S, 05M, 11C, 19P3, 19Pt, M, S, 16M, 35E | *"endeavour … **to see if, to try to***" (§8.137) | **YES** for "try to see if" — **NO** for bare "try to do X" (takes a finite clause) |
| **`féach(aint) le` + VN** | **3** | 889P, 869P2, 875P — **all born ≤1889** | *"means **try to** … with the preposition le"* + *"**now obsolescent**"* | **NO** as current Connemara; yes as an attested archaism |
| **`oipinne`** | **5** | S (×4), 875T1 | **"(Sudden) attempt"** | **PROBABLY** — one speaker for sense 1; flag as narrow |
| **`síl`** | rare, marked rare by ÓC | Mq | **"think, attempt"** (index) | **NO** — ÓC routes the try-sense to traíáil |
| **`deoicheall / dícheall`** | **4** (idiom tokens) | SM, S, 12J, 892M | **"Utmost"** — with **`tabhair`** | **YES** for "do one's best" — takes no VN complement |
| **`ag brath ar` + VN** | 3 | M, 892M | *"hoping or **intending**"* | for INTEND, not try |
| **`iarracht`** | **1**, disputed and retracted | 23B (contradicted by 12J) | index only: "attempt, try" → points at an elicitation | **NO** |
| `iarracht a dhéanamh` | **0** | — | — | **NO** |
| `ag plé le` / `tabhairt faoi` / `ag saothrú` / `déanamh amach` / `ag streachailt` | — | — | work at / confession / earn / reckon / tear | **NO** — all homograph contamination |

## Explicit gaps

1. **Kai's example *"Bhí muid ag iarraidh finiseáil stuf"* is not in these four volumes** under
   that spelling. I could not verify it here. It is presumably from another gle-cn source.
2. **`oipinne` sense 1 rests on one speaker (S).** Four tokens, one speaker, one glossary entry.
   That is real attestation but it is not breadth.
3. **The ~330 unglossed `ag iarraidh` hits are not disambiguated** and I have not pretended
   otherwise. Ó Curnáin only translates when he chooses to; the want/try ratio over the
   unglossed mass is unknowable from this corpus.
4. **Volume IV's vocabulary section is selective** — it documents what is *not* in FGB or is
   otherwise of interest. The absence of an `iarracht` entry is therefore consistent with
   "unremarkable" as well as with "unattested". The *speech* zero, however, stands on its own
   and is not subject to this caveat.
