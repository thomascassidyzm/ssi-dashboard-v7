# eng_for_mar — the broken English, repaired

**2026-08-06.** 34 phrases rewritten on 10 live seeds. Text is fixed and live. **No audio has been
generated** — 98 clips are needed and are waiting on your approval. Full revert is one command.

---

## The four numbers

| | |
|---|---|
| Broken phrases rewritten | **34** |
| Left flagged as too uncertain to touch | **1 package** (S0237/S0238) + 1 item reclassified as a false positive |
| New clips now needed | **98** — *not generated, not queued for generation, awaiting your approval* |
| Seeds still at risk of re-flagging | **0** |

---

## What I actually did, in English

Kai cannot judge the Marathi, so here is every change with the English side plain. The Marathi for
each is in `docs/audio/mar-repair/proposal-main.json` with its evidence and a confidence label.

### S0123 — the worst seed. Every one of its five USE phrases was broken.

| before | after |
|---|---|
| I think that's very happy | I think that's a good thing |
| I think that's yet | I think that's a good thing in English |
| I think that's very well | I think that's a very good idea |
| I think that's not sure | I'm not sure, but I think that's a good idea |
| I think that's already in English | Yes, I think that's a good idea |
| because I think that's very well | because I think that's a good thing |
| I think that's very happy tonight | I think that's a good idea now |
| I think that's a good idea yet | I'm not sure that's a good idea |

### S0223 — the tag had eaten the verb

| before | after |
|---|---|
| he's going to not sure | he's going to ask you |
| he's going to again | he's going to ask you again |
| he's going to tonight | he's going to ask you tonight |
| he's going to already | I think that he's going to ask you |
| he's going to ask you tomorrow very well | he's going to ask you tomorrow, but I'm not sure |

### S0269 — including the phrase that wasn't a question

| before | after |
|---|---|
| why don't you want? | why don't you want to wait? |
| to wait very well | I don't want to wait |
| for your father very well | to wait for your father |
| why don't you want to wait for your father very well? | why don't you want to wait for your father tomorrow? |
| why don't you want to wait very well? | why don't you want to wait tonight? |

### S0118 — "here" had been invented; it is nowhere in the seed

| before | after |
|---|---|
| felt here | felt okay |
| were in here | we were in the pub yesterday |
| we were in here today | I felt better when we were in the pub |
| we were in here in English | we were in the pub last week |

### S0149 — the dropped negation

The Marathi `फारसं अवघड नाही` contains `नाही`, which is *not*. The English said the opposite.
**On the first two rows the Marathi is unchanged — only the English was wrong.**

| before | after |
|---|---|
| very difficult | isn't very difficult |
| very difficult in English | isn't very difficult in English |
| very difficult already | that isn't very difficult |
| very difficult soon | isn't very difficult today |

### S0248, S0245, S0195, S0114 — the rest

| seed | before | after |
|---|---|---|
| S0248 | complete rubbish very well | it was complete rubbish |
| S0248 | I thought the film was complete rubbish very well | I thought that the film was complete rubbish |
| S0248 | and I want my money back very well | I want my money back today |
| S0245 | I've done tonight | I've done a lot in a short time |
| S0195 | on the table very well | it's on the table |
| S0195 | the money I left on the table yet | the money I left yesterday |
| S0114 | today than yesterday yet | worse today than yesterday |
| S0114 | I'm not sure yet I feel as if I'm doing worse | I'm not sure, but I feel as if I'm doing worse |

---

## How the Marathi was made, and how confident I am

You authorised best-effort Marathi judgement with online reference. In the event I barely needed
the internet, because there was a better source: **this course's own well-authored sentences.**
The seed-level Marathi in eng_for_mar is good; it is the generated BUILD/USE glue layer that is
broken. So the method was:

> Build every replacement out of Marathi that this course already attests — the seed's own known
> text first, then a LEGO card introduced at or before that seed — and change word order only
> where a well-formed course sentence shows the same order.

**31 of 34 are HIGH confidence, and most of those are near-verbatim recombinations of the seed's
own Marathi.** Three are MEDIUM, every one of them for the same narrow reason — adverb placement —
and each is labelled in the JSON as an explicit gap. (It was six until the cross-check below
replaced three of them with better-grounded alternatives.)

Two judgements are worth your eye because they are the ones that shaped the work:

**Gender agreement.** `मला वाटतं ती` has a feminine `ती` baked into it, agreeing with `कल्पना`
("idea", feminine). That is why "I think that's very happy" was broken on *both* sides, and it is
why almost every S0123 replacement ends in a feminine noun — `चांगली कल्पना` or `चांगली गोष्ट`
(S47). The obvious English fixes were mostly illegal in Marathi. Basis: in-course attestation —
S47 `ही चांगली गोष्ट आहे`, S163 `ते रंजक आहे` (neuter), S123's own seed.

**`वाट पाहणे` is one verb.** S0269 splits it across two LEGOs — `वाट` into L1, `पाहायची` into L2.
That is not a legal split, and no phrase-level repair fixes it. I repaired the five broken phrases
into well-formed Marathi anyway, but **the S0269 cards remain wrong and that seed needs
re-decomposition, not phrase repair.**

### The independent cross-check — three other authors, same 35 phrases

I did not want my own Marathi to be the only judgement on this, so three separate authors worked
the same list from the same brief, blind to my drafts. That gave a real check rather than a
self-review.

**They converged with me on eight items — several with byte-identical Marathi arrived at
independently**, including `मला वाटतं ती चांगली गोष्ट आहे`, `ते फारसं अवघड नाही`,
`तो आज रात्री तुम्हाला विचारणार आहे`, `मला वाट पाहायची नाही` and `तुमच्या वडिलांची वाट पाहायला`.
Independent convergence on the exact string is the strongest evidence available without a speaker,
and it raises my confidence on those specifically.

**They independently reached the same verdict on the false positive** — `happy with how much in
English` was left untouched by both of us, for the same reason.

**Three of their choices were better than mine and I took theirs.** Each removed a judgement I had
had to label as a gap, at no extra clip cost:

| | mine (withdrawn) | adopted | why theirs is better |
|---|---|---|---|
| S0118 | felt better today | **felt okay** | `ठीक` is invariant — no agreement, no adverb-placement judgement |
| S0118 | we were in the pub with my friends | **we were in the pub last week** | S52 attests `गेल्या आठवड्यात` in exactly this slot; mine rested on comitative vs locative order |
| S0195 | I left it on the table | **it's on the table** | avoids the `ठेवणे` = "put" vs English "leave" mismatch entirely |

Where we differed elsewhere I kept mine, and the reasons are on the record — mostly that their
alternative drifted from the seed's own meaning (`better` where the seed is about doing *worse*),
changed person without cause (`we thought`, `she's going to`), duplicated a phrase already present
on the same LEGO, or was rated MEDIUM by its own author where mine was HIGH.

One genuine toss-up, unresolved and not worth blocking on: on S0149 they preferred *"not very
difficult"* where I wrote *"isn't very difficult"*. Both restore the negation, which was the actual
defect. I kept mine because the seed itself and the five sibling USE phrases all say "isn't".

### Explicit gaps

1. **No Marathi speaker has read any of this.** Every judgement is mine, grounded in in-course
   attestation. "Good, unverified" is exactly what this is.
2. **Three MEDIUM items are adverb-placement judgements** from in-course word order, not from an
   external grammar reference: S0114L01B03, S0123L01U05, S0195L02B02.
3. **I found six LEGO cards that are themselves mis-glossed** and did *not* fix them, because a
   card fix is a decomposition call:
   - S0223 L1 `तो विचारणार` glossed "he's going to" — it already contains the verb *ask*.
   - S0118 L2 `पबमध्ये होतो` glossed "were in" — it already contains *the pub*.
   - S0248 L2 `सिनेमा खराब होता` — `खराब` appears nowhere in the seed; the generator invented it.
   - S0245 L1 `किती केलंय` glossed "I've done" — `किती` is *how much*.
   - S0195 L2 `ठेवलेले` glossed "the money I left" — the noun `पैसे` is missing from the chunk.
   - S0269 L2 `पाहायची नाही` glossed "to wait" — it carries a negation the gloss hides.
   - S0114 L2 `वाईट करत होतो` is past tense; the seed is present (`करतोय`).
4. **The audio has never been verified against its text** for this course (`veracity_checked_at`
   is NULL course-wide). Unchanged by this work.

---

## What I deliberately did NOT do

**One item I removed from the list of 35: `happy with how much in English` (S0245).** Its only
defect is the trailing "in English" — which is the drill format, not a defect, exactly as your own
correction to the 568-phrase sweep established. Changing it would have repeated the known mistake.
Left alone. That is why this document says 34, not 35.

**S0237 / S0238 — the ZUT violation is real, and I am not fixing it here.** Both seeds carry
`त्याला वाटत होतं`, both cards gloss it "he wanted", and all eight of S0238's L01 phrases render it
"he wanted **you**". The stray *you* corresponds to `तुम्ही` in the seed, which no LEGO accounts for.

The fix I believe is right, from the course's own symmetry — S0237's L2 is `मी सांगावं` ↔ "me to
tell you", so S0238's L2 should be `तुम्ही काल सांगावं` ↔ "you to tell me yesterday", leaving L1
as plain "he wanted" and restoring ZUT. **I did not apply it.** It changes a LEGO card, not just
phrases, and card changes are decomposition calls. My confidence is medium, not high. It is
written up in full and it is yours to approve. Worth knowing: two of the eight phrase edits it
implies would cost **zero** clips, because "he wanted" and "I can't remember he wanted" are already
spoken in S0237.

**The ~209 course-wide phrases on the other four tags are untouched**, as briefed — reported, not
fixed. Same for the eight seeds that need Marathi judgement I could not ground.

---

## Consistency check — run before writing, and again after

| check | result |
|---|---|
| Any LEGO below 4 USE phrases after the change? | **No.** All 23 affected LEGOs held their count exactly (replacement, not deletion). |
| Duplicate English within a LEGO? | **None.** |
| New ZUT violations introduced course-wide? | **Zero.** 137 before, 137 after, and a set-difference confirms none added and none removed. |
| Any seed now meeting the documented rebuild-flag criterion? | **No.** |
| Live text reads back as intended? | **Yes**, all 34 verified against the database after writing. |

**No seed is at risk of re-flagging.** This is the thing that blocked the repair before: deletion
would have dropped four LEGOs below the threshold and re-created the flag it was meant to clear.
Rewriting instead of deleting is what avoided it.

---

## THE AUDIO — 98 clips, and 34 slots are silent right now

This is the part that needs you.

The `trg_null_phrase_audio_on_text_change` trigger re-points a clip on any text edit, and returns
NULL when no clip exists for the new text. So **the 34 rewritten phrases are silent to live
learners until audio is generated.** That is the cost of the fix, it was unavoidable, and it is
precisely bounded: I verified that these 34 rows are the *only* silent rows in the entire course.

| | |
|---|---|
| Marathi (`known`) clips needed | **32** |
| English `target1` clips needed | **33** |
| English `target2` clips needed | **33** |
| **Total** | **98** |
| Rows that re-linked existing audio for free | 2 (S0149 B01/B02 — the Marathi was already correct, only the English was wrong) |

**I have not run any TTS and have not started any batch.** Per the standing doctrine I have
*queued* the audio-pass request instead, so the edit cannot silently rot into a missing-audio
backlog:

```
eng_for_mar — "broken-English repair: 34 tag-glue + dropped-negation phrases
                rewritten across 10 flagged seeds (2026-08-06)"  rows=34
```

Queueing is not generating. **Nothing will be spoken until you approve the batch.**

### The call that is yours

98 clips of silence on a live course, versus 34 phrases drilling learners to say "I think that's
very happy". I have taken the first because you asked for the text fixed and the count reported.
If you would rather the course go back to broken-but-audible while the batch waits, the revert is
one command and takes seconds:

```
node scripts/mar/revert.cjs --apply
```

It restores the original text *and* the original audio ids for all 34 rows from
`docs/audio/mar-repair/applied-log.json`, which records the pre-repair state of every row.

---

## Files

- `docs/audio/mar-repair/proposal-main.json` — 30 repairs with per-item evidence, confidence and gaps
- `docs/audio/mar-repair/proposal-D-s0149.json` — the 4 dropped-negation repairs
- `docs/audio/mar-repair/proposal-E-adopted.json` — the 3 alternatives adopted from the cross-check
- `docs/audio/mar-repair/proposal-A.json` / `-B` / `-C` — the three independent authors' full proposals
- `docs/audio/mar-repair/applied-log.json` — **the rollback record**: before-text and before-audio-ids for all 34
- `docs/audio/mar-repair/dryrun-log.json` — the pre-flight run
- `scripts/mar/revert.cjs` — the revert
- `scripts/mar/consistency.cjs` — the threshold / duplicate / ZUT check

## Recommendation

1. Approve the 98-clip batch, or revert. Either is fine; leaving it as-is is the one bad option.
2. Then decide S0237/S0238 — it is written up and ready.
3. Then the ~209 course-wide, which is the same generator's damage at six times the scale.
4. S0269 needs re-decomposition regardless; its phrases are now correct but its cards are not.
