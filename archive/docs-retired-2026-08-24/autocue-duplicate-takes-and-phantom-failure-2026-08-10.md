# The duplicates and the phantom "1 failed" — one tail, two symptoms

**2026-08-10.** Sascha, recording deu_at in Autocue Studio, reported two things: re-recording a
phrase produced multiple copies of it, all wired together so pressing play on one made every copy
react; and the session summary said "1 failed" when nothing had knowingly failed. Kai's hypothesis
for the second was that Stop was pressed right after the last phrase and the tail got cut.

Both are real, both are now fixed and live. Kai's hypothesis was the right shape — the phantom
really is a scrap of audio at the end of the session — but the mechanism is not a cut tail. It is a
capture that was opened and never closed.

---

## Symptom 1 — the duplicates

**Root cause: the client appended takes instead of replacing them, under one shared identity.**

`onSegmentCaptured` in `src/composables/useAutocueState.js` pushed a new row onto
`state.recordedSegments` for every captured take, keyed `seg_<phrase.id>`. That id is deliberately
stable per phrase — so a second take of a slot produced a second card carrying the *same identity*
as the first. Everything downstream reads by id:

- `SessionReview` marks the playing card with `segment.id === playingSegmentId`, so **all** copies
  lit up when one played. That is the "they all react" report — not a shared `<audio>` element.
  There is exactly one shared `Audio` object (today's playback fix), and it is not the cause.
- Approve/Redo status is `approvedIds.includes(segment.id)`, so a verdict on one card was a verdict
  on every copy.
- `v-for :key="segment.id"` collided.

Not a regression from today's work. Today's fixes added the review controls that made the shared
identity *visible*; the append has been there since script mode was written.

**Server side: duplicates land, and they are not corruption.** Script-mode takes mint a fresh
identity per upload and are recorded in `recording_provenance` (never overwritten — make-before-
break). The voice engine's `groupTakesByPhrase` takes the **latest take per (phrase, cadence)**, so
a superseded take stays on S3, reversible, and loses. See "What Sascha's session actually looks
like" below for why that rule needs Kai's eye on this particular session.

**Fix:** a take replaces its predecessor in place — old blob URL revoked, the old take's verdict
dropped (a verdict belongs to a take, not to a slot), and a "Take N" badge on the card so a retake
in the same voice is visibly a retake. The upload queue additionally drops any earlier take of the
same item still waiting in the queue, and counts uploaded **slots** rather than uploads performed.

## Symptom 2 — "1 failed" with nothing failed

**Root cause: a capture the VAD opened and then disowned, left running until Stop.**

`useVAD` fires `onSpeechStart` the instant the level clears the threshold — and the recorder opens a
MediaRecorder capture there. But it only fires `onSpeechEnd` if the run turns out to be at least
`minSpeechDuration` (300ms). A cough, a chair, a door therefore left the recorder **still recording**
with a stale start time, silently. Whatever stopped it next — the recordist pressing Stop at the end
of the session — shipped that as a take: room tone, trimmed to nothing server-side, and correctly
refused **422** by the silent-take guard ("no audible speech"). One unexplained red failure on a
session that went fine.

**Compounding it — the session ends but the recorder does not.** Capturing the last item
auto-advances off the end of the script, which calls `stopRecording()` and lands on the summary
screen. There is no Stop button there. The continuous recorder was left live through all of it: mic
open, VAD listening. Any noise in the room then started another capture against the **last item** —
a duplicate take of it if long enough, a 422 phantom if not.

**Fixes:** the VAD now reports a disowned run (`onSpeechAborted`); the recorder closes and drops the
capture rather than leaving it open; a capture Stop catches before it is a take is dropped rather
than uploaded; and whatever ends the session now ends the recorder with it.

**And the messaging gap Kai suspected is real.** The summary showed a bare red "1 Failed". The
server's own words were already carried in the queue but only shown mid-session. The summary now
lists every refused take with its item and the server's reason, so a recordist knows whether
anything actually needs recording again.

---

## What Sascha's session actually looks like — live evidence

`recording_provenance`, `deu_at_for_eng`, session `session_1786212125263` (2026-08-08). Five phrases
× two cadences = ten takes expected. Twenty-five landed. Sizes are the S3 objects (~4KB/s):

| time | cadence | phrase | size |
|---|---|---|---|
| 18:02:15 | natural | i wü iatz wos auf Deitsch sogn | ~12.3s |
| 18:02:23 | slow | i wü iatz wos auf Deitsch sogn | ~19.6s |
| 18:02:27 | natural | i wer mit wem aundern reden übn | ~11.0s |
| 18:02:33 | slow | i wer mit wem aundern reden übn | ~14.8s |
| 18:02:37 | natural | i versuch zum lernen, wia ma redt | ~5.3s |
| 18:02:43 | slow | i versuch zum lernen, wia ma redt | ~13.2s |
| 18:02:48 | natural | i wü mit dir lernen, wia ma wos sogt | ~5.6s |
| 18:02:58 | slow | i wü mit dir lernen, wia ma wos sogt | ~16.3s |
| 18:03:03 | natural | wia ma so oft wia möglich redt | ~6.6s |
| **18:03:07** | **slow** | **wia ma so oft wia möglich redt** | **~5.9s ← the script ends here** |
| 18:03:22 | slow | *same phrase* | ~28.2s |
| 18:03:47 | slow | *same phrase* | ~48.0s |
| 18:03:59 | slow | *same phrase* | ~3.2s |
| 18:04:11 | slow | *same phrase* | ~38.8s |
| 18:04:26 | slow | *same phrase* | ~56.6s |
| 18:04:31 | slow | *same phrase* | ~8.3s |
| 18:05:07 | slow | *same phrase* | ~111.3s |
| 18:05:19 | slow | *same phrase* | ~39.3s |
| 18:05:25 | slow | *same phrase* | ~19.3s |
| 18:05:32 | slow | *same phrase* | ~7.5s |
| 18:05:39 | slow | *same phrase* | ~20.6s |
| 18:05:59 | slow | *same phrase* | ~69.1s |
| 18:06:01 | slow | *same phrase* | ~5.6s |
| 18:06:13 | slow | *same phrase* | ~40.8s |
| 18:06:21 | slow | *same phrase* | ~21.2s |

Every take after 18:03:07 is against the same last item, over three minutes after the script
finished, in bursts of up to 111 seconds. That is not a recordist re-recording — that is a live mic
on the summary screen turning whatever it heard into takes of the final phrase. The mechanism is
confirmed against real data, not inferred from the code.

Nineteen takes of that phrase exist across all sessions; the other four phrases have two or three
each, which is ordinary re-recording plus this same tail effect on earlier runs.

### One decision for Kai — NOT actioned

The voice engine takes the **latest** take per (phrase, cadence). For
`wia ma so oft wia möglich redt` / slow that is currently the **18:06:21, ~21s** object — a take
recorded three minutes after the read finished, which may be room noise rather than Sascha's read.
The likely-correct take is the 18:03:07 one (~5.9s, the last one the script actually asked for, and
the only one whose length matches its natural-cadence sibling at ~6.6s).

Nothing has been deleted or repointed — that needs an ear on the audio and it is Kai's call.
The objects are all at `s3://ssi-audio-stage/mastered/<uuid>.mp3` and listenable; the uuids are in
`recording_provenance` filtered on `quality_notes->>'script_session_id' = 'session_1786212125263'`.
Same question, smaller, applies to the four other phrases.

---

## What shipped

`src/composables/useAutocueState.js`, `useAudioUpload.ts`, `useContinuousRecorder.ts`, `useVAD.ts`,
`AutocueStudio.vue`, `SegmentCard.vue`. Eleven new tests in `src/composables/autocue-retake.test.js`
and `src/composables/useContinuousRecorder.abort.test.js`: retake supersession (list, URL, verdict,
take number), queue failure supersession, VAD abort emission, and the four recorder corners — cough
dropped, Stop-caught tail dropped, real mid-phrase take still delivered, clean phrase delivered
exactly once and not again on Stop. Full autocue suite 68/68; build clean.

Commit `2dd2d568`, on `main`, live on popty.app and verified in the served chunk
(`assets/AutocueStudio-DJs_eWnu.js` carries the supersession, the take badge, the summary failure
list and the VAD abort path).
