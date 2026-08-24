# Kai's Finnish recording queue — why it was empty, and what changed

**2026-08-19.** Approved by Kai, who confirmed he is the only person working on Finnish.

## What Kai was seeing

Kai's link `https://popty.app/r/human_kai_fin` opened the real recordist screen,
greeted him by name, and told him everything was recorded. That is not a lie —
it is exactly what an **empty** queue looks like. There were no Finnish lines in
his queue at all.

## Why it was empty

The recording queue is assembled by **language**, and a line only reaches a
recordist if the course's *cast* says which kind of voice that character needs.
The cast lives in `courses.voice_config.podCast`: one entry per character
("Sarah", "Narrator", "Barista"…), each carrying a gender bucket.

`fin_for_eng` had **no cast at all**. So all 232 sentences of its pod fell into
the bucket the code calls `uncast` — deliberately not guessed at, deliberately
not shown to anybody. Every Finnish line was invisible to every queue.

That is the whole of it. Kai's identity in `language_recording_policy` sits
under the gender key `test`, which was reported as a second, independent
blocker. It is not: the queue does not require the key to be `m` or `f` — it
matches the cast's bucket to the recordist's bucket, whatever the two strings
are. It only looked like a blocker because there was no cast on the other side
to match against.

**The third suspected blocker does not apply.** `recordist-queue.cjs:249` does
return an empty queue for a language with no pods at all, before the
flagged-clip source ever runs. `fin_for_eng` has one pod (`fin_for_eng:pod-0`)
with 232 sentences, so that early return was never reached here. It remains a
real latent defect for a language that has flagged clips but no pods — Breton
and Pennsylvania Dutch are the candidates — and it was left alone tonight
because fixing it is a code change touching every language's queue, which is
outside a Finnish-only job.

## What changed — one database write, one column, one course

`courses.voice_config.podCast` for `fin_for_eng` gained 26 entries, one per
character in the pod:

```json
"Sarah": {
  "name": "Kai (TEST cast — Finnish recordist trial, not a production voice)",
  "gender": "test"
}
```

Two deliberate choices in that shape:

- **The bucket is `test`, not `m` or `f`.** That matches the `test` label
  already on Kai's identity, and it means the real male and female Finnish cast
  slots stay empty and unclaimed for whoever eventually records Finnish for
  real. Nothing has been squatted.
- **There is no `voiceId` in the cast entries.** The take-upload path forces the
  recordist's own policy voice (`forcedVoiceId`, `production-api.cjs:4940`), so
  a voice id here would do nothing for Kai — it would only sit in the course
  config as a trap for a future pod render. Leaving it out means pod audio
  generation for `fin_for_eng` behaves exactly as it did yesterday.

Nothing else was written. No audio was generated, no TTS was called, no clip
was created or deleted, no other course and no other language was touched.

## What Kai will see now

Tapping the link gives **231 Finnish lines** to read, starting with
*"Huomenta, Sarah!"* over its English crib *"Good morning, Sarah!"*, a live mic
meter, and Again / NEXT / Stop here.

231 rather than 232 because one row of the pod — `fin_for_eng:pod-0:SC15-S012`,
a Narrator line — is genuinely blank in both Finnish and English. It is not a
casting problem; there is nothing there to read. Worth someone looking at
separately.

## How to undo it, completely

Delete the `podCast` key from `fin_for_eng`'s `voice_config` and leave every
other key in that object alone — that restores the exact state of 2026-08-19,
because the key did not exist before this change. Kai's queue goes straight
back to zero lines and the course is byte-identical to yesterday. Nothing else
needs reverting: no code shipped, no audio exists, and `language_recording_policy`
was never touched. If Kai has recorded takes by then and they should go too,
they are the `course_audio` rows with `voice_id` in `human_kai_fin` / `kai_fin`
and `language = 'fin'` — there were **zero** of them at the time of writing.

## Welsh was proved unaffected

Aran's and Catrin's live queues were pulled before and after the change and are
byte-for-byte identical, including the full ordered list of line ids and the
set of lines flagged for re-record:

| Recordist | Before | After |
|---|---|---|
| Aran (`human_aran_cym_n`) | 191 lines, 71 flagged for re-record | 191 lines, 71 flagged |
| Catrin (`human_catrinlliar_cym_n`) | 285 lines, 0 flagged | 285 lines, 0 flagged |

Confirmed both through the queue builder directly and against the live
`popty.app` API. Only one course in the estate gained a cast: `fin_for_eng`.
