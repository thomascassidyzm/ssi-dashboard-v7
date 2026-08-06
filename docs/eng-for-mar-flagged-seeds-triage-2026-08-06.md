# eng_for_mar — the 18 flagged seeds, triaged

**2026-08-06. Read-only against the live Supabase DB. No content was changed, no audio touched, no TTS.**

## The answer in four numbers

| | |
|---|---|
| Flags still open | **18** — verified, count is right, none has been resolved |
| Real defects I could **confirm without reading Marathi** | **10 seeds**, 35 broken phrases |
| Defects I could **not judge** (need a Marathi speaker) | **8 seeds** |
| False flags I could clear | **0** |
| Seeds I fixed | **0** — and the reason is the point of this document |

Every one of the 18 needs a Marathi speaker before it can be repaired. Not one of them is
mechanically fixable. I explain why below rather than asking you to take it on trust.

---

## First: what the flag actually is

There is **no recorded reason for any of the 18 flags**, anywhere. `course_seeds` has a bare
`flagged_at` timestamp column and nothing else — no reason, no author, no note. I checked
`course_qa_flags` (0 rows for this course), `audio_flags`, `sample_flags`,
`audio_repair_candidates`, `build_jobs`, and the repo's docs and git history. Nothing describes
the 2026-07-30 pass that set them.

So "what is the flag, in plain English?" cannot be answered from the record. That is an
**explicit gap**, and it is the first thing worth fixing about the process: the flag field has
nowhere to write down *why*.

What I could establish:

- They were set in three bursts on 2026-07-30, 23:38 / 23:50 / 23:55, just after an audio-pass
  request whose reason reads *"regen complete — 650 approved, 18-seed rebuild queue (Kai)"*.
- The codebase's documented flag criterion (`services/briefs/final-pass.cjs`) is *"3+ phrases
  deleted, or a LEGO dropped below 4 USE phrases — flag for rebuild"*. **The 18 do not meet it
  today**: all 44 of their new LEGOs now carry 4–5 USE phrases. The only under-threshold LEGOs in
  the whole course are on seeds 1–3, which are unflagged. So whatever these are, they are not
  under-threshold flags.
- There **is** a recorded, reasoned flag set from earlier: 135 `content_feedback` rows written
  2026-07-06 by `phase8-presentation-author`, all unresolved. 15 of them land on 13 of the 18.
  That is a strong signal — those rows hit 28% of seeds in the 1–300 range generally, but 72% of
  the flagged ones. The 18 look like a triaged subset of that pass.

## The learners really are getting these

Verified, not assumed. `course_round_index` — the materialised view the learning app's
`round-map.ts` reads — filters on `is_new = true` **and nothing else**. It does not look at
`approved_at` or `flagged_at`. All 44 new LEGOs from the 18 flagged seeds are in it, at rounds
265–602 of 1,389. The course is `new_app_status='live'`, `visibility='public'`. So the flag
suppresses the seed in the dashboard grid and excludes it from mass-approve, and does **nothing**
to keep it away from a learner.

## How I separated real from false

I am not going to hand you a raw count. Criterion, stated up front:

> **A defect is CONFIRMED only if the evidence is language-free** — either (a) the English is not
> English, and English is the language this course teaches, so that is squarely judgeable here; or
> (b) the same Marathi byte-string is rendered two different ways inside the course, which is a
> ZUT violation visible without knowing what either rendering means.
>
> Anything that requires knowing what a Marathi chunk *means* is not judged. It goes to a speaker.

Checks I ran across all 668 seeds so the flagged 18 had a baseline to be measured against — this
is what stopped several plausible-looking findings from becoming false positives:

| Check | Result | Verdict |
|---|---|---|
| LEGO has ≥4 USE phrases | flagged seeds: all pass. Course: only seeds 1–3 fail | not the criterion |
| LEGO-level ZUT (one Marathi chunk → one English) | **0** violations course-wide | clean |
| Duplicate seeds | 1 (S0068/S0194, identical both sides) — unflagged | noted, not mine |
| LEGO chunk is a subsequence of its seed | fires on 238/1,407 LEGOs (17%) course-wide, 10/49 (20%) on flagged seeds | **too noisy to be evidence** — Marathi inflection trips it. Discarded |
| LEGOs tile the seed's English | fires on 391/668 seeds (59%) | **expected, not a defect** — LEGOs only cover *new* material. Discarded |
| Phrase contradicts its own LEGO card | 9 course-wide, 1 on a flagged seed | real, small |
| English-side proofread | **35 broken phrases on 10 of the 18** | the main finding |

The two discarded checks are the ones I would have shipped as findings if I had not baselined
them. They look damning on a single seed and are ordinary across the course.

---

## CONFIRMED — 10 seeds, evidence needs no Marathi

### The dominant defect: adverbial tags glued to fragments

A phrase generator has bolted tags — *very well, not sure, yet, tonight, already, again, in
English* — onto hosts that cannot take them. The result is not English, and the learner is being
drilled to produce it. **35 of the 362 phrases on the flagged seeds (9.7%).**

The tags themselves are usually fine — *"you speak English very well"* is real course vocabulary.
The defect is only the glue.

**S0123** *"I think that's a good idea."* — worst case, 8 phrases:
> I think that's very happy · I think that's very well · I think that's not sure · I think that's
> yet · I think that's a good idea yet · I think that's already in English · I think that's very
> happy tonight · because I think that's very well

**S0223** *"He's going to ask you tomorrow."* — 5:
> he's going to not sure · he's going to again · he's going to already · he's going to tonight ·
> he's going to ask you tomorrow very well

**S0269** *"Why don't you want to wait for your father?"* — 5:
> why don't you want? · to wait very well · for your father very well · why don't you want to wait
> very well? · why don't you want to wait for your father very well?

**S0118** — 4: *felt here · were in here · we were in here today · we were in here in English*
**S0248** — 3: *complete rubbish very well · and I want my money back very well · I thought the film was complete rubbish very well*
**S0114** — 2: *today than yesterday yet · I'm not sure yet I feel as if I'm doing worse*
**S0195** — 2: *on the table very well · the money I left on the table yet*
**S0245** — 2: *I've done tonight · happy with how much in English*

### S0149 — a negation dropped from the LEGO card

*"This isn't very difficult, so I hope you'll finish soon."*

The card for `S0149L02` reads **`फारसं अवघड नाही` → "very difficult"**. Its own five USE phrases
render the identical Marathi as *"this isn't very difficult"*. Four BUILD phrases follow the card
and drop the negation: *very difficult · very difficult in English · very difficult already ·
very difficult soon*.

Language-free evidence: one Marathi string, two English renderings, opposite polarity, in the same
seed. Five phrases and the seed itself say "isn't"; the card and four phrases say the reverse. I
am not asserting which is correct Marathi — only that they cannot both be.

### S0238 / S0237 — the same Marathi taught two ways, one seed apart

Both seeds carry a LEGO whose known side is byte-identical: **`त्याला वाटत होतं`**. Both cards
gloss it **"he wanted"**. S0237's five phrases agree with the card. **All eight of S0238's L01
phrases render it "he wanted you"** — *he wanted you · he wanted you again · he wanted you
already · he wanted you in English · he wanted you tonight · because he wanted you · I think that
he wanted you · I can't remember he wanted you*.

Straight ZUT violation: one known prompt, two target forms. The extra *"you"* corresponds to
`तुम्ही` in the seed, which is not in the chunk. Confirmed as a defect; **not** repairable here,
because the fix is either "strip the *you* from 8 phrases" or "re-chunk the LEGO to include
`तुम्ही`", and choosing between those is a decomposition call on Marathi.

### S0245 also has a cosmetic item

It is one of 20 seeds in the course whose text ends with no full stop, on both sides. Not a
learner-facing defect (punctuation is normalised away before speech) and not why it was flagged. I
did not touch it — see below.

---

## Why I fixed nothing — the internal-consistency check

This is step 2 of your ladder and it is the step that decided the whole job. I did the check
before editing, not after, and it says **don't**.

**1. The sanctioned repair is deletion, and deletion breaks the course.** `final-pass.cjs` is
explicit: *"NEVER use PATCH to edit phrases. Only delete."* So I costed the deletion. Deleting the
35 broken phrases drops four LEGOs below the 4-USE-phrase threshold:

| LEGO | USE now | after deletion | |
|---|---|---|---|
| S0123L01 | 5 | **0** | ✗ |
| S0223L01 | 5 | **2** | ✗ |
| S0118L02 | 4 | **2** | ✗ |
| S0248L01 | 4 | **3** | ✗ |

and empties `S0149L02`'s BUILD set entirely (4 → 0). Below 4 USE is *the documented condition for
flagging a seed for rebuild*. The fix would re-create the flag it was meant to clear. That is
precisely the "corrects one phrase but contradicts the teaching order" failure — so I stopped.

**2. Rewriting instead of deleting requires Marathi.** Every broken English phrase has a Marathi
prompt attached. Change the English and the pair no longer matches; change the pair and you are
authoring Marathi. Not available on this side.

**3. Any text edit silences a live learner.** Verified in the schema, not assumed. Triggers
`trg_null_lego_audio_on_text_change` and `trg_null_phrase_audio_on_text_change` fire BEFORE UPDATE
and re-point the clip via `audio_id_for_text(...)` — which returns an existing clip for the *new*
text if one exists, and **NULL** otherwise. There is no clip for text that has never been spoken.
So editing any of these on a live course leaves a silent slot until TTS runs, and TTS is outside
this job's approvals. That is make-before-break inverted.

The honest conclusion: **the correct repair for all 10 confirmed seeds is regeneration of the
phrase set by someone who reads Marathi, followed by a queued audio pass.** Not an edit.

---

## NEEDS A MARATHI SPEAKER — all 18, scaffolded

Ten need a speaker to *repair*. Eight need a speaker even to *judge*. Below is everything a
commissioned speaker needs, so nothing has to be re-derived.

**Important caveat on the glosses:** the "literal English" column below is quoted from the
2026-07-06 `phase8-presentation-author` flag comments. **It is a machine's claim about Marathi and
has never been checked by a speaker.** It is here as the accusation, not as a finding. Treat it as
the thing to verify, not the answer.

### The 8 I could not judge at all

| Seed | Marathi chunk | Learner is told it means | Literal gloss *asserted by the flagging agent* | Suspected problem | Rule at stake |
|---|---|---|---|---|---|
| S0159 | `सांगायचंय` | "trying to say" | "want to say" | Wrong modal. Seed is *"That isn't what I'm trying to say."* but the chunk may mean *want*, not *try* | Known side must mean what the learner is told |
| S0201 | `काय होणार आहे ते` | "what was going to happen" | future/prospective `होणार आहे`, and seed has `हे` where the chunk has `ते` | Tense mismatch (past gloss on a future form) **and** the chunk's final word differs from the seed | ZUT: one known → one target |
| S0204 | `तिने मदत करायला` | "her to help you" | "her to help" — no recipient | Gloss contains *you*; the chunk may not contain `तुम्हाला` | Chunk must license every word of its gloss |
| S0235 | `मी भेटलो ज्याने सांगितलं` | "I met someone who said that" | claimed to be a grammatically discontinuous split of a relative clause | The chunk may not be a legal standalone constituent | Chunks must be sayable in isolation |
| S0236 | `मदत करणार आहे` | "to try to help" | "is going to help" — missing `प्रयत्न करण्याचा` (*try*) | *try* may be absent from the Marathi entirely | Gloss must not add meaning |
| S0237 | `त्याला वाटत होतं` | "he wanted" | "he felt/thought" — *wanted* may need the embedded clause | Possible mis-gloss of the matrix verb | Known side is a controlled language too |
| S0124 | `चांगलं` (in `ते चांगलं होतं`) | "better" | elsewhere in the course `चांगली` is glossed "good" (S0123L02) | Same stem glossed *good* in one seed and *better* in another | Cross-seed consistency |
| S0241 | `मला ... द्यायचं नाही` | "I don't want" | `द्यायचं` is "to give"; the gloss drops the verb | The LEGO treats this as a discontinuous frame *"I don't want ___"*, and phrases insert unrelated verbs into it (*"I don't want to stop talking"*, *"I don't want to relax"*). Whether that frame is legal Marathi is the question | Decomposition legality |

### The 10 confirmed, and the specific question for the speaker

| Seed | What is confirmed (no Marathi needed) | What only a speaker can decide |
|---|---|---|
| S0123 | 8 phrases are not English | What the 8 replacement phrases should be in Marathi, given `मला वाटतं ती` = "I think that's" is a fragment that cannot host an adjective |
| S0223 | 5 phrases are not English | Same, for `तो विचारणार` = "he's going to" |
| S0269 | 5 phrases are not English, incl. *"why don't you want?"* | Whether `तुम्हाला का नाही?` is even a well-formed prompt on its own |
| S0118 | 4 phrases are not English (*"felt here"*, *"were in here"*) | Whether `इथे` is being glued to chunks that cannot take a locative |
| S0248 | 3 phrases are not English | Also: the LEGO known side is `सिनेमा खराब होता` but the seed reads `टाकाऊ` — a different word, not an inflection. Which is right? |
| S0114 | 2 phrases are not English | Also: card `वाईट करत होतो` → "feel as if I'm doing worse", flagged as literally "was doing worse" — the *feel as if* may belong to `मला...वाटतंय` |
| S0195 | 2 phrases are not English | Also: tense/person on `शोधण्याचा प्रयत्न` → "I'm trying to find" vs seed's `करतोय` |
| S0245 | 2 phrases are not English | Also: `किती केलंय` → "I've done" (literally "how much [I've] done"?) and `याबद्दल मी खूश` → "happy with how much" — the *how much* may sit in the wrong chunk |
| S0149 | Negation dropped: one Marathi string rendered both "very difficult" and "isn't very difficult" | Which is right, and whether `लवकरच` (card: "soon") is the same word as the seed's `लवकर` |
| S0238 | ZUT: `त्याला वाटत होतं` = "he wanted" in S0237, "he wanted you" in S0238's 8 phrases | Whether `तुम्ही` should be inside the L01 chunk, or the 8 phrases should lose the *you* |

---

## Step 3 — the same pattern elsewhere in eng_for_mar

**Reported, not fixed, per your ladder.**

**a) The tag-glue defect is course-wide.** The generator that produced the 35 broken phrases ran
over all 668 seeds. Course-wide tag counts: *in English* 719, *again* 431, *already* 243,
*tonight* 210, *not sure* 203, *yet* 178, *very well* 102. **Most of those are legitimate** — I
checked, and *"you speak English very well"*, *"I'm not sure what I mean"* are real course
content. There is no regex that separates the good from the bad; it needs reading. At the 9.7%
rate measured on the flagged seeds, an order-of-magnitude estimate is **several hundred broken
phrases course-wide** — but that is an extrapolation, not a measurement, and I am labelling it as
such. A read-only English-only proofread of the other 650 seeds is running now and its count will
follow separately.

**b) Phrases contradicting their own LEGO card — 9 course-wide, 8 of them unflagged:**

| LEGO | card says | a phrase with the identical known side says |
|---|---|---|
| S0215L01 | "on Saturday night" | "Saturday night" |
| S0161L02 | "on Sunday" | "Sunday" |
| S0136L01 | "course" | "of course" |
| S0502L01 | "right" | "to the right" |
| S0326L02 | "the company" | "company" |
| S0508L02 | "there's no point worrying about" | "there's no point worrying about this" |
| S0485L02 | "would make me" | "would make me happy" |
| S0521L02 | "you'll forget" | "you'll forget this" |
| **S0238L01** | "he wanted" | "he wanted you" ← *the flagged one* |

The eight unflagged ones are mostly articles and prepositions and are milder than S0238's. Worth a
pass; none is urgent.

**c) 135 unresolved `content_feedback` rows** from 2026-07-06 across 85 seeds. Only 13 of those
seeds were ever flagged. **72 seeds carry an unresolved recorded quality flag that nobody has
looked at**, and they are all in the first 300 seeds — the part every learner reaches.

**d) 20 seeds have no terminal punctuation** on either side (S0004, S0164, S0222, S0244, S0245,
S0334, S0530, S0560, S0639, S0643, S0645, S0647, S0648, S0656, S0659–S0663, S0668). Several are
deliberate fragments. Cosmetic.

**e) 10 seeds begin with a lowercase English letter**; S0068 and S0194 are exact duplicates of
each other on both sides. None flagged.

I swept **only eng_for_mar**, as instructed.

---

## Explicit gaps

1. **I do not know why any of the 18 were flagged.** No reason is recorded anywhere. Everything
   above is my own triage of the current content, not a resolution of the original complaint. If
   the 2026-07-30 pass was looking for something else, I have not found it.
2. **I cleared no flags as false, and I want to be plain that this is not the same as confirming
   all 18.** Eight of them I simply could not judge. They may well be fine. I have no basis either
   way, and guessing is the failure mode this rule exists to prevent.
3. **Every Marathi gloss quoted in this document is a machine's claim**, unverified by a speaker —
   including the ones I used to build the scaffolding tables.
4. **No clip in this course has ever been verified against its text**, by machine or by ear
   (`veracity_checked_at` is NULL for all of eng_for_mar; `audio_flags` has zero rows for it). So
   "the audio is fine" is unknown, not established.
5. **The 35 broken-English phrases are my judgement as an English speaker**, not a rule-based
   result. I listed them individually above so they can be disagreed with one at a time.

## Rollback

**Nothing to roll back. No database write was made — no INSERT, UPDATE or DELETE, on any table.**
The 18 flags are exactly as they were. No audio was generated, linked, unlinked or deleted. This
document and its query scripts are the only artefacts; the scripts live in the gitignored
`scripts/` workspace and are not committed.

## Recommendation

1. Commission a Marathi speaker on the 10 confirmed seeds first — they have concrete, listed
   defects and are live at rounds 265–602.
2. Then the 8 unjudgeable ones, using the scaffolding table.
3. Repair by **regeneration**, not by editing text in place, then queue an audio pass
   (`queue-audio-pass.cjs`). Editing in place silences live slots.
4. Separately: give `flagged_at` a reason field. This whole document exists because a timestamp
   cannot say why.

---

## Addendum — the course-wide sweep came back, and I cut its number by two thirds

The read-only English proofread of the other 650 seeds finished. It reported **568 bad-English
phrases across 218 seeds**. **I do not think that number is right, and I am not passing it on.**

**64% of its findings (377 of 586) are the tag `in English`, and that tag is the drill format, not
a defect.** Measured: `in English` appears in **719 phrases across 270 of the 668 seeds**,
concentrated in fixed template slots — U02 (234), B02 (136), B03 (100). That is a generated slot
that says *"…now say it in English"*, and it attaches to a bare fragment by design. Its findings
include *"last month in English"*, *"a few words in English"*, *"to stop in English"*,
*"difficult in English"* — all of which are ordinary course content. The same construction appears
on the 18 flagged seeds (*"before the weekend in English"*, *"me to tell you in English"*) and I
did **not** flag it there.

The sweep's own report named this bucket as its least rigorous — classifier-built and spot-checked
rather than hand-read, with a self-estimated 5–10% false-positive rate. The true rate is far
higher; I judge the bucket close to entirely false.

**What survives: 209 findings on the other four tags** — `very well`, `not sure`, `yet`,
`already`. Those were hand-reviewed, and the sample I checked is solidly right and matches the
defect class confirmed on the 18:

> for the council very well · no thank you already · their new baby yet · he was an old friend of
> my father very well · I'm not sure too busy today · have you heard very well? · I need to learn
> yet · can you tell me something else very well?

So the revised course-wide figure is **~209 broken phrases, not 568** — still roughly six times
the 35 found on the flagged seeds, and still a real course-wide defect worth acting on.

**The "60 LEGOs would drop below 4 USE phrases if deleted" figure is void**, because it was
computed over the inflated set. It needs recomputing against the 209 before it means anything.

Unchanged by this: the defect is real, it is course-wide, and deletion is still the wrong repair
for the same reason as before.
