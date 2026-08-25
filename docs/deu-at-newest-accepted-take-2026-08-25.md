# Austrian German — the newest *accepted* take, and why the rule changes nothing

**2026-08-25 · `deu_at_for_eng` · Sasha's 225 human clips · read-only investigation**

## The headline

**225 of 225.** Every phrase in this course that has a human recording falls into
the fallback branch of the rule — *"recordings exist, but none is accepted"*.
Not because nobody accepted anything, but because **acceptance is never saved
anywhere**. There is no flag for a linker to respect.

And the second number: **0 phrases changed binding.** All 225 clips already
resolve to the newest take of their line. Nothing was re-pointed, because
nothing needed re-pointing — and because a re-point cannot fix what Kai heard.

## The standing question, answered: does the linker respect acceptance?

**No. Nothing does, because nothing records it.** Four paths, checked in code:

| path | what happens to the ACCEPT tick |
|---|---|
| **Script mode** — all 331 of Sasha's takes | `useAutocueState.finalizeSession` returns early when `state.scriptMode` is set, with the comment *"Approval in script mode is the recordist's own tick-list, not a gate"*. `approvedSegments` is a browser-side `Set`. It is never POSTed. Every take was already uploaded the moment it was captured. |
| **Non-script autocue** | Approval does gate — but only by *not uploading* the rejects. Nothing downstream ever sees an acceptance flag either. |
| **Recordist re-record queue** (`voice-engine/recordist-router.cjs`) — **this is the Welsh path** | One tap goes straight to the upload seam and swaps the live clip. There is no accept step at all. |
| **Storage** | No `accept`/`approve` column on any audio table. (`course_audio_revisions.accepted_by` names *who ran a swap*, not a verdict on a take.) No `accepted` key in any of the 331 `recording_provenance.quality_notes` blobs — the keys present are `superseded_by`, `superseded_at`, `discarded_at`, `discarded_reason`, and nothing else judgemental. |

So **yes, this matters beyond this course, and it matters for Welsh right now**:
a Welsh re-record uploaded through the queue goes live on the tap, unaccepted
and unheard. That is a decision to make, not a bug to fix quietly — flagging it
rather than acting on it.

### What actually decides the bound take today

`course_audio` is UPSERTed on `(course_code, text_normalized, language, role,
voice_id)`, so **the newest natural take wins**, reinforced by `superseded_by`
marks from `services/take-supersede.cjs`. Slow-cadence takes are deliberately
never filed as clips.

## Calibration — I could not find Kai's clip, and here is why that matters

The brief said: prove the rule against the clip Kai heard before applying it.
**I could not, and I am reporting that as a gap rather than papering over it.**
But the gap turned out to be informative:

The rule *cannot* be the fix. A stale-take bug would show up as a clip bound to
an older take. Measured across all recordists' takes of every line:

```
225 course_audio rows
225 bound to the NEWEST take   (by server insert clock AND by phone clock)
  0 bound to an older take
  0 bound to a take with no provenance row
```

There is no stale binding to correct. Whatever Kai heard, a newest-take rule
would have left it exactly where it is. **The remaining explanation is a
mislabel at capture** — the autocue advance gate filing take *N* under phrase
*N+1*'s text, which is precisely the failure the studio's own code comments warn
about ("making it unconditional is what turned every VAD misjudgement into a
mislabelled clip"). That is invisible to every metadata check and visible only
to an ear.

An ASR cross-match probe (job #620, Sonnet) is running to rank candidates:
whisper-medium decodes each of the 225 clips and scores the decode against *its
own* text and against *all 224 others*; a clip that matches somebody else's text
better than its own is a mislabel candidate. Its ranking feeds straight into the
listening page as soon as it lands — the page re-reads it per request, so it will
appear on refresh without a restart. **Its result is not yet in this document.**

## What was and was not applied

**Nothing was written to the database.** No re-pointing (none was needed), no
TTS, not one clip generated — as instructed.

## One wart found in passing

Sasha's take `6B27C495` of *"i wü iatz wos auf Deitsch sogn"* is marked
`superseded_by E7F55B7B` — but `E7F55B7B` is not a re-record. It is a diagnostic
probe (`recorded_by = probe-target1-slot-check`, role `target1`) from
2026-08-21. `supersedeEarlierTakes` matches on `voice_id` and does **not** check
`role`, so a target1 probe under the same voice condemned a target2 take. Live
impact today: none — the clip is still correctly bound and the probe's own
`course_audio` row is gone. But the matcher is one role check short.

## The instrument

Kai judges by ear. The listening page is at **https://watson-1.tail4968cb.ts.net:8450**
(tailnet only, works on a phone). 225 clips, riskiest first, one-tap
Real/Wrong, verdicts persist across reloads and restarts, `/api/export` hands a
later worker the clip id, S3 key, bound text and every take of the line.
Nothing is preloaded; the list pages 25 at a time.
