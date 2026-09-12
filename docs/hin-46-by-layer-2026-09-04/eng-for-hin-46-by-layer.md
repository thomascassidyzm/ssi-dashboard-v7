# eng_for_hin — the 46 failing seeds, split by layer

Read-only re-read, 2026-09-04, against production Supabase. **Nothing was written. No commits.**
I re-ran the course's own validator code myself (`checkTiling`, `checkVocabViolations`,
`checkBuildUsePhrases` — the same functions `POST /v2/validate/:courseCode` calls) and got
**622 passed / 46 failed**, the same headline as the 2026-09-03 read. That read is good work and
most of it stands. Where I differ I say so with the evidence.

---

## 1. The gate question — settled

**The two standards are real, and they are not a design decision. One half of the gate was
tightened and the other half was left behind.**

- Seed sentences are checked by `checkTiling` (validation.cjs:104): **word-level** — every word of
  the sentence must appear *somewhere* inside some taught chunk.
- Practice phrases are checked by `checkVocabViolations` (validation.cjs:253): **whole-chunk** —
  the phrase must be cut entirely from taught chunks, no word freed from its chunk.

Commit `9c468a6dc` (2026-02-17, "Improve vocab violation checking with DP chunk-sequence tiling")
rewrote the *phrase* check from word-level to whole-chunk, on purpose — its own comment says
"no word-level splitting, no free recombination. This prevents conjugations, inversions and
contractions that were never actually taught." The seed check was never touched. So the
whole-chunk rule is the **intended** one, and the lenient seed check is the stale half.

The specimen holds and is sharper than reported. Seed 637's sentence is "Where is her bag?" and
practice phrase `eng_for_hin:S0637L01U01` is "where is her bag?" — the same words. Under the
current split standard the sentence passes and the phrase fails. **Under the intended whole-chunk
rule they agree: both fail**, on the span `is her bag`.

### The two population numbers

| Rule | Seeds failing | Practice phrases flagged on vocabulary |
|---|---|---|
| **Harmonise down** — word-level everywhere | **19** | **0** |
| **Status quo** — word-level seeds, whole-chunk phrases | **46** | **214** |
| **Harmonise up** — whole-chunk everywhere (the code's evident intent) | **52** | 214 phrases **+ 16 seed sentences** |

- **214 of 214** flagged practice phrases fail **only** because of the stricter phrase rule.
  Every single one passes the seed-level rule. There is no residue.
- **27 of the 46 failing seeds evaporate entirely** if the rule is harmonised down:
  21, 34, 36, 47, 49, 58, 64, 87, 90, 106, 241, 242, 268, 322, 325, 327, 339, 346, 355, 465, 477,
  480, 589, 597, 604, 610, 637.
- The **whole copula class evaporates** under the word-level rule. If Kai's answer is "word-level",
  rewriting those phrases would be pure damage — they were never defective.
- Harmonising *up* costs 6 further seeds (8, 23, 43, 50, 323, 328) whose own sentences do not tile
  from whole chunks — including seed 8, the eighth sentence in the course.

**And the deeper fact: 0 of 214 asks the learner for a word they have never heard.** For every
blocked word I found at least one earlier taught chunk containing that word as a whole token —
checked twice, once apostrophe-stripped (the gate's own normalisation) and once
apostrophe-preserving, so "we're" is not miscounted as licensing "were". Zero with no carrier,
both ways.

---

## 2. Layer — the finding that changes what to do

Kai's rule: a component plays once at its introduction and never again, so it cannot clash; it is
held to a lower bar. A lego recurs and is held to a high bar.

**The vocabulary class is a lego-layer *symptom* with a component-layer-only *fix*.**

- All 214 flagged items are live `build`/`use` practice phrases of legos. The gate does not check
  component phrases at all (`runSeedChecks` filters to `build`/`use`). So the flags themselves are
  lego layer.
- But the missing item is always a smaller bit inside a bigger taught chunk. **214 of 214** blocked
  words already sit inside an earlier chunk. Freeing them is exactly the component mechanism —
  there is no lego-layer fix that adds vocabulary, only a rewrite of live phrases or a re-cut chunk.

**And Kai has already ruled on the specific components this would require.** The English copula and
auxiliaries — *is, are, am, has, have, do, did* — are **never taught anywhere in this 668-seed
course**, not as a lego and not as a component. I checked every lego and every component target.
The only bare copular items that exist are four components: `be` (S0346L03), `was` (S0364L03),
`were` (S0385L01), `was` (S0386L01). Those are precisely the "to be" components Kai called *not a
valuable contribution*.

So the prior read's headline recommendation — "teach is / are / was / were / have / has / did as
chunks early" — is the thing Kai has already declined. That is the single most useful correction
here.

---

## 3. LEGO-layer findings — the high bar

These are the ones I would call real defects.

### L1 — a word wedged inside the taught chunk (containment), 10 phrases, 6 seeds, all live

The chunk is taught, then a practice phrase inserts a word into the middle of it, so the phrase no
longer contains its own lego. Example, seed 343: lego `she's worried`, phrase `she's very worried`.
Also 344 `he's very happy`, 345 `he's not quite ready`, 478 `a very kind heart`, 621 `was it broken?`
(inverted).

Why this one is real: the decomposition is the tile map the player uses. A phrase that does not
contain its own chunk cannot be tiled by it, which is how ghost tiles appear on the learner's screen.

**Recommendation: fix.** Small — 10 phrases. Growing or re-cutting the chunk touches no audio;
rewording nulls that phrase's clips.

**Exception inside this class:** seed 385, `agree with her` and `you agree with her` under lego
`did you agree with her`. Those two are not wedged words — they are a build ladder ramping up to
the chunk. The containment rule cannot express a ramp. That is a gate limitation, not a defect.

### L2 — content words freed from their chunk with thin exposure, 32 phrases, 12 seeds, all live

Distinct from the copula class: these are real lexical items the learner has met **once**, inside
one chunk, and is now asked to produce alone. Example, seed 478: `such` has exactly one carrier in
the whole prior course — `such an obvious question` at seed 423 — and the phrase
`she has such a kind heart` asks for it bare, 55 seeds later. Others: `definitely` (1 carrier),
`some` (1), `during` (1), `just` (1), `grandfather` (1), `film` (2), `minutes` (2), `story` (2).

**Recommendation: read these 32 by hand, one judgement each.** Some are harmless; some genuinely
ask for a word the learner met once and will not have. This is the class where the gate is telling
the truth about learner harm.

### L3 — the bare-lego clone (the whole "phrase count" bucket), 35 legos, 18 seeds

Every complaint reads "BUILD: need 3+, got 2 — 1 bare-LEGO phrase doesn't count". It is not 35
independent mistakes: **79 legos course-wide** carry a build phrase whose text is identical to the
lego, and it is a build-ladder convention (`of course` → `of course`, `she told me` → `she told me`,
`I suspect that` → `I suspect that`). In 35 of those 79 it tips the lego under the build floor.

**Recommendation: real but cosmetic, and mis-named.** No learner is asked for anything untaught;
the clone is simply a phrase that teaches nothing. Schedule it, don't rush it — and fix it as a
*convention* question (does a build ladder start from the bare chunk?), not as 35 tickets.

---

## 4. COMPONENT-layer findings — Kai's lower bar

There are **138 components** on the legos of the 46 failing seeds. Scanned separately, held to
"a bit weird is tolerable, it never plays again":

| | count | verdict |
|---|---|---|
| Clean — the component's English is a contiguous piece of its parent | **102** | **fine** |
| Gappy — the English words are in the parent, in order, with a hole | **3** | **fine** |
| Degenerate — the component IS the parent, teaches nothing | **11** | **harmless, mild waste** |
| Alien — the component's English does not appear in its parent at all | **22** | **mostly fine, 4 load-bearing** |

**Gappy (3) — acceptable.** `I'll ask if` from `I'll ask him if`; `what said` from
`what she said to him`; `what should do` from `what he should do`. Each is a clean gloss of a real
Hindi unit (क्या कहा, क्या करना चाहिए) and reads oddly only in English. Plays once. **Leave them.**

**Degenerate (11) — acceptable, and they explain nothing.** `of course`→`of course`,
`yet`→`yet`, `know`→`know`, `you know`→`you know`, `to leave`→`to leave`, and all six of seeds
589/597. They teach nothing but they cost nothing, and they generate no component practice phrases
at all. **Leave them.**

**Alien (22) — this is where the interesting half is, and most of it is still fine.**
Six are contraction splits and obviously right: `he` from `he'll` / `he's`, `I` from `I'll`,
`she` from `she's`. `will be able to help` from `he'll be able to help` is the same thing expanded.
The rest gloss a Hindi word that has no English counterpart in the parent: `on` (पर) from
`needs to consider`, `for` (के लिए) from `to leave`, `whom` (जिसे) from `you know`, `not` (नहीं)
from `didn't like` and `didn't hear`, `that` (कि) from `didn't hear`, `if` (कि) from
`I'll ask her where`, `your help` / `to do` from `to help you`, `that she` from `I wanted her to`,
`has started` from `started to learn`. As learner experience, **these are exactly the "bit weird"
Kai said to accept** — a tile shown once next to the Hindi it glosses. **My verdict on all of them
as learner-facing items: acceptable, leave them.**

**But four of them are load-bearing on the gate, and Kai should know it.** Components feed the
vocabulary set. `be` (S0346L03), `was` (S0364L03), `were` (S0385L01), `was` (S0386L01) and
`has started` (S0224L01) are the *only* reason certain later phrases tile at all — e.g. every
`has a kind heart` phrase at seed 478 depends on `has started`. So a future tidy-up that deletes an
odd component as "weird" would silently break downstream phrases that were passing. That is a real
trap, and it is the mirror image of job #323.

**On job #323 (the six "misleading gloss" merges, 2026-09-03):** the brief's suspicion is correct.
On Kai's rule those were components, played once, no clash risk — the pass was probably
unnecessary. It was also not free: merging a component removes vocabulary from the gate's set,
which can push previously-passing practice phrases into failure downstream. I did not re-derive
that campaign's blast radius; that is a gap, not a claim.

---

## 5. Order of work — by what a learner actually experiences

I do not agree with ranking Class D ("the word is taught, just later") first, and I do not agree
with the prior read's Class D count. Re-derived: **42 phrases across 17 seeds** have a blocked word
that *is* taught bare later. But **38 of those 42 are taught later as a COMPONENT, not a lego** —
`it` at 621, `that` at 322, `about` at 343, `were` at 385, `just` at 357. Only `know` (lego
S0346L03, 4 phrases) is a lego. So "move the introduction earlier" means "carve a component out of
an earlier chunk", which lands straight back on Kai's *mindfully* rule. And the sting is missing:
the learner meeting bare `it` at seed 176 has already heard `it` inside **11** taught chunks. They
are not stranded.

**What the learner actually experiences is governed by how often they have heard the word inside a
chunk, not by whether it later gets its own tile.** On that measure:

| tier | phrases | seeds | what it is |
|---|---|---|---|
| **Thin** — blocked word met in ≤2 chunks ever | **56** | 20 | the learner really may not have it |
| **Middling** — 3–9 chunks | 103 | 35 | judgement call |
| **Saturated** — 10+ chunks | 55 | 21 | heard constantly; a gate artefact |

**My order:**

1. **Answer the gate question (§1).** Nothing else can be priced until it is answered. If the
   answer is word-level, 27 of the 46 seeds close with no work at all.
2. **L1, containment — 10 phrases.** The only class with a consequence the learner can see on
   screen (ghost tiles), and the only one that does not depend on the gate answer.
3. **L2 / thin-exposure content words — 32 phrases.** Ranked by carrier count, thinnest first:
   `such`, `definitely`, `some`, `during`, `just`, `grandfather`. Read each one.
4. **The copula class — decide, do not fix.** 104 phrases, 31 seeds, 84 live. Under the word-level
   rule they are not defects. Under the whole-chunk rule the only fix is the "to be" components
   Kai has already declined. Either answer is fine; rewriting 84 live phrases is not, and would
   null 84 sets of clips.
5. **L3, bare-lego clones — 35 legos.** Mechanical, inherited, no learner harm. Settle the
   convention first.
6. **Saturated function words — 55 phrases.** I would not spend audio on these at all.

---

## 6. Calibration, and what I got wrong or could not see

**I hand-checked five seeds against the live rows before trusting any count.**

- **Seed 637.** Lego `S0637L01` "her bag" (type M, components `her` / `bag`, both with live
  component practice phrases `C01`/`C02`). Seven build/use phrases, all with all three clips, all
  live. Five of them use bare `is`. The word `is` is never taught as a lego or component anywhere
  in the course; its 25 earlier carriers are all chunks like `what is`, `what the answer is`.
  The gate's complaint is exactly right against the rule as written. Verified.
- **Seed 478.** `such` has one carrier (`such an obvious question`, seed 423), `grandfather` has
  one (`my grandfather fought`, seed 462), `has` has three — one of which is the alien component
  `has started`. All seven flagged phrases live. Verified by reading the rows.
- **Seeds 34, 136, 621** spot-checked the same way; all consistent.

**False-positive rate against the rule as written: 0 of 214.** Every flag is a genuine mismatch;
nothing here is a phantom. **But "true against the rule" is not "a defect"** — 0 of 214 asks for an
unheard word. Gate output is a reading list, not a verdict, and I have treated it as one.

**Where I correct the prior read:**
- Its Class D count (32 phrases, 14 seeds, framed as an ordering defect) is better stated as
  42 phrases / 17 seeds, and 38 of the 42 resolve to a later *component*, not a later lego. Its
  priority ranking of that class first does not survive the layer split.
- Its Class A recommendation ("teach is/are/was/were/have/has/did as chunks early") collides with
  Kai's ruling on "to be" components. That is the one recommendation I would not carry forward.
- Its counts were a photograph and have moved: 219 → 214 flagged phrases, 45 → 43 seeds carrying a
  vocabulary complaint. The 46 headline is unchanged.

**Gaps, stated plainly:**
- I did **not** re-derive the provenance/audit-log work; I took the prior read's 2026-09-01 rewind
  on trust and did not re-verify it. If that matters, it needs its own pass.
- I did **not** measure the downstream blast radius of job #323's six component merges. I can say
  the mechanism exists (components feed the vocab set); I have not counted what it broke.
- The course is live and was being edited during the 2026-09-03 read. My numbers are a photograph
  taken on 2026-09-04.
- Everything above is the *English* target side. I did not audit the Hindi known side.
