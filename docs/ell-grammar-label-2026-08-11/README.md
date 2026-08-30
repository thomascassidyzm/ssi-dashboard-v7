# Greek grammar labels — the source was already clean, the damage was in the phrase layer

**2026-08-11 · course `ell_for_eng` (Greek for English speakers) · 57 database rows changed, no audio generated, nothing merged**

Kai asked for four things: find the grammar labels in the Greek source text, strip them, resolve
the ZUT collisions the stripping causes, and cost the re-render. Here is what was actually there.

---

## The headline

**The premise I was given is wrong, and I can prove it.** There are **zero** grammar labels in the
Greek course's source text. Not in the LEGOs, not in the practice phrases, not in the seeds:

| Table | Rows checked | Rows containing a bracket of any kind |
|---|---|---|
| `course_legos` | 1,023 | **0** |
| `course_practice_phrases` | 8,065 | **0** |
| `course_seeds` | 668 | **0** |

There is nothing to strip. Someone cleaned the source months ago. What they did **not** do is
carry that cleanup through to the two places that quote the source: the spoken intro clips, and
the practice phrases that belong to each LEGO. Both were left saying the old words.

So the job was not "strip labels". It was **finish a cleanup that stopped halfway**, in two places:

1. **The intro clips** — 70 of them still speak the label out loud. A parallel session landed this
   half at 13:58 today (see *Who did what* below); I verified their work rather than repeat it.
2. **The practice phrases** — 57 of them still carried the pre-cleanup English, which broke the
   ZUT rail on 29 counts. **This is the part nobody had touched, and it is what I fixed.**

**The re-render bill is 74 clips, 2,179 characters, $0.0087.** Under a penny. The number Kai is
approving is not really a money decision — see *The bill* below.

---

## What was wrong in the phrase layer, and why it matters

Modern Greek has no infinitive, so a bare English "to make" is genuinely ambiguous — the Greek
verb ending changes with who is doing it. The original course tried to solve this with a bracketed
label read aloud. The cleanup replaced that with the right answer: **natural English that carries
the person**. `to make (you, present)` became `for you to make`. No brackets, no explanation, the
distinction carried by the sentence itself. That is exactly the house method.

But that rewrite landed on the LEGO only. The LEGO's own practice phrase kept saying `to make`.
So the course ended up teaching this:

| The learner is shown | and must produce |
|---|---|
| "to make" | να κάνεις |
| "to make" | να κάνω |
| "to speak" | να μιλάει · να μιλήσω · μιλάω · να μιλάνε |
| "to learn" | να μάθεις · να μαθαίνεις · να μάθω · να μαθαίνει |

One English prompt, four different Greek answers, no way to know which. That is the ZUT rail
broken — and it is very likely the deeper cause of the forum complaint, not just the spoken
bracket.

### What I changed

**57 rows in `course_practice_phrases`, column `known_text` only.** For each one the rule was
mechanical and provable from the row's own LEGO:

> If a practice phrase sits at its LEGO's own position, carries that LEGO's target Greek
> **exactly**, and its English has drifted from the LEGO's English — then the phrase *is* the
> LEGO, and it must say what the LEGO says.

All 57 are BUILD phrases. Examples:

```
S0148L03B01   "to answer"     ->  "for me to answer"     (να απαντήσω)
S0091L04B01   "to answer"     ->  "for you to answer"    (να απαντήσεις)
S0286L03B01   "to speak"      ->  "for them to speak"    (να μιλάνε)
S0224L03B01   "to learn"      ->  "for him to be learning" (να μαθαίνει)
```

Full per-row log: `zut-propagation-applied-log.json`. Pre-edit snapshot of all 8,065 phrase rows
for rollback: `phrases-before-snapshot.tsv`.

**Result, reconciled on two independent audits:**

| Audit | Before | After | Resolved |
|---|---|---|---|
| My phrase-level check | 91 groups | 62 | **29** |
| The repo's canonical `audit-phrase-zut.cjs` | 102 groups | 73 | **29** |
| Component target-membership (untouched control) | 31 | 31 | 0 — bit-identical |

The two audits agree exactly, and the bucket I did not touch did not move. The simulation before
applying confirmed the edit creates **zero** new collisions; the apply refused to proceed
otherwise.

### This part cost nothing in audio, and that is the interesting bit

Every one of the 57 phrases was **already pointing at an English clip that spoke the corrected
wording**. The clip for `S0047L05B01` has always said *"for you to make"*; only the text said
*"to make"*. So the learner was already hearing the right thing while reading the wrong thing.

**57 of 57 need no new audio.** I deliberately left `known_audio_id` in place rather than nulling
it — nulling would have traded a mismatch for silence, which is the make-before-break rule
inverted.

---

## What is still broken: 62 collision groups I did not cause and did not fix

The remaining 62 groups are a **different defect with a different cause**, and I am not going to
pretend otherwise. They are person and aspect forks in USE phrases — one under-specified English
sentence rendered two ways in Greek:

```
"I think it's good to make mistakes"  ->  νομίζω ότι είναι καλό να κάνω λάθη
                                      ->  νομίζω ότι είναι καλό να κάνεις λάθη

"do you want to learn the truth?"     ->  θέλεις να μάθεις την αλήθεια;      (one-off)
                                      ->  θέλεις να μαθαίνεις την αλήθεια;   (habitual)
```

These were not created by the label removal — the label never lived in a phrase. They are real ZUT
breaks and they need Greek judgement, not a script. **Worker #177 is triaging all 62 right now**
with full evidence and will report a per-group resolution plus its own added clip count and cost.

I have not folded that into the number below, deliberately: Kai should approve the label spend on
a stable figure, and decide the aspect-fork work separately once it is priced.

---

## The bill

Measured on the **audio**, not the text — every clip's TTS word-boundary record lists the tokens
actually voiced, so "did the learner hear the bracket" is a fact, not an inference.

| | Clips | Characters | Cost |
|---|---|---|---|
| **B1** text already corrected today, audio still speaks the tag | 16 | 482 | $0.0019 |
| **B2** tag still in both text and audio | 54 | 1,555 | $0.0062 |
| **B3** no tag, but the spoken headword drifted from its LEGO | 4 | 142 | $0.0006 |
| **TOTAL** | **74** | **2,179** | **$0.0087** |

Azure S0 neural at $4 per 1M characters (`services/audio-generation-planner.cjs:24`). All 74 are
English intro clips in `en-GB-SoniaNeural`. Staged, itemised, per-clip:
`ell_for_eng-regen-queue-STAGED.json`. **No TTS was run. No `course_audio` row was written.**

**Why 74 and not 47 or 70.** 70 clips audibly speak the label. 4 more speak a headword their LEGO
no longer uses (`"to make"` where the LEGO now says `"for me to make"`) — same defect, no bracket
involved, and they would have been missed by a bracket-only search.

**Be honest about what this approval is.** Eight-tenths of a cent is not a spending decision. The
real cost is the render being done correctly — right voice, right text, verified before the old
clips are touched. Approve it as a *risk* decision, not a *budget* one.

### The free alternative, and why I do not recommend it

54 of the 74 (bucket B2) have already been made unreachable through
`course_legos.presentation_audio_id`, which now points at a clean twin clip belonging to another
LEGO with the same English. I verified all 54 relinks: **54 of 54 point at a clip whose spoken
headword matches the LEGO's own text.** That work is sound.

But the player does not use that column. `CourseDataProvider.getIntroductionAudio()` resolves the
intro by `lego_id` and ignores the link entirely — so **all 74 are still reachable on the path a
learner is actually on**. You could close this for $0 by teaching the player to honour the link
instead. I would not: it leaves 54 rows in the database that speak a defect, one read path away
from being live again, in exchange for saving less than a cent.

---

## Who did what today — two sessions, same brief, no conflict

A parallel session landed `159a8d43` on `fix/ell-presentation-label-strip-2026-08-11` at 13:58,
while I was working. It reached the same premise finding independently (source text clean) and
took the presentation-clip half: 16 clip texts corrected, 54 LEGOs relinked to clean twins, zero
audio generated. I checked their work rather than redo it, and it holds.

**One thing to be aware of in it.** Correcting `course_audio.text` without re-rendering leaves 16
rows whose text is clean while the mp3 still speaks the label. That is the defect *hiding itself*
from any text-based detector. Their commit is explicit that the render is pending, which is fine —
but it is exactly why the bill above is measured on word-boundary records rather than the text
column, and why those 16 are bucket B1 rather than "already fixed".

Our two changes do not overlap: they touched `course_audio.text` and
`course_legos.presentation_audio_id`; I touched `course_practice_phrases.known_text`. Nothing was
written twice.

---

## Standing doctrine, as Kai asked

> **A presentation clip must always say what its LEGO now says.** Any text fix that leaves a
> presentation clip speaking the old wording is not a complete fix. Whatever clips derive from
> text you changed come into the same pass — flagged for regeneration with a count and a cost, not
> deferred as somebody else's follow-up.

Recorded in `docs/architecture/AUDIO_PIPELINE_ARCHITECTURE.md` §6c and `docs/DECISIONS.md`.

This course is the worked example of the failure it prevents. The label cleanup fixed the LEGO
text and stopped. Five months later the clips were still speaking labels, 57 phrases were still
teaching a broken ZUT rail, and it took a forum complaint to surface any of it.

---

## Things I could not settle

1. **Every Greek judgement here is mechanical, not a Greek speaker's.** The 57 edits copy English
   that was already in the LEGO, so no new Greek claim is made. But five of the LEGO glosses I
   propagated read poorly in English and a native ear should rule on them:
   `to be understanding` (S0077L03), `to grasp` (S0074L04), `me to stop` (S0019L03),
   `you to keep going` (S0120L03), `you to tell me` (S0150L01). These were already the LEGO's
   words and already spoken in its intro clip — I made them consistent, I did not introduce them.
2. **Which read path a live learner is on is still unestablished** — the same gap the 2026-08-06
   diagnosis reported. It decides whether the 54 relinks are a real fix or only a partial one.
3. **The 62 remaining collisions are counted, characterised and dispatched, not resolved.**
   Worker #177 owns them.
4. **Two figures from the 2026-08-06 diagnosis do not reproduce and I did not chase them** (the
   "38 NULL links" and the "42 residual" counts), per my brief. The `559 of 559, zero wrong-person`
   result does reproduce and I relied on it.
5. **Phrase IDs in this course are inconsistently prefixed** — most are `el_for_eng:S…`, at least
   one is `ell_for_eng:S…`, while the course code is `ell_for_eng` throughout. Cosmetic today,
   but it will break any tool that parses the course out of a phrase ID. Not in scope, flagging it.

---

## Reproducing this

Read-only probes in the gitignored `scripts/` workspace: `_ell_scan.cjs` (the scan-course
structural checks), `_ell_drift.cjs` (clip vs LEGO text), `_ell_zut_triage.cjs` (collision groups
with full evidence), `_ell_bill.cjs` (the re-render bill). The one script that writes is
`_ell_zut_apply.cjs`, dry-run by default, `APPLY=1` to write, with per-row before-state assertions
that abort on drift.
