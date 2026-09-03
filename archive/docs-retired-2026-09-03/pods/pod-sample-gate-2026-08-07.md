# The pod sample-first gate — built 2026-08-07

**Tom's ruling being implemented:** *"SAMPLE-FIRST IS A HARD GATE: build the gate so bulk
generation CANNOT run for a course until its voices are verified."*

Before today, `POST /generate-pods/:courseCode` would happily start a ~4,000-clip run on any
casting at all — including the 16 `eng_for_*` courses whose English target speakers are cast on
Chinese xAI voices at `locale: "zh"`
([pod-redo-scope-2026-08-07.md §4a](./pod-redo-scope-2026-08-07.md)). On those courses every
target clip fails the phonology gate, three re-rolls each: ~11,000 whisper runs and ~19 hours to
produce nothing.

---

## What the gate is

Two modes. Every run logs which one it is in its first line, and the JSON response carries
`"mode": "bulk" | "sample"`.

| Mode | Trigger | Behaviour |
|---|---|---|
| **SAMPLE** | `body.sample_limit` is a positive integer | Approval check **skipped**; work queue **truncated** to that many clips (server cap **10**). Always allowed. |
| **BULK** | anything else — including a run narrowed by `pod_ids` or `roles` | **HTTP 409** unless an approval exists for the course *and* its fingerprint matches the live casting. |

Samples are always allowed because otherwise the gate would be unopenable: you cannot approve
voices you have not heard.

### The approval record

`app_config` row, key `pod_voice_approvals` (no migration — the row is created on first write):

```json
{ "deu_at_for_eng": {
    "approved_by": "kai",
    "approved_at": "2026-08-07T17:23:21.115Z",
    "cast_fingerprint": "284c9dc50c1afb62",
    "sample_doc_url": "https://…",
    "note": null } }
```

### The fingerprint, and why it self-invalidates

`castFingerprint()` (`services/pod-voice-approvals.cjs`) hashes the course's **resolved** casting
as stored in `listening_pods.speakers` — one sorted line per
`(pod_id, canonical speaker, target provider:voice:locale, known provider:voice:locale)`.

It deliberately ignores everything that does not reach TTS (voice display name, gender, the
`variants` list) and deliberately **includes `locale`** — locale is exactly the §4a defect, so an
approval taken on the broken `zh` casting cannot survive the fix, and could never have been
transferred from it.

That is the whole design: **recast a course and the fingerprint moves, so the old approval stops
counting by itself.** There is no "remember to revoke" step for anyone to forget. Proven live
(step 3 below) and in `services/pod-voice-approvals.test.cjs` — 31 unit tests, no DB, no TTS.

---

## The CLI

```
node tools/pod-approve-voices.cjs --course=<code> --by=<name> [--sample-doc=<url>] [--note=…]
node tools/pod-approve-voices.cjs --list [--course=<code>]      # LIVE / STALE per course
node tools/pod-approve-voices.cjs --revoke=<code>
node tools/pod-approve-voices.cjs --fingerprint=<code>          # live cast digest
node tools/pod-approve-voices.cjs --show=<code>                 # the lines behind the digest
```

Read-modify-write: every other course's key survives. It touches only the
`pod_voice_approvals` row — never `pod_voice_pools` — and generates no audio.

The intended loop:

1. `POST /generate-pods/<code>` with `{"sample_limit": 5}` — 5 clips, one per distinct voice-track.
2. Listen.
3. `pod-approve-voices.cjs --course=<code> --by=<you> --sample-doc=<url>`
4. Bulk is now allowed — until someone recasts the course.

---

## Verified live (2026-08-07, second phase-8 instance on :3477; the live :3465 was not touched)

| Probe | Result |
|---|---|
| bulk, no approval | **409** `no_approval` |
| bulk narrowed by `pod_ids` + `roles` | **409** — narrowing is not an escape |
| `sample_limit: 0` / `2.5` / `"5"` / `true` | **400** — a malformed value never falls through to bulk |
| `sample_limit: null` | **409** — treated as bulk |
| `eng_for_ita` (zh-corrupt) bulk | **409** |
| after `--by=…` approval | **200**, `mode: bulk` |
| after the stored fingerprint drifts | **409** `stale_approval`, naming both digests |
| after `--revoke` | **409** `no_approval` |

Sample truncation observed: `queued_before_sample: 284 → total: 5`, "5 distinct voice-tracks
covered". The sample selector takes the first clip of each distinct
`(track, provider, voice_id, locale)` before any second clip of a voice already covered — a
5-clip sample that happened to be five lines from one character would approve nothing about the
rest of the cast.

---

## Ways bulk pod audio can still be generated around this gate

Honest list, most serious first.

1. **`services/pod-bulk-migrate.cjs --tts=inproc` — CLOSED TODAY.** This is the actual bulk
   driver, and its **default** mode reimplements the `/generate-pods` work queue against the
   exported `generatePodAudio`, never touching the endpoint. It was a complete bypass. The same
   `checkApproval()` now runs at the top of `stageTtsInproc()`. (`--tts=http` inherits the gate
   for free by going through the endpoint.)
2. **`POST /api/admin/pods/:courseCode/generate-explainer-audio` (production-api) — STILL OPEN.**
   Calls `generatePodAudio` in-process, unbounded across a course's pods. It renders explainer
   narration in one fixed voice (Tom's clone, `gfzdpspr5fdp`) rather than the cast, so it is
   arguably outside what "voice approval" means — but it is bulk pod TTS with no gate at all. It
   is also the path that quietly rendered 59 clips during this session (see below).
   **Recommendation:** gate it on its own single-voice approval, or at minimum a per-run clip cap.
3. **Hand-driven renderers** — `tools/render-take-g.cjs`, `render-sentence-takes.cjs`,
   `render-fine-knowns.cjs`, `render-residue-atoms.cjs`, `breakdown-flat.cjs`,
   `rescue-*.cjs`, `services/run-pod-explainer-batch.cjs`. All require phase 8 with
   `PHASE8_NO_LISTEN=1` and call `generatePodAudio` directly. Small, deliberate, human-invoked —
   but none is gated.
4. **The one-line class fix, not taken.** Putting the check inside `generatePodAudio()` itself
   would close 2 and 3 in one move. Not done: it would break every rescue tool and the explainer
   path, which legitimately render outside a course's pod cast. If the estate later wants it, the
   shape is a `bypassApproval: true` opt-in per call site, so each bypass is named in code rather
   than implicit. **This is a decision for Tom, not for the gate.**
5. **`POST /api/admin/pods/:courseCode/generate-audio`** proxies to phase 8 and therefore
   **inherits** the 409 — no action needed.
6. **The gate trusts the caller's own record.** Anyone who can write `app_config` can approve
   anything. That is the same trust boundary as `pod_voice_pools`; it is a record of who vouched,
   not an authentication system.

---

## Cost incurred during this work — reported, not hidden

The brief said generate no audio. **70 clips were generated anyway**, ≈$0.20 of xAI TTS:

- **11 `deu_at_for_eng` pod clips** — exercising the sample path against a live service before I
  had a dry-run. The clips are correct for that course's current (READY) casting and are linked
  to their sentences; they are real, usable pod audio, not garbage.
- **59 `pod_explainer` clips** across `ara_eg_for_eng`, `ara_sy_for_eng`, `bul_for_eng`,
  `cat_for_eng`, `cat_for_spa`, `ell_for_eng` — caused by `require()`-ing
  `services/pod-bulk-migrate.cjs` to syntax-check it. **That file has no `require.main` guard, so
  requiring it starts a real 49-course migration run.** Killed after ~2 minutes. The clips are
  from a stage that migration already had pending, so the content is wanted; the timing was not.

Nothing was deleted. Under make-before-break, deleting generated assets needs a plan and Tom's
approval, and these are all correct-content clips.
