# Munster and Donegal Irish: what corpus evidence we actually have

**2026-08-20. Kai asked whether we can find Munster and Donegal content to search, the way
Connemara has Ó Curnáin. This is the measured answer.**

Every number below was counted in Python over the whole file, UTF-8 with `errors=replace`,
NFC-normalised, whole-word regex with Irish accented vowels treated as word characters.
**`grep` classifies these extracted files as binary and returns false zeros** — no count in this
document comes from `grep`, and every file was calibrated on high-frequency function words
before any dialect form was counted in it.

---

## 1. The headline

**Munster can be evidenced. Donegal currently cannot.**

Munster now has two verified, searchable sources totalling ~1.9M characters, and they answer the
synthetic-verb-ending question outright. Donegal has one 1906 monograph whose Irish is in phonetic
transcription — it cannot be counted at all. That asymmetry is real and it is not a matter of
looking harder on this machine; I looked, and there is nothing else here.

---

## 2. What was already on this machine

| Source | Dialect | Size | Searchable? |
|---|---|---|---|
| Ó Curnáin, *The Irish of Iorras Aithneach* (DIAS 2007), vols I–IV | Connemara (Carna) | 7.97M chars | **Yes** — the control |
| Diarmuid Ó Sé, *Gaeilge Chorca Dhuibhne* (ITÉ 2000) | **Munster** (West Kerry) | 1.01M chars | **Yes** |
| Tomás Ó Criomhthain, *An tOileánach* | **Munster** (Blasket) | 893k chars | **Yes**, pre-Caighdeán spelling |
| Quiggin, *A Dialect of Donegal* (1906) | Ulster (Glenties area) | 690k chars | **No** — see §4 |
| Dinneen, *Foclóir Gaedhilge agus Béarla* (1904, 1927) | Munster-leaning dictionary | 2.9M / 5.8M | Lexical only, not running text |

Three further files on disk are junk and should not be mistaken for sources: two are a Teach
Yourself Irish course by Dillon and Ó Cróinín (not *Fiche Blian ag Fás*, which is what they were
named as), and three more are 170-byte nginx error pages saved with a `.txt` extension — the
Peig, *Fiche Blian ag Fás* Irish text, and Ó Cuív *West Muskerry* downloads all failed.

Nothing else Irish exists anywhere on this machine. I swept every large text and PDF outside
`node_modules` and caches.

---

## 3. Calibration — proving a file before counting in it

A real running-Irish text has to be thick with function words. Per file, whole-document counts:

| File | chars | agus | an | sé | bhí | verdict |
|---|---|---|---|---|---|---|
| Ó Curnáin vol IV | 2.12M | 821 | 5,082 | 1,630 | 1,317 | passes |
| An tOileánach | 893k | 3,163 | 4,305 | 797 | 1,585 | passes |
| Ó Sé, *Gaeilge Chorca Dhuibhne* | 1.01M | 1,431 | 4,844 | 1,382 | 353 | passes |
| **Quiggin 1906** | 690k | **21** | 874 | **0** | **0** | **fails** |
| **Dinneen 1904** | 2.93M | **2** | 3,663 | **10** | **0** | **fails** (dictionary) |

Quiggin returning zero for `bhí` and `sé` across 690,000 characters is the whole story: the book
transcribes Donegal speech phonetically, not orthographically. You cannot search it for Irish words.

---

## 4. Quiggin is not a corpus, but it is a witness

Its *English* commentary is usable, and it speaks directly to the `cha` vs `ní` question the
Donegal build cannot currently answer. Two passages, verbatim:

> "Hence in one family **cha** predominates as the negative, while another has **ni** almost
> exclusively."

> "I can only say that in Meenawanuia **cha is generally confined to emphatic answers** … Further
> east round Ballinamore cha seems to be much more frequent."

That is a 1906 field observation from south-west Donegal, not Gaoth Dobhair, and it is a caution
rather than a licence: it says `cha` is *variable by family and by parish*, and in at least one
community largely restricted to emphatic answers. Our Ulster dialect spec currently lists `cha`
without that restriction. This is evidence worth putting in front of whoever rules on it — but it
is one page of English prose from 120 years ago, not a corpus count.

---

## 5. The corpora work — a dialect discriminator run

Counted across all three verified sources, to prove they actually separate the dialects:

| Form | Connemara (Ó Curnáin, 7.97M) | Ó Sé GCD (1.01M) | An tOileánach (893k) |
|---|---|---|---|
| `céard` | **320** | 0 | 0 |
| `conas` | 0 | **43** | 0 |
| `cén chaoi` | **65** | 0 | 0 |
| `muid` | **662** | 4 | 0 |
| `sinn` | 69 | 23 | **98** |
| `cha` / `chan` | 50 / 3 | 0 / 0 | 0 / 0 |

Clean separation. These are real dialect corpora behaving as dialect corpora.

### The Munster question, answered

Synthetic verb endings are **categorical** in Munster, not a preference:

| | Connemara | Ó Sé GCD | An tOileánach |
|---|---|---|---|
| `bhíos` | 20 | **45** | **100** |
| `bhí mé` | **166** | **0** | **0** |
| `táim` | 16 | **8** | **11** |
| `tá mé` | **181** | **0** | **0** |

Across 1.9M characters of Munster text, `bhí mé` and `tá mé` occur **zero times**. The Munster
course should use `bhíos` and `táim` without hedging.

One further finding the build needs. The `do` past-tense preverb is **literary, not live**:
`do bhí` occurs **952** times in *An tOileánach* but only **2** times in Ó Sé's description of the
modern spoken dialect. Ó Sé is the better authority for a course being built for today's learners,
and he says the preverb is gone. By contrast `dhein` (for `rinne`) is alive in both — 34 in Ó Sé,
62 in *An tOileánach*, 0 in Connemara.

---

## 6. Ranked recommendation

### Munster — essentially solved
1. **Ó Sé, *Gaeilge Chorca Dhuibhne* (2000)** — already have it. This is the direct Ó Curnáin
   analogue: a modern description of the living West Kerry dialect. Treat it as the authority when
   it disagrees with the Blasket texts.
2. **An tOileánach** — already have it. Real Corca Dhuibhne narrative, but 1920s literary
   orthography and usage; use it for attestation, not for what learners should say now.
3. Worth adding if free: *Allagar na hInise*, *Fiche Blian ag Fás* in Irish, Peig Sayers, and Ó Cuív's
   *The Irish of West Muskerry*. All four are gap-fills, not gaps — the two questions that mattered
   are already answered.

### Donegal — the real gap, in priority order
1. **Any modern descriptive monograph of Donegal Irish** — the missing Ó Curnáin. Wagner's
   *Gaeilge Theilinn* (1959), Hamilton's *The Irish of Tory Island*, and Ó Baoill's Donegal work are
   the named candidates. Without one of these, Donegal rulings rest on dictionaries and general
   knowledge.
2. **Public-domain Donegal narrative prose.** Micí Mac Gabhann's *Rotha Mór an tSaoil* (Gaoth
   Dobhair) is the strongest lead. Note that Séamus Ó Grianna and Seosamh Mac Grianna — the obvious
   Rann na Feirste authors — are almost certainly still in copyright in the EU.
3. **The Schools' Collection / National Folklore Collection**, filtered by Donegal parish. This is
   transcribed speech filed by townland, so it is dialect-filterable in principle. The catch to test
   is how much of it is in Irish at all, and whether children's school-supervised writing counts as
   vernacular evidence.

Three workers are out on exactly these — **#558** on Donegal texts and monographs, **#559** on the
folklore archives for both dialects, **#563** closing the Munster gap-fills.

---

## 7. The honest line

If none of the Donegal leads lands, **the Donegal course cannot be evidenced to the Connemara
standard**, and that is a product decision rather than a research failure. The Connemara course can
say "we counted it." Munster can now say that too. Donegal, today, cannot — and pretending
otherwise by citing Quiggin would be citing a book in which the word `bhí` appears zero times.
