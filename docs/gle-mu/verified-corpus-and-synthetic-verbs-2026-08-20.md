# Munster (Corca Dhuibhne / West Kerry) corpus: acquisition status, calibration, and synthetic-verb findings

2026-08-20. Kai, via munster-corpus-fill workspace.

## 1. What is actually usable

Only the two sources already flagged as verified before this session are usable. I re-ran the calibration probe independently (Python, utf-8 `errors=replace`, NFC-normalized, whole-word regex including fada vowels — grep classifies these files as binary and returns false zeros) and got numbers that match the prior baselines exactly, which is itself a check that the probe methodology is sound:

| source | chars | agus | an | na | ar | le | sé | bhí | nach |
|---|---|---|---|---|---|---|---|---|---|
| Diarmuid Ó Sé, *Gaeilge Chorca Dhuibhne* (2000) — `ose-gcd.txt` | 1,005,759 | 1,431 | 4,845 | 2,673 | 1,789 | 752 | 1,382 | 353 | 220 |
| Tomás Ó Criomhthain, *An tOileánach* (Blasket) — `oileanach.txt` | 893,276 | 3,163 | 4,305 | 1,127 | 1,843 | 618 | 797 | 1,585 | 89 |

Both pass. Both were copied into `~/.gle-mu-corpus/` (not committed to this repo — large corpus text stays out of git per the brief).

**These are the only two Munster sources in this build with a text file behind them.** Everything else pursued this session is a genuine gap, not a substitution.

## 2. What was chased and why it did not land

I checked archive.org's actual file-level metadata (not just the details page, which shows a "Free Download" button even for controlled-lending items) — the `_djvu.txt` and other extracted-text derivatives carry a `private:true` flag when the item is lending-only, regardless of what the page chrome implies.

| work | author | status checked | result |
|---|---|---|---|
| Peig (Peig Sayers) | d. 1958, in copyright to ~2029 | archive.org `peig0000saye` and `peigautobiograph0000saye` | `_djvu.txt` is `private:true` on both — controlled digital lending only, no free full text. Confirms the 500-byte HTML error already on disk was a dead end, not a fixable one. **In copyright, correctly unobtainable.** |
| Fiche Blian ag Fás (Irish original, Muiris Ó Súilleabháin) | d. 1950, PD in EU since 2020 | archive.org `ficheblianagfas0000muir` | Item exists, OCR language detected as Irish (`ga`), but every text-bearing file (`_djvu.txt`, `.epub`, `.pdf`) is `private:true`. Archive.org treats it as still lending-only, most likely under US copyright term (works published 1933 are not automatically PD in the US the way they are in the EU). **Not freely obtainable despite EU public-domain status** — a genuine gap, not a copyright violation to route around. |
| Allagar na hInise (Tomás Ó Criomhthain) | d. 1937, PD in EU since 2008 | Wikisource author page, archive.org search, HathiTrust | Wikisource's own author page lists it as a **redlink** (`action=edit&redlink=1`) — nobody has transcribed it there, only *An tOileánach* exists. Zero hits on archive.org's search index. HathiTrust returned 403 to direct queries. **Not digitized anywhere I could reach**, despite being public domain. |
| Brian Ó Cuív, *The Irish of West Muskerry* | d. 1999, in copyright to 2069 | search only | Confirmed in print/reprint via publishers and library catalogues (NLI, Google Books listing). The 401 already on disk is consistent with this — it's a paywalled/licensed scan, not a broken free link. A shadow-library PDF turned up in search (dokumen.pub) but I did not touch it — out of scope per the brief's "no paywall bypassing, no logins," and dokumen.pub is not a legitimate source regardless of what the file behind it looks like. **In copyright, correctly unobtainable.** |
| Machtnamh Seanamhná (Peig Sayers) | same author/estate as Peig | search only | No digitization found anywhere. **In copyright (to ~2029), unobtainable.** |
| Séamus Ó Duilearga's Kerry folklore texts (*Leabhar Sheáin Í Chonaill*, *Seanchas ón Oileán Tiar*) | Ó Duilearga d. 1980; informant deaths vary | search only | No free digitization found. These are also geographically South Kerry (Iveragh) rather than Corca Dhuibhne proper for *Leabhar Sheáin Í Chonaill*. **Not obtained.** |
| Béaloideas (Folklore of Ireland Society journal, Ó Duilearga editor) | mixed dates | archive.org search | No volumes found on archive.org; typically accessed via JSTOR, which is paywalled. **Not obtained.** |

I did not find any other Corca Dhuibhne or wider Munster dialect monograph or narrative-prose source that is legitimately free and not already on disk.

## 3. The synthetic-verb question

This is the part the Munster build cannot currently answer, run across the two verified sources. Method: Python, whole-word regex on NFC-normalized text; suffix probes (`-amar`, `-adar`, `-aid`, `-fad`, `-fam`) were run raw first, then I pulled the distinct matched word list per suffix and hand-filtered obvious non-verb noise (Munster orthography means `fad` alone is the adverb "long/far", not a verb ending; `-aid` catches `Diarmaid`, `paid`, `faid` far more than any verb; `-amar`/`-adar` are cleaner). Raw and filtered counts are both given so the noise is visible rather than silently dropped.

### 3a. 1sg/1pl/3pl synthetic forms — whole word, unambiguous

| form | ose-gcd (Ó Sé, living description) | oileanach (Blasket, 1929 literary) |
|---|---|---|
| bhíos (was-1sg) | 45 | 100 |
| bhís (were-2sg) | 13 | 1 |
| táim (am-1sg) | 8 | 11 |
| táid (are-3pl) | 9 | 9 |
| chím (see-1sg pres) | 1 | 0 |
| deirim (say-1sg pres) | 1 | 2 |
| chonac (saw-1sg synth) | 6 | 0 |
| bead (will-be-1sg synth) | 2 | 6 |
| raghad (will-go-1sg synth) | 1 | 4 |

### 3b. Analytic equivalents — whole word / two-word phrase

| form | ose-gcd | oileanach |
|---|---|---|
| bhí mé | **0** | **0** |
| tá mé | **0** | **0** |
| bhí muid | **0** | **0** |
| bhí siad | **0** | **0** |
| chonaic mé | **0** | **0** |
| dúirt mé | **0** | **0** |

**This is the headline finding: in both sources, the analytic "verb + mé/muid/siad" pattern for these persons does not occur at all.** Every 1sg/1pl instance of "to be", "to see" and "to say" that I could find is synthetic. This is not a soft preference — across ~1.9M combined characters there is not one countable instance of the standard-Irish analytic pattern for these persons. That is as strong a "live, obligatory, not optional" signal as a corpus count can give.

### 3c. 3pl past synthetic (`-adar`), filtered

Raw suffix hits: ose-gcd 243 (83 distinct word-forms), oileanach 208 (54 distinct). After removing non-verb noise (`fheadar` is the idiom "ní fheadar" = "I don't know" and is arguably not a true 3pl form; a handful of OCR-garbled tokens like `xahadar` in ose-gcd), the clearly verbal core:

- **ose-gcd**: rabhadar(6), chuadar(6), dheineadar(6), thánadar(5), fuaireadar(5), chaitheadar(4), itheadar(3), chonaiceadar(3), plus a long tail of singletons — genuine synthetic 3pl past is present but low-frequency relative to oileanach, consistent with Ó Sé's text being a *description* of the dialect (fewer narrative past-tense passages) rather than a first-person narrative.
- **oileanach**: rabhadar(23), chuireadar(21), dheineadar(18), thugadar(10), chonnacadar(8), chuadar(8), cheapadar(7), thánadar(6), bhaineadar(6), fuaireadar(5), shroicheadar(5), stadadar(4), bhuaileadar(4) — much higher raw frequency, expected for a narrative memoir with continuous past-tense storytelling.

3pl synthetic past is attested as productive in both — this form is not in dispute in either register.

### 3d. `-fad` (1sg future synthetic), filtered

Raw: ose-gcd 156 hits but only 13 distinct types, and the single word `fad`/`bhfad` (the adverb "far/long", e.g. "i bhfad") accounts for 143 of those 156 — noise, not verbs. The real verb forms: `béarfad`(2), `íosfad`(2), `déanfad`(1), `déarfad`(1), `tabharfad`(1), `marcálfad`(1). oileanach: `fad`/`bhfad` account for 93 of 110; real verbs: `tabharfad`(5), `déanfad`(2), `fanfad`(1), `coimeádfad`(1), `déarfad`(1), `tógfad`(1), `bhéarfad`(1). Low absolute counts in both, but that tracks — 1sg future is inherently rare in narrative/descriptive prose regardless of dialect; what matters is these are the only forms attested, no analytic "beidh mé ag + verbal noun" future-substitute for these verbs turned up in the same searches.

### 3e. `do-` preverb on the past tense

| form | ose-gcd | oileanach |
|---|---|---|
| do bhí | 2 | **972** |
| do dhein / do rinne | 1 | 59 |
| do chonaic | 1 | 0 |

**This is the second clear finding and answers the brief's question directly.** The `do-` preverb is almost entirely absent from Ó Sé's linguistic description of the living dialect (2 tokens of "do bhí" in a million characters — noise-level) but occurs 972 times in *An tOileánach* alone. *An tOileánach* was composed/edited in the late 1920s and its editor (An Seabhac) worked within an older literary convention that prefixed `do` onto past-tense verbs — this is well known in Blasket-literature scholarship as an orthographic/literary habit rather than a transcription of speech. The corpus evidence here is unambiguous: **`do-` + past tense is a feature of the 1929 literary text, not of Ó Sé's description of modern spoken Corca Dhuibhne.** A course built for learners today should not teach `do bhí`/`do dhein` as the living form — the bare `bhí`/`dhein` is what Ó Sé documents as current usage, and it's what learners would actually hear.

### 3f. conas / cén chaoi / caidé, sinn / muid

| form | ose-gcd | oileanach |
|---|---|---|
| conas | 43 | 0 |
| cén chaoi | 0 | 0 |
| caidé | 0 | 0 |
| sinn | 23 | 98 |
| muid | 4 | 0 |

`conas` is Ó Sé's documented living form for "how" — the Connacht/Ulster `cén chaoi` / `caidé` variants do not appear at all in either source. (`conas`=0 in oileanach is not evidence against it — *An tOileánach* is first-person narrative prose with very little direct question-dialogue, so the absence is a register gap, not a dialect fact; don't read it as "oileanach avoids conas".) `sinn` dominates over `muid` in both, more heavily in the literary text (98:0) than in Ó Sé's description (23:4) — `sinn` is the attested "we" pronoun for Corca Dhuibhne, `muid` reads as the minority/newer form even in the living-dialect source.

## 4. What this means for the course build

- **Teach `bhíos`/`táim`-type synthetic 1sg forms as the default, not the analytic `bhí mé`/`tá mé`.** The corpus gives zero counter-evidence for the analytic pattern in these persons.
- **Teach `sinn` over `muid`** as the primary Corca Dhuibhne "we" pronoun, on Ó Sé's authority (the living-dialect source), even though `muid` is attested at low frequency there too.
- **Do not teach `do bhí`/`do dhein`.** That's a literary-editorial habit of the 1929 Blasket edition, not living speech per the source that is actually describing modern spoken Corca Dhuibhne.
- **Teach `conas` for "how"**, not `cén chaoi`/`caidé` — neither Connacht/Ulster variant is attested at all.
- 3pl synthetic past (`-adar` forms: rabhadar, chuadar, dheineadar, etc.) is safe to teach as productive and current — it's well attested in both registers.
- 1sg future synthetic (`-fad`) is real but rare in the data; treat it as attested-but-low-frequency rather than a headline pattern — I would not overweight it in course design on this evidence alone.

## 5. Honesty gaps

- The corpus this analysis rests on is two sources, ~1.9M characters combined. It answers the specific questions asked with reasonable confidence because the counts are one-sided (0 vs non-zero), but a Munster course built on two sources — one a linguistic grammar, one an 87-year-old literary memoir — has no genuinely contemporary spoken-register source in it. Everything else chased this session (Peig, Allagar na hInise, Fiche Blian ag Fás, West Muskerry, Machtnamh Seanamhná, Ó Duilearga's folklore collections, Béaloideas) came back as either in-copyright or simply not digitized anywhere I could reach. That's the honest state of the corpus, not a research failure to paper over.
- Suffix-probe raw counts (`-aid`, `-fad` especially) are noisy and I hand-filtered them by inspecting distinct matched word-forms; I did not build a POS tagger, so a handful of genuine verb forms buried in low-frequency tails may not have made it into the "clearly verbal" subtotals in §3c/3d. The raw counts are reported alongside the filtered ones so that gap is visible rather than hidden.
- I did not attempt OCR of any physical/scanned source myself — every acquisition attempt here was via existing digitizations (archive.org, Wikisource, HathiTrust). If a work exists only as an unscanned physical book, that is out of reach for this workspace regardless of copyright status.
