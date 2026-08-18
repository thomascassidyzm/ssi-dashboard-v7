# The clips that were fixed before the fix — scope, and a 394-clip pilot

**Plate A-158 · 2026-08-18 · scoping + pilot only, no estate-wide write**

Commit `254a2f4d` made the six in-place writers move the learner's cache key. This
plate answers the question it left open: **what about every clip swapped in place
*before* that fix?** Those clips are correct in the DB and correct in S3, and
still wrong on any device that already cached them — because nothing will ever
ask the origin for that address again.

---

## The headline

| | clips |
|---|---|
| Exposed, estate-wide (detectable) | **474,100** |
| …in courses with real play activity since June | 365,164 |
| …in dormant / under-construction courses | 108,936 |
| **Provable-grade subset** (revision observably stood still) | **267** |
| Piloted and remediated today (`eus_for_eng`) | **394** |

**The 474,100 is not a work list.** Most of it is build-time churn on courses no
learner has ever opened. The number that should drive sequencing is much smaller,
and the reasoning below is the deliverable, not the count.

---

## Why there are two populations, not one

`audio_revision` and the `course_audio_revisions` ledger **both begin at
2026-08-05 21:37Z**. That single fact splits the estate in half.

**After 2026-08-05 21:37Z — provable.** `content_audit_log.old_row` carries
`audio_revision`, so "the key moved while the revision stood still" is directly
observable. 904 such events across 889 clips; 267 still exposed (the rest were
cured by a later legitimate bump, which moved the address anyway).

**Before 2026-08-05 21:37Z — provable by construction.** The column did not
exist, so *every* in-place swap was unversioned. 500,119 clips were swapped;
473,833 are still at revision 1.

A trap worth naming: introducing the column **cured nothing**. `buildAudioRef()`
returns a **bare uuid** whenever revision ≤ 1 (`api/_utils/audioAccess.ts:129`),
so backfilling everything to 1 moved no address. It is easy to assume the
migration was itself a cache-bust. It was not.

### One measurement I had to throw away

My first detector said **200,171 events across 152,156 clips**. It was wrong, and
wrong in the direction that flatters the finding. `old_row->>'audio_revision'`
is NULL for every pre-August audit row — the key simply is not in the snapshot —
and `rev IS NOT DISTINCT FROM next_rev` treats NULL≡NULL as a match. So 197,964
of those 200,171 "unversioned swaps" were a comparison of nothing against
nothing. Recorded here because the shape of the error (a check whose unit is not
the thing being checked) is the one this estate keeps repeating.

---

## Why the 474,100 overstates the harm

A clip re-rendered mid-build, before any learner ever heard it, has **zero**
exposure: no device holds it. Cross-referencing the affected set against
`player_events` shows the big counts sit almost entirely on courses under
construction.

| course | actors since June | exposed clips |
|---|---|---|
| spa_for_eng | 145 | 38,511 |
| eng_for_kan | **9** | 31,592 |
| kor_for_eng | 32 | 30,468 |
| jpn_for_eng | 91 | 27,804 |
| eng_for_mar | **11** | 23,989 |
| eng_for_tel | **11** | 22,581 |
| eng_for_ben | **1** | 22,311 |
| eng_for_hin | 122 | 22,294 |
| zho_for_eng | **1,321** | 14,630 |
| hrv_for_eng | 183 | 3,553 |
| fra_for_eng | 163 | 1,391 |
| eus_for_eng | 31 | 394 *(piloted)* |

`eng_for_ben` has 22,311 exposed clips and **one** actor. `zho_for_eng` has
1,321 actors and 14,630. Those two rows should be treated completely
differently, and a flat "474,100 clips need fixing" hides exactly that.

### Explicit gaps

- **`content_audit_log` starts 2026-07-03.** Any in-place swap before that date
  is invisible to this method. The true pre-August figure is a floor, not a total.
- **Exposure is inferred, not measured.** `player_events` tells us a course was
  played; it does not tell us which learner cached which clip. Course-level
  activity is the best available proxy — no per-clip cache telemetry exists.
- **Dormant ≠ safe forever.** A course with no learners today accumulates no
  harm, but the stale address persists and the first learner to arrive after a
  future swap inherits it.

---

## The pilot — `eus_for_eng`, 394 clips

Chosen because it is small, has real learners (31 actors), and carries the
largest provable-window cluster in the estate (180 of the 267).

The bytes at `s3_key` were already correct, so **nothing was rendered and no TTS
was spent**. Only the address moved: `audio_revision` 1 → 2, which turns the ref
from `<uuid>` into `<uuid>.v2`.

Applied in **one transaction** with a drift guard (all 394 rows had to still
match the triaged snapshot byte-for-byte, or roll back), ledger-first, then a
post-write assertion that the bump took on every row. Dry run first: 394/394
agreeing, rolled back, then applied.

- 394 rows bumped to revision 2; 394 `course_audio_revisions` rows written with
  `source='a158-stale-cache-remediation'`.
- `previous_s3_key = new_s3_key` **on purpose** — this swap moves the address,
  not the bytes, so both revisions resolve to the same object and the old ref
  keeps playing for anyone still holding it.
- Re-ran the detector: `eus_for_eng` residue **394 → 0**. No other bucket moved.

### Verified on served bytes

Before the bump I captured three clips; `/api/audio/:id` really does answer
`Cache-Control: public, max-age=31536000, immutable` — the year-long cache is
not theoretical. After the bump, for all three:

| ref | status | md5 |
|---|---|---|
| bare uuid (pre-bump) | 200 | `9d26eb2f…` / `ea306018…` / `f05116bc…` |
| `<uuid>.v2` (post-bump) | 200 | identical |
| bare uuid (post-bump) | 200 | identical |

So the bump is address-only and **nothing went silent** — the failure mode that
matters most here.

**Safety check done before writing:** `resolveRevisionS3Key` short-circuits when
the requested revision equals the current one, and falls back to the row's
current key otherwise. A bumped `.vN` therefore cannot fail to resolve. Sampled
clips were confirmed alive (HTTP 200) *before* the bump, so no ref was moved
onto a missing object.

### Confirmed at the browser (job #195)

Server-side evidence cannot prove client-side cache behaviour, so it was probed
separately in a real headless Chromium:

- **The suffix reaches the client.** `/api/courses/eus_for_eng/cycles` returns
  `target2_id: "099a7918-….v2"` — the server route genuinely stamps it.
- **`.v2` misses a warm cache.** The bare uuid was fetched twice (second hit
  `fromDiskCache:true`, so the cache was genuinely warm) and IndexedDB
  `ssi-audio-cache-v2` seeded at the bare-uuid key. The first `.v2` fetch was
  `fromDiskCache:false` — a real network hit — and the IndexedDB lookup on the
  `.v2` key returned not-found. Re-fetching the bare uuid still hit disk cache,
  proving the two are independent entries.
- **Identical bytes.** Both refs 200, both 29,088 bytes, identical SHA-256.

Gaps stated rather than glossed: the cache test used direct `fetch()`/IndexedDB
calls in the page context rather than clicking through the course picker
(mechanically equivalent — both caches key on URL/id strings, not call path);
one clip of the 394 was exercised end-to-end; and the client-side
`generateLearningScript.ts` walk was confirmed by reading the shared
`buildAudioRef`/`stampRowAudioRefs` logic, not by a second live run.

Detail: https://watson-1.tail4968cb.ts.net/d/53771f00

---

## Recommendation

**All-at-once is wrong. Activity-first is right.**

It is tempting to argue "it's only a metadata bump, do all 474,100." The cost is
not the write — it is that every bumped clip forces a re-download for every
learner holding it. On a dormant course that buys nothing; on `zho_for_eng` it
buys the fix for 1,321 people.

Recommended sequencing:

1. **Now — active courses with real learners.** `zho_for_eng` (1,321 actors),
   `hrv_for_eng` (183), `fra_for_eng` (163), `spa_for_eng` (145), `eng_for_hin`
   (122), `deu_for_eng` (112), `jpn_for_eng` (91), `ita_for_eng` (87),
   `pol_for_eng` (85). ~150k clips; this is where all the harm actually lives.
2. **Then — the long tail of active courses**, same script, one course per run.
3. **Dormant / under-construction courses: do not bump.** ~109k clips with no
   devices holding them. Cheaper and safer to let their next real build move the
   address, now that the six writers do it correctly.

Oldest-first *within* a course is not worth the complexity: the exposure
difference between a swap 12 days ago and 40 days ago is small next to the
difference between 1,321 learners and 1.

The tooling is course-scoped and re-runnable
(`tools/a158-stale-cache/`): snapshot → dry run → apply → re-run detector and
reconcile. Each course is an independent, reversible-by-re-bump step.

**Not executed:** the estate-wide bump. Pilot only, as scoped.
