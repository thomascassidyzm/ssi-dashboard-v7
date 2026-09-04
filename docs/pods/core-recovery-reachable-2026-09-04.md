# The recoveries are reachable

*2026-09-04. #408 made the six recovery halves true in storage. This makes them
something a learner can meet. Nobody's walk moved — proved as files, twice.*

---

## What landed

**The floor #408 named is cleared.** `listening_pod_sentences` — the per-course
table the learning app reads on every learner's device — can now carry a
continuation, and seven learner-facing readers know a continuation from the
walk. Two of them can serve one **at its branch point**, which was the whole
test: *"a learner who hits one of the six survivability branch points actually
MEETS the recovery, in the moment they are in trouble."*

| | before | after |
|---|---|---|
| variant column on the per-course layer | none at all | `variant_key` + `attach_sentence_number` |
| coordinate key | `UNIQUE (pod_id, scene, sentence)` — forbids a sibling | `UNIQUE NULLS NOT DISTINCT (pod_id, scene, sentence, variant_key)` |
| player readers that know what a branch is | 0 of 7 | 7 of 7 |
| the attach point | a sentence of prose in `scene_subtitle` | a column, backfilled for all 35 rows, prose left intact |
| a pod carrying continuations, end to end | did not exist | `deu_at_for_eng:pod-1` — 231 walk + 35 attached |

## The walk did not move, and that is a diff, not a claim

Two files, before and after, sha256:

| | sha256 |
|---|---|
| all 22 pod-1 course walks (5,082 rows: pod, scene, sentence, order, speaker, text) | `e0414ac8a104941bafc9e0cc6c0e7959bef4b3d315b090c36dbbbc76b37d2b4e` — **byte-identical before and after** |
| CORE canon base walk (231 rows) | `785027e745e18e1c021e0b6d3cf7a0297f9231aab6a828269616ea991775007f` — **byte-identical before and after** |

And the pipeline's own function, not my dump of a table: the generator's
`loadCanonicalScenes('pod-1')` still returns **22 scenes, 231 lines** — the same
counts #408 recorded.

On the client side the same guarantee is pinned by a test that runs against the
**real 266 rows** of the pod that now carries continuations: the walk is exactly
`global_order` 1..231, no gaps, nothing above it, every continuation excluded.

## The money guard — checked from the code, proved with the real function

The hazard: `phase8-audio-v13.cjs` refuses audio reuse for a **whole pod** when
canon and pod counts disagree (`podCanonReuseTexts`, one line:
`if (sentences.length !== canon.length) return null`). #408 guarded the
**canonical** side. A pod going 231 → 266 is the **pod** side, and unguarded it
would have flipped reuse off for every pod-1 course and rendered every clip
fresh — real TTS, 21 live courses.

I ran phase8's own exported functions against the live database, before and
after the insert:

```
canon (loadPod0Canon, base rows only): 231 lines
                     BEFORE                                  AFTER
deu_at_for_eng:pod-1  rows=231 base=231  →  226 shareable    rows=266 base=231  →  226 shareable
fra_for_eng:pod-1     rows=231 base=231  →  226 shareable    rows=231 base=231  →  226 shareable
zho_for_eng:pod-1     rows=231 base=231  →  226 shareable    rows=231 base=231  →  226 shareable
```

**226 before, 226 after, on a pod that now has 266 rows.** Unguarded, the old
comparison would have read 266 ≠ 231 and returned NULL — no reuse, everything
renders. The fix is in `podCanonReuseTexts` itself rather than at a call site,
so both callers (phase8's `/generate-pods` and `pod-bulk-migrate.cjs`) are
covered by the one change.

**Zero metered spend. No audio rendered, no audio pass queued, no TTS call.**

## The constraint trap, and what I did instead

The obvious migration — replace the 3-column unique with a 4-column one — would
have **silently weakened** the base-row guarantee, because Postgres treats NULLs
as distinct in a unique index by default: two base rows could then both sit at
scene 2 sentence 5 with nothing to stop them. The brief's suggested fix was a
pair of partial indexes. This database is PostgreSQL **17.6**, so there is a
better answer than either: `UNIQUE NULLS NOT DISTINCT`, one index, exactly the
rule wanted. Proved with three probes in an aborted transaction:

| probe | result |
|---|---|
| a second **base** row at an occupied coordinate | **refused** — the guarantee is intact |
| a **continuation** at that same coordinate | allowed — a sibling, not a successor |
| a second row of the **same flow** at that coordinate | **refused** |

## The attach point moved from prose to a column — derived from the data, not the string

Your ruling: *"Structure living in a string is this estate's recurring defect and
it should not be the thing a player parses."*

I did not parse the string. Every flow **opens by repeating one or two of CORE's
own lines verbatim** before it diverges — that is what makes it land in the
moment — so the branch point is derivable from the text itself and checkable.
The tool prints its derivation beside the prose so the two can be read against
each other, and **`scene_subtitle` is never written**: nothing is lost if I read
it wrong.

| flow | scene | attach at sentence | the CORE line it branches from | prose said |
|---|---|---|---|---|
| `recovery-s2` | 2 | 5 | *"It's not very far. Maybe three or four miles."* | g8–g9 ✓ |
| `recovery-m1` | 3 | 5 | *"Do you have crisps, or nuts, or anything?"* | g14–g16 — see below |
| `recovery-m5` | 4 | 3 | *"…I'm busy tomorrow. But let's talk on Saturday."* | g21–g22 ✓ |
| `recovery-m3` | 5 | 1 | *"Did you have a long day?"* | g23 ✓ |
| `recovery-m2` | 22 | 1 | *"Would you mind if I tried to practise… I haven't been learning for very long…"* | g221–g225 — see below |
| `recovery-m4` | 22 | 8 | *"You should be confident already…"* | g227–g228 ✓ |

Four of six agree with the prose exactly. For `recovery-m1` and `recovery-m2`
the prose names a wider **range** (the fork, the exchange) than the point where
the flow actually leaves CORE — the derivation takes the point of divergence,
which is where a learner is in trouble. **Reversible**: the prose is intact and
the column is one UPDATE.

## What already existed, and what I actually built

Worth saying plainly, because the estate rebuilt an existing capability five
times tonight:

**Already there, used as-is:** `services/shared/canonical-slate.cjs` and its six
call sites (#408); `canonical_pod_scenarios.variant_key` and its 4-column unique
key; the 35 rows on `pod-1` with `global_order` 10001–10035; the gated-tool shape
in `tools/pods/promote-core-recoveries.cjs`; `target_text = ''` as the estate's
existing "no target text yet" value, which already drops a line out of every
recording and render queue; `target_text_draft` as the existing text gate.

**Genuinely built:** the migration; the pod side of the phase8 guard; variant
awareness in the two aligners, the fleet census and the Welsh queue verifier;
`podSlate.ts` (the client mirror) and the seven reader changes;
`attach-recoveries-to-course-pod.cjs`; 12 tests.

**One thing I found while reading, which nobody asked for and which would have
destroyed data:** `align-pod0-to-canonical.cjs --restore-from-archive` deletes a
pod down to its archive file and re-inserts. Once the aligner correctly ignores
continuations, its archive would have stopped containing them — so a restore
would have **silently deleted every recovery row**. The archive is now written
from the full row set while the alignment itself still ignores continuations.

## The probe course, and why it is not a live one

`deu_at_for_eng:pod-1` — the **one pod-1 pod at `visibility='held'`** rather than
`live`. Its RLS policy returns zero rows to anon and authenticated, so no learner
can reach it, and it is otherwise identical to the 21 live pods (231 rows, same
canon).

That choice matters. **The player changes are on a branch and are not merged and
not deployed** — you told me not to merge — so the *deployed* player still has no
idea what a continuation is. Putting 35 rows into a live course pod tonight would
have lengthened 21 real learners' walks by 35 lines, which is precisely the
failure the brief names first. On a held pod it is a proof; on a live pod it
would have been a defect. The rows are left in place: they are the artefact.

## What did not happen

- Nothing merged to `main` or `dev`. Nothing deployed. Nothing verified live,
  because nothing is live.
- No audio rendered, no audio pass queued, no TTS call, no metered spend.
- No recovery text re-derived, re-edited or translated. The 35 rows carry
  `target_text = ''` — no German was invented for them, and there is no machine
  translation anywhere in this job.
- **Script Lab left exactly as it is**, per the taste-safe default: scene 2 still
  shows 11 unmarked lines. That is #408's question 1 and it is still open.
- No trigger policy invented. See below.

## Four things that need you, one word each

1. **The trigger.** The capability is built: `continuationsByBranch()` hands the
   two branch-capable readers the flow that belongs at each coordinate, so a
   recovery *can* be served in the moment. What fires it — a wrong answer, a
   hesitation, a tap, always, never — is a product taste call and I did not
   invent one. It is the only thing between here and a learner meeting a
   recovery. — *my recommendation: **tap**, a visible "what if this goes wrong?"
   at the branch point, because it needs no signal we currently measure and it
   cannot fire at the wrong moment* — **tap / wrong-answer / hesitation / you'll
   say later**
2. **The other 21 courses.** The chain is proved on one held pod. Rolling it to
   the 21 live pods is one command per course — but it should only happen
   **after** the player branch is merged and deployed, or those learners walk 35
   extra lines. — *my recommendation: **wait**, merge and deploy the player
   first* — **wait / go**
3. **The English of the recoveries is now in deu_at's known-side recording
   queue** (35 lines), because those rows have English but no target text.
   Nothing rendered and the pod is held, so nothing moved tonight. Should
   continuations be held out of audio queues until their target text is
   authored? — *my recommendation: **hold**, a half-rendered flow helps nobody* —
   **hold / queue**
4. **Script Lab display**, still unanswered from #408: scene 2 shows 11 lines,
   six of them unmarked recoveries. — **leave / mark / hide**

---

*Migration: `database/changes/20260904_pod_variant_carry_and_attach_point.sql`
(+ `.ROLLBACK.sql`, which warns in its own header that dropping `variant_key`
turns every continuation into a line of the walk). Tool:
`tools/pods/attach-recoveries-to-course-pod.cjs`, dry-run default, reversible,
per-row logs in `docs/pods/reachable-2026-09-04/`. Client rule:
`packages/player-vue/src/composables/podSlate.ts`, 12 tests.*
