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

## 7. UPDATE — Donegal *can* be evidenced. The folklore archive works.

Written after §1–6. **§1's headline is now wrong and I am leaving it visible rather than quietly
editing it**, because the route that closed the gap is not the one anyone expected.

Two further sources were tested and both **failed**, for two *different* reasons — worth recording
so nobody retries them:

- **Ó Muirgheasa, *Seanfhocla Uladh* (1907)** — real Ulster, public domain, 573k chars. Calibration:
  `agus`=**1**, `bhí`=**0**, `tá`=7. It is printed in **cló Gaelach** and the OCR destroyed the Irish
  while reading the English fine — 54% of lines are mangled. What the file holds as
  `"ni fé^x)^\^ An fCAtif^ocAt -oo fAi^ujA-o"` is really *"ní féidir an seanfhocal do shárughadh"*.
  I checked whether the mangling is a reversible substitution cipher. **It is not** — the OCR is
  lossy and inconsistent, so a find-and-replace recovery would silently corrupt the text.
- This is the structural reason Munster came easy and Ulster did not: *An tOileánach* and Ó Sé exist
  in **Roman-type** editions. The out-of-copyright Ulster books of the same vintage are in Gaelic
  type. Scarcity was never the problem; **typography** was.

### What actually worked: dúchas.ie, filtered by Gaeltacht parish

The Schools' Collection exposes a working API with **per-school Gaeltacht flags and per-story
language tags**. Harvested for the Donegal Gaeltacht: **11 chapters, 220,399 characters**, from
**Rann na Feirste, Doire Beaga (Gaoth Dobhair), Gort a' Choirce, Lunniagh, Meenaclady and
Knockastoller** — precisely the parishes named in our Ulster dialect spec.

**It passes calibration comfortably** — proportionally denser running Irish than *An tOileánach*:

| | chars | agus | an | sé | bhí |
|---|---|---|---|---|---|
| Donegal Gaeltacht slice | 220k | **1,772** | 2,386 | **1,223** | **884** |

**The dialect filter demonstrably works.** Non-Gaeltacht control schools returned **5 Irish stories
out of 450**; Donegal Gaeltacht schools returned **2,441 Irish stories out of 2,815**, and Kerry
Gaeltacht **2,458 out of 2,533**. The Gaeltacht flag is a real dialect discriminator, not a guess.

### The Ulster lexicon is confirmed live, from real Donegal speech

`caidé` 67 · `goidé` 27 · `amharc` 42 · `uilig` 39 · `achan` 22 · `ábalta` 22 · `fosta` 16 ·
`domh` 6 · `muid` 11 vs `sinn` 1. Every required form in our Ulster spec is now attested in actual
Gaoth Dobhair / Rann na Feirste narrative rather than in a dictionary.

### `cha` vs `ní` — the question, answered

**Counted: `cha`/`chan`/`char` = 16. `ní`/`níl`/`níor` = 381.** So `cha` is roughly **4%** of
negation — a real, live minority form, not the default.

But the *contexts* refute Quiggin's "emphatic answers only" for this area. These are ordinary
declarative negations in running narrative:

> "cha dtig leis an chearc bhán ubh dubh a rugaint" · "cha rabh fhios aige caidé d'éirigh de" ·
> "Chan duine saoghalta mé" · "Cha dtig liom maise"

**Ruling this supports:** `cha` is genuine Donegal and belongs in the course, but as a marked
minority negator. A course that made `cha` the default negator would misrepresent Gaoth Dobhair
speech by roughly an order of magnitude. Quiggin's 1906 restriction does not hold here — but he was
describing Glenties, a different part of Donegal, and he said himself it varied by parish.

### Caveats, stated plainly

- This is **1930s schoolchildren transcribing adult storytellers**. It is vernacular narrative, but
  filtered through a child's hand and a teacher's supervision. It is weaker than a linguist's
  description and stronger than a dictionary.
- **Pre-Caighdeán orthography throughout** — `rabh`, `connaic`, `-uigh`, `bhfághail`. Any probe must
  handle both spellings or it will silently under-count.
- **Licence: CC BY-NC 4.0** — verified on the site, not assumed. Non-commercial. Consulting it as
  research evidence is a different act from shipping its text in a paid product, but that is a call
  for a human, not for me.

### Scale still on the table

I harvested 11 chapters. **2,441 Irish Donegal-Gaeltacht stories and 2,458 Kerry ones** are
reachable by the same method. A fuller harvest would plausibly reach several million characters per
dialect — the same order as Ó Curnáin.

---

## 8. The honest line

**All three dialects can now say "we counted it."** Connemara from Ó Curnáin, Munster from Ó Sé and
*An tOileánach*, Donegal from the Gaeltacht-filtered Schools' Collection.

The Donegal evidence is the youngest and the softest of the three — a 220k-character slice of
children's transcription, against 7.97M characters of professional linguistic description for
Connemara. It is enough to rule on `cha` and to attest every lexical item in the Ulster spec. It is
not yet enough to settle a fine-grained morphological question, and it should be grown before anyone
claims parity.

What would have been poison here was citing Quiggin or *Seanfhocla Uladh* as Donegal corpora. Both
are real Ulster books; in both, the word `bhí` occurs zero times, for two entirely different reasons.
Neither can be counted, and only calibration revealed it.
