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

## What Tom's real takes actually measure

Measured off S3 (job #933): six takes from his 2026-08-22 session, both raw and mastered, plus five AGC-on takes from the script-mode path as the only real-world A/B available.

| | dry (iPhone, no DSP) | AGC-on (script mode) |
|---|---|---|
| raw peak | **−28.5 dBFS** mean, spread 3.5 dB | −4.0 dBFS mean |
| speech-segment LUFS | −46.6 | −23.5 |
| noise floor | ~−88 dBFS | −80 to −131 dBFS |
| gain loudnorm needed to reach −16 LUFS | **+30.6 dB** | **+7.5 dB** |
| clipped | none | none |

Three things fall out of that, and two of them correct the record:

**The −50 dBFS estimate was 20 dB too pessimistic, and so was the −1.2 to −37 dB range in the code comment.** The real distribution is a tight unimodal cluster at −28.5, exactly the shape of a fixed distance-driven attenuation with no AGC to compensate. Nothing was clipped, anywhere, in any of the eleven files.

**The room and the microphone are not the bottleneck.** The floor sits at −88 dBFS with about 60 dB of clean headroom above it on every take. It is a gain problem and only a gain problem. That ~23 dB gap in required lift between the two populations *is* the missing `autoGainControl`.

**And the mastering never actually reached target.** The dry takes come out of the chain at **−26.2 LUFS integrated** against a −16 target — ten decibels short, because a single loudnorm pass will not deliver a +30 dB lift. The AGC-on takes land at −17.8, near enough. So every dry take in the corpus is both quieter than it was meant to be *and* carrying an audibly raised floor from the lift that was applied: mastered floor −54 to −65 dBFS on the dry path against −71 to −96 on the AGC-on one. That is the lift making itself heard, and it is what "processing struggles" sounds like.

All of this closes on its own once capture arrives at a level loudnorm can finish the job from.

*Honest gap: the seventeen refused takes have no recoverable raw audio — the archiving feature was not yet live on that path when they died. These six are a same-session, same-device, moments-later proxy, not the refused files. And the A/B is confounded: different person, mic, room and day, so treat its size as an upper bound even though its direction is not in doubt.*

## The raw/processed row was crying wolf on every take

The trim was running — the measurements settle that: 5.67 s of raw came out as 2.02 s of clip, 12.01 s as 1.59 s. The read detector found the read.

Which means the raw-vs-processed row, which alarmed whenever the processed clip was more than 100 ms shorter than the original, has been turning orange on **every single take** by three to ten seconds. A warning that fires every time is a warning nobody reads.

## What changed

**`src/composables/useTapRecorder.js`** — the two ways of asking are now named profiles, because the difference is not three booleans, it is which audio unit gets built:

| profile | `echoCancellation` | `noiseSuppression` | `autoGainControl` | iOS unit |
|---|---|---|---|---|
| **`voice`** (default) | true | true | true | VoiceProcessingIO |
| `dry` | false | false | false | RemoteIO |

The follow-up `applyConstraints()` call now comes from the same profile object as the acquisition, so it can no longer contradict it — a disagreement there would tear the unit down and rebuild it as the other one, undoing the change one line after it was made. Pinned by a test.

**`src/views/RecordistRoom.vue`** — "Record the raw microphone", off by default, remembered between sessions. The profile goes into every take's provenance string as `capture:voice` / `capture:dry`, so the corpus says which it is rather than leaving it to be inferred later.

**`/admin/capture-ab`** — the same line recorded under each profile, back to back, decoded in the browser, with peak / speech RMS / room floor / **margin** printed next to a play button for each. The margin is the one that decides it: `loudnorm` can fix every other number afterwards and can never fix that one. Nothing is uploaded or stored — it is a measuring instrument, not a session.

**The raw/processed row** now reads the margin instead of the shortfall, so it fires on **too little** room (under 250 ms) rather than on a lot. That is the case where the take began or ended on the words and there is nothing to lose at the front except the front of the phrase — which is the diagnostic Tom actually wants out of it.

**Untouched:** the server-side trim, the read detector, the safety net, `loudnorm`. They remain what they are — a net for what arrives, not the gain stage.

## Tests

12 new, all green, plus the whole suite matched against its baseline on `origin/main` (25 pre-existing failures, unchanged, none in this area).

- `useTapRecorder.profile.test.js` — the default is the voice chain; the two constraint calls never disagree; `dry` still reaches anyone who asks for it; an unknown name falls back rather than passing `undefined` constraints.
- `audio-processor-trim.test.cjs` — a new fixture in the shape the voice profile actually sends: hot, gated between words, AAC in MP4 (Safari's only container). Asserts the read is **found**, not merely survived.
- `takeMargin.test.js` — the margin verdict, both directions, including the impossible case where the clip is longer than the thing it was made from.

## What is still open

The prototype-and-A/B was done the only way it can honestly be done: the A/B page runs on the device that decides. **The comparison has not been run yet** — it needs one iPhone, two reads, about ninety seconds. Until Tom does that, the case for `voice` rests on the WebKit source, the audit, and the physics, not on a measurement of his room.

If the voice chain turns out to do something disliked to his voice — over-gating between words, a pumped noise floor — the toggle is right there in the room and the numbers to argue about are on `/admin/capture-ab`.

**Also still open:** whether `loudnorm` should be two-pass. It did not reach target on the dry takes and will not need to on the new ones, so this is no longer urgent — but a single pass silently landing ten decibels short is worth knowing about before some other quiet source hits the same wall.
