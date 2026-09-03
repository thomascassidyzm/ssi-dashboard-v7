# Welsh pod-0 human recording — aligned to Aran's new canonical

2026-08-06. The question was: is the human recording still doing the older stuff?

**It was. It isn't now.** Both Welsh recording queues were serving all 142 sentences of
the superseded pod-0 English. They now serve Aran's 231, and an automated probe run
through the same code the recording room uses says a Welsh recorder cannot be shown a
line of the old text on any of the four queues.

## The answer Aran will want first

**Almost everything he already recorded still counts.**

| | Northern Welsh | Southern Welsh |
|---|---|---|
| **Survives word for word — no re-recording** | **114** | **118** |
| Reworded — needs a fresh take | 27 | 24 |
| Brand new — needs Welsh written, then recorded | 90 | 89 |
| Gone from the canonical entirely | 1 | 0 |
| Canonical total | 231 | 231 |

**Welsh takes already in the bank: 28, of which 26 stay valid.** Two are attached to a
line whose English changed. English guide takes: 26, of which 23 stay valid. Southern
Welsh has no takes yet at all.

Of the reworded lines, 8 (North) and 9 (South) changed only in how a number is written
— Aran's canonical writes the drill tails as "1. 2. 3." where the old text spelled them
"One. Two. Three." **The Welsh for those is untouched**; only the English guide line
needs a fresh take. So the genuinely reworded count is 19 and 15.

109 (North) and 108 (South) surviving lines moved position in the renumbering. Moving
is not re-recording — those takes are still good; the ordering was simply re-pointed.

Line by line, scene by scene: **[Welsh pod-0 — what changed under the recording](https://watson-1.tail4968cb.ts.net/d/8e01c02b)**.

## What blocks the recording, and whose call it is

**Welsh text does not exist for 109 (North) and 104 (South) of the 231 canonical lines.**
That is a translation task blocking the recording task. No machine wrote a word of it
and none will: `pod-dialogue-generator --sync` would have LLM-translated all of it, and
that was not authorised. **Whose call: Aran's or Kai's.**

Those lines are not in the Welsh recording queue at all, and each sheet says so per
scene, so nobody improvises at the microphone. The **English guide line** for a new
sentence *is* recordable now and does appear in the queue — the guide reads the English
too, so an English rewording creates recording work even where the Welsh is untouched.

A smaller list needs an eye rather than a fresh translation: 20 (North) and 15 (South)
lines where Welsh exists but the English it was written for has changed. Old English,
new English and the existing Welsh are set side by side in
[the translation worklist](https://watson-1.tail4968cb.ts.net/d/18ace96b). Several will turn out to be
fine as they stand — "I'm learning Northern Welsh" became "I'm learning Welsh", and the
Welsh says "Dw i'n dysgu Cymraeg" either way — but that is a human's call, so they are
all held rather than quietly kept.

## What I changed

The recording room reads `listening_pod_sentences`, not `canonical_pod_scenarios` —
that gap is why the old text survived. Both Welsh pods are now realigned to the
canonical: 231 rows, 22 scenes, contiguous order 1–231, verified against the canonical
with **zero mismatches on English, speaker, scene number or sentence number**.

Welsh `target_text` was treated as sacred: carried forward only onto slots whose
English is unchanged, never invented, never overwritten. Every other slot carries empty
Welsh, which the plan builder's own truthiness guard turns into "not recordable yet"
rather than "recordable with the wrong words".

**Nothing was deleted.** No audio, no rows. Where a line's English changed, the slot's
pointer to the old take was dropped so the recorder is not told "already done" about a
line that now reads differently — the recording itself is untouched in `course_audio`
and every dropped pointer is listed in the archive. Make-before-break holds: there is
no replacement yet, so nothing goes. The one row per course the new canonical has no
slot for is blanked and parked out of the queue rather than removed.

The four prompt sheets are regenerated from the aligned data, so paper and screen agree
line for line. The old pack is moved wholesale to
`docs/pods/welsh-recording-pack-SUPERSEDED-2026-07/` so two live-looking packs cannot
sit side by side.

Aran's chunk ruling is applied and is now read back off the data rather than assumed:
scenes 1–14 and 22 print as dialogue with their characters, scenes 15–21 as single-voice
chunks with "no scene-based to and fro". His sentence and Tom's two-voice line are
quoted verbatim in the pack README so the next person inherits the ruling.

The whole pre-alignment state is archived and restorable verbatim — I used that path
twice while getting the write right.

## Three things that need Tom or Aran

1. **`[target language]` appears literally on five canonical lines.** Substituting is
   the established pipeline behaviour, and I substituted **"Welsh"** on both courses —
   the Southern rows already said "Welsh", the Northern rows said "Northern Welsh",
   which is not what a learner says out loud. Say the word if it should be different.
2. **Two Welsh takes and three English guide takes are now orphaned** by lines whose
   English changed. My recommendation: re-record them, and **do not delete the old
   files** until the replacements are verified live.
3. **One Welsh line has nowhere to go**: "No, it's free. You're welcome to sit."
   (`Nac ydy, mae hi'n rhydd. Croeso i chi eistedd.`) — Aran replaced it with "Please,
   go ahead." The old Welsh is archived. Recommendation: leave the row parked; deleting
   it buys nothing.

## Scope kept, and one honest gap

**64 other courses' pod-0 recording queues are still on the old 142-line canonical.**
None of them has a single human take, so nobody is recording against stale text
anywhere but Welsh — but the same realignment is owed to them. Counted and listed here
as follow-up scope, deliberately not touched. `zzz_test_for_eng` has 6 rows and is a
test fixture.

The other recording surface, `GET /api/production/:course/recording-script`, **cannot
serve pod text at all** — it reads `course_seeds`, `course_legos`,
`course_practice_phrases` and `course_audio`, and never touches `listening_pod*`. Scoped
out, not left ambiguous.

**Gap, stated plainly:** the live `recording-plan` HTTP endpoint is authentication-gated
and I have no dashboard session, so I could not curl it end to end. I verified one layer
down instead, which is stronger than a document but weaker than a browser: the probe
builds the queue through the very same `buildRecordingPlan`/`finalizeRecordingPlan`
functions the route calls, against the live tables. The route adds auth and
serialisation on top of that and no text of its own. Somebody with a login should still
open `/record/cym_n_for_eng?podVoice=human_aran_cym_n` once and confirm by eye.

## How to re-run any of it

```
node tools/pods/pod0-recording-diff.cjs                    # the three-way diff, read-only
node tools/pods/align-welsh-pod0-to-canonical.cjs          # dry run
node tools/pods/align-welsh-pod0-to-canonical.cjs --apply
node tools/pods/align-welsh-pod0-to-canonical.cjs --restore-from-archive
node tools/build-welsh-recording-pack.cjs                  # the four prompt sheets
node tools/pods/verify-welsh-pod0-queue.cjs                # the acceptance probe
```

Every number above came from Supabase, not from a document. The diff and the alignment
share one module, so the counts in the sheets, the diff doc and this report cannot drift
apart.
