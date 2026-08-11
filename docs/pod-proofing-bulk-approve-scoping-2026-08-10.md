# Pod proofing: a bulk-approve tick button — scoping

**Date:** 2026-08-10 · **Status:** scoped, NOT built · **Requested by:** Aran Jones, via Tom

> "In the Popty, for the pod audio that needs proofing, I'm having to click on edit and then on
> save for each phrase - would be much easier/faster if it just had a tick button on the top
> level ❤️" — Aran, 17:20

Decision from Tom: scope it, size it, recommend an approach. Build nothing without confirmation.

---

## 1. Why this is a real hole, not a convenience

`listening_pod_sentences.target_text_draft` is the DRAFT marker. Opus drafts the Welsh, Aran
proofreads it, and clearing that boolean is the gate closing (Tom, 2026-08-06).

Today **the only thing in the whole estate that clears it is a human editing the target text.**
`buildSentenceEditPatch` (`services/voice-engine/pods-cast.cjs:305`) sets
`target_text_draft = false` as a side effect of writing `target_text`. There is no other writer.

So a proofreader who reads a line, decides it is already correct, and wants to say so has exactly
one move available: click Edit, change nothing, click Save. That is Aran's complaint, and it is
the shape of the gap — **the model can record "a human changed this" but cannot record "a human
approved this".** Most proofreading is approval, not correction, so the common case is the one
with no button.

Two smaller consequences worth naming:

- Re-saving unchanged text is not free. The same patch nulls `target_audio_id`, so approving a
  line by re-saving it **destroys that line's audio pointer**. On a pod that has already been
  recorded, "I agree with this line" currently costs the recording. Nobody has hit this yet only
  because the Welsh pod Aran is on (`cym_s_for_eng:pod-0-unrecorded`, 104 draft lines) has no
  target audio yet.
- The count is not trivial: 387 draft lines estate-wide right now — 104 Welsh (`cym_s_for_eng`),
  128 Spanish (`spa_for_eng`), 155 Austrian German (`deu_at_for_eng`). At two clicks and a page
  region change per line, the missing button is roughly 800 interactions.
  **Update 2026-08-11: 259 of those 387 are now on live learner slugs** — the Welsh 104 moved onto
  `cym_s_for_eng:pod-0` in the outage fix, joining `deu_at`'s 155; only the Spanish 128 remain
  gated. Both live sets are tracked together as the draft-debt ledger in
  `docs/pods/scope-scout-2026-08-11/PLAN-all-pods-pod0.md` §"Read this first" #2, pending the
  proofreading-policy ruling with Kai.

## 2. Recommended approach

**Where the tick lives.** On the sentence rows Aran is already reading, in
`src/views/PodDetailView.vue` — a tick in the row's button cluster, next to the DRAFT badge,
visible only while `target_text_draft` is true. That is where his eyes are: he reads the Welsh
against the English on the row, and the verdict should be one click from the reading, not on a
second screen. Add a header-level **"Approve all remaining"** for the scene or the pod, because
the honest workflow is "these fifteen are fine, that one isn't".

The course-wide drafts list (`GET /api/production/:course/pods/drafts`) is the other candidate
door and is worth wiring the same control into later, but it is not where he is working today and
`PodsView.vue` currently consumes only its per-pod counts, not its rows. Ship the pod-detail tick
first.

**The endpoint.** A sibling to the existing PATCH, on the same course-scoped router
(`services/voice-engine/pods-router.cjs`), taking a set of ids so the "approve all remaining"
case is one request rather than 104:

```
POST /api/production/:courseCode/pods/sentences/approve
     { sentence_ids: [...], approved: true }
```

Same gate as its sibling, same course-ownership check (every id must belong to a pod of this
course), and it writes **only** the approval columns. Reuse `buildSentenceEditPatch`'s neighbours
in `pods-cast.cjs` and extend `services/voice-engine/__tests__/pods-cast.test.cjs` rather than
standing up a new harness.

**Reversible, and it records who.** Recommended default — flagging it as a default, not a ruling
from Tom: **yes to un-tick, and yes to an audit trail.** This is a multi-editor community surface,
approval is a claim a person is making about someone else's work, and two columns are cheap:

```
target_text_approved_by   text        -- the approver's email
target_text_approved_at   timestamptz
```

Approve sets `target_text_draft = false` plus both columns; un-tick sets `target_text_draft = true`
and nulls both. Without the columns you cannot tell an approved line from a line that was never
drafted in the first place, which is the state most of the estate is already in — and that
distinction is the entire value of the marker.

**Ticking must never touch audio.** Hold this firmly: approving text is a statement that the text
is right, so it must not null `target_audio_id`, `known_audio_id` or any audio pointer, and must
not delete an audio row. The estate has a hard make-before-break rule here and a documented
incident from breaking it (`docs/architecture/AUDIO_PIPELINE_ARCHITECTURE.md` §6b; the 2026-08-03
fra purge). This is also the bug in the current re-save-to-approve workaround, so the new path
must be explicitly, testably audio-inert — assert it in the test.

An edit still clears the draft marker exactly as it does now. Editing is approval with changes;
the tick is approval without.

## 3. Size

**Medium.** The endpoint and the UI are each small and follow patterns already in the file, but it
needs a DDL migration for the two audit columns and a decision on the un-tick semantics, and a
schema change on a production table is what lifts it off small.

If Tom wants it today and is content to lose the audit trail, the **small** version is the same
tick writing only `target_text_draft = false` with no migration and no new columns — perhaps two
hours. That version is not reversible in any meaningful sense, because once the flag is off there
is nothing recording that it was ever on.

## 4. What needs Tom

1. Confirm build, and at which size — medium with the audit columns, or small without.
2. Confirm the reversible + record-the-approver default, or overrule it.
3. Confirm the tick belongs on the pod detail rows rather than a dedicated proofreading queue.
