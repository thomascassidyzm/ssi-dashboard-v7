# Residual inherited slots + the eus take-G row — 2026-08-24

Two scoped repairs on the **live** pod-1 fleet, both under Tom's standing fix-it-all ruling of
2026-08-24 11:19Z. Read-only measurement first, then a gated apply, then a read-only re-check of
all six audio columns across all 22 live pod-1 courses.

**Headline: every learner-audible audio slot on the pod-1 fleet is now clean, except ten
pre-existing whole-turn gendered-speech mismatches on Spanish that need a re-render.** Zero
split-array issues remain fleet-wide.

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
| `explainer_audio_id` | 336 | **331** | **no — worker #312 owns it** |
| `sentence_known_audio_ids` | 26 | **26** | yes |
| `takeg_audio_ids` | 14 | **14** | yes |
| `sentence_audio_ids` | 5 | **5** | yes |
| | 381 | **376** | **45** |

The three array slots reproduce the brief exactly. The explainer column reads **331, not 336** —
five fewer, consistent with the explainer relink already running on it. It was measured and
reported, never written.

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

## 6. Tools

| file | what it is |
|---|---|
| `tools/pods/repair-residual-inherited-split-slots.cjs` | the residue repair. Dry run by default; per-slot before-state assertion inside the UPDATE predicate; per-course snapshot log; explainer hard-excluded from writes; per-speaker cast; progress gate per course. |
| `tools/pods/repair-residual-inherited-split-slots.test.cjs` | 14 pure unit tests |
| `tools/pods/repair-incoherent-takeg-entries.cjs` | entry-level take-G repair — nulls one entry in place, never reorders, never shortens. |
| `tools/pods/repair-incoherent-takeg-entries.test.cjs` | 10 pure unit tests, including the two that pin "swapping leaves it red" and "nulling in place turns it green" |

`npx vitest run tools/pods/repair-residual-inherited-split-slots.test.cjs tools/pods/repair-incoherent-takeg-entries.test.cjs` — 24 tests, all passing.

Neither tool re-implements the identity rule: detection is `findInheritedSplitAudio()` from
`split-audio-inheritance.cjs` and verification is `checkPodClips()` from `pod-cast-gate.cjs`, both
required read-only and unchanged.
