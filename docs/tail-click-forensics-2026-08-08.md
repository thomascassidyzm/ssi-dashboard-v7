# Why clips click at the end

**No — mastering is not making the click.** The click is already in the voice model's own render before any of our processing touches it. The caveat, and it is a real one: the compressor we still run on every single clip makes a click that is already there about **5 to 7 dB louder** relative to the speech, so we are not creating clicks but we are turning quiet ones into ones you can hear.

Everything below is measurement on audio that already exists. Nothing was generated, nothing was repaired, nothing was written back.

---

## Hear it first

**The old one, with the click** — German course, the very first intro, rendered 7 August:

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/FF9FAC57-9762-4082-9618-F684F8EB881C.mp3

**The new one you made this morning** — same slot, same voice, 10:48 today:

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/BDFA723F-7B07-4F66-9EB8-1A8DEAB2F924.mp3

## See it

Tap to open the picture — the last fifth of a second of each clip, drawn at the same scale:

[The two tails, side by side](https://watson-1.tail4968cb.ts.net/img/tailclick/pair-tails.png)

[The same click, zoomed right in](https://watson-1.tail4968cb.ts.net/img/tailclick/click-zoom.png)

And here it is as text, in case the pictures are awkward on the phone. Each column is one millisecond, and the number is how loud that millisecond is compared to the loudest moment in the clip:

```
                 ms before the end of the file
          90    85    80  |77|  75    70    66
OLD   -10 -12 -17 -14 -17 -23 -25 -21 -15  -9  -1  -8  -4 -13  -9 -12 -12 -11 -12
                          speech fading away      ^^ the click, back at full volume

NEW   -40 -41 -38 -39 -37 -39 -40 -40 -40 -41 -42 -41 -44 -42 -43 -42 -44 -42 -41
                          nothing there at all - it is already 40 dB down and staying there
```

---

## 1. What kind of artefact it actually is

It is an **impulse** — a single sudden jump — sitting **77 milliseconds before the end of the file**, after the speech has already begun fading away.

In numbers, from the old clip:

- The speech has dropped to **23 dB below the clip's loudest point**. Then, in **two samples — about forty millionths of a second** — the waveform jumps from +0.69 to −0.38. That jump is the click.
- The peak of that jump is **0.74 out of a maximum 0.81** — essentially as loud as the loudest word in the whole clip.
- It rings on for about 20 ms and then decays away properly.

And, importantly, what it is **not**:

- **Not a truncation.** The file does not stop mid-waveform. The very last sample is at −128 dB, i.e. silence. A clip chopped off at a loud point would end at a big number; this one ends at essentially nothing.
- **Not a DC step or offset.** Average level over the final 50 ms is 0.00009 — nothing.
- **Not an MP3 boundary problem.** The impulse sits 3,694 samples from the end. An MP3 frame is 1,152 samples, so it lands 3.2 frames in — nowhere near a frame edge. Encoder padding would be silence anyway, not a spike.
- **Not the anti-click fade.** Those fades are 8 ms long and live at the very first and very last moment of the file. The click is 77 ms inside. The fade could not have caused it and could never have removed it.
- **Not a join or a splice.** There is no seam: the audio either side of the impulse is continuous speech decay.

The same measurements on **your new clip**: the loudest moment in its final fifth of a second is −3.3 dBFS, in the final tenth it is already down to −36.3 dBFS, and in the final millisecond it is −127 dBFS. It falls away and keeps falling. The biggest sample-to-sample jump anywhere in its last 100 ms is 33 dB smaller than the old clip's. There is simply nothing there.

---

## 2. What happened to each clip, and what actually differed

I traced both. The honest answer is that **the processing was identical** — this is not an old path versus a new path.

- Both are the same slot in the German course, the same voice, both marked as machine-rendered, both stored in the same place, both 96 kbps mono at 48 kHz through the same encoder.
- The mastering code has not changed since **5 August**. The old clicking clip was made on **7 August at 04:39**; yours on **8 August at 10:48**. The same code, unchanged, produced both.
- The tail-trimming code that used to cut clips at a suspected click and pad them back out — the thing that ate the word "sprechen" — was **deleted on 5 August**, before either clip existed. It cannot be involved.

So what *was* different? Two things, and only two:

1. **You retyped the text.** The old one said "…to speak German with you now', is:" with a colon and a dash; yours says "…to speak German with you', is:". Different words, different punctuation.
2. **It is a different roll of the dice from the voice model.** Same voice, same settings, fresh render — and this one came out clean.

That is the whole difference. The pipeline is not the variable here.

---

## 3. Is anything in mastering still capable of producing clicks?

**Creating one: no.** I proved this rather than assuming it. I took your clean clip and ran the exact mastering chain over it locally — compressor, gain, true-peak limiter, the 8 ms fades — and measured the result. No transient appeared. In fact the biggest sudden jump in the tail got *smaller*, from −4.2 dB to −10.3 dB. None of those four steps can invent a discontinuity: a compressor and a limiter only ever turn things down, a gain is a multiplication, and a fade only touches the first and last 8 ms.

**Making one louder: yes, and this is the part worth your attention.**

The chain still starts with a compressor — 8:1 squashing of anything above a fairly low threshold, with an **80 millisecond release**. That release time is the problem. While someone is speaking, the compressor is holding the level down. When the speech stops, the compressor spends the next 80 ms letting go — and anything sitting in that window gets pushed back up.

Measured on two real clips, that stage **lifts the post-speech tail by 5 to 7 dB relative to the rest of the clip**. So a small mouth tick that the voice model left at the end of the sentence — exactly where an 80 ms release window lands — comes out of mastering noticeably louder than it went in.

That is live right now, on every clip, in every course, with no flag and no condition. There is a version of the chain without the compressor already in the codebase, but it is only used by the voice lab, and it has its own trade-off (peaky cloned voices end up 4-6 dB quieter than the house target).

So the fair answer to your question is: we are not producing clicks in mastering. We are **amplifying** them, by a measurable amount, and we have been doing it to every clip since the compressor went in.

---

## 4. The old clips are stuck with it

Yes — the click is baked into the stored file. Nothing in the pipeline reaches back and heals it; a clip only changes if it is re-rendered.

But there is a sharper point than "old clips are affected". **This is still happening.** Of the clicking clips I found, four of the five were rendered **this morning at 03:44** by an automated German run. The click is not a legacy of a mastering bug that we fixed; it is a live property of the voice we are using.

How many clips carry it, from measuring 97 real ones spread across four courses and six months:

| where | clips measured | carrying a tail click |
|---|---|---|
| German, rendered in August (xAI voice) | 27 | 4 |
| German, January-February (older voices) | 14 | 1 |
| French, June and August | 28 | 0 |
| Spanish, February (Azure voices) | 14 | 0 |
| Italian, February (Azure voices) | 14 | 0 |
| **total** | **97** | **5** |

Five in ninety-seven is about 5%. Against 2.56 million stored clips that points at **somewhere in the tens of thousands to a couple of hundred thousand** — I will not pretend to more precision than 97 clips can support, and the honest band is wide. What the sample says much more confidently is *where* it concentrates: **German is the worst of it**, at roughly one clip in seven of this month's renders, and the presentation clips — the ones that introduce a new word, the ones a learner cannot skip — are right in the middle of that.

Re-rendering is not a guaranteed cure either. It is another roll of the same dice: mostly clean, sometimes not. That is exactly what happened to you — the old one clicked, the new one did not.

---

## 5. What decides whether a clip gets one

From the measurements, not from reading the code:

- **The voice is the main determinant.** Every clip I found with a click was voiced by one of the cloned voices. Twenty-eight Azure-voiced Spanish and Italian clips: none. Twenty-eight French clips: none. This lines up with what the pipeline's own notes already say — the tail-click detector in the codebase was written specifically to catch "clone exhale/noise bursts".
- **Position is consistent: 70 to 83 milliseconds before the end**, in five of the seven clicking clips I measured precisely. That is not a coincidence about file length — it is the moment the speech stops. It is a mouth or breath artefact the model emits when it finishes an utterance, and the file ends shortly after.
- **Not clip length.** The affected clips run from under a second to five seconds.
- **Not the final sound of the word.** Clean and clicking renders of the *same sentence* both exist.
- **Not loudness normalisation, and not a trim.** There is no trim on the machine-voiced path at all. (Worth flagging for whoever fixes this: a comment in the codebase claims "mastering trims lead/trail silence". For TTS clips that is simply not true — the trimming only runs on human recordings.)

---

## What I could not determine

- **I could not prove the click exists in the raw voice render**, because proving that needs one raw render, and that is a TTS call — which this job was explicitly not allowed to make. Everything I can measure is consistent with it, and I showed that nothing in our chain can create a discontinuity, but the direct proof is one clip away and it needs you to say go.
- **I could not measure how much of your particular click's loudness the compressor added**, for the same reason — I only have the after-compressor bytes.
- **I could not find a record proving the 10:48 clip is the one you made.** There is no log of manual regenerations, and the audio table has no "last updated" column. I identified it from the timing, the slot, and the fact that its text is the one you retyped. Confident, but inferred, not recorded.
- **The two clips are not a perfectly matched pair.** You changed the wording slightly when you regenerated, so they are the same voice and the same slot, but not the same sentence.
- **97 clips is a probe, not a census.** The concentration in German is solid; the estate-wide total is an extrapolation with a wide band around it.

---

## What I would do about it — recommendation only, nothing built

The instinct will be to reach for a repair pass over the stored clips. Don't. That is precisely the path that was deleted on 5 August for eating words out of German sentences, and the detector behind it is only 9% accurate.

The better shape, because it is cheaper *and* simpler *and* safer: **check at render time and re-roll**, never cut. When a fresh render trips the tail-click check, throw it away and render again rather than trying to repair it. A false alarm then costs one extra render instead of a missing word, so the detector's poor precision stops mattering. And since a clean render is the common case, one retry fixes most of them.

Scope it to where it hurts first: the presentation clips — the "the German for X is…" lines. There are 3,798 of them in German and 130,596 across the estate, and they are the ones a learner meets on their first ten seconds of a course.

That is a TTS run, so it is yours to trigger, not mine.

---

## Technical appendix

For whoever picks this up.

**The clips.** `deu_for_eng`, lego `S0001L01`, role `presentation`. Old: row `c7a95a8e-f7db-453b-8bd9-0be33aa60316`, `mastered/FF9FAC57-9762-4082-9618-F684F8EB881C.mp3`, voice `xai_gfzdpspr5fdp`, created 2026-08-07T04:39:29Z, 4968 ms. New: row `414cbd3b-fb26-45fe-8351-5115051d557e`, `mastered/BDFA723F-7B07-4F66-9EB8-1A8DEAB2F924.mp3`, same voice, created 2026-08-08T10:48:15Z, 4776 ms. Both public on `ssi-audio-stage`, eu-west-1.

**Click measurements (old clip).** Clip peak 0.8103 (−1.83 dBFS). Impulse at sample offset 3694 from EOF (77.0 ms). Largest sample step 0.5481 (−5.22 dBFS), +0.6865 → +0.1383 → −0.3834 over two samples. 1 ms peak envelope across the impulse, dB relative to clip peak: −22.6, −14.7, **−0.8**, −4.5, −8.8, −11.8. Final sample −127.7 dBFS; trailing exact-zero run 0 samples; DC over final 50 ms +8.95e−05. New clip: clip peak 0.8128 (−1.80 dBFS), peak in last 200/100/1 ms = −3.3/−36.3/−127.0 dBFS, largest tail step −38.27 dBFS at 96 ms, final sample −137.2 dBFS, monotonic decay throughout the last 190 ms.

**Code path.** `services/phases/phase8-audio-v13.cjs:1172` → `audioProcessor.normalizeAudio` (`services/audio-processor.cjs:552`), chain `PRE_COMPRESS,volume=<gain>dB,TRUE_PEAK_LIMIT,ANTI_CLICK_FADE` piped ffmpeg → lame CBR 96k mono 48 kHz (`ffmpegFilterToLameMp3`, line 92). `PRE_COMPRESS` = `acompressor=threshold=-24dB:ratio=8:attack=5:release=80:knee=8` (line 307) — the 80 ms release is the amplification mechanism. `ANTI_CLICK_FADE` = 8 ms in + 8 ms out via the areverse trick (line 298), landed in `0b614bbc`, 2026-06-26. Compressor-free variant `normalizeAudioClean` at line 577, sole caller `tools/prosody-lab/remaster-vad-lab-clean.cjs`. The trim referenced in `services/audio-envelope.cjs`'s header comment (`silenceremove`) exists only in `processRecordingBuffer` (line 898) and never runs on TTS output — that comment is wrong and should be corrected. Last change to `audio-processor.cjs`: `8415f2d9`, 2026-08-05.

**Local mastering test.** The full chain applied to the stored clean clips, measured before and after: post-speech tail lifted +5 to +7 dB relative to clip peak by the compressor stage (e.g. −31 → −24 dB at 110 ms before EOF; −44 → −37 dB at 170 ms); largest tail sample-step reduced from −4.2 dB to −10.3 dB, i.e. the chain smooths rather than sharpens. Output written to `/tmp` and discarded; nothing uploaded, nothing linked, no row touched.

**Detector used for the sweep.** 1 ms peak envelope; a click is a window rising ≥12 dB above the previous 5 ms, sitting ≥ −28 dB relative to clip peak, within the last 250 ms, decaying ≥6 dB over the following 30 ms, and containing a sample-to-sample step ≥ −14 dB relative to clip peak. Calibrated to catch both known-clicking clips and reject all three known-clean ones. Scripts in `scripts/tail-click-2026-08-08/` (gitignored working area); this document and its images are the deliverable.

**Constraint compliance.** No TTS, no generation, no repair, no regeneration, no writes to Supabase, no uploads to S3. No pipeline module was `require()`d or executed — all code was read as text. Analysis was decode-and-measure on existing objects plus locally-discarded ffmpeg output.
