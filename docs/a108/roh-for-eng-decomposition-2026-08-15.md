# roh_for_eng — decomposition, seeds 1–10

**Date:** 2026-08-15 · **Course:** Romansh for English speakers · **No audio was generated.**

---

## How far it got, in numbers

| | Before tonight | After tonight |
|---|---|---|
| Translated seeds | 668 | 668 (untouched) |
| Seeds decomposed | **0** | **10** (seeds 1–10) |
| LEGOs | **0** | **35** |
| Practice phrases | **0** | **252** (91 BUILD, 130 USE, 31 component) |
| `course_audio` rows | 1 (a `welcome` clip) | **1 — unchanged** |

Every seed went in through `POST /api/seed/complete`, so each passed tiling, ZUT, the
8-syllable LEGO cap, containment, the BUILD anti-template gate and the vocabulary gate
atomically. Seeds 1–3 used the API's sanctioned sparse-vocabulary bypass
(`SKIP_VALIDATION`, which the route only honours for `seed_number <= 3`); seeds 4–10
were fully gated with no bypass.

**658 of 668 seeds remain undecomposed.** This is 1.5% of the course. I am not reporting
this as a built course — it is a calibrated opening band with the pair's rule layer
derived and written down, which is what the rest of the build can now be run against.

### The tier question — the brief's premise was wrong

The brief said a census reported roh_for_eng as "a 300-seed standard-tier build", and
flagged honestly that for zero-LEGO courses the tier had been *inferred*, not read.

**Read from the database: there are 668 seed rows, numbered 1–668, none empty.**
`courses.seed_count` is `NULL`, so the database records no build target at all — the
668 is a row count, not a declared tier. I built against the 668 that exist. Whether the
intended target is 300 or 668 is a decision that is **not recorded anywhere I can read**,
and someone should record it.

---

## The variety question — established, not assumed

Romansh has five written idioms plus the pan-regional standard, and a learner taught a
mixture is taught nothing. So this was measured over all 668 targets rather than judged
by eye. Word-boundary counts, tokenising on spaces only (apostrophes are word-internal
in Romansh — `ch'el`, `d'in` — and splitting on them corrupts the count):

| Marker | Rumantsch Grischun | Sursilvan | Sutsilvan | Surmiran | Puter/Vallader |
|---|---|---|---|---|---|
| 1SG pronoun | **jau 310** | jeu 0 | jou 0 | ia 0 | eu 0 |
| negator | **betg 152** | buc 0 | — | — | nun 1* |
| "what" | **tge 43** | tgei 0 | — | — | — |
| "yes" | **gea 28** | ei 0 | — | — | schi 0 |
| "very" | **fitg 31** | fetg 0 | — | — | — |
| "possible" | **pussaivel 6** | pusseivel 0 | — | — | pussibel 0 |
| "to speak" | **discurrer 19** | discuorrer 0 | — | — | discuorrer 0 |
| "and" | **e 18** | ed 0 | — | — | — |
| "a lot" | **bler/blera/blers 13** | bia 0 | — | — | — |
| "good" | **bun/buna 14** | bien 0 | — | — | — |
| "day" | **di 8** | gi 0 | — | — | — |

**Verdict: Rumantsch Grischun, and nothing else. Zero cross-variety tokens.**

The two candidate exceptions both resolve as standard RG on inspection, so the honest
count of contaminating tokens is **0, not 10**:

- `es` (9 seeds) is Vallader's 3SG *is* — but in every one of the 9 it follows `ti`
  (S63 `es ti segir`, S128 `ti es sco insatgi`, S377 `es ti ì insanua`). That is the
  ordinary RG 2SG *you are*.
- `nun` (S532) is Vallader's negator — but the sentence is `nun ch'els hajan fortuna`
  ("unless they're lucky"), the RG conjunction `nun che`, not a negator.

**No internal inconsistency of variety was found.** This is a clean, professionally
consistent Rumantsch Grischun corpus.

---

## The mis-pairing self-check — run on my own output

The brief flagged a live estate-wide defect coming from the shared decomposition
machinery: a LEGO's known and target sides failing to correspond because one side was
sliced from a *different word in the same seed sentence*. Confirmed across four unrelated
language pairs, so believed to be the tool. I ran the check on my own 35 LEGOs and
252 phrases. Script: `.a108-roh/mispair-selfcheck.cjs`.

### It found one. In my own output.

> **known "I can" → two different targets**
> `che jau poss` (S7L3 component) and `jau poss` (S10L1 LEGO)

This is exactly the defect class described — a slice boundary in the wrong place. The
S7 component had swallowed the subordinator `che` ("that") from the neighbouring frame
while still being labelled with the bare English "I can". Had it shipped, the learner
would have met one English intention with two Romansh forms, one of them carrying a
stray word from its neighbour.

**Fixed:** S7 was cleared and resubmitted with that component re-glossed `"that I can"`,
which is what `che jau poss` actually says.

Being honest about the origin: this is **my authoring slip, not proof of a tool bug**.
I wrote that component by hand. It does show the defect class is easy to produce and that
no gate in `/seed/complete` catches it — ZUT is enforced on LEGO rows and on phrase
rows, but a *component* gloss colliding with a later LEG0's gloss passed straight
through. That gap is worth someone's attention independently of tonight.

### Results after the fix — all zero, with the method stated

| Test | Method | Result |
|---|---|---|
| **2a. Same known → different target** | All 318 taught known→target units (35 LEGOs + 31 components + 252 phrases), normalised, grouped by known | **0 forks** |
| **2b. Same target → different known** | Same, restricted to LEGO and component rows | **0** |
| **3. Missing LEGO** | Each seed's target DP-tiled from its own LEGOs *plus* all LEGOs of prior seeds | **0 seeds** left uncovered |
| **1. Wrong-piece slice** | Each LEGO target must appear as a contiguous slice of its own seed target | **2 flagged — both deliberate, see below** |
| **1. Containment** | Each BUILD/USE phrase must contain its own LEGO target verbatim | **0 failures** across 221 phrases |

The 2 flagged slices are `emprender` (S2L1) and `in pled` (S6L1). Both are bare citation
forms taught alongside the elided form the seed actually contains (`d'emprender`,
`d'in pled`) — see the elision section. They are intentional and corpus-attested
(`emprender` appears bare in S20, S64, S79, S109, S224). I have left the check reporting
them rather than special-casing them away, because a checker that hides its exceptions
is worthless.

### Two false-positive classes I had to fix in the checker first

Worth recording, because anyone writing this check will hit them:

1. **Seed tiling must draw on prior seeds.** My first version tiled each seed only from
   its own LEGOs and reported 5 "missing LEGO" seeds. All 5 were wrong — S3's
   `discurrer` is taught at S1, which is the methodology working correctly. Restricting
   to the seed's own LEGOs manufactures a defect that isn't there.
2. **Component rows are stored as phrases with `phrase_role='component'`.** Checking
   "does this phrase contain its LEGO?" against them produced 31 false failures.

---

## The untaught-word rule

> A practice phrase may only use LEGOs already taught at that point in the course.

Verified **independently of the API**, by reading the LEGOs and phrases back out of the
database and re-tiling every phrase from scratch in strict learner order — accumulating
vocabulary LEGO by LEGO and testing each phrase against only what existed at that moment.
Script: `.a108-roh/verify-untaught.cjs`.

**221 BUILD and USE phrases re-tiled. 0 violations.**

This was checked as I built, not after: the API rejected three of my drafts on exactly
this rule (`da discurrer` at S2, `da dir` at S4, `vegn ad emprender` at S5) and each was
rewritten rather than waived.

---

## Where I departed from the standard method, and why

**Romansh elision.** Romansh elides `da`→`d'`, `a`→`ad`, `che`→`ch'`, `sche`→`sch'`
before a vowel. The tiling validator matches **whole chunks** and never re-splices word
forms, and `normalizeForContainment` does not strip the ASCII apostrophe — so
`d'emprender` and `emprender` are two unrelated tokens to the gate, and `jau vegn a`
("I'm going to") **cannot be joined to a vowel-initial infinitive at all**. The gate is
right to refuse: `jau vegn a emprender` is not Romansh; the corpus writes
`jau vegn ad emprender`.

This is a genuine structural property of the language that the shared machinery has no
way to express, so the layered-decomposition recipe needed a local rule. The policy I
adopted, now written into `docs/pair-contracts/roh_for_eng.contract.cjs`:

1. Teach the **bare citation form** as its own LEGO where the corpus attests it bare —
   it is what the learner recombines with.
2. Teach the **elided form separately, with a distinct English gloss** — never the same
   gloss, or ZUT forks. The linker is absorbed into the following word and glossed by
   what it signals in English:

   | bare | gloss | elided | gloss |
   |---|---|---|---|
   | `emprender` | to learn | `d'emprender` | learning |
   | `discurrer` | to speak | `da discurrer` | speaking |
   | `declerar` | to explain | `da declerar` | explaining |
   | `ma regurdar` | to remember | `da ma regurdar` | remembering |
   | `in pled` | a word | `d'in pled` | of a word |

3. A linker is **never glossed alone** and never carries a known of its own — it is a
   construction-feature, not a unit of intention.
4. `jau vegn a` is never combined with a vowel-initial infinitive in an authored phrase.
   Where a seed needs it, the whole elided chunk is one LEGO (`jau vegn ad empruvar`, S8).

Everything else follows `ralph-methodology.md` unchanged: negation is taught as the
discontinuous circumfix `na … betg` inside a whole thought (`jau na sun betg segir`,
S10) and never as a bare particle card; the comparison frame `uschè X sco Y` is a bound
gloss-unit taught whole; `fitg` is never glossed alone, so *very* and *hard* cannot fork
onto one card.

---

## Defects found in the existing 668 translations

Not mine, and not in seeds 1–10 — but they will bite whoever continues.

### Five seeds say "Yoruba" where the English says "Romansh"

| Seed | English | Stored Romansh |
|---|---|---|
| 160 | How do you say this word in Romansh? | co di ins quest pled per **joruba**? |
| 283 | Which of your friends speak Romansh? | tgenins da tes amis discurran **joruba**? |
| 285 | She speaks Romansh. | ella discurra **joruba** |
| 286 | People who like speaking Romansh. | glieud che discurra gugent **joruba** |
| 297 | I don't know many people who speak Romansh. | jau n'enconusch betg blera glieud che discurra **joruba** |

`joruba` is Yoruba — copy-paste contamination from another course's corpus. All five
should read `rumantsch`. **These must be corrected before those seeds are decomposed**,
or the course will teach learners to say they speak Yoruba.

### "soon" is rendered four ways

`bainbaud` (S23, S149, S397), `prest` (S291, S431), `baud` (S28, S29, inside "as soon
as"), `spert` (S97, inside "as soon as"). One English intention, four Romansh forms —
a ZUT decision that needs making before seeds past 22 are built.

### Everything else came back clean

Swept all 668 for further contamination and malformation: **0** targets identical to
their known text, **0** empty or whitespace-damaged fields, **0** stray markup or leaked
`introduce:false` directives, **0** non-Latin characters, **0** other foreign-language
words. **1** duplicated English sentence (S68/S194, *what are you looking for?*) and its
two translations **agree** — so it is not a ZUT defect.

---

## Explicit gaps — things I could not settle

1. **Nobody here speaks Romansh.** Ten points where the evidence in the corpus ran out
   are collected in `docs/a108/roh-for-eng-native-speaker-questions-2026-08-15.md`,
   each written in plain English for a non-technical speaker. **Five are blocking** —
   the content currently teaches a decision that a speaker has not confirmed.
2. **The build target (300 vs 668) is not recorded in the database.** `seed_count` is
   `NULL`. I built against the 668 rows that exist. Somebody should write the intended
   number down.
3. **One dispatched helper died.** The Romansh variety census worker (**#693**) failed
   on an account limit before reporting. I ran that census myself instead — the table
   above is mine, produced by `.a108-roh/variety.cjs`, not inherited from the worker.
   A second worker (**#696**, corpus-defect sweep) did not report either; the
   contamination and malformation findings above are likewise my own sweep
   (`.a108-roh/contam.cjs`), not its output.
4. **No audio, by instruction.** No TTS was generated, no voice was selected, no clip
   was proposed. `course_audio` for this course is still the single pre-existing
   `welcome` row it started the night with. No audio pass was queued either — that is a
   deliberate hold, since queueing one would eventually spend money on text that five
   blocking speaker questions have not yet cleared.

---

## Reproducing any of this

Working scripts are in the gitignored scratch directory `.a108-roh/`:
`census.cjs` (live course state), `dump.cjs` (corpus), `conc.cjs` (concordance),
`variety.cjs` (variety census), `contam.cjs` (contamination sweep),
`mispair-selfcheck.cjs` (the mis-pairing check), `verify-untaught.cjs` (untaught-word
verification), `sub.cjs` (submission with full error reporting).
