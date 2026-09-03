# Italian Pod 1 — Option C, the partial rollback: 4 kept, 7 reverted

*2026-08-24. Tom's ruling on the two-voice re-render of job b8ea5db0 / #360 (commit
`93ee62956`): keep the four lines that are a real answer, put the other seven back on the
single learner voice.*

**Landed: 14 links moved back, 0 clips rendered, 0 clips deleted, £0.**

---

## 1. What was decided, and why

The re-render moved **11 turns × 2 tracks = 22 clips** off the learner voice
(`ara` / `bedd6226`, both female) and onto the second voice (`x7avnu1k` Enzo /
`gfzdpspr5fdp` Tom, both male), because the two-voice recast had reattributed **Staff** and
**Interlocutor** to that second voice.

The eyes-open read of Extra phrases 15-21 (commit `eb6710922`, defect **D1**) then found the
premise was wrong for most of those lines: **these scenes are variant drills, not dialogue.**
Consecutive rows are competing rephrasings of the same beat, so giving them to a second
character makes the pod contradict itself — scene 21 had voice B answering one question with
*"It's down there on the left"* and then *"It's down there on the right"*, and then, asked to
repeat, *"Yes, I said it's over there"*, matching neither.

Only four of the eleven are a real answer with no competing variant. Those four keep the
second voice. The other seven go back.

| | line | row id | speaker | text | now |
|---|---|---|---|---|---|
| **KEEP** | 16.9 | `SC16-S009` | Staff | "No, we only take cash." | second voice |
| **KEEP** | 17.2 | `SC17-S002` | Staff | "Do you want to pay by cash or card or put it on the room?" | second voice |
| **KEEP** | 17.9 | `SC17-S009` | Interlocutor | "No, it's a little cold today." | second voice |
| **KEEP** | 21.8 | `SC21-S008` | Interlocutor | "Yes, I said it's over there." | second voice |
| **REVERT** | 17.4 | `SC17-S004` | Staff | "Would you like to pay by cash or card or on the room?" | learner voice |
| **REVERT** | 17.5 | `SC17-S005` | Staff | "Did you want to pay by cash or card?" | learner voice |
| **REVERT** | 21.5 | `SC21-S005` | Interlocutor | "It's down there on the left." | learner voice |
| **REVERT** | 21.6 | `SC21-S006` | Interlocutor | "It's down there on the right." | learner voice |
| **REVERT** | 21.11 | `SC21-S011` | Interlocutor | "Would you like to order some drinks?" | learner voice |
| **REVERT** | 21.12 | `SC21-S012` | Interlocutor | "Do you want to order some drinks first?" | learner voice |
| **REVERT** | 21.13 | `SC21-S013` | Interlocutor | "Did you want something to drink first?" | learner voice |

Each of the seven moves on **both** tracks, Italian and English — 14 slots.

**Scene 16 is never written at all.** Its only reassigned line, 16.9, is a keeper. Scenes 18
and 19 were never touched by the re-render and are not touched here.

## 2. The rollback was free — checked, not assumed

The re-render was make-before-break and deleted nothing (its §4 step 4: *"the superseded clips
are the rollback"*). So this is a **pure link update**: two uuid columns on seven rows. No TTS
call, no S3 write, no spend.

That premise was verified per row before anything was written:

- **No drift.** All 22 slots still held exactly the clip the re-render put there — every one
  read `IS-NEW`. Nothing else had moved these rows in the interval.
- **All 14 superseded clips alive** in `course_audio`, each with a non-null `s3_key` and a
  non-null duration.
- **Each still carries the original voice** (`xai_ara` / `xai_bedd6226`). A revert onto the
  *new* voice would have been a no-op dressed as a fix, so the tool blocks on it.
- **Each S3 object still serves**, HTTP 200 with non-zero content-length, 18,432–45,504 bytes.
  Pointing a live pod at a dead key would be worse than leaving it alone — the lesson of the
  2026-08-03 fra Azure purge.

The write was one transaction, 14 UPDATEs, each carrying the expected current clip id in its
WHERE predicate so any drift rolls the whole thing back. `committed: 14 link(s) moved back.`

**Nothing was deleted.** The 14 second-voice clips stay in `course_audio` and in S3, so this
revert is itself reversible by running the same swap in the other direction.

## 3. Re-verification — what is live now

Read back from the DB, joining each link to its clip's voice:

**Scene 16** — 16.1 to 16.8 Learner on voice A; **16.9 Staff on voice B** answering 16.8
*"Can we pay by card?"* with *"No, we only take cash."*; 16.10 Learner on A replying *"I'm
sorry, I don't have any cash."* A real three-beat exchange, and the only cross-voice moment in
the scene. Reads correctly.

**Scene 17** — **17.2 Staff on B** asks *"Do you want to pay by cash or card or put it on the
room?"*; 17.3 Learner on A answers *"Can we put it on the room, please?"* That is the real
exchange and it survives. **17.4 and 17.5 are back on A**, so they now read as what they are —
the learner's own drill rephrasings of the same question — rather than a staff member re-asking
a question that was already answered at 17.3, which was D1's specific complaint. **17.9
Interlocutor on B** answers 17.8 *"Is the water warm?"* with *"No, it's a little cold today."*
Correct.

**Scene 21** — 21.5 and 21.6, the left/right pair, are **both back on A**, so the
contradiction is gone: they are two variants of one drill in one voice, not one character
giving two incompatible directions. **21.8 stays on B**, answering 21.7 *"Can you say that
again?"* with *"Yes, I said it's over there."* — a genuine exchange, and now the only
second-voice line in the scene's body. 21.11/12/13, the three drink offers, are **back on A**,
which also removes the three-line same-voice run on B that the re-render had created.

Long single-voice runs in these scenes are the intended design, not flattening — that is
Aran's chunk ruling, recorded at commit `12e6c1ab8`.

**Zero link mismatches** across all 22 slots: every keeper reads its new clip id, every
reverted slot reads its old clip id, on both tracks.

### Gates

- **`checkPodCast`** — **PASS**. `ok: true`, `failures: []`, 0 uncast, **0 same-voice exchange
  pairs**, 21 exchange pairs, voices in use `[ara, x7avnu1k]`. The 16 `wrong-row` explainer
  warnings are the pre-existing stale-explainer backlog, unchanged by this job and unchanged by
  the re-render before it.
- **`verify-pod-audio-fidelity.cjs ita_for_eng`** — **PASS**. 231 rows, 1,109 checks, 1,084
  distinct clips, **0 scored failures**, 0 informational, verdict `REPAIRED+VERIFIED`.

As expected, the pod now has fewer alternating-voice lines than it did an hour ago. Neither
gate treats that as a failure, because neither gate has an opinion about how *much* a pod
should alternate — only about whether a voice is in the cast and whether an exchange collapses
onto one voice. Both answers are still right.

## 4. One thing Tom should know: the cast now disagrees with the content decision

**Re-running `rerender-off-role-pod-turns.cjs --apply` on this pod would undo this revert and
spend money doing it.**

The pod's `speakers` map still says Staff and Interlocutor sit on the second voice — that is
what the two-voice recast wrote, and this job deliberately did not touch it. The off-role
measurement re-run after the revert now reports exactly the seven reverted turns, 14 slots, as
"off-role", and offers to render them:

```
OFF-ROLE whole-turn slots (this tool's scope): 14 across 7 turn(s)
DRY RUN — would render 14 clip(s), verify each, then swap 14 link(s).
```

That is not a bug in either job. It is the honest consequence of Tom's ruling being a
**per-line exception that the cast cannot express**: the cast is per-role, and the decision is
that seven particular *lines* of two roles stay on the learner voice because they are drill
variants rather than dialogue. Nothing in the schema records that.

The clean fixes, none of them taken here because the choice is Tom's:

1. Leave it, and treat the tool as requiring a named scope on this pod.
2. Split the roles in the pod script — a `Staff (variant)` / `Interlocutor (variant)` speaker
   cast to the learner voice — so the cast states the decision and the tool agrees with it.
3. Teach the tool a per-pod exception list.

Option 2 is the only one that makes the data self-describing, and it is a text change to the
pod script, which **does** engage the migration protocol. Worth doing properly rather than
quickly.

## 5. Migration protocol — does not apply, and here is the check

Same reasoning as the re-render, re-checked rather than inherited. `learner_pod_state` keys on
`sentence_id` (`ita_for_eng:pod-1:SC17-S004`); there is no audio id anywhere in that key. This
job changed no sentence text, no position, no slot, and no split array — it wrote
`target_audio_id` and `known_audio_id` on seven existing rows. The words are identical; only
which voice says them changed. A learner credited with `SC21-S005` has heard exactly the
sentence they are credited with.

The 69 split-array clips carrying pre-existing voice drift were **not** written, here or by the
re-render: a split segment cannot be repointed from the row's text, it has to be re-cut.

## 6. Reproduce

```
node tools/pods/revert-ita-pod1-partial-2026-08-24.test.cjs        # 11/11 green
node tools/pods/revert-ita-pod1-partial-2026-08-24.cjs             # dry run
node tools/pods/revert-ita-pod1-partial-2026-08-24.cjs --apply
```

Logs: `docs/pods/ita_for_eng-pod-1-partial-revert-2026-08-24-{dryrun,applied}-log.json` —
per slot, the from/to clip ids, the served-bytes proof, and the result. The applied log also
records the four keepers explicitly, so the state is readable without re-deriving it.

The authority for every old↔new pair is the re-render's own applied log,
`ita_for_eng-pod-1-off-role-rerender-2026-08-24-applied-log.json`. No pair is composed by this
tool: a row that is not in that log cannot be touched by it.
