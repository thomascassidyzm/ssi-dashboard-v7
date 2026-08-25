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

## The sweep found it — and it is not a mislabel, it is junk

All 225 clips were decoded with whisper-medium (German) and each decode scored
against its own text and against all 224 others. **The signal is unambiguous.**
A good clip lands around **0.77** similarity to its own text — whisper renders
Austrian dialect into Standard German spelling, so that is the ceiling, and it
is the median across the course. Below about **0.5** the audio stops being a
reading of the line at all:

| bound text | what the audio is |
|---|---|
| `i wü` | "Platt!" |
| `i wü reden` | "Baba." |
| `i wü iatz mit dir Deitsch reden` | "blabla blabla blabla" |
| `reden` | *[clapping]* |
| `kannst d'Tür offen hoitn, solang i de Schlüssl hol?` | "Ups!" |
| `wer a immer gsogt hot, dass des schwa wird, der hot voi recht ghobt` | *[laughter]* |

Note what this is **not**: no clip anywhere in the course decodes as a *different
course line*. The off-by-one mislabel hypothesis is **disconfirmed**. What is
actually happening is that the recordist's fumbles, mic checks and reactions are
being filed as clips and promoted by the newest-take rule.

### The first four are already off the learner path

`i wü`, `reden`, `i wü reden` and `i wü iatz mit dir Deitsch reden` — 14 slots
including **lego S0001L01 and seed 1** — are linked to Azure TTS, and their only
human "take" is the mic-check junk above. Each of those four texts has exactly
**one** take, so there is nothing to fall back to. Promoting them under the
mandatory-fallback rule would put "blabla blabla blabla" on seed 1 of a live
course. **Left on TTS**, and put at the top of the listening page for Kai's ear.

### The last two were live, and were fixed

These two *were* being served to learners. In both cases an earlier take of the
same line is a complete, correct read, and the newest-take upsert had buried it:

| line | was serving | now serving |
|---|---|---|
| `kannst d'Tür offen hoitn…` | `481AB75B` — 4.9s, "Ups!" | `A9E2B785` — 10.0s, the whole line |
| `wer a immer gsogt hot…` | `8D0C77FA` — 5.5s, laughter | `D06A4593` — 8.3s, the whole line |

The first good take was only ever unbound because the 2026-08-21 trim-duration
bug (`db439d0ab`) refused it; it was recovered from the raw archive at 13:12, and
a fumbled retake at 13:13 overwrote it. The second's history is in
`course_audio_revisions`: revision 1 → 2 → 3 walked from a good read to a laugh.

**This is a deliberate deviation from the letter of the rule**, and it is flagged
as one. Both branches Kai specified — newest-accepted, else newest-overall —
select the clip that was live. The goal sentence ("every phrase ends up on its
**best available** take"; "newest is better than a **bad take**") points the
other way, and here the newest *is* the bad take. Quality was read as the goal
and recency as the tiebreak.

Applied via the estate's standard versioned swap (`swapClipInPlace`): **nothing
was deleted**, the superseded objects stay at their keys, every learner link is
untouched, and `course_audio_revisions` names the rollback —
`source = 'deu-at-junk-take-repoint'`, revisions 2 and 4. Verified by
re-downloading and re-decoding the bytes now actually served, not by trusting
the write.

## What was and was not applied

**Two versioned clip swaps, named above. No re-pointing of the 225 bindings**
(none was needed), **no TTS, not one clip generated** — as instructed.

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
