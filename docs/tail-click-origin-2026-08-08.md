# Do the clicks come from the voice, or from us?

**Both — and the split is clean: the click starts as a tick in the raw voice output, and our own mastering is what makes it loud enough to hear.** Nothing in our chain can invent a click out of smooth audio. But run 108 real clips back through the live chain and 6 of them come out with a click you can hear that you couldn't hear before, and none go the other way.

Hear the pair — same slot, same voice, one clicks and one doesn't:

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/FF9FAC57-9762-4082-9618-F684F8EB881C.mp3

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/BDFA723F-7B07-4F66-9EB8-1A8DEAB2F924.mp3

[The two tails drawn side by side](https://watson-1.tail4968cb.ts.net/img/tailclick/pair-tails.png) · [the click zoomed right in](https://watson-1.tail4968cb.ts.net/img/tailclick/click-zoom.png)

---

## The answer

**The step itself is the voice's.** Every stage we run is a multiplication — a compressor, a gain, a limiter, two 8 ms fades. Multiplying a smooth signal cannot produce a sudden jump; you can only make a jump that is already there bigger or smaller. So the physical discontinuity — near-silence to full scale in two samples — arrives from the provider.

**The audibility is ours.** The chain starts with a compressor that squashes 8:1 and takes 80 milliseconds to let go. While a word is being spoken it holds the level down; when the speech stops it spends the next 80 ms releasing, and anything sitting in that window comes up with it. A mouth tick at the end of an utterance lands exactly in that window.

Measured over 108 stored clips put back through the live chain:

- the largest jump in the last 400 ms got **bigger in 58 of them**, median **+0.8 dB**, worst case **+10.6 dB**
- **6 clips went from no detectable click to a detectable one**; **none** went the other way

The six that flipped were ordinary clips — German and French word clips from this month, a Spanish one from February, and one German presentation line.

That is also why your renders yesterday still clicked with the click-removal step switched off. That step was never what was keeping clicks away; the thing that reveals them is still in the chain and always has been.

**Correction to what I sent earlier today:** I said the chain "smooths rather than sharpens", from testing two clips. Across 108 it does the opposite more often than not. The two I happened to pick were unrepresentative and I over-generalised from them.

## What still touches the audio, and what each can do

The current course-audio path is: voice provider → `masterAudio` → compressor → gain → true-peak limiter → 8 ms fade in and out → MP3 encode. All gain, no cutting. The trim-and-repad step you're thinking of is gone, and I did not go near truncation.

Two other paths do cut audio, neither of which made your intro clip:
- Component word clips are sliced out of their parent phrase. Both cut points land mid-waveform, so this one genuinely would click — it is defended by the same 8 ms fades, which is the right defence for a boundary.
- The old concatenating presentation builder joins segments with no crossfade. It is dead code from December and nothing calls it.

## The gap I could not close

**Raw voice output is not kept anywhere.** The render is written to a temp folder, mastered, and the folder is deleted. There is no raw prefix in the bucket and no cache. The repo says so itself, in the voice-lab remaster tool: "No raw pre-master copies of the estate renders are retained." So I cannot put a raw file and its mastered twin side by side, which is the only way to settle the split by measurement rather than by argument.

My 108-clip test is the closest available substitute, and it has an honest weakness: those clips had already been mastered once, so my test compresses them twice. That exaggerates how big the effect is. It does not change its direction — every clip moved the same way.

**The experiment that would settle it**, for you to run in Popty rather than me: render one phrase twice with the same voice and text, keep the raw bytes of one before mastering, and store both. One clip, one comparison, done. It needs a TTS call so it is yours to trigger, not mine.

## Size of it

Your read, and the measurements agree with it: not every clip, quite minor. Five clips in ninety-seven carried an audible tail click as stored — about 5%, concentrated in the cloned voices and in German, and absent from every Azure-voiced Spanish and Italian clip I measured. Worth understanding, not worth a sweep.

---

*Appendix. Chain: `services/audio-processor.cjs:552` `normalizeAudio` → `PRE_COMPRESS` (line 307, `acompressor=threshold=-24dB:ratio=8:attack=5:release=80:knee=8`), `volume`, `TRUE_PEAK_LIMIT` (line 308), `ANTI_CLICK_FADE` (line 298), piped ffmpeg→lame at line 92; called from `services/phases/phase8-audio-v13.cjs:1172`. Slicer: `phase8-audio-v13.cjs:5810` `spliceAudio`. Dead concat builder: `services/presentation-service.cjs:402`, last touched 2025-12-10, no callers. Raw-retention statement: `tools/prosody-lab/remaster-vad-lab-clean.cjs:9`. Test scripts in `scripts/tail-click-2026-08-08/` (chain-test.py, flip-test.py); all processing output went to temp directories and was deleted. No TTS, no regeneration, no repair, no database writes, no S3 uploads, and no pipeline module was loaded or executed — code was read as text only.*
