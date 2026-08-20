# Connemara Irish — the translation-choice register

**Course `gle_cn_for_eng`. 20 August 2026. Binding on every translation worker on seeds 37–300.**

> **Read this before you translate a single seed.** If your English is in this document you use this
> document's Irish, every time, with no improvements. If your English is *not* here and you judge it
> will recur, **add it here in the same commit** with your authority and your confidence label, so
> the worker on the next band inherits it. If a ruling here looks wrong to you, **use it anyway and
> file the objection in your report** — an inconsistent course cannot be repaired; a consistent one
> that is wrong in one place can.

This is the translation-choice step of `synonym-choice-architecture.md`, applied *before*
decomposition. Nothing here has been written to the database. No audio exists and none is to be made.

---

## 0. How to read this, and the one principle that resolves the hard cases

Every entry gives **the English**, **the one Irish form**, **an authority**, **a confidence label**,
and — under R2, no bare frames — **a whole example sentence**, never a slot.

The confidence labels are the brief's:

- **confident** — attested in Connemara, or the dictionary's own frame.
- **best attempt** — regular and not contradicted, but not directly attested.
- **genuinely uncertain** — I am guessing at the wording and a speaker should look at it.

**Authorities.** `FGB` = Ó Dónaill, *Foclóir Gaeilge–Béarla* (1977), via teanglann.ie.
`ÓC` = Ó Curnáin, *The Irish of Iorras Aithneach* (DIAS 2007), four volumes, counted today with
`tools/gle-cn/ocurnain-probe.py` (controls passed: `Gaeilge` 121, `duine` 521, `bhí` 3133).
Where I give a count it is mine, taken today. **A bare zero is not evidence** — the noise floor on
ordinary words in this corpus is 2–9 across ~2,700 pages, and modern-life vocabulary can be honestly
absent from a corpus of narrative speech. I say so where it applies.

### The principle that decides R1-vs-ZUT collisions

Kai's **R1** — *the dialect form as actually spoken beats the standard, always* — and **ZUT** — *one
known prompt, exactly one target form* — pull in opposite directions wherever the dialect form
differs from something seeds 1–36 already banked. I have resolved every such case the same way, and
you should too:

> **R1 governs any form the course has not yet fixed. ZUT governs any form it has.**
> Where seeds 1–36 already carry a form, that form stands for 37–300 even if Connemara prefers
> another — because seeds 1–36 are not ours to rewrite tonight, and a register that makes seed 37
> disagree with seed 32 destroys the exact thing it exists to protect. Every such case is recorded
> in **§18, the standing dialect debt**, with its counts, so Kai can sweep the whole course in one
> pass later. There is no audio, so that sweep stays cheap indefinitely.

Applied: `ag cheapadh` (§3) is ruled the Connemara way because nothing was fixed. `dom`/`duit`
(§18.1) is held at the standard because S11 and S32 fixed it.

---

## 1. Necessity and obligation — the four-way split

English distinguishes *want* / *need* / *have to* / *must*. Irish has enough forms to keep all four
apart, and the course has already spent two of them. **Do not let these collide.**

| # | English | Irish | authority | confidence |
|---|---|---|---|---|
| 1 | I want / I'm trying | `tá mé ag iarraidh` | **already fixed, S1/S2** | — |
| 2 | I have to / I must | `caithfidh mé` | **already fixed, S25** (`sula gcaithfidh mé dul`); FGB `caith` 6 | confident |
| 3 | I had to (past) | `b'éigean dom` | ÓC: `b'éigin`/`gurbh éigin`/`narbh éigin` "had to", 10 across four vols | confident |
| 4 | I need to (+ verb) | `is gá dom` / neg `ní gá dom` / q `an gá dom` | FGB `gá`: *"ní gá duit é a dhéanamh"* — the dictionary's own frame. ÓC `gá` 388 raw | best attempt |
| 5 | I need (+ noun) | `tá … ag teastáil uaim` | FGB `teastaigh`; ÓC `teastaigh` 9 | best attempt |
| 6 | I should / you should | `ba cheart dom` / `ba cheart duit` | ÓC **13**, in running speech — *"ba cheart duit breathnú, a deir sé"* (vol I, 11C); `ba chóir` **0** | confident |
| 7 | you shouldn't | `níor cheart duit` | as #6, regular negative | best attempt |

**Examples (R2 — whole sentences).**

- #2 · *we must work hard to learn a lot of new words* → **Caithfidh muid obair go crua le go leor focla nua a fhoghlaim.**
- #3 · *Did you have to finish everything last night?* → **Ar b'éigean duit chuile shórt a chríochnú aréir?**
- #4 · *so I don't need to change* → **Mar sin ní gá dom athrú.**
- #4 · *I don't need to know everything* → **Ní gá dom fios a bheith agam ar chuile shórt.**
- #5 · *no I'm not ready yet, I need a little more time* → **Níl mé réidh fós, tá beagán níos mó ama ag teastáil uaim.**
- #6 · *you should ask yourself why it's not working* → **Ba cheart duit fiafraí díot féin cén fáth nach bhfuil sé ag obair.**

> **Why `caithfidh` and not `tá orm`.** S25 already banked `sula gcaithfidh mé dul` for *"before I
> have to go"*. That fixes *have to* = `caith`. Do not introduce `tá orm` as a second one.

> **Note on #4.** `gá dom` is **0** in Ó Curnáin. I am not treating that as refutation — it is a
> two-word collocation inside the noise floor, and `gá` itself is everywhere in the corpus. But it is
> the weakest link in this section and it belongs on the native-ear list.

---

## 2. Knowing — three different Irish verbs, and you must not merge them

This is the single largest ZUT trap in seeds 37–300. English *know* is at least three things.

| # | English | Irish | authority | confidence |
|---|---|---|---|---|
| 8 | I know that … (a fact) | `tá a fhios agam go …` | ÓC `fhios agam` **17**; `tá a fhios` 4, `níl a fhios` 4 | confident |
| 9 | I don't know … (a fact) | `níl a fhios agam …` | as #8 | confident |
| 10 | I know [a person] | `tá aithne agam ar …` | FGB `aithne`; ÓC **144** across four vols | confident |
| 11 | I don't know [people] | `níl aithne agam ar …` | as #10 | confident |
| 12 | I know how to … | `tá a fhios agam cén chaoi a …` + **finite verb** | ÓC: of 48 interrogative `cén chaoi`, **48 take a particle + finite verb** (job #476, re-confirmed) | best attempt |
| 13 | I don't know how to … | `níl a fhios agam cén chaoi a …` | as #12 | best attempt |
| 14 | who has Irish / who speaks Irish | `a bhfuil Gaeilge acu` | **already fixed, S22**; R6 | confident |
| 15 | she speaks Irish (proficiency) | `tá Gaeilge aici` | **already fixed, S9/S13**; ÓC vol I, speaker 21Pt: *tá Gaeilge aici chomh maith liomsa* | confident |

**Examples.**

- #8 · *I know a young man who wants to work with you* → **Tá aithne agam ar fhear óg atá ag iarraidh obair leat.** *(that one is #10 — the person reading, not the fact)*
- #9 · *I don't know why you think that it's so good* → **Níl a fhios agam cén fáth a bhfuil tú ag cheapadh go bhfuil sé chomh maith sin.**
- #11 · *they are people I don't know* → **Is daoine iad nach bhfuil aithne agam orthu.**
- #12 · *I know how to do what I need to do next week* → **Tá a fhios agam cén chaoi a ndéanfaidh mé an rud is gá dom a dhéanamh an tseachtain seo chugainn.**
- #15 · *which of your friends speak Irish?* → **Cé de do chairde a bhfuil Gaeilge acu?**

> **Two hard warnings.**
> **(a)** *"I don't know those people"* (seed 85) is **#11, not #9.** `Níl a fhios agam na daoine sin`
> is not Irish. Person-knowing is always `aithne`.
> **(b)** `ar eolas` is **0 in all four volumes.** Do not use it for "know". Use `fios`
> (`fios a bheith agam ar rud`, ÓC 3) — including in the brief's own worked example in §7 of
> BUILD-BRIEF, which uses `ar eolas agam`. **That example is illustrative formatting, not a ruling;
> follow this register instead.**
> **(c)** #12 is the seed-3 problem again. `cén chaoi` in this course is the *nominal* "how to"
> (`cén chaoi labhairt`, S3). After *"I know"* the English has a finite clause underneath it, so use
> the particle + finite verb that Ó Curnáin's 48-for-48 supports. Do **not** write
> `tá a fhios agam cén chaoi labhairt` — that reads as the S3 fragment glued on.

---

## 3. Thinking, believing, hoping, wondering

| # | English | Irish | authority | confidence |
|---|---|---|---|---|
| 16 | I think that … | `tá mé ag cheapadh go …` | ÓC **`ag cheapadh` 58** vs `ag ceapadh` 9, running speech, speakers 11C, 20Mlt, 889P, 892M, M88, 45N | confident |
| 17 | I thought that … | `bhí mé ag cheapadh go …` | as #16, on the S30 past-progressive pattern (`Bhí mé ag iarraidh`) | best attempt |
| 18 | I don't think / he didn't think | `níl mé ag cheapadh go` / `ní raibh sé ag cheapadh go` | as #16 | best attempt |
| 19 | I'm thinking about … (ponder) | `tá mé ag smaoineamh ar …` | FGB `smaoinigh ar`; ÓC `smaoineamh` 3 — inside the noise floor, not refuted | best attempt |
| 20 | an idea | `smaoineamh` | FGB; deliberately the same root as #19 | confident |
| 21 | I believe that … | `creidim go …` | ÓC `creidim` **30** | confident |
| 22 | I hope (that) … | `tá súil agam go …` | FGB `súil` 4: *"tá súil agam go …"*; ÓC 1 — a formula, rare in narrative | best attempt |
| 23 | I wonder if … | `meas tú an …` | ÓC `meas tú`/`meastú` **27**, and ÓC states the interrogative *"can be nonspecific"* — exactly the *I wonder* use | best attempt |
| 24 | I'm looking forward to … | `tá mé ag súil le …` | **already fixed, S29** | — |
| 25 | I wasn't expecting it | `ní raibh mé ag súil leis` | same idiom as #24, different English | best attempt |

**Examples.**

- #16 · *I think that you're doing very well* → **Tá mé ag cheapadh go bhfuil tú ag déanamh go han-mhaith.**
- #17 · *I thought that was a good idea* → **Bhí mé ag cheapadh gur smaoineamh maith é sin.**
- #19 · *I started to think about it carefully last month* → **Thosaigh mé ag smaoineamh air go cúramach an mhí seo caite.**
- #21 · *I believe that your idea was very good* → **Creidim go raibh do smaoineamh an-mhaith.**
- #22 · *I hope you'll be able to come to the party* → **Tá súil agam go mbeidh tú in ann teacht chuig an gcóisir.**
- #23 · *I wonder if he knows the answer* → **Meas tú an bhfuil a fhios aige an freagra.**

> ### ⚠️ `ag cheapadh`, with the `ch-`, is NOT a typo. Do not "correct" it.
> Connemara lenites the verbal noun of *ceap* after `ag`. This is verb-specific, not a general rule —
> in the same corpus `ag caint` is 79 against `ag chaint` 2, and `ag déanamh` is 72 against
> `ag dhéanamh` **0**. But `ag cheapadh` beats `ag ceapadh` **58 to 9** in running speech from at
> least six different speakers, and Ó Curnáin discusses it as a retention. Under R1 this is exactly
> the case where the dialect form wins: it is lexical, it is robust, and `ceapadh` is still findable
> in FGB by anyone who strips the lenition. **Nothing in the course fixed "think" before now, so ZUT
> does not object.** Write `ag cheapadh` every time.

> **Note on #23.** `feadar` is 2 in the corpus and Munster-flavoured; I rejected it. `meas tú` is what
> Connemara has. It is literally 2nd person — a speaker should be asked whether they would really say
> `Meas tú an bhfuil …` when talking to themselves, or restructure the English.

---

## 4. Liking and enjoying — `enjoy` must not collide with `is maith liom`

| # | English | Irish | authority | confidence |
|---|---|---|---|---|
| 26 | I like / I don't like | `is maith liom` / `ní maith liom` | **already fixed, S26/S27** | — |
| 27 | I enjoy … | `tá mé ag baint taitnimh as …` | FGB `taitneamh`: *"taitneamh a bhaint as rud"*; ÓC `taitneamh` 8, `taitn-` 23 | best attempt |
| 28 | I don't enjoy … | `níl mé ag baint taitnimh as …` | as #27, on the S19 negative-progressive pattern | best attempt |
| 29 | I'm enjoying … | `tá mé ag baint taitnimh as …` | same as #27 — English progressive, Irish already progressive | best attempt |
| 30 | he likes to / doesn't like to | `is maith leis` / `ní maith leis` | S26 paradigm extended | confident |

**Examples.**

- #27 · *I enjoy doing interesting things with my friends* → **Tá mé ag baint taitnimh as rudaí suimiúla a dhéanamh le mo chairde.**
- #28 · *I don't enjoy waking up when I didn't sleep very well* → **Níl mé ag baint taitnimh as dúiseacht nuair nach raibh mé i mo chodladh go maith.**
- #29 · *I'm enjoying finding out more about this language* → **Tá mé ag baint taitnimh as níos mó a fháil amach faoin teanga seo.**
- #30 · *my mother likes to read* → **Is maith le mo mháthair léamh.**

> **Why not `is breá liom`.** It is shorter and unimpeachably Connemara, but it means *love*, and its
> negative (`ní breá liom`) is not natural. `baint taitnimh as` is long, but it is FGB's own frame,
> it negates cleanly, and it rides the `tá mé ag …` backbone the course has used since seed 1.
> **This is the entry a speaker should be pointed at second, after §1 #4.** If it sounds bookish to
> them, the fallback is `taitníonn … liom` — but that risks reading as *like*, which is spent.

---

## 5. Ability — `in ann`, and how "could" fits

`in ann` is fixed at S10/S11 and S24 and S28/S29. **Everything in this family routes through it.**

| # | English | Irish | authority | confidence |
|---|---|---|---|---|
| 31 | I can / can't | `tá mé in ann` / `níl mé in ann` | **already fixed, S10** | — |
| 32 | can you …? | `an bhfuil tú in ann …?` | S10 paradigm | confident |
| 33 | could you …? (polite request) | `an mbeifeá in ann …?` | conditional of `bí` + the fixed `in ann` | best attempt |
| 34 | if he could / if she could | `dá mbeadh sé in ann` / `dá mbeadh sí in ann` | as #33 | best attempt |
| 35 | I couldn't (past) | `ní raibh mé in ann` | S10 paradigm in the past | confident |
| 36 | I won't be able to | `ní bheidh mé in ann` | **already fixed, S24** | — |
| 37 | I'll be able to | `beidh mé in ann` | S24 paradigm, positive | confident |

**Examples.**

- #32 · *can you tell me what your name is?* → **An bhfuil tú in ann inseacht dom céard é d'ainm?**
- #33 · *could you say that again a little more slowly?* → **An mbeifeá in ann é sin a rá aríst beagán níos moille?**
- #34 · *he would give you an answer if he could* → **Thabharfadh sé freagra dhuit dá mbeadh sé in ann.**
- #35 · *he wasn't very patient when I couldn't answer* → **Ní raibh mórán foighde aige nuair nach raibh mé in ann freagra a thabhairt.**
- #37 · *and then I'll be able to come and help later on* → **Agus ansin beidh mé in ann teacht agus cabhrú ar ball.**

> `féidir` is **not** in this register. Do not introduce `an bhféadfá` for "could you" — it would be
> a second ability verb and ZUT breaks. (`is féidir` survives only inside the frozen S3 chunk
> `chomh minic agus is féidir`.)

---

## 6. Feeling — the entry I am least sure of

`mothú` is fixed at S26 (*"I like feeling as if I'm nearly ready to go"*), where it is a verbal noun
with a clause under it. Seeds 37–300 want *"I feel tired"* / *"I feel okay"* / *"how do you feel?"*,
which is a different construction, and idiomatic Irish puts the state **on** you rather than in a
copula.

| # | English | Irish | authority | confidence |
|---|---|---|---|---|
| 38 | feeling (verbal noun, with a clause) | `mothú` | **already fixed, S26** | — |
| 39 | I feel tired | `tá tuirse orm` | FGB `tuirse`: *"tá tuirse orm"* — the dictionary's own frame | confident |
| 40 | I feel okay | `tá mé ceart go leor` | ÓC `ceart go leor` 6 | confident |
| 41 | I feel better / worse than … | `tá mé níos fearr / níos measa ná …` | `níos fearr` **already fixed, S29** | confident |
| 42 | how do you feel at the moment? | `cén chaoi a bhfuil tú faoi láthair?` | ÓC: `cén chaoi a` + finite verb, 48/48; `faoi láthair` 11 | best attempt |
| 43 | I feel as if … | `tá mé ag mothú amhail is go …` | `amhail is go` **already fixed, S26** | **genuinely uncertain** |
| 44 | she was feeling nervous | `bhí faitíos uirthi` | FGB `faitíos`; `neirbhíseach` is **0** in ÓC and is a modern loan | best attempt |

**Examples.**

- #39 · *but I'm a little tired this morning* → **Ach tá beagán tuirse orm ar maidin.**
- #40 · *I feel okay, but I'm starting to feel tired* → **Tá mé ceart go leor, ach tá tuirse ag teacht orm.**
- #42 · *how do you feel at the moment?* → **Cén chaoi a bhfuil tú faoi láthair?**
- #43 · *I don't feel as if I'm ready to have a conversation* → **Níl mé ag mothú amhail is go bhfuil mé réidh le comhrá a bheith agam.**

> ### This section is the weakest in the register and I want that on the record.
> English *feel* covers a physical state (#39), a general state (#40), a comparison (#41) and an
> epistemic hedge (#43), and **Irish uses four unrelated constructions for them.** ZUT is technically
> intact — each English string maps to exactly one Irish — but a learner meeting four different
> Irish shapes for one English word will find it arbitrary, and I cannot make it tidier without
> making it wrong. #43 in particular (`ag mothú amhail is go`) is a calque of the English and I am
> not confident a Connemara speaker would produce it; the honest alternative is to translate seeds
> 114/115 as *"I think I'm doing worse today"* and drop *feel as if* entirely, but that changes the
> English, which is not mine to do. **Ask a speaker about #43 first, then #42.**

---

## 7. Possession and "have got"

The `tá X agam` construction was introduced deliberately at seed 9 (see `open-calls-resolved`, §2).
Everything in this family is that same construction.

| # | English | Irish | authority | confidence |
|---|---|---|---|---|
| 45 | I have Irish | `tá Gaeilge agam` | **already fixed, S9** | — |
| 46 | I've got / I have (possession) | `tá … agam` | FGB `ag`; S9 | confident |
| 47 | have you got …? | `an bhfuil … agat?` | as #46 | confident |
| 48 | I haven't got / I don't have | `níl … agam` | as #46 | confident |
| 49 | I've got nothing left to … | `níl tada fágtha agam le …` | `tada` ÓC **207**, and **already fixed, S35**; `fágáil` ÓC 15 | best attempt |
| 50 | I don't have the faintest idea | `níl tuairim dá laghad agam` | FGB `tuairim`: *"níl tuairim agam"* | best attempt |

**Examples.**

- #46 · *thank you very much, but I've got more to learn* → **Go raibh míle maith agat, ach tá níos mó le foghlaim agam.**
- #47 · *have you got more to learn?* → **An bhfuil níos mó le foghlaim agat?**
- #48 · *no unfortunately I've got too much work* → **Níl, faraor tá an iomarca oibre agam.**
- #49 · *I've got nothing left to say* → **Níl tada fágtha agam le rá.**

---

## 8. Speech verbs — say, said, tell, ask, and the one collision I could not remove

| # | English | Irish | authority | confidence |
|---|---|---|---|---|
| 51 | to say something | `rud eicínt a rá` | **already fixed, S4** | — |
| 52 | what you said | `an rud a dúirt tú` | FGB `abair`; ÓC has the whole `abair` past paradigm | confident |
| 53 | I didn't say that … | `níor dhúirt mé go …` | as #52 | confident |
| 54 | to tell (me / you / us) | `inseacht (dom / duit / dúinn)` | ÓC **`inseacht` 30** vs `insint` **4** — the Connemara verbal noun | confident |
| 55 | they told us that … | `d'inis siad dúinn go …` | as #54 | confident |
| 56 | to ask (someone something) | `rud eicínt a fhiafraí de` | **already fixed, S30** (`a fhiafraí díot`) | — |
| 57 | to ask for help | `cabhair a iarraidh` | FGB `iarr`; `cabhrú` **already fixed, S25** | **genuinely uncertain** |
| 58 | I'll ask him / her | `fiafróidh mé de / di` | S30 paradigm, future | best attempt |
| 59 | to talk (ongoing) | `ag caint` | **already fixed, S19**; ÓC `ag caint` 79 | — |
| 60 | to speak (verbal noun) | `labhairt` | **already fixed, S3**; **R6 — never a finite present** | — |

**Examples.**

- #52 · *I agree with what you said about your friend* → **Aontaím leis an rud a dúirt tú faoi do chara.**
- #54 · *she didn't want to tell me where it was* → **Ní raibh sí ag iarraidh inseacht dom cén áit a raibh sé.**
- #55 · *they told us that they didn't want to explain* → **D'inis siad dúinn nach raibh siad ag iarraidh míniú.**
- #57 · *they wanted to ask for help* → **Bhí siad ag iarraidh cabhair a iarraidh.**
- #58 · *I'll ask her where she wants to go* → **Fiafróidh mé di cén áit a bhfuil sí ag iarraidh dul.**

> ### The `iarraidh` collision, stated plainly because I could not remove it
> The course fixed *want* and *trying* as `ag iarraidh` at seeds 1 and 2. Irish for *ask for* is also
> `iarr`. So seed 212, *"they wanted to ask for help"*, comes out as
> **`Bhí siad ag iarraidh cabhair a iarraidh`** — the same word twice, in two senses, in one sentence.
> **This does not break ZUT** (ZUT constrains English→Irish, and each English string here still has
> exactly one Irish form) but it is genuinely confusing to a learner and I want it flagged rather
> than smoothed. I considered `cabhair a fháil` ("get help") — that changes the meaning — and
> `iarraidh ar dhuine cabhrú` — which is longer and still contains `iarraidh`. **I chose the honest
> one.** A speaker should be asked whether they would restructure seed 212 entirely.

---

## 9. The want/try paradigm, past and negative — extend, do not invent

Seeds 30–32 fixed the 1sg and 2sg past. Extend it mechanically. **The whole `ag iarraidh` frame
inflects only in the `bí` at the front.**

| # | English | Irish | authority | confidence |
|---|---|---|---|---|
| 61 | he wants / she wants | `tá sé ag iarraidh` / `tá sí ag iarraidh` | **already fixed, S16/S17** | — |
| 62 | we want | `tá muid ag iarraidh` | **already fixed, S18** — `tá muid`, never `táimid` | — |
| 63 | they want | `tá siad ag iarraidh` | ÓC `tá siad` **88** — 3pl present is analytic in Connemara | confident |
| 64 | I wanted / you wanted | `bhí mé ag iarraidh` / `bhí tú ag iarraidh` | **already fixed, S30/S31** | — |
| 65 | he wanted / she wanted | `bhí sé ag iarraidh` / `bhí sí ag iarraidh` | S30 paradigm | confident |
| 66 | we wanted | `bhí muid ag iarraidh` | ÓC `bhí muid` **39** vs `bhíomar` **3** | confident |
| 67 | **they wanted** | **`bhíodar ag iarraidh`** | ÓC **`bhíodar` 154** vs `bhí siad` **38** — see the box below | confident |
| 68 | he doesn't want / she doesn't want | `níl sé ag iarraidh` / `níl sí ag iarraidh` | **already fixed, S34/S35** | — |
| 69 | he didn't want / she didn't want | `ní raibh sé ag iarraidh` / `ní raibh sí ag iarraidh` | S34 negative in the past | confident |
| 70 | we didn't want | `ní raibh muid ag iarraidh` | **already fixed, S36** (`níl muid`), in the past | confident |
| 71 | I want you to … / he wanted me to … | `tá mé ag iarraidh go …` / `bhí sé ag iarraidh go …` + conditional | **already fixed, S15** (`go labhrófá`) | best attempt |

**Examples.**

- #65 · *he wanted to write a letter to his friend last week* → **Bhí sé ag iarraidh litir a scríobh chuig a chara an tseachtain seo caite.**
- #66 · *we wanted to give you a little more time* → **Bhí muid ag iarraidh beagán níos mó ama a thabhairt duit.**
- #67 · *they wanted to ask for help* → **Bhíodar ag iarraidh cabhair a iarraidh.**
- #69 · *he didn't want to look after the young dog all afternoon* → **Ní raibh sé ag iarraidh aire a thabhairt don mhadra óg ar feadh an tráthnóna.**
- #71 · *he wanted me to tell you before the weekend* → **Bhí sé ag iarraidh go n-inseoinn duit roimh an deireadh seachtaine.**

> ### `bhíodar`, not `bhí siad` — and why that is consistent with `tá muid`
> Connemara is **analytic in the 1pl present** (`tá muid` 34, `táimid` **0**) and **synthetic in the
> 3pl past** (`bhíodar` 154, `bhí siad` 38). Those are not in tension; they are two separate facts
> about the dialect, and Ó Curnáin's own `labhair` paradigm lists **`labhradar`** as the 3pl past.
> Under R1 the dialect wins in both places. Nothing in seeds 1–36 fixed a 3pl past, so ZUT does not
> object. **Use `bhíodar` for "they were / they wanted / they had" throughout.** Present 3pl stays
> analytic: `tá siad`.

---

## 10. Possessives — extend S20/S21

| # | English | Irish | note | confidence |
|---|---|---|---|---|
| 72 | his (+ lenition) | `a` | **already fixed, S20** (`a ainm`) | — |
| 73 | her (+ h- before vowel, no lenition) | `a` | **already fixed, S21** (`a hainm`) | — |
| 74 | my (+ lenition; `m'` before a vowel) | `mo` | FGB | confident |
| 75 | your sg (+ lenition; `d'` before a vowel) | `do` | FGB | confident |
| 76 | our (+ eclipsis; `ár n-` before a vowel) | `ár` | FGB | confident |
| 77 | their (+ eclipsis; `a n-` before a vowel) | `a` | FGB | confident |

**Examples.**

- #74 · *I'm trying to find the money I left on the table* → **Tá mé ag iarraidh an t-airgead a d'fhág mé ar an mbord a fháil.** *(and: my friends → **mo chairde**)*
- #75 · *have you heard from your friend?* → **Ar chuala tú ó do chara?**
- #76 · *when we learn something new it changes our brain* → **Nuair a fhoghlaimíonn muid rud eicínt nua athraíonn sé ár n-inchinn.**

---

## 11. Connectors and subordinators

| # | English | Irish | authority | confidence |
|---|---|---|---|---|
| 78 | because | `mar` | **already fixed, S22** | — |
| 79 | but | `ach` | **already fixed, S19** | — |
| 80 | and | `agus` | **already fixed, S15** | — |
| 81 | or | `nó` | FGB | confident |
| 82 | so (= therefore) | `mar sin` | FGB `mar sin` | confident |
| 83 | so (= to such a degree) | `chomh … sin` | FGB `chomh`. S3 fixed `chomh` itself (`chomh minic agus is féidir`); the `… sin` tail is new | best attempt |
| 84 | **if (conditional, real)** | `má` | FGB | confident |
| 85 | **if (conditional, unreal)** | `dá` + past subjunctive/conditional | FGB | best attempt |
| 86 | **if (= whether, embedded question)** | `an` | **already fixed, S10** (`an bhfuil mé in ann`) | — |
| 87 | that (complementiser) | `go` / past `gur` / neg `nach` | FGB | confident |
| 88 | when (temporal, subordinate) | `nuair a` | **already fixed, S34** (`nuair atá`) | — |
| 89 | when …? (interrogative) | `cén uair` | FGB | confident |
| 90 | before (+ clause) | `sula` | **already fixed, S25** (`sula gcaithfidh mé dul`) | — |
| 90b | before (+ noun) | `roimh` | FGB `roimh` — new, not in the course today | confident |
| 91 | after | `tar éis` | **already fixed, S11** | — |
| 92 | although | `cé go` / past `cé go raibh` | FGB `cé` | best attempt |
| 93 | until | `go dtí go` | FGB | confident |
| 94 | since (= from the time that) | `ó` / `ó shin` | FGB | confident |
| 95 | and then | `agus ansin` | ÓC `ansin` frequent | confident |
| 96 | than (comparative) | `ná` | **already fixed, S29** (`níos fearr`) | confident |
| 97 | as if | `amhail is go` | **already fixed, S26** | — |
| 98 | That is why … | `sin é an fáth go …` | FGB; `cén fáth` **already fixed, S21** | best attempt |

> ### ⚠️ The three "if"s are three different Irish words. This is the second-biggest ZUT trap.
> - *"I'm not sure **if** I can help you"* → **whether** → `an bhfuil` (#86, S10's form).
> - *"**if** you can speak more slowly that would be great"* → **real condition** → `má` (#84).
> - *"what would you do **if** I asked you to help me?"* → **unreal condition** → `dá` (#85).
>
> Translation workers: decide which of the three you have **before** you write anything. Getting
> this wrong is invisible to every automated check in the build.

**Examples.**

- #81 · *I had a glass or two of water* → **Bhí gloine nó dhó uisce agam.**
- #82 · *so I don't need to change* → **Mar sin ní gá dom athrú.**
- #83 · *I'm so happy that you're doing so well* → **Tá mé chomh sásta sin go bhfuil tú ag déanamh chomh maith sin.**
- #84 · *if you can speak more slowly that would be great* → **Má tá tú in ann labhairt níos moille bheadh sé sin go hiontach.**
- #85 · *what would you do if I asked you to help me?* → **Céard a dhéanfá dá bhfiafróinn díot cabhrú liom?**
- #92 · *I didn't have time, although I wanted to see you* → **Ní raibh am agam, cé go raibh mé ag iarraidh tú a fheiceáil.**
- #98 · *That is why he didn't know the answer* → **Sin é an fáth nach raibh a fhios aige an freagra.**

---

## 12. Question words

| # | English | Irish | authority | confidence |
|---|---|---|---|---|
| 99 | what / what's | `céard` / `céard atá` | **already fixed, S12** | — |
| 100 | why | `cén fáth` | **already fixed, S21** | — |
| 101 | how to (nominal fragment) | `cén chaoi` — **no `le`** | **already fixed, S3** | — |
| 102 | where …? / where (embedded) | `cén áit` / `cén áit a` | ÓC `cén áit` **17**, `cá bhfuil` 30 | confident |
| 103 | who …? | `cé` | FGB | confident |
| 104 | how many …? | `cé mhéad` | ÓC **17** | confident |
| 105 | how much (= the amount that) | `an méid` | FGB `méid` | best attempt |
| 106 | how quickly / how well (embedded) | `chomh tapa is` / `chomh maith is` | `go tapa` **already fixed, S20** | best attempt |

**Examples.**

- #102 · *where do you want to meet on Saturday night?* → **Cén áit a bhfuil tú ag iarraidh bualadh le chéile oíche Dé Sathairn?**
- #103 · *who was that man you were talking to yesterday?* → **Cé hé an fear sin a raibh tú ag caint leis inné?**
- #104 · *how many people do you know who like watching television?* → **Cé mhéad duine a bhfuil aithne agat orthu ar maith leo a bheith ag breathnú ar an teilibhisean?**
- #105 · *I'm very happy with how much I've learnt already* → **Tá mé an-sásta leis an méid atá foghlamtha agam cheana.**

---

## 13. Time expressions

| # | English | Irish | authority | confidence |
|---|---|---|---|---|
| 107 | now | `anois` | **already fixed, S1** | — |
| 108 | today | `inniu` | **already fixed, S7** | — |
| 109 | tomorrow | `amáireach` — **never `amárach`** | **already fixed, S12**; ÓC 65:2, and `amárach*` is asterisked non-attested | — |
| 110 | yesterday | `inné` | **already fixed, S30** | — |
| 111 | tonight | `anocht` | **already fixed, S31** | — |
| 112 | last night | `aréir` | ÓC **40** | confident |
| 113 | this morning | `ar maidin` | ÓC **64** | confident |
| 114 | this afternoon | `an tráthnóna seo` | **already fixed, S35** | — |
| 115 | this evening | `tráthnóna inniu` | **already fixed, S18** | — |
| 116 | later on | `ar ball` | **already fixed, S16** | — |
| 117 | soon | `go luath` | **already fixed, S23** | — |
| 118 | last week / last month | `an tseachtain seo caite` / `an mhí seo caite` | ÓC `seo caite` **8** | confident |
| 119 | next week / next month / next year | `an tseachtain / an mhí / an bhliain seo chugainn` | ÓC `seo chugainn` **14** | confident |
| 120 | at the moment | `faoi láthair` | ÓC **11** | confident |
| 121 | already | `cheana` | ÓC **72** | confident |
| 122 | yet (in a negative) | `fós` | ÓC **70** | confident |
| 123 | for a while | `go ceann tamaill` | FGB `tamall` | best attempt |
| 124 | a while ago | `tamall ó shin` | FGB `tamall` | confident |
| 125 | earlier / earlier than | `níos túisce` / `níos túisce ná` | FGB `luath`/`túisce` | best attempt |
| 126 | in time | `in am` | FGB `am` | confident |
| 127 | at the same time | `ag an am céanna` | FGB `céanna` | confident |
| 128 | a few minutes / days / words | `cúpla nóiméad / lá / focal` | ÓC `cúpla` **20** | confident |
| 129 | the weekend | `an deireadh seachtaine` | FGB | confident |
| 130 | in the middle of the night | `i lár na hoíche` | FGB `lár` | confident |
| 131 | in less than an hour | `i níos lú ná uair an chloig` | FGB `uair` | best attempt |
| 132 | all afternoon | `ar feadh an tráthnóna` | **`ar feadh an lae` already fixed, S14** | best attempt |

**Examples.**

- #112 · *I was starting to feel better than last night* → **Bhí mé ag tosú ag mothú níos fearr ná aréir.**
- #118 · *yes she sent me two emails last week* → **Chuir sí dhá ríomhphost chugam an tseachtain seo caite.**
- #121 · *I've learnt a lot already* → **Tá go leor foghlamtha agam cheana.**
- #122 · *I don't know how to say enough different words yet* → **Níl a fhios agam cén chaoi a ndéarfaidh mé dóthain focla difriúla fós.**
- #128 · *I don't mind waiting for a few minutes tomorrow morning* → **Ní miste liom fanacht cúpla nóiméad maidin amáireach.**

---

## 14. Quantifiers and degree

| # | English | Irish | authority | confidence |
|---|---|---|---|---|
| 133 | everything | `chuile shórt` | ÓC `chuile shórt` **57**; `chuile` **already fixed, S16** | confident |
| 134 | everyone | `chuile dhuine` | **already fixed, S16** | — |
| 135 | anything / nothing (with a negative) | `tada` | **already fixed, S35**; ÓC **207** | — |
| 136 | anyone / anywhere (with a negative) | `duine ar bith` / `áit ar bith` | ÓC `ar bith` **353** | confident |
| 137 | nobody | `duine ar bith` (with the verb negated) | as #136 | confident |
| 138 | something | `rud eicínt` | **already fixed, S4** — **never `éigin`** | — |
| 139 | someone | `duine eicínt` | **already fixed, S5** | — |
| 140 | a lot (of) | `go leor` | ÓC **181** | confident |
| 141 | enough (of a thing) | `dóthain` | ÓC **43** | confident |
| 142 | enough (adverbial: quickly enough) | `sách` | ÓC **85** | confident |
| 143 | many / much (in a negative or question) | `mórán` | ÓC **182** | confident |
| 144 | too much / too many | `an iomarca` | **already fixed, S27** (`an iomarca ama`) | — |
| 145 | more | `níos mó` | **already fixed, S23** | — |
| 146 | a little | `beagán` | **already fixed, S9** | — |
| 147 | most (superlative) | `is + adj` | FGB | confident |
| 148 | most people | `formhór na ndaoine` | FGB `formhór`; ÓC 4 — thin | **genuinely uncertain** |
| 149 | half | `leath` | ÓC **437** raw | confident |
| 150 | only (= merely) | `níl … ach` | FGB `ach` | confident |
| 151 | the only … | `an t-aon … amháin` | FGB `aon` | best attempt |
| 152 | just (= only just now) | `díreach tar éis` | `tar éis` **already fixed, S11** | best attempt |
| 153 | very (+ adjective) | `an-` (+ lenition) | FGB `an-`. **Not yet in the course** — `an-` appears in **0** rows today, and S13 deliberately chose `Gaeilge mhaith` over `Gaeilge an-mhaith` (`open-calls-resolved` §2). So the first `an-` in this course is a **new unit under R3** | best attempt |

**Examples.**

- #133 · *no problem. Everything is okay* → **Níl aon fhadhb ann. Tá chuile shórt ceart go leor.**
- #136 · *we didn't want to let anyone hear the truth* → **Ní raibh muid ag iarraidh ligean do dhuine ar bith an fhírinne a chloisteáil.**
- #137 · *nobody was sure how to answer the question* → **Ní raibh duine ar bith cinnte cén chaoi a dtabharfadh sé freagra ar an gceist.**
- #141 · *it's interesting when you understand enough words* → **Tá sé suimiúil nuair a thuigeann tú do dhóthain focla.**
- #142 · *it's difficult to think quickly enough to answer in time* → **Tá sé deacair smaoineamh sách tapa le freagra a thabhairt in am.**
- #143 · *I don't know many people who speak Irish* → **Níl aithne agam ar mhórán daoine a bhfuil Gaeilge acu.**
- #148 · *most people I know like watching television* → **Is maith le formhór na ndaoine a bhfuil aithne agam orthu a bheith ag breathnú ar an teilibhisean.**
- #150 · *no I only had to do the most important job* → **Ní raibh orm ach an jab is tábhachtaí a dhéanamh.**
- #152 · *he's just started to learn* → **Tá sé díreach tar éis tosú ag foghlaim.**

> **#140 vs #141 vs #143 — keep them apart.** *a lot* = `go leor`, *enough* = `dóthain`,
> *many/much (neg/interrog)* = `mórán`. All three are heavily attested in Connemara and all three are
> distinct in the English. Merging any two of them would break ZUT the moment two workers disagree.

> **#148 is the entry I would delete if I could.** `formhór` is 4 in 2,700 pages and the alternative
> `an chuid is mó` is 1. Seeds 288 and 280 both need it. I have ruled `formhór na ndaoine` because
> FGB leads with it and it is short; **a speaker should be asked whether Connemara would just say
> `an chuid is mó de na daoine`, or restructure to `is maith le go leor daoine`.**

---

## 15. Recurring nouns — the dialect calls matter here

| # | English | Irish | authority | confidence |
|---|---|---|---|---|
| 154 | word | `focal` | **already fixed, S6**; pl. `focla` (Connemara) | — |
| 155 | name | `ainm` | **already fixed, S20** | — |
| 156 | answer | `freagra` | **already fixed, S17** | — |
| 157 | story | `scéal` | **already fixed, S36** | — |
| 158 | sentence | `abairt` | **already fixed, S10** | — |
| 159 | people | `daoine` | **already fixed, S22** | — |
| 160 | friend / friends | `cara` / `cairde` | FGB | confident |
| 161 | **brother** | **`dreatháir`** | ÓC **`dreatháir` 39** vs `deartháir` **3** | confident |
| 162 | sister | `deirfiúr` | ÓC `deirfiúr` 3, `dreifiúr` 3, `deirbhshiúr` 8 — see box | **genuinely uncertain** |
| 163 | mother / father | `máthair` / `athair` | FGB; ÓC frequent | confident |
| 164 | son / daughter | `mac` / `iníon` | FGB | confident |
| 165 | letter | `litir` | FGB | confident |
| 166 | bag | `mála` | FGB | confident |
| 167 | **dog** | **`madra`** | ÓC `madra` **39** vs `madadh` **11** — Connemara prefers `madra` | confident |
| 168 | **television** | **`teilibhisean`** | ÓC **11** vs `teilifís` **4**, and in running speech — *"Choinic mé rud eile ar an teilibhisean"* (vol II, 12S) | confident |
| 169 | **the pub** | **`an pub`** | ÓC `pub` **106**; `teach ósta` 2, `teach an óil` **0** | confident |
| 170 | truth | `fírinne` | ÓC **15** | confident |
| 171 | mistake | `botún` | ÓC **6** — kept distinct from #172 on purpose | best attempt |
| 172 | to forget / I've forgotten | `dearmad a dhéanamh ar` / `tá dearmad déanta agam ar` | ÓC `dearmad` **33** | confident |
| 173 | idea | `smaoineamh` | see #20 | confident |
| 174 | book | `leabhar` | FGB | confident |
| 175 | money | `airgead` | FGB | confident |
| 176 | brain | `inchinn` | ÓC **15** | confident |
| 177 | problem | `fadhb` | ÓC `fadhb` 9, `trioblóid` 20 — `fadhb` chosen as FGB's headword for *problem* | best attempt |
| 178 | chance / opportunity | `deis` | ÓC **137** vs `seans` 61 | confident |
| 179 | conversation | `comhrá` | FGB | confident |
| 180 | question | `ceist` | FGB; ÓC frequent | confident |
| 181 | keys | `eochracha` | ÓC `eochair` **29** | confident |
| 182 | office | `oifig` | FGB | best attempt |
| 183 | party (social) | `cóisir` | ÓC 4 — thin but present | best attempt |
| 184 | film | `scannán` | ÓC 2 — a modern-life word, honestly absent from narrative | best attempt |
| 185 | bus / car | `bus` / `carr` | FGB | confident |
| 186 | man / woman | `fear` / `bean` | FGB | confident |
| 187 | meeting | `cruinniú` | FGB | best attempt |
| 188 | work (noun) | `obair` | ÓC `ag obair` **94** | confident |

> ### #162 `deirfiúr` — the one kinship term I could not settle
> Ó Curnáin's Connemara spellings scatter: `deirbhshiúr` 8 (his etymological form), `dreifiúr` 3,
> `deirfiúr` 3, `siúr` 57 (mostly the religious sense or compounds), `driofúr` **0**. Compare
> `dreatháir` at 39-to-3, which is unambiguous. I have ruled **`deirfiúr`** — FGB's headword, and
> attested in the corpus — but I am not confident it is what a Carna speaker says, and its
> asymmetry with `dreatháir` is uncomfortable. **This is question one for a speaker: "brother and
> sister — how do you say the pair?"** It touches seeds 233 and 284 only.

---

## 16. Recurring verbs

| # | English | Irish | authority | confidence |
|---|---|---|---|---|
| 189 | to learn | `foghlaim` | **already fixed, S2** | — |
| 190 | to remember | `cuimhneamh` | **already fixed, S6** — see §18.2 | — |
| 191 | to finish | `críochnú` | **already fixed, S11** | — |
| 192 | to start | `tosú` | **already fixed, S23** | — |
| 193 | to help | `cabhrú (le)` | **already fixed, S25** | — |
| 194 | to go | `dul` | **already fixed, S25** | — |
| 195 | to come | `teacht` | **already fixed, S16** | — |
| 196 | to meet | `bualadh le` / `bualadh le chéile` | **already fixed, S18/S22** | — |
| 197 | to stop | `stopadh` | **already fixed, S19** | — |
| 198 | to show | `taispeáint` | **already fixed, S32** | — |
| 199 | to give | `tabhairt` | **already fixed, S27** | — |
| 200 | to take | `tógáil` | **already fixed, S27** | — |
| 201 | to read | `léamh` | **already fixed, S35** | — |
| 202 | to find out | `fáil amach` | **already fixed, S17** | — |
| 203 | to do / to make | `déanamh` | **already fixed, S7/S8** | — |
| 204 | to explain | `míniú` | **already fixed, S8** | — |
| 205 | to happen | `tarlú` | **already fixed, S12** | — |
| 206 | to practise | `cleachtadh` | **already fixed, S5** | — |
| 207 | to understand | `tuiscint` | ÓC **8**; FGB `tuig` | confident |
| 208 | **to watch / to look at** | **`breathnú ar`** | ÓC `breathnú` **70**, and Ó Curnáin cites it in running speech; `féachaint` 66 but FGB-standard | confident |
| 209 | **to look for** | **`cuartú`** | ÓC `cuartú` **3**, `cuardach` **0** — the Connemara form of the verbal noun | best attempt |
| 210 | to look after | `aire a thabhairt do` | FGB `aire` | confident |
| 211 | **to see (past: saw)** | **`choinic`** (VN `feiceáil`) | ÓC **`choinic` 108** vs `chonaic` **8** | confident |
| 212 | to see (negative past) | `ní fhaca` | FGB `feic`; ÓC has the paradigm | best attempt |
| 213 | to hear (past: heard) | `chuala` (VN `cloisteáil`) | ÓC `chuala` **111**, `cloisteáil` 7, `cluinstin` 1 | confident |
| 214 | to write | `scríobh` | FGB | confident |
| 215 | to put | `cur` | **`cur isteach ar` already fixed, S36** | confident |
| 216 | to wait for | `fanacht le` | ÓC `fanacht` **47** | confident |
| 217 | to stay | `fanacht` (no `le`) | as #216 — see box | best attempt |
| 218 | to leave (depart) | `imeacht` | ÓC **226** | confident |
| 219 | to leave (behind) | `fágáil` | ÓC **15** | confident |
| 220 | to sleep | `codladh` | ÓC **55** | confident |
| 221 | to wake / wake up | `dúiseacht` | ÓC **6** | confident |
| 222 | to work | `obair` (`ag obair`) | ÓC **94** | confident |
| 223 | to change | `athrú` | ÓC **180** | confident |
| 224 | to worry about | `imní a bheith ort faoi` | ÓC `imní` **30** | confident |
| 225 | I don't care about | `is cuma liom faoi` | ÓC `is cuma` **10**; FGB `cuma` | confident |
| 226 | to mind (do you mind …?) | `an miste leat …?` / `ní miste liom` | ÓC `miste` **15**; FGB `miste` | confident |
| 227 | to agree with | `aontú le` | FGB `aontaigh` — ÓC `aontú` **0**, `aontaigh` 2 | **genuinely uncertain** |
| 228 | to improve | `feabhas a chur ar` | ÓC `feabhas` **7**; FGB | best attempt |
| 229 | to relax | `scíth a ligean` | ÓC `scíth` **19** | confident |
| 230 | to spend (time) | `caitheamh` | ÓC **119** | confident |
| 231 | to discuss | `plé` | ÓC `a phlé` 1 — thin | best attempt |
| 232 | to deal with | `déileáil le` | ÓC **4** | best attempt |
| 233 | to call (phone) | `glaoch ar` | ÓC `glaoch` **14** | confident |
| 234 | to pay | `íoc` | FGB | confident |
| 235 | to play | `imirt` | FGB | confident |
| 236 | to eat | `ithe` | FGB | confident |
| 237 | to send | `cur chuig` | FGB `cuir` | confident |
| 238 | to keep on doing | `coinneáil ort ag …` | FGB `coinnigh` | best attempt |
| 239 | to let (someone do something) | `ligean do` | FGB `lig` | confident |
| 240 | to test yourself | `tú féin a thástáil` | FGB `tástáil`; ÓC **0** — see box | **genuinely uncertain** |
| 241 | to seem | `is cosúil go` | FGB `cosúil` | best attempt |
| 242 | to achieve | `baint amach` | FGB `bain` | best attempt |
| 243 | to fix | `deisiú` | FGB | best attempt |
| 244 | to go out (past) | `chuaigh mé amach` | FGB `téigh` | confident |
| 245 | to manage (on my own) | `tá mé in ann … liom féin` | routes through #31 rather than a new verb | confident |
| 246 | to consider | `smaoineamh ar` | same as #19, deliberately | best attempt |

**Examples.**

- #208 · *Did you watch a bit of television?* → **An raibh tú ag breathnú ar phíosa den teilibhisean?**
- #209 · *what are you looking for?* → **Céard atá tú a chuartú?**
- #211 · *yes I saw them in the office a while ago* → **Choinic mé san oifig iad tamall ó shin.**
- #216/#217 · *no I can stay here for a little longer* → **Tá mé in ann fanacht anseo beagán níos faide.**
- #224 · *you shouldn't worry about doing something similar* → **Níor cheart duit imní a bheith ort faoi rud eicínt cosúil leis a dhéanamh.**
- #225 · *I don't care about making mistakes* → **Is cuma liom faoi bhotúin a dhéanamh.**
- #226 · *do you mind if I finish my coffee before you start?* → **An miste leat má chríochnaím mo chuid caife sula dtosaíonn tú?**
- #227 · *I don't agree with what he said about my friend* → **Ní aontaím leis an rud a dúirt sé faoi mo chara.**

> **#216/#217 — `fanacht` does double duty and I let it.** *wait for* is `fanacht le`; *stay* is
> `fanacht` with no preposition. They are distinguished by the `le`, both are FGB frames, and
> inventing a second verb for *stay* would be worse. Flagged, not hidden.

> **#227 `aontú` — 0 in the corpus.** Seeds 83 and 84 are a matched pair (*I agree* / *I don't
> agree*) so the course cannot avoid it. `aontú` is FGB's word and it is regular; the corpus zero is
> plausibly a genre effect (agreement-talk is rare in narrative). **Ask a speaker whether Connemara
> would say `Aontaím leat` or `Tá an ceart agat`.**

> **#240 `tástáil` — 0 in the corpus, and the obvious alternative is banned.** Connemara's own word
> for *try/test* is `traíáil`, which collides head-on with the course's standing ban on `ag triail`
> (see `open-calls-resolved` §4). `tástáil` is FGB's word for *test*, is not contradicted anywhere,
> and is a modern-life sense unlikely to appear in narrative transcription. It touches **seed 65
> only.** I have ruled it rather than leaving the seed untranslatable.

---

## 17. Adjectives, adverbs, and the fixed formulae

| # | English | Irish | authority | confidence |
|---|---|---|---|---|
| 247 | ready | `réidh` | **already fixed, S26** | — |
| 248 | sure | `cinnte` | **already fixed, S10** | — |
| 249 | easy / easier | `éasca` / `níos éasca` | S24 fixed only the **adverb** `go héasca`; the adjective is new. FGB `éasca` | best attempt |
| 250 | difficult | `deacair` | FGB; ÓC frequent | confident |
| 251 | important | `tábhachtach` | FGB | confident |
| 252 | interesting | `suimiúil` | ÓC `suimiúil` **4**, `spéisiúil` **0** | confident |
| 253 | happy | `sásta` | FGB; ÓC frequent | confident |
| 254 | busy | `gnothach` | ÓC `gnothach` **7**, `gnóthach` 5 — Connemara spelling | best attempt |
| 255 | kind (of a person) | `cineálta` | ÓC **4** | best attempt |
| 256 | nice / lovely | `deas` | ÓC **247** | confident |
| 257 | great | `iontach` | FGB; ÓC frequent | confident |
| 258 | good / better / best | `maith` / `níos fearr` / `is fearr` | **already fixed, S13/S29** | — |
| 259 | worse | `níos measa` | FGB `olc` | confident |
| 260 | young / old | `óg` / `sean` | FGB | confident |
| 261 | unusual | `neamhchoitianta` | FGB | **genuinely uncertain** |
| 262 | similar to | `cosúil le` | FGB | confident |
| 263 | the same | `céanna` | FGB | confident |
| 264 | true | `fíor` | FGB; `fírinne` #170 | confident |
| 265 | blue | `gorm` | FGB | confident |
| 266 | slowly / more slowly | `go mall` / `níos moille` | FGB `mall`; ÓC thin (2 and 1) | best attempt |
| 267 | quickly | `go tapa` | **already fixed, S20** | — |
| 268 | carefully | `go cúramach` | FGB `cúramach` | confident |
| 269 | hard (work hard) | `go crua` | ÓC `crua` **241** | confident |
| 270 | fairly | `réasúnta` | FGB | best attempt |
| 271 | definitely | `go cinnte` | FGB — kept adverbial to stay clear of #248 | best attempt |
| 272 | exactly | `go díreach` | FGB | confident |
| 273 | of course | `ar ndóigh` | ÓC **26** | confident |
| 274 | unfortunately / I'm afraid | `faraor` | ÓC **17** | confident |
| 275 | okay | `ceart go leor` | ÓC **6** | confident |
| 276 | thank you very much | `go raibh míle maith agat` | FGB — a formula; ÓC 0, which is a genre effect, not evidence | confident |
| 277 | I'm sorry that … | `tá brón orm go …` | ÓC `brón` **18** | confident |
| 278 | no problem | `níl aon fhadhb ann` | FGB `fadhb` | best attempt |
| 279 | I'm grateful to you | `tá mé buíoch díot` | FGB `buíoch` | confident |
| 280 | I'm surprised / that was a surprise | `tá iontas orm` / `ba mhór an t-iontas é` | ÓC `iontas` **33** | best attempt |
| 281 | on my own | `liom féin` | FGB `féin` | confident |
| 282 | yourself | `tú féin` | FGB | confident |
| 283 | each other | `le chéile` | **already fixed, S18** | — |
| 284 | home (motion) | `abhaile` | ÓC **88** | confident |
| 285 | there (at that place) | `ann` | FGB | confident |
| 286 | over there | `thall ansin` | FGB | best attempt |
| 287 | **let's …** | `bímis ag …` | see box | **genuinely uncertain** |

**Examples.**

- #273 · *of course you can ask her because she's my friend* → **Ar ndóigh tá tú in ann fiafraí di mar is í mo chara í.**
- #274 · *no I'm afraid I haven't seen them* → **Faraor ní fhaca mé iad.**
- #276 · *thank you very much for helping me to understand* → **Go raibh míle maith agat as cabhrú liom tuiscint.**
- #277 · *I'm sorry that I need to leave so early* → **Tá brón orm go bhfuil gá dom imeacht chomh luath sin.**
- #279 · *that's very kind of you and I'm grateful to you for helping* → **Tá sé sin an-chineálta uait agus tá mé buíoch díot as cabhrú.**

> ### #287 `let's` — I could not settle this and I am saying so
> Seed 158 is *"let's talk about something else"*. The obvious Irish is the 1pl imperative
> `Labhraímis`, and **that is not banned by R6** — R6 bans the finite *present indicative* of
> `labhair`, and Ó Curnáin's `labhair` paradigm does list an imperative. But `Labhraímis` is one
> letter away from looking like the form the whole build has spent a day removing, and I will not
> put it into a course whose reviewers have been told to treat that shape as a defect.
> **I have ruled `Bímis ag caint faoi rud eicínt eile`** — `bí` imperative + the already-fixed
> `ag caint` (S19). It is regular, it uses only forms the course has, and it avoids the trap.
> **What to ask a speaker:** how would you say *"let's talk about something else"* — `Bímis ag
> caint …`, or would you restructure it entirely? It touches **seed 158 only.**

---

## 18. The standing dialect debt — decisions deferred to Kai, with the counts

These are the places where **Connemara demonstrably says it differently from what seeds 1–36 already
banked.** I have held the banked form for ZUT continuity, per §0. Each is a one-pass sweep over the
whole course, and there is no audio, so each stays cheap.

### 18.1 `dhom` / `dhuit` — the big one

| form | ÓC count | course today |
|---|---|---|
| `dhom` | **206** | — |
| `dom` | 103 | **S32** `a thaispeáint dom` |
| `dhuit` | **299** | — |
| `duit` | 88 | **S11** `tar éis duit` |
| `dhúinn` | 21 | — |
| `dhóib` | 41 | — |

Connemara lenites the dative pronouns of `do` roughly 2:1 and 3.4:1 in Ó Curnáin's own
transcriptions — *"ba cheart **dhuit** breathnú"* (vol I), *"tiúrthaidh mé fios **dhuit**"*.
**Under R1 alone the answer is `dhom`/`dhuit`/`dhó`/`dhúinn`/`dhóib`.** I am not ruling it tonight
because S11 and S32 are frozen and a split at seed 37 is worse than a uniform standard.

**Translation workers: write `dom`, `duit`, `dúinn`, `dó`, `dóibh`, `di`, `díot`.**
**Kai: one word from you turns this into a sweep — it would touch every band tonight and about
40 rows of seeds 1–36.** It is the single largest thing standing between this course and sounding
like Carna.

### 18.2 `cuimhneamh` for "remember"

`cuimhneamh` is **0 in all four volumes** — `cuimhnigh` is 18, the stem `cuimhn-` is 150, and
`ag cuimhneamh` is **0**. The verb is unquestionably Connemara; the *verbal-noun spelling the course
chose at S6* is the thing with no attestation. I am **not** touching it (S6 is frozen, and a bare
zero on one inflected spelling is inside the noise floor). Recording it so it is not lost.

### 18.3 `féachaint` vs `breathnú`

I ruled `breathnú` (#208) under R1 — nothing was fixed, so R1 applies cleanly. Noting only that
`féachaint` is 66 in the corpus and is FGB's lead form, so a reviewer seeing `breathnú` should know
it was chosen deliberately, not by accident.

---

## 19. Two structural rulings that are not lexical, and every worker needs them

### 19.1 Irish has no *yes* and no *no*. Answer by echoing the verb.

Seeds 96, 97, 141, 172, 173, 183, 184, 189, 191, 268, 272, 273, 276, 277, 279, 280 and 282 all open
with *yes* or *no*. **Do not translate the word.** Echo the verb of the question, positive or
negative. This is uncontroversial Irish and FGB's own practice, but two workers who handle it
differently will produce an inconsistent course, so it is ruled here.

- *yes I'm ready to go as soon as you want* → **Tá mé réidh le dul chomh luath is atá tú ag iarraidh.**
- *no I'm not ready yet, I need a little more time* → **Níl mé réidh fós, tá beagán níos mó ama ag teastáil uaim.**
- *yes that's a good idea* → **Is smaoineamh maith é sin.**
- *no thank you I can manage on my own* → **Go raibh maith agat, tá mé in ann é a dhéanamh liom féin.**
- *no that's not a problem* → **Níl aon fhadhb ann.**

**Confidence: confident.** **The English side keeps its *yes* / *no*** — that is how the learner is
taught that Irish does without them.

### 19.2 "it's + adjective + to do something" is `tá sé + adjective + verbal noun`

Fixed at **S28** (`Tá sé úsáideach tosú ag caint`). Twelve seeds in 37–300 need it (47, 58, 64, 65,
66, 91, 93, 120, 121, 122, 134, 137). **Use the S28 shape every time; do not switch to the copula
`is`** — `Is deacair é` and `Tá sé deacair` are both Irish, and picking freely between them across
four workers is exactly the invisible ZUT break this register exists to stop.

- *it's not difficult to find the answer* → **Níl sé deacair an freagra a fháil.**
- *it's important to take time to test yourself* → **Tá sé tábhachtach am a thógáil le tú féin a thástáil.**
- *it's more important to talk often than to be perfect* → **Tá sé níos tábhachtaí a bheith ag caint go minic ná a bheith foirfe.**

**Confidence: confident** on the rule; **best attempt** on each individual adjective.

---

## 20. What is NOT settled — read this before you assume the register covers you

The register decides **lexis and the recurring frames.** It does **not** decide:

- **The conditional perfect.** Seeds 152 and 153 (*"I would have done it differently if I had
  known"*, *"I wouldn't have said it in exactly the same way"*) need a construction the course has
  never taught and that this register does not rule on. **Whoever gets that band: translate it, label
  it `genuinely uncertain`, and say so in your report.** Do not quietly simplify the English.
- **The past habitual for *used to*.** Seeds 128 and 199 need it. Connemara has it robustly
  (Ó Curnáin lists a past-habitual for every verb), so use it — `bhíodh sé ag obair` — but the exact
  shape per verb is yours, and it is a new grammatical unit under R3.
- **Anything at or below seed 36.** If you think one is wrong, **write it in your report — do not
  edit it.**
- **Decomposition and tiling.** This document is the translation-choice step only.

---

*Every count in this document is mine, taken 20 August 2026 from the four extracted volumes with
`tools/gle-cn/ocurnain-probe.py` (controls passed) and from teanglann.ie as served today. No word of
this has been written to the database. `gle_for_eng` was not touched. The course had zero rows in
`course_audio` before this document and has zero after it: no TTS was called, no audio pass was
queued, and no money was spent.*
