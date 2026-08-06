# Per-clip versioned audio URLs — the census

**2026-08-06.** Written before any cutover, as instructed. Every number here comes from the live
database, the live S3 bucket, or the code at HEAD. Where I was blocked, I say so.

---

## The headline

**Half of this is already built, and the other half is why your clip replacements never reached
learners.**

Popty already does per-clip versioning properly. `course_audio.audio_revision`, the
`course_audio_revisions` history table, make-before-break propose/accept, candidate keys, old object
retained, exact rollback data — all live, all correct, in `services/audio-repair-core.cjs`.

The learner app never got the other half. It builds every audio URL as `/api/audio/<id>`, where `<id>`
is the database row id — **which does not change when the clip is replaced.** And the proxy serves
those URLs with `Cache-Control: public, max-age=31536000, immutable`.

So: replace a clip, and every learner who already played it keeps the old bytes **for a year**, with
no way to reach the new one.

That is not a theory. **95 clips were swapped in production today** (German, accepted by you this
morning). Every device that had already played one of those 95 is still playing the damaged version
and will be until 2027.

This is exactly the episode you remembered: *"we kept replacing audio clips but got the same clip
appearing"*. It has a precise cause, and it is still happening right now.

---

## The infrastructure facts you asked me to establish

| Question | Answer | How I know |
|---|---|---|
| Is S3 versioning enabled? | **Yes — `Enabled`** on `ssi-audio-stage`, eu-west-1 | `GetBucketVersioning`, live |
| What cache headers do the clip objects serve? | **None at all.** No `Cache-Control` on sampled `mastered/*.mp3` objects | `HeadObject`, live |
| What does the `/api/audio` proxy serve? | `public, max-age=31536000, immutable` — one year, uncheckable | `api/audio/[audioId].ts` |
| Is there a CDN cache in front? | No — the proxy explicitly sets `Vercel-CDN-Cache-Control: no-store` and `CDN-Cache-Control: no-store`, deliberately, to keep iOS Safari's Range handling correct | same file |
| What does the service worker do with audio? | **Nothing.** Audio was deliberately removed from SW caching on 2026-05-24 | `packages/player-vue/vite.config.js` |
| What does the PWA offline cache do? | `AudioCache`, IndexedDB `ssi-audio-cache-v2`, **keyed by audio id** (`keyPath: 'id'`) | `packages/player-vue/src/cache/AudioCache.ts:128` |

### The trap in that last row

There are **two** stale layers, not one:

1. **Browser HTTP cache** — keys by URL. A versioned URL fixes this.
2. **IndexedDB `AudioCache`** — keys by *audio id*, not by URL. **A versioned URL does not fix this.**

The existing design note in `audio-repair-core.cjs` proposes `/api/audio/<id>?v=<rev>` and says
immutable caching "survives intact". That is true for layer 1 and **false for layer 2**: any learner
who downloaded a clip for offline use keeps the stale blob no matter what the URL says, because the
cache never looks at the URL.

Any fix has to move both. That is the single most important finding in this census, and it is the
reason I am not simply implementing the `?v=` note as written.

---

## The census: who constructs a clip URL by convention

### Learner app — `ssi-learning-app`, the hot path

`AUDIO_CONFIG.proxyEndpoint` in `packages/player-vue/src/config/audioConfig.ts` advertises itself as
centralising "audio URL generation for the entire app". **It is decorative.** It is referenced
nowhere outside its own file. The real construction is scattered:

| File:line | Expression | Hot path? |
|---|---|---|
| `packages/core/src/script/scriptGenerator` (+ `dist`) | `` `/api/audio/${id}` `` | yes |
| `player-vue/src/cache/AudioCache.ts:91` | `` `/api/audio/${id}` `` | yes |
| `player-vue/src/providers/CourseDataProvider.ts:322` | `` `/api/audio/${audioId}?courseId=…` `` | yes |
| `player-vue/src/providers/backendCyclesToRounds.ts:37` | `` `/api/audio/${uuid}` `` | yes |
| `player-vue/src/providers/toSimpleRounds.ts:22` | `` `/api/audio/${uuid}` `` | yes |
| `player-vue/src/composables/useFullCourseScript.ts:82` | `` `/api/audio/${id}?courseId=…` `` | yes |
| `player-vue/src/composables/useInstantPlayback.ts:429` | `` `/api/audio/${id}` `` | yes (prefetch) |
| `player-vue/src/composables/usePodLapScheduler.ts:573` | `` `/api/audio/${id}` `` | yes |
| `player-vue/src/composables/useLayer1Scheduler.ts:630` | `` `/api/audio/${id}` `` | yes (prefetch) |
| `player-vue/src/components/ListeningOverlay.vue:1090` | `` `/api/audio/${audioId}?courseId=…` `` | yes |
| `player-vue/src/components/PronunciationOverlay.vue:293` | `` `/api/audio/${audioId}?courseId=…` `` | yes |
| `player-vue/src/components/PodStageAuditioner.vue:207` | `` `/api/audio/${it.audioId}` `` | internal tool |

**~12 sites, ~11 of them on the learner hot path.** Every one derives the URL from an id.

The ids themselves come from four content routes: `api/courses/[code]/{round-map,cycles,bundle,infplay-cycles}.ts`,
reading denormalised FK columns (`course_legos.target1_audio_id`, `course_practice_phrases.*`).

Both audio-serving routes funnel through **one shared util**, `api/_utils/audioAccess.ts`
(`isValidAudioId`, `lookupAudioRecord`, `lookupAudioRecordsBatch`). That is a genuine chokepoint and
it is what makes this migration cheap.

### Popty — internal, not learner-facing

Popty reads `course_audio.s3_key` from the database in the paths that matter, so it is largely
already read-from-DB. The convention-derived sites are tools and dashboard views:
`src/services/api.js:1793` (`mastered/${uuid}.mp3`), `src/views/production/UserFeedback.vue:313`,
`services/quality-control-service.cjs:197`, `services/preview-generation-service.cjs:57`,
`tools/generators/transform-to-v2-manifest.cjs:51`, `tools/sweep-wrong-language-crosscourse.cjs:60`,
`tools/rescue-child-voice-clips.cjs:71`, `tools/audio-veracity-repair.cjs:103`,
`tools/physical-tail-probe.cjs:57`. A detailed sweep of these is running as a separate job.

None of these are on the learner path. They are internal tools that read bytes for inspection, and
they keep working unchanged.

---

## The database already holds the authority

`course_audio` — **2,544,787 rows** — carries `s3_key` per clip. Not a URL: a key. The base URL is
prepended by whoever reads it. That is fine and stays fine.

- `audio_revision`: 2,544,692 rows at 1; **94 at 2; 1 at 3**.
- Key prefixes: `mastered/` 2,544,617 · `repair-candidates/` 94 · `pending/` 50 · `mastered-v2/` 26.
- 2,544,787 rows share only 2,348,077 distinct keys — ~197k rows deliberately point at the same
  object (identical text + voice). Worth knowing: **replacing bytes at a shared key silently changes
  every row pointing at it.** Versioned per-clip keys remove that hazard.
- `course_audio_revisions` — 96 rows, with `previous_s3_key` / `new_s3_key` per swap. **This is the
  rollback ledger, and it already exists.**

---

## Is it a day or a fortnight?

**A day — closer to two, with tests.** Watson's fear was that URL derivation would be scattered
beyond reach. It is scattered — ~12 sites — but the fear does not bite, for one reason:

**Every one of those sites derives the URL from an id. So version the id, not the URL.**

If the content routes emit `<uuid>.v2` instead of `<uuid>` for a revised clip, then:

- all ~12 construction sites keep working **completely unchanged** — they interpolate a string;
- the URL changes, so the **browser HTTP cache** busts correctly;
- the id changes, so the **IndexedDB AudioCache** busts correctly too — the one thing `?v=<rev>`
  could not do;
- bare uuids keep resolving forever, so **nothing in the estate breaks** during the transition;
- and because only revised clips get a suffix, **2.54 million unchanged clips keep their URLs and
  nobody re-downloads anything.**

Real numbers for the change: **1 shared util** (`audioAccess.ts`, 311 lines), **4 content routes**,
**0 hot-path client files**. Against ~12 client files and a separate cache-key migration if the
version rides in the query string instead.

---

## Two defaults I have taken — overrule either cheaply

**1. Revision number, not content hash.** The brief called a content hash the taste-safe default.
I am overruling it, because the estate already has a working per-clip version mechanism in
production — `audio_revision` plus a `course_audio_revisions` ledger that maps revision to exact
`s3_key`. A content hash would mean building a parallel mechanism and hashing 2.5 million objects to
get a property we already have. Hash wins on self-description and dedup; the estate already dedups
by shared key, and the ledger already self-describes. Revision is better, simpler and cheaper *here*.

**2. Version in the id, not in a query string.** As above: it is the only one of the two that fixes
the offline cache, and it touches no hot-path client code.

**Compatibility window: permanent, not timed.** A bare uuid means "current revision" and costs
nothing to keep supporting — it is one branch in one function. There is no date on which anything
must be cut over, and therefore no flag day and no risk of a stale client breaking.

---

## Sequencing against the repair rollout — decided

The naked-TTS repair rollout (German and French full-course, then 50 seeds of every paid course) is
live and already writing revisions.

**The versioned scheme goes first.** Not because the rollout is unsafe — it is exemplary, it writes
new keys, retains originals and ledgers every swap — but because **its output is currently invisible
to any learner who already heard the old clip.** Every hour the rollout runs without versioned URLs,
it produces more correctly-repaired clips that no existing device will ever play. The 95 German
clips accepted this morning are already in that state.

The rollout does **not** need to hold or change what it writes. It is writing exactly the right
data; the learner app just cannot see it yet. That is my half to fix.

---

## Explicit gaps

- The exhaustive per-line Popty and learner-app sweeps are running as separate jobs; the tables above
  are my own verified findings and the seed lists, not the final complete enumeration. Counts may
  rise slightly. The structural conclusions do not depend on the exact count.
- I have not measured how many learner devices hold stale blobs for the 95 swapped German clips —
  there is no telemetry that would tell us, and I am not going to guess at it.
- The `aws` CLI is not installed on this machine; all S3 facts were established through the SDK
  instead. No fact above is weakened by that.
