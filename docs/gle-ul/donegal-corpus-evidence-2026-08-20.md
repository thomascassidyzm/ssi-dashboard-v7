# Donegal corpus evidence — measured, not recalled

**2026-08-20.** Every number here was counted live against a corpus of transcribed Donegal speech.
This document exists because the first version of the build report had to say, honestly, that the
Donegal evidence base was a dictionary and nothing else. It no longer is.

## The corpus and the partition

`corpas.ie`, CNG corpus (113.8M tokens). **CNG has no dialect attribute**, so raw counts from it are
worthless as dialect evidence — `bhíos` has thousands of raw hits dominated by *An tUltach*, an
Ulster magazine. The partition is manufactured from RTÉ Raidió na Gaeltachta's regional desks, which
are transcribed speech from known places:

| Label | Source | Tokens | Place |
|---|---|---|---|
| **UL** | `RnaG (Barrscéalta)` | ~65,000 | **Donegal** |
| CO | `RnaG (Iris Aniar)` | ~119,000 | Connemara |
| MU | `RnaG (An Saol ó Dheas)` | ~104,000 | Corca Dhuibhne, Kerry |

**Calibrated before any count was believed.** Attribute values are regexes, so the parentheses in
the source names must be escaped — unescaped, every query returns 0 *silently* rather than erroring,
which looks exactly like a real null result. The known positive `muid` returns **MU 28 / CO 9,468**,
the expected hard discrimination; the known negative `xqzzy` returns 0, not null. Errors return
`null` and are never allowed to cache as a zero.

---

## 1. `cha` vs `ní` — the question that gated the whole job

| form | UL (Donegal) | CO | MU |
|---|---|---|---|
| `cha` | **324** | 2 | 3 |
| `chan` | **166** | 6 | 5 |
| `char` | **71** | 5 | 0 |
| **cha-family total** | **561** | 13 | 8 |
| `ní` | 2,954 | 8,281 | 9,473 |
| `níor` | 340 | 1,045 | 586 |
| `níl` | 2,999 | 5,245 | 3,114 |
| **ní-family total** | **6,293** | 14,571 | 13,173 |

**Two conclusions, and they pull in different directions.**

1. **`cha` is emphatically an Ulster form.** 561 in Donegal against 13 in Connemara and 8 in Kerry —
   better than 40:1 discrimination. As a dialect marker it is about as clean as they come.
2. **But `ní` is the default negative even in Donegal, by roughly 11 to 1.** The cha-family is about
   **8%** of all negation in Donegal speech. `níl` alone (2,999) outnumbers the entire cha-family
   five times over.

**So the interim decision was right, and is now evidence-backed rather than a fallback.** All 668
seeds use `ní`/`níl`/`níor`, which is what a Donegal speaker mostly says.

**And a wholesale `ní`→`cha` sweep would be a serious error** — it would over-apply `cha` by more
than tenfold and produce a course that sounds like a caricature of Donegal rather than Donegal.

The remaining, genuinely open question is narrower and better posed than before: **should a minority
of the 126 independent-clause negatives carry `cha`, to bring the course to something like the
natural 8%?** Natural `cha` use is contextually conditioned — contradiction and emphasis — which
cannot be determined reliably per seed from the English alone. That is a speaker's judgement call on
a marked subset, not a mechanical sweep.

---

## 2. The spec's required forms — every one validated

| form | UL | CO | MU | verdict |
|---|---|---|---|---|
| `fosta` | **1,792** | 0 | 0 | perfect discrimination |
| `achan` | **1,864** | 1 | 0 | perfect discrimination |
| `domh` | **480** | 0 | 1 | perfect discrimination |
| `inteacht` | **150** | 0 | 0 | perfect discrimination |
| `amharc` | **453** | 16 | 0 | strongly Donegal |
| `cluinstin` | **23** | 0 | 0 | Donegal-exclusive, low frequency |
| `tchí` | **23** | 0 | 0 | Donegal-exclusive, low frequency |
| `caidé` | **45** | 3 | 0 | Donegal-exclusive (under-counted: `cad é` is two tokens) |
| `ábalta` | **1,021** | 13 | 551 | Donegal *and* Munster, not Connacht |
| `uilig` | 1,510 | **1,124** | 9 | **NOT Donegal-exclusive** — Connemara uses it too |

`uilig` is the one surprise: it is correct Donegal but it is **not** a dialect marker, because
Connemara uses it nearly as much. Worth knowing before anyone counts it as evidence the dialect
landed.

## 3. The forbidden forms — every one confirmed as the other dialect

| form | UL | CO | MU | verdict |
|---|---|---|---|---|
| `céard` | 1 | **2,201** | 5 | Connacht. Correctly forbidden. |
| `freisin` | 5 | **2,674** | 91 | Connacht. Correctly forbidden. |
| `chuile` | 33 | **3,453** | 3 | Connacht. Correctly forbidden. |

---

## 4. Where the corpus overturned a decision made from the dictionary

### `madadh`, not `madra` — my normalisation was wrong and has been reversed

| form | UL | CO | MU |
|---|---|---|---|
| `madadh` | **48** | 0 | 0 |
| `madra` | **0** | 4 | 14 |

`madra` is used **zero times** in Donegal speech. During the build I normalised `madadh` → `madra`
across seeds 69 and 546, on the §0 rule that a form must be an Ó Dónaill headword. That rule
excluded the correct Donegal word and installed one the dialect does not use — precisely what Kai's
ruling #1 forbids. **Both seeds now read `madadh`.**

### But the same test vindicated the other exclusions

| form | UL | CO | MU | outcome |
|---|---|---|---|---|
| `toisigh` | 4 | 1 | 0 | **`tosaigh` (UL 314) was right** — 13 rows correctly normalised |
| `gnaitheach` | 0 | 0 | 0 | correctly dropped for `gnóthach` (UL 82) |

### The lesson, for the spec

**The FGB-headword test is not worthless, but it is not sufficient, and corpus evidence outranks
it.** It caught a genuine false friend (`toisigh` is Ó Dónaill's variant of `tomhais`, *measure*)
and a genuine non-word (`gnaitheach`), but it also nearly cost the course a real Donegal word.
Where the two disagree, **what Donegal actually says wins** — which is ruling #1, applied to our own
methodology rather than to the learner's dictionary.
