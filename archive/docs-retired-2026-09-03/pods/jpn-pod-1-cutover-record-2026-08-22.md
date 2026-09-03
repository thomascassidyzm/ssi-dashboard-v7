# Japanese pods — the switchover, done

*2026-08-22. Every number on this page was read back out of the production database after the
move, not forecast before it. Where a number was predicted, the prediction is shown next to
what actually happened. The data move itself is not this job's work — it was already applied and
independently re-read from the database before this job started. This job is the browser
verification and this record.*

---

## The headline

**Japanese listening exercises are replaced.** Japanese learners now get the 231-sentence,
22-scene pod in place of the 142-sentence pod they had before, under the same 1-based `pod-1`
convention Croatian, Italian, French and Spanish already carry.

Japanese is the **largest re-render of the eight-course rollout**: because the whole previous
125-clip render was on a voice pair Tom explicitly rejected on ear (`b1a7441b97a1` "Ren" + `ara`,
T-21 ruling, 2026-08-17), every one of those clips was off-cast and had to be unlinked — Japanese
got a full 231-clip re-render, not a top-up, unlike the other seven courses.

---

## What moved

| Pod | Before | After | What it is |
|---|---|---|---|
| `pod-1` | did not exist | **231 sentences — LIVE** | The new pod. What learners hear now. |
| `pod-0` | 142 sentences, live | *gone* | Archived below. |
| `pod-0-retired-2026-08-22` | — | 142 sentences | The pod learners had until today. |

**Nothing was deleted.** The archived pod keeps all 142 sentences and both audio links per
sentence (142 + 142). The 125 off-cast target clips from the rejected voice pair were unlinked —
the link nulled, no `course_audio` row deleted — and every link is restorable from the committed
per-row log.

**Cast**: Naoki (male, Azure `ja-JP-NaokiNeural`) and Mayu (female, Azure `ja-JP-MayuNeural`),
both native Japanese Azure voices — no multilingual fallback voice involved.

---

## Render

5-clip sample first (0 failed, veracity 1/1), then bulk: 226 generated, 0 failed, veracity 13/13
passed, 94 seconds total.

---

## Learner progress — measured against the forecast

25 learner progress rows / 324 exposures existed before, all under `pod-0`.

| | Forecast | Actual |
|---|---:|---:|
| Records carried | 20 | **20** |
| Exposures carried | 249 | **249** |
| Records dropped | 5 | **5** |
| Exposures dropped | 75 | **75** |

**77% of Japanese pod exposures carried across** — forecast and actual matched exactly. All 5
dropped records dropped for the one standard reason, `text_absent_from_new_canon` — the sentence
text is no longer anywhere in the new pod. This is not being re-opened here; Tom's standing
position holds ("we know it won't be perfect"): report it as the fact it is. The 7 mis-credits
prevented are the point of the exercise — editing the live pod in place would have silently
credited learners with sentences they never heard.

---

## What was verified, in order

1. **Rehearsal on a throwaway clone** (`zzz_rehearsal_jpn`) — forward flip and rollback both run
   for real against a disposable copy. Verdict: PASS on both directions. Pods restored to their
   original slugs and counts on rollback, no orphaned progress, clone dropped.
2. **Applied**, archiving 142 → `pod-0-retired-2026-08-22`, promoting the freshly-rendered 231 →
   `pod-1`.
3. **Independent database re-read** (not the migration tool's own summary, this job's own query):
   `pod-1` — 231 sentences, titled "Japanese Listening Pods — Pod 1"; `pod-0-retired-2026-08-22` —
   142 sentences; both known and target audio 231/231 linked.
4. **Full-audio probe, Croatian standard, no sampling** (`verify-pod-audio.cjs --probe-all`) — 462
   of 462 audio ids resolved, HEAD ok=231 missing=0 on both tracks, ffprobe ok=231 bad=0 on both
   tracks.
5. **On-cast check against the live Croatian reference** (`hrv_for_eng:pod-1`), one query: both
   pods read 231 rows, 0 null target, 0 null known, 0 off-cast, 2 distinct voices. Japanese
   matches the reference exactly.
6. **End-of-clip click check** — three fresh clips probed, tail-400ms peak -8.1 / -9.4 / -10.1 dB,
   speech running to the end, no isolated post-silence impulse. No click. (Tom abolished click/tail
   repair on 2026-08-17 — report only, never patch.)
7. **Fleet orphan check after the flip** — zero orphan progress rows, zero orphan exposures,
   estate-wide.
8. **Fleet no-op check** — only the eight rollout courses' staging pods and Japanese's own flip
   were touched; no untouched course moved.
9. **Browser verification** (this job) — see below.

---

## What was verified live, in a real browser — staging then production

A real Chromium, driven via Playwright, using the deployed app's own anonymous Supabase
credentials, run against **`https://staging.saysomethingin.app`** first and then
**`https://saysomethingin.app`**, asking the questions a learner's browser asks (the exact query
the app's `servedPod` resolver runs: `listening_pods` filtered to `pod_type=core`, preferring
`pod-1` over `pod-0`). **Every check below passed on both.**

| Check | Staging | Production |
|---|---|---|
| Served bundle carries the pod resolver | **Yes** — `index-Bg5bpeRl.js` | **Yes** — `index-CWh28bMu.js` (same bundle hashes seen on the French/Italian checks earlier today — no redeploy happened between jobs) |
| Japanese resolves to | **`pod-1`** | **`pod-1`** |
| Japanese sentence / scene count | **231 sentences, 22 scenes** | **231 sentences, 22 scenes** |
| Japanese audio linked | **231/231 target, 231/231 known** | **231/231 target, 231/231 known** |
| First Japanese clip via the live audio proxy | **200, `audio/mpeg`, 52,992 bytes** | **200, `audio/mpeg`, 52,992 bytes** (same clip, same DB) |

**The honest caveat, stated plainly rather than glossed: this is one data move, verified through
two front ends, not two independent moves.** `dev`, `staging` and production all read the same
Supabase database, so "Japanese resolves correctly" is necessarily the same fact checked twice
through two different JS bundles, not two different facts. What staging genuinely adds is
independent confirmation that the **staging bundle itself** carries the resolver code — a real,
separate risk, since a stale staging build could have shown the right data through the wrong code
path.

---

## The Popty admin page

`/production/jpn_for_eng/pods/pod-1` was not driven directly — Popty is behind an email
one-time code only Tom receives, so pixels were not checked. This is an explicit gap in coverage
of the admin UI itself, not of the data: the underlying content was independently confirmed by
direct database read and by the learner-facing browser check above.

Japanese has only two slugs in `listening_pods` — `pod-1` (live) and `pod-0-retired-2026-08-22`
(archived); there is no `pod-0-unrecorded` slug here, so the "old link now 404s" trap documented
for other courses doesn't apply verbatim to Japanese's naming. The trap that does apply: PodLab
resolves "current pod" by picking the largest `pod-0`-prefixed match, so it will show the
**retired** pod, not the live `pod-1` one. The fix for that is written but unreleased — not
released as part of this job.

---

## Methodology note — Learner voice, observation only

The pod's "Learner" speaker is cast **female** (Mayu) in Japanese — confirmed directly against
`course_audio.voice_id` (79 Learner rows on `azure_ja-JP-MayuNeural`, 16 Narrator rows on
`azure_ja-JP-NaokiNeural`). Tom's two-voice ruling describes the male voice as the learner/
protagonist thread; of the five courses live before today, Croatian and Spanish cast Learner male,
Italian, French and Chinese cast Learner female, and Tom passed all five by ear. Japanese follows
the pod's own stored speaker genders, consistent with the majority of what has shipped today.
Stated as an observation; nothing changed.

---

## The way back

```
node tools/pods/pod-switchover.cjs --course=jpn_for_eng --stamp=2026-08-22 --promote-to=pod-1 --rollback --apply
```

Rehearsed forward and back on a throwaway clone before the real course was touched (see step 1
above); rollback put every pod back on its original slug with its original counts and zero
orphaned progress. No app change is needed to reverse this: the resolver prefers `pod-1` and falls
back to `pod-0` on its own — if rolled back, it finds nothing on `pod-1` and serves `pod-0`
without a deploy.

---

*Protocol: `docs/pods/pod-migration-protocol.md` (plate A-111, adopted 2026-08-16).*
