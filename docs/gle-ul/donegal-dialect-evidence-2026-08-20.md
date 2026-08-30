# Ulster (Donegal) Irish — evidence base for a `gle_ul_for_eng` course

**Compiled 2026-08-20, BEFORE any seed is translated.** Evidence only. No seeds translated, no database
writes, no TTS, nothing in `docs/gle-cn/` or any `gle_for_eng` / `gle_cn_for_eng` data touched.

Target dialect: Ulster Irish as spoken in the Donegal Gaeltacht — **Gaoth Dobhair, Rann na Feirste,
na Rosa, Cloich Cheann Fhaola**.

**Labelling key**, carried over from the Connemara evidence pass: every claim is **OBSERVED** (I fetched
it; URL given; quotations verbatim) or **INFERRED** (my own reasoning, flagged as such, never dressed
as evidence). Where I could not get something, it is a **GAP**, stated plainly.

**One methodological note up front, because everything below rests on it.** The Connemara pass counted
words across a whole corpus and then argued about what the counts meant. I found a better instrument.
`corpas.ie` exposes a per-source frequency breakdown (`command=freqtt&fttattr=doc.source`) *and* accepts
source-restricted queries (`within <doc source="…"/>`). The corpus contains two sources that are
specifically Donegal, one of them transcribed Gaeltacht speech from our exact target villages. So the
counts in this document are not "how often does Irish say X" — they are **"how often do Donegal speakers
say X, versus how often do Connemara and Munster speakers say it."** That is a different and much
stronger class of evidence, and it is why this document is more quantitative than its Connemara sibling.

---

## 1. Authorities actually consulted

### 1a. CONSULTED — reached, read, used

| Source | URL actually fetched | What I got |
|---|---|---|
| **Corpas Náisiúnta na Gaeilge** (National Corpus of Irish, 100M words, corpus code `cng`) | `https://www.corpas.ie/noskeproxy.json` (JSON API; `command=view`, `command=freqtt`) | The spine of this document. Full per-source frequency breakdowns and source-restricted concordances. Every count in §2 comes from here. Method detail in §1c. |
| **Béaloideas Beo — Tionscadal Béaloidis Ghaeltacht Thír Chonaill** (inside `cng` as a `doc.source`) | queried via the above; project site `https://www.bealoideasbeo.ie/bealoideas/httpdocs/indexBearla.php` | **The single best source in this hunt.** Transcribed oral interviews with Donegal Gaeltacht speakers. **249,173 tokens** of it are in the corpus and searchable. See §1b for provenance. |
| **RnaG (Barrscéalta)** (inside `cng` as a `doc.source`) | queried via the above; programme page `https://www.rte.ie/radio/rnag/barrscealta/` | **1,115,513 tokens** of contemporary Donegal broadcast speech. RTÉ RnaG's Donegal programme, broadcast from na Doirí Beaga. See §1b. |
| **Doegen Records Web Project** — Co. Donegal | `https://doegen.ie/taxonomy/term/21979` and 40 recording pages `https://doegen.ie/LA_*` | **40 Donegal recordings from 1928–31 with full Irish transcripts**, which I downloaded and mined: **98,178 characters**. Verbatim quotations throughout §2 and §4. |
| **E. C. Quiggin, *A Dialect of Donegal: being the speech of Meenawannia in the parish of Glenties*, Cambridge 1906** | `https://archive.org/download/dialectofdonegal00quig/dialectofdonegal00quig_djvu.txt` | Public domain, downloaded in full (**692,233 characters**). Partly mineable — see the important caveat in §5. Yielded the single best citation in this document on `cha` (§2.3). |
| **Ó Dónaill, *Foclóir Gaeilge–Béarla* (1977)** via teanglann | `https://www.teanglann.ie/en/fgb/<word>` — 60+ headwords fetched individually | Full verbatim entries. Yielded a significant **negative** finding about dialect labelling — see §1d. |
| **Raymond Hickey, "Literature on dialects"** (bibliography) | `http://www.raymondhickey.com/DI_Dialects_Literature.htm` | Exact author/year/title for every Donegal monograph, and the fact that Sommerfelt's *Torr* is **Gweedore** — i.e. Gaoth Dobhair, our target village. |
| **bealoideasbeo.ie** (project's own description) | `https://www.bealoideasbeo.ie/bealoideas/httpdocs/indexBearla.php` | Provenance of the Béaloideas Beo collection in the project's own words (§1b). |

### 1b. Provenance of the two Donegal sources — why the counts in §2 are trustworthy

This matters more than any individual number, so it is stated in full.

**Béaloideas Beo — Tionscadal Béaloidis Ghaeltacht Thír Chonaill.** OBSERVED, from the project's own
site: the archive contains *"hundreds of oral recordings involving interviews with 230 people from the
Donegal Gaeltacht"*, *"around 380 hours of interviews"*, collection *"carried out between 2006 and
2011"*, covering *"an area from as far afield as Fánaid to Gleann Cholm Cille and from An Clochán and
Baile na Finne to Cloich Cheann Fhaola, Gaoth Dobhair and Na Rosa."* The work was done by researchers
with Acadamh na hOllscolaíochta Gaeilge **in Gaoth Dobhair**.

That geography is not "Ulster" in general. It is **our target villages, named**. The transcripts in
`corpas.ie` carry speaker labels (`DÓNALL:`, `JOE:`, `GRACIE:`, `FRANK:`, `CATHAL:`, `ANNA NIC
SUIBHNE:`, `PADAÍ GHRACIE:`), confirming they are genuine interview transcripts and not edited prose.

**Caveat, OBSERVED from the same page and important:** *"with some of the interviews transcribed"* —
only a **portion** of the 380 hours is transcribed. The 249,173 tokens in `corpas.ie` are a subset, not
the whole collection. INFERRED: I have no way to tell whether that subset is topically or geographically
representative of the whole, so treat the sub-corpus as a large convenience sample of Donegal Gaeltacht
speech rather than a balanced one.

**RnaG (Barrscéalta).** OBSERVED: broadcast from **na Doirí Beaga (Derrybeg), Co. Donegal**; it
*"provides comprehensive coverage of all types of content relating to the Donegal community at home and
abroad, along with stories from the Six Counties, Cavan and Monaghan."* So it is Donegal-centred but
**not Donegal-exclusive** — some Six Counties / Cavan / Monaghan material is in there. Treat it as
contemporary Ulster-with-a-Donegal-core, and prefer Béaloideas Beo wherever the two disagree.

**Comparator panels** used for the cross-dialect columns in §2, all `doc.source` values in the same
corpus: Connacht = `RnaG (Iris Aniar)`, `Bailiúchán Béaloidis Árann`, `Learning Irish`, `Galway Daily`.
Munster = `RnaG (An Saol ó Dheas)`, `Paróiste Baile Mhuirne`, `Cork Irish`. Neutral/standard = `EUR-Lex`,
`Tuairisc`, `Nuacht RTÉ`, `Achtanna an Oireachtais`, `An Vicipéid`.

### 1c. The counting method, and its self-test

Two figures are reported per item:

- **BB** = raw hits inside Béaloideas Beo (249,173 tokens of Donegal Gaeltacht speech).
- **BS** = raw hits inside Barrscéalta (1,115,513 tokens of Donegal broadcast speech).

Because BB and BS are fixed sub-corpora, BB and BS numbers are directly comparable *between words within
the same column*, which is all §2 ever does. The cross-dialect panel rates quoted in prose are
normalised as hits per 10,000 occurrences of `agus` in that panel, to correct for wildly different panel
sizes.

**The instrument was calibrated before it was trusted**, on words whose dialect is not in dispute. It
behaves exactly as it must:

| Test word | Expected | DON-spoken rate | CONNACHT rate | MUNSTER rate |
|---|---|---|---|---|
| `céard` | Connacht | **0.0** | **425.4** | 1.7 |
| `cén chaoi` | Connacht | **0.0** | **129.0** | 0.4 |
| `conas` | Munster | **0.0** | 4.1 | **188.2** |
| `is dóigh liom` | Munster | **0.0** | 18.0 | **300.1** |
| `fosta` | Ulster | **642.7** | 5.8 | **0.2** |
| `achan` | Ulster | **804.6** | 0.3 | **0.0** |

A second self-test: the source-restricted query for `fosta` in Béaloideas Beo returns 373, exactly
matching the figure the independent `freqtt` breakdown gives for that source. The two code paths agree.

### 1d. An honest correction to my own brief

My brief said *"Ó Dónaill was himself a Donegal man and his FGB marks dialect labels."* The first half is
true and the second half, **for the words that matter here, is not.** OBSERVED across 60+ individually
fetched FGB entries: `caidé`, `goidé`, `achan`, `uilig`, `fosta`, `domh`, `leofa`, `daofa`, `inteacht`,
`tchí`, `chí`, `thig` are all listed as **plain headwords or bare cross-references with no regional tag
whatsoever**:

> `caidé = cad é: cad 1 2.` · `goidé = cad é: cad 1 2.` · `achan = gach aon: gach.` · `uilig = uile 2, 4 (a).`
> `domh = dom: do 3.` · `leofa 2 = leo: le 1.` · `daofa. 1 = díobh: de 1. 2 = dóibh: do 3.` · `inteacht = éigin 1.`
> `tchí, ~onn, var. pres. of feic 2.` · `thig, var. pres. of tar 1.`
> `fosta 2, adv. Also. An ceann eile ~, the other one also. …`

**Consequence for the ruling:** you cannot use FGB to decide what is "Donegal" and what is "standard."
Ó Dónaill's dictionary accepts nearly all of these as ordinary Irish. FGB is authoritative here for
**spelling and morphology** (and §2.3 leans on it heavily for exactly that), but the *dialect*
determination has to come from the corpus, which is what §2 does. This also means the Connemara spec's
§1c "FORBIDDEN — Ulster" list cannot be justified by dictionary labels — see §2.11.

### 1e. CONSULTED-BUT-UNREACHABLE — tried, failed, said so

| Source | URL / attempt | What actually happened |
|---|---|---|
| **Seosamh Mac Grianna, *An Druma Mór*** (Rann na Feirste — dead centre of target) | `https://archive.org/download/drumamor0000seos/drumamor0000seos_djvu.txt` | **HTTP 500.** Metadata confirms `access-restricted-item: true`, collections `inlibrary`/`printdisabled` — controlled digital lending. The `_djvu.txt` exists but is not served. **Not read.** |
| **Séamus Ó Grianna, *Caisleáin Óir*** | archive.org advanced search, exact phrase | **0 results.** Not digitised on archive.org that I could find. Not read. |
| **Wagner, *Gaeilge Theilinn* (1979 [1959])** | archive.org search; web search | **0 results / no free copy found.** In print from DIAS. Not read. |
| **Hamilton, *A phonetic study of the Irish of Tory Island* (1974)** | web search | Existence and exact title confirmed via Hickey's bibliography only. **No text obtained.** |
| **Sommerfelt, *The dialect of Torr, Co. Donegal* (1922)** — Torr = **Gweedore**, our target village | archive.org search | archive.org **rate-limited me** (non-JSON error responses) before I could complete the availability check. **Availability genuinely unknown — I did not establish that it is absent, only that I did not check.** This is the highest-value unchecked lead in the whole pass; it is 1922 and therefore probably public domain. |
| **Lucas, *Grammar of Ros Goill Irish* (1979)**; **Ó Baoill, *An Teanga Bheo: Gaeilge Uladh* (1996)**; **Ó Searcaigh (1925, 1939)**; **Mac Congáil**; **Art Hughes, 'Gaeilge Uladh' (1994)** | Hickey bibliography + web search | Titles and years confirmed. **No text of any of them obtained.** All appear to be print-only. |
| **dúchas.ie Schools' Collection, Co. Donegal** | `https://www.duchas.ie/en/cbes/cnag` | **HTTP 404** on the path I tried. I did not find the correct Donegal-county path within the time available. **GAP, not "confirmed absent"** — the material almost certainly exists and someone should chase it. |
| **doegen.ie site search** | `https://doegen.ie/search/node/…` | **HTTP 403.** Worked around it by walking the county taxonomy term instead, which succeeded — so this block cost nothing. |
| **raymondhickey.com via WebFetch** | — | SSL/TLS internal error through the fetch tool; **succeeded via plain curl**, so the source is in the CONSULTED list. |

### 1f. Sources I deliberately did NOT claim

I did not open `corpas.ria.ie`, `celt.ucc.ie` (reachable, HTTP 200, but not searched), `focloir.ie`,
`tearma.ie`, or Vicipéid. They are not cited anywhere in this document. `celt.ucc.ie` and `focloir.ie`
are both live and are reasonable next leads.

---

## 2. The Donegal form inventory

**How to read the tables.** BB = Béaloideas Beo (Donegal Gaeltacht speech, 249,173 tokens). BS =
Barrscéalta (Donegal broadcast, 1,115,513 tokens). Confidence is mine, and reflects both the size of the
signal and whether independent sources (Doegen 1928–31, Quiggin 1906, FGB) agree.

### 2.1 "What"

| | Donegal | Standard | Connemara | BB | BS | Confidence |
|---|---|---|---|---|---|---|
| what | **`caidé` / `goidé`** | `cad é` / `céard` | `céard` | caidé **305**, goidé 0 | goidé **1477**, caidé 45 | **HIGH** on the form, **LOW on which spelling** |
| | | | | `céard` **0** | `céard` **1** | |
| | | | | `cad é` 16 | `cad é` 348 | |

`céard` is effectively **absent** from Donegal (0 and 1). That is clean and certain.

The spelling, however, is genuinely unresolved, and the two Donegal sources flatly contradict each
other: Béaloideas Beo writes `caidé` 305 times and `goidé` never; Barrscéalta writes `goidé` 1,477 times
and `caidé` 45. Both are FGB headwords (`caidé = cad é`, `goidé = cad é`). Independent sources break the
tie toward **`goidé`**:

- OBSERVED, Doegen 1928–31 Donegal transcripts: **`goidé` 47, `caidé` 0.**
  > *"Chualaidh an cearlamán **goidé** a dúirt an madadh rua."* (Doimnic Ó Gallchobhair, `doegen.ie/LA_1227d1`)
  > *"…cha rabh a fhios aige **goidé** an freaghar a bheirfeadh sé air."*
- OBSERVED, Quiggin 1906, §491, transcribing Glenties speech: `gə-dʹeː -mər ˈtaː -tuw`, glossed by
  Quiggin himself as *'how are you?'* — a `g`-initial form, not `c`-initial.

**INFERRED (flagged):** all four sources are recording the same spoken word, roughly /gəˈdʹeː/, and the
`caidé`/`goidé` split is a **transcription convention**, not a dialect difference. Béaloideas Beo's
transcribers chose one, everyone else chose the other. **This needs a human ruling (§3, item 1).**

### 2.2 "How"

| | Donegal | Connemara | Munster | BB | BS |
|---|---|---|---|---|---|
| how (interrogative) | **`caidé mar` / `goidé mar`** | `cén chaoi` | `conas` | caidé mar **19** | goidé mar **155** |
| | | | | `cén chaoi` **0** | `cén chaoi` **0** |
| | | | | `conas` **0** | `conas` **0** |

**Confidence: HIGH.** `cén chaoi` and `conas` are *both exactly zero* in both Donegal sources. Donegal
uses the `X mar` construction, with the same `caidé`/`goidé` spelling question as §2.1.

Note the construction carefully — it takes **`mar`** and then a direct verb form, **not** `a` + eclipsis:

> OBSERVED [Barrscéalta]: *"Antoin, **goidé mar tá** tú?"* — the greeting, verbatim.
> OBSERVED [Barrscéalta]: *"Níl ' fhios agam **goidé mar tá** sin i gcomparáid le eh Conamara…"*
> OBSERVED [Béaloideas Beo]: *"Níl a fhios agam **caidé mar atá** muid beo inniu ar chor ar bith."*
> OBSERVED [Béaloideas Beo]: *"Sea, **caidé mar a** bhí sin, a Anna?"*
> OBSERVED [Doegen 1928–31]: *"A Dhonnchaidh, **goidé mar** a mhoithíos tú?"*
> OBSERVED [Doegen 1928–31]: *"Cuma liom **goidé mar atá** sí."*
> OBSERVED [Quiggin 1906 §491]: `gə-dʹeː -mər ˈtaː -tuw` = *'how are you?'*

So "How are you?" in Donegal is **`Goidé mar tá tú?`** — attested identically in 1906, 1928–31 and
today. That is about as solid as dialect evidence gets. Contrast the Connemara course's `Cén chaoi a
bhfuil tú?`, which requires the particle + eclipsis; the Donegal form does not.

`cad é mar` (the form on the Connemara spec's forbidden list) is real but minor: BB 2, BS 19.

### 2.3 Negation — `cha`/`chan`/`char` vs `ní` — **the critical section**

This is the question the brief flagged as the one we most fear getting wrong, so it gets the most
evidence. **The headline: `ní` is the majority negator in Donegal, not `cha`.**

**Measured inside Donegal speech:**

| Negator | BB (Gaeltacht speech) | BS (broadcast) |
|---|---|---|
| `ní` | **1,307** | **2,954** |
| `cha` | 405 | 324 |
| `chan` | 64 | 166 |
| `char` | 48 | 71 |
| **`ní` : `cha` ratio** | **3.2 : 1** | **9.1 : 1** |
| `ní raibh` | **706** | **662** |
| `cha raibh` | 221 | 107 |
| **`ní raibh` : `cha raibh`** | **3.2 : 1** | 6.2 : 1 |
| `níl` | **443** | **2,999** |
| **`chan fhuil`** | **0** | **0** |
| `níor` | 139 | 340 |
| `nach` | 510 | 2,770 |
| `nach bhfuil` | 66 | 1,205 |

Three findings, each independently important.

**(a) `ní` outnumbers `cha` roughly 3:1 even in the most traditional Donegal speech available**, and the
same 3.2:1 ratio holds for the single commonest verb form (`ní raibh` vs `cha raibh`). They are not in
complementary distribution — they alternate, in the same conversations, in the same speakers' mouths,
sometimes in the same sentence:

> OBSERVED [Béaloideas Beo]: *"**ní raibh** sin, bhfurast sin a dhéanamh inniu but **cha raibh** se chomh furast a dhéanamh an t-am sin."* — both negators, one sentence.
> OBSERVED [Béaloideas Beo]: *"Agus, cha, ní, raibh mé súráilte na **chan fhaca** mise le blianta roimhe sin é, **ní raibh** a fhios…"* — the speaker starts `cha`, self-corrects to `ní`, mid-utterance.
> OBSERVED [Doegen 1928–31]: *"**Ní fheiceann** sí mé ar chor ar bith. Ach **tchíonn** sí tusa…"* — adjacent sentences, one speaker.

**(b) `cha` is receding, and the recession is measurable across a century.** OBSERVED, raw string counts
in the Doegen 1928–31 Donegal transcripts: `cha` 52, `ní` 70 — roughly **1.35:1**. Compare 3.2:1 in
2006–11 Gaeltacht speech and 9.1:1 in contemporary broadcast. *(Caveat: the Doegen figures are raw
substring counts over 98k characters of narrative folktale, a different genre from the other two, so the
trend is directional evidence, not a controlled measurement.)*

**(c) `chan fhuil` is dead.** It is **0 in both Donegal sources**, despite being FGB's own headline
example (*"Chan fhuil sin ceart, that is not right"*) and despite being genuinely attested in 1928–31:

> OBSERVED [Doegen 1928–31]: *"'Ó,' a deir sé, '**chan fhuil** a fhios agam. **Cha dtig** mo chuid brístí bána…'"*

The living Donegal form for "is not / I am not" is **`níl`** — 443 in BB, 2,999 in BS.

> OBSERVED [Béaloideas Beo]: *"**níl mé** ábalta smaoineamh, Ned Mhuiris Neidí thall ann…"*
> OBSERVED [Béaloideas Beo]: *"No, ní fhaca, **níl mé** eolach go leor air."*

**The morphology of `cha`**, OBSERVED from FGB verbatim, and then independently confirmed by tallying
what actually follows `cha` in 386 sampled Donegal concordance lines:

> FGB `cha`, neg. part.: *"lenites b, c, f, g, m, p, s; eclipses d, t; becomes **chan** before vowel or f
> followed by a vowel; becomes **char** with past tense of regular verbs"*; and *"cha combines with forms
> ar, arbh, of copula to form char, charbh."*

Corpus tally of the word immediately following each particle:

- **`cha` + lenition**: `cha bheadh`, `cha bhíonn`, `cha bhain`, `cha choinneodh`, `cha chuirim` ✔
- **`cha` + eclipsis on d/t**: `cha dtig` (BS 34), `cha dtiocfadh`, `cha dtáinig`, `cha dtug`, `cha dtearn`, `cha dteachaigh` ✔
- **`cha raibh`** is by far the commonest single collocation (BB 118 of 186 sampled) — `raibh`/`rabh`, the dependent form, unmutated.
- **`chan` + `fh-`**: `chan fhaca` (BB 18 — the commonest `chan` + verb), `chan fhuair`, `chan fhaghann` ✔
- **`chan` + non-verbs** (the copula-ish use): `chan é`, `chan amháin`, `chan an`, `chan in`, `chan sin`, `chan rud`, `chan achan` ✔ — matching FGB's *"chan used with other parts of speech"*.
- **`char` + lenited regular past**: `char fhan`, `char mharaigh`, `char mhothaigh`, `char fhág`, `char shíl`, `char chaill`, `char ól`, `char chuir` ✔
- **`char` + copula**: `char mhaith` (BS 11) = "wouldn't like", `char mhiste` ✔

> OBSERVED [Béaloideas Beo]: *"…**char fhan** mise ar an scoil go raibh, go raibh mé trí."*
> OBSERVED [Doegen 1928–31]: *"Ach **char fhág** mise mo chúrsa a'n orlach…"*
> OBSERVED [Barrscéalta]: *"nuair atá siad tinn **cha dtig** leat … níl tú a' fáil a' seirbhís chéanna."* — note `cha dtig` and `níl` in one breath.

**One measured exception to FGB's rule**, worth flagging: `cha mbeadh` occurs 4 times in the BB sample —
eclipsis on `b`, where FGB prescribes lenition. INFERRED: real speaker variation, not a transcription
error, given it recurs. Do not treat FGB's mutation rule as exceptionless.

**`nach` is completely unaffected** by any of this — 510 in BB, 2,770 in BS, with `nach bhfuil` at 1,205
in BS. Negative questions and negative relatives use `nach` in Donegal exactly as elsewhere. There is no
`cha`-based competitor.

### 2.4 "Also", "every", "all", "at all", "nothing"

| Meaning | Donegal | BB | BS | Standard/Connemara comparator | BB | BS | Confidence |
|---|---|---|---|---|---|---|---|
| also | **`fosta`** | **373** | **1792** | `freisin` | **0** | 5 | **HIGH** |
| | | | | `chomh maith` | 22 | 133 | |
| every | **`achan`** | **467** | **1864** | `gach` | 6 | 168 | **HIGH** |
| | | | | `chuile` (Conn.) | 6 | 33 | |
| all | **`uilig`** | **340** | **1510** | `ar fad` | 45 | 492 | **HIGH** for Donegal use |
| | | | | `go léir` | 36 | 287 | but see caveat |
| at all | **`ar bith`** | **918** | **3456** | — | — | — | **HIGH** |
| at all (emph.) | `ar chor ar bith` | 50 | 310 | | | | HIGH |
| anyway / at all | **`ar scor ar bith`** | **146** | 101 | (Connacht 0, Munster 0) | | | **HIGH — Donegal-specific** |
| anything/nothing | **`a dhath`** | **264** | **527** | `tada` (Conn.) | 1 | 2 | **HIGH** |
| | `dada`/`dadaí` | 37 | 6 | `faic` (Mun.) | 0 | 3 | |

`freisin` at **0** in 249,173 tokens of Donegal Gaeltacht speech is one of the starkest results here.

> OBSERVED [Béaloideas Beo]: *"Bhí nósanna iontach **fosta** a Joe…"* · *"Déarfainn sin **fosta**."*
> OBSERVED [Béaloideas Beo]: *"…**achan nduine** ag bordáil aníos leathaigh…"* · *"cosúil le **achan ghasúr** óg"* · *"**achan rud** mar sin"*
> OBSERVED [Béaloideas Beo]: *"sin an dóigh a raibh na daoine **uilig** ag bogadaigh thíos"*
> OBSERVED [Béaloideas Beo]: *"…gan stoirm, gan **a dhath**"* · *"níl **a dhath** do níos mó"* · *"cha bheadh **a dhath** ann ach sean bhuicéidí"*
> OBSERVED [Béaloideas Beo]: *"Bhí sé ag gabháil do mharú **ar scor ar bith**."*
> OBSERVED [Doegen 1928–31]: *"**Níl** dadaí agam. Níl leabhar urnaí agam. Níl Bíobla agam. **Níl dadaí** agam."*

**`uilig` caveat, and it matters for §2.11:** `uilig` is *not* Ulster-exclusive. Cross-panel rate per 10k
`agus`: Donegal-spoken 585.8, but **Connacht 252.7** and neutral 39.2 — a real Connacht presence. FGB
gives `uilig = uile`. So `uilig` is a **pan-Connacht-and-Ulster** form that Donegal uses heavily, not a
Donegal shibboleth.

Note also `achan` takes eclipsis/lenition on the following noun in real speech (`achan nduine`, `achan
ghasúr`, `achan cheann`), which a naive `achan` + noun template will get wrong.

### 2.5 "Able to" and "can"

| | Donegal | BB | BS | Comparator | BB | BS |
|---|---|---|---|---|---|---|
| able to | **`ábalta`** | **179** | **1021** | `in ann` (Connemara) | **0** | 21 |
| can (verbal) | **`thig le…`** | 17 | **712** | `is féidir le…` | **0** | 64 |

**Confidence: HIGH.** `in ann` — the Connemara course's chosen form — is **0** in Donegal Gaeltacht
speech. Donegal has two devices: adjectival `ábalta` and the verb `thig le` (FGB: `thig, var. pres. of
tar`).

> OBSERVED [Béaloideas Beo]: *"cha raibh sé **ábalta** fáil fríd"* · *"cha raibh tú **ábalta amharc** cá raibh an bus ag gabháil"* · *"níl mé **ábalta** smaoineamh"*
> OBSERVED [Béaloideas Beo]: *"ní **thig liom** smaoineamh anois"* · *"**Thig leat** dul amach"* · *"**thig liom** í a fónal agus fiafraigh dithi"*
> OBSERVED [Barrscéalta]: *"**thig leat** an oiread sin ábhair a dhéanamh"*

Note the negation pattern in the citations: **`ní thig liom`** (BB 16) is commoner than `cha dtig` (BB 6)
in the Gaeltacht material, though `cha dtig` leads in broadcast (BS 55 vs `ní thig` 115 — still `ní`
ahead). Another instance of §2.3's rule: don't reach for `cha` by default.

**`ábalta` caveat, also relevant to §2.11:** `ábalta` is **not** Ulster-exclusive — the Munster panel
rate is 105.8 per 10k `agus`, against Donegal-spoken 308.4. It is commoner in Donegal but is ordinary
Irish elsewhere too, and FGB gives it a plain unlabelled entry.

### 2.6 Look / see

| | Donegal | BB | BS | Comparator | BB | BS |
|---|---|---|---|---|---|---|
| look (at) | **`amharc`** | **118** | **453** | `breathnaigh` (Conn.) | 1 | 1 |
| | | | | `féach` (Mun.) | 10 | 4 |
| | `coimhéad` (minor) | 11 | 28 | | | |
| sees (present) | **`tchíonn`** | 1 | **129** | `feiceann`/`feicim` | **0** | 4 |
| will see | **`tchífidh`** | 1 | **80** | `feicfidh` | 0 | 1 |
| saw (past) | **`chonaic`** | **101** | **186** | — | | |

**Confidence: HIGH for `amharc`. HIGH for `tch-` as the present/future stem, with an important caveat.**

`breathnaigh` — the Connemara course's chosen "look" — is 1 and 1. Effectively absent.

The "sees" verb needs care. The **present and future** stems are `tchí-`/`tchíonn`/`tchífidh` in Donegal;
`feiceann`/`feicim` are essentially absent (0 and 4). But the **past** is the ordinary `chonaic` (101,
186) — there is no `tch-` past. FGB has all of this: `tchí, ~onn, var. pres. of feic 2` and `chífidh,
var. fut. of feic 2`.

> OBSERVED [Barrscéalta]: *"**tchíonn muid** anois le bhí sé san Irish Times ansin…"* · *"mar **tchíonn siad** go bhfuil margadh iontach maith le…"*
> OBSERVED [Béaloideas Beo]: *"nuair a shuíonn tú anseo tráthnona, chonaic, **tchíonn tú** athrach mór ar an tsaol."*
> OBSERVED [Doegen 1928–31]: *"Ní fheiceann sí mé ar chor ar bith. Ach **tchíonn** sí tusa ag caint…"* · *"Agus **tchíonn** sé 'uige san áit chéanna…"* · *"cibé a **tchífeadh** comhrac na beirte…"*

**A trap inside this one, and it is a nasty one.** The variant `chíonn` (without `t-`) is **Munster**, not
Donegal: cross-panel rate 38.4 in Munster against 0.3 in the Ulster-literary panel and 1.7
Donegal-spoken. Writing `chíonn` for Donegal imports a Munster form while believing you are writing
Ulster. Use `tchíonn`.

### 2.7 "We", and synthetic vs analytic verb forms

| | Donegal | BB | BS | Comparator | BB | BS |
|---|---|---|---|---|---|---|
| we (pronoun) | **`muid`** | **803** | **4918** | `sinn` | 3 | 30 |
| we are | **`tá muid`** | 15 | **759** | `táimid` | **0** | 10 |
| we were | **`bhí muid`** | **194** | **409** | `bhíomar` | **0** | 4 |
| I am | **`tá mé`** | **143** | **790** | `táim` | 3 | 2 |
| I was | **`bhí mé`** | **276** | **603** | `bhíos` | — | — |

**Confidence: HIGH. Yes — analytic `tá muid` is right for Donegal**, and so is analytic `bhí muid` and
`tá mé`. `táimid` is 0/10, `bhíomar` 0/4, `táim` 3/2. Donegal is not the synthetic-retaining dialect one
might assume from its reputation; on these forms it patterns with Connacht against Munster.

> OBSERVED [Barrscéalta]: *"…agus **tá muid** ag gabháil go dtí Siopa Mhicí maidin Dé hAoine"* · *"Tá léar grúpaí againn agus **tá muid uilig** déanamh rudaí difriúil."*

**Caveat on the BB column:** `tá muid` is only 15 in Béaloideas Beo against 759 in Barrscéalta. INFERRED:
this is a **genre artefact, not a dialect fact** — Béaloideas Beo is reminiscence, narrated in the past
tense throughout, so present-tense 1pl forms are naturally rare there. Note that `bhí muid` (past) is 194
in the same material. The two columns agree once genre is accounted for; do not read the BB 15 as
weakness of `tá muid`.

**The 1sg present synthetic is alive**, exactly as in Connemara: `sílim` is well attested (§2.9), and
Doegen has `cha chuirim`. INFERRED: the Connemara spec's corrected rule — *synthetic 1sg present YES,
synthetic 1pl and synthetic past NO* — carries over to Donegal unchanged. I did not test the full 1sg
paradigm systematically; that is a gap (§5).

### 2.8 Prepositional pronouns

| Meaning | Donegal | BB | BS | Standard | BB | BS | Verdict |
|---|---|---|---|---|---|---|---|
| to me | **`domh`** | **316** | **480** | `dom` | 3 | 73 | **Donegal form, HIGH** |
| to me (emph.) | `domhsa` | 15 | 82 | | | | |
| ("`damh`") | `damh` | 2 | 2 | | | | **not a Donegal spelling** — see below |
| to them | **`daofa`** | **99** | **670** | `dóibh` | 14 | 5 | **Donegal form, HIGH** |
| with them | `leofa` | 103 | 301 | `leo` | **125** | **610** | **variant, not the norm — MEDIUM** |
| at them | `acu` | 714 | 2731 | — | | | standard |
| at her | `aici` | 72 | 154 | (`aice` not Donegal) | | | standard |

**`domh` is emphatic and certain** — it outnumbers `dom` 316:3 in Gaeltacht speech. FGB: `domh = dom: do 3`.

**`damh` is a false lead and should be struck.** BB 2, BS 2. FGB's `damh` entry is *"damh 1, m. … 1. Ox."*
— i.e. the hits are mostly the noun "ox", not a preposition. The Donegal spelling is `domh`.

> OBSERVED [Béaloideas Beo]: *"an seanachas sin a thabhairt **domh** a chara"* · *"inis **domh** fán khelp a Joe"*
> OBSERVED [Doegen 1928–31]: *"Seo scéal a d'ins Pádraig Sheáin Phadaí **domhsa**."* · *"d'ins sé **dófa** goidé a dúirt an madadh rua"*

**`leofa` is the one I nearly overclaimed, and the honest answer is more modest.** It is genuinely
Donegal-marked cross-dialectally (rate 177.5 Donegal-spoken vs 2.8 Connacht, 0.2 Munster). But *inside*
Donegal, plain **`leo` is still commoner than `leofa`** in both sources (125 vs 103; 610 vs 301). So
`leofa` is a live Donegal variant, not the default. Contrast `daofa`, which genuinely **has** displaced
`dóibh` inside Donegal (99 vs 14; 670 vs 5). Treat the two differently.

> OBSERVED [Béaloideas Beo]: *"ba ghnách **leofa** cúl faiche a bhaint"* · *"Labhair mé **leofa** Gaeilge"*
> OBSERVED [Doegen 1928–31]: *"gur ghnách **leofa** cruinniú insa choillidh"* · *"dúirt sé **leofa** troid ar a ndíchealt"*

The rest of the `ag` set (`agam agat aige aici againn agaibh acu`) shows **no** Donegal-specific forms in
the data: `aca` is 3 hits corpus-wide in the Ulster panel and 0 in BB; `oram` for `orm` is 1 hit. To the
question in my brief — *any Donegal-specific forms like `agaibh` vs `agaibhse`, or `aici` vs `aice`* —
the measured answer is **no**, apart from `domh`, `daofa` and (partially) `leofa`.

### 2.9 Want, think, some, about

| Meaning | Donegal | BB | BS | Comparator | BB | BS | Confidence |
|---|---|---|---|---|---|---|---|
| think | **`síleann`/`sílim`** | **74** | **517** | `ceapann`/`ceapaim` | **0** | 5 | **HIGH** |
| want | `tá … ag iarraidh` | 37 | **1163** | `teastaíonn` | **0** | **0** | **HIGH** (see caveat) |
| would like | `ba mhaith liom` | 32 | 121 | | | | MEDIUM |
| some | **`inteacht`** | **258** | 150 | `éigin` | 3 | 39 | **HIGH** |
| about / under | **`fá`** | **715** | **3533** | `faoi` | 100 | 851 | **HIGH** |
| dog | `madadh` | 4 | **48** | `madra` | **0** | **0** | MEDIUM (low n) |
| again | `arís` | **98** | **399** | `aríst` | **0** | **301** | see §3 |
| speak a language | `i nGaeilge` | 16 | 65 | `as Gaeilge` | **0** | 1 | MEDIUM |

`ceapaim`/`ceapann` — the Connemara course's word for "think" — is **0** in Donegal Gaeltacht speech.
Donegal says `síl`.

> OBSERVED [Béaloideas Beo]: *"Bhuel **sílim** eh, rud a chuala mé seo anois, **sílim go** raibh siad ag caint…"*
> OBSERVED [Béaloideas Beo]: *"bhí rud **inteacht** saothúil fá dubh de"* · *"bheadh duine **inteacht** eile ag teacht aníos"*
> OBSERVED [Béaloideas Beo]: *"**fá choinne** ag obair le asal"* · *"**fá chuimhne** atá agat a gasúr óg"*
> OBSERVED [Béaloideas Beo]: *"ní thig liom a dhath a dhéanamh **fá dtaobh dá** dhath a tharla"*

**`teastaíonn` is 0/0** — so the Connemara course's decision to drop `teastaíonn` in favour of `ag
iarraidh` holds for Donegal too, and more strongly.

**Caveat on `ag iarraidh` in BB (37):** low, but this is the same past-tense-narrative genre effect as
§2.7; BS 1,163 is the better guide. **MEDIUM confidence** that `ag iarraidh` is the right default for
"want" in Donegal; I did not establish what competes with it in the Gaeltacht material, and that is a
gap (§5).

**"Speak a language":** `as Gaeilge` is 0/1 and `i nGaeilge` 16/65 — the *same* result the Connemara pass
reached. INFERRED: the `i nGaeilge` preference is pan-dialectal, not Connemara-specific. `Gaeilge agam`
for "I speak Irish" is 0/2 — too thin to rule on, a gap.

### 2.10 Summary — the forms I would put in front of a native reviewer first

| Meaning | Donegal | Standard | Connemara | Evidence strength |
|---|---|---|---|---|
| also | `fosta` | `freisin` | `freisin` | **highest** (freisin = 0 in BB) |
| every | `achan` | `gach` | `chuile` | **highest** |
| how are you | `goidé/caidé mar tá tú` | `conas atá tú` | `cén chaoi a bhfuil tú` | **highest** (3 sources, 1906→now) |
| what | `goidé`/`caidé` | `cad é` | `céard` | high on form, **unresolved on spelling** |
| anything/nothing | `a dhath` | `aon rud`/`dada` | `tada` | **highest** |
| to me | `domh` | `dom` | `dom` | **highest** (316:3) |
| to them | `daofa` | `dóibh` | `dóibh` | **highest** |
| able to | `ábalta` / `thig le` | `in ann` | `in ann` | **highest** (in ann = 0 in BB) |
| look | `amharc` | `féach` | `breathnaigh` | **highest** |
| sees | `tchíonn` (past `chonaic`) | `feiceann` | `feiceann` | high; **beware `chíonn` = Munster** |
| think | `síleann`/`sílim` | `ceapann` | `ceapaim` | **highest** (ceap = 0 in BB) |
| some | `inteacht` | `éigin` | `eicínt` | **highest** |
| about | `fá` | `faoi` | `faoi` | **highest** |
| anyway/at all | `ar scor ar bith` | — | — | high, Donegal-specific |
| we are | `tá muid` | `táimid` | `tá muid` | **highest** — same as Connemara |
| not | **`ní` first, `cha` second** | `ní` | `ní` | **see §2.3 — do not invert this** |

### 2.11 Verifying the Connemara spec's "FORBIDDEN — Ulster" list

My brief asked me to verify rather than copy that list. Verified item by item against the corpus and FGB:

| Item on the list | Verdict | Evidence |
|---|---|---|
| `chan` | **CONFIRM** as Ulster-marked | Ulster panel 42.5 vs Connacht 1.1, Munster 0.9 |
| `cha` | **CONFIRM** | Donegal-spoken 697.8 vs Connacht 0.3, Munster 0.6 |
| `domh` | **CONFIRM — strongly** | 544.5 vs Connacht 0.2, Munster 0.2 |
| `goidé` | **CONFIRM** | 1,477 of 1,922 corpus hits are Barrscéalta; Connacht 0, Munster 0 |
| `caidé` | **CONFIRM** | Donegal-spoken 525.5 vs Connacht 0.5, Munster 2.4 |
| `cad é mar` | **CONFIRM but MINOR** | only BB 2 / BS 19; the real Donegal form is `goidé/caidé mar` |
| `tchí` | **CONFIRM** | Connacht 0.0, Munster 0.0 |
| `fosta` | **CONFIRM** | Munster 0.2, Connacht 5.8 vs Donegal 642.7 |
| `achan` | **CONFIRM** | Connacht 0.3, Munster 0.0 |
| `amharc` | **CONFIRM** | Connacht 4.7, Munster 1.3 vs Donegal 203.3 |
| **`uilig`** | **DOWNGRADE — not Ulster-exclusive** | **Connacht 252.7** per 10k `agus` — a substantial Connacht presence. FGB: `uilig = uile`, unlabelled. |
| **`ábalta`** | **DOWNGRADE — not Ulster-exclusive** | **Munster 105.8**. FGB gives a plain unlabelled entry. It is ordinary Irish that Donegal uses more. |

So ten of the twelve stand, and **two — `uilig` and `ábalta` — should be downgraded from "forbidden
Ulster marker" to "pan-dialectal, commoner in the north."** A Connemara validator that rejects `uilig`
and `ábalta` outright is rejecting forms that Connacht and Munster speakers respectively use.

Two items the list is **missing** and which are better Donegal markers than either of those:
**`a dhath`** (Munster 0.2, Connacht 6.4, Donegal 454.9) and **`inteacht`** (BB 258 vs `éigin` 3).
**`ar scor ar bith`** (Connacht 0, Munster 0) and **`daofa`** (Connacht 0, Munster 0) are also cleaner
discriminators than `uilig`.

---

## 3. The orthography ruling question

The Connemara course's governing line is *"Orthography = An Caighdeán Oifigiúil. Grammar and lexis =
Connemara"*, with the working test: a **lexical** item that writers spell that way in standard
orthography is IN; a **spelling-only** respelling of a word that has a standard form is OUT.

That split mostly survives the move to Donegal, but it breaks in four specific places. Each needs a human
ruling; I am not ruling on any of them.

**1. `goidé` vs `caidé` — the split gives no answer, because both are standard spellings.**
Both are FGB headwords (`caidé = cad é`, `goidé = cad é`). So the Caighdeán rule cannot choose, and the
two Donegal sources contradict each other outright (BB: caidé 305 / goidé 0; BS: goidé 1477 / caidé 45).
Independent evidence favours `goidé` — Doegen 1928–31 has goidé 47 / caidé 0, and Quiggin 1906
transcribes a g-initial form. **A human must pick one and it must then be applied consistently**, because
this word will appear in a large fraction of 668 seeds (it is "what" *and* half of "how"). My reading of
the evidence, offered as a recommendation and not a finding: **`goidé`**, on three-independent-sources
grounds. *(Note the deeper problem: `cad é` is arguably the "most standard" spelling of all, and it is
what a learner will meet in a dictionary — but it is the minority form in actual Donegal use.)*

**2. `arís` vs `aríst` — the Connemara ruling does NOT transfer.**
Connemara ruled `aríst → arís` as a spelling-only respelling, and teanglann bears that out: there is no
separate FGB entry for `aríst`; the URL redirects to `arís`. But in Donegal broadcast the split is
`arís` 399 / **`aríst` 301** — `aríst` is nearly half of all tokens, whereas Béaloideas Beo writes `arís`
98 and `aríst` 0. So Donegal transcribers actively use a spelling with no dictionary headword. Applying
the Connemara rule mechanically means writing `arís` and overriding roughly 43% of contemporary Donegal
written practice. **Defensible, but it should be a decision, not an accident.**

**3. `cha rabh` vs `cha raibh` — a Donegal spelling with no standard form.**
Doegen's 1928–31 transcripts consistently write **`rabh`** (*"cha rabh sé i bhfad"*, *"cha rabh a fhios
aige"*), and `rabh` has no FGB headword — the standard is `raibh`. Modern Donegal transcription has
mostly moved to `raibh` (BB `cha raibh` 221). **INFERRED:** the Caighdeán rule handles this cleanly —
write `raibh` — and I flag it only because a course author reading Ó Grianna or Doegen will meet `rabh`
constantly and may think it is required.

**4. `madadh` has no FGB headword at all.**
OBSERVED: `https://www.teanglann.ie/en/fgb/madadh` returns **no exact entry**; the dictionary has `madra`.
But in Donegal, `madra` is **0 in both** sources and `madadh` is 4/48 (and 6 in Doegen: *"an madadh
rua"*). So here the Caighdeán rule and the dialect are in direct conflict: the standard spelling names a
word Donegal does not use, and the word Donegal uses has no standard spelling. **This is the clearest
genuine break in the split and needs an explicit ruling.** The same shape of problem may recur for other
concrete nouns I did not test.

**Items where the split works fine and no ruling is needed:** `fosta`, `achan`, `uilig`, `domh`, `daofa`,
`leofa`, `inteacht`, `amharc`, `ábalta`, `a dhath`, `tchí`/`tchíonn`/`tchífidh`, `thig`, `fá`, `cha`,
`chan`, `char` — **every one of these has an FGB headword or cross-reference**, so they are simultaneously
Donegal lexis *and* standard orthography. That is a better outcome than the Connemara course got, and it
means the Donegal course can be more aggressively dialectal without leaving the Caighdeán at all.

**One TTS-adjacent note, flagged as risk and not measurement**, exactly as the Connemara spec flags its
own: `ga-IE-UlsterNeural` / whichever voice is eventually cast will have been trained predominantly on
standard orthography, and `tchíonn`, `goidé`, `daofa` and `domh` are low-frequency strings. Whether they
are pronounced correctly is **untested and I did not test it** — no TTS was generated for this document.

---

## 4. Traps — how an LLM writing Donegal Irish will go wrong

Each with a concrete wrong output and the right form.

**Trap 1 — Overapplying `cha`. The one we feared, and it is as bad as feared.**
An LLM told "Donegal uses cha" will negate everything with it. The data says `ní` is 3.2× commoner than
`cha` in Gaeltacht speech and 9.1× in broadcast.

- ✗ `Cha bhfuil mé go maith.` → ✓ **`Níl mé go maith.`**  (`cha bhfuil` = **4 hits in the entire 100M-word corpus**; `chan fhuil` = **0** in both Donegal sources)
- ✗ `Cha dtig liom sin a dhéanamh.` as the default → ✓ **`Ní thig liom sin a dhéanamh.`** (both exist; `ní thig` is commoner in Gaeltacht speech, 16 vs 6)
- ✗ `Cha raibh mé ann.` as the *only* past negative → ✓ `Ní raibh mé ann.` is **3.2× commoner**

**The rule to give an author:** default to `ní`. Use `cha`/`chan`/`char` as a *flavouring*, deliberately
and sparingly, and never for "is not" — that is `níl`, always. Quiggin's 1906 observation is the best
statement of why:

> *"Hence in one family **cha** predominates as the negative, while another has **ni** almost exclusively"*
> — Quiggin 1906, p. 2, on Meenawannia: a townland of thirty to forty people.

If it varied house by house within one townland, a course cannot make it categorical.

**Trap 2 — Getting `cha`'s mutation wrong when you do use it.**
- ✗ `cha tig`, `cha tiocfadh` → ✓ **`cha dtig`, `cha dtiocfadh`** (eclipsis on d/t)
- ✗ `cha faca` → ✓ **`chan fhaca`** (`chan` before f + vowel — and this is the single commonest `chan` + verb in the data, BB 18)
- ✗ `cha ith sé é` → ✓ **`char ith sé é`** (regular past takes `char`)
- ✗ `cha bhí sé` → ✓ **`cha raibh sé`** (dependent form)

**Trap 3 — Writing `chíonn` instead of `tchíonn`.**
`chíonn` looks like a plausible "Ulster-ish" clipping of `feiceann` and it is in FGB. It is **Munster**
(panel rate 38.4 Munster vs 1.7 Donegal-spoken). ✗ `Chíonn sé an teach.` → ✓ **`Tchíonn sé an teach.`**

**Trap 4 — Inventing a `tch-` past tense.**
The `tch-` stem is present and future only. ✗ `Tchonaic mé é.` → ✓ **`Chonaic mé é.`** (`chonaic` is
101/186 in Donegal; there is no `tch-` past in the data.)

**Trap 5 — Importing Connemara because the sister course did it.**
This is the highest-volume risk, because a translator working from `gle_cn_for_eng` as a translation
memory will inherit its choices wholesale. Every one of these is **0 or near-0 in Donegal Gaeltacht
speech**: ✗ `céard` (0) → ✓ `goidé`/`caidé` · ✗ `cén chaoi` (0) → ✓ `goidé mar` · ✗ `chuile` (6) → ✓
`achan` · ✗ `in ann` (**0**) → ✓ `ábalta`/`thig le` · ✗ `breathnaigh` (1) → ✓ `amharc` · ✗ `tada` (1) →
✓ `a dhath` · ✗ `ceapaim` (**0**) → ✓ `sílim` · ✗ `freisin` (**0**) → ✓ `fosta` · ✗ `eicínt`/`éigin` (3)
→ ✓ `inteacht`.

**Trap 6 — Assuming Donegal is synthetic because it "sounds conservative."**
✗ `Táimid ag dul.` / ✗ `Bhíomar ann.` → ✓ **`Tá muid ag dul.`** / **`Bhí muid ann.`** (`táimid` 0/10,
`bhíomar` 0/4). Donegal patterns *with* Connemara here, against Munster.

**Trap 7 — Over-applying `leofa`.**
Because `leofa` is a striking Donegal form, an LLM will use it for every "with them." But plain `leo` is
**commoner than `leofa` inside Donegal itself** (125 vs 103; 610 vs 301). Use both. Contrast `daofa`,
which genuinely *has* displaced `dóibh` (99 vs 14) — over-applying that one is safe.

**Trap 8 — `damh` for "to me."**
An LLM that has seen "Donegal says damh/domh" will produce `damh`, which mostly means **"ox"** in FGB and
is 2 hits in Donegal speech. ✗ `Thug sé damh é.` → ✓ **`Thug sé domh é.`** (316:3 over `dom`).

**Trap 9 — Forgetting that `achan` mutates the following noun.**
✗ `achan duine`, `achan gasúr` → ✓ **`achan nduine`**, **`achan ghasúr`**, **`achan cheann`** (all three
attested verbatim). A naive template will get every one of these wrong.

**Trap 10 — Building `goidé mar` like `cén chaoi`.**
`cén chaoi` requires `a` + eclipsis (`cén chaoi a bhfuil tú`). `goidé mar` does not. ✗ `Goidé mar a
bhfuil tú?` → ✓ **`Goidé mar tá tú?`** (attested verbatim in Barrscéalta, Doegen and Quiggin).

**Trap 11 — Reaching for `chan` as a general "is not."**
`chan` is not the everyday negator. In the data it appears (a) before f + vowel, and (b) before
**non-verbs**, as a copula-ish negator: `chan é`, `chan amháin`, `chan an`, `chan in`, `chan sin`.
✗ `Chan tá sé anseo.` / ✗ `Chan fhuil mé réidh.` → ✓ `Níl sé anseo.` / ✓ `Níl mé réidh.`
✓ Correct uses: *`chan é amháin`*, *`chan fhaca mé é`*, *`Chan mé is cúis leis`* (FGB).

---

## 5. Gaps — stated plainly

**5a. Where my evidence is thin.**

1. **No modern descriptive grammar of Donegal Irish was read.** Not one. Wagner's *Gaeilge Theilinn*,
   Hamilton's *Tory*, Lucas's *Ros Goill*, Ó Baoill's *Gaeilge Uladh*, Ó Searcaigh, Mac Congáil, Art
   Hughes — I confirmed every title and year via Hickey's bibliography and **obtained the text of none of
   them.** Everything morphological in §2 is corpus-derived plus FGB, with no grammarian's cross-check.
2. **Sommerfelt's *The dialect of Torr, Co. Donegal* (1922) is unchecked, not absent.** Torr is
   **Gweedore** — Gaoth Dobhair, the single most important village for this course — and 1922 is very
   likely public domain. archive.org rate-limited me before I completed the check. **This is the highest-value
   unpursued lead in the entire pass** and should be the first thing the next session does.
3. **Quiggin 1906 is only partly mined, and I want to be precise about why.** I downloaded all 692,233
   characters, but the body of the work is in a phonetic transcription that OCR has mangled. Searching it
   for Irish orthographic forms mostly returns **noise**: the 26 apparent "cha" hits are overwhelmingly
   substrings inside `brochan`, `piochan`, `Miodhchan`. Only 6 are `cha`/`chan` as standalone words. So I
   mined Quiggin's **English prose** (the preface, §§490–494) successfully, and its transcribed corpus
   essentially not at all. The two Quiggin citations in this document are both from prose sections and
   are sound; **no claim here rests on the transcribed material.**
4. **No Rann na Feirste literary prose was read.** Ó Grianna and Mac Grianna are from the exact target
   village and are the obvious literary evidence; `An Druma Mór` is access-restricted on archive.org
   (HTTP 500 on the text) and `Caisleáin Óir` is not there at all. **Zero literary evidence in this document.**
5. **dúchas.ie Donegal is unchecked** — I got a 404 on the path I tried and did not find the right one.
6. **Untested paradigms.** I did not systematically test: the full 1sg present synthetic set beyond
   `sílim`; the conditional and future paradigms; the copula (`is`/`ba`, negative and interrogative
   forms); the verbal noun `ag` vs reduced `a'`; or object + `a` + verbal-noun order. §2.7's claim about
   synthetic 1sg is **INFERRED by analogy with Connemara**, not measured. My brief asked for the copula
   and the verbal noun and **I did not deliver them** — that is a real hole, not an oversight I am
   glossing.
7. **Both main sources have known skews.** Béaloideas Beo is past-tense reminiscence by older speakers
   (which depresses all present-tense counts — see §2.7 and §2.9) and only *part* of the collection is
   transcribed. Barrscéalta includes Six Counties / Cavan / Monaghan material alongside Donegal. Neither
   is a balanced sample of Gaoth Dobhair speech.
8. **No native speaker has reviewed any of this.** Per the standing note that `gle_cn` is agent-ruled
   with no native reviewer, this document inherits exactly the same weakness.

**5b. How the Donegal evidence base compares to the Connemara one — honest answer.**

The Connemara pass had Ó Curnáin's *The Irish of Iorras Aithneach* vols I–IV as free PDFs (~2,700 pages)
plus a 608,947-character base corpus.

**The Donegal base is stronger on attested running speech and weaker on descriptive grammar. It is not
simply thinner.**

*Stronger, and by a clear margin:*

- **1,364,686 tokens of source-identified, searchable Donegal speech** (Béaloideas Beo 249,173 +
  Barrscéalta 1,115,513) — substantially more running text than the Connemara base corpus, and unlike
  that corpus it is *spoken* and *tagged by source*, so it can be queried dialect-against-dialect.
- **A century-deep time series**: Quiggin 1906 → Doegen 1928–31 → Béaloideas Beo 2006–11 → Barrscéalta
  now. Nothing equivalent was available for Connemara. This is what made the `cha` recession in §2.3
  visible at all.
- **98,178 characters of 1928–31 transcript that I actually mined**, versus the Connemara pass's Ó
  Curnáin Vol. IV which it downloaded and then **could not extract text from**.
- Better **method**: source-restricted queries and per-source frequency breakdowns, self-tested against
  known-dialect controls (§1c). The Connemara pass had raw whole-corpus counts and had to argue about
  register skew.

*Weaker, and it matters:*

- **There is no Donegal Ó Curnáin in hand.** Ó Curnáin exists for Connemara as a free 2,700-page
  reference even if that pass could not read it; for Donegal the equivalents are all print-only. Every
  morphological paradigm above rests on corpus counts and a dictionary, with **no grammarian's authority
  behind it.** For phonology, register, and anything low-frequency, I have nothing.
- **No literary prose at all** (§5a item 4), where Connemara had at least identified accessible routes.

**Net:** for the specific job of choosing between competing everyday forms across 668 seeds — which is
what this course actually needs — I judge the Donegal base **as solid as the Connemara one, and on the
high-frequency items in §2.10, more so**, because those choices are backed by direct counts in
target-village speech rather than by inference. For anything requiring a grammarian — full paradigms, the
copula, register — it is **materially weaker**, and §5a items 1, 2 and 6 are the honest boundary of what
this document can support.

---

## 6. Reconciliation with the live `ulster-dialect-spec.md`

**Discovered late, and it changes how this document should be read.** The Ulster course is not "about to"
be built — it is **already in build**, on branches `docs/gle-ul-block-4`, `docs/gle-ul-block-6` and
`docs/gle-ul-ulster-seeds`, against an existing `docs/gle-ul/ulster-dialect-spec.md`.

That spec's §1d says, verbatim:

> *"**This section is PROVISIONAL pending the measured ruling from job #536**, which is counting
> `cha`/`chan`/`char` against `ní`/`níor` in running Donegal text."*

**§2.3 of this document is that measured ruling.** Reconciliation follows. I have not edited the spec or
any build file — those are other agents' work and the rulings below are for a human to apply.

**Where the measurement CONFIRMS the provisional spec:**

- Its mutation rules for `cha`/`chan`/`char` are right, and are now independently confirmed against 386
  sampled Donegal concordance lines rather than taken from FGB and Wikipedia (§2.3).
- Its overapplication trap — that `cha` does not replace `nach`/`nár` in subordinate clauses, relatives
  or negative questions, nor `ná` in imperatives — is **confirmed**: `nach` is 510/2,770 in Donegal
  sources with no `cha`-based competitor (§2.3).
- Analytic `tá muid` / `bhí muid`, never `táimid`: **confirmed** (§2.7), and now with counts.
- Its FORBIDDEN-Connemara list (`céard`, `cén chaoi`, `chuile`, `tada`, `freisin`, `breathnaigh`,
  `in ann`) is **confirmed** — every one is 0 or near-0 in Donegal Gaeltacht speech (§2.10, Trap 5).

**Where the measurement CORRECTS the provisional spec — three items, in priority order:**

1. **Negation frequency (§1d of the spec).** The spec leans toward `cha` as the course-defining default
   ("*`cha` is commonest in the north of the Donegal Gaeltacht — which is where Gaoth Dobhair is*").
   The measurement says **`ní` outnumbers `cha` 3.2:1 in Donegal Gaeltacht speech and 9.1:1 in
   contemporary Donegal broadcast**, and that **`chan fhuil` is 0 in both** while `níl` is 443/2,999.
   With *I'm not* ×13 and *I don't* ×47 in the seed set, this is the highest-volume correction here:
   **"I'm not" must be `níl mé`, not `chan fhuil mé`.** I could not test the spec's north/south
   sub-district claim — my sources are Donegal-wide (§5a).
2. **"Nothing" (spec §1, `dada`).** The spec chooses `dada`. The measurement puts **`a dhath` at 264/527
   against `dada` 37/6** — `a dhath` is the Donegal form by roughly 7:1, and `dada`/`dadaí` is a live
   secondary. Recommend `a dhath` as primary.
3. **`caidé` vs `goidé` (spec §1e).** The spec rules `caidé` uniformly, reasoning that *"`goidé` is the
   older Rann na Feirste literary spelling … `caidé` is the modern Donegal standard-orthography spelling
   and is what Donegal writers and Ulster-dialect journalism use today."* **The measurement contradicts
   the factual premise**: in contemporary Donegal broadcast (Barrscéalta) it is **`goidé` 1,477 vs
   `caidé` 45**, and Doegen 1928–31 is `goidé` 47 / `caidé` 0. `caidé` is the majority form in exactly
   one source, Béaloideas Beo. **However — the spec's *consistency* argument is sound and is the more
   important of the two**, and 668 seeds may already be part-built on `caidé`. This is a human's call
   (§3 item 1); if seeds are already written, the cost of churn plausibly outweighs the evidence margin.

**Untested spec claims**, flagged so nobody reads silence as agreement: that `cha` cannot take the future
tense; that in Gweedore `cha` eclipses all consonants except `b-` in forms of "to be"; and the
`-óch-` 2nd-conjugation future stem. All three are sourced in the spec to Wikipedia. I did not test any
of them, and §2.3 did find one measured counter-example to a categorical mutation rule (`cha mbeadh`,
eclipsis on `b`, ×4), which suggests the Gweedore claim deserves a direct check rather than inheritance.

---

**No citation in this document is invented. Every URL in §1 was fetched by me in this session. Every
quotation marked OBSERVED is verbatim from the source named beside it.**
