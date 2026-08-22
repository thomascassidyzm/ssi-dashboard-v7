# Deborah's Basque gloss bug — what it actually is, and what I did

2026-08-12

## The short version

Deborah is right that the gloss is on the wrong word, and the cause is positional —
but the position is not the one we guessed.

We guessed the words were zipped positionally (first Basque word ↔ first English word).
They are not. What is positional is the **LEGO slot**. Every phrase carries a stored
per-word breakdown, computed once when the phrase was written, and each piece of it is
bound to a slot id like `S0006L02` carrying whatever gloss that slot held at that moment.
Re-author the LEGO in that slot, or renumber the slots, and the frozen gloss stays put —
now labelling a different word. The player renders those stored strings verbatim, so it
goes straight to the learner.

## The evidence, on the actual row

`eus_for_eng` seed 6 currently holds:

| slot | Basque | English |
|---|---|---|
| S0006L01 | hitzak | words |
| S0006L02 | hitz bat | a word |

The stored breakdown of the first practice phrase, `hitz bat esan nahi dut`
("I want to say a word"), was this:

```
hitz  → S0006L01 → "word"
bat   → S0006L02 → "a"     ← and this is what the app highlighted as the NEW thing
esan  → (no lego, no gloss)
nahi dut → S0001L01 → "I want"
```

Both glosses disagree with the slots they name. Those two slots used to hold
`hitz`='word' and `bat`='a' as separate LEGOs; someone later re-authored them into
`hitzak`='words' and `hitz bat`='a word', and the breakdown never caught up. So the
intro says "the Basque for 'a word' is *hitz bat*", and then the very next card
highlights **bat** alone as the new LEGO and glosses it "a".

Seed 30 shows the same failure a notch worse — the slots *shifted*, so 62 blocks keyed
`S0030L01` were glossed "yesterday" while that slot now holds "to ask".

Where it reaches the screen: `LearningPlayer.vue`, the block commented
"Strategy 0 (authoritative)" — served blocks are rendered directly, gloss and all,
in preference to any runtime matching.

**One honest gap:** Deborah reported the pair the other way round (hitz→'a', bat→'word');
the stored data has hitz→'word', bat→'a'. The pairing is broken either way and the fix
resolves both readings, but if she has a screenshot it is worth a look, in case there is a
second placement bug in how the gloss is centred under a run.

## Blast radius

Measured by content, every course, every stored block (1,508,826 blocks across 178 courses):

- **21,952 blocks carry a gloss that disagrees with the LEGO they name — 1.45%.**
- `eus_for_eng` was 543 blocks over 502 phrases (3.6%) — mid-pack, not special.

Worst affected:

| course | blocks | stale | % |
|---|---|---|---|
| eng_template | 10,851 | 8,401 | 77.4% |
| fra_for_eng | 33,714 | 2,691 | 8.0% |
| ita_for_eng | 27,420 | 1,614 | 5.9% |
| zho_for_eng | 17,396 | 988 | 5.7% |
| eng_for_kor | 10,974 | 581 | 5.3% |
| ara_for_eng | 10,925 | 555 | 5.1% |
| jpn_for_eng | 6,830 | 344 | 5.0% |
| eus_for_eng | 14,958 | 543 | 3.6% |
| spa_for_eng | 53,289 | 1,663 | 3.1% |

21 courses are completely clean.

**Word-order divergence is not the discriminator.** jpn 5.0% and kor 5.3% are high, but
hin is 0.8% and tur is low — while fra, ita and spa, all word-order-close to English, are at
the top. The thing the leaders have in common is **edit churn**: fra/ita/spa are the courses
that went through the big content sweeps. Every one of those edits moved a LEGO under a
frozen gloss. That is the real generator, and it means the defect grows every time we
sweep a course.

## Why nobody caught it

There *is* a drift detector — `GET /api/admin/decomposition-audit/:courseCode` and
`POST /api/admin/decomposition-backfill`. It keys staleness off
`decomposition_course_version < courses.version`.

Only **178,018 of 613,801** decomposed phrases estate-wide carry that stamp at all (29%).
A NULL stamp fails the `<` test silently. For `eus_for_eng` the endpoint reported **49**
stale rows. By content there were **502**. The detector was under-reporting by ten times,
and reporting a small clean number is exactly what stops anyone looking.

The backfill also calls plain `decomposeText`, not `decomposeAnchored`, so even when it did
fire it could not restore a lost salient anchor.

## What I fixed

New tool: `tools/course-optimization/refresh-stale-phrase-decompositions.cjs`.
It keys off **content** — a block is stale when its stored gloss disagrees with the current
`known_text` of the slot it names — and recomputes with `decomposeAnchored`.

Applied to `eus_for_eng`:

- 447 phrases rewritten; **543 → 46** stale blocks.
- The 46 residual reconcile exactly to the 44 rows the tool deliberately declined: 43 where
  the phrase does not cleanly contain its own LEGO (a real content defect — logged for
  triage, not papered over) and 1 whose `target_text` is trailing whitespace.
- 358 of the 447 are a genuine learner-visible change; the other 89 were correct glosses
  merely pointing at the wrong slot id.

`hitz bat esan nahi dut` now reads:

```
hitz bat → S0006L02 → "a word"   ← one tile, highlighted as the new LEGO
esan     → (ghost)
nahi dut → S0001L01 → "I want"
```

Safety: writes touch the `decomposition` column only. No phrase text, no LEGO, no audio row.
Audio links verified unchanged (6,449 of 6,450 target clips still linked, as before); the
audio-nulling trigger keys off text, which was not touched. Every pre-write value is kept in
`docs/decomposition-refresh-2026-08-12/eus_for_eng-applied-log.json`, and `--undo` restores
it, asserting the row still holds what we wrote before rolling anything back.

## Not done — needs your call

**The other 177 courses.** ~21,400 more stale blocks. The tool runs `--all` and is safe,
but that is a write across the whole estate and it is your call, not mine. My recommendation:
run it. It is reversible, it costs nothing, and every course sweep we do adds to the pile.

**The generator, not the symptom.** Recomputing now fixes today's rows and does nothing about
tomorrow's. The real repair is to make the decomposition refresh on LEGO mutation — the same
place the round-index materialised view already gets refreshed — so a gloss can never outlive
the LEGO it describes. Worth doing before the next content sweep.

**43 eus phrases that do not contain their own LEGO.** Listed in the applied log under
`SKIP_PARENT_UNLOCATABLE`. These are content defects (conjugated or absent salient), not
gloss drift, and want a human read.

## Can you or Deborah fix a gloss yourselves?

**No.** There is no editor in Popty that writes a LEGO's component/gloss pairs. Popty
displays them in several places and never lets you write them back. So today a wrong gloss
needs an agent or SQL.
