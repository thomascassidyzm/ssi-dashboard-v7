# Residual inherited slots + the eus take-G row — 2026-08-24

Two scoped repairs on the **live** pod-1 fleet, both under Tom's standing fix-it-all ruling of
2026-08-24 11:19Z. Read-only measurement first, then a gated apply, then a read-only re-check of
all six audio columns across all 22 live pod-1 courses.

Extended in a second pass (below, sections 7-10) to `explainer_audio_id`, once worker #312 came
off that column.

**Headline: every learner-audible audio slot on the pod-1 fleet is now clean, except ten
pre-existing whole-turn gendered-speech mismatches on Spanish that need a re-render.** Zero
split-array issues remain fleet-wide; explainer wrong-row went 156 → 22, and those 22 are all
accounted for — 16 held by the progress gate, 6 outside the inherited test.

---

## 1. The residue — what was actually there

`repair-split-array-inheritance.cjs` cleared the bulk of the clone+align defect this morning. It
judges a slot by whether its clips' text *tiles* the row — a text test — and that passes a slot
whose clips happen to say something the row also says. A population survived it: slots still
**byte-identical** to the same `(scene, sentence)` slot on the pod being replaced, while the text
at that slot had changed underneath them.

My own measurement, taken fresh with `findInheritedSplitAudio()` against every retired pod of each
course (inheritance can be more than one hop: `pod-0-retired` → `pod-1-retired` → `pod-1`):

| slot | brief said | I measured | in my scope |
|---|---:|---:|---|
| `explainer_audio_id` | 336 | **331** | not in pass 1 — #312 owned it; **taken up in pass 2 below** |
| `sentence_known_audio_ids` | 26 | **26** | yes |
| `takeg_audio_ids` | 14 | **14** | yes |
| `sentence_audio_ids` | 5 | **5** | yes |
| | 381 | **376** | **45** |

The three array slots reproduce the brief exactly. The explainer column reads **331, not 336** —
five fewer, consistent with the explainer relink already running on it. In pass 1 it was measured
and reported, never written; pass 2 repairs it.

### These are not cosmetic near-misses

The clips are the *retired* wording, and the learner reads the clip's own text off the card:

| course | row | on screen | in the clip |
|---|---|---|---|
| ita_for_eng | s6/7 | "Cosa fai?" | "Cosa fa?" — the formal form the recast removed |
| hrv_for_eng | s4/3 | "…sutra sam zauzet**a**" (she) | "…sutra sam zauzet" (he) |
| ara_eg_for_eng | s2/2 | "اتفضل." | "تفضل." |
| ara/hin/isl/eus | s3/2, s4/2 | "I'd like a coffee, **please**." | "I'd like a coffee." |

---

## 2. Re-point vs null — the search, and why it came back empty

The rule is re-point where a correct clip already exists, null only where none does. I searched
twice, and report both because "we nulled everything" is only honest if the alternative was looked
for.

1. **Across every retired pod of the course**, for a row rendering this row's *exact current* text.
   32 of 45 findings do have such a row — and in every case it is the pre-repair `pod-1-retired`
   snapshot holding the *same* inherited array, so there is nothing new to point at. The other 13
   have no text match anywhere.
2. **Across the whole of `course_audio`**, for an exact-text clip of every sentence-piece of the
   row. Only **2 of 45** slots have a complete set, both on `ara_eg_for_eng` s2/2 — and its second
   piece exists only in voice `sal`, which is not in that pod's cast at all. Make-before-break
   refuses it.

So: **0 re-pointed, 45 to null.** Null is the verified fallback — `splitRowUnits` falls back to the
whole-turn clip, and the whole-turn clips were verified correct in text and casting before anything
was written.

### The casting check got stricter on the way

Cast is judged **per speaker**, not by set membership. `ara_eg_for_eng` s2/2 is the proof: the row's
speaker is Passenger (cast `rex`, male) and its split clips are `eve` — in the cast set, so a
set-membership test passes it, while the character is simply wrong. Under the per-speaker test the
whole-turn exclusion count on Spanish rises from 6 to 13 rows (spa) and 4 to 11 (spa_mx). No row
carrying an in-scope finding was excluded, so the plan is unchanged by the tightening.

---

## 3. What was written

**38 of 45 slots nulled**, across 18 courses: `sentence_known_audio_ids` 25, `takeg_audio_ids` 10,
`sentence_audio_ids` 3. No audio generated, no clip deleted, no text column touched. Every
before-value is snapshotted in `docs/pods/<course>-residual-inherited-slots-2026-08-24-applied-log.json`,
so each write is reversible from the log alone.

### One course stopped: `gle_for_eng` — 7 slots left in place

`gle_for_eng` has **1 split-keyed `learner_pod_state` row** — one learner, one exposure, on
`gle_for_eng:pod-1:SC01-S002`, recorded today at 11:52Z. Progress is filed under `<row.id>:s<k>` for
a split unit, so nulling a split array changes the key. The course was skipped whole and nothing was
written to it. Its 7 findings (s1/4, s8/2, s9/2, s12/10) stand.

> **One line for Tom.** The learner's split-keyed row is on SC01-S002, which is **not** one of the
> four rows needing repair, and only `sentence_audio_ids` moves a progress key at all
> (`splitRowUnits` reads that column and no other — `sentence_known_audio_ids` and `takeg_audio_ids`
> cannot move a key). A row-scoped rather than course-scoped gate would clear all 7 gle slots with
> that learner's single exposure untouched. That is a change to the progress-safety doctrine, so it
> is yours, not mine — say the word and it is a one-line change plus a re-run.

---

## 4. The eus take-G row — the brief's diagnosis does not hold

`eus_for_eng` pod-1 scene 4 sentence 2, before:

```
row     "Kaixo! Barkatu, baina orain ezin dut hitz egin. Orain etxera joan behar dut. Bihar hitz egin dezakegu?"
entry 1 "Kaixo! Barkatu, baina orain ezin dut hitz egin."          <- group 1, correct
entry 2 "orain ezin dut hitz egin. Orain, etxera joan behar dut."  <- group 2, wrong
entry 3  null                                                      <- group 3, single unit
```

**The two takes are not back to front.** Entry 1 is genuinely the first group. Entry 2 is a
2026-07-07 render that leaked the tail of group 1 into the front of group 2 — and it is the
*overlap*, not the order, that sends `checkPodClips`'s cursor backwards and produces the "appears
out of order" line that found the row. **Swapping the two entries leaves the gate red**; there is a
unit test pinning exactly that, so the wrong repair cannot be re-attempted by accident.

Two further facts fix the remedy:

- The row's text is **byte-identical on the retired pod-0 and on pod-1** — this array has stood
  since July and was never inherited across a text change, so it is invisible to
  `findInheritedSplitAudio` and needed its own tool.
- The only alive alternative clip, "Orain etxera joan behar dut." (`852e2a25`, in cast, alive), is
  **not a Take G**: it carries no seam gaps, so the slicer would measure no spans from it.

So the repair is to null **that entry in place**, keeping the array length so groups 2 and 3 stay
aligned to their own takes. That is Take G's own spec for a group with no gapped take ("single-unit
groups keep null"). After:

```
["b5c38a00-5eff-4218-bcbe-b9f77d7f769b", null, null]
```

Re-read from the database and walked through `checkPodClips`: **0 take-G issues remain on the row.**
It is the only anomaly of its kind on the pod — the other 16 multi-take eus rows all tile their row
in order with no overlap. Rendering a correct group-2 take is TTS spend and was not done.

---

## 5. Post-apply gate — all six columns, all 22 live pod-1 courses, read-only

5,082 rows, every clip in every one of the six slots checked for cast, own-row text and coherence:

| slot / verdict | count |
|---|---:|
| `sentence_audio_ids` (all kinds) | **0** |
| `sentence_known_audio_ids` (all kinds) | **0** |
| `takeg_audio_ids` (all kinds) | **0** |
| `known_audio_id` (all kinds) | **0** |
| `target_audio_id` wrong-row | **10** (spa 6, spa_mx 4) |
| `explainer_audio_id` wrong-row | 156 |
| `explainer_audio_id` off-cast | 16 |

Residual **inherited** slots after the apply: `sentence_audio_ids` 2, `sentence_known_audio_ids` 1,
`takeg_audio_ids` 4 — all seven of them the `gle_for_eng` rows held back above — plus the 331
explainer slots, untouched by design.

**The 10 remaining whole-turn failures are the known gendered-speech defect**, not this one: the row
reads "no estoy segura" and the clip says "seguro". They need a re-render, which is Tom's trigger,
and they are excluded from repair here precisely because a row whose own whole-turn clip is wrong
cannot be repaired by falling back to it.

**The explainer numbers are not mine.** `explainer_audio_id` was never written by either tool; the
column belongs to the explainer relink running today, and the 156 wrong-row hits are the separate
stale-explainer backlog already documented in the root-cause note.

---

---

# Second pass — the explainer column (fence lifted)

Worker #312 finished and came off `explainer_audio_id` (`02975a8de`, `39e38a4a8`). Scope extended
to that column **for the inherited test only**.

## 7. What the player does with a null explainer — established, not assumed

Asked of the code before writing anything:

- **`buildMainStage`** (`@ssi/core` `pods/podStageComposition.ts:177`): *"a sentence with no
  explainer audio plays its TRANSLATION in the explainer slot instead, so meaning always arrives"*,
  and where the stage playlist already carries a `trans` slot the explainer slot is simply skipped.
  So null degrades cleanly — it is not a silent hole.
- **Stronger still: the column reaches no main-flow learner today.** The LIVE `pods` row in
  `algorithm_config` has playlists `["ps","trans","ps","ps"]` and friends across all eight stages —
  **no `explainer` role anywhere**. Verified against the database, not from the code comment that
  claims it.
- **Stage-0's explainer tier is a different column** — `pod_legos.explainer_audio_id`
  (`stage0Sequence.ts:110`), not `listening_pod_sentences.explainer_audio_id`. Unaffected either way.

Conclusion: nulling here is safe, and the change is currently inaudible. No stop needed.

## 8. Re-measured: 331, not 336 — and it splits four ways

The 336 predates #312. Measured fresh: **331 inherited explainer slots**, and they are not one
population:

| | count | what I did |
|---|---:|---|
| explains a **different** row | **150** | repair |
| still quotes **its own** row | **174** | **left alone** |
| #312's protected sixteen | 5 | **held** — Tom's content call |
| on a row whose own whole-turn clip is wrong | 2 | skipped |
| | **331** | |

**An explainer is a gloss, not a transcript.** Its contract is that it *quotes chunks of its own
row*, not that its text matches the row's — so an inherited slot whose clip still explains the row
it sits on is not a defect, and nulling 174 working glosses to satisfy a byte-identity rule written
for transcripts would be vandalism. They are counted and named in the logs, not written.

Only 5 of #312's 16 appear at all, because the other 11 are not in the inherited-and-failing
population. **Zero protected rows entered the plan** — asserted directly against the database, not
inferred from the code path.

**No cast test on this column.** The explainer is a `comp:<chunk>+<gloss>` composite whose gloss
half is a legacy narrator, deliberately off-cast on 5 of 22 courses. Judging it against a cast set
would manufacture defects out of a design decision, so candidates are judged on quote-membership
and liveness only. The 16 off-cast explainer links still on the fleet are exactly #312's sixteen.

**Re-point: 0 again.** No retired pod carries a row with *both* texts byte-identical and a usable
explainer. 134 nulled, 16 held by the progress gate (below).

## 9. Two courses started serving split units mid-pass

`ita_for_eng` had **0** split-keyed `learner_pod_state` rows when I measured at 12:07 and **4** when
I applied at 12:09; `eus_for_eng` went 0 → 2 by 12:11. Real learners arrived while the pass ran. The
gate caught both and stopped those courses, which is the gate working.

> **Second line for Tom, sharper than the first.** `ita_for_eng`'s 16 held slots are **all
> `explainer_audio_id`** — a column that *cannot* move a progress key under any circumstances, since
> `splitRowUnits` derives `<row.id>:s<k>` from `sentence_audio_ids` and reads nothing else. The
> course-scoped gate is holding 16 provably key-irrelevant rows. Narrowing it to "row-scoped, and
> only for `sentence_audio_ids`" clears ita's 16 and gle's 7 with no learner touched. It is a
> progress-safety doctrine change, so it is yours — and it will bite more often as learners arrive.

## 10. Post-apply gate — all six columns, all 22 courses, read-only

| slot / verdict | before this pass | after |
|---|---:|---:|
| `explainer_audio_id` wrong-row | 156 | **22** |
| `explainer_audio_id` off-cast | 16 | 16 (#312's sixteen, by design) |
| all five other slots | 0 (bar the 10 spa) | unchanged |

The 22 reconcile exactly: **16** are ita's, held by the progress gate, and **6** are the
non-inherited stale-explainer backlog — `ara_eg` s3/3, `ara` s2/2, `gle` s7/10 s14/7 s15/1,
`spa_mx` s8/10. Those six are a *superseded wording* rendered at their own slot, never a
byte-identical carry from a retired pod, so the inherited test does not reach them and I did not
touch them. They need a render decision, like the 10 Spanish whole-turn rows.

## 11. Tools

| file | what it is |
|---|---|
| `tools/pods/repair-residual-inherited-split-slots.cjs` | the residue repair, all four non-whole-turn slots. Dry run by default; per-slot before-state assertion inside the UPDATE predicate; per-course snapshot log; per-speaker cast on the three tracks and none on the explainer composite; #312's sixteen hard-protected; progress gate per course. |
| `tools/pods/repair-residual-inherited-split-slots.test.cjs` | 21 pure unit tests |
| `tools/pods/repair-incoherent-takeg-entries.cjs` | entry-level take-G repair — nulls one entry in place, never reorders, never shortens. |
| `tools/pods/repair-incoherent-takeg-entries.test.cjs` | 10 pure unit tests, including the two that pin "swapping leaves it red" and "nulling in place turns it green" |

`npx vitest run tools/pods/` — **170 tests across 12 files, all passing** (31 of them these two tools').

Neither tool re-implements the identity rule: detection is `findInheritedSplitAudio()` from
`split-audio-inheritance.cjs` and verification is `checkPodClips()` from `pod-cast-gate.cjs`, both
required read-only and unchanged.
