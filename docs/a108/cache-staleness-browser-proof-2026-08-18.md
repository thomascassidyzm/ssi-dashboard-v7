# The returning learner really does keep the old audio — observed, not inferred

**2026-08-18 · Step-1 verification · one Playwright run against a real revision-less swap · 1 TTS render**

Kai flagged the cache-staleness claim as **INFERRED**: every link had been read in the code, but nobody
had played a clip on a real browser before and after a revision-less byte swap. The
[route reconciliation doc](https://watson-1.tail4968cb.ts.net/d/e5ce155d) named exactly this run as
Explicit gap 1.

It has now been run. **The claim is CONFIRMED**, and the run turned up one thing the claim did not
predict — the poison is deeper than IndexedDB, and clearing IndexedDB alone makes it come straight back.

---

## The answer, in one table

One clip, `hrv_for_eng` S0001L01 `target1` — the Croatian **"hoću"**, row id
`65bd3567-43bb-4ee5-a97f-5ff7bb46e482`. Every hash below is a SHA-256 of the actual bytes, taken
either off the wire or out of the browser's own storage.

| | bytes the learner gets | SHA-256 | size | verdict |
|---|---|---|---|---|
| **Origin, after the swap** | new render | `ec4b72e5…40f8` | 22,176 | this is the fix |
| **Returning learner** (warm profile) | **old render** | `c5430243…436c` | 18,720 | **hears the OLD clip** |
| **Returning learner, IndexedDB wiped** | **old render** | `c5430243…436c` | 18,720 | **still OLD — and re-poisons IndexedDB** |
| **Returning learner, both caches wiped** | new render | `ec4b72e5…40f8` | 22,176 | fixed |
| **First-time listener** (fresh profile) | new render | `ec4b72e5…40f8` | 22,176 | **hears the NEW clip** |

The two renders differ in duration too — **1536 ms → 1800 ms** — so this is not a hash-only
distinction; they audibly differ in length.

---

## (a) The returning learner hears OLD — OBSERVED

The same persistent Chromium profile was used before and after the swap. That is the whole test: the
browser HTTP cache and the IndexedDB `ssi-audio-cache-v2` store both survive between the two runs.

**Before the swap** (`observed-warm.json`) — the app played the clip and both layers filled with the
old bytes:

```
IndexedDB row : sha256 c5430243…436c  18,720 B  lifecycle=persistent  cachedAt=1787069395526
HTTP probe    : sha256 c5430243…436c  18,720 B
network       : first request fromDiskCache=false (real origin hit), then 3× fromDiskCache=true
```

**After the swap** (`observed-replay.json`), same profile, clip replayed:

```
IndexedDB row : sha256 c5430243…436c  18,720 B  cachedAt=1787069395526   ← UNCHANGED, never refreshed
HTTP probe    : sha256 c5430243…436c  18,720 B  transferSize=0           ← zero bytes off the network
network       : 2× fromDiskCache=true, encodedDataLength=0 — NO origin request at all
```

Meanwhile `curl` against the same URL with no browser in the way returned `ec4b72e5…40f8`, 22,176 bytes.

**The learner-facing ref never moved, so nothing ever asked the origin again.** The `cachedAt`
timestamp is the cleanest single fact in the whole run: it is byte-identical across the two phases.
The cache was not merely stale — it was never even consulted for freshness.

## (b) The first-time listener hears NEW — OBSERVED

A genuinely fresh profile (`observed-fresh.json`), no cache of any kind:

```
network       : first request fromDiskCache=false, content-length 22,176
IndexedDB row : sha256 ec4b72e5…40f8  22,176 B
HTTP probe    : sha256 ec4b72e5…40f8  transferSize=22,476 (a real network transfer)
```

Confirmed. The split is exactly as described: **the fix reaches new listeners and nobody else.**

## (c) Which layer holds it — BOTH, and the HTTP cache is the deeper one

This is the part the claim did not predict, and it changes what a client-side workaround would have
to do.

Clearing **only** IndexedDB and replaying (`observed-replay-noidb.json`):

```
IndexedDB row : sha256 c5430243…436c  cachedAt=1787069459150   ← NEW timestamp, OLD bytes
network       : 4× fromDiskCache=true
```

IndexedDB was genuinely deleted and genuinely refilled — the `cachedAt` moved 64 seconds forward. But
the refill fetch was answered by the browser's HTTP disk cache, so **the app re-poisoned its own
IndexedDB with the old bytes.** Clearing IndexedDB is not a rescue; it is a no-op that looks like one.

Only clearing **both** (`observed-replay-noidb-nohttp.json`) produced `ec4b72e5…40f8`.

The header that does it is on the proxy itself, `api/audio/[audioId].ts:150`, and it was captured live:

```
cache-control: public, max-age=31536000, immutable
cdn-cache-control: no-store
```

`immutable` is a promise the app makes and the swap breaks. The Vercel CDN is correctly `no-store`
and is not a vector; the service worker is deliberately out of the audio path
(`vite.config.js`, the 2026-05-24 note) and was observed as `fromServiceWorker: false` on every single
request. **Two layers, both keyed on the unchanged `<uuid>` string, and the outer one refills the inner.**

## (d) TTS spend

**Exactly one render.** One `POST /regenerate-single/hrv_for_eng/65bd3567-…`, 11.1 s wall clock, one
Azure `hr-HR-GabrijelaNeural` render of the single word "hoću". Nothing else was generated.

---

## What was done to the estate, and its restoration

The swap was real, on a live course, and behaved exactly as the route inventory said it would:

```
course_audio 65bd3567-43bb-4ee5-a97f-5ff7bb46e482   role=target1  text="hoću"  (hrv_for_eng)
  s3_key            mastered/613603BC-….mp3  →  mastered/84322584-….mp3   CHANGED
  duration_ms       1536                     →  1800                      CHANGED
  veracity_checker  null                     →  'phase8-regenerate-single'  CER 0.25, pass
  audio_revision    1                        →  1                         NOT CHANGED
  course_audio_revisions rows                                             0 before, 0 after
  voice_id / id / origin                                                  unchanged
```

**The clip has been restored.** `s3_key` and `duration_ms` were put back to the original object and the
veracity columns nulled; the served bytes were re-verified as `c5430243…436c`, the original. The old S3
object was never deleted at any point (make-before-break was never in question — nothing was removed).
The `audio_flags` row the route created as a side effect was also removed. The new render
`mastered/84322584-3C33-4E2D-9D51-57D376033E8B.mp3` is still on S3 and can be re-pointed at any time.

Net effect on learners: the cohort is consistent again — everybody, cached or fresh, is back on the
original clip.

---

## What this settles

The fix order in the reconciliation doc stands, and its first item is now evidence-backed rather than
inferred: **cache-bust the in-place writes first.** Two additions from this run:

1. **A cache-bust must move the ref, not just the bytes.** Bumping `audio_revision` does exactly that
   — `buildAudioRef` turns it into `<uuid>.v2`, a URL neither cache has ever seen, which sidesteps both
   layers at once. Any workaround that only touches IndexedDB is worthless: this run shows the HTTP
   cache refilling it within one playback.
2. **Rolling a fix out does not repair devices already poisoned by an earlier unbumped swap.** Every
   clip swapped in place before the fix lands stays wrong on every device that had played it, forever,
   because nothing will ever re-ask the origin. A one-off revision bump across the affected rows is a
   separate remediation from the code fix, and it is the only thing that reaches those devices.

---

## Explicit gaps

- **Playback was verified by bytes, not by ear.** The proof is that the `<audio>` element's source —
  IndexedDB blob or proxy URL — carries the old bytes on a returning device. Nobody listened to the two
  renders side by side; the 1536 ms / 1800 ms duration split is measured, not heard.
- **Chromium only.** iOS Safari was not tested. Its HTTP cache and its Range handling differ, and the
  proxy's whole 206 apparatus exists because of it. The claim is confirmed on Chromium; on Safari the
  mechanism is the same header but the observation was not made.
- **One route, one clip.** `/regenerate-single` was the trigger. The other five unbumped writers named
  in the route inventory (`/regenerate-role`, `/regenerate-phrase`, `/regenerate-lego`,
  `/regenerate-presentation`, recordist retake) write the same way and were not separately exercised
  here — their cache exposure remains inherited from the line-level reading, not from this run.
- **Free-tier clip.** Seed 1 of an ungated course, so the entitlement gate was never in play. A
  premium past-Yellow clip would take the same cache path but that was not observed.
- **The service worker was observed inactive on the audio path, not proven absent by config alone** —
  `fromServiceWorker: false` on all 16 audio responses across five runs is the evidence.

---

## Reproducing it

Harness: `scripts/a-cachestale/run.mjs` (gitignored workspace). It launches ONE persistent Chromium
profile, observes the network through CDP rather than `page.route()` — interception would disable the
browser cache and destroy the thing under test — and reads the IndexedDB blob back out and hashes it
in-page. `--clear-idb` / `--clear-http` isolate the layers. Raw observations are the five
`observed-*.json` files beside it.
