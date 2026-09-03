# Adversarial corpus check: where the object goes after *ag goil*

**Connemara Irish (Ó Curnáin, *The Irish of Iorras Aithneach*, vols I–IV). Read-only. No DB writes, no course edits, no TTS. £0.00.**

Date: 2026-08-20. Calibration verified on every run: `Gaeilge=121, duine=521, bhí=3133` — OK.

---

## 1. Does the claim survive?

**SURVIVES.** I tried four separate ways to kill it and could not.

The claim under test: *tá mé ag goil Gaeilge a labhairt* (object between *ag goil* and a lenited verbal noun) is wrong and unattested; Connemara says *ag goil ag* + plain VN with the object **after** it.

What I found, beyond what you already had:

**(a) The negative is not a corpus artefact — the identical shape with a different verb is common.**
This is the strongest new evidence. Object-before-verbal-noun in a plain declarative is perfectly good Iorras Aithneach syntax. It is well attested after *ag iarraidh*, after *i ndan*, and in coordinated clauses:

- *bhí sé **ag iarraidh GAN é a dhíonamh*** (vol III)
- *ag iarraidh **an ghadhar a chuir*** ; *ag iarraidh **chuile shórt a phlúchadh*** ; *ag iarraidh **Maidhcil a phlúchadh*** ; *ag iarraidh **tada a dhéanamh*** ; *ag iarraidh **é a chasadh*** (×4); *ag iarraidh **rud a dhíonamh*** — roughly 19 tokens in a one- to two-word window.
- *Bhíodar **i ndan Gaeilge a léabh** go leor acub ceart go leor.* 11C (vol III) — a bare declarative, object before the VN.
- *Níor chuir aoin fhear ... suas gá ghoil 7 **é héin a thraíáil*** 869P2 (vol III) — and note that even here the object-fronting sits in the **coordinated** clause, not under *ag goil*.

So the corpus happily records *ag iarraidh X a VN*. It records *ag goil X a VN* **zero times**. That contrast, inside one corpus with one transcription convention, is a real syntactic fact and not a sampling hole.

**(b) The zero holds when you widen the window as far as it will go.**
I ran the sweep four ways, all case-insensitive, all in Python (never grep):

| sweep | hits |
|---|---|
| `(ag\|a) (goil\|ghoil\|dul\|dhul)` + 1–3 words + `a` + **lenited** VN (`bh ch dh fh gh mh ph sh th`) | 14 raw, **0 objects** |
| same + `a` + one of {rá, labhairt, léamh, inseacht, ithe, ól, iarraidh, imirt, éisteacht, insint, íoc, úsáid, oscailt, athrú, fháil} — i.e. VNs whose lenition is *invisible* in spelling | **0** |
| same + 1–2 words + `a` + **any** word | 12 raw, **0 objects** |
| bare `goil/ghoil/dul/dhul/gabháil` (no *ag* required, catching *TALAMH A MBEITHEÁ goil A CHUR*) + 1–5 words + `a` + any word | 19 raw, **0 objects** |

The reason I insisted on the second row: your original probe pattern would have **missed** *rá* and *labhairt*, which are exactly the course's verbs — `r-` and `l-` do not show lenition in spelling. It is still zero.

Every raw hit in those sweeps is one of three things: an adverb (*ag goil **thart** a bhearrthadh*, vol IV; *ag goil **thair** a chéile*, vol IV s.v. *slabhra*; *ag goil **amach thair** a chloigeann*, vol IV), a prepositional phrase (*ag goil **ar shon** a chéile* 892M1182; *ag goil **i mbreithiúnas ar** a chéile* 881J; *ag goil **amú ar** a chéile* M), or a following adverbial/relative clause (*a ghoil **síos Daingean nuair a** bheadh drochlá ann* 889P). Your count of 2 was right; widening it just adds more adverbs.

**(c) Every attested *ag goil aL* + VN has its object fronted out of the phrase, exactly as you said.**
The governing passage is vol III **§8.108**, *Verbal particles*, which lays out the whole system explicitly:

> "Confusion of aL and ag in double verbal noun constructions is exceptional for the older generation in our dialect. For example, there is regular use of double ag in *ag goil ag*: … The verbal nouns in initial position in double verbal noun constructions that show particle confusion are *g(h)oil* and *iarraidh*."

and then, verbatim:

> "There are examples from three old speakers (866E, 05M and 11C) of **preceding object** followed by aL ghoil aL (for regular ag goil aL):
> Agus is é **AN SÓRT IASCACH** a bhí mé A DHUL A DHÉANAMH ag dul ag tógáil potaí gliomacha. **866ESc25.4**;
> **CÉARD** tá tú A DHUL A DHÉANAMH liomsa …? **866ESc192.31**;
> sin é [a] raibh muid A GHOIL [A] FHÁIL as. **05M**;
> Nuair nach **É HÉIN** a bhí sí A GHOIL A PHÓSADH agus … **11C**;
> **AN FEAR** a bhí sí A GHOIL A PHÓSADH **11C**;
> Agus, seobh **SCÉILÍN BEAG** atá mé A GHOIL A ÍNSEACHT … **11C**.
> But regular *ag go(i)l aL* occurs from the same speakers (866E and 11C) and most other speakers, e.g.
> **CÉARD** tá muid AG DUL A DHÉANAMH anois? **866ESc169.26**;
> mar a dhíonthá le **CAORA** bheitheá AG GOIL A BHEARRADH. **11C**;
> **NA FATAÍ** tá tú AG GOIL A GHEARRADH **01P**."

Every single one is a relative or a cleft. The object is at the front of the *clause*, never inside the *ag goil* phrase. And vol III §8.85 confirms this is a **relative-clause** phenomenon by name — "The object of an embedded verbal noun **in a relative clause** can be expressed by direct relative with {aL + VN} or by indirect relative and {dho + possessive + VN}, i.e. *talamh a bheitheá ag goil a chur*, or *talamh a mbeitheá ag goil dhá chur*."

**(d) Ó Curnáin's own two anomalies both point the same way as you.**
Immediately after the passage above:

> "Similarly, there is an example with **following object** of aL ghoil aL for regular aL ghoil **ag**: *breith a thabhairt ar dhuine eicín A GHOIL A DHÉANAMH **A LEITHIDE SEO dhe rud***. **19P10**.
> There is **one example of ag goil aL for usual ag goil ag** in: *sagairt … AG GOIL A CHUIR **ola** ar dhaoine* **899Nt**."

Both irregular cases have the object **after** the VN, and in both Ó Curnáin says the regular form would have been *ag goil **ag***. Your point (4), quoted correctly. There is a footnote hedging the 899N one further (it may be the historically-expected *ag goil aL*, or it may be particle confusion, "as seen with other verbal nouns in initial c- such as *ag goil a chúnamh* (9.81)") — and §9.81 explains that *cúnamh*, *ceapadh* and *cónaí* are **anomalously lenited** anyway, from an elided *dho*. So *ag goil a chúnamh* is not evidence for an aL object construction at all; the *a* there is a worn-down preposition.

---

## 2. Counter-examples of a declarative with an object between *ag goil* and a lenited VN

**None. Zero, on all four sweeps, in all four volumes.** The nearest things, and why each fails:

- *a dhul **INA MBUN** agus **iad a mharú*** — a coordinated second clause, not one *ag goil* phrase.
- *gá ghoil 7 **é héin a thraíáil*** 869P2 — likewise coordinated (7 = *agus*).
- *ag goil **thart** a bhearrthadh dhi é* (vol IV, s.v. *moing*, of a horse's tail) — *thart* is an adverb.
- *ag goil **thair** a chéile* (vol IV, s.v. *slabhra*) — *thair a chéile* is a prepositional phrase, "past each other".

I would have quoted a counter-example in full if I had one. I have nothing to quote.

---

## 3. Is *ag goil ag* + VN intention, or motion?

**Overwhelmingly intention.** This is the finding that unblocks the course.

I deduplicated the raw hits to **53 real instances** and read every one. Tally by reading:

| reading | count |
|---|---|
| **near-future / intention** (no movement involved; often the subject *cannot* move) | **33** |
| motion — "go somewhere in order to do X" | 14 |
| genuinely ambiguous | 6 |

The decisive cases are the ones with subjects that cannot walk anywhere. These cannot be motion under any reading:

- *dhá mbeadh **cogadh** ag goil ag tosaí* — **21Pt**, vol I. "if a war were going to start."
- *níl fhios ad **céard** atá ag goil ag **éireachtáil*** — **10B**, vol II. "you don't know what's going to happen."
- *níl fhios aige **céard** atá ag goil ag **tarláil*** — **10B**, vol II. Same.
- *Is ní raibh **AG EASCAINÍ** ag goil ag díonamh na hoibre ceart chor a bith.* — **892M**, vol III. "And cursing wasn't going to do the work properly." The subject is a verbal noun.
- *tá **an chraobh** ag goil ag díonamh a gnotha héin* — **11C**, vol III.
- *ladhar an chorráin … **níl sé sin** ag goil ag cuir aon pholl isteach insa gcriathar* — **894Cs**, vol III. Of a sickle-point.
- *níl sé sin ag goil ag díonamh … aon pholl mór* — **894Cs**, vol IV, s.v. *ladhar*.
- *tá **sí** ag goil ag santú an uair sin* — **21Pt**, vol IV, of a boat sailing close to the wind.
- *níl tú ag goil ag seoladh an bháid … iomlán* — **21Pt**, vol IV.

And with human subjects but no possible movement:

- *tá mise ag goil ag **labhairt** leat anocht* — **11C5861**, vol III. ★ the course's own verb.
- *Mise Éamann a Búrc as an Aird Mhóir atá **ag dul ag inseacht an scéil seo*** — **866ESc25.1**, vol III. A storyteller's opening formula; pure near-future.
- *tá mé ag goil ag **rá** leat nach gcaithidh sé aon drochmheas ar an bhfata* — vol IV, transcribed speech.
- *dhá mbeitheá ag goil ag **rá rud** leis, déarthá, scaoilthidh mise faoi é* — **S**, vol IV, s.v. *scaoil faoi*. ★★ This is almost your target sentence.
- *ní raibh sé ag goil ag ínseacht **aon fhocal amháin** ach bréag* — **892M2067**, vol III.
- *mara ndéarthaidh mise iad sin nuair a ghothas mé a chodladh, níl mé ag goil ag codladh **aon néal*** — **05M**, vol III/IV.
- *bhí sí sin ag goil ag snoíochán **an mhaide*** — **892M1358**, vol III.
- *níl tú ag goil ag fáil **na coirleach dhubh** seo* — **894Cs**, vol III.
- *cé tá ag goil ag gearradh **an bhuachaill**?* — **M**, vol IV (of carving a turkey).
- *níl tú ag goil ag cur **an méid sin** anonn ormsa* — **20C**, vol IV.
- *tá mise ag goil AG ÓL **É*** — **85M**, vol II.
- *níl mé ag dul ag fágáil **seo** nó go mbeidh t'anam agam* — **866ESc285.32**, vol II.
- *tá muid ag goil ag tabhairt **a dhá gcúl** dá chéile* — **881Jtn**, vol II/III.
- *nach bhfuil tú AG GOIL AG FEABHSÚ* — **19P**, vol III.
- *bhfuil mé AG GOIL AG TRÁCHT **AIR*** — **11C**, vol III.
- *faoi go raibh an bhean óg ag goil ag pósadh* — **11C**, vol III.
- *Bhí tú ag goil ag caint faoi easóg* — vol IV, the interviewer (Brian Ó Curnáin himself).
- *gurb iad a bhí ag goil ag tosaí orm* — vol IV, of pains coming on.

Motion cases, for honesty: *a ghoil ag obair* 894C, *a ghoil ag vótáil* 27Mdq, *ag goil ag cuartaíocht chucub* 15W, *a ghoil ag cuartaíocht agána chéile* 05Mt, *a ghoil ag iarraidh an tsagart dom* 11C, *a ghoil ag caitheamh coiníní thart anseo* (vol IV), *fear a bheadh ag goil ag baint fhéir* 896P, *nárbh fhusa duitse a dhul ag ithe* 866ESc208.19, *ag goil ag troid a chúnamh dhÉirinn* 892M4812, *ag dul ag tógáil potaí gliomacha* 866ESc25.4, and a few more. Note that most of these are the **infinitival** *a ghoil ag* (after *caithfidh*, *níor mhaith liom*, *tá sé dlíthiúil*), not the progressive *tá X ag goil ag*. That is itself a useful split: **the progressive *tá … ag goil ag* + VN skews strongly to intention; the infinitival *a ghoil ag* + VN skews to motion.**

So the answer to your question is: **the course does have a Connemara way to say "I am going to". It is *tá … ag goil ag* + plain VN, object after.** And critically, **eleven of the intention instances carry a post-verbal object** — *ag óil **é***, *ag rá **rud***, *ag codladh **aon néal***, *ag ínseacht **an scéil seo***, *ag ínseacht **aon fhocal amháin***, *ag snoíochán **an mhaide***, *ag fáil **na coirleach dhubh***, *ag gearradh **an bhuachaill***, *ag cur **an méid sin***, *ag díonamh **na hoibre***, *ag seoladh **an bháid***. That is the shape you proposed, attested repeatedly, from old speakers (892M, 894Cs, 05M, 11C) and young (85M, 20C) alike.

One caution on that object: several of those take the **genitive** after the VN (*an scéil seo*, *an mhaide*, *na hoibre*, *na coirleach*, *an bháid*). Bare indefinite objects stay nominative (*rud*, *aon néal*, *é*). For the course's *rud eicínt* (56 tokens in the corpus, well attested) that is a non-issue.

---

## 4. The five sentences

| English | Connemara | status |
|---|---|---|
| I am going to speak Irish | *Tá mé ag goil ag labhairt Gaeilge* | **shape attested, collocation NOT.** *tá mise ag goil ag labhairt leat anocht* 11C5861 gives you the frame verbatim. But *labhairt + Gaeilge* as a direct object is **0** in the corpus (as is *Gaeilge a labhairt*, and *ag caint Gaeilge*). This is a real gap — see §6. |
| I am going to practise speaking | *Tá mé ag goil ag cleachtadh labhartha* | **best-attempt, weak.** *cleachtadh* occurs 15 times and is **only ever a noun** ("practice, habit"): *tá cleachtadh mhaith am air*, *DAOINE ATÁ cleachtadh ACUB* 47L, *tá láimh i ndiaidh a chleachtadh ad* S. Transitive "practise X" is unattested in Iorras Aithneach. I would not ship this sentence on corpus authority. |
| I am going to say something in Irish | ***Tá mé ag goil ag rá rud eicínt i nGaeilge*** | **attested shape, and nearly attested wholesale.** *dhá mbeitheá ag goil ag rá **rud** leis* (S, vol IV) is the same clause with a different tail. *rud eicínt* = 56 tokens. *i nGaeilge* = 8 tokens (*as Gaeilge* = 0). |
| I am going to try to speak Irish | *Tá mé ag goil ag traíáil Gaeilge a labhairt* — or, better, drop the going-to: *Tá mé ag iarraidh Gaeilge a labhairt* | **attested shape.** *ag goil ag traíáil aon-nduine* 11C (vol I) gives *ag goil ag traíáil* + object. *traíáil* is a live Connemara verb (*é a thraíáil* 897St; *traíáil anis é* M). And *ag iarraidh X a VN* is the corpus's default "trying to" — 19 tokens. Note the double-VN nesting is itself what §8.108 is about; keep it to one layer if you can. |
| are you going to help me? | ***An bhfuil tú ag goil ag tabhairt cúnamh dhom?*** | **attested shape.** *ag tabhairt cúnamh* is named by Ó Curnáin as the common form (vol III §9.81, contrasting a younger speaker's *ag tabhairt chúnamh* 84P). *cúnamh a thabhairt dhom* also fine — *cúnamh a thabhairt i bhfiosrú dátaí* appears in his own acknowledgements. Do **not** use *ag goil a chúnamh*: the lenition there is a fossilised *dho*, not the object particle (§9.81). |

---

## 5. "I am going to go" — seed 25's *tá mé chun dul*

First, the premise checks out: ***chun* is not available.** *tá mé chun* = **0** across all four volumes. *chun* + {dul, goil, labhairt, rá, déanamh} = **0**.

Second, ***ag goil ag goil* is not a construction.** There is exactly one string match, and it is a typographic repeat: vol IV s.v. *leasgleanntán* prints the same traditional run twice, *"… ag goil thrí ~ cnoic 04B. Sionnán gaoithe Mhárta ag goil ag goil thrí ~ cnoic 04B."* — the second *ag goil* is a duplicated line, not a double verbal noun. Treat it as zero.

**The attested Connemara for "I am going to go" is *tá mé le dhul / le ghoil*.** Ó Curnáin glosses it as intention himself, in vol II:

> "The past with {le + verbal noun} has a type of **future meaning** in the following example: *an raibh tusa **le ghoil** ag an Aifreann, a Bhraidhean?* M — 'were / are you **intending to go** to Mass (tomorrow), Brian?'"

and elsewhere:

- *tá mise **le ghoil** un príosúin* — **64M**, vol III
- *tá aparaesean **le ghoil** Dé Céadaoin uirthi* — **M**, vol III
- *bhí an fear eile réití **le ghoil** un róstadh* — **ARN7738**
- *"an bhfuil mé **le ghoil** abhaile?" – "Táir, a deir sí, gus tú **le ghoil** abhaile, gan mórán achair."* — **ARN-4542**, vol III

38 tokens of *le dhul / le ghoil* in total. The synthetic future is also live if you want it — *gabhthaidh mé* (5), *rachaidh mé* (6), *gothaidh mé* (1).

My recommendation for seed 25: **replace *tá mé chun dul* with *tá mé le dhul*.** It is attested, it is glossed as intention by the author, and it dodges the *ag goil ag goil* impossibility entirely. The cost is that it introduces a second "going to" frame into the course alongside *tá mé ag goil ag* — which is honest, because Connemara does have two, and the *goil*+*goil* clash is exactly why.

---

## 6. Gaps, declared

These are floors, not proofs. State them alongside any ruling.

1. **6–13% of every volume is a custom phonetic font that extracts as control bytes.** Any citation Ó Curnáin printed *only* in phonetic transcription is invisible to every count above. All my numbers are lower bounds. This matters most for the zeroes.
2. **"Speak Irish" has no attested collocation at all.** *Gaeilge a labhairt* = 0, *ag labhairt Gaeilge* = 0, *ag caint Gaeilge* = 0, *Gaeilge a chaint* = 0. The only two *a labhairt* tokens in the whole corpus are both fronted-object relatives from a **young** speaker: *Gaeilge is mó A MBÍONN chuile dhuine (a labhairt)* / *Béarla is mó A MBÍONN chuile (dhuine a labhairt)* **78Rb**, and Ó Curnáin flags 78Rb's particle usage there as "nontraditional". So the course's central sentence has **no** Iorras Aithneach model in either word order. That is a gap in the corpus, not a verdict against the sentence — but it means the *ag goil ag labhairt Gaeilge* recommendation rests on frame-attestation plus a general syntactic rule, not on a quoted sentence. A native reviewer should confirm it.
3. **"Practise" is unattested as a transitive verb.** See §4.
4. **Volumes I–III are descriptive prose that cites forms phonetically; volume IV is glossary and transcribed speech.** Frequencies are not comparable across volumes, and the intention/motion tally in §3 leans on volumes III and IV for most of its evidence.
5. **The intention/motion classification in §3 is my reading, not a machine's**, and six cases I could not decide (e.g. *ag goil ag imeacht léithi* 11C, *ag goil ag déanamh ar siúl leothub* 18J, *ag goil ag suí anseo* 04Br — the last is a bare fragment in a phonology illustration with no sentence around it). Reclassifying all six as motion would move the count to 33/20/0 and change nothing.
6. **No native reviewer has seen this.** Per the standing note on gle_cn, every ruling on this course so far is agent-authored with zero human attribution.
