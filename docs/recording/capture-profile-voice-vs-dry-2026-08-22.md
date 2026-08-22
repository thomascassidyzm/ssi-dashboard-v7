# The microphone was being asked for the wrong thing

*2026-08-22. Tom, after tonight's live test: takes save reliably now, and the sound is "nowhere near an iPhone voice note".*

## The one fact this all turns on

On WebKit, `echoCancellation` is not a filter you switch on and off. It is the flag that **picks the audio unit**.

```cpp
// Source/WebCore/platform/mediastream/cocoa/CoreAudioCaptureUnit.cpp
OSType unitSubType = kAudioUnitSubType_VoiceProcessingIO;
if (!shouldUseVPIO) {
    unitSubType = kAudioUnitSubType_RemoteIO;      // iOS
}
...
m_shouldUseVPIO = enableEchoCancellation();
```

`true` builds **VoiceProcessingIO**, Apple's voice chain. `false` builds **RemoteIO**, the bare hardware tap. Apple keeps the **gain staging inside the voice chain**, along with the echo cancel and the noise suppression. There is no partial mode.

And there is no side door to the gain either: `autoGainControl` has never been implemented in WebKit at all — [bug 204444](https://bugs.webkit.org/show_bug.cgi?id=204444), open since 2019. Requesting it does nothing. It does not even come back as `false` from `getSettings()`; it comes back `undefined`.

So the recorder's `echoCancellation: false, noiseSuppression: false, autoGainControl: false` did not buy a clean dry voice. On an iPhone it bought a raw tap with **no gain at all**, recording a room at reading distance far below where the encoder does its best work — which the server then lifted back up with `loudnorm`, room and codec noise and all.

That is what Tom heard. A voice note effectively gets the voice-processed chain. We were asking for the one thing that guarantees we could not sound like one.

## Was the dry stream load-bearing?

No. Audited end to end (job #927), and the answer was unambiguous.

- **It was never a pipeline requirement.** It entered on 2026-06-15 in `e6ea5a8cc` (`useWavRecorder.js`) as a general opinion — "the DSP that wrecks a solo voice take" — and was carried forward unexamined into `useTapRecorder.js` the same day. No commit, comment, test or doc ever states a downstream stage that needs it.
- **Nothing downstream can even see it.** Every stage past the upload reads the mastered −16 LUFS MP3. By the time `align.cjs` or phase 8 or the audio-pass queue touch anything, the capture chain is unrecoverable regardless.
- **The splice path has never fired.** `method='spliced'` is 0 across all 524 `recording_provenance` rows, for all time. And the natural-only extraction eval landed hours earlier with 0/88 LEGO boundaries detected — for pause-physics reasons that have nothing to do with signal cleanliness.
- **The other half of this same room already does it.** `useContinuousRecorder.ts` (script mode) has been capturing with the full Apple voice bundle into the *identical* upload endpoint all along. Nothing has ever broken because of it, and nothing anywhere treats its audio as inferior.

Tom's ruling settled the rest: the raw/processed playback is a **diagnostic** — raw meaning before *our* processing, not before the phone's — so there was no fork to bring back.

## The second thing this fixes: the trim was never running

The server's read detector runs at a fixed −40 dB (`TRIM_DETECT_DB`). A dry take peaking under that has **no sample above it**, so `detectReadBounds` returns null, and the take falls through to the safety net that landed tonight and is **kept whole** — pre-roll, tail and all.

That net is doing exactly its job. But it means the dry path shipped untrimmed clips while looking like it was trimming, and the raw-vs-processed panel — which measures the difference between the two — read about zero every time and had nothing to say.

Both of those come right on their own once capture arrives at a proper level.

## What changed

**`src/composables/useTapRecorder.js`** — the two ways of asking are now named profiles, because the difference is not three booleans, it is which audio unit gets built:

| profile | `echoCancellation` | `noiseSuppression` | `autoGainControl` | iOS unit |
|---|---|---|---|---|
| **`voice`** (default) | true | true | true | VoiceProcessingIO |
| `dry` | false | false | false | RemoteIO |

The follow-up `applyConstraints()` call now comes from the same profile object as the acquisition, so it can no longer contradict it — a disagreement there would tear the unit down and rebuild it as the other one, undoing the change one line after it was made. Pinned by a test.

**`src/views/RecordistRoom.vue`** — "Record the raw microphone", off by default, remembered between sessions. The profile goes into every take's provenance string as `capture:voice` / `capture:dry`, so the corpus says which it is rather than leaving it to be inferred later.

**`/admin/capture-ab`** — the same line recorded under each profile, back to back, decoded in the browser, with peak / speech RMS / room floor / **margin** printed next to a play button for each. The margin is the one that decides it: `loudnorm` can fix every other number afterwards and can never fix that one. Nothing is uploaded or stored — it is a measuring instrument, not a session.

**The raw/processed row** now reads the margin instead of the shortfall. It used to say "processed is N ms SHORTER" and turn orange past 100 ms. With the trim working, a healthy take is one where *seconds* of pre-roll and tail came off and none of the words did — so the alarm now fires on **too little** room (under 250 ms), which is the case where the take began or ended on the words and there is nothing to lose at the front except the front of the phrase.

**Untouched:** the server-side trim, the read detector, the safety net, `loudnorm`. They remain what they are — a net for what arrives, not the gain stage.

## Tests

12 new, all green, plus the whole suite matched against its baseline on `origin/main` (25 pre-existing failures, unchanged, none in this area).

- `useTapRecorder.profile.test.js` — the default is the voice chain; the two constraint calls never disagree; `dry` still reaches anyone who asks for it; an unknown name falls back rather than passing `undefined` constraints.
- `audio-processor-trim.test.cjs` — a new fixture in the shape the voice profile actually sends: hot, gated between words, AAC in MP4 (Safari's only container). Asserts the read is **found**, not merely survived.
- `takeMargin.test.js` — the margin verdict, both directions, including the impossible case where the clip is longer than the thing it was made from.

## What is still open

The prototype-and-A/B was done the only way it can honestly be done: the A/B page runs on the device that decides. **The comparison has not been run yet** — it needs one iPhone, two reads, about ninety seconds. Until Tom does that, the case for `voice` rests on the WebKit source, the audit, and the physics, not on a measurement of his room.

If the voice chain turns out to do something disliked to his voice — over-gating between words, a pumped noise floor — the toggle is right there in the room and the numbers to argue about are on `/admin/capture-ab`.
