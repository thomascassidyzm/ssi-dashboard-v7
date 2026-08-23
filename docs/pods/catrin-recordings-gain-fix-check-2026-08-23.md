# Catrin's first recordings since the gain fix — Welsh north

**Pod:** `cym_n_for_eng:pod-0` (scene SC01–SC02) — **not** pod-1; the DB is the tie-breaker, see note at the bottom.
**Recorded:** 2026-08-23, 14:44–14:48 UTC, by Catrin (`human_catrinlliar_cym_n`), on a USB mic (Blue Snowball) via a Chromebook browser — not a phone voice memo, but the same capture-gain code path the fix touched.

**The verdict up front: it worked.** RMS across all four clips sits at -18.5 to -20.8 dBFS with peaks around -1 dBFS — that's voice-note territory, not the "virtually no gain" -35 dBFS-and-below sound Tom was hearing before. No hedging needed here; the numbers land cleanly in the good range.

---

### 1. Bore da. Sut wyt ti?
Good morning. How are you?

https://ssi-audio-stage.s3.amazonaws.com/mastered/EA7C2D31-6D64-4856-BB81-690F7C5EBEE7.mp3

Healthy level (RMS -18.5 dBFS, peak -1.4 dBFS) — sounds like a normal voice note, no clipping.

### 2. Ydw,… mae gen i ddiwrnod prysur… heddiw. Gobeithio… cei di ddiwrnod da. Wela i di wedyn.
Yes, I've got a busy day today. I hope you have a good day. See you later.

https://ssi-audio-stage.s3.amazonaws.com/mastered/9F2F77F2-7FCD-4C85-AB4B-C462E1D3DBE3.mp3

Healthy level (RMS -20.5 dBFS, peak -1.0 dBFS) — one single clipped sample in a 97-second clip, inaudible, not a real defect.

### 3. Esgusodwch fi,… ydy'r sedd yma… wedi'i chymryd?
Excuse me, is this seat taken?

https://ssi-audio-stage.s3.amazonaws.com/mastered/8D1F0B06-27F4-44A6-9712-2557D1CA26F2.mp3

Healthy level (RMS -20.8 dBFS, peak -1.1 dBFS), clean start and end, no clipping.

### 4. Nac ydy, mae hi'n rhydd. Croeso i chi eistedd.
No, it's free. Please, go ahead.

https://ssi-audio-stage.s3.amazonaws.com/mastered/C18BD31B-8AED-4681-9C42-75595C829304.mp3

Healthy level (RMS -20.0 dBFS, peak -1.1 dBFS), clean start and end, no clipping.

---

## The numbers, for the record

| Clip | Duration | Peak dBFS | RMS dBFS | Clipped samples | Lead / tail silence |
|---|---|---|---|---|---|
| EA7C2D31… (Bore da) | 3.25s | -1.44 | -18.49 | 0 | 352ms / 280ms |
| 9F2F77F2… (Ydw, prysur) | 96.80s | -0.99 | -20.53 | 1 | 0ms / 0ms |
| 8D1F0B06… (Esgusodwch fi) | 46.65s | -1.12 | -20.78 | 0 | 0ms / 0ms |
| C18BD31B… (Nac ydy) | 31.46s | -1.10 | -20.01 | 0 | 0ms / 0ms |

All four: mp3, 44.1kHz, mono, 128kbps, decode clean.

**Reference points** (orientation, not spec): a properly-gained voice-note-style take usually sits around -20 to -14 dBFS RMS with peaks around -6 to -3 dBFS. These four sit right at the low end of that RMS band and slightly hotter on peak than typical voice notes — but nowhere near the -35 dBFS-and-below "no gain" failure. Read as: fixed, and if anything erring toward a touch hot rather than thin.

**Before/after margin diagnostic: not available for these takes.** `recording_provenance` has no margin columns at all, and the JSON `quality_notes` blob for all four rows carries no margin fields — this is a genuine gap, not a zero-margin reading. Flagging honestly rather than inventing a number.

**Pod resolution (from the data, not a guess):** the four `course_audio` rows join through `recording_provenance.quality_notes.pod_id` and independently through `listening_pod_sentences.target_audio_id` to the same four rows — both agree: `pod_id = cym_n_for_eng:pod-0`, course `cym_n_for_eng`, sentences `SC01-S002`, `SC01-S004`, `SC02-S001`, `SC02-S002`. There is no pod-1 for this course/voice in the data Tom's "pod 1" was shorthand for pod-0, the only pod that exists here.

**Nothing else flagged:** no truncation, no unexpected sample rate/channel oddity, mono throughout as expected for a single-speaker human take. First clip's 352ms lead-in / 280ms tail (vs ~0ms on the other three) is the only asymmetry — plausibly just mic-button lag on the shortest take, not a quality defect.
