# What does Donegal Irish say for "try"? — the evidence

**2026-08-20. Commissioned by Kai to test `ag iarracht`, which sits in 22 seed translations of
`gle_ul_for_eng` on a misattributed ruling. Read-only throughout: no database rows changed, no TTS,
zero spend.**

> **VERDICT ON `ag iarracht` + verbal noun: it is not an Ulster form and it is not an Irish form.**
> It appears in **no dictionary** — not Ó Dónaill, not An Foclóir Beag, not de Bhaldraithe, not the
> New English-Irish Dictionary. In the national corpus it occurs **15 times against 58,358 for
> `ag iarraidh`** — a ratio of 1 : 3,890 — and **once those 15 are read individually, only about
> six are the construction at all**, every one of them in Facebook posts, Wikipedia, a satirical
> column or a subtitle transcript. In the Ulster-published subcorpus it occurs **zero** times.
> And in **transcribed Donegal speech** — RTÉ Raidió na Gaeltachta's Donegal desk, a calibrated
> corpus in which `ag iarraidh` occurs **1,165** times — `ag iarracht` occurs **zero** times.
>
> The Donegal translators are right that `ag iarracht` is wrong. **But their proposed replacement,
> `ag déanamh iarrachta`, is also zero in Donegal speech** — see §2b. What Donegal actually says is
> `ag iarraidh`.

Jump to: [§1 the negative](#1-the-negative-nailed-down) · [§2 the positive](#2-what-donegal-actually-says)
· [§2e **Donegal SPEECH**](#2e-the-decisive-column--transcribed-donegal-speech) ·
[§3 the three frames](#3-the-frame-that-breaks-things) · [§4 **GAPS**](#4-gaps--what-i-could-not-evidence)

---

## 0. What was searched, and how it was calibrated

| Source | What it is | Calibration (controls) |
|---|---|---|
| **Corpas Náisiúnta na Gaeilge** (corpas.ie / CNG) | The national corpus of Irish — Foras na Gaeilge & Gaois, DCU. Queried through its own `noskeproxy.json` endpoint, replicating exactly what the site's own JS sends. | `agus` **2,672,430** · `tá` **801,547** · `bhí` **718,988** · `duine` **174,650** |
| **CNG filtered to *An tUltach*** | The Ulster Irish monthly (Comhaltas Uladh). `within <doc source="An tUltach" />`. This is my Ulster control. | `agus` **47,965** · `bhí` **17,732** · `tá` **12,511** · `duine` **3,066** |
| **Donegal Gaeltacht folklore slice** | 405 Irish-tagged Schools' Collection stories, 220,979 chars, from Rann na Feirste, Doire Beaga, Gort a' Choirce, Lunniagh, Meenaclady, Cnoc an Stolaire. Harvested by a prior worker; searched here in Python (NFC, `errors=replace`, whole-word regex with Irish accented vowels as word chars — **never grep**). | `agus` **1,772** · `bhí` **884** · `an` **2,370** · `duine` **70** |
| **CNG filtered to the RnaG regional desks** | **Transcribed Raidió na Gaeltachta speech from known places** — `RnaG (Barrscéalta)` = Donegal, `RnaG (Iris Aniar)` = Connemara, `RnaG (An Saol ó Dheas)` = Kerry. This is the real dialect partition and it arrived mid-job (see §2e). | Donegal desk: `agus` **30,776** · `tá` **21,241** · `bhí` **9,334** · `duine` **2,291**; negative control `xqzzy` = **0** |
| **Dictionaries** | teanglann.ie (Ó Dónaill FGB, An Foclóir Beag, de Bhaldraithe EID) and focloir.ie (New English-Irish Dictionary). | n/a — entries quoted verbatim below |

**Proof that the *An tUltach* subcorpus really carries Ulster dialect** and is not just generic
Caighdeán — the discriminators, whole corpus vs *An tUltach*:

| | whole CNG | *An tUltach* | Ulster share |
|---|---|---|---|
| `bhí` (control) | 718,988 | 17,732 | 2.5% |
| `chan` | 3,402 | 255 | **7.5%** — 3× enriched |
| `cha` | 3,337 | 173 | **5.2%** |
| `fosta` | 17,230 | 1,149 | **6.7%** |
| `achan` | 9,900 | 741 | **7.5%** |
| `amharc` | 9,674 | 618 | **6.4%** |
| `caidé` | 4,076 | 44 | 1.1% |

Every Ulster lexical marker is 2–3× enriched against the `bhí` baseline. The filter works.

**And the RnaG Donegal desk is proven Donegal by lexicon**, not by assumption:

| | Donegal desk | Connemara desk | Kerry desk |
|---|---|---|---|
| `agus` (control) | 30,776 | 52,981 | 52,117 |
| `xqzzy` (negative control) | **0** | **0** | **0** |
| `madadh` | **49** | 0 | 0 |
| `madra` | **0** | 5 | 14 |
| `muid` | 4,920 | 9,478 | 28 |

`madadh` 49 / `madra` 0 in Donegal against the exact inverse in Munster is as clean a dialect
signature as you get. The `xqzzy` row matters just as much: it proves a zero in this harness is a
real zero and not a silently failed query.

> **The parenthesis trap.** Attribute values in these queries are **regexes**, so the brackets in
> `RnaG (Barrscéalta)` must be escaped. Unescaped, the query returns **0 silently** — indistinguishable
> from a real null result. Every zero in this document was taken with `xqzzy` and `agus` beside it.

---

## 1. The negative, nailed down

### 1a. `iarracht` is a NOUN in every dictionary, and every dictionary gives it a light verb

**Ó Dónaill, *Foclóir Gaeilge–Béarla* — `iarracht`** (teanglann.ie, verbatim):

> **iarracht, f.** (gs. ~a, pl. ~aí).
> **1. Attempt, effort.** `~ a thabhairt ar, faoi, rud a dhéanamh, to attempt to do sth.` |
> `~ a dhéanamh, to make an effort` | `~ ar dhuine a cheansú, an attempt to pacify s.o.` |
> `~ ar dhúnmharú, attempted murder` | `~ a bhaint as rud, to have a go at sth.` |
> `~ a bhaint as duine, to try s.o. out; to take a rise out of s.o.` | `Ba mhaith an ~ í, it was a
> good attempt` | `D'aon ~ amháin, at one attempt` | `Éirí as an ~, to give up the attempt` |
> `Gan ~, without trying.`
> **2. (a)** Amount done at one attempt; quantity, portion … **(b)** Little, trace …
> **3.** Turn, time … **4. (As adv.)** `Tá sé ~ bodhar, he is a bit deaf.`

Four separate senses, thirteen example phrases, and **not one of them is `ag iarracht` + verbal
noun.** Every "attempt to do sth." example routes through a light verb — `tabhair`, `déan`, `bain`.
There is no `ag`-progressive on this noun anywhere in the entry.

**An Foclóir Beag — `iarracht`** (verbatim):

> **bain3** — 1. `triail (iarracht ar dhuine a bhualadh)` · 2. `blúire nó toradh oibre (iarracht
> filíochta)` · 3. `beagán (iarracht den ghreann, iarracht bodhar)` · 4. `uair, seal (an chéad
> iarracht eile)`

`bain3` = feminine noun, 3rd declension. **Noun only. No verb, no progressive.**

**de Bhaldraithe, *English-Irish Dictionary* — "try"** (verbatim):

> **try¹ (noun)**: `Triail f -ach, iarracht f, tástáil f` — "To have a try at (doing) sth.,
> **féachaint le, tabhairt faoi**"
> **try² (verb)**, to try to do something: "**féachaint le, tabhairt faoi**, rud a dhéanamh;
> **iarracht a thabhairt ar** rud a dhéanamh"
> Example: "She tried to smile, **thug sí iarracht gáire a dhéanamh**"

**New English-Irish Dictionary (focloir.ie) — "try"** (verbatim forms given):

> `thriail sí suí síos` (she tried to sit down) · `thug sí iarraidh suí síos` · `d'fhéach sí le suí
> síos` · `cad atá tú **ag iarraidh** a dhéanamh?` (what are you trying to do?)

Four dictionaries. Four independent lexicographic traditions. **Zero instances of `ag iarracht` +
verbal noun.** The progressive "trying to" is rendered `ag iarraidh` — the verbal noun of `iarr` —
in the only dictionary that renders it progressively at all.

**And Ó Dónaill spells out that `ag iarraidh` is the right form**, under the verb `iarr`:

> **iarr, v.t.** (vn. ~aidh, pp. ~tha) … **4. Attempt, try.** "`Ag ~aidh rud a dhéanamh, trying to
> do sth.`" | "`Ná h~ an chloch sin a thógáil, don't attempt to lift that stone.`"

That is the construction the course needs, on the correct lexeme. `iarraidh` is a verbal noun and
takes `ag`. `iarracht` is not a verbal noun and does not.

### 1b. The corpus count

Whole national corpus, then the Ulster subcorpus:

| Form | whole CNG | *An tUltach* (Ulster) |
|---|---|---|
| **`ag iarracht`** | **15** | **0** |
| `ag iarraidh` | **58,358** | **805** |
| `ag déanamh iarrachta` | 317 | 4 |
| `rinne iarracht` | 357 | 13 |
| `iarracht a dhéanamh` | 2,426 | 33 |
| `thug iarracht` | 9 | 1 |
| `iarracht a thabhairt` | 73 | 0 |

Calibration for these two columns is in §0 — `agus` = 2,672,430 and 47,965 respectively, so neither
column is a dead file returning false zeros.

**15 against 58,358.** And the Ulster column, where the course actually lives, is **zero**.

### 1c. I read all 15. Most are not even the construction.

This is the part that turns a low count into a verdict. `ag` before a noun is an ordinary
preposition — "by", "at", "have" — so a raw string count over-reports. Reading each hit:

**Not the construction at all (9 of 15) — `iarracht` as an ordinary noun:**

| # | Text | What `ag` is doing |
|---|---|---|
| 4 | "…**ag iarracht** amháin den Ardteistiméireacht" | "at one attempt" — FGB sense 3 exactly |
| 6 | "Ní bheidh aon aitheantas oifigiúil le fáil **ag iarracht** Freddy Gage" | "by Freddy Gage's attempt" — agent |
| 10 | "Tá fadhbanna nach beag cothaithe **ag iarracht** na tíre" | "by the country's effort" — agent |
| 14 | "Is mór an tionchar a bhí **ag iarracht** an Aontais Eorpaigh…" | "the influence the EU's *effort* had" |
| 3 | "d'fhág mé an baile ag dul **ag iarracht** ar sean-Jack Clair" | `ag iarraidh ar` = *asking/visiting*; Béaloideas 68, **Lios Ceannúir, Co. Clare** |
| 5 | "b'oiliúnaí a bhí mé … ná dul **ag iarracht** ar sheanchaí go Cnoc Aoibhinn" | same — Clare folklore collector's spelling of `ag iarraidh ar` |
| 1 | "Tá tú **ag iarracht** agus ag éirí go maith, a Éilís" | no verbal-noun complement; a web page |
| 9 | "Tá gáire á bhaint as na Gaeil … **ag iarracht** rinne seoltóir turscair…" | garbled; not parseable |
| 13 | "Bhíodar chomh meallta sin **ag iarracht** Nabay…" | "by Nabay's effort" reading available |

**Arguably the construction (6 of 15) — and look where every single one lives:**

| # | Text | Source |
|---|---|---|
| 7 | "A Dhaithí, cad a bhí tú **ag iarracht** a thaispeáint?" | **Facebook** — "Gaeilge Amháin" group |
| 8 | "Tá mé **ag iarracht** 'Des Bishop: Breaking China' a fhéachaint ar an idirlíon" | **Facebook** — same group |
| 12 | "dream a bhí **ag iarracht** Bundlíthe Iosrael a dhaingniú" | **An Vicipéid** (Wikipedia) |
| 11 | "beidh tú **ag iarracht** iad tharraingt chuile lá" | **TG4 subtitle transcript**, *Bliain in Inis Oírr* — Aran speech, transcriber's spelling |
| 2 | "é ar a sheacht ndícheall **ag iarracht** aire an tslua a tharraingt air féin" | *Beo!* — **"Balor"**, the satirical column |
| 15 | "é **ag iarracht** buillí a cuisle a aithne" | Nua-Chorpas web text |

**Not one is in edited literary prose. Not one is in a dictionary. Not one is Ulster.** Two are
Facebook comments, one is Wikipedia, one is a subtitle transcript of Aran Irish, one is a comic
column. This is the signature of a spelling slip for `ag iarraidh` — the two words are near-homophones
in fast speech — not of a dialect form.

**`ag iarracht` is a coinage.** Ours, as it happens: it entered `gle_ul_for_eng` on a ruling
Kai never made.

---

## 2. What Donegal actually says

### 2a. `ag iarraidh` + verbal noun — YES, this is Ulster too

805 hits in *An tUltach*. Verbatim, from named Ulster writers:

> "bhí gluaiseacht an-mhór sa tír **ag iarraidh rialtas dúchais a bhaint amach**, neamhspleáchas
> teoranta."
> — Aindrias Ó Cathasaigh, "Stair chultúrtha", *An tUltach*

> "ach é **ag iarraidh a mhuintir féin a ghríosadh** chun troda agus chun an fód a sheasamh"
> — Nollaig Ó Gadhra, *An tUltach*

> "áit a bhfuil na Moslamaigh **ag iarraidh briseadh ar shiúl** ó Rialtas Bangkok agus stát dá
> gcuid féin a bheith acu"
> — Tom Bhríní Hiúdaí, "An Ghéarchéim Nár Tharla", *An tUltach*

> "na céadta bliain a chaitheamar faoi chois ag impiriúlachas na Sasanach **ag iarraidh dínit agus
> saoirse a bhaint amach** dúinn féin"
> — Pádraig Mac Diarmada, "Grá Áite", *An tUltach*

**This is the Connemara answer and it is the Ulster answer as well.** It is not a dialect choice;
it is the Irish construction, and Ó Dónaill's `iarr` entry licenses it explicitly.

**Shape:** `ag iarraidh` + [object] + `a` + verbal noun. **3 syllables** (*ag iar-raidh*, commonly
2 in speech: *g'iarraidh*).

**Caveat, stated because it matters for a course:** `ag iarraidh` is ambiguous — it also means
"wanting" and "asking (someone to)". In the 1930s Donegal folklore slice, **all 16 hits of
`ag iarraidh` are the *asking/wanting* sense, none is "trying to"**:

> "Bhí achan duine **ag iarraidh air pósadh**" — *Peadar Óg*, Rann na Feirste
> "'Sé an rud a bhí sa litir **ag iarraidh ar an fhear** an gasúr a mharbhughadh" — *An
> Droch-Leasmháthair*, Rann na Feirste

That is a genuine limit of a 220k-character sample, not evidence against the form — *An tUltach*
supplies 805 modern Ulster instances of the "trying to" sense. But a course should know the word is
doing two jobs.

### 2b. `ag déanamh iarrachta` — attested in Ulster *writing*, but **zero in Donegal speech**

317 in CNG, **4 in *An tUltach***. Verbatim:

> "bí i gcónaí **ag déanamh iarrachta an pobal a thabhairt le chéile** agus naisc níos láidre a
> chruthú idir foghlaimeoirí na Gaeilge i mBéal Feirste…" — Gráinne Nic Fhearaigh, *An tUltach*

> "Shiúil mé liom, **ag déanamh iarrachta neamhaird a thabhairt** ar a bhfaca mé."
> — Pádraig de Bléine, "Ná meas duine de réir chuma a chraicinn!", *An tUltach*

> "…nó **ag déanamh iarrachta dul i ngleic** le dán nua-aoiseach" — Malachy Ó Néill, Eagarfhocal,
> *An tUltach*

**Shape:** `ag déanamh iarrachta` + [object] + `a` + verbal noun. **6 syllables** — twice the length
of `ag iarraidh`, and 184× rarer in the national corpus.

**But this is where §2e overturns the obvious reading.** In transcribed **Donegal speech**,
`ag déanamh iarrachta` occurs **zero** times — as does the genitive `déanamh iarrachta` in Connemara
and Kerry speech. What Donegal speakers actually say, when they use this construction at all, is the
**nominative** `ag déanamh iarracht` (3 hits), which no dictionary sanctions:

> "Caithfidh mé tréaslú go bhfuil siad **ag déanamh iarracht**…"
> — Aire Stáit na Gaeltachta, Donnchadh, *RnaG Barrscéalta*
> "Agus tá sé … tá sibhse **a' déanamh iarracht** é a thabhairt ar ais ansin fosta."
> — An Hoiméapat Ellen McDermott, *RnaG Barrscéalta*
> "tá muid **a' déanamh iarracht**" — John Ó Cuireáin, *RnaG Barrscéalta*

So the translators are right that `ag iarracht` is wrong and right that `iarracht` needs a light
verb — but `ag déanamh iarrachta` is a **written/editorial** form, not the Gaoth Dobhair spoken one.
For a spoken-method course I would not build on it.

### 2c. `iarracht a dhéanamh` / `rinne … iarracht` — the workhorse, and the ONLY thing that renders a bare past

2,426 / 33 and 357 / 13. Verbatim Ulster:

> "caithfidh muid **iarracht a dhéanamh réiteach sásúil a fháil**"
> — Cairméal Ní Néill, "An Ghaelscolaíocht", *An tUltach*

> "an rud ar fiú **iarracht a dhéanamh é a chaomhnú**" — Gráinne Ní Ghilín, Eagarfhocal, *An tUltach*

> "**Rinne muid iarracht ceann a fháil** in Inis Ceithleann, arsa Tommy."
> — Anton Mac Cába, "Dúchas Loch Éirne", *An tUltach*  ← **the exact shape frame 3 needs**

> "dhá chéad tríocha duine a **rinne iarracht éalú anoir**" — Pádraig de Bléine, "Beir leat Beirlín",
> *An tUltach*

> "bhí dream … a **rinne iarracht í a chur chun cinn**" — Ciarán Ó Pronntaigh, Eagarfhocal,
> *An tUltach*

### 2d. The rest of the candidate list — what the evidence says

| Candidate | whole CNG | *An tUltach* | Read |
|---|---|---|---|
| `ag triail` | 310 | 7 | **Attested but a different verb.** Every Ulster hit is *trying out / testing a thing*: "ag triail stíleanna difriúla scríbhneoireachta", "ag triail oidis nua", "ag triail stíleanna difriúla éadaí orm" (all Máire Zepf / Úna Ultach, *An tUltach*). One hit is "ag triail ar an Ghaeltacht" = *travelling to*. **Do not use it for "try to do X".** |
| `bain triail as` | 415 | 4 | Same — "have a go at a *thing*", not "attempt to *do*". |
| `féach le` / `ag féachaint le` | 320 | **1** | de Bhaldraithe's headline form, and it is **Munster/Connacht, not Ulster**. `d'fhéach mé le` = **0** in the entire national corpus. In 220k of Donegal folklore, `féachaint` = **0**. Reject for Ulster. |
| `tabhair faoi` / `ag tabhairt faoi` | 1,245 | 14 | Live in Ulster, but the Ulster hits mean *undertake* or *set about*, and several are the unrelated `tabhair faoi deara`. Usable for "have a go at", not the default "try to". |
| `promh` / `promhadh` | — | — | Only in de Bhaldraithe under *test/assay* ("Tástálaim, **promhaim**"). No running-text support found. **Reject.** |
| `thug … iarraidh` | 14 (`thug mé iarraidh`) | 0 | Real, and attested in **Donegal folklore**: "thug sí **iarraidh ar** Aodh" (*Teann, Teann, a Ribe*, Rann na Feirste) — but there it means *made a lunge at / attacked*, FGB's "attempt, **attack**" sense. Dangerous for a course. |

### 2e. The decisive column — transcribed Donegal speech

This partition arrived while the job was running, from a concurrent session, and it is better
evidence than anything else in this document: **RTÉ Raidió na Gaeltachta's Donegal desk**
(`RnaG (Barrscéalta)`) is transcribed spontaneous Donegal speech from named Gaoth Dobhair,
Toraigh and Na Gleannta speakers. Calibration and the dialect proof are in §0.

| Form | **UL — Donegal** | CO — Connemara | MU — Kerry |
|---|---|---|---|
| `agus` (control) | **30,776** | 52,981 | 52,117 |
| `xqzzy` (negative control) | **0** | 0 | 0 |
| **`ag iarracht`** | **0** | **0** | **0** |
| **`ag iarraidh`** | **1,165** | 1,888 | 290 |
| `iarracht` (the noun, any use) | 72 | 128 | 149 |
| `iarracht a dhéanamh` | 10 | 21 | 15 |
| `ag déanamh iarracht` (nom.) | 3 | 4 | 4 |
| `ag déanamh iarrachta` (gen.) | **0** | **0** | **0** |
| `rinne iarracht` | 1 | 1 | 0 |
| `ag triail` | **0** | 4 | 11 |
| `féachaint le` | **0** | 7 | 3 |
| `thug iarraidh` | **0** | 0 | 0 |
| `ag tabhairt faoi` | 2 | 8 | 3 |

**`ag iarracht` is zero in all three dialects' spoken corpora.** It is not a Donegal form, a
Connemara form or a Munster form. It is not a form.

And `ag iarraidh` — 1,165 hits — is the answer, in real Donegal voices:

> "ní bheidh na gadaí ná na daoine **ag iarraidh teacht isteach** in ceantar ar bith a bhfuil
> choiste maith mar sin ann" — An Comhairleoir Contae Séamus Ó Domhnaill, *RnaG Barrscéalta*

> "ag magadh ar a chéile a bhí muid … **ag iarraidh foghlaim corrfhocal** thall is abhus"
> — Antoin de Blárach / Húdaí Mór Ó Fearraigh, *RnaG Barrscéalta*

> "A' bhfuil a' rialtas **ag iarraidh sin a athrú**?" — An Dr. Tony Delap, *RnaG Barrscéalta*

> "tá muid **ag iarraidh cuidiú** agus feachtas a chur ar bun le níos mó daoine siopadóireacht a
> dhéanamh i **nGaoth Dobhair**" — Máire Uí Ghallchóir, *RnaG Barrscéalta*

> "tá sé dochreidte a' méid daoine atá **ag iarraidh cuidiú linn** é a chur"
> — John Ó Canainn, *RnaG Barrscéalta*

And `iarracht a dhéanamh` is alive in Donegal speech too, for the nominal/past frames:

> "tascfhórsa bunaithe anois le **iarracht a dhéanamh fostaíocht a mhealladh** go dtí, abair,
> Páirc Ghnó **Ghaoth Dobhair**." — Séamus Mac Ruairí, *RnaG Barrscéalta*

> "coiste óg … a **rinne iarracht mhór** an Fhéile a reáchtáil i mbliana"
> — Eoin Mac Gairbheith, *RnaG Barrscéalta*

---

## 3. The frame that breaks things

Kai's third frame is the real test, and it is the one `ag iarracht` was always going to fail —
because a bare past "tried", with no complement, has no progressive to hide in.

### "I am trying to think"

> **Tá mé ag iarraidh smaoineamh.**

Attested pattern (whole CNG, 52 hits of `ag iarraidh smaoineamh`):

> "bhí mé **ag iarraidh smaoineamh** ar an gcur síos a dhéanfadh Peadar air féin" — John Walsh,
> *Comhar*
> "bhí sé ar a bhionda **ag iarraidh smaoineamh** ar rud éigin le rá" — Liam Mac Cóil, *I dTír
> Strainséartha*

`ag iarraidh` + bare verbal noun, no object. 5 syllables.

**The bare-verbal-noun pattern is confirmed in Donegal speech** by a near-identical frame —
`ag iarraidh cuidiú` = **7** hits on the Donegal desk (§2e). So the *shape* is Donegal.

**Two honest caveats on this exact sentence**, both flagged rather than resolved:
- `ag iarraidh smaoineamh` itself is **0** on the Donegal desk (1 in Connemara, 0 in Kerry). The
  frame is sound; this specific collocation is not attested in the spoken Donegal sample.
- Donegal commonly has **smaointiú/smaoitiú** for `smaoineamh`. I checked: `ag iarraidh smaointiú`
  is also **0** in all three desks, so the corpus does not settle it either way. **The verb, not the
  construction, is the open question here** — worth a separate lexical check before this seed ships.

Heavier alternative: **Tá mé ag déanamh iarracht smaoineamh** — note the *nominative*, per §2b.

### "I am going to try to help"

Two things change once you look at Donegal speech rather than Ulster writing.

**First, Donegal's going-to periphrasis is `ag gabháil a`, not `ag dul a`** — on the Donegal desk
`ag gabháil a dhéanamh` = **28** against `ag dul a dhéanamh` = **2** (Connemara inverts it: 5 vs 10;
Kerry has neither):

> "Agus caidé an dóigh a bhfuil tusa **ag gabháil a dhéanamh** seo?"
> — Noel Ó Gallchóir, príomhoide Pobalscoile, *RnaG Barrscéalta*
> "Agus cad é eile 'tá tú **ag gabháil a dhéanamh**?" — Húdaí Mac Gairbheáin, *RnaG Barrscéalta*

**Second, the whole construction is attested in one Donegal sentence**, nominative and all:

> "tá mé **ag gabháil a dhéanamh iarracht** arís le gabháil le Fine Gael"
> — An Comhairleoir Contae Neamhspleách, *RnaG Barrscéalta*

That gives, directly:

> **Tá mé ag gabháil a dhéanamh iarracht cuidiú leat.**

The simpler future is also available and is what I would ship if the course wants the shorter line —
though note `déanfaidh mé iarracht` is **0** on the Donegal desk (167 in CNG overall, 2 in
*An tUltach*, 2 in Connemara speech, 2 in Kerry speech), so it is a written-register form:

> **Déanfaidh mé iarracht cuidiú leat.**

**Correction to an earlier draft of this document:** I first proposed `Tá mé ag dul a dhéanamh
iarrachta cuidiú leat` on the strength of *An tUltach*. Donegal speech says `ag gabháil`, not
`ag dul`, and `iarracht`, not `iarrachta`. Use the spoken form.

### "We have often tried" — no complement, bare past

> **Rinne muid iarracht go minic.**

This is where `ag iarraidh` cannot follow. `ag iarraidh` is a progressive; strip the complement and
strip the aspect and there is nothing left — *"d'iarr muid go minic"* means "we often **asked**",
which is a different sentence. Only the `iarracht` **noun** with a light verb survives:

- `rinne muid iarracht` — attested in Ulster verbatim: "**Rinne muid iarracht** ceann a fháil in
  Inis Ceithleann" (Anton Mac Cába, *An tUltach*). The complement is detachable; the sentence still
  stands without it. And in Donegal **speech**: "coiste óg … a **rinne iarracht mhór** an Fhéile a
  reáchtáil" (Eoin Mac Gairbheith, *RnaG Barrscéalta*) — note `iarracht` there takes an adjective,
  which is only possible because it is a noun. That is the grammatical proof in one line.
- `is iomaí uair a rinne …` — 11 in CNG, 1 in *An tUltach* — an idiomatic "many's the time" frame.

**The design consequence for the course.** Ulster has **two** systems for "try", not one, and the
course needs both:

| Frame | Form | Why |
|---|---|---|
| Progressive, with complement | **`ag iarraidh` + VN** | 805 Ulster hits; short (2–3 syll.); the everyday form |
| Bare past / no complement / nominal | **`iarracht` + `déan`** (`rinne muid iarracht`, `déanfaidh mé iarracht`, `iarracht a dhéanamh`) | the only thing that survives without a verbal-noun complement |

`ag iarracht` is neither. It is `ag iarraidh` misspelt with `iarracht`'s tail — which is exactly what
the 15 corpus hits look like when you read them.

---

## 4. GAPS — what I could not evidence

**Read this section before quoting anything above as settled.**

**GAP CLOSED mid-job — and I am leaving the original wording visible rather than quietly editing
it.** Gaps 2 and 5 below were written when my only Ulster evidence was *An tUltach*, a written
periodical. A concurrent session then found the **RnaG regional desks** — transcribed Donegal
speech, calibrated at `agus` = 30,776 — and §2e is the result. That column both confirmed the
verdict and **overturned my own §2b**: `ag déanamh iarrachta`, which I had endorsed on Ulster
writing, is zero in Donegal speech. The lesson is the one this document keeps re-learning:
**written Ulster is not spoken Donegal, and only the spoken corpus catches the difference.**

1. **I could not search a Donegal descriptive monograph.** Wagner's *Gaeilge Theilinn* (1959),
   Hamilton's *The Irish of Tory Island*, and Ó Baoill's Donegal work — the Ó Curnáin analogues —
   are **still not on this machine and I did not obtain them**. Everything I say about Ulster
   *grammar* rests on a periodical subcorpus and a folklore slice, not on a linguist's description.
2. ~~**My Ulster subcorpus is *written*, published, largely Belfast-and-editorial Irish** — *An
   tUltach* is the Ulster monthly, not a Gaoth Dobhair speech corpus.~~ **CLOSED by §2e.** The RnaG
   Donegal desk is a Gaoth Dobhair speech corpus, and it says the same thing about `ag iarracht`
   (zero) while contradicting *An tUltach* about `ag déanamh iarrachta` (also zero). The residual
   caveat is only about **size**: the Donegal desk is ~65k tokens, small enough that a genuinely
   rare form could hide in it. `ag iarraidh` at 1,165 is not affected by that; a one-or-two-hit
   claim would be.
3. **I did not grow the Donegal folklore corpus.** I intended to: I enumerated **321 Co. Donegal
   schools** out of dúchas.ie's 4,484 (the enumeration is saved at
   `~/gle-ul-corpus/schools_donegal.json`), and the site's own note is that **2,441 Irish-language
   Donegal Gaeltacht stories** are reachable. **dúchas.ie then rate-limited me — HTTP 429 — and I
   stopped rather than keep hammering a public heritage service.** The Donegal number in this
   document is therefore still the 220,979-character slice a prior worker harvested, not the
   several-million-character corpus that is available. **This is the single biggest thing left on
   the table, and it is a polite-backoff problem, not a dead end** — a slower harvest at 1 req/2s
   would get it.
4. **My school enumeration is itself incomplete** — 4,044 of 4,484 schools; ~10% of listing pages
   returned empty under load, and Rann na Feirste is among the schools missing from my list even
   though its text is in the corpus. Do not treat `schools_donegal.json` as exhaustive.
5. ~~**`ag iarracht` in a *spoken* Donegal corpus is untested.**~~ **CLOSED by §2e** — tested, and
   it is zero, against `ag iarraidh` at 1,165, with `xqzzy` = 0 proving the zero is real.
6. **corpas.ie has no dialect field.** Both my partitions are `doc.source` *proxies* — *An tUltach*
   for written Ulster, `RnaG (Barrscéalta)` for Donegal speech. Both were validated on
   discriminators (§0) rather than assumed. They are good proxies. They are proxies.
7. **`smaoineamh` vs Donegal `smaointiú/smaoitiú` is genuinely unresolved.** Both are **0** on the
   Donegal desk, so the corpus does not choose between them. Frame 1's *construction* is evidenced;
   frame 1's *verb* is not. This needs a lexical check before that seed ships.
8. **The Donegal folklore slice is CC BY-NC 4.0.** Consulting it as research evidence is a different
   act from shipping its text in a paid product. That is a human's call, not mine.
9. **I could not fan out.** The surface refused every dispatch — my conversation already sits at the
   fan-out depth ceiling — so this is one worker's sweep, not a partitioned one.

---

## 5. My read, offered as a read and not a ruling

Kai asked for evidence and a read, not a ruling. The read:

**`ag iarracht` should come out of all 22 seeds.** The convergence is unusually clean for a
linguistic question — four dictionaries silent, written Ulster at zero, **transcribed Donegal speech
at zero** against 1,165 for `ag iarraidh`, Connemara and Kerry speech at zero too, and a
national-corpus count that dissolves into Facebook posts when you read it. There is no dialect
defence available; this is not a case of "Donegal does it differently".

**The replacement is not one form, it is two**, and the split is the one in §3: `ag iarraidh` + VN
for the progressive frames, `iarracht` + `déan` for anything with a bare or absent complement. A
course that picks only the progressive will hit the wall at "we have often tried" — which is
precisely how this document found the problem.

**Do not simply swap in the translators' `ag déanamh iarrachta`.** They were right about the
disease and I think wrong about the cure. That form is zero in Donegal speech; where Donegal
speakers use `déan` progressively at all they say `ag déanamh iarracht`, in the nominative. The
everyday Donegal answer to "trying to" is `ag iarraidh`, 1,165 times over. This is worth saying back
to them explicitly, because they earned the correction by spotting the original error.

**The cost of acting is near zero and will not stay that way.** `gle_ul_for_eng` has **no
`course_audio` rows**, so nothing has been rendered and no money is at stake; the 22 carriers are
seed translations only, with 0 legos and 0 phrases affected because the course is not decomposed
yet. Fixing 22 seeds now is a text edit. Fixing them after decomposition and audio is a migration.

Finally — **grow the Donegal corpus, and make the RnaG desk the default.** Gap 3 is the one that
will keep costing us. The RnaG Donegal desk is only ~65k tokens; it answered this question because
`ag iarraidh` is common, and it will not answer the next one if the form is rarer. The dúchas
harvest (gap 3) would add millions of characters and needs nothing but patience and a 2-second
delay between requests.

And one process note, because it nearly cost this document its conclusion: **I had a defensible
answer from written Ulster that was wrong in one of its three recommendations.** Only the spoken
corpus caught it. Where a course teaches people to *speak*, spoken evidence has to outrank published
evidence — not merely supplement it.
