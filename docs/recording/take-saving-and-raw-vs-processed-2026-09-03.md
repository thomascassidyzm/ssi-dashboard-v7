# The stored clip IS the take that was recorded — and four good takes were being thrown away

2026-09-03, from Tom's zzz_test2_for_eng session at 00:15–00:18 UTC.

## The headline

**Is the stored clip the take that was recorded? YES.** Measured, not inferred.
There is no data-integrity defect on the write path. The "44 ms LONGER — these
are not the same take" warning is a false alarm produced by the browser, and it
has been fixed.

**Why takes were not saving: the boundary gate refused four of twelve good
takes**, because a 10–30 ms tick at the very edge of the capture was being read
as the recordist's first or last word. Fixed.

## Task 1 — the integrity question, measured

The panel on "no voy a poder" reported: original (raw) 5.23 s, processed 5.28 s,
"these are not the same take".

Both S3 objects were pulled and **decoded to PCM** — sample counts, not container
metadata, not a browser's `HTMLAudioElement.duration`:

| | raw `raw/E5F0C542….webm` | processed `mastered/E5F0C542….mp3` |
|---|---|---|
| decoded | **5.240 s** | **5.237 s** |
| browser reported | 5.23 s | 5.28 s |

The processed clip is **3 ms shorter** than the original, not 44 ms longer. It is
the same take. All eight of the session's stored takes were measured the same
way; every one decodes shorter than or equal to its own raw original.

### Where the 44 ms comes from

Two codecs, two conventions for reporting their own length.

- **Raw** is WebM/Opus from `MediaRecorder`, muxed into a non-seekable sink, so
  it carries no duration element at all. `RawVsProcessed.vue` gets a number out
  of it with the seek-past-the-end trick, which resolves to the last frame's
  timestamp — it under-reports.
- **Processed** is CBR MP3 from LAME. A browser that does not honour the LAME
  gapless tag reports the *padded* frame count: encoder delay plus the padding
  that fills the final 1152-sample frame — up to about 60 ms of phantom audio at
  48 kHz. It over-reports.

44 ms sits squarely in that band. This disagreement is present on every take and
always will be. A verdict of "these are not the same take" over tens of
milliseconds destroys the recordist's trust in every other clip on the page,
which is the exact opposite of what the panel is for.

**Fixed** in `src/utils/takeMargin.js`: the "not the same take" verdict now
requires a **1 second** negative margin — twenty times the largest padding
artefact possible, and far under any genuine take-to-take difference. A small
negative now says the true thing instead: *the trim took nothing off this take,
so it has no room to spare*.

`tools/recording/verify-take-invariant.cjs` re-run on both affected courses:

```
zzz_test2_for_eng: 22 lines, 44 tracks — DISAGREE: 0
cym_n_for_eng:    231 lines, 462 tracks — DISAGREE: 0
```

Job #144's invariant holds. It and this screen were never in conflict; the
screen was measuring the wrong thing.

## Task 2 — why takes were not saving

Twelve takes were uploaded. **Eight stored, four were refused by the server.**

Every one of the four reached the server, was accepted, had its raw original
archived to S3, was processed, and was then refused by `checkTakeBoundaries`
(`services/recording-speech-gate.cjs`) as truncated. So: **not (a), not (c), not
(d) — (b), refused, and refused wrongly.** The raw bytes of all four are still in
S3. Nothing was lost.

### What the gate stopped on, against what the read actually is

Frame envelope, same code path as the gate, on the archived raw bytes:

| take | edge run the gate took its boundary from | the real first/last word |
|---|---|---|
| `3A0B0B65` | 0.06 s, **10 ms**, −34.4 dB | 1.96 s, 240 ms, −16.8 dB |
| `A82355A4` | 0.05 s, **20 ms**, −33.5 dB | 2.24 s, 420 ms, −13.2 dB |
| `1D8D62DA` | 0.05 s, **20 ms**, −38.1 dB | 1.73 s, 200 ms, −17.4 dB |
| `C5143A1C` | 7.03 s (tail), **10 ms**, −34.4 dB | read ends 5.84 s — 1.29 s of room |

Every one is the capture's own start/stop transient: **10–30 ms long, 17–21 dB
under the read**. The 90th-percentile speech level on these takes is low enough
that the tick clears `speechDb − 10`, so it *became* the boundary. Lead margins
came out at 0.05–0.06 s against the 0.10 s floor, and four good reads with **one
to two seconds of genuine room** in front of them were refused.

### The fix

`EDGE_MIN_RUN_SEC` (60 ms): a near-speech run only counts as the first or last
word if it is long enough to *be* a word.

A length test, not a louder threshold — moving the dB line would have to move it
past a genuinely quiet first consonant, the one thing this gate must never do.
The two populations separate cleanly by duration: **10–30 ms against
200–840 ms** on the same eight takes, a factor of nearly seven at its narrowest.
60 ms is 2× above the longest tick measured and 3.3× below the shortest real word
measured. No adult voice puts a syllable in 60 ms.

### Replayed, before and after, on real bytes

```
file           | BEFORE lead/tail  verdict  | AFTER lead/tail  verdict
REFUSED-3A0B   | 0.060/0.088  REFUSE both   | 1.960/1.978  PASS
REFUSED-A823   | 0.050/0.077  REFUSE both   | 2.240/2.428  PASS
REFUSED-1D8D   | 0.050/1.020  REFUSE start  | 1.730/2.380  PASS
REFUSED-C514   | 2.880/0.088  REFUSE end    | 2.880/1.288  PASS
SAVED-E5F0     | 2.110/0.217  PASS          | 2.110/1.247  PASS
SAVED-B480     | 0.340/0.241  PASS          | 0.340/2.741  PASS
SAVED-A652     | 1.600/0.497  PASS          | 1.600/1.567  PASS
SAVED-480D     | 2.100/0.247  PASS          | 2.120/1.237  PASS
```

### And what it must not cost — Aran's clipped clips

The population this gate was built for. Real mastered bytes from S3:

```
ARAN-028A      | 0.350/0.428  PASS          | 0.350/0.428  PASS
ARAN-EB8F      | 0.390/0.632  PASS          | 0.390/0.632  PASS
ARAN-4EDD      | 0.010/0.030  REFUSE both   | 0.010/0.120  REFUSE start
ARAN-23C3      | 0.000/0.076  REFUSE both   | 0.000/0.076  REFUSE both
ARAN-9763      | 0.010/0.065  REFUSE both   | 0.850/0.065  REFUSE end
ARAN-8B5E      | 0.030/0.264  REFUSE start  | 0.030/0.264  REFUSE start
```

**Every genuinely clipped clip is still refused.** Two of them now name the
correct end: `9763189B`'s leading 10 ms tick was a tick, and the clip is cut at
the *end*, not the start. That is a more accurate message, not a weaker gate.

A clipped take opens at frame zero on a whole word, hundreds of milliseconds
long — far over the floor. And where nothing in a take reaches the floor the
result is `found: false`, which the caller treats as **unchecked and flagged,
never refused**. This change can lose a refusal; it cannot lose a take.

## The "Saving… not playable yet" rows

`con otra persona` and `dejar de hablar` were the **last two takes of the
session, and both stored fine** — `course_audio` rows `09de42f1…` at 00:17:41
and `2980e7dd…` at 00:18:01, both with raw originals and mastered clips in S3.
The most likely reading is that the screen was being read while they were still
in flight.

But there **is** a real no-terminal-state path and it has been closed: `fetch`
has no timeout of its own, so a phone that walks out of signal mid-post leaves a
promise that never settles — the row says "Saving…" for ever and the whole
sequential queue stops behind it. `UPLOAD_TIMEOUT_MS` (90 s) now aborts the
attempt, which retries under the existing backoff and, after three, becomes an
honest refusal in words on the line.

## What I did NOT change, and why

**The gapped trim keeps the whole take.** The same tick defeats
`detectReadBounds` in `services/audio-processor.cjs`: on the gapped path
(`GAPPED_MIN_SPEECH_SEC = 0.06`) a 66–76 ms tick at −40 dB counts as the first
word, so `reads[0].start = 0`, the trim cuts nothing, and clips keep their full
lead. Measured tonight: `no voy a poder` is a 5.24 s clip whose speech runs from
2.11 s — over two seconds of dead air at the front, on every gapped take.

The only lever there without new measurement code is the constant, and raising
it risks amputating a genuinely short first word — which is exactly the failure
the file's own header was written to prevent, and strictly worse than dead air.
The honest fix is a level-aware region test in `detectReadBounds`, mirroring
`EDGE_MIN_RUN_SEC`. **I am not making a mastering-chain change at 01:00 the night
before a live session while job #183 is mid-cutover on Welsh pods.** It loses no
audio and it is reversible: the raw original is archived before the trim runs.

One consequence worth knowing in the morning: because gapped takes are not being
trimmed, the Raw-vs-processed panel will report ~0 ms of margin — "the trim took
nothing off this take" — on takes that genuinely have seconds of room. That
message is now true as far as it goes, but it is measuring the trim, not the
take.

## Files

- `services/recording-speech-gate.cjs` — `EDGE_MIN_RUN_SEC`, run-length edge detection
- `services/recording-speech-gate.test.cjs` — 5 new tests; 30 pass
- `src/utils/takeMargin.js` — `IMPOSSIBLE_MARGIN_MS`
- `src/utils/takeMargin.test.js` — 3 new tests; 7 pass
- `src/composables/useRecordistQueue.js` — `UPLOAD_TIMEOUT_MS`
