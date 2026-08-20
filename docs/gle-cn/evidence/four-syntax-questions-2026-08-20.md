# Four syntax questions on gle_cn_for_eng — corpus verdicts

Connemara Irish, in build. **Read-only research. No database writes. No course edits. No TTS. £0.00.**

Sources actually read: Brian Ó Curnáin, *The Irish of Iorras Aithneach, County Galway* (DIAS 2007),
all four volumes; the legacy base Irish corpus (15,904 items); the live released standard-Irish
course as a comparison corpus (7,586 non-empty target strings); Ó Dónaill's *Foclóir Gaeilge-Béarla*
via teanglann.ie. The in-build Connemara course was read for its row inventory only.

**Calibration passed before every count**: `Gaeilge` 121, `duine` 521, `bhí` 3,133 across the four
volumes, reproducing the published controls exactly. A zero below is a real zero, subject to the
floors declared at the end.

**One instrument bug found and fixed mid-job.** My first pass at the course and base-corpus counts
used JavaScript regular expressions. JavaScript's word-boundary marker is ASCII-only, so a pattern
ending in `rá`, `mhíniú` or `fháil` never matches — it silently reported zero for eighteen rows I
had already read on screen. Every JavaScript count in this document was re-run with Unicode-aware
boundaries. The Ó Curnáin counts were always done in Python, whose boundaries are Unicode-aware,
and were never affected.

---

## Q1 — Can a whole clause occupy the fronted object slot?

**Verdict: no. The hypothesis is correct. The course's seed 8 form is ungrammatical as intended,
and it is also ambiguous into a different meaning. Confidence: confident.**

### The direct count

Searching all four volumes for a `céard`-, `cé`-, `cén`-, `go`- or `an`-headed clause sitting
immediately before `a` + a lenited verbal noun returns twenty-one raw co-occurrences of the
`céard` type. Every single one of the twenty-one, read in context, is the same construction, and it
is not the one at issue:

> `892M1780 céard a bhíodar a rá` — vol I
> `céard atá tú a dhéanamh?` — vol II
> `52P CÉARD ATÁ sib a dhéanamh?` — vol III
> `NA FATAÍ tá tú AG GOIL A GHEARRADH` — vol III, speaker 01P
> `78Rb CÉARD atá mé A IARRAIDH A DHÉANAMH?` — vol III
> `Á dheamhan fhios agam beo céard atá tú a rá` — vol III, speaker P
> `Céard a bhí tusa a rá ar ball` — vol IV, speaker SA
> `céard a bhí mé ag goil a rá?` — vol IV
> `Ní raibh fhios am ... céard a bhí sib a rá` — vol IV, speaker SM

In all of these, `céard` is a **single interrogative pronoun** which is itself the object of the
verbal noun, extracted leftward across a relative clause. The subject of the verbal noun sits
inside that relative clause — `tú`, `sib`, `siad`, `mé`. Ó Curnáin describes the mechanism himself
at vol III §8.85: *"The object of an embedded verbal noun in a relative clause can be expressed by
direct relative with {aL + VN} or by indirect relative and {dho + possessive + VN}, i.e. talamh a
bheitheá ag goil a chur, or talamh a mbeitheá ag goil dhá chur."* The thing that fronts is a noun
or a pronoun. The `a` before the verbal noun is licensed by that extracted nominal object.

The course's sentence is a different structure. In `céard atá i gceist agam a mhíniú`, the intended
parse is that the whole free relative *céard atá i gceist agam*, "what I mean", is a constituent
filling the object slot of *a mhíniú*, whose own subject is elsewhere in the sentence (*tá mé*).
**Instances of that structure in Ó Curnáin: zero.**

### The counter-pattern is attested

Verbal noun first, clausal object after:

| frame | vol I | vol II | vol III | vol IV | total |
|---|---|---|---|---|---|
| `a rá` + `go` / `gur` | 1 | 4 | 4 | 1 | **10** |
| `a rá` + `céard` | 0 | 0 | 1 | 0 | **1** |
| `a rá` + `nach` | 0 | 1 | 0 | 0 | **1** |
| `a inseacht` + clause | 0 | 0 | 0 | 1 | **1** |
| **total, clause after the verbal noun** | | | | | **13** |
| **total, clause before the verbal noun** | 0 | 0 | 0 | 0 | **0** |

The ratio is **13 : 0**. The single most on-point citation is vol III, speaker 11C:

> **`níl mé i ndan A RÁ céard a dhíonthas mé`** — "I'm not able to say what I'll do."

That is the course's own semantics — a `céard`-headed clause as the object of *rá* — and the clause
follows the verbal noun. Others: `tá sé chomh maith dhom a rá gur ...` (11C, vols I and III);
`Creidim go gcaithidh muid a rá GO RAIBH roinnt dhen Drochshaol ...` (894C, vol III);
`dfhéadthá a rá gur beag an lán puint a gheothadh ...` (16B, vol II).

### Ó Curnáin's own section on embedded interrogatives

Vol III §8.63 treats this directly, and it is the strongest evidence in the job because it is the
author analysing the construction rather than me counting strings. He gives four embedded examples.
**In all four the embedded interrogative clause is introduced by a preposition and follows the
element that governs it:**

> *Another example has céard in an embedded clause:* **`tá barail am DHE CHÉARD TÁ i gceist ad`**
> *21Pt, which is equivalent to* **`tá barail am céard atá i gceist ad`** *or* **`tá barail am dhen
> rud atá i gceist ad`**. *Similarly:* **`... aon bhreithiúnas a bhaint AS CÉARD A BHÍ scríofa ar an
> ubh`** *FFG20 s.v. céard 2. There are examples of embedded cén and embedded céardós:*
> **`Caití croínnte AR CÉN FEAR A GHOTHADH síos`** *35E9133;* **`thosaigh sé ag cuímhriú, AR CÉARDÓS
> ... CLEAS A DIMREODH SÉ`** *35E1.*

The second of these is a minimal pair for the question asked. In *aon bhreithiúnas a bhaint as
céard a bhí scríofa ar an ubh*, the fronted object slot before the verbal noun *a bhaint* is filled
by a **genuine noun phrase**, *aon bhreithiúnas*; the `céard`-clause sits **after** the verbal noun,
governed by the preposition *as*. That is precisely the arrangement the hypothesis predicts.

### Can `céard` head a free relative in object position at all?

Yes, but narrowly, and Ó Curnáin flags it as marked. He records `céard` as an object of a
preposition — the closest thing to a free relative in argument position — while noting it is
*"fairly rare as an object of a preposition in direct interrogative among older speakers"*, and he
attributes the spread of the pattern to language contact: *"The rapid increase in use of
interrogatives as direct objects of prepositions, especially by younger speakers is also through
English influence."* Ó Dónaill classes `céard` simply as an interrogative pronoun *"used in direct
and indirect questions"*, and shows no example of it heading a nominal clause in object position.

The 89 embedded interrogatives I could classify in Ó Curnáin — after *níl fhios agam*, *tá barail
ad*, *d'fhiathraigh sé dhínn*, *d'innis sí* and the like — are **89 finite clauses and zero
anything else**. `céard` after a verb of knowing or finding out is perfectly good Connemara. `céard`
as the head of a phrase that then fronts as the object of a second verbal noun is not recorded.

### Is `an rud atá i gceist agam a rá` the right repair?

Partly, and Ó Curnáin half-supplies it: his gloss on the 21Pt example offers **`dhen rud atá i
gceist ad`** as the direct equivalent of *dhe chéard tá i gceist ad*. The noun-phrase version is the
paraphrase he reaches for. `atá i gceist ag X` meaning "that X means" is independently attested in
Connemara — vol II, `séard a bhí i gceist aige`; vol IV glossary, `Ní hiad atá i gceist ad ach
páipéir`, "it isn't them you mean but paper learning".

But the exact shape — heavy noun phrase carrying its own relative clause, fronted before a verbal
noun — is **0 in Ó Curnáin**, and the volumes may simply be too thin for a long constituent. It is
attested in the legacy base corpus (`Ní deacair an rud a bhí tú a lorg a fháil`), which is standard
Irish. So the repair is *better supported* than the present form but is not itself corpus-proven for
Connemara. If the safest option is wanted, it is the order Ó Curnáin actually records twice over:
verbal noun first, clause after.

### The ambiguity, which is a separate problem

`céard atá i gceist agam a mhíniú` is string-identical in shape to the twenty-one attested
`céard ... a mhíniú` sentences. A Connemara ear meeting it will take the well-formed parse — `céard`
as the object of *mhíniú*, with *atá i gceist agam* as an intervening relative — which yields
roughly "what it is I'm on about explaining", not "explain what I mean". So even setting
grammaticality aside, the string does not reliably deliver the English it is glossed with. I record
one qualification against my own point: the "intend to" reading of *i gceist ag* is a standard-Irish
sense, and Ó Curnáin's glossary gives Connemara *i gceist* only as "of importance, concern". The
Connemara words for intention are `brath` (*tá brath mhór am gan a ghoil ann*) and `le`
(*Más leat deifir a dhíonamh*). The mis-parse risk is therefore real but smaller than it would be in
the standard language.

### What the two comparison corpora do

| corpus | clause **after** the verbal noun | clause **before** it |
|---|---|---|
| released standard course, seed rows | **2** | 0 |
| released standard course, teaching tiles | 0 | 0 |
| released standard course, practice rows | **47** | 8 |
| legacy base corpus (15,904 items) | **4** | 1 |
| **in-build Connemara course** | **0** | **17** (+1 tile) |

The released standard course's own seed 8 is `Tá mé chun triail a mhíniú cad atá i gceist agam` —
the clause after the verbal noun — and 49 of its 57 relevant rows follow it. I record the eight that
do not: they are all practice rows of the shape `cad atá i gceist agam a mhíniú`, and one of them,
glossed "he wants to explain what **he** means", still says *agam*, "what **I** mean". They look like
generated drift in the practice layer rather than authored content, which is worth knowing because
the in-build Connemara course has taken that drift pattern and made it the taught form.

In the base corpus the same meaning is rendered **`An féidir leat a rá cé 'tá i gceist agat?`** —
verbal noun first, clause after, in the identical lexical frame. Its single before-order row,
`Cé 'tá i gceist agat a fheiceáil amárach?`, is again the single-pronoun extraction type, not a
clause in the object slot.

### Scope

Eighteen rows, all at seed 8: the seed itself, one teaching tile (`céard atá i gceist agam`, which
is fine standing alone as a noun phrase — the problem is only what follows it), and sixteen practice
rows. The tile inventory at seed 8 is `what I mean` → `céard atá i gceist agam`, `to try` →
`iarracht a dhéanamh`, `to explain` → `a mhíniú`.

---

## Q2 — Is `tá mé chun` the Connemara idiom for near-future intention?

**Verdict: no. `chun` is not a future-intent marker in this dialect at all — the count is zero, not
low. The Connemara exponent is `tá mé ag goil a` + lenited verbal noun. Confidence: confident.**

### `chun` partitioned

`chun` returns **59 raw tokens** across four volumes — against 121 for `Gaeilge` and 521 for
`duine`, so it is a rare word in Iorras Aithneach to begin with. Partitioned:

| class | count |
|---|---|
| `chun cinn` (ahead, forward) | 3 |
| `chun báis` (to death) | 1 |
| `chun tosaigh` | 1 |
| `chun` + `na` / `an` / `a` (motion to a place, genitive) | 4 |
| remainder: prepositional, metalinguistic, or in quoted non-dialect text | 50 |
| **`chun` + lenited verbal noun** | **0** |
| **`tá` / `bhí` + pronoun + `chun`** | **0** |

The one apparent `chun` + lenited form is `chuaigh mathair mór abhaile **chun a thí héin**`
(869PABg337, vol III) — "went home to his own house". A house, not a verbal noun.

### The dialect form is `un`, and it is a preposition of direction

Iorras Aithneach says `un`, not `chun`: **594 tokens**, ten times `chun`'s. Ó Curnáin's vol IV index
gives the headword and its variants, with his non-attestation asterisk on two of them:

> **`un, un, n, chun, dochum*, prp, to`**, 1.113, -157, -388, 2.12, -73, 5.87, -227-228, -230, 7.25,
> -80-84, -103, 8.179, -199, 10.68, 11.129, an 10.33, chun 1.423, 10.82, **`chuin*`** 6.40 n., conj
> 10.82, -99.

The gloss is **`prp, to`** and nothing else. There is no future or intentional sense in the entry.
`chun` is listed as an unasterisked variant spelling of `un`, so it is not *impermissible* — but the
word it is a variant of is a directional preposition, and vol III notes that even that sense is
receding: *"The range of the concrete prepositional meaning* to *is narrowing."* Where `un` does
appear before a verbal noun (12 instances) the sense is purposive, not future: `tá sé géar UN a
bhaint`, "it is ready for cutting". Vol III also records `un mo thí` as **impermissible** (`MÆperm`).

### What Connemara actually uses

| frame | total, all four volumes |
|---|---|
| **`ag goil` / `ag dul` + `a` + lenited verbal noun** | **8** |
| `ag goil` / `ag dul` + `ag` + verbal noun | 56 |
| `ag goil` (all uses) | 357 |
| `ag dul` (all uses) | 18 |
| `tá` / `bhí` + pronoun + `le` + lenited verbal noun | 3 |
| `brath`, noun, glossed by Ó Curnáin as "Urge, intention" | 21 raw |

Citations, from vol III §8.108 and the vol IV glossary:

> **`CÉARD tá muid AG DUL A DHÉANAMH anois?`** — 866ESc169.26
> **`NA FATAÍ tá tú AG GOIL A GHEARRADH`** — speaker 01P
> **`mar a dhíonthá le CAORA bheitheá AG GOIL A BHEARRADH`** — speaker 11C
> **`talamh a bheitheá ag goil a chur`** — Ó Curnáin's own illustrative example, §8.85
> **`tá mise ag goil a chodladh ar chuma ar bith`** — vol IV, speaker M, glossed by Ó Curnáin with a
> future: *"... is there any chance that you will be going ..."*

The first of these is the decisive one: *what are we going to do now* has no motion in it at all.
It is pure near-future intention, and it uses `ag dul a`, not `chun`.

Two further intention frames Ó Curnáin names in his own glossary, both attested but neither a plain
declarative: `le`, sense 5, **"Intention"** — *`Más leat deifir a dhíonamh`*, *`Gabh a chodladh más
leat éirí ar maidin`* — which is conditional; and `brath`, **"Urge, intention"** — *`tá brath mhór
am gan a ghoil ann`*.

### The structural note that matters for the rest of the build

`ag goil` takes `a` + lenition when there is a fronted nominal object (*na fataí ... ag goil a
ghearradh*), and `ag` + the plain verbal noun when there is not (56 instances). Ó Curnáin flags
`AG GOIL A CHUIR ola ar dhaoine` (899Nt) as *"one example of ag goil aL for usual ag goil ag"*, so
the distinction is one he polices. Any replacement for `tá mé chun` has to respect it.

### The caveat that limits how much the courses can tell you

All three course corpora use `tá mé chun` heavily — 50 rows in the in-build Connemara course, 64 in
the released standard course, 55 in the legacy base corpus — and **`ag dul a` + verbal noun is zero
in all three**. That agreement is not three votes. The two comparison corpora are standard Irish,
they descend from the same shared English seed set, and they were produced by the same translation
pipeline, so they are one piece of evidence about the pipeline's habits, not independent evidence
about Connemara. On the Connemara question they are silent and Ó Curnáin is not.

This is fixed by ZUT at seed 5 and reaches roughly thirty rows, so it is a decision worth taking
now rather than at seed 300.

---

## Q3 — Embedded `cén chaoi` followed by a bare verbal noun

**Verdict: unattested. Not rare — absent, against a large and clean sample. Confidence: confident.**

This section does not touch the interrogative-fragment ruling of 20 August; that construction is out
of scope here and is left as it was ruled.

### What follows `cén chaoi`, all 76 instances

Case-insensitive search finds **76** instances of `cén chaoi` (the earlier figure of 65 was
case-sensitive, and vols III and IV print highlighted citations in capitals). Classified:

| what follows | count |
|---|---|
| particle `a` / `ar` / `an` / `go` + finite verb | 44 |
| particle elided before an eclipsed finite verb — the `Cén chaoi bhfuil tú?` greeting | 10 |
| `le` (one song line, recorded elsewhere in the same corpus with `a`) | 1 |
| Ó Curnáin discussing the words rather than using them | 21 |
| **bare verbal noun** | **0** |
| **object + `a` + lenited verbal noun** | **0** |

I flag one correction to my own method: an automatic classifier initially bucketed nine of these as
"bare lenited verbal noun". Read by hand, all nine are `Cén chaoi bhfuil tú?` — *bhfuil* is an
eclipsed finite verb, not a lenited verbal noun, and the relative particle is simply elided in
speech. They belong in the finite column. Anyone re-running this should read the residual bucket
line by line rather than trusting the partition.

The other exponent of embedded "how" is `an chaoi a` / `an chaoi ar` + finite verb, **103**
instances, plus `sa gcaoi` 19. Embedded examples: `Gurb in é an chaoi ar éirigh Boifinn`
(892M3054); `sé an chaoi ar, ar ghearr mé í` (vol IV); `sé an chaoi a raibh mé bruite le náire`
(23B).

### The general rule, which is what generalises past seed 10

I widened the question beyond `cén chaoi` to every embedded interrogative in the four volumes —
`céard`, `cé`, `cén áit`, `cén fáth`, `cén chaoi` — governed by *níl fhios agam*, *tá barail ad*,
*d'fhiathraigh sé*, *d'innis sí*, *níl mé cinnte* and the like:

- **followed by a finite clause: 89**
- **followed by a bare verbal noun: 0**

Representative: `ní raibh fhios am cé raibh sí ag goil` (vol IV, P); `d'fhiathraigh sé dhinn cé
raibh muid is chuile shórt` (64M, vol III); `dinsigh sí dho bhean Pheait Pháidín CÉ RAIBH SÍ AG
GOIL` (vol III); `Níl fhios am CÉARD A CHUIRTHINN FIOS AIR` (S, vol III); `gan fhios ad cé raibh tú
ag goil` (S, vol IV).

A search that looked like it had found 24 counter-examples — `cé` or `cén` directly followed by a
verbal noun — dissolves entirely on reading: 22 are `cé raibh`, "where was", where *raibh* is a
finite verb, and 2 are `cén ithe?`, where *ithe* is a noun ("what sort of eating?"). Nothing
survives. **In this dialect an embedded question word takes a finite clause. There is no bare
verbal-noun option.**

### Scope, and where it came from

The in-build course has 38 rows containing `cén chaoi`, spread over seeds 3, 4, 5, 6, 7, 9 and 10.
Of those, **12 are the embedded construction** — governed by *tá mé ag iarraidh foghlaim* or *níl mé
cinnte* — and they fall exactly as reported: one at seed 3, two at seed 4, two at seed 6, and
**seven at seed 10**. Examples: `Tá mé ag iarraidh foghlaim cén chaoi Gaeilge a labhairt`;
`níl mé cinnte cén chaoi labhairt`; `níl mé cinnte cén chaoi rud eicínt a rá i nGaeilge`.

This is inherited rather than invented. The released standard course has the same shapes built on
`conas` — 20 rows of `conas` + bare verbal noun and 23 of `conas` + object + `a` + verbal noun — so
the Connemara course has taken an already-doubtful standard form and swapped the dialect
interrogative into it. The legacy base corpus, by contrast, uses `conas a` + finite verb in 155 rows
and the bare form in 1.

### On the repair

The corpus-correct shape is a finite clause. I stop short of writing the replacement sentences,
because the obvious one collides with a live ruling: `labhair` has no present tense anywhere in Ó
Curnáin's paradigm, so `cén chaoi a labhraím` is not available. That interaction needs deciding
before the twelve rows are rewritten, and it is a content decision rather than a corpus finding.

---

## Q4 — `iarracht a dhéanamh` followed by a bare verbal-noun clause

**Verdict: the prepositionless form does not need `ar`. Adding `ar` would not repair it and is not
the dictionary's frame either. But the corpus cannot settle this from Connemara evidence, and
`iarracht` has a larger problem than its preposition. Confidence: best attempt.**

### Ó Curnáin is silent on both sides

| | vol I | vol II | vol III | vol IV | total |
|---|---|---|---|---|---|
| `iarracht` raw | 2 | 0 | 6 | 1 | **9** |
| **`iarracht a dhéanamh`** | 0 | 0 | 0 | 0 | **0** |
| **`iarracht ar`** | 0 | 0 | 0 | 0 | **0** |
| `iarracht` + `a` + lenited verbal noun | 0 | 0 | 0 | 0 | **0** |
| `rinne` + subject + `iarracht` | 0 | 0 | 0 | 0 | **0** |

Both candidate frames are zero, so this dialect corpus cannot choose between them. The nine raw
hits confirm the earlier finding that `iarracht` has no ordinary running-speech attestation in
Iorras Aithneach: two are the Seán Ó Ríordáin epigraph printed at the front of vol I, which is
Munster literary Irish by a Cork poet (*"ach **iarracht** a deineadh ar an gcinniúint a throid"* —
note it is a *Munster* text that supplies the only `ar` in the whole corpus, and it goes with
*deineadh*, not with *déanamh* of an attempt); six are a single elicitation session with speaker
Máire about lenition after ordinals, where `iarracht` is merely the test noun and means "go, turn"
(*seod é a shéú iarracht*); and one is the bare index line, `iarracht, f, attempt, try, 9.110`.

### Ó Dónaill

The FGB entry gives these frames: **`iarracht a thabhairt ar, faoi, rud a dhéanamh`**;
**`iarracht a dhéanamh`**; `iarracht ar dhuine a cheansú`; `iarracht a bhaint as rud`.

This adjusts the premise slightly. The dictionary's frame that links to a following verbal-noun
clause pairs `ar` with **`thabhairt`**, not with `déanamh` — *iarracht a thabhairt ar rud a
dhéanamh*. `iarracht a dhéanamh` is listed on its own, "make an effort", with no complement frame
shown at all. So the dictionary does not license `iarracht a dhéanamh ar` + verbal-noun clause;
if `ar` were wanted, the verb would have to change to `thabhairt` as well.

### The base corpus

In 15,904 items: **`iarracht a dhéanamh` 38, `iarracht ar` 0.** Three of the 38 are followed by a
verbal-noun clause — two link it with `chun` (`iarracht a dhéanamh chun teaghlach sona a
chruthú`), and one is bare and is exactly the shape in question:

> **`Nár chóir dúinn iarracht a dhéanamh dea-shampla a leagan?`**

Prepositionless `iarracht a dhéanamh`, followed directly by a fronted-object verbal-noun clause.
That is the course's structure, and it is attested. The released standard course has zero
`iarracht a dhéanamh` — it uses `triail` throughout — so it does not vote.

### Conclusion, and the bigger issue

On the narrow question asked: the course's `tá mé chun iarracht a dhéanamh Gaeilge a labhairt` does
**not** need `ar`. The prepositionless form before a verbal-noun clause is normal standard Irish and
is attested in the base corpus; `ar` in that slot belongs to a different frame with a different
verb. I mark this **best attempt** rather than confident because the Connemara corpus is empty on
both sides and the verdict rests on the dictionary plus a standard-Irish corpus.

The preposition is not this seed's real problem. `iarracht` itself has zero unqualified
running-speech attestation in Iorras Aithneach across all four volumes, and the dialect's own word
for the concept is `traíáil` (vol IV: *`traíáil2`, (triail2), v. 1. `Try`*; *`traíáil1`, (triail1),
f. 1. `Attempt, chance at, go`*), which in turn collides with the course's standing ban on
`ag triail`. Getting the preposition right on a word the dialect may not use is the smaller half of
the question, and the larger half needs a native ear.

---

## Gaps — evidence I could not reach

These are declared rather than papered over.

- **The phonetic transcription in all four volumes is unreadable.** It is set in a custom font that
  extracts as control bytes. Every count in this document is **orthography only**, and every one is
  therefore a **floor, not a total**. A form Ó Curnáin records only in phonetic transcription is
  invisible to me. This is the single largest limitation and it applies to all four questions.
- **The vol IV glossary and index abbreviate headwords with a tilde**, so a collocation written
  `tá mo dh-~ tugthaí` cannot be found by searching for the words it contains. All glossary and
  index counts are floors for the same reason.
- **No native Connemara speaker has reviewed any of this.** The course has no native reviewer, and
  every verdict above is corpus reasoning offered to a human ear, not a ruling.
- **I did not reach an independent modern Connemara prose corpus.** Searches for Corpas na Gaeilge
  and the RIA corpora returned index and search-form pages rather than queryable results, so
  nothing from them is counted here. Ó Curnáin is therefore my *only* Connemara source; the other
  two corpora are standard Irish.
- **The two comparison corpora are not independent of each other.** The released standard course and
  the legacy base corpus descend from the same shared English seed set and the same translation
  pipeline. Where they agree, that is one piece of evidence about the pipeline, not two about Irish.
- **Q4's verdict rests on no Connemara evidence at all**, since both frames are zero in Ó Curnáin.
  It is dictionary plus standard-Irish corpus, and is labelled accordingly.
- **The running-speech versus glossary-headword split** in the citation lists was done by reading,
  not by machine. The raw per-volume totals are machine-counted; the classifications are hand-made.
- **Nothing was written.** No database row, no course text, no audio, no TTS. Every count above was
  taken from a read-only query or a local text file.
