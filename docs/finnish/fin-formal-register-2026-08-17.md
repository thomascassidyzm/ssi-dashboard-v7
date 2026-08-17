# fin_for_eng — the formal-register sweep, applied

**Date:** 2026-08-17 · **Course:** `fin_for_eng` · **Applied:** 59 phrases · **For Kai to rule on:** 53 · **Audio generated:** none

Kai's ruling of 2026-08-17 is the spec:

> "Yes, this should apply to all formal phrases. Just always add the formal tag, sir or madam. We should
> probably also say hänen in the formal ones, if it comes up in the seed? If it doesn't, then we
> shouldn't use sen in the formal phrases."

---

## The counts

| | |
|---|---|
| formal-register cards found | **19** (S0639 – S0667) |
| rows under them | 227 — of which **37 are component rows**, which the player never drills |
| **formal phrases** (build + use) | **190** |
| already carried a register signal | **79** |
| **lacked a signal** | **111** |
| **misused colloquial `sen`/`se` for a person** | **7** |
| **fixed today** | **59** |
| **on the judgement list for Kai** | **53** |
| already fine, untouched | 78 |

59 + 53 + 78 = 190.

## How a formal card was detected, and how that was calibrated

A formal card is a `course_legos` row whose English carries the `(formal)` tag. That found 19, in one
contiguous block, S0639–S0667.

Calibrated both ways before it was trusted:

- **known formal** — `S0654L01` `i'm not sure (formal)` → *en ole varma*: found. ✅
- **known informal** — `S0010L01` `I'm not sure` → *mä en oo varma*, and 40+ other `sä`-form cards
  (`S0013L01 you speak` → *sä puhut*, `S0072L01 you're doing well` → *sä pärjäät hyvin*): none
  matched. ✅ There is no `(informal)` tag anywhere in the course — informal is the unmarked default.
- **the near-miss** — three cards outside the block use a `te`-form without the tag (`S0133L02 you
  work` → *te teette töitä*, `S0501L03`, `S0529L01`). These are **plural** *you*, not formal
  *you*, and are correctly untagged. See the "you all" section below, which is the same point.

Every one of the 19 has a taught informal counterpart earlier in the course, so the ambiguity Kai is
fixing is real in every case: with no signal in the English, the learner answers in the register they
were taught first and is marked wrong.

## The `hänen` question is settled, and the answer is no

**`hän` in any form appears nowhere in `fin_for_eng`.** Zero occurrences across all 1,425 lego cards,
all 14,123 phrases and all 668 seeds. This is not an oversight in the formal block — it is a
course-wide choice: 1,911 phrases use a third-person human pronoun and every one of them uses
colloquial `se`, which is what spoken Finnish does.

So Kai's condition *"if it comes up in the seed"* is never met, anywhere, and the fallback governs
throughout: **no `sen` in formal phrases.** All 7 offending phrases therefore go to the judgement
list rather than being silently rewritten, because every available fix either changes what the phrase
means or introduces a pronoun the course has never taught.

One deliberate reading, stated so it can be overruled: **`sen`/`sitä` for an inanimate *it* was left
alone.** `te teette sen` ("you're doing it"), `voisitteko te sanoa sen` ("could you say that") — `se`
is the only word Finnish has for *it*, there is no register contrast, and Kai's ruling is about
*his/her*. Only the 7 phrases where `se` stands for a **person** were counted as misuse.

---

## What was applied — the walk

59 phrases across 14 baskets. The pattern is the basket's own: the register is carried **inside the
sentence**, `, sir` → `, herra` and `, madam` → `, rouva`, placed before any question mark, exactly as
the basket's existing `haluatteko te kahvia, herra?` does. 35 took *sir*, 24 took *madam*, chosen to
balance each basket and to avoid duplicating a prompt already in it.

**S0642L01** `how are you (formal)` → *miten te voitte* — 6 phrases. *`rouva` is not yet taught here
(it debuts at S0642**L02**, the next card in the same seed), so this basket takes `herra` only.*

| English, now | Finnish, now |
|---|---|
| I asked how you are, sir | mä kysyin, miten te voitte, herra |
| I know how you are, sir | mä tiedän, miten te voitte, herra |
| I heard how you are, sir | mä kuulin, miten te voitte, herra |
| how are you today, sir? | miten te voitte tänään, herra? |
| how are you this morning, sir? | miten te voitte tänä aamuna, herra? |
| I want to know how you are, sir | mä haluun tietää, miten te voitte, herra |

**S0643L01** `do you want (formal)` → *haluatteko te* — 5 phrases: *do you want coffee, madam* →
haluatteko te kahvia, rouva · *do you want something, madam* → haluatteko te jotain, rouva · *do you
want water, sir* → haluatteko te vettä, herra · *do you want a cup of coffee, madam* → haluatteko te
kupin kahvia, rouva · *do you want a cup of tea, sir?* → haluatteko te kupin teetä, herra?

**S0644L01** `could you (formal)` → *voisitteko te* — 5: *could you say, madam* → voisitteko te
sanoa, rouva · *could you come back, madam* → voisitteko te tulla takaisin, rouva · *could you wait,
sir* → voisitteko te odottaa, herra · *could you go, madam* → voisitteko te mennä, rouva · *could you
speak more slowly, sir?* → voisitteko te puhua hitaammin, herra?

**S0645L01** `you (formal)` → *teitä* — 2: *I can see you, sir* → mä nään teitä, herra · *i'd like to
help you, sir* → mä haluaisin auttaa teitä, herra

**S0646L01** `you're doing (formal)` → *te teette* — 5: *you're doing something, madam* → te teette
jotain, rouva · *you're doing work, sir* → te teette töitä, herra · *you're doing it, madam* → te
teette sen, rouva · *you're doing it well, sir* → te teette sen hyvin, herra · *you're doing something
good, sir* → te teette jotain hyvää, herra

**S0647L01** `you speak (formal)` → *te puhutte* — 3: *you speak it, sir* → te puhutte sitä, herra ·
*you speak with me, sir* → te puhutte mun kanssa, herra · *you speak a lot, sir* → te puhutte paljon,
herra

**S0648L01** `you said (formal)` → *te sanoitte* — 4: *you said that, sir* → te sanoitte sen, herra ·
*you said it well, madam* → te sanoitte sen hyvin, rouva · *you said it again, sir* → te sanoitte sen
uudestaan, herra · *I don't remember what you said, madam* → mä en muista, mitä te sanoitte, rouva

**S0649L01** `are you (formal)` → *oletteko te* — 4: *are you tired, madam* → oletteko te väsynyt,
rouva · *are you here, sir* → oletteko te täällä, herra · *are you ready to leave, madam* → oletteko
te valmis lähtemään, rouva · *are you surprised, sir?* → oletteko te yllättynyt, herra?

**S0650L01** `do you want to leave (formal)` → *haluatteko te lähteä* — 5: *do you want to leave now,
sir* → haluatteko te lähteä nyt, herra · *do you want to go home, sir* → haluatteko te lähteä kotiin,
herra · *do you want to leave soon, madam* → haluatteko te lähteä pian, rouva · *do you want to leave
together, sir* → haluatteko te lähteä yhdessä, herra · *do you want to leave today, madam* →
haluatteko te lähteä tänään, rouva

**S0651L01** `you are (formal)` → *te olette* — 4: *you are ready, madam* → te olette valmis, rouva ·
*you are tired, sir* → te olette väsynyt, herra · *you are here, madam* → te olette täällä, rouva ·
*you are brave, sir* → te olette rohkea, herra

**S0652L01** `you need (formal)` → *te tarvitsette* — 4: *you need help, madam* → te tarvitsette apua,
rouva · *you need water, madam* → te tarvitsette vettä, rouva · *you need some more time, sir* → te
tarvitsette lisää aikaa, herra · *you need money, sir* → te tarvitsette rahaa, herra

**S0653L01** `do you mind (formal)` → *haittaako teitä* — 4: *do you mind if I ask, madam* → haittaako
teitä, jos mä kysyn, rouva · *do you mind if I speak, madam* → haittaako teitä, jos mä puhun, rouva ·
*do you mind if I'm here, sir* → haittaako teitä, jos mä oon täällä, herra · *do you mind coming, sir*
→ haittaako teitä tulla, herra

**S0654L01** `i'm not sure (formal)` → *en ole varma* — 4: *i'm not sure yet, madam* → en ole varma
vielä, rouva · *i'm not sure about this, sir* → en ole varma tästä, herra · *i'm not sure what you
said, madam* → en ole varma, mitä te sanoitte, rouva · *i'm not sure if it's ready, sir* → en ole
varma, jos se on valmis, herra

**S0655L02** `you're doing well (formal)` → *te pärjäätte hyvin* — 4: *you're doing better, sir* → te
pärjäätte paremmin, herra · *you're doing well now, madam* → te pärjäätte hyvin nyt, rouva · *you're
doing well with it, sir* → te pärjäätte hyvin sen kanssa, herra · *in my view you're doing very well,
sir* → mun mielestä te pärjäätte tosi hyvin, herra

### A convention this change shifts, on purpose

Before today the basket signalled register on **use** phrases only; the **build** rungs carried no
signal in any of the 15 singular cards. Kai's ruling is *always*, and the learner-harm test agrees: a
build rung like *you're doing something* has a taught informal answer (*sä teet jotain*, S0134L02),
so the learner is just as wrong there as in a use phrase. 45 of the 59 fixes are build rungs. If Kai
wants build left bare, that is a clean revert of those 45.

---

## The judgement list — 53 phrases, nothing applied

### 1. Seed 639 — 9 phrases that cannot carry a signal at all

`S0639L01` `with you (formal)` → *teidän kanssanne*. The word `herra` is taught at `S0639L02` — the
**very next card in the same seed**. The player orders cards by `lego_index` within a seed
(`ssi-learning-app/api/courses/[code]/cycles.ts:578`), so at L01 the learner has not met it yet.
The course's own authors respected this: `S0642L01` uses `herra` freely but never `rouva`, which
debuts at `S0642L02`. So these 9 have no available signal word:

*to go with you* → mennä teidän kanssanne · *to be with you* → olla teidän kanssanne · *to stay with
you* → jäädä teidän kanssanne · *to work with you* → tehdä töitä teidän kanssanne · *i'd like to speak
with you* → mä haluaisin puhua teidän kanssanne · *can I speak with you?* → saisinko mä puhua teidän
kanssanne? · *I want to go with you* → mä haluun mennä teidän kanssanne · *it would be great to speak
with you* → olisi hienoa puhua teidän kanssanne · *i'd like to be with you* → mä haluaisin olla teidän
kanssanne

**Option A (recommended).** Swap the two cards in seed 639 so `sir` → *herra* is L01 and `with you
(formal)` is L02. Then all 9 take `, sir` → `, herra` like every other basket. It is a structural edit
— `lego_index` on two cards and the phrase ids beneath them — so it is Kai's call, not housekeeping.

**Option B.** Tag the English only: *to go with you (formal)*, no Finnish change. Precedent already
exists in the basket at `S0644L01#13` and `S0649L01#13`. Costs nothing structurally, but bakes a
parenthetical into `known_text`, which the estate has had to clean out of other courses.

### 2. Seven phrases using colloquial `se` for a person inside a formal frame

`hänen` is available nowhere, so rule 2's fallback applies to all seven.

| where | English | Finnish now |
|---|---|---|
| S0642L01#12 | he wants to know how you are | se haluu tietää, miten te voitte |
| S0644L01#13 | could you ask her? (formal) | voisitteko te kysyä siltä? |
| S0645L01#2 | she can help you | se voi auttaa teitä |
| S0645L01#4 | he wants to help you | se haluu auttaa teitä |
| S0654L01#12 | i'm not sure what his name is | en ole varma, mikä sen nimi on |
| S0660L01#6 | she can help you all | se voi auttaa teitä kaikkia |
| S0660L01#7 | he wants to help you all | se haluu auttaa teitä kaikkia |

`S0654L01#12` is the one #861 flagged — it was applied this morning by the his/her expansion, and it
is the only one of the seven that is new today. The other six pre-date it.

**Option A — one decision that fixes all seven.** Introduce `hän` as a card in the formal block, e.g.
at S0645: `he/she (formal)` → *hän*, `his/her (formal)` → *hänen*. The block is the natural home for
it, and it is the only place in the course where the colloquial `se` actually clashes with the
register being taught. This is an addition to the course, so it needs Kai.

**Option B — restructure each away from the third person.** Proposed wording, Finnish shown plainly:

- S0642L01#12 → **I heard how you are, madam** → *mä kuulin, miten te voitte, rouva*
- S0644L01#13 → **could you ask, madam?** → *voisitteko te kysyä, rouva?*
- S0645L01#2 → **I want to help you, madam** → *mä haluun auttaa teitä, rouva*
- S0645L01#4 → **i'd like to see you, madam** → *mä haluaisin nähdä teitä, rouva*
- S0654L01#12 → **i'm not sure what your name is, sir** → *en ole varma, mikä teidän nimenne on,
  herra*. ⚠️ This one needs a Finnish ruling from Kai regardless: the course writes possession without
  the suffix (*sen nimi*), but the formal card it sits under uses the suffix (*teidän kanssa**nne***).
  *nimenne* is the register-consistent form and is not otherwise taught. If Kai would rather add
  nothing, **dropping the phrase** is clean — it is one day old and the basket does not depend on it.
- S0660L01#6 → **I want to see you all** → *mä haluun nähdä teitä kaikkia*
- S0660L01#7 → **i'd like to help you all today** → *mä haluaisin auttaa teitä kaikkia tänään*

### 3. The four "you all (formal)" cards — 36 phrases. Recommendation: **no change**

`S0658L01`, `S0659L01`, `S0660L01`, `S0667L01` are tagged `(formal)` but are **plural**, and Finnish
has no formal/informal contrast in the plural — *te kaikki* is the only way to say *you all*, polite
or not. The course proves this itself: `S0657L01 you all` → *te kaikki*, `S0661L01`, `S0662L01`,
`S0663L01`, `S0665L01` are the **same Finnish forms with no `(formal)` tag**. And *sir* / *madam*
cannot address a group in English, so the convention has nothing to attach to.

There is nothing for the learner to disambiguate here, so no signal is needed. What is arguably wrong
is the **tag**: dropping `(formal)` from those four cards' English would make them read like their
untagged siblings. That is a card edit and Kai's call.

### 4. Three build rungs where a vocative would collide

Adding `sir` or `madam` would make these byte-identical to a use phrase already in the same basket:

- `S0645L01#1` **I can help you** — *I can help you, sir* is #6 and *I can help you madam* is #5
- `S0652L01#4` **what do you need** — *what do you need sir?* is #9 and *what do you need, madam?* is #10
- `S0654L01#4` **i'm not sure about it** — *…, madam* is #8, and *…, sir* would give Finnish identical
  to #11 *i'm not sure about that, sir* → *en ole varma siitä, herra*

Proposal: leave all three unsignalled as the bare rung sitting directly under the card — the card
itself carries `(formal)` — or reword them. Kai's call.

---

## Gates — re-run at apply time, and a real bug found

Same harness as the his/her apply (`docs/finnish/fin-hisher-apply-2026-08-17.md`), adapted for
in-place updates and run against a fresh dump: 668 seeds / 1,425 legos / 14,123 phrases. Every gate
was run **twice** — once over the original text, once over the proposed text — so the number that
matters is the *delta*.

| Gate | before | after |
|---|---|---|
| containment | 2 fail | 2 fail (**same two rows, pre-existing**) |
| `checkVocabViolations` (DP tiling) | 14/14 PASS | 14/14 PASS |
| `checkPhraseZUT`, prior seeds | 0 collisions | 0 collisions |
| `checkPhraseZUT`, whole course, no cutoff | 0 collisions | 0 collisions |
| `checkKnownSide` breaches | 1 | 1 (**same row, pre-existing**) |
| `checkBasketFrameCoverage` | 0 | 0 |
| `checkPhraseComplexity` | 14/14 baskets FAIL | 14/14 FAIL — **0 broken, 0 fixed** |
| NFC / control / zero-width | clean | clean |
| intra-seed lego-order of the vocative | — | 59/59 PASS |

**Delta: zero.** The three blocking failures are identical before and after, and are properties of the
original phrases:

- `S0653L01 "do you mind coming"` — unknown gloss `coming`. The gate does no stemming, so *coming* is
  not *come*. Present with and without the edit.
- `S0655L02` — *te pärjäätte paremmin* and *mun mielestä te pärjäätte tosi hyvin* do not contain their
  own card *te pärjäätte hyvin*. A real pre-existing defect in that basket, untouched here.

The complexity gate's 14/14 failure is the same standing condition the his/her job recorded: the
baskets already fail with nothing changed, overwhelmingly `LONG: need 3+, got 0`.

### The harness paging bug is real, and it is in the live submit route

#861 flagged that the shared harness pages `course_legos` with `.range()` and **no `.order()`**. The
his/her job re-ran with ordered paging and got the same answer either way, so the bug was unproven.
**Here it fires.** Run as shipped, the known-side gate reports a **fourth** blocking failure —
`S0644L01 "could you come back, madam" — unknown gloss "back"` — which **disappears** with ordered
paging. PostgREST offset paging without an ORDER BY can return one row twice and drop another, so the
context silently loses a lego and the gate rejects a gloss the course really did introduce. On
`fin_for_eng`'s 1,425 legos it crosses the 1,000-row page boundary and does exactly that.

This is not only in the scratch harness — the same three lines are the **production submission path**,
`services/course-builder/routes/seed-complete.cjs:37`. Any agent submitting a seed to a course with
more than 1,000 prior legos can be rejected for a word the course taught. **Fixed in this branch**
(one line: `.order('seed_number').order('lego_index')`), with the measurement in the comment.

## Verification after the write

Against a full pre-apply backup of all 14 touched seeds
(`.a74-scratch/fin-formal-register/backup.json`):

- **all 14 seeds UNCHANGED** on `status`, `approved_at`, `flagged_at`, `version`, `known_text`,
  `target_text`, `updated_at`, `decomposed_at` — **zero seeds unapproved as a side effect**
- approval snapshot, unchanged before and after: 0/14 carry `approved_at`, all 14 are
  `status='released'` (that is how they already were — this course's seeds are released without an
  `approved_at` stamp)
- all **17 lego cards** byte-identical
- all **132 untouched phrases** in those seeds byte-identical
- all **59 edited rows** carry exactly the proposed text, NFC-clean on read-back, with **no unexpected
  column change and no audio link moved**
- course total **14,123 → 14,123** — an in-place edit adds no rows
- course-wide ZUT sweep over all 14,123 phrases (ordered paging, unicode-aware): 199 English prompts
  have more than one Finnish answer, **0 of them involve a phrase edited today**

The write ran in a single transaction, each `UPDATE` guarded by `where id = … and known_text = … and
target_text = …` so a row that had drifted since the gate run would abort the whole apply rather than
be silently overwritten. `content_audit_log` holds the full OLD row for all 59, so this is reversible.

`courses.content_stamp` moved to 2026-08-17T11:35Z — the legitimate cache-invalidation effect of the
`touch_content_stamp` trigger, and nothing more.

## Audio

**None generated, none required, nothing deleted.** Verified rather than assumed: `fin_for_eng` has
313 `course_audio` rows and every one is `language='eng'` (238 known, 48 instruction, 26
encouragement, 1 welcome). **Zero Finnish audio.**

The `trg_null_phrase_audio_on_text_change` trigger re-resolves `known_audio_id` whenever `known_text`
changes, which would normally cost an English prompt clip per edit. Checked first: **all 190 formal
phrases carry zero audio links** on any of the three columns, so there was nothing to lose, and the
post-write check confirms no link moved.

No audio pass was queued, for the same reason the his/her job gave: the course is 100% unvoiced on the
target side, so a pass would push ~14,000 phrases into the render queue. That is a cost decision for
Kai, not housekeeping.

## Learner impact

None. `courses.status='draft'` and `new_app_status='not_available'`; the catalogue gate is
`new_app_status IN ('live','beta')` (`ssi-learning-app/api/courses/available.ts:35`).

## Noted in passing, not acted on

- **`S0654L01#10` is a mistranslation.** *i'm not sure if it's ready* → *en ole varma, jos se on
  valmis*. `jos` is the conditional *if*; Finnish wants *onko se valmis* for *whether it's ready*.
  Pre-existing; the `, herra` was appended to it unchanged rather than quietly fixing a second thing.
- **`S0655L02` has two rungs that do not contain their own card** (above). A real basket defect.
- **English vocative punctuation is inconsistent in the pre-existing phrases** — *I can help you
  madam* (#5) beside *I can help you, sir* (#6). All 59 new ones use the comma form; the ~14 older
  ones were left alone rather than widening the change.
- **199 English prompts course-wide already have more than one Finnish answer.** Pre-existing, none
  touched today, and worth its own pass.

## Explicit gaps

- **Nothing here has been read by a Finnish speaker.** The 59 applied edits are a mechanical vocative
  append onto text a Finnish author wrote; the judgement list's proposed wordings are mine and are
  proposals, not applied content.
- **`nimenne` vs `nimi`** (judgement item 2) is a genuine Finnish question I cannot settle. Flagged,
  not guessed.
- The `(formal)` tag is the only machine-readable marker of register in this course — the
  `course_practice_phrases.register` column exists and is **NULL on all 14,123 rows**. If a formal
  card exists without the tag *and* without a `te`-form, this sweep would not have found it. The
  `te`-form cross-check found no such card.
