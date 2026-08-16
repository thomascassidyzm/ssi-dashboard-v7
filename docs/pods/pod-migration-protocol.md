# Content-change migration protocol — how learner progress survives an edit

*Standing doctrine. Written 2026-08-14 under Tom's A-107 ruling, and **adopted as the standing
rule by Tom on 2026-08-16** — plate item A-111, ruled "Approve" — alongside
[`pod-migration-rules-2026-08-14.md`](./pod-migration-rules-2026-08-14.md), which is the short
page that argued the rules. This page is the rule as it now runs in code, and every content
change to a pod is required to follow it.*

---

## Why this exists

Learner progress is filed under a sentence's **slot**, not its text. Change the content in
that slot and the learner keeps the progress and loses the sentence: they are credited with
something they have never heard, at whatever rung they had reached on the thing that used to
be there, so the new sentence is served late and rarely and is effectively never taught.

Nothing orphans when this happens. There is no error, no gap, no alarm. That is what makes it
worth a standing rule rather than a decision each time.

## The rule

**Progress follows the sentence, and only if the sentence stayed roughly where it was.**

1. **Match by content, never by position.** Position is the thing that broke Welsh.
2. **A content match only counts at approximately the same location.** Same text at a wildly
   different point in the sequence is not the same pedagogical event, and is not a match.
3. **A surviving sentence keeps its exposures**, carried onto its new slot.
4. **A genuinely new sentence arrives unseen.** No row is written. Absence *is* unseen.
5. **A removed sentence drops, with no penalty.** Nothing is deducted.
6. **A sentence that changed at all counts as new, not as surviving.** "Five. Ten. Fifteen."
   becoming "5. 10. 15." is the same sentence to us and a different thing to hear. Crediting
   someone for the unheard is the harm being avoided, so doubt resolves to unheard.
7. **Progress cannot go backwards.** Guaranteed by construction, not by care — see below.
8. **The migration commits in the same transaction as the content change.** Progress is never
   observable against a canon it was not mapped to, and a rollback migrates back by the same
   rules.

### "Approximately the same location", defined

**The corresponding scene, and no more than 8 sentence positions within it.**

- *Corresponding* scene means matched **by content, not by number**: the new scene holding the
  plurality of that old scene's surviving sentences. This is what lets old scene 15 legitimately
  become new scene 22 when seven scenes are inserted ahead of it, while still rejecting a jump
  to an unrelated dialogue.
- The scene is the unit because it is the pod's pedagogical unit — one dialogue, one situation.
  Leaving it is a different event whatever the text says.

**Why not a window on the index.** Measured over all 4,062 content matches between the live and
staged canons of all 37 candidate courses: the pod grows 142 → 232, so *every* survivor shifts.
Median |Δglobal_order| is 10 and reaches 90; median |Δfractional position| is 0.125. Any index
or fraction window tight enough to mean anything rejects legitimate survivors wholesale.

**Why the scene works.** 4,057 of 4,062 matches — 99.88% — land in their corresponding scene.
Within it, sentence_number moves by 0 in 4,020 cases and by exactly 7 in 37, and never more.
The bound of 8 is the observed maximum plus one place of headroom, so today it binds on nothing
and rejects nothing; the scene correspondence does the work.

The five matches this rejects estate-wide are all one numbers-drill line, "100,000. 60. 70.
1 o'clock. 11 o'clock.", which stayed at literal scene 15 in five courses while the rest of its
scene moved to 22. A genuine relocation, and exactly the class the bound exists to catch.

### "The same sentence", defined

Identical after folding the ellipsis character, curly quotes and en/em dashes, collapsing
whitespace, and case-folding. **No punctuation stripping** — which is why "Five. Ten." and
"5. 10." correctly do not match.

If a text appears twice in either canon, matching would be a guess rather than a lookup, and
the tool **refuses** rather than guessing. There are currently zero duplicate texts in any
course's live or staged canon.

### Why progress cannot go backwards

Not by care — by construction. `exposures` is a **per-sentence maturity counter**, not a
progress total. Both doors write back `effective + 1`, where `effective` floors on the derived
main-flow value, so a missing row cannot send a learner below what the main flow already knows
— see `packages/core/src/persistence/PodStateStore.ts` in ssi-learning-app. Course progress
itself rides `course_enrollments.completed_pod_rounds`, an independent ratchet that no
migration touches. Dropping a row therefore costs a little re-listening and nothing else.

## How to run it

Never edit a live pod in place. The shape is always: stage the new content on a sibling slug,
prove it complete, then flip.

```bash
# 1. See what the change would do to progress. Writes nothing.
node tools/pods/pod-state-migrate.cjs --course=<code> --from=pod-0 --to=pod-0-unrecorded \
     --log=docs/pods/a107-prospective/<code>.json

# 2. Flip. Archives the old pod, promotes the new one, migrates progress — one transaction.
node tools/pods/pod-switchover.cjs --course=<code>          # dry run
node tools/pods/pod-switchover.cjs --course=<code> --apply

# 3. If it was wrong. Restores content AND migrates progress back.
node tools/pods/pod-switchover.cjs --course=<code> --rollback --apply
```

`--accept-miscredit` discards a course's pod progress outright rather than mapping it. It is
for a draft course with throwaway state. It does not mean "leave the rows alone" — leaving them
alone *is* the mis-credit.

### Repairing a swap that already ran

`--from=@<iso>` reconstructs the pod as it stood at an instant, by replaying
`content_audit_log.old_row` backwards from live. Note that the log records UPDATE and DELETE
and **never INSERT**, so rows created after that instant have to be excluded by `created_at`
or they survive the replay as though they had always been there. That single omission
silently produced a 232-row "old" Welsh canon holding both the original scene 15 and the scene
22 it later became, and a matcher that then refused to match any of it.

```bash
node tools/pods/pod-state-migrate.cjs --course=cym_n_for_eng \
     --from=@2026-08-06T10:00:00Z --to=pod-0 --apply
```

## What this protocol does not cover

- **Non-pod content.** Seeds, LEGOs and practice phrases have their own progress model and are
  out of scope here. The principle transfers; the code does not.
- **A course whose known side is not English.** Matching keys on the known text as the shared
  identity of a sentence across languages. That holds for the `*_for_eng` estate and would need
  restating for anything else.
- **The underlying fix.** Progress is filed under position because the slot key *is* the
  sentence id. Filing it under content would make this class of problem impossible rather than
  survivable. That is a live-progress migration in its own right, costed and not done.

---

*Applied under this protocol on 2026-08-14: `cym_n_for_eng` and `cym_s_for_eng`, the two
courses swapped in place on 2026-08-11. Report and before/after counts:
[`a107-repair-2026-08-14.md`](./a107-repair-2026-08-14.md).*
