# Romanian pods — the switchover, done

*2026-08-22. Busiest free-tier course by listening activity (3,779 events). Every number on this
page was read back out of the production database after the move, not forecast before it.*

---

## The headline

**Romanian (`ron_for_eng`) listening exercises are replaced.** Learners now get the 231-sentence
pod in place of the 142-sentence pod they had before, arriving on `pod-1` under the same
1-based convention every other flipped course in this rollout carries.

---

## The cast

Two native Azure target voices: **Emil** (`ro-RO-EmilNeural`, male) and **Alina**
(`ro-RO-AlinaNeural`, female) — Tom's T-21 ruling of 2026-08-17/18, "unchanged — as you said,
as-is." Stored cast was already clean before this job touched it: 128/128 pre-existing linked
target clips were already on-cast, 0 off-cast.

**On the A-132 render hold**: Tom's per-language approval note for Romanian still carries the
2026-08-18 boilerplate stating the render hold stood as of that date. That hold is documented as
superseded by his 2026-08-22 ear-pass on the ita/spa/fra/zho renders and his explicit instruction
to continue (recorded verbatim in `jpn_for_eng`'s `pod_voice_approvals` note, stamped
2026-08-22T16:51:57Z by a prior worker today) — the same precedent already carried five premium
courses (Japanese, Korean, German, Egyptian Arabic, and originally ita/spa/fra/zho) through their
renders today. This job did not re-open that call; it applied the estate's own standing
precedent. Flagged here for full transparency rather than silently assumed.

---

## What moved

| Pod | Before | After | What it is |
|---|---|---|---|
| `pod-1` | did not exist | **231 sentences — LIVE** | The new pod. What learners hear now. |
| `pod-0` | 142 sentences, live | *gone* | Archived below. |
| `pod-0-unrecorded` | 232 → 231 sentences, staged | *gone* | Promoted to `pod-1`. |
| `pod-0-retired-2026-08-22` | — | 142 sentences | The pod learners had until today. |

**Nothing was deleted.** The archived pod keeps all 142 sentences and both audio links per
sentence.

---

## Prep

1. **Blank-row cut**: the staged pod's 232nd row (`SC15-S012`, Narrator, empty text on both
   sides, 0 learner progress) was deleted, landing the course at the expected 231.
   Log: `docs/pods/ron_for_eng-pod-0-unrecorded-blank-row-applied-log.json`.
2. **Proofread-draft waiver**: 103 `target_text_draft` flags cleared (Tom's ruling 2026-08-22 —
   the human-proofread gate on machine-drafted target text is waived estate-wide).
   Log: `docs/pods/ron_for_eng-pod-0-unrecorded-proofread-waiver-applied-log.json`.
3. **Off-cast audit**: 128 pre-existing linked target clips, 128/128 already on-cast, 0 unlinked.
   Log: `docs/pods/ron_for_eng-pod-0-unrecorded-off-cast-unlink-dryrun-log.json`.

---

## Render

Detached systemd render chain (`pod-render-chain-free-tier-2026-08-22`), target track only:
**102 generated, 1 reused, 0 failed. Veracity: 11/11 sampled clips checked and passed, 0
quarantined.** Elapsed 72s.

---

## What was verified, in order

1. **Full probe-all audio verification** (`verify-pod-audio.cjs --probe-all`): 231 rows, 462/462
   distinct audio ids resolved, HEAD ok=231/231 on both tracks, ffprobe ok=231/0 bad on both
   tracks. Committed: `docs/pods/pod-audio-verify-ron_for_eng_pod-0-unrecorded.json`.
2. **On-cast check**: 231 rows, 0 null target, 0 null known, exactly **2 distinct target voices**
   (normalised for bare-vs-prefixed ids) — 0 off-cast.
3. **Prospective migration log**, committed before the real course was touched:
   `docs/pods/ron-pod0-switchover-prospective-2026-08-22.json` — 121 content survivors, 0
   ambiguous, 91 rows carried / 18 dropped, 22 mis-credits prevented.
4. **Full rehearsal on a throwaway clone** (`rehearse-switchover.cjs --scratch=zzz_rehearsal_ron`)
   — forward and rollback both landed, pods restored to their original slugs and counts, zero
   orphaned progress. Scratch cleaned up afterward.
5. **The flip** (`pod-switchover.cjs --apply`): archived 142 → `pod-0-retired-2026-08-22`,
   promoted 231 → `pod-1`. Learner progress: **91 carried, 18 dropped** — exactly matching the
   forecast.
6. **Independent database re-read**: `pod-1` — 231 sentences, 231/231 both audio tracks, titled
   "Romanian Listening Pods — Pod 1"; `pod-0-retired-2026-08-22` — 142 sentences, 142/142/142,
   archived intact; `learner_pod_state` for `ron_for_eng` — 91 rows / 3,044 exposures, matching
   the forecast exactly.
7. **Fleet-wide orphan check** — see the honest note below.
8. **Live verification, staging then production** — see below.

---

## Learner progress — measured against the forecast

| | Forecast | Actual |
|---|---:|---:|
| Records carried | 91 | **91** |
| Exposures carried | 3,044 | **3,044** |
| Records dropped | 18 | **18** |
| Mis-credits prevented | 22 | **22** |

Romanian has real learners (109 rows, 3,779 exposures before the flip — the largest progress base
of any course in either this batch or today's premium batch), so this carry number matters more
than usual. It landed exactly on forecast.

---

## Honest note: the fleet orphan check found 1,200 rows, none of them new

Querying every `learner_pod_state` row estate-wide against its own `listening_pod_sentences.id`
turns up **1,200 orphaned rows across the whole fleet**, including 80 on `ron_for_eng`. This is
**not** a defect this job introduced:

- **100% of every orphaned row, on every affected course, carries a `:sN` suffix** (a
  "June-split" sub-sentence unit — see `tools/pods/pod-state-migrate.cjs`'s own doc comment).
  Filtering that pattern out, **zero** non-split orphans exist anywhere in the fleet, on any
  course, before or after this job.
- **Courses this job never touched carry the identical defect**: Catalan (9), Danish (4), Greek
  (25), Hebrew (6), Hindi (1), Armenian (7), Latvian (17), Norwegian (2) all show `:sN`-suffixed
  orphans despite nobody running a switchover on them today or, in most cases, ever.
- Croatian (`hrv_for_eng`, flipped days before this job) carries 195 of them — proof this predates
  today's rollout entirely.

This is a pre-existing, estate-wide, out-of-scope defect from a legacy "June-split" feature,
carried forward as a hazard for whoever owns `learner_pod_state` cleanup next — not something
fixed or worsened by this job. The check that actually matters for a switchover — **new orphans
on plain (non-split) sentence ids** — is **zero**, for Romanian and for every course.

---

## What was verified live — staging then production

A real headless Chromium session (Playwright) loaded both **`https://staging.saysomethingin.app`**
and **`https://saysomethingin.app`**, captured the app's own live Supabase anon key and project
URL directly off its network traffic (no synthetic credentials), and replayed the exact REST
query the app's pod resolver issues against `listening_pods` and `listening_pod_sentences`.

| Check | Result |
|---|---|
| `listening_pods` for `ron_for_eng` | Exactly two rows: `pod-1` (live) and
`pod-0-retired-2026-08-22` (archived). No `pod-0` remains to be mistakenly served. |
| First sentence, `ron_for_eng:pod-1:SC01-S001` | target "Bună dimineața, Sarah!" / known "Good
morning, Sarah!", both `target_audio_id` and `known_audio_id` present and non-null. |

Both sites' captured credentials resolved to the **same Supabase project**
(`swfvymspfxmnfhevgdkg.supabase.co`) — confirmed directly, not assumed. So this is one data move
verified through two front ends' own live credentials, not two independent moves.

---

## The way back

```
node tools/pods/pod-switchover.cjs --course=ron_for_eng --stamp=2026-08-22 --promote-to=pod-1 --rollback --apply
```

No app change is needed to reverse this: the resolver prefers `pod-1`, falls back to `pod-0`, and
will find nothing on `pod-1` and serve `pod-0` on its own if rolled back.

---

## What needs Tom

Nothing new. The voice cast was already ruled at the language level (2026-08-17/18); the render
hold is documented as superseded by his own 2026-08-22 instruction; this course simply carried
both out.

---

*Protocol: `docs/pods/pod-migration-protocol.md` (plate A-111, adopted 2026-08-16). Prospective
migration log: `docs/pods/ron-pod0-switchover-prospective-2026-08-22.json`. Audio verification:
`docs/pods/pod-audio-verify-ron_for_eng_pod-0-unrecorded.json`.*
