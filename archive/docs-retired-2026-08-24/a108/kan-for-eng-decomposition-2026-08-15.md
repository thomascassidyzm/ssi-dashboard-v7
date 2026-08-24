# kan_for_eng — decomposition build report

**2026-08-15 · Kannada for English speakers · TEXT ONLY, NO AUDIO GENERATED**

---

## How far it got

| | Before tonight | After tonight | Remaining |
|---|---|---|---|
| Translated seeds | 668 | 668 | 0 |
| Seeds decomposed | **0** | **8** | **660** |
| LEGOs | **0** | **22** | — |
| Practice phrases | **0** | **146** (47 BUILD + 73 USE + 26 component) | — |
| Audio clips | 1 (pre-existing) | **1 — unchanged** | — |

**8 of 668 seeds (1.2%) are decomposed** — seeds **1–7 and 9**. Seed 8 was attempted and
**deliberately left undecomposed**; the reason is below and it is the most interesting
thing in this report.

The course is **not built**. It is a small, quality-checked opening block with a stated
rule-set for the language, a pair-contract, and a speaker-question list.

**No TTS was run. No audio was generated. `course_audio` still holds exactly the one clip
it held before this session.** Kai's hard rule was observed without exception.

---

## Self-check result — the defect Kai told me to hunt in my own output

All six checks were run by reading the rows **back out of the database**, not by
re-reading my source file. Method for each is stated so a clean result means something.

| Check | Method | Result |
|---|---|---|
| **1. Script round-trip** | Every LEGO target compared as a UTF-8 **hex string** against exactly what was POSTed | **22/22 byte-identical** |
| | LEGO targets not in NFC after read-back | **0** |
| | Codepoints outside the Kannada block + ASCII | **0** |
| **2. Slice-crossover** | For each seed: every LEGO target word must trace to that seed's own sentence, and no two LEGOs may claim the identical span | **0 stray words, 0 duplicate claims** |
| **3. Self-contradiction** | Same English gloss → different Kannada, and different English → same Kannada, across all 22 LEGOs **and all 26 components** | **0 forks, 0 convergences** |
| **4. Missing LEGO** | Every word of every decomposed seed sentence must be taught by some LEGO at or before that seed | **0 untaught seed words** |
| **5. Untaught-word rule** | Learner vocabulary rebuilt from scratch in strict seed-then-LEGO order; all 120 BUILD/USE phrases re-tiled against it | **120 phrases checked, 0 violations** |
| **6. LEGO size** | Real **akshara** count (not the API's estimate) against the 8-syllable cap | **0 over cap** |

**Zero instances of the cross-slice defect were found in this output.** That is a real
data point about the shared machinery, and here is why it is worth something rather than
being a shrug: the crossover and self-contradiction checks are **structural** — they need
no Kannada. Check 3 in particular would fire if any card's English side had been paired
with a sibling card's Kannada, because the rotation Kai describes necessarily produces
either one English gloss pointing at two Kannada strings or two glosses pointing at one.

**A caveat I will not paper over:** this block is 22 LEGOs. The four-course estate scan is
looking at orders of magnitude more. A clean 22 is weak evidence that the tool is fine and
strong evidence only that *this* output is fine.

### The untaught-word rule — checked as I built, not after

The rule was enforced three ways: by my own pre-validator before each submission, by the
live API (which rejects a violating seed atomically and inserts nothing — it did so
**five times**, and each rejection was fixed rather than bypassed), and by an independent
re-derivation from the database afterwards. **Result: 120 phrases, 0 violations.**

Two rejections are worth knowing about:

- **The API's BUILD gate is stricter than the written methodology.** A BUILD phrase that is
  the bare LEGO does not count, and BUILD must visibly recombine with *prior* vocabulary.
  This makes **seed 1 structurally impossible** if LEGO 1 is a single word: LEGO 2's only
  legal BUILD and its only legal USE would be the same string, which a separate gate then
  rejects as a duplicate. The fix was to make seed 1's first LEGO carry subject+verb
  together (ನಾನು ಮಾತಾಡಬೇಕು), giving LEGO 2 something to plug into. There is corpus
  precedent — the released `eng_for_kan` does exactly this at its own seed 1.
- **The English side is policed and does no stemming**, so a prompt saying "in Kannada"
  was rejected until the LEGO carrying the locative had actually debuted. Prompts were
  rewritten, not waved through.

---

## Why this language is hard, and the rule I adopted

Kai's brief said: where the standard method would produce a LEGO that is not a real
learnable unit, don't force it — decide what the right unit is and **state the rule**.
Here it is. The full version, with the reasoning, is committed as
`docs/pair-contracts/kan_for_eng.contract.cjs`.

### The problem, concretely

The verb "speak" appears in the 668 seeds in at least **five different written forms**,
each a single word carrying what English needs several for:

| Form | Where | Carries |
|---|---|---|
| ಮಾತಾಡಬೇಕು | seeds 1, 15, 31, 186, 363 | "want to speak" |
| ಮಾತಾಡ್ತೀನಿ | seed 9 | "I speak" |
| ಮಾತಾಡೋದು | seeds 3, 137, 286 | "to speak" (verbal noun) |
| ಮಾತಾಡಲು | seeds 23, 28 | "to speak" (infinitive) |
| ಮಾತಾಡೋಕೆ | seeds 88, 291 | "to speak" (infinitive) |

An English-shaped decomposer wants to slice ಮಾತಾಡ- off the front and teach it as "speak",
with the endings as separate pieces. **That produces a card the learner can never say.**
ಮಾತಾಡ- is a bare root; it does not occur in the language on its own.

### The rules adopted

- **K1 — The LEGO boundary is the free form, never the bare root.** A Kannada LEGO must be
  a form that can be uttered as-is. The whole inflected word is the LEGO.
- **K2 — Morphology is revealed by contrastive overlap, never by atomising the suffix.**
  The learner holds ಮಾತಾಡಬೇಕು ("want to speak") from seed 1. At seed 9 they are handed
  ಮಾತಾಡ್ತೀನಿ ("I speak"). Same root, different ending, both whole words — the learner
  triangulates the alternation without ever being given the root. This is exactly the
  **contrastive twin debut** that `ralph-methodology.md` prescribes for construction-
  features, applied to morphology instead of particles.
- **K3 — A vs M is decided by morphological composition, not by whitespace.** ಕನ್ನಡದಲ್ಲಿ
  ("in Kannada") is *one written word* and a genuine M-LEGO: components ಕನ್ನಡ + ದಲ್ಲಿ, with
  the bound suffix marked `introduce:false` so it never becomes a card. This is the single
  place the pipeline's English-shaped assumption breaks hardest, and there is corpus
  precedent for the fix — the released `eng_for_kan` splits ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ the same way.
- **K4 — One Kannada word may gloss to several English words**, and that is correct rather
  than a defect. ಮಾತಾಡಬೇಕು = "want to speak".

### The consequence nobody warned me about

**In an agglutinative language the untaught-word rule bites far harder than in a fusional
one, because every inflection is a new word.** The learner who has been given ಕಲಿಯಲು
("to learn") cannot form ಕಲಿಯಬೇಕು ("want to learn") — that is a different word and must be
taught separately. Early seeds therefore yield **far fewer legal practice sentences** than
the same seeds would in French or Italian, and the API's 3-BUILD/5-USE minimum from seed 4
onward is genuinely tight. My first draft of seed 4 quietly invented six inflected forms
the learner had never seen; my pre-validator caught all six. **This is a trap any agent
building a Dravidian, Turkic or Uralic course will fall into.**

---

## Seed 8: attempted, and deliberately left out

Seed 8 is *"I'm going to try to explain what I mean."* —
**ನಾನು ಏನು ಹೇಳಬೇಕು ಅಂದುಕೊಂಡಿದ್ದೀನಿ ಅನ್ನೋದನ್ನ ವಿವರಿಸಲು ಪ್ರಯತ್ನಿಸಲಿದ್ದೀನಿ.**

I got a decomposition that respects the 8-syllable cap and mints no bare root, and then
stopped for two independent reasons:

1. **A genuine conflict between two methodology rules.** The clause "what I want to say" is
   ಏನು ಹೇಳಬೇಕು ಅಂದುಕೊಂಡಿದ್ದೀನಿ ಅನ್ನೋದನ್ನ — **16 aksharas**, double the cap. Every way of
   cutting it under the cap either splits it below a real unit or leaves ಅನ್ನೋದನ್ನ (a
   nominaliser) as a bare card — which `ralph-methodology.md` calls a category error, and
   rightly.
2. **I cannot verify the gloss.** I do not know whether ಅಂದುಕೊಂಡಿದ್ದೀನಿ means "I mean",
   "I think" or "I decided", nor whether it stands alone at all.

Forcing it would have meant inventing a card's meaning. It is question **A1** on the
speaker list. **This leaves a hole at seed 8**, which is a real cost and is stated as a gap
below rather than smoothed over.

**This is a decision for Kai, not for me:** for a language where one word is a clause, is
the 8-syllable cap the right constraint, or should Kannada M-LEGOs be allowed over it when
the alternative is a bare bound morpheme? I did not raise it unilaterally.

---

## The defect I found in the shared machinery

**The 8-syllable LEGO cap does not work for Kannada, and would not have protected this
course.**

`services/course-builder/lib/language-config.cjs` estimates syllables as
`characters ÷ CHARS_PER_SYLLABLE`. **`kan` is not in that table**, so it falls through to
`DEFAULT: 3.5` — a Latin-alphabet ratio. Kannada is an abugida at roughly **2.0 codepoints
per akshara**. Measured on this course's own vocabulary:

| Word | Real aksharas | API's estimate |
|---|---|---|
| ಮಾತಾಡಬೇಕು | **5** | 1 |
| ಪ್ರಯತ್ನಿಸ್ತಿದ್ದೀನಿ | **6** | 3 |
| ಸಾಧ್ಯವಾದಷ್ಟು ಹೆಚ್ಚು ಬಾರಿ | **9** | 5 |

The 8-syllable cap is therefore effectively a **~14-syllable cap** for Kannada — it runs
loose, not tight, so it silently fails open. It caught nothing during this build; my own
akshara counter caught one real overage (ಸಾಧ್ಯವಾದಷ್ಟು ಹೆಚ್ಚು ಬಾರಿ at 9), which I split into
two under-cap LEGOs. **Fix is one line — add `kan: 2.0` to `CHARS_PER_SYLLABLE`** — but it
is in the shared table for every language, so it is Kai's call, not a change I made
unilaterally. The same hole exists for every Indic script absent from that table.

---

## A ZUT fork in the *pre-existing* translation — and it touches built content

This is the finding most likely to cost rework, so it leads the speaker-question list as
**A0**.

**The 668 existing translations are not ZUT-clean on the infinitive.** Kannada writes "to
___" with several endings, and the corpus uses four, sometimes for the same verb:

| Ending | Word-final occurrences across 668 seeds |
|---|---|
| **-ೋಕೆ** | **121** |
| -ೋದು | 46 |
| -ಕ್ಕೆ | 29 |
| -ಲು | 25 |

Same verb, different answers: **"to remember"** is ನೆನಪಿಸಿಕೊಳ್ಳಲು at seed 6 but
ನೆನಪಿಸಿಕೊಳ್ಳಕ್ಕೆ at seeds 10, 24 and 57. **"to speak"** is split three ways (above).

**Blast radius on what I built:** the build teaches the **-ಲು** forms ಕಲಿಯಲು and
ನೆನಪಿಸಿಕೊಳ್ಳಲು, because those are what seeds 2 and 6 themselves use. If a speaker rules
that **-ೋಕೆ** is the course default, then **37 practice phrases now in the database** need
rewriting (**25** containing ಕಲಿಯಲು, **12** containing ನೆನಪಿಸಿಕೊಳ್ಳಲು) plus the two cards
that introduce them — and, under Kai's standing rule, the presentations that introduce
them in the same pass.

I did **not** normalise this silently. Choosing between the endings is a language
judgement, not a data-cleaning task.

---

## Premise check — done first, against the live database

The scout's description was verified before anything was written, and **it was wrong in
one important way.**

| Scout said | Database says |
|---|---|
| translated seeds present | ✅ correct — 668 seeds, numbered 1–668, no gaps, every one carrying Kannada |
| zero LEGOs, zero phrases | ✅ correct |
| zero real seed audio | ✅ correct — 1 clip total |
| **"a 300-seed standard-tier build"** | ❌ **668 seed rows exist.** `courses.seed_count` is **NULL** |

**Evidence this is a 668-seed flagship, not a 300-seed standard build**, as the brief asked
me to say if I found it:

1. There are **668 seed rows**, numbered 1–668 with no gaps, every one already translated.
2. The reverse course **`eng_for_kan` is released, public, `seed_count = 668`,
   `content_version 0.668.6`**, with 1554 LEGOs covering all 668 seeds. Kannada is already
   a shipped flagship pair in the other direction.
3. `kan_for_eng` is `pricing_tier: premium`, `course_type: official`.

The 300 figure appears nowhere in the database. **I built on the 668 premise.**

---

## Explicit gaps

1. **660 of 668 seeds are not decomposed.** The course is 1.2% built.
2. **Seed 8 is a hole** inside the built range (1–7 and 9 are done, 8 is not), for the
   reasons above. The next agent must either resolve question A1 or accept the gap.
3. **No Kannada speaker has reviewed any of this.** Self-assessed USE scores average about
   7.9 and the low ones are honest, but a self-score from a non-speaker is a statement
   about pedagogical shape, not about whether a Kannada speaker would say it.
4. **The pair-contract is written but not live.** The running course-builder executes from
   a *different* checkout (`ssi-dashboard-v7-clean-prod`, on `main`) — verified from its
   own `/health` response. The contract therefore sat on the branch while the build ran and
   the known-side gate used the generic `_default_eng` fallback. Practical effect: the gate
   was **stricter**, not looser, so nothing bad got through because of it. It becomes
   active only when the branch reaches `main` and the service restarts.
5. **Worker #683 (the corpus/morphology evidence sheet) died** on an account rate limit and
   delivered nothing. Its brief — an agglutination map for seeds 1–40 and a suffix
   inventory grounded in the released `eng_for_kan` corpus — was **not** recovered. Every
   morphological claim in this report is therefore my own first-hand measurement of the 668
   seeds, not a restatement of that worker. **This is the largest missing input**; a
   redispatched #683 would materially speed up seeds 10 onward.
6. **No QA checkpoint ran.** `/checkpoint-qa` has not been run against this content.
7. **The preflight route is commented out** (`services/course-builder-api.cjs:43`), so there
   is no dry-run. Every submission is a real write, and the only safety is that the API
   validates everything before inserting anything.

---

## What worker #681 established (script integrity)

Dispatched to verify the abugida survives the path. It confirmed independently of my own
round-trip:

- All 668 seed `target_text` values are **pure NFC**, **zero** out-of-block codepoints,
  **zero** ZWJ, 13 ZWNJ occurrences untouched by any normalisation this codebase applies.
- **0/668** mismatches on a direct DB→file→DB byte round-trip.
- `canonicalLanguage('kan')` is **accepted** — Kannada is not one of the codes that throws.
- The U+0300–U+036F diacritic strip that exists in 4 files **does not** reach Kannada's
  combining marks (U+0CBE–U+0CCD) — verified programmatically, not assumed.

It honestly flagged that it could not fire the live preflight route without triggering a
costed call, and that it saw `course_legos` move 0→22 mid-investigation — **that was me**,
writing this build.

**One hazard I found that is worth recording:** `checkWordContainment` compares raw
codepoints, while `normalizeForZUT` emits **NFD**. An NFD Kannada LEGO checked against an
NFC phrase **fails containment silently** — I verified this returns `false` in the live
code. Nothing here is affected because every string this build emits is forced to NFC, but
any future producer that normalises to NFD will hit it.

---

## Landing

Content is in the database via the live course-builder API. Documents and the pair-contract
are committed to the branch named in the landing line of the covering report.
