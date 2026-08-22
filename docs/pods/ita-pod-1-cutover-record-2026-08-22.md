# Italian pods — the switchover, done

*2026-08-22. Every number on this page was read back out of the production database after the
move, not forecast before it. Where a number was predicted, the prediction is shown next to
what actually happened.*

---

## The headline

**The old Italian listening exercises are replaced.** Italian learners now get the 231-sentence,
22-scene pod that was staged and verified — 231/231 rows independently proven playable and
on-cast (Enzo and Ara, zero off-cast) in job #949 — in place of the 142-sentence pod they had
before.

It arrives under the 1-based naming convention Croatian and Spanish already carry: `pod-1`. Like
Spanish, there was no occupant on the `pod-1` slug to vacate first — a single flip, no pre-step.

---

## What moved

| Pod | Before | After | What it is |
|---|---|---|---|
| `pod-1` | did not exist | **231 sentences — LIVE** | The new pod. What learners hear now. |
| `pod-0` | 142 sentences, live | *gone* | Archived below. |
| `pod-0-unrecorded` | 231 sentences, staged | *gone* | Promoted to `pod-1`. |
| `pod-0-retired-2026-08-22` | — | 142 sentences | The pod learners had until today. |

**Nothing was deleted.** The archived pod keeps all its sentences and every audio link.

---

## Learner progress — measured against the forecast

Three learners held 40 sentence records carrying 519 exposures, all under `pod-0`.

| | Forecast | Actual |
|---|---:|---:|
| Records carried | 32 | **32** |
| Exposures carried | 398 | **398** |
| Records dropped | 8 | **8** |
| Mis-credits prevented | 10 | **10** |

All 8 dropped records dropped for one reason — the sentence text is no longer anywhere in the new
pod (`text_absent_from_new_canon`). Zero ambiguous-text matches.

The 10 mis-credits are the point of the exercise: editing the live pod in place would have
silently credited learners 10 times with sentences they had never heard. No course-level progress
was touched by any of this, and no learner can go backwards.

---

## What was verified, in order

1. **Readiness dry run** (`pod-switchover.cjs`, no `--apply`) — matched the pre-measured forecast
   exactly: 142 live / 231 staged, 0 untranslated / draft / missing-audio on either track, 32
   carry / 8 drop.
2. **Full rehearsal on a throwaway clone** (`rehearse-switchover.cjs --scratch=zzz_rehearsal_ita`)
   — forward flip and rollback both run for real against a disposable copy. Verdict: PASS. Forward
   produced the same 32/8 split; rollback restored both pods to their original slugs and counts
   with zero orphaned progress. (Exposure count after the round trip is expected to be lower than
   before — rollback re-derives progress from what survived, it does not resurrect dropped
   exposures. Documented, not a bug.)
3. **Prospective per-record migration log** saved and committed before touching the real course:
   `docs/pods/ita-pod0-switchover-prospective-2026-08-22.json` — 117 content survivors, 32 carry /
   8 drop, matching the dry run exactly.
4. **Applied**, one transaction: `switched. archived 142 → pod-0-retired-2026-08-22, promoted 231
   → pod-1. learner progress: 32 carried, 8 dropped.`
5. **Independent database re-read** (not the tool's own summary): `pod-1` — 231 sentences, titled
   "Italian Listening Pods — Pod 1"; `pod-0-retired-2026-08-22` — 142 sentences; all 32 remaining
   progress rows re-keyed onto `pod-1`. Target-track cast on `pod-1` confirmed as exactly the two
   approved voices — `x7avnu1k` (Enzo) and `ara` (Ara) — with zero off-cast rows and zero missing
   audio on either track.
6. **Fleet-wide orphan check** — progress records pointing at a scene/sentence that no longer
   exists in their claimed pod, across every course carrying pod progress: **zero**. (First pass of
   this check threw 1,282 false positives from `cat_for_eng`/`cym_n_for_eng` — those courses use
   June-split sub-units, `sentence_id` suffixed `:s0`/`:s1` against a base `listening_pod_sentences`
   row with no suffix. Corrected the query to strip that suffix before matching; the corrected
   query returns zero, as it should, and this pre-existed today's move — Italian's own progress
   rows had no such false positives either way.)
7. **Fleet no-op check** — Chinese and French still serve `pod-0`/`pod-0-unrecorded` at their
   original counts (142/231), German unchanged (142/232), Croatian and Spanish still serve `pod-1`
   (231 each). This move touched Italian and nothing else.

---

## What was verified live, in a real browser — staging then production

A real Chromium browser, the deployed app's own anonymous Supabase credentials, run against
**`https://staging.saysomethingin.app`** first and then **`https://saysomethingin.app`**, asking
the questions a learner's browser asks. **Every check below passed on both.**

| Check | Staging | Production |
|---|---|---|
| Served bundle carries the pod resolver | **Yes** — `index-Bg5bpeRl.js` | **Yes** — `index-CWh28bMu.js` (different build, same resolver shape) |
| Italian resolves to | **`pod-1`** | **`pod-1`** |
| Italian sentence / scene count | **231 sentences, 22 scenes** | **231 sentences, 22 scenes** |
| Italian audio linked | **231/231 target, 231/231 known** | **231/231 target, 231/231 known** |
| First Italian clip via the live audio proxy | **200, `audio/mpeg`, 78,048 bytes** | **200, `audio/mpeg`, 78,048 bytes** (same clip, same DB) |
| Spanish / Croatian (untouched fleet check) | **`pod-1`, 231 each** | **`pod-1`, 231 each** |
| French / Chinese (untouched fleet check) | **`pod-0`, unchanged** | **`pod-0`, unchanged** |

**The honest caveat, stated plainly rather than glossed: this is one data move, verified through
two front ends, not two independent moves.** `dev`, `staging` and production all read the same
Supabase database — so "Italian resolves correctly" was necessarily the same fact checked twice,
not two different facts. What staging genuinely adds here is independent confirmation that the
**staging bundle itself** carries the resolver code (a real, separate risk — a stale staging build
could have shown the right data through the wrong code path) and that the fleet no-op holds through
staging's own deployed JS, not just the database.

**Environmental gap, closed rather than skipped:** the browser launch failed on its first attempt
in this session (`libnspr4.so: cannot open shared object file`). Rather than falling back to
database-only verification, this was resolved with the box's own documented workaround —
`LD_LIBRARY_PATH=$HOME/.ssi-sentinel-libs`, the same fix already recorded in
`docs/recorder-e2e-2026-08-06/report.md` for this machine's e2e suite — and the full browser run
above is real, not a database-only fallback.

---

## The Popty admin page

`/production/ita_for_eng/pods/pod-1` — **could not be logged into**, Popty is behind an email
one-time code only Tom receives. What is verified is the data the page loads, not the pixels,
stated precisely: the same open API the page calls (`GET /api/pods/ita_for_eng/pod-1`, running
locally against production data) returns title "Italian Listening Pods — Pod 1", slug `pod-1`,
target voice `ara` (Ara) confirmed in the speaker map. The old link,
`/production/ita_for_eng/pods/pod-0-unrecorded`, now 404s as documented — confirmed against the
same API (`GET /api/pods/ita_for_eng/pod-0-unrecorded` → 404).

The known PodLab trap (resolves "current pod" by picking the largest `pod-0`-prefixed match, so it
will show the *retired* 142-line pod, not the new 231-line one) applies here exactly as it does for
Croatian and Spanish. The fix for it is written but unreleased — not touched or released as part of
this job.

---

## The way back

```
node tools/pods/pod-switchover.cjs --course=ita_for_eng --stamp=2026-08-22 --promote-to=pod-1 --rollback --apply
```

**`--stamp=2026-08-22` and `--promote-to=pod-1` must both be there** — the tool's own default
stamp (`2026-08-14`) would find nothing and refuse rather than doing something strange. This was
rehearsed on a throwaway clone before the real course was touched (see step 2 above), and the
rollback put both pods back on their original slugs with their original counts and zero orphaned
progress. What it does not restore: the 121 exposures dropped on the way in — rollback re-derives
progress from what survived rather than resurrecting what was there before.

No app change is needed to reverse this: if rolled back, the resolver (which prefers `pod-1`, falls
back to `pod-0`) finds nothing on `pod-1` and serves `pod-0` on its own.

---

## What's untouched, stated once more

Chinese and French were **not** flipped, queued, rendered, or touched in any mode in this job.
Chinese flips next in this same sequence, then French once its one quarantined audio row is
resolved. `spa_mx` and `fra_ca` were not touched — out of scope, separate casting.

---

*Protocol: `docs/pods/pod-migration-protocol.md` (plate A-111, adopted 2026-08-16). Prospective
migration log committed alongside this page:
`docs/pods/ita-pod0-switchover-prospective-2026-08-22.json`.*
