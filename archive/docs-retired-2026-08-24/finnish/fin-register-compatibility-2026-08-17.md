# fin_for_eng — register compatibility, swept as a class

**Date:** 2026-08-17 · **Course:** `fin_for_eng` · **Applied in this pass: nothing** · **Seed repairs required: 0 for `sen`, 2 for the general rule** · **Audio: none affected, verified**

Kai's sharpened ruling, which supersedes rule 2 of the original brief:

> "if a formal register seed uses sen, we should change the seed to use hänen, [and] the lego should
> include the formal tag (sir, madam). If none of the seeds actually introduce his or her [in the
> formal register], then we just don't use his or her in the practice phrases. Sen is clearly informal
> so it's not available for use in the formal register phrases. Same for any other informal legos that
> haven't had formal versions introduced. They're just not compatible."

---

## The headline

**No formal-register seed uses `sen` for a person.** Rule 1 fires zero times, so there are no `sen`
seed repairs and no audio cascade to run. The condition in the second sentence is the one that holds:
the formal register never introduces a his/her equivalent, so **formal practice phrases simply do not
use his/her** — 7 phrases to clear, by absence.

**The general rule is where the course actually breaks.** Sweeping for *any* informal-only lego, not
just `sen`, finds that **the formal block has no formal first person at all**. `minä`, `minun`,
`minua` are taught nowhere in the course; neither is `hän`. **52 of 206 formal phrases** are built out
of colloquial first-person material — `mä voin`, `mä oon`, `mun kanssa`, `mua`. Under Kai's rule they
are all incompatible.

**And the fix is not a phrase patch.** I built the obvious repair — drop the subject pronoun,
`mä oon` → `olen`, which the course's own formal seeds and one formal phrase already do — and put it
through the real gates. It produces **40 new blocking failures** the current text does not have. The
course teaches `mä voin` and `mä oon` as *indivisible chunks*, so a phrase with the pronoun removed no
longer tiles against taught vocabulary. Giving the formal block a first person is a **course-build
task — new lego cards inside the block** — not an edit to the phrases. That is the decision for Kai.

## The counts

| | |
|---|---|
| formal-register cards | **21** — 17 polite-singular, 4 "you all" |
| **drilled formal phrases** | **206** (166 singular, 40 plural) |
| register-**clean** — no informal-only lego at all | **150** |
| **carrying at least one incompatible informal lego** | **56** |
| ├ A. `se`-family for a **person** | 7 |
| ├ B1. subject pronoun `mä` | 40 |
| ├ B2. `mun` / `mua` in an oblique or object slot | 9 |
| ├ C. contracted colloquial verb (`oon`, `haluun`, `nään`) | 16 |
| └ D. informal 2nd person `sä`/`sun`/`sua` | **0** |
| union needing formal **first-person** material (B1∪B2∪C) | **52** |
| formal **seeds** that are themselves defective | **3** (S0655, S0660, S0668) — only S0655 addresses a polite singular |
| applied in this pass | **0** |

Classes overlap — 56 is the union, not the sum.

## ⚠️ A gap in my first pass, now closed

My first sweep scoped formal cards by the literal `(formal)` tag and found 19. **Two formal cards
carry no tag**: `S0639L02` `sir` → *herra* and `S0642L02` `madam` → *rouva*. Every phrase under them is
formal-register, and there are **16 of them**, which the first pass never examined. They are included
here. All 16 already carry a register signal (the vocative *is* the card), so the first deliverable's
rule-1 counts stand — but its scope statement was wrong by two cards, and this is where the sharpest
evidence turned out to live.

---

## Rule 1 — formal seeds using `sen`: **zero**

Every seed in the block, 639–667, was read. Four carry a `se`-family word:

| seed | English | Finnish | verdict |
|---|---|---|---|
| S0644 | could you say **that** sir? | Voisitteko te sanoa **sen**, herra? | inanimate — *that* |
| S0647 | you speak **it** madam | Te puhutte **sitä**, rouva | inanimate — *it* |
| S0659 | could you all say **that** | Voisitteko te kaikki sanoa **sen** | inanimate |
| S0662 | you all speak **it** | Te kaikki puhutte **sitä** | inanimate |

Animacy is decided from the **English** side, which is unambiguous in all four: *that* and *it*, never
*he/she/his/her*. `se` is the only word Finnish has for *it* and carries no register contrast, so none
of these is a defect.

**Therefore: no seed text changes for `sen`, no derived-lego cascade, no phrase cascade, no audio
re-render.** The blast-radius duty is discharged by not having to incur it.

The blast radius was checked rather than assumed, so the answer is on the record for the next job:
`course_seeds` carries `known_audio_id`, `target1_audio_id`, `target2_audio_id`, and **all 29
formal-block seeds have all three NULL**. The live triggers on `course_seeds` are exactly three —
`audit`, `touch_content_stamp`, `version` — and **none of them touches audio**, confirming that a seed
text edit would silently strand a clip on a course that had any. This one does not.

## Rule 2 — his/her in formal phrases: absence, 7 phrases

`hän` in any form is absent from the entire course: 0 across 1,425 legos, 14,123 phrases and 668
seeds. So the formal register never introduces a his/her equivalent, and Kai's ruling is that the
phrases simply do not use one.

Walk of the seven, with the third person removed rather than substituted. Finnish shown plainly.

| where | now | proposed |
|---|---|---|
| S0642L01#12 | **he wants to know how you are** · se haluu tietää, miten te voitte | **I heard how you are, madam** · kuulin, miten te voitte, rouva |
| S0644L01#13 | **could you ask her? (formal)** · voisitteko te kysyä siltä? | **could you ask, madam?** · voisitteko te kysyä, rouva? |
| S0645L01#2 | **she can help you** · se voi auttaa teitä | **I want to help you, madam** · haluan auttaa teitä, rouva |
| S0645L01#4 | **he wants to help you** · se haluu auttaa teitä | **i'd like to see you, madam** · haluaisin nähdä teitä, rouva |
| S0654L01#12 | **i'm not sure what his name is** · en ole varma, mikä sen nimi on | **drop it** — or *i'm not sure what your name is, sir* · en ole varma, mikä teidän nimenne on, herra |
| S0660L01#6 | **she can help you all** · se voi auttaa teitä kaikkia | **I want to see you all** · haluan nähdä teitä kaikkia |
| S0660L01#7 | **he wants to help you all** · se haluu auttaa teitä kaikkia | **i'd like to help you all today** · haluaisin auttaa teitä kaikkia tänään |

Three of these proposals use `haluan` / drop `mä`, which is exactly the material rule 3 says the block
does not have — so **they are blocked behind the rule-3 decision below**, and none is applied. The
honest short answer for all seven, available today with no new material, is **delete the phrase**.
`S0654L01#12` is the one #861 flagged; it is one day old and nothing depends on it, so deleting it is
clean.

`nimenne` still needs a Finnish ruling: the course writes possession bare (*sen nimi*), but the card
it sits under uses the suffix (*teidän kanssa**nne***).

## Rule 3 — the general class. This is the real finding

### The formal block has no first person

Measured across the whole course, not assumed:

| standard form | occurrences in fin_for_eng |
|---|---|
| `minä` / `minun` / `minua` / `minulle` | **0 / 0 / 0 / 0** |
| `hän` / `hänen` / `häntä` | **0 / 0 / 0** |
| `sinä` / `sinun` | **0 / 0** |
| `haluan` (I want) | **0** |
| `näen` (I see) | **0** |
| `olen` (I am) | **1** |

That single `olen` is the whole of the evidence, and it is worth reading:

> `S0639L02#3` **I'm here, sir** → **olen täällä, herra**

Two seeds later, the same sentence:

> `S0642L02#3` **i'm here madam** → **mä oon täällä, rouva**

Identical English, opposite register, sixteen phrases apart.

### ⚠️ Correction: the pronoun drops are noise, not intent

An earlier draft of this page read the seeds `S0645` *Voin auttaa teitä, rouva* and `S0654` *En ole
varma, voinko auttaa teitä, herra* as **deliberately** dropping the pronoun, and set them against
`S0655` / `S0660` which keep it. **Adversarial verification (#881) refuted that**, and the correction
matters because it was load-bearing:

- Course-wide, the 1sg pronoun is dropped about **3% of the time** — `voin` appears in 73 phrases
  outside the block and **71 of them carry `mä`**; 1sg negation `en` appears 1,067 times and 1,035
  carry `mä`.
- The killer counterexample is on the card itself: **`S0645L01B01` is "mä voin auttaa teitä"** — the
  seed's own sentence *with* the pronoun, first build rung under the seed that drops it. A deliberate
  register decision is not contradicted by the first phrase beneath it.
- The block's high `en`-drop rate (15 of 17) comes from **one card**, `S0654L01` *en ole varma*, whose
  phrases all inherit that seed's wording — one authoring choice replicated, not a pattern.

So the drops are authoring variation, not a formal alternative the learner was given. **This
strengthens the conclusion rather than weakening it**: pronoun-drop was never taught, which is exactly
what the gate run proves independently below.

### The obvious repair fails the course's own gates

Kai's test is whether a formal version was introduced. For `mä` it arguably was — as **pronoun-drop**,
in the two seeds and the one phrase above. So I built that repair: 32 determinate rewrites, dropping
the subject pronoun and taking `mä oon` → `olen` on the `S0639L02#3` precedent. Run through the same
harness as the applied pass, ordered paging, against the live text:

| | current text | after pronoun-drop |
|---|---|---|
| blocking failures | **0** | **40** |

Two failure modes, both fatal and both instructive:

- **vocab tiling** — *olen pahoillani, herra* is untileable: the course teaches `mä oon` as one chunk
  and has no `olen` chunk to tile against. Same for *voin*, *kysyn*, *olen täällä*. 7 phrases.
- **ZUT** — the rewritten Finnish collides with the English→Finnish mapping the course already
  teaches elsewhere: *I can help you*, *I'm sorry sir*, *do you mind if I ask*, and 30 more.

So pronoun-drop is **not** a formal version the learner has been given. It is a form the authors used
twice by hand without ever teaching it.

### What that means

**52 of the 206 formal phrases cannot be made register-compatible by editing phrases.** The formal
block needs first-person cards of its own — a formal *I can* → `voin`, *I am* → `olen`, *I'd like to*
→ `haluaisin`, *I want* → `haluan`, *with me* → `minun kanssani`, *me* → `minua` — introduced inside
the block before the phrases that use them. That is a course-build job in seeds 639–655, and it is
Kai's call whether the block gets one.

Three ways out, for Kai:

1. **Build the formal first person.** Add the cards, then the 52 phrases become correct and the two
   defective seeds can be repaired. Most work, and the only option that makes the block internally
   consistent.
2. **Rule that the speaker stays colloquial.** Teitittely marks the *addressee*; a shop assistant
   really does say *mä voin auttaa teitä*. On this reading only class A (the 7 third-person phrases)
   is a defect, the other 49 are fine, and the two odd seeds should gain `Mä`/`Mun` rather than lose
   it — making `S0645`, `S0654` and `S0639L02#3` the outliers to fix, not the model.
3. **Leave it and record the decision.** The course is unpublished; nothing reaches a learner.

I am not the one to choose between 1 and 2 — that is a native-speaker call about how far the formal
register extends, and it decides the fate of 49 phrases either way. **Option 2 is the smaller change
and matches how the course was overwhelmingly authored**: every `mä`-carrying formal phrase keeps the
pronoun, and the handful of drops are, on #881's base rates, indistinguishable from the 3% the course
drops everywhere else. Restricting to the least arguable case — phrases carrying colloquial
`mä`/`mun`/`mua` **and** a `herra`/`rouva` vocative in the same sentence, so the addressee is
unambiguously a polite singular — the count is **29 phrases across 9 seeds** (639, 642, 643, 644, 645,
647, 648, 653, 655). That is the number to rule on if you want the narrowest defensible scope.

### The defective seeds — three, not two

| seed | now | addressee | under option 1 | under option 2 |
|---|---|---|---|---|
| **S0655** | I think that you're doing very well, madam · **Mun mielestä** te pärjäätte tosi hyvin, rouva | polite **singular** | *Minun mielestäni…* (needs `minun` + the `-ni` suffix, neither taught) | no change |
| **S0660** | I can help you all · **Mä voin** auttaa teitä kaikkia | plural | *Voin auttaa teitä kaikkia* | no change |
| **S0668** | I hope you'll all be able to go · **Mä toivon**, että te kaikki pystytte menemään | plural | drop `Mä` | no change |

**S0668 was missed by my own boundary.** I swept 639–667; the formal material runs to 668. #881 found
it, and it has the identical shape to S0660. Corrected here.

Note what the addressee column does to this: **only S0655 is colloquial-1sg meeting a genuinely
*polite* addressee.** S0660 and S0668 address *you all* — plural, where Finnish has no register
contrast at all — so under the reading in option 2 they are not defects in any sense.

Nothing is applied. All three are seed edits, and under the standing rule a seed edit is adversarially
verified before it is applied — job **#881**, whose findings are folded in throughout this page.

If S0655 or S0660 is repaired, the cascade duty for this course is small and known: all 29 formal-block
seeds carry **no audio links at all**, the course has **zero Finnish audio**, and `course_seeds` has no
audio trigger — so the repair is a text edit plus a check of the derived legos and phrases, with
nothing to re-render.

---

## A fourth finding, from the verification: the `(formal)` tag is unreliable both ways

#881 was asked to refute my scope. It did, and turned up a class neither pass had looked at.

**The tag is on cards that are not polite, and missing from cards that teach the same morphology.**
Four of the 19 tagged cards are plural (`S0658`, `S0659`, `S0660`, `S0667` — their own English says
*you all*), while the structurally identical `S0656`, `S0657`, `S0661`, `S0662`, `S0663`, `S0665`,
`S0666`, `S0668` carry no tag. So `(formal)` marks 4 of 12 plural cards essentially at random.

**And five cards outside the block teach `te`/`-tte` address with no tag and, in two cases, a bare
English *you*:**

| card | English | Finnish |
|---|---|---|
| `S0133L02` | **you work** | te teette töitä |
| `S0501L03` | **you play together** | te pelaatte yhdessä |
| `S0529L01` | can you all | voitteko te kaikki |
| `S0529L02` | to put up | nostaa *(phrases: "voitteko te kaikki nostaa sen?")* |
| `S0529L03` | your hands | **kätenne** *(2pl possessive)* |

`S0133L02` and `S0501L03` are the serious ones. A learner meets **you work → te teette töitä** at seed
**133** — five hundred seeds before the formal block — with nothing in the prompt saying whether that
`te` is polite or plural. (Plural was intended: `S0133L02`'s first practice phrase glosses `te` as
*you all*. The card itself does not say so.) That is a known-side ambiguity of exactly the kind this
whole job exists to remove, and it sits outside every scope either pass defined.

My scope claim was therefore **wrong as stated** — "19 tagged + 2 vocatives is the complete formal
set" is only true if you accept the tag as the definition of formal. The corrected polite-singular
count is unchanged at **17** (15 genuinely-singular tagged cards + the 2 vocatives), which is the
number this page's counts already use, so the 206-phrase denominator stands.

## What the verification confirmed, and what it broke

| claim | verdict |
|---|---|
| `hän` appears nowhere, any form, incl. JSON columns | **survives** — 0 across 15 column/table combinations |
| `minä`/`minun`/`minua`/`sinä`/`sinun` are zero | **survives** — 0, course is uniformly colloquial |
| no formal **seed** uses the se-family for a person | **survives at seed level**; the 7 *phrases* do, which is this page's class A |
| the formal set is 19 tagged + 2 vocatives | **refuted** — see above |
| exactly two seeds mix colloquial 1sg with formal address; S645/S654 drop deliberately | **refuted** — three seeds, and the drops are 3%-base-rate noise |

Two caveats #881 raised that weaken the first survival as evidence of care rather than of fact:
`target_text_roman` is **NULL on all 668 seeds, all 1,425 legos and all 14,123 phrases**, and
`decomposition` / `display_tiling` are **NULL on all 14,123 phrases** — those columns could not have
hidden a counterexample because they hold nothing at all. The token-level cross-check is the real
evidence: every token in the course containing `hän` is `vähän`, `tähän`, `myöhään`, `tietääköhän` and
the like — the `-hän` clitic, never the pronoun.

Two further facts worth keeping: **0 of 668** seeds carry any audio id (course-wide, not just the
block), and `course_seeds_version_trigger` is **unconditional** — `version` counts touches, not edits,
so the block's versions of 12–16 say nothing about how often it was really changed.

## Method and gaps

Every count here is measured against a live dump pulled at the start of this pass (668 seeds / 1,425
legos / 14,123 phrases), unicode-aware throughout, with ordered paging on every read. Animacy of the
`se`-family is decided from the English side, never guessed from the Finnish. The gate comparison is a
before/after delta on the same harness, not an absolute count.

**Gaps, explicitly:**

- **No Finnish speaker has read any of this.** Every proposed wording is mine and none is applied.
- **The `mä`-with-`te` question is a native-speaker judgement I cannot settle**, and it decides 49 of
  the 56 findings. I have given the evidence both ways rather than picking.
- **My intra-seed lego-order checker mis-flags the vocative cards themselves** — `S0639L02`'s own
  phrases use *herra* because *herra* is that card. Five such flags in the run above are checker
  artefacts, not content defects. The check is still correct for every other basket.
- **`(formal)` is not a trustworthy register marker** — it is on 4 plural cards and missing from 8
  identical ones, and from five `te`-teaching cards outside the block. The `register` column on
  `course_practice_phrases` is NULL on all 14,123 rows. Every scope on this page is therefore a
  *judgement* about which cards are formal, not a lookup, and #881 moved that judgement once already.
- **`S0133L02` / `S0501L03` are outside this job's remit but are a real defect** — bare English *you*
  against a `te`-form, 500 seeds before the register is ever explained. Not swept, not fixed, flagged.
- **Nothing in this pass was written to the database.** The 59 vocative fixes from the first pass
  remain applied and unaffected.
