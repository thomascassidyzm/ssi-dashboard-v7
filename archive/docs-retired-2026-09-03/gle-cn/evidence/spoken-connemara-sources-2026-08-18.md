# Spoken Connemara/Connacht Irish — evidence hunt (2026-08-18)

Evidence-only pass for gle_cn_for_eng core form inventory. No repo files touched except this one. No Supabase writes, no TTS, zero spend.

**Labelling key:** every claim below is marked **OBSERVED** (I saw it in a named source, URL given) or **INFERRED** (my own reasoning, not sourced — flagged explicitly, never presented as evidence). Where I could not find something, that is stated as a **GAP**, not papered over.

---

## Part 1 — Source-by-source findings

### 1. Gaeilge Weekly podcast

**GAP, mostly.** OBSERVED: the podcast exists (produced by Learn Irish Online, ~366 episodes, three difficulty tiers per week — Caighdeán/fluent, Níos Simplí, I Bhfad Níos Simplí), distributed via [Spotify](https://open.spotify.com/show/2jaG6cYslU0a70xvaL1zBE), [Apple Podcasts](https://podcasts.apple.com/ie/podcast/gaeilge-weekly/id1684909283), [Podtail](https://podtail.com/podcast/gaeilge-weekly/), [Podcastlist](https://podcastlist.ie/irish-life/gaeilge-weekly/). Full episode audio and any transcripts sit behind Patreon (patreon.com/LearnIrishOnline) — only episodes 1-3 of any sub-series are free.

Two third-party aggregators *claim* to host transcripts:
- [Rephonic](https://rephonic.com/podcasts/gaeilge-weekly) — search result text says "Rephonic provides full transcripts for episodes of Gaeilge Weekly." I could **not verify this myself** — the page returned HTTP 403 to WebFetch on every attempt.
- [Metacast](https://metacast.app/podcast/gaeilge-weekly/vNSjbN5m) — listed as "Listen or read transcript on Metacast." Also 403'd on every fetch attempt.

Apple Podcasts episode list (fetched successfully) shows only English/mixed episode **titles**, e.g. `#150: Laethantaí Saoire`, `#149: An Lá Mór!`, `Smaointe Sathairn #1/#2` — no body transcript text, no full Irish sentences.

**Verdict: GAP.** I found no Irish-language transcript text I could actually read and quote. Rephonic/Metacast may hold real transcripts behind a wall my fetch tool can't cross (403, likely bot-blocking or requiring a paid/registered session) — that is a live lead someone with browser access or a Rephonic account could chase, not a dead end I'm asserting is empty. I am not fabricating sample text for this source.

### 2. Corpas / concordance search tools

**Found and used live — this is the strongest source in this hunt.**

- **[National Corpus of Irish](https://www.corpas.ie/en/cng/)** (Corpas Náisiúnta na Gaeilge, corpas.ie) — "Contemporary Irish in 100 million words," a balanced corpus of written **and spoken** texts, 2000–2024, run by the Gaois research group (DCU/Fiontar). The UI is a JS single-page app, but it has a documented machine-readable JSON API behind it: `GET https://www.corpas.ie/noskeproxy.json` (a proxy to a Sketch Engine "Bonito" backend), taking Sketch Engine `view`-style params (`command=view&corpname=cng&viewmode=kwic&q=q<CQL> within <doc/>&attrs=...&refs=doc.medium,doc.title,doc.source,...`). I reverse-engineered this from the shipped `sputnik-searchpage.js` component and queried it directly by `curl` — full concordance lines with per-line source metadata (`doc.medium`: `text`|`speech`; `doc.source`; `doc.title`; `doc.url`). All lines quoted in Part 2 below are OBSERVED via this route, verbatim, un-paraphrased.
  - Crucially, the corpus **tags spoken-register documents** (`doc.medium=speech`), several of which are `BBAF.*` — **Bailiúchán Béaloidis Árann** ("Aran Islands Folklore Collection"), published by Mná Fiontracha Árann, hosted at [bba.duchas.ie](https://bba.duchas.ie/ga/bbaf/). These are real transcribed oral interviews (2001-era MiniDisc recordings, e.g. `BBAF.00010` = 45-min interview with Anna Bean de Búrca of Inis Meáin). **Caveat: Aran Islands, not mainland Connemara/Cois Fharraige** — same broad Connacht dialect family, phonologically and morphologically close, but not identical to Cois Fharraige. Don't treat Aran forms as automatically Cois-Fharraige-confirmed.
  - Also present: informal social-media text (`doc.textType`/genre tagged, sourced as "Postáil ar na meáin shóisialta" — social media posts, handles anonymised as `@CUNTAS`), which gives a genuinely informal/colloquial register distinct from the corpus's dominant EU-legislation text (`doc.medium=text`, huge volume of `Rialachán (AE)...` — EU regulations — which is NOT representative of spoken usage and is flagged per-line below).
  - I verified `bba.duchas.ie/ga/bbaf/6100125` directly: full Irish transcript alongside audio, e.g. OBSERVED verbatim: *"Naonúr" agus "Ceathair, ceathair deartháir déarfainn a bhí a'm agus cúigear dreabhar"* (family-size discussion, Anna Bean de Búrca).

- **[Pota Focal](http://www.potafocal.com/)** — a dictionary *portal*, not a corpus. It aggregates the *Beo!* magazine glossary (2001–2014) and other dictionaries, but is not a concordance/KWIC search tool. Its `/beo` glossary is bilingual gloss pairs, not running sentences.

- **[Gaois.ie](https://www.gaois.ie/en) corpora** — the parent research group behind corpas.ie. Also hosts a [Parallel English-Irish Corpus of Legislation](https://www.gaois.ie/en/corpora/parallel) (130M words, EN/GA aligned — legislative register only, not spoken) and a [Corpus of Contemporary Irish](https://www.gaois.ie/en/corpora/monolingual) browse UI (superseded by corpas.ie per Gaois's own docs).

- **Historical corpora found but NOT relevant to spoken-Connemara-now**: [Corpas na Gaeilge 1600–1882](https://www.abebooks.com/9780954385545/) (CD-ROM, historical prose/poetry/religious texts) and [Corpas Stairiúil na Gaeilge](https://corpas.ria.ie/) (19M words, historical manuscripts). Both pre-date modern spoken Connemara Irish by centuries; not usable as spoken-usage evidence for a contemporary course.

### 3. Raidio na Gaeltachta / TG4

**Mostly GAP for machine-readable text.**

- TG4 **does** offer on-screen Irish-language subtitles for *Ros na Rún* (per a [2026 TG4 press release](https://www.tg4.ie/en/information/press/press-releases/2026-2/tg4-expands-accessibility-features-with-irish-and-english-on-screen-subtitles-for-ros-na-run/): Tuesday/Thursday 23:30 repeats + Sunday 20:30 omnibus have Irish subtitles; the [TG4 Player](https://www.tg4.ie/en/player/categories/drama-tv-shows/?series=Ros+na+R%C3%BAn&genre=Drama) has an optional-subtitle catch-up stream). This is a real, current, broadcast/streamed captioning feature — but it is **not** a downloadable/searchable text corpus; it's burned into or overlaid on video streams behind TG4's player. I could not extract any transcript text from it with the tools available in this session. This is a genuine lead (someone could capture/OCR the stream) but I am not asserting I read any of it.
- **Raidió na Gaeltachta**: I could not fetch `rte.ie/radio/rnag/*` show pages at all — every attempt returned **HTTP 403** (Iris Aniar, Ardtráthnóna). RTÉ's site is evidently blocking this fetch tool. GAP — I did not see whether these pages carry transcripts; I simply could not get past the block to check.
- **Nuacht TG4**: not directly investigated beyond the above — time-boxed out of this pass. GAP, not "confirmed absent."

### 4. Ó Siadhail, *Learning Irish*

**Found and directionally confirmed, text itself inaccessible in this session.**

- OBSERVED via [gaeilgechonamara.com/sources-for-connemara-irish](https://gaeilgechonamara.com/sources-for-connemara-irish/) (a resource page purpose-built for exactly this kind of course-design research): *Learning Irish* is described as **"specifically designed to teach Connemara Irish as spoken in Cois Fharraige"** — this is a third-party characterization I'm reporting, not something I verified against the book text itself.
- Full scans exist on Internet Archive: [`learning-irish-3rd-ed`](https://archive.org/details/learning-irish-3rd-ed) and [`learningirish0000mich`](https://archive.org/details/learningirish0000mich) (1980 1st ed.) — both are **access-restricted** ("Access-restricted-item: true", "No suitable files to display"), i.e. controlled-digital-lending, not freely readable by a fetch tool. Also listed as available (paid) via [Yale University Press](https://yalebooks.yale.edu/book/9780300236675/learning-irish/), Scribd, and Sciarium (unverified/unofficial copies — not checked further, unclear legality/reliability).
- **GAP**: I could not open or quote any actual page/chapter/vocabulary content from the book itself in this session — no grammar chapter summaries, no verbatim sentences. Everything above is metadata about the book's existence and reputation, not its content.

### 5. de Bhaldraithe, *Gaeilge Chois Fharraige*, and Connemara dialect monographs

**Found (titles + provenance), NOT digitized-and-open; a related, larger, genuinely open source found instead.**

- de Bhaldraithe's two landmark works — *The Irish of Chois Fhairrge, Co. Galway: A Phonetic Study* (1945) and *Gaeilge Chois Fhairrge: An Deilbhíocht* (1953, morphology) — are **in print, sold by DIAS**, not freely digitized anywhere I found. GAP on open online text.
- **Major find, freely open**: Dr. Brian Ó Curnáin's ***The Irish of Iorras Aithneach, County Galway*** (2007), a 4-volume, ~2,700-page grammar+text description of the Iorras Aithneach (Carna area, deep Connemara) dialect, **all four volumes freely downloadable as PDF** directly from DIAS:
  - [Vol. I](https://www.dias.ie/wp-content/uploads/2010/08/Iorras_Aithneach_Volume_1.pdf) (pp. 1–658): historical phonology, sandhi, nominal morphology
  - [Vol. II](https://www.dias.ie/wp-content/uploads/2010/08/Iorras_Aithneach_Volume_2.pdf) (pp. 659–1344): plural noun morphology, the verb, pronominals
  - [Vol. III](https://www.dias.ie/wp-content/uploads/2010/08/Iorras_Aithneach_Volume_3.pdf) (pp. 1345–2100): prepositions, functors, initial mutations, register, borrowings/language contact, onomastics
  - [Vol. IV](https://www.dias.ie/wp-content/uploads/2010/08/Iorras_Aithneach_Volume_4.pdf) (pp. 2101–2706 + audio CD): **transcriptions of recorded speakers across generations**, vocabulary, bibliography, indexes
  - I downloaded Vol. IV (5.5MB PDF, confirmed HTTP 200) to check it directly for our target phrases. **GAP: could not extract text.** This session's `Read` tool needs `pdftoppm`/poppler-utils to render PDF pages, and no PDF text-extraction library (`pdftotext`, `PyPDF2`, `fitz`) is available in this sandbox — the download succeeded but I could not open it. This is the single most promising un-mined source from this whole hunt and deserves a follow-up pass from an environment that can read PDFs.
  - Two more open-question leads from the same [gaeilgechonamara.com sources page](https://gaeilgechonamara.com/sources-for-connemara-irish/), not independently verified further: *Airneán: Ein Sammlung von Texten aus Carna, Co. na Gaillimhe* (Hartmann/de Bhaldraithe/Ó hUiginn, transcribed Carna texts) and Séamas Ó Murchú's *An Teanga Bheo: Gaeilge Chonamara* (1998, written entirely in Irish).

### 6. Connemara/Connacht frequency list or spoken corpus

- **Caint Chonamara corpus** (OBSERVED via the same gaeilgechonamara.com page): compiled by Dr. Arndt Wigger and Dr. Hans Hartmann — "90 hours of audio material" plus "10 PDFs of 400+ pages of transcriptions." Hosted at [sksk.de](https://www.sksk.de/index.php/de/veroeffentlichungen-2/materialien/33-caint-chonamara), **cost €32.00** — not free, not fetched/verified beyond the listing. This is real, named, substantial, and exactly on-target, but behind a paywall I didn't cross (out of scope: zero-spend rule).
- **Doegen Recordings** (1929–1931), [doegen.ie](https://doegen.ie/taxonomy/term/21520) Co. Galway index: browsable catalogue of archival audio, Galway-area speakers represented (titles like *"Ag dul chun na cúirte i nDoire"*, *"An bhean a chaoin"*, *"An fathach"*). Catalogue metadata only — **no transcript text**, audio-only per speaker, and 1929-vintage (pre-dates modern usage by ~a century — treat as historical-dialect evidence, not current spoken norms).
- The **National Corpus of Irish itself (Part 1 above)** is, in practice, the best available searchable spoken-plus-informal-register Irish corpus I could actually query — see Part 2 for concordance-driven frequency signal (e.g. `eicint` vs `éigin` counts).
- No dedicated *frequency list* (ranked word-frequency table) specific to Connacht/Connemara was found. GAP.

---

## Part 2 — Attested usage of the target strings

All lines below are **OBSERVED**, queried live against `corpas.ie` (National Corpus of Irish, corpus code `cng`) via its JSON API on 2026-08-18, and quoted verbatim (surface word forms only, punctuation `<`/`>` mark sentence/tag boundaries as the API emits them). `[text]` = written register (the corpus's `text` medium — dominated by EU legislation unless noted otherwise); `[speech]` = the corpus's tagged spoken-transcript register. Source is `doc.title`/`doc.source` as returned by the API.

### `ag iarracht` — is it even grammatical? (iarracht is a noun)

**concsize (raw hits, broad/lemma search, no gap): 111.** Genuinely mixed — many are inflected forms of the noun *iarracht(aí)* co-occurring with `ag` by coincidence of word order (`ag iarracht sin a dhéanamh` etc.), not the bare idiom. But there ARE literal bare-form hits:

> *"Theip uirthi agus í i measc dream a bhí **ag iarracht** Bundlíthe Iosrael a dhaingniú..."* — (biographical text, Tzipi Livni)

> *"...tá rún **agam iarracht** a dhéanamh gan aon nod a mhillfeadh an phlota..."* — (source: None/untagged)

> *"...a bhí mé chun mo chnámha a shíneadh ná dul **ag iarracht** ar sheanchaí go Cnoc Aoibhinn."* — **Béaloideas 68** (folklore journal)

> *"...d'fhág mé an baile ag dul **ag iarracht** ar sean-Jack Clair, an fiannaí a chónaíonn thíos gairid..."* — **Béaloideas 68**

**INFERRED, flagged as my own reasoning, not sourced**: the two *Béaloideas* hits read like the older idiom *ag iarraidh ar (dhuine)* — "going to visit/call on (someone)" — possibly a dialectal/orthographic variant or an OCR/transcription artefact of *iarraidh*, not "trying" in the "ag déanamh iarrachta" sense. I cannot confirm this reading from the source alone; a native reviewer should judge whether these are genuine `ag iarracht` (bare-noun-as-progressive) tokens or something else. **Not confirmed as the "trying" idiom you're testing for.**

### `ag déanamh iarracht` / `iarracht a dhéanamh`

**Both well attested, standard-register construction, and present in informal registers too.**

`ag déanamh iarracht(a)` — concsize 102:
> *"...gael a bheas **ag déanamh iarracht** fanacht glan ó chéile..."* — Postáil ar na meáin shóisialta (social media)
> *"Bímid i gcónaí **ag déanamh iarrachta** an pobal a thabairt le chéile..."* — Fáilte isteach

`iarracht a dhéanamh` — concsize 3275, heavily EU-legislation register (`Féachfaidh na Ballstáit le hiarracht a dhéanamh teacht ar chomhaontú...`) — attested but this volume is not spoken-register evidence, it's formal/legal.

### `ag triail` / `bain triail as`

**Attested, and specifically in informal social-media register — good colloquial signal.**

`ag triail` (concsize 428), almost entirely social-media posts:
> *"...mise oíche na sean bhliana **ag triail** daoine a iompar..."*
> *"...bhí an boc **ag triail** go leor roghanna mar go bhfuil neart dathanna sa phictiúr..."*
> *"B'aoibhinn le Sorcha a bheidh **ag triail** rudaí nua leis na comhábhair..."* — Cás staidéar Nascmhodúl (case-study teaching text)

`bain triail as` (concsize 1337, includes inflected forms `bhain...triail as`, `mbainfí triail as`):
> *"**Bain trial as** an churro más Maith Leat seaclaid!"* — social media
> *"Ba dheas dá **mbainfí triail as** seo ar Árainn Mhór agus Toraigh fosta"* — social media
> *"**Bain triail as**!"* (imperative, standalone) — social media, multiple hits

Note the social-media spelling `trial` for `triail` recurs — colloquial/non-standard orthography, consistent with informal spoken-register spelling-as-you-say-it.

### `ag féachaint le` / `ag breathnú le` (as "trying to")

`ag féachaint le` — concsize 95, **overwhelmingly EU-legislation register**, meaning "aiming/looking to (do X)":
> *"...uaillmhianacha ag rialtas na Síne dá thionscal cruach agus é **ag féachaint le** fáil réidh le gléasraí atá imithe i léig..."*
> *"...tá UNODA **ag féachaint le** tacú i gcónaí le cur chun feidhme UNSCR 1540..."*

This is genuinely attested as "aiming to/trying to," but **only in formal/legislative register** in this corpus — I found no informal/spoken-register hit for this exact idiom.

`ag breathnú le` — concsize 25, **does NOT attest as "trying to."** Every hit found is literal "looking at (something) with (some quality)":
> *"Bhí sé **ag breathnú orm le** feiceáil an raibh mé le trust."*
> *"...na vírióin **ag breathnú cosúil le** maidí..."* ("the virions look similar to sticks")
> *"...oidhre duine atá **ag breathnú an-chosúil lena** athair..."* — explicitly tagged as a *Gaeilge na Mumhan* (Munster Irish) dialect-description text.

**Finding: `ag breathnú le` ≠ "trying to" in this corpus. Do not use it for that meaning.**

### `ag iarraidh` meaning TRY vs WANT

**Both senses attested, concsize 9773 (very common).** Sample showing TRY-sense:
> *"Sealbhóir údaraithe a bheidh **ag iarraidh** aon fhaisnéis a athrú..."* ("an authorization-holder trying/wanting to change information") — ambiguous between TRY and WANT, which is exactly the point: this is a genuinely dual-purpose idiom in the corpus, not cleanly split.
> *"...Ballstát a bheidh **ag iarraidh** maolú den sórt sin a fháil..."* ("a Member State seeking/trying to obtain such a derogation")

WANT-leaning sample (from `tá mé ag iarraidh`, concsize 295):
> *"...tá mé ag iarraidh Gaeilge Thír Chonaill a úsáid."* (source: 'Níor cheart duit labhairt mar sin' — an opinion piece) — "I want to use Tír Chonaill Irish" (intention/preference)
> *"Tá mé ag iarraidh, is dóigh liom, a chinntiú go mbíonn fócas..."* (source: Fócas ar an mheon dheonach)

**Finding: `ag iarraidh` genuinely spans both TRY and WANT in this corpus — context, not the verb form, disambiguates. No clean lexical split found.**

### `ba mhaith liom` vs `tá mé ag iarraidh`

`ba mhaith liom` — concsize 7080, and critically **this is the one target phrase with directly-attested `[speech]` hits** (not just social-media informal text):
> *[speech]* *"...tá leabhar scríte aige, agus tá cóip agam agus **ba mhaith liom** anois go síneodh sé é."* (source untagged, but tagged medium=speech)
> *[speech]* *"...'Ach **ba mhaith liom** cóip a bheith agam féin.' Agus ar sé..."*
> social-media: *"**Ba mhaith liom** dul go Madagascar!"*, *"**Ba mhaith liom** ceann acu! Nó madadh mór liath..."*

`tá mé ag iarraidh` — concsize 295, no `[speech]`-tagged hits found in the sample pulled; social-media and prose only:
> *"...tá mé ag iarraidh Gaeilge Thír Chonaill a úsáid."*
> *"Tá mé ag iarraidh ar an Aire na sonraí sin a fhoilsiú go luath..."*

**Finding: `ba mhaith liom` has directly-attested oral/transcribed-speech usage in this corpus; `tá mé ag iarraidh` (in this sample) does not — it appears in written/informal-written registers, not in the tagged spoken-transcript documents I pulled.** This should not be over-read as "ba mhaith liom is more spoken" in general — it may just reflect what's in the corpus's speech subset — but it is what the data shows.

### `cén chaoi a bhfuil tú`

**Strongly and directly attested, including EXPLICIT dialect-labelling as Connacht.** Concsize 623.

> *[text, dialect-comparison]* *"Is é **cén chaoi a bhfuil tú**? an leagan Connachtach, agus is é an clásal..."* — source: **Gaeilge na Mumhan** (a text explicitly comparing Munster vs. Connacht forms) — this is a named source **directly stating "cén chaoi a bhfuil tú?" is the Connacht form**.

> *[speech]* *"...Bhuel a Phádraic, **cén chaoi a bhfuil tú**? Sea, (gáire). Tá mé a'..."* — source **BBAF.00012** (Bailiúchán Béaloidis Árann / Aran)
> *[speech]* *"Dia is Muire duit Áine. **Cén chaoi a bhfuil tú** inniu? Tá mé go maith buíochas le Dia."* — **BBAF.00017**
> *[speech]* *"...tá tú ag breathnú thar cionn, **cén chaoi a bhfuil tú**? Ó tá mé go maith go raibh maith a'd"* — **BBAF.00020**
> *[speech]* *"**Cén chaoi a bhfuil tú** a Phete? Tá mé go maith, go raibh..."* — **BBAF.00034**

**Finding: `cén chaoi a bhfuil tú` is the single best-attested item in this entire hunt** — both explicitly labelled as the Connacht form by an independent dialect-comparison source, AND repeatedly attested in real transcribed oral speech (Aran Islands). Strong evidence for the core inventory.

### `eicint` vs `éigin`

**Attested with a striking register split — this is the clearest quantitative signal in the whole hunt.**

`eicint` — concsize 429, and the sample is dominated by `[speech]` BBAF (Aran) hits:
> *[speech]* *"...coicís déarfainn a chaith sé sa mbaile nó rud **eicint**, d'imigh sé ansin aríst..."* — **BBAF.00010**
> *[speech]* *"...rud mar sin i saucepan nó muigín nó in áit **eicint** 's chuireadh sí síos orthub é."* — **BBAF.00010**
> *[speech]* *"Ar ndóigh chaithfí a bheith a' plé le rud **eicint** ag an am mar bhí an saol go dona"* — **BBAF.00054**
> *[speech]* *"rud eicínt beag timpeall le punt deich scilleacha nó rud **eicint** mar sin..."* — **BBAF.00076** (note also the variant spelling `eicínt` in the same line — both forms co-occur)
> a couple of `[text]` hits also occur, e.g. in a bilingual-education-research paper quoting a child's classroom speech directly.

`éigin` — concsize **56,390** (130× more raw hits than `eicint`), but the sample is **almost entirely `[text]` EU-legislation register**:
> *"...tabhair rud **éigin** le hól, má tá an duine arna nochtadh..."* (safety-data-sheet boilerplate, repeated near-verbatim across dozens of EU chemical regulations)

**Finding: `eicint` is a real, live, spoken/dialectal form directly attested in Aran oral transcripts (and worth checking against Cois Fharraige specifically — Aran ≠ Cois Fharraige, see caveat in Part 1); `éigin` dominates by raw count only because the corpus itself is dominated by EU legislative text, not because it's more "standard-vs-spoken" in a clean sense. The register skew (not just the word) explains most of the count gap — don't read the 130:1 ratio as "eicint is rare," read it as "the corpus is mostly legislation."**

---

## Summary table

| Item | Source found? | Machine-readable/searchable? | Verbatim sample obtained? |
|---|---|---|---|
| Gaeilge Weekly | Yes (podcast exists) | **No** — transcripts claimed by 3rd parties (Rephonic, Metacast), both 403'd | **No — GAP** |
| National Corpus of Irish (corpas.ie) | Yes | **Yes — live KWIC API, used directly** | **Yes, extensively (Part 2)** |
| Pota Focal | Yes | Dictionary/glossary only, not a corpus | Gloss pairs only |
| RnaG show pages | Attempted | **No — 403 blocked** | **No — GAP** |
| TG4 / Ros na Rún | Yes (subtitle feature exists) | **No** — burned into video stream, not a text corpus | **No — GAP** |
| Ó Siadhail, *Learning Irish* | Yes (book + IA scans) | **No — access-restricted on Internet Archive** | **No — GAP**, only 3rd-party description quoted |
| de Bhaldraithe monographs | Yes (titles) | **No — print only, sold by DIAS** | **No — GAP** |
| Ó Curnáin, *Iorras Aithneach* (4 vols) | **Yes — freely downloadable PDFs** | PDF downloaded (Vol. IV, 5.5MB) but **could not extract text in this sandbox** (no poppler-utils/pdftotext/PyPDF2/fitz) | **No — GAP, but the single best unmined lead from this hunt** |
| Caint Chonamara corpus | Yes (named, described) | Unknown — **€32 paywall, not crossed (zero-spend rule)** | No |
| Doegen Recordings (1929-31) | Yes | Catalogue/audio only, no transcript text | Titles only, no running text |
| BBAF (Bailiúchán Béaloidis Árann) | Found *through* the corpas.ie corpus, then verified directly at bba.duchas.ie | **Yes — full transcript + audio per interview** | **Yes** |

---

## Honest overall gaps (explicit, not papered over)

1. **Gaeilge Weekly**: no transcript text obtained. Two paid/gated aggregators claim to have it; both blocked this session's fetch tool (403). Unresolved — needs either a browser-based session, a Rephonic/Metacast account, or direct Patreon access to actually confirm.
2. **RTÉ Raidió na Gaeltachta**: entirely blocked (403 on every rte.ie/radio/rnag page tried). I do not know whether transcripts exist there — I could not check.
3. **TG4/Ros na Rún subtitles**: confirmed to exist as a broadcast/streaming feature, but not as extractable text in this session.
4. **Ó Siadhail *Learning Irish***: confirmed to exist and (per a third party, not verified against the book) to specifically target Cois Fharraige Connemara Irish — but I never got to read a single page of it.
5. **Ó Curnáin's *Iorras Aithneach* Vol. IV** (the transcribed-speech volume, freely downloaded, 5.5MB): this is the biggest concrete opportunity this hunt surfaced and I could not mine it — this sandbox has no PDF text-extraction tooling (`pdftotext`/`poppler-utils`/`PyPDF2`/`fitz` all absent). **Recommend a dedicated follow-up pass from an environment that can read PDFs; this single source likely outweighs everything else found today for actual mainland-Connemara spoken evidence.**
6. **de Bhaldraithe's *Gaeilge Chois Fharraige*** (the single most dialect-precise named target in the brief): not digitized anywhere I found; print-only via DIAS.
7. No dedicated Connacht/Connemara **frequency list** was found.
8. Everything sourced through corpas.ie is filtered by what that corpus happens to contain — it is dominated by EU legislative text, with smaller pockets of social media and BBAF (Aran) speech. Register conclusions above (e.g. the `eicint`/`éigin` count gap) are qualified accordingly in Part 2 and should not be over-generalized past what's shown.
9. BBAF sources are **Aran Islands**, not mainland Connemara/Cois Fharraige — geographically and dialectally close but not identical to the course's specific target. Treat as strong circumstantial evidence for the wider Connacht dialect family, not as Cois-Fharraige-specific confirmation.
