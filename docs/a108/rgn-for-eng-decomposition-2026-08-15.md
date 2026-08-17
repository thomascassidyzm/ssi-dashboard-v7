# rgn_for_eng — decomposition build report

**2026-08-15 · Romagnol for English speakers · TEXT ONLY, NO AUDIO GENERATED**

---

## How far it got

| | Before tonight | After tonight | Remaining |
|---|---|---|---|
| Translated seeds | 668 | 668 | 0 |
| Seeds decomposed | **0** | **10** | **658** |
| LEGOs | **0** | **29** | — |
| Practice phrases | **0** | **181** (73 BUILD + 108 USE) | — |
| Component rows | 0 | 29 (18 introduced) | — |
| Audio clips | 1 (pre-existing) | **1 — unchanged** | — |

**10 of 668 seeds (1.5%) are decomposed.** The course is **not** built. What exists is a
quality-checked opening block, every seed of which passed the live validator atomically.

**No TTS was run. No audio was generated. `course_audio` still holds exactly the one clip it held
before this session.** Kai's hard rule was observed without exception.

This is a smaller block than the comparable Neapolitan run (30 seeds) for two reasons, both stated
honestly below: **both of my scout workers died on account limits**, so I did their legwork inline;
and **I stopped at seed 10 on purpose** once that legwork turned up a corpus-level problem that
needs a ruling before more content is banked.

---

## Premise check — the brief was wrong about the tier

Verified against the live database before anything was written:

- `rgn_for_eng` exists, created **2026-07-07**, status `draft`, visibility `hidden`.
- **668 seeds**, numbered 1–668 with **no gaps**, every one carrying Romagnol `target_text`.
- **0 LEGOs, 0 practice phrases** before this session — confirmed.

**The census called this "a 300-seed standard-tier build". It is not. There are 668 seed rows.**
`courses.seed_count` is **NULL**, which is exactly why the census had to infer the tier and got it
wrong. The brief asked me to say so if I found flagship-shaped evidence, and I do: the corpus is
668 seeds and fully translated.

---

## ⚠️ THE FINDING: this corpus was translated under TWO orthographies, and the seam is at seed 60

This is the most important thing in this report and it needs Kai's ruling.

Romagnol has no codified orthography, so variation was expected. What I found is not gradual
variation — it is **a clean break**, with essentially zero overlap:

| Feature | Seeds 1–60 spelling | Seeds 61–668 spelling |
|---|---|---|
| nasal vowels | `tẽp`, `pẽs`, `quãt`, `quãd`, `bẽ`, `interesãnt` | `temp`, `pens`, `quant`, `quand`, `bén`, `interesant` |
| "wanted" | `vlêva` | `vléva` |
| "I have" | `a j ò` (spaced) | `a jò` (joined) |

Counted across all 668 seeds:

- **Tilde nasals (`ẽ ã õ ĩ`) appear in 26 seeds: 22 of the first 60, and only 4 of the remaining 608**
  (seeds 312, 324, 347, 353).
- The plain-`n` / joined convention appears in **124 seeds — and *zero* of them are at or below
  seed 60.** The lowest is **seed 62**.

| Variant pair | Early form | Late form |
|---|---|---|
| `tẽp` / `temp` | 3 seeds (27, 33, 54) | 17 seeds, all ≥ 62 |
| `pẽs` / `pens` | 1 seed (47) | 24 seeds, all ≥ 72 |
| `vlêva` / `vléva` | 5 seeds (30, 31, 52, 53, 57) | 37 seeds, all ≥ 69 |
| `quãt` / `quant` | 1 seed (33) | 9 seeds, all ≥ 76 |
| `quãd` / `quand` | 3 seeds (34, 55, 58) | 8 seeds, all ≥ 79 |
| `interesãnt` / `interesant` | 1 seed (58) | 5 seeds, all ≥ 112 |
| `bẽ` / `bén` | 3 seeds (13, 41, 55) | 2 seeds (72, 426) |
| `a j ò` / `a jò` | 6 seeds (37, 44, 45, 55, 59, **195**) | 38 seeds, all ≥ 73 |

**Reading:** the 668 seeds were produced in at least two passes under two different spelling
conventions, and the join is between seed 58 and seed 62. A few features leak past the seam
(`a j ò` at 195, `stmãna` at 347, `dopmeẓdè` at 179, `ẓént` at 88), so it is not perfectly clean for
every feature — but for the nasal-vowel family it is as sharp a break as you could ask for.

**I did not normalise any of it.** Per the brief: flagged, counted, left alone.

### Why this stopped the build at seed 10

**Seeds 1–10 contain none of the split variants** — they are convention-neutral and safe under
either ruling, which is why I banked exactly those and stopped.

Inside seeds 11–30, **seven seeds carry the minority convention**: 12, 13, 15, 18, 24, 27 (tilde
nasals) and 30 (`vlêva`). Decomposing those banks LEGO text in the spelling that **91% of the
course contradicts**. Because a LEGO's target text must match its seed's text, normalising the
seeds later would break every LEGO cut from them — and, under Kai's standing rule, every
presentation that introduces them too. That rework is cheap now and expensive after another 200
seeds.

**Whichever way Kai rules, the cheaper remediation is to bring seeds 1–60 into line with 61–668
(60 seeds) rather than the reverse (608 seeds).** But that is a translation decision, not mine.

---

## Orthography: what convention is this, and against what authority?

**Honest gap: I could not complete the external-authority comparison.** The worker dispatched to
check rgn.wikipedia.org and eml.wikipedia.org (**#695**) died on an account limit before reporting.
**I have no evidence about what Romagnol Wikipedia does, and I am not going to assert any.**
Kai's question — whether an equivalent authority to the Neapolitan Wikipedia ruling is appropriate
here — is therefore **unanswered**. It needs one more scout run when the fleet has headroom.

What I *can* state, from the corpus itself (668 seeds, measured):

| Character | Occurrences | Seeds |
|---|---|---|
| `è` | 464 | 344 |
| `ê` | 439 | 338 |
| `é` | 396 | 294 |
| `ò` | 308 | 252 |
| `ó` | 186 | 160 |
| `ì` | 150 | 146 |
| `à` | 114 | 105 |
| `ô` | 93 | 91 |
| `ṡ` | 38 | 38 |
| `ẓ` | 32 | 31 |
| `ẽ ã õ ĩ` (all four) | 33 | 26 |

The system uses **circumflex for long/closed vowels** (`ê ô â î û`), **acute vs grave for vowel
quality** (`é/è`, `ó/ò`), and **dot-below for the voiced sibilant/affricate contrast** (`ṡ`, `ẓ` —
e.g. `ṡbaj`, `ẓént`, `dopmeẓdè`). That inventory — circumflex plus sub-dot — is characteristic of
the **Schürr/Masotti (Faenza–Ravenna) tradition** rather than a Ferrari/Quaderni Padani system.
**I am inferring that attribution from the character inventory alone; it has not been checked
against a published source, and it should be before it is repeated.**

The masculine definite article is written **`e'`** with an apostrophe (83 tokens) — never bare `el`
(0 tokens). Feminine `la` (135), plural `i` (57) / `j` (33), `al` (19). Clitics are written as
separate tokens with apostrophic elision before vowels: `a n sò`, `ch'a`, `u m pis`, `d'imparê`,
`ad` before consonants and `d'` before vowels — that alternation is **systematic and is not a
fork**.

---

## ZUT forks found — and the three seeds I deliberately did not build

**Honest gap: the fork scout (#694) also died on an account limit.** I ran the highest-value parts
of its brief inline; the full paradigm sweep it was asked for was **not** done.

What I did establish:

| English | Majority form | Minority form | Call |
|---|---|---|---|
| "to learn" | `imparê` — 11 seeds | `imparêr` — **2 seeds (20, 21)** | fork |
| "to say" | `dì` — 19 seeds | `dìr` — **1 seed (60)** | fork |

The `-r` infinitive appears in exactly **3 of 668 seeds across two verbs**; everywhere else the
corpus apocopates. Teaching both spellings for one English prompt is a straight ZUT violation, so
**seeds 20, 21 and 60 are deliberately not decomposed** and are listed as held. This is a
one-line ruling for a speaker, not a blocker for anything else.

`scórar` (22 seeds) vs `scór` (6 seeds) is **not** a fork — infinitive vs finite. Correct as
written.

### A translation bug found in passing

**Seed 283** reads, in English, *"Which of your friends speak Romagnol?"* — and in Romagnol,
`chi èl d'i tu amigh ch'e scór **yoruba**?`. That is a leak from the Yoruba course. Outside
tonight's band; flagged, not touched.

---

## The mis-pairing self-check — run on my own output

Run against all 29 LEGOs and 29 component rows produced tonight, in response to the confirmed
estate defect (a LEGO whose known and target sides don't correspond because one side was sliced
from a different word in the same seed sentence). Three language-agnostic tests:

**T1 — round-trip.** Does the database hold exactly what I submitted? Catches the shared slicing
machinery mutating rows in transit.
> **29 of 29 LEGOs round-tripped byte-identically** — known side, target side, every component.
> **0 drifted.** The `/api/seed/complete` path altered nothing.

**T2 — self-contradiction.** Does the output pair the same known with different targets, or
different knowns with the same target — and in particular, do the two sit in the *same seed*, which
is the estate defect's signature?
> **0 known-side forks. 0 target-side convergences. 0 same-seed instances.**

**T3 — coverage.** Does every word of each seed sentence get claimed by exactly one LEGO, with
nothing claimed twice and nothing left untaught (the missing-LEGO sibling defect)?
> **0 missing LEGOs across all 10 seeds.** Every word of all 10 seed sentences is taught.
> **1 overlapping-claim group**, and it is intentional: at seed 10 the word `a` is claimed by both
> `a n sò` ("I don't know") and `a n sò sicur` ("I'm not sure") — the deliberate A-inside-M overlap
> ladder that *is* the teaching mechanism, not a mis-slice.

**Result: zero instances of the estate defect in tonight's output.** Stated with its method, as
asked — a clean result is evidence about the tool only if you can see how it was measured.

**One false-positive class for whoever runs the estate scan:** a naive coverage checker will report
"missing LEGO" for every seed that simply *hasn't been decomposed yet*. My first run flagged 20
such seeds (11–30) before I scoped the query to decomposed seeds only. On a 1.5%-built course that
turns into a 20-defect false alarm.

---

## The untaught-word rule

> *A practice phrase may only use LEGOs the learner has already been taught at that point.*

Checked **as the build ran**, not after: every seed went in through `POST /api/seed/complete` on
the live course-builder, which validates tiling, ZUT, the 8-syllable LEGO cap, phrase containment
and the vocabulary gate **atomically** — a violating seed is rejected outright and inserts nothing.

**Result: 10 seeds submitted, 10 accepted, 0 rejected, 181 phrases, 0 untaught-word violations.**

A local pre-flight linter (`.a108-rgn/lint.cjs`, a DP tiler over accumulated vocabulary) caught two
duplicate-phrase problems before they cost a round trip; both were fixed, not bypassed.

---

## Method, and where I departed from it

Followed `ralph-methodology.md` and `synonym-choice-architecture.md`, calibrated against the
`nap_for_eng` build of the same night, whose seed set maps almost one-to-one onto this one.

Shape: 2.9 LEGOs per seed, 18.1 practice phrases per seed, USE outnumbering BUILD 1.5 : 1.

**One deliberate departure, forced by the language.** Romagnol writes its subject clitic as a
separate token (`a voj`, `t scór`, `e vô`, `la vô`, `u m pis`) and elides its linking preposition
onto the following infinitive (`d'imparê`, `d'arcurdêm`). Neither can be split at whitespace. Per
the methodology's rule that **construction-features are never atomised** (Principle 3), I have
consistently taught finite verb + subject clitic as a **single M-LEGO with one self-component**
(`a voj` = "I want", not `a` + `voj`), and absorbed the linking `ad`/`d'` **silently inside** an
M-LEGO (`ad scórar`, `introduce:false` on the particle) rather than ever giving the learner a card
that asks them to mean "ad". Glossing `a` as "I" or `ad` as "to" on its own card would be exactly
the category error the methodology warns against.

---

## Questions only a native Romagnol speaker can settle

Each is written so a speaker can answer it without knowing anything about our software.

**A1 — the big one (blocks further building).** In these sentences, which spelling is right?
Seeds 1–60 write *time* as `tẽp`, *I think* as `a pẽs`, *when* as `quãd`, *well* as `bẽ`, *wanted*
as `vlêva`. Seeds 61–668 write the same words `temp`, `a pens`, `quand`, `bén`, `vléva`. Are these
two spellings of the same word, or two genuinely different words? If they are the same word, which
spelling should the whole course use?

**A2.** *To learn*: is it `imparê` or `imparêr`? Two of the 668 sentences say `imparêr`, the other
eleven say `imparê`. Same question for *to say*: `dì` (nineteen sentences) or `dìr` (one)?

**A3.** *I'm trying to learn* is written `a prôv d'imparê`. Would you also say `a voj d'imparê`
for *I want to learn*, or does it have to be `a voj imparê` with no `d'` after *want*? I have
avoided combining them because I was not sure.

**A4.** *To remember* is written `arcurdêm`, which looks like it already contains "myself". Is
`arcurdêm` correct for *to remember* generally, or does it specifically mean *to remember myself*
in a way that would sound wrong to you in a sentence like *I'm trying to remember a word*?

**A5.** *I'm going to practise* is `a farò pratica`. Does *practise speaking* have to be
`pratica ad scórar` with `ad`, and would `a prôv ad scórar` be the natural way to say *I'm trying
to speak*?

**A6.** *I want to try as hard as I can* is `a voj impignêm piò ch'a pòs`. Does `impignêm` on its
own mean *to try hard* / *to make an effort*, and is `piò ch'a pòs` a natural way to say *as much
as I can*?

**A7.** Which town or area does this Romagnol read as to you — Ravenna, Forlì, Cesena, Rimini,
Faenza, Imola? Does any of it sound like a mixture of more than one place?

**A8.** Seed 283 asks in English *"Which of your friends speak Romagnol?"* but the Romagnol says
`chi èl d'i tu amigh ch'e scór yoruba?` — "…who speak **Yoruba**". Confirming this is simply a
mistake to be corrected.

---

## Explicit gaps — reported, not papered over

1. **Both scout workers died on account limits** (#694 fork scout, #695 orthography scout). Neither
   delivered a report. The fleet was saturated with the same failure across sibling course builds
   at the time, and I was instructed not to re-dispatch off the back of a worker report. I did the
   highest-value parts of both briefs inline; the rest is genuinely missing.
2. **No external orthographic authority was consulted.** I have *no* evidence about
   rgn.wikipedia.org or eml.wikipedia.org. Kai's question about an equivalent authority to the
   Neapolitan ruling is **unanswered**.
3. **The Schürr/Masotti attribution is my inference from the character inventory**, not a checked
   fact. Do not repeat it as established.
4. **No full verb-paradigm sweep** was done. The person/number forms of *want*, *can*, *go*, *have*,
   *be* across the 668 seeds remain unmapped, and the next agent will hit them around seed 16.
5. **The course tier is unconfirmed by the database.** 668 seed rows exist; `courses.seed_count` is
   NULL. The 668 figure is a row count, which is strong, but nothing in the schema *declares* the
   intended tier.
6. **Seeds 20, 21, 60 are deliberately unbuilt** pending question A2; seeds 11–30 are unbuilt
   pending question A1.

---

## Where the next agent picks up

Next seed is **11** (`a vréb putê scórar dòp ch't fnéss` — "I'd like to be able to speak after you
finish") — **but A1 should be settled first**, because seeds 12, 13, 15, 18, 24 and 27 carry the
minority orthography and will need re-cutting if it is normalised.

Everything needed is on the branch under `.a108-rgn/`: `seeds-001-010.json` shows the working
format, `submit.cjs` posts to the builder, `lint.cjs` catches most rejections before a round trip,
`mispair-selfcheck.cjs` runs the three-test estate-defect check, and `variants.cjs` / `seam.cjs`
reproduce the orthographic-seam evidence above.
