# French rounds 1–10 — what the learner actually hears, recounted

2026-08-07. Tom disputed last night's numbers ("that's blatantly not true — where do you get your
clip numbers from"). He was right to. This is the recount, run through the real round generator
rather than through the content-holder tables, and reconciled against the render that ran at 01:21.

**Read-only job. No audio was generated, nothing was relinked, no course content was touched.**

---

## The verdict, in four answers

### 1. "Rounds 1–10 = seeds 1–3, round 10 is S0003L03" — HALF RIGHT

**Round 10 = `S0003L03` is RIGHT.** Three independent sources agree: the Popty script generator, the
`course_round_index` materialised view the learner API reads, and the `course_legos` catalogue.
The parenthetical is right too — `S0003L02` ("to speak" → *parler*) is `is_new=false`, a repeat of
`S0001L02`, so it carries no round.

**"= seeds 1–3" is WRONG.** Seed 3 is not finished at round 10. It has four new LEGOs, and the
fourth — `S0003L04`, "as often as possible" → *aussi souvent que possible* — debuts at **round 11**.

> Rounds 1–12: 1:S0001L01 2:S0001L02 3:S0001L03 4:S0001L04 5:S0001L05 6:S0002L01 7:S0002L02
> 8:S0002L03 9:S0003L01 **10:S0003L03** 11:S0003L04 12:S0004L01

**Correct mapping:** rounds 1–10 = seeds 1 and 2 complete, plus the first three new LEGOs of seed 3.
Nine practice-phrase rows in seed 3 (4 BUILD, 5 USE) belong to LEGOs outside rounds 1–10.

### 2. "63 slots per layer" — WRONG as a description of what a learner hears

63 is a count of **content-holder rows in the database** — 10 `course_legos` rows plus the 53
`course_practice_phrases` rows those LEGOs own (22 BUILD, 25 USE, 6 component). That arithmetic
is internally correct; I re-derived all of it and it reproduces exactly. It is simply not the
number of things a learner hears.

**What the learner actually hears in rounds 1–10:**

| Layer | Slots played | Distinct clips |
|---|---|---|
| target1 (normal-speed French) | **107** | **53** |
| target2 (fast French) | 107 | 53 |
| known (English) | 97 | 53 |
| presentation (English intro) | 10 | 10 |
| **Total audio slots** | **321** | — |

63 is wrong in **both directions at once**:

- It **over-counts**, because 6 of the 53 phrase rows are `phrase_role='component'` and the learner
  **never plays component audio**. Components are visual ghost tiles on the intro and debut cards
  only. This is explicit in both implementations (`learning-script-generator.cjs` header: "NO
  component priming cycles"; `generateLearningScript.ts:1195-1212`: "we do NOT pre-introduce
  components with their own audio cycles"). Tom ruled on this on 2026-08-06 — "Components do NOT
  get introduced."
- It **under-counts far more heavily**, because a round is not a list of rows. Each round emits an
  intro, a debut, up to 7 BUILD practice items, up to 12 spaced-repetition reviews of *older* LEGOs,
  and 2 consolidation items. The same clip is heard many times. 107 target1 slots against 53
  distinct clips is roughly **2× repetition** across the first ten rounds alone.

The old French renders in rounds 1–10 were **53 distinct clips**, not 58 — see (3).

### 3. Were the 58 re-rendered clips the right 58? — YES, and slightly more than needed

This is the good news, and it is the part Tom's instinct did not need to worry about.

| | Count |
|---|---|
| Distinct target1 clips rounds 1–10 actually play | **53** |
| Of those, included in last night's render set | **53 (all of them)** |
| Played clips left on the old Jan/Feb generation | **0** |
| Clips in the 58 that rounds 1–10 never play | **5** |

Every clip the learner hears in the first ten rounds is now on today's generation — I queried
`course_audio` for all 53 ids the generator resolves and every one is stamped `2026-08`. There is
no gap and no residue.

The 5 extras are all **component-row clips**: `je` (`S0001L01C01`), `avec` (`S0001L04C01`),
`veux` (`S0001L01C02`), `toi` (`S0001L04C02`) and `essaie` (`S0002L02C01`). The learner never plays
any of them in rounds 1–10. They were rendered because the render set was built from holder rows.

**This retires the one reported failure.** "essaie" — the clip the phonology gate rejected three
times — is a component-only clip. It is **not heard in rounds 1–10 at all**, so its failure has zero
learner impact on this slice. It does not need a decision for the purpose of Tom's listen.

One correction to the staleness figure while I was in there: of the 58 target clips, **56** were
January/February renders and **2** were already August (`je veux parler`, rebuilt 4 Aug;
`toi`, 6 Aug — both carrying `::superseded-regen` markers). Of the **53 played** clips, **52** were
stale and 1 (`je veux parler`) was already current. So "61 of 63" was a slot-level restatement of
the same fact; at clip level it is 52 of 53 played clips stale.

### 4. Watson's sentence to Tom — **PARTLY TRUE**

> "The first 10 rounds have 63 French target1 slots, 61 of which were still January/February
> renders; those 63 slots resolve to 58 distinct clips, so 58 were re-rendered."

- "63 French target1 slots" — **false**. That is a holder-row count, not slots played. The number is 107.
- "61 of which were still January/February renders" — true of holder slots, but built on the wrong
  denominator, so misleading.
- "those 63 slots resolve to 58 distinct clips" — true of holder rows; not true of what is played
  (53).
- "so 58 were re-rendered" — true as a description of the job that ran (57 replaced, 1 failed).

**The honest replacement sentence:**

> Rounds 1–10 play **107 French target1 slots**, which resolve to **53 distinct clips** — 52 of them
> still January/February renders. I rebuilt a 58-clip set (those 53 plus 5 clips held only by
> component rows, which the learner never plays); 57 succeeded and **all 53 clips a learner actually
> hears are now on today's generation**. The one failure, "essaie", is a component-only clip and is
> not heard in rounds 1–10.

---

## How rounds 1–10 are actually built

Enumerated through `services/learning-script-generator.cjs` — the dashboard mirror of the learner's
`generateLearningScript.ts`, reading round shape and spaced-rep offsets **live** from
`algorithm_config.script_shape` (source reported as `algorithm_config`, not fallback). Offsets in
force: `[1,2,3,5,8,13,21,34,55,89,144,233,377,610,987,1597,2584]`; maxBuildPhrases 7,
maxSpacedRepPhrases 12, n1PhraseCount 3, useConsolidationCount 2.

107 items total across ten rounds: 10 intro, 10 debut, 41 build, 32 review, 14 consolidate.

| Round | LEGO | Items | intro | debut | build | review | consol. | Reviews of rounds | target1 slots | known slots |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | S0001L01 | 2 | 1 | 1 | — | — | — | — | 2 | 1 |
| 2 | S0001L02 | 3 | 1 | 1 | 1 | — | — | — | 3 | 2 |
| 3 | S0001L03 | 4 | 1 | 1 | 2 | — | — | — | 4 | 3 |
| 4 | S0001L04 | 9 | 1 | 1 | 4 | 1 | 2 | 3 | 9 | 8 |
| 5 | S0001L05 | 14 | 1 | 1 | 7 | 3 | 2 | 4, 3 | 14 | 13 |
| 6 | S0002L01 | 15 | 1 | 1 | 6 | 5 | 2 | 5, 4, 3 | 15 | 14 |
| 7 | S0002L02 | 16 | 1 | 1 | 7 | 5 | 2 | 6, 5, 4 | 16 | 15 |
| 8 | S0002L03 | 13 | 1 | 1 | 3 | 6 | 2 | 7, 6, 5, 3 | 13 | 12 |
| 9 | S0003L01 | 16 | 1 | 1 | 6 | 6 | 2 | 8, 7, 6, 4 | 16 | 15 |
| 10 | S0003L03 | 15 | 1 | 1 | 5 | 6 | 2 | 9, 8, 7, 5 | 15 | 14 |
| **Total** | | **107** | **10** | **10** | **41** | **32** | **14** | | **107** | **97** |

Cycle-type names are the generator's own (`intro`, `debut`, `build`, `review`, `consolidate`).
Nothing else is emitted: no component cycles, no L1 listening clusters in main rounds (moved to
Listening MODE on 2026-05-19), no pod laps (those are runtime-scheduled per learner and a
course-level projection cannot model them).

**Seeds and LEGOs touched:** seeds 1, 2, 3 only. LEGOs `S0001L01`–`S0001L05`, `S0002L01`–`S0002L03`,
`S0003L01`, `S0003L03`. Spaced repetition never reaches past seed 3 here — the largest offset in
play by round 10 is 5, and the reviewed rounds (3–9) are all inside the window. Nothing from beyond
seed 3 is pulled in.

**Content skipped before the walk.** Two mechanisms:
- `is_new=false` LEGOs are filtered out of the round walk entirely — that is why `S0003L02` carries
  no round and rounds compress by one across seed 3.
- The optional learner audio gate (`learnerView`) drops LEGOs/phrases missing any of
  known/target1/target2 before the walk. I ran **both views**. Course-wide the gate drops 4 LEGOs
  and 78 phrases, but **rounds 1–10 are byte-identical under both views** — same 10 LEGOs, same 107
  items, same 53 clips. So the gate does not change which LEGOs land in rounds 1–10.

## Cross-check between the two implementations

The Popty mirror and the learner-path `generateLearningScript.ts` agree on everything that affects
this count: identical round shape constants read from the same `algorithm_config` row; identical
component handling (no component audio cycles, ghost tiles only); identical BUILD cap and USE-fill
ordering; identical spaced-rep offset series. `course_round_index` — the materialised view the
learner API's `round-map.ts` reads — independently confirms the round-to-LEGO mapping above.

**Two divergences, neither of which changes any number here, both worth recording:**

1. **Cycle-type names differ.** The learner emits `spaced_rep` and `use`; the mirror emits `review`
   and `consolidate`. Same items, different labels. Anyone comparing script dumps across the two
   will see this and should not read it as a behavioural gap.
2. **The debut audio gate differs.** The learner requires all three of known/target1/target2 to
   schedule a debut (`debutIsPlayable`), and requires presentation+target1 for an intro; the mirror's
   `hasAudio` flag checks known+target1 only. In rounds 1–10 every LEGO has all three layers, so the
   two agree exactly — but on a course with partial target2 coverage the mirror would show rounds the
   learner silently drops. That is a real latent divergence in the mirror, reported here as a finding,
   not fixed as part of a counting job.

---

## Findings for Tom

1. **The render was right; the reporting was wrong.** Every clip rounds 1–10 play is rebuilt and
   current. The listen at https://watson-1.tail4968cb.ts.net/d/b07d5184 stands — it is testing the
   right audio.
2. **"essaie" needs no decision.** It is a component-only clip, never played. The open question in
   last night's doc can be closed for this slice.
3. **The holder-row-vs-slots-played error is generic, not French-specific.** Any inventory built by
   counting `course_legos` + `course_practice_phrases` rows for a round range will under-count what
   is heard (repetition) and over-count what is rendered (components). If other slices were scoped
   that way, they carry the same error. Noted in one line as instructed — not audited, that is Tom's
   call.
4. **Component clips are being rendered but never played.** 5 of the 58 clips last night were
   component-only. Estate-wide that is a standing spend on audio no learner hears. Worth a scoped
   count before it becomes a decision, but again — not done here.

## Gaps

None. Every number in this document was re-derived live against Supabase today; nothing is carried
over from last night's artifacts except the render log itself, which is used only as the record of
what was rendered. The pace gate was not re-run (it still cannot run on this course — statement
timeout, documented yesterday) and it is not needed for a counting job.

## Method

Probes (read-only, gitignored workspace):
`scripts/fra-rounds-1-10-recount.cjs` — enumerates rounds 1–10 through the real generator in both
production and learner views, tallying slots and distinct clips per layer.
`scripts/fra-rounds-1-10-reconcile.cjs` — cross-references the played clip set against
`fra-rounds1-10-target1-targets.json` and `fra-r10-t1-applied.json`, and re-queries `course_audio`
for the generation stamp of every played clip.
