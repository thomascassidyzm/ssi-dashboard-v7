# The take that sounded perfect and came back FAILED — 2026-08-21

Kai recorded a test take, heard it play back clean, and the surface said **FAILED, not
saved**. Reported at 12:57Z, minutes after `main` fast-forwarded to `830cfeff2`.

**It was not that merge.** The four commits in it (`b74fd452a` device provenance,
`24b776308` ON AIR panel, two docs) are innocent. The regression is `5102c0780`
— the *other* clipping fix, landed 11:13Z, which only reached the running server
when the Production API restarted at 12:30Z.

Fixed in `db439d0ab`, on `main`, live on watson-1 since 13:01Z.

---

## What broke

`detectReadBounds` in `services/audio-processor.cjs` took the take's length from
ffmpeg's header `Duration:` line:

```js
const durMatch = /Duration:\s*(\d+):(\d+):([\d.]+)/.exec(log);
if (!durMatch) return null;
```

A browser's `MediaRecorder` muxes WebM as a live stream into a non-seekable sink.
It never goes back to write the duration element. **Every take the recorders
upload reports `Duration: N/A`.** Measured on Kai's own failed take:

```
Duration: N/A, start: -0.001000, bitrate: N/A
Stream #0:0(eng): Audio: opus, 48000 Hz, mono, fltp
silence_end: 0.645375        <- the read is RIGHT THERE
silence_start: 3.230563
```

So detection returned `null` for every real take. The caller read that as the
documented "nothing in this file is a read" case — muted mic, empty room — and
applied `atrim=start=0:end=0.001`. lame wrote an 834-byte header-only MP3. The
upload handler's silent-take guard then refused a stub, correctly, and returned
422 before the mastered PUT. The client marked the take failed.

Every layer did exactly what it was written to do. The container's header was
the only thing that lied, and one `return null` turned that lie into a lost take.

```
[Upload] Received 83670 bytes for 56145868-... (script mode, server-minted)
[Upload] Raw take retained at raw/56145868-....webm (83670 bytes, audio/webm)
[Upload] Audio processed: 83670 -> 834 bytes, duration: 0ms
[Upload] REFUSED silent/empty take for 56145868-...: 0ms after trim, 834 bytes
```

## Why the tests stayed green

`services/audio-processor-trim.test.cjs` builds its fixtures with
`ffmpeg ... -c:a libopus src.webm` — written to a **seekable file**, which ffmpeg
finalises with a duration header. The suite therefore exercised a container shape
the recorders never produce. Six tests, all passing, none of them touching the
defect.

The new test muxes to a pipe instead — `-f webm pipe:1` — which is the shape the
browser actually sends. It fails on the old code at `trimFoundRead` and passes on
the fix.

## The fix

Length now comes from the last `time=` of the same ffmpeg run — what the decoder
actually played out, present whether or not the container declared anything —
with the header kept only as a fallback. No extra process, no extra ffmpeg call.

```
size=N/A time=00:00:05.04 bitrate=N/A speed= 492x
```

The silent-take guard is untouched and still collapses a muted mic to nothing;
that test holds. `ffprobe -show_entries format=duration` was *not* used: it also
returns `N/A` on these files.

## Verification

- 6/6 in `services/audio-processor-trim.test.cjs`; the new one confirmed failing
  on the pre-fix processor before it was made to pass.
- Kai's two archived raws replayed through the fixed chain: 3286ms and 12974ms,
  `trimFoundRead=true`, against 0ms/834 bytes before.
- A real HTTP POST of one of the failed takes to the live endpoint:
  `success:true`, `durationMs:3286`, mastered + raw keys written. The
  `course_audio` row that probe created was removed afterwards (`lego_id` null,
  probe text, matched no course line); no audio bytes were deleted.

## Nothing was lost

`retainAndProcessTake` archives the untouched original to `raw/{UUID}.webm`
**before** processing and before any refusal — written for exactly this case
("orphans under `raw/` are wanted, orphans under `mastered/` are not"). All 22
refused takes are intact in S3 and replay clean.

They are real course reads, not test babble — Austrian German script lines for
`deu_at_for_eng` target2, several of them retakes of the same line. Recovery is
running as job **#832**: transcribe each raw, match it to its script line, and
re-submit the original bytes through the now-fixed endpoint. Confident matches
only; anything ambiguous goes back to Sascha rather than being guessed at.

## Estate check

The only other two header-`Duration:` parsers are `tools/slice-take-g.cjs` and
`tools/render-take-g.cjs`. Both run offline over rendered files that do carry the
header, and both degrade to `null` rather than destroying audio. No further
exposure.

## The lesson worth keeping

A fixture built by the tool under test is not the input the system receives. This
chain has now been broken twice at the same seam — T-20's `start_duration`, and
this — and both times the tests were green because they were driving audio that
ffmpeg had written. The recorders' real output shape (`Duration: N/A`, live-muxed
Opus) belongs in the fixtures permanently, which is what the new test is.
