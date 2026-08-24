# ita_for_eng Pod 1, Scene 15 — serving-path forensics

*2026-08-24. Read-only. Nothing generated, nothing deleted, nothing written to any table.*

**Verdict, ranked by the evidence actually collected: (d) a genuinely mis-voiced render that
passed the cast gate — Enzo (`x7avnu1k`) most likely renders as a female timbre despite xAI's
metadata and the `voices` table both saying `m`. (a) wrong DB pointer and (b) stale S3 object
under a reused key are both ruled out by direct evidence, not inference. (c) CDN/service-worker
cache is structurally implausible as the cause (see §2) though not something I can fully exclude
for one specific learner's device.**

This is the serving-path half of a two-worker investigation. Worker #279 measured the acoustic
bytes; this report establishes where those bytes come from and whether production is serving
something other than what the DB points at.

---

## 0. What Tom heard, restated precisely

Scene 15 (`ita_for_eng:pod-1`, live), 11 sentences, `global_order` 141–151:

| # | speaker | text | target voice | known voice |
|---|---|---|---|---|
| 1–10 | Learner | ("Quanto costa?" etc.) | `xai_ara` (Ara, **f**) | `xai_bedd6226` (Olivia, **f**) |
| 11 | Narrator | "100.000. … 60. … 70. … L'una. … Le 11." | `xai_x7avnu1k` (Enzo, declared **m**) | `xai_gfzdpspr5fdp` (Tom, **m**) |

The stored cast map is correct and two-voice: exactly one declared-male, one declared-female
target voice course-wide. The "two different female voices" Tom heard are Ara (sentences 1–10)
and Enzo (sentence 11) — Enzo is the one under suspicion of actually rendering female.

## 1. The learner-facing chain, read from the code

`ssi-learning-app/api/audio/[audioId].ts` → `api/_utils/audioAccess.ts` (`lookupAudioRecord`) →
`course_audio.s3_key` → `GetObjectCommand({ Bucket, Key: sample.s3_key })`. No caller-supplied
key and no convention-built path (`mastered/<row-id>.mp3`) can win — the S3 `Key` comes from
exactly one place, the DB row, full stop. That legacy convention-URL bug is what
`services/production-api.cjs:4266-4274` and `:4305-4314` document as already having burned the
estate twice (the Audio Preview tool, 2026-08-07; Deborah/`eus_for_eng`, 2026-08-12) — both fixed
by making the DB row's `s3_key` the sole authority. I read both fixed endpoints
(`/api/production/audio/:uuid/stream`, `/api/production/:courseCode/audio/:uuid/url`) and both now
only fall back to a caller-supplied key when **no row exists at all**, never as an override of one
that does. Verified against the running code, not the comments alone.

There is a genuine **revisioning system** (`course_audio.audio_revision` + `course_audio_revisions`,
`api/_utils/audioAccess.ts:86-185`) built for exactly Tom's hypothesis — "multiple versions, wrong
one served" — via `<uuid>.vN` refs that are cache-safe by construction (a new ref = a new URL = a
new cache key in both the browser and the IndexedDB `AudioCache`). But it is opt-in per code path:
only the `reuse-first-rebuild` swap (`services/phases/phase8-audio-v13.cjs:6934-7005`) uses it.
**`/regenerate-single` (the endpoint the 2026-08-23 hazard doc names,
`docs/pods/staged-pod-regen-live-hazard-2026-08-23.md`) still does a raw in-place UPDATE and never
bumps `audio_revision`** — I read it directly, lines 4176-4330 of the same file. If that endpoint
had ever been fired against a scene-15 row, it would leave no revision trail and the pod's audio
ref would stay a bare uuid. That is exactly why §3/§4 below check S3 object history and the audit
log directly, rather than trusting the revision column's absence as proof of nothing having
happened.

## 2. Player-side caching — could a learner be pinned to pre-swap bytes?

Two caching layers exist and both are real:

- **Browser HTTP cache**: `[audioId].ts` sets `Cache-Control: public, max-age=31536000, immutable`
  on every clip response — a year, no revalidation, ever, for that exact URL.
- **IndexedDB `AudioCache`** (`packages/player-vue/src/cache/AudioCache.ts`, `ssi-audio-cache-v2`):
  keyed by the bare audio id; `persistentEnsure`/`ephemeralAcquireForLego` both short-circuit with
  `if (this.persistentIds.has(id)) return` — once cached, **never re-fetched**, no TTL, no
  revalidation.

So: **yes**, a learner who played a clip before an in-place `s3_key` swap could keep hearing the
old bytes indefinitely, in both layers, and this is a real, previously-hit failure mode (the
`/stream` endpoint's own comments cite it twice). It is cleared only by a cache-busting event: a
revisioned `.vN` ref (which changes the URL/cache-key), an app update that bumps `DB_VERSION`, or
the learner clearing storage.

**This mechanism does not explain what Tom heard**, for a structural reason established in §3-4:
the scene-15 target clips, including the suspect Enzo row, have had **exactly one** S3 object and
**exactly one** DB write since creation on 2026-08-22 — there is no "old" and "new" version for a
cache to disagree about. A fresh, uncached request today gets byte-identical content to what has
been live since 2026-08-22T13:59:44Z. I cannot rule out that Tom's own device had something cached
from an even earlier build of this course, but there is no evidence of *any* second render of these
specific rows for a stale cache to be hiding — so this is ruled out as the systemic cause, with the
one-device caveat stated plainly as a gap I can't close from server-side forensics alone.

## 3. S3 forensics — the specific hunt for a reused key or an in-place overwrite

**Bucket `ssi-audio-stage` has versioning `Enabled`** (checked via `GetBucketVersioningCommand`,
using the same credentials `services/production-api.cjs` uses — `AWS_ACCESS_KEY_ID`/
`AWS_SECRET_ACCESS_KEY` from `.env`, region `eu-west-1`).

I HEAD'd and `ListObjectVersions`'d all 22 scene-15 objects — the 11 target (Italian) clips and
their 11 known (English) counterparts, using the exact `s3_key` each `course_audio` row currently
holds.

**Result: every one of the 22 keys has exactly one version, and every `LastModified` matches its
row's last write to the second.** No key is shared or reused between any two rows. No key has ever
been overwritten. Table for the target side (the suspect side):

| sentence | speaker | s3_key (current) | LastModified | version count |
|---|---|---|---|---|
| 1 | Learner | `mastered/E24B8781-…2838.mp3` | 2026-08-22T12:44:54Z | 1 |
| 2 | Learner | `mastered/02983099-…F8E.mp3` | 2026-08-22T12:45:47Z | 1 |
| 3 | Learner | `mastered/48C2FD63-…42F.mp3` | 2026-08-22T12:44:30Z | 1 |
| 4 | Learner | `mastered/83976515-…0E.mp3` | 2026-08-22T12:43:50Z | 1 |
| 5 | Learner | `mastered/DBF60571-…1F5.mp3` | 2026-08-22T12:45:49Z | 1 |
| 6 | Learner | `mastered/622F5D9A-…DC0.mp3` | 2026-08-22T12:46:39Z | 1 |
| 7 | Learner | `mastered/33ED7179-…2ED.mp3` | 2026-08-22T12:46:53Z | 1 |
| 8 | Learner | `mastered/9677EB20-…053.mp3` | 2026-08-22T12:45:37Z | 1 |
| 9 | Learner | `mastered/40FDBE16-…91E.mp3` | 2026-08-22T12:44:57Z | 1 |
| 10 | Learner | `mastered/365C1601-…F0B.mp3` | 2026-08-22T12:46:57Z | 1 |
| **11** | **Narrator (Enzo, suspect)** | `mastered/CE28110D-124E-4684-82FB-DEE51C4B6CB8.mp3` | **2026-08-22T12:47:48Z** | **1** |

This **rules out (b) — stale object under a reused key** for scene 15 outright: there is no reuse
anywhere in this scene, and bucket versioning shows no key was ever touched a second time.

## 4. content_audit_log — the write history behind those single versions

`course_audio` is audited (`content_audit_log`, `table_name='course_audio'`, 1,408,876 rows total,
covering 2026-07-03 through 2026-08-23T18:23Z — i.e. logging has been continuous through and past
this scene's build, so an absence of entries is meaningful, not a logging gap).

**Every one of the 11 scene-15 target rows has exactly one UPDATE event, 20-70 seconds after its
own `created_at`, and nothing since.** Reading the `old_row` payload of that single update
(example, the Enzo row): `s3_key` moved from `mastered/52F09A4D-…` (old) to `mastered/CE28110D-…`
(current), `voice_id` stayed `xai_x7avnu1k` throughout, `veracity_reason` moved from
`not_sampled`/`ok` to whatever the final accepted take carries. Same shape on all 11 rows, all
within their own creation minute. **This is the veracity-gate retry-then-publish pattern**
(`veracity.renderChecked`, `services/phases/phase8-audio-v13.cjs:6915`) — the render pipeline
trying a take, sampling/checking it, and publishing the accepted one — not a later regen. The
`old_key` from that single swap (e.g. `52F09A4D-…`) is a genuinely different, never-reused S3 key
(confirmed in §3's method against that key too), orphaned but harmless — it was never the row's
key at the moment any learner request could plausibly have hit it in production, since the pod
didn't go live until 2026-08-22T13:59:44Z, over an hour after this row's single publish.

**`course_audio_revisions` has zero rows for any of the 11 scene-15 target ids** — confirming the
ledgered swap path (§1) was never used on these rows, consistent with §3's single-version finding.

This **rules out (a) — wrong DB pointer via a later overwrite** for the target side: the pointer
(`course_audio.id`) and the bytes behind it have been the same, singly-published pair since
2026-08-22T12:47:48Z.

## 5. Today's pod flip — what actually moved, and whether it touched scene 15

`listening_pods` for `ita_for_eng` currently holds three rows:

| id | visibility | created_at |
|---|---|---|
| `pod-0-retired-2026-08-22` | held | 2026-08-22T13:59:44Z |
| `pod-1-retired-2026-08-24` | held | **2026-08-24T08:29:52.629Z** |
| `pod-1` (live) | live | **2026-08-24T08:29:52.629Z** |

Same-millisecond `created_at` on the retired and live pair is the switchover script
(`docs(pods): 21 Pod 1 courses flipped live…`, commit `92b445cd7`, 08:38Z today — `ita_for_eng` is
one of the 21) doing a same-transaction swap. `content_audit_log` on `listening_pods` confirms the
mechanics precisely: at `2026-08-24T08:29:52.629Z`, **two DELETEs** fire — primary key
`ita_for_eng:pod-1` (the pre-flip live pod, archived under the new id `pod-1-retired-2026-08-24`)
and `ita_for_eng:pod-1-staged-2026-08-23` (the staged build, promoted to become the new live
`pod-1`). At `09:39:52.926Z` the retired pod's `visibility` was set to `held` (matches the
"hold the 21 retired pods" commit, `1a2c3ad2b`, so retired pods stop shipping via offline
download).

**Comparing every one of the 231 sentence rows between live `pod-1` and `pod-1-retired-2026-08-24`
by `global_order`:** many rows differ (mostly `known_audio_id`, some `target_audio_id` too — a
course-wide English-audio refresh landed in the promoted build). **For scene 15 specifically
(`global_order` 141-151): `target_audio_id` is IDENTICAL on all 11 rows between the pre-flip and
post-flip pod, sentence 11 (Narrator/Enzo) has BOTH `target_audio_id` AND `known_audio_id`
identical, and sentences 1-10 differ only on `known_audio_id`** (a straight English-side refresh,
unrelated to the voice defect). Today's flip touched zero target-side pointers in scene 15.

This **rules out (a) a wrong-pointer-from-today's-flip** specifically, on top of §4's general
ruling-out of pointer drift: whatever Enzo clip Tom heard today at 10:53Z is the exact same row,
same S3 key, same bytes that have been live since 2026-08-22T13:59:44Z — roughly 45 hours, through
and past the flip, unchanged.

## 6. Scene 15 reconciliation — original render or later overwrite, per clip

| # | speaker | target row | original or overwritten? | evidence |
|---|---|---|---|---|
| 1 | Learner | `3dacb8c6…` | **Original** (single veracity-publish, 2026-08-22T12:45:33Z) | 1 audit UPDATE, 1 S3 version |
| 2 | Learner | `44f61b15…` | **Original** (12:45:46Z) | 1 audit UPDATE, 1 S3 version |
| 3 | Learner | `da55642b…` | **Original** (12:44:29Z) | 1 audit UPDATE, 1 S3 version |
| 4 | Learner | `04a67b80…` | **Original** (12:43:49Z) | 1 audit UPDATE, 1 S3 version |
| 5 | Learner | `45791332…` | **Original** (12:45:49Z) | 1 audit UPDATE, 1 S3 version |
| 6 | Learner | `75c1c77b…` | **Original** (12:46:38Z) | 1 audit UPDATE, 1 S3 version |
| 7 | Learner | `4a10d96a…` | **Original** (12:46:52Z) | 1 audit UPDATE, 1 S3 version |
| 8 | Learner | `13f62ca9…` | **Original** (12:45:36Z) | 1 audit UPDATE, 1 S3 version |
| 9 | Learner | `9b8575ae…` | **Original** (12:44:56Z) | 1 audit UPDATE, 1 S3 version |
| 10 | Learner | `46bf25a1…` | **Original** (12:46:56Z) | 1 audit UPDATE, 1 S3 version |
| **11** | **Narrator (Enzo)** | `0a0b8c5b…` | **Original** (12:47:47Z) | 1 audit UPDATE, 1 S3 version |

"Original" here means: one render, one veracity-gate retry-then-publish, one S3 object, never
touched again — as opposed to a later, separate regen event. All 11 clips carry the same shape.
None shows a second, later write of any kind.

## 7. Verdict, ranked

1. **(d) Genuinely mis-voiced render, most likely — passed the gate because the gate checks the
   declared cast map, not the bytes.** Every serving-path mechanism that could substitute the
   wrong bytes for the right ones — wrong DB pointer, stale S3 object under a reused key, an
   in-place overwrite invisible to the row history — is directly ruled out for these 11 rows by
   S3 version history and the audit log, not by absence of a smell. The estate has a confirmed
   precedent for this exact shape of bug: `hqxr4yub` (Luca, Italian) is recorded as female in the
   `voices` table (from the 2026-08-11 xAI reconciliation) while `tools/pod-voices-xai.json` still
   says "m" — i.e. xAI's own declared metadata has already been shown to disagree with a voice's
   actual gender at least once, and the registries haven't fully reconciled since. `x7avnu1k`
   (Enzo) rendering female despite a clean "m" in both `voices` and `pod-voices-xai.json` would be
   the same failure mode recurring on a different voice. I did not measure the bytes myself —
   that's worker #279's job — but nothing in the serving path offers a competing explanation.
2. **(a) Wrong DB pointer — ruled out.** Same row, same `target_audio_id`, before and after
   today's flip (§5); zero `course_audio_revisions` rows; single audit-log write ever (§4).
3. **(b) Stale S3 object under a reused key — ruled out.** Bucket versioning is on; every scene-15
   key (target and known) has exactly one version, ever (§3).
4. **(c) CDN/service-worker/IndexedDB cache — structurally implausible as the systemic cause, not
   fully excludable for one device.** The caching mechanism is real and has bitten the estate
   before (§2), but it requires two different versions of a clip to exist for a cache to be
   "stale" relative to, and §3/§4/§6 show there has only ever been one version of every scene-15
   clip. It cannot explain what a *fresh* listen sounds like today. I cannot rule out that Tom's
   own client had cached something from an even earlier, unrelated course build, but found no
   evidence any such earlier version of these rows ever existed.

**What would distinguish (d) definitively from a residual sliver of (a)/(b)/(c) I can't see:**
worker #279's bytes-only measurement of `mastered/CE28110D-124E-4684-82FB-DEE51C4B6CB8.mp3` (the
current, only-ever-published S3 object for the Enzo row) against Ara's clips and against known
confirmed-male references. If those bytes measure female, (d) is confirmed outright — there is no
serving-path story left to tell, because I've shown there is only one version of this clip that has
ever existed.

## 8. Gaps — explicit

- I did not independently re-derive the acoustic gender of any clip — that is #279's job by design,
  and duplicating it here would waste the fan-out. I read #279's territory only to know what NOT to
  re-measure.
- I did not check every one of the 231 pod-1 sentences' S3 version history — only scene 15's 22
  clips (11 target + 11 known), per the brief's specific ask. The full-pod diff in §5 (target/known
  identical-or-changed) covers pointer drift for the other 220 rows; I did not extend the S3
  version-history check to them.
- I cannot rule out a single learner's browser/IndexedDB holding bytes from a build of this course
  that predates 2026-08-22 — no evidence such a build's audio ever differed on these rows, but I
  have no way to inspect Tom's own device from here.
- I did not check `_audit_s3_touch` beyond confirming it has zero rows for these 11 ids — its
  schema is a single `audio_id` column with no timestamp, so it likely records touches from a
  specific tool I did not identify; zero rows is consistent with everything else found here.

---

*Method: direct `SELECT`-only queries against production (`DATABASE_URL` via `.env.psql`), direct
`HeadObjectCommand`/`ListObjectVersionsCommand`/`GetBucketVersioningCommand` against
`ssi-audio-stage` using the credentials in `.env` (same ones `services/production-api.cjs` uses),
and direct reads of `ssi-learning-app/api/audio/[audioId].ts`,
`ssi-learning-app/api/_utils/audioAccess.ts`, `services/production-api.cjs`,
`services/phases/phase8-audio-v13.cjs`, and `packages/player-vue/src/cache/AudioCache.ts`. No
table was written, no object was deleted, no audio was generated.*
