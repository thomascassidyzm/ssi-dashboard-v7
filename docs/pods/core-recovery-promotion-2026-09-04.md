# CORE gains the recovery halves

*2026-09-04. The 35 rows are out of the inert slug and on CORE. Nobody's walk moved.*

---

## What landed

The six recovery halves job #401 authored now live on `pod-1` — CORE itself — attached to the
scenes they were derived for. The `core-recoveries` slug is empty. The DRAFT-UNREVIEWED marker is
gone from all 35 rows and from the database entirely.

**CORE's walk is unchanged, and that is proved twice over, not asserted.**

| | before | after |
|---|---|---|
| pod-1 base rows | 231 | 231 |
| ordered walk sha256 *(scene, sentence, order, speaker, text)* | `c6146d76abed0feb9cdd9922d565d1f264d52a5467fbe00cbf2924cbeaf47451` | `c6146d76…f47451` — identical |
| what the generator's own `loadCanonicalScenes('pod-1')` returns | 22 scenes, 231 lines, sha256 `96fd90f4caa0fb2ecff3ed1442e7288b0c96076ee2b011e950c11a4691fb16b7` | 22 scenes, 231 lines, `96fd90f4…fb16b7` — identical, and byte-identical as files |
| pod-1 total rows | 231 | 266 (231 walk + 35 attached continuations) |

The second row of that table is the one that matters: it is not my dump of the table, it is the
real function the regeneration pipeline calls, run against the live database before and after,
diffed as files.

## The thing that made it possible, and it already existed

The commission asked for "attached, not appended", and the honest first read of the storage said
that was impossible: `variant_key` was written by three ingest tools and **read by nothing** —
not the generator, not the per-course layer, not the player. So a variant row on a live slate was,
to every consumer, just another line in the scene.

But the table has known how to say "attached" since the sector pods were ingested:

```
UNIQUE (pod_slug, scene_number, sentence_number, variant_key)
```

A row carrying a `variant_key` occupies the **same** (scene, sentence) coordinate as the base row
beside it. That is a sibling, not a successor — a node thickened, not a walk lengthened, which is
exactly your ruling in the schema's own words. What was missing was a reader that honoured it.

So the change is one small module, `services/shared/canonical-slate.cjs`, with one rule:

- a slug that **has** base rows has a walk — its walk is its base rows, and a variant row is a
  continuation attached to a coordinate;
- a slug that is **all** variants is a flow book with no walk to protect, and every row is served —
  which is `health`, `retail`, `trades`, `hospitality`, `care-work`, unchanged.

That rule changes nothing for any slug as it stood this morning. It is what makes it safe for
`pod-1` to hold both.

## Where it had to be wired, including one that would have cost money

Six places read the canonical slate as if it were a walk. All six now take the base slate:

| | what it would have done unguarded |
| --- | --- |
| `services/pod-dialogue-generator.cjs` | flattened the six flows into scenes 2/3/4/5/22 and taken CORE from 231 to 266 on the next regeneration |
| `services/phases/phase8-audio-v13.cjs` | **silently switched off cross-course audio reuse for every pod-1 course** — it refuses the whole pod when canon and pod counts disagree, so 266 vs 231 means nothing borrows anything, and every clip gets rendered fresh |
| `tools/pods/align-pod0-to-canonical.cjs` | written 35 extra sentences into each course pod it aligned |
| `tools/pods/align-welsh-pod0-to-canonical.cjs` | the same, for Welsh |
| `tools/pods/pod0-fleet-census.cjs` | reported all 21 live pods as 35 sentences short |
| `tools/pods/verify-welsh-pod0-queue.cjs` | the same |

The phase8 one is the one I did not expect and is the reason this was worth checking properly
rather than changing the generator and calling it done.

A seventh reader, the Script Lab route in `production-api.cjs`, is **deliberately left alone** —
you should be able to see the recoveries in the Script Lab. It will now show scene 2 with 11 lines
rather than 5, unmarked. Flagged below as a decision.

## The numbers you asked for

- **35 rows moved.** `core-recoveries` → `pod-1`, ids re-prefixed, one transaction, before-state
  repeated in the WHERE clause of every UPDATE, reconciled afterwards by independent re-read.
- **Per-scene position shift: zero, everywhere.** Continuations took `global_order` 10001–10035,
  out of the walk's 1–231 band. So even a reader that ignores `variant_key` sorts them *after*
  their scene's base lines, never between them. The migration protocol's 8-position bound is not
  approached, let alone crossed. **No course-level progress migration is required — now or at the
  next regeneration.**
- **What the next regeneration costs the 21 live courses: nothing.** Still 231 sentences each,
  still the same English, still the same audio. Not 266, not 735 new rows, not one TTS call.
- No audio rendered, no audio pass queued, no visibility changed, nothing merged, nothing deployed.

## The six attachments — all correct, none wrong

Every flow opens on CORE's own line, **verbatim**, at the moment of trouble. I checked each against
pod-1's actual text rather than against #401's description of it:

| flow | scene | opens on | the edge |
|---|---|---|---|
| `recovery-s2` | 2 | g8 *"Can you tell me how far it is into town?"* + g9 *"…Maybe three or four miles."* | the hedge "maybe" acted on |
| `recovery-m1` | 3 | g14 *"Do you have crisps, or nuts, or anything?"* | CORE answers yes (g16) or no (g15); this is the missing third arm, "I don't know" |
| `recovery-m5` | 4 | g21 + g22 *"…I'm busy tomorrow. But let's talk on Saturday."* | CORE simply **stops** with the counterbid unanswered; this answers it |
| `recovery-m3` | 5 | g23 *"Did you have a long day?"* | replaces CORE's one-line g24 with the story, and the story gets challenged |
| `recovery-m2` | 22 | g221 *"…I haven't been learning for very long…"* | CORE compliments; this audits the premise |
| `recovery-m4` | 22 | g227 + g228 | the disagreement parked rather than settled; CORE's g229 follows without a seam |

None land late. None land on the wrong scene. Nothing needed silent fixing.

## The floor — the honest gap, and it is real

**The recoveries are now stored attached. They are not yet reachable by a learner.**

`listening_pod_sentences` — the per-course layer the player actually reads — has **no variant
column at all**, and the player (`useListeningPods.ts`) fetches a pod's sentences in `global_order`
and buckets them by `scene_number` with no notion of a branch or a choice. So there is nowhere
downstream to put the distinction and nothing downstream that could offer it.

That is a floor, not a compromise dressed up: serving a recovery *while the learner is in trouble*
needs a variant column on the per-course layer and a branch in the player. This job deliberately
did not build that — it is a learner-facing change of a different size, and the storage half had to
be true first. What landed is the half that is provable, reversible, and cannot lengthen anyone's
walk by accident.

## The taste default I took, which you can overrule with one word

Given the choice the brief named — (a) rows onto `pod-1` where a regeneration flattens them, versus
(b) a distinct slug plus a reader change — **I took neither, because a third option scored better on
all three legs once the unique key turned up: rows onto `pod-1` *plus* the reader that honours the
column the schema already has.** Better, because CORE genuinely owns the recoveries at their own
scenes rather than parking them in a second slug. Simpler, because it adds no concept — the
distinction was already in the table's uniqueness key. Cheaper, because the flattening hazard
becomes structurally impossible rather than a thing six tools have to remember.

If you'd rather they sat on their own slug until the player can serve them, say "revert" — it is
one command, `--revert --apply`, and it is tested: I ran the whole probe forward, back, and forward
again, measuring the generator's walk at each point.

## Three things that need you, one word each

1. **Script Lab display.** Scene 2 now shows 11 lines instead of 5, with the six recovery lines
   unmarked. Options: leave it (you see everything, unlabelled), mark them, or hide them. — *leave /
   mark / hide*
2. **The attach point is recorded in prose, not in a column.** A flow's `sentence_number` is its own
   index within the flow; the exact CORE line it attaches to lives in the row's `scene_subtitle`
   ("attaches to POD 1 scene 2 at g8–g9"). A column would make it machine-readable when the player
   work happens. — *column now / prose is fine*
3. **The player half.** Do you want the variant column on `listening_pod_sentences` and a branch in
   the player scheduled next, or parked? — *next / park*

---

*Tools: `tools/pods/promote-core-recoveries.cjs` (gated, dry-run default, reversible),
`services/shared/canonical-slate.cjs` (+ 6 passing tests). Per-row logs committed beside this doc.*
