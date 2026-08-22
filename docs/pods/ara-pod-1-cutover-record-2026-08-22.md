# Arabic pods — the switchover, done

*2026-08-22. Every number on this page was read back out of the production database after the
move, not forecast before it. The data move itself is not this job's work — it was already applied
and independently re-read from the database before this job started. This job is the browser
verification and this record.*

---

## The headline

**Arabic MSA listening exercises are replaced.** Arabic learners now get the 231-sentence,
22-scene pod in place of the 142-sentence pod they had before, under the same 1-based `pod-1`
convention already carried by Croatian, Italian, French, Chinese, Japanese and Spanish.

**Cast**: Shakir (male, Azure `ar-EG-ShakirNeural`) and Salma (female, Azure `ar-EG-SalmaNeural`) —
both **native** Azure Arabic voices, no xAI multilingual fallback involved. This is Tom's own
ruling of 2026-08-18, taken after he rejected every xAI Arabic candidate on ear the day before:
"Arabic MSA - all bad to my ears. None sound authentic to me."

Both of Arabic's pre-existing target clips were **off-cast** — the previous render was in a voice
Tom never picked — so this was a full 226-clip re-render, not a top-up. This was caught only by
the on-cast check: the readiness gate counts sentences with no audio at all, and is blind to audio
that exists but is in an uncast voice, so this course would otherwise have shipped reading "ready"
in an unapproved voice.

---

## What moved

| Pod | Before | After | What it is |
|---|---|---|---|
| `pod-1` | did not exist | **231 sentences — LIVE** | The new pod. What learners hear now. |
| `pod-0` | 142 sentences, live | *gone* | Archived below. |
| `pod-0-retired-2026-08-22` | — | 142 sentences | The pod learners had until today. |

**Nothing was deleted.** The archived pod keeps all 142 sentences and both audio links per
sentence (142 + 142).

---

## Render

5-clip sample clean first, then bulk: 226 generated, 0 failed, veracity 12/12 passed.

---

## Learner progress — measured against the forecast

Zero learner progress rows and zero exposures existed on this course before the flip, so there was
nothing to carry and nothing to lose. The prospective migration log
(`docs/pods/ara-pod0-switchover-prospective-2026-08-22.json`, read directly for this record) shows
110 content survivors between the old 142-sentence canon and the new 231-sentence one, zero
ambiguous-text matches, and an empty action/exposure ledger — consistent with there being no
learners to migrate.

---

## What was verified, in order (measured before this job started)

1. **Rehearsal on a throwaway clone**, forward flip and rollback both run for real against a
   disposable copy, then dropped. Verdict: PASS on both directions.
2. **Applied**, archiving 142 → `pod-0-retired-2026-08-22`, promoting the freshly-rendered 231 →
   `pod-1`.
3. **Independent database re-read**, this job's own query, confirms: `pod-1` — 231 sentences,
   titled "Arabic Listening Pods — Pod 1"; `pod-0-retired-2026-08-22` — 142 sentences; both known
   and target audio 231/231 linked on `pod-1`.
4. **Full-audio probe, Croatian standard, no sampling**: 462 of 462 audio ids resolved, HEAD
   ok=231 missing=0 on both tracks, ffprobe ok=231 bad=0 on both tracks.
5. **On-cast check against the live reference** (`hrv_for_eng:pod-1`): both pods read 231 rows, 0
   null target, 0 null known, 0 off-cast, 2 distinct voices.
6. **End-of-clip click check** — three fresh clips probed, tail decays cleanly from about -5 dB
   through -30, -50 and -80 dB to digital silence, no isolated post-silence spike. No click. (Tom
   abolished click/tail repair on 2026-08-17 — report only, never patch.)
7. **Fleet orphan check** after the flip — zero, across every one of the 30 courses carrying pod
   progress, Arabic included.
8. **Fleet no-op check** — only the rollout courses' own flips moved; nothing untouched moved.
9. **Browser verification** (this job) — see below.

---

## What was verified live — staging then production

Arabic doesn't have a login-free learner path to click through by hand in this job's time box, so
verification was run the way the app itself runs it: the exact Supabase REST query the deployed
app's `servedPod` resolver issues (`listening_pods` filtered to `pod_type=core`, preferring `pod-1`
over `pod-0`), replayed against **`https://staging.saysomethingin.app`**'s and
**`https://saysomethingin.app`**'s own served JS bundle and its own public API key (captured live
from a real headless Chromium session against each site, via Playwright), plus the same
`GET /api/pods/ara_for_eng/pod-1` call the Popty admin page itself makes. **Every check below
passed on both.**

| Check | Staging | Production |
|---|---|---|
| Served bundle carries the pod resolver | **Yes** — `index-Bg5bpeRl.js` | **Yes** — `index-CWh28bMu.js` (same bundle hashes seen on the other pod-rollout courses today — no redeploy happened between jobs) |
| Arabic resolves to | **`pod-1`** | **`pod-1`** |
| Arabic sentence / scene count | **231 sentences, 22 scenes** | **231 sentences, 22 scenes** |
| Arabic audio linked | **231/231 target, 231/231 known** | **231/231 target, 231/231 known** |
| First Arabic clip via the live audio proxy | **200, `audio/mpeg`, 27,936 bytes** | **200, `audio/mpeg`, 27,936 bytes** (same clip, same DB) |
| Fleet no-op (`hrv`, `ita`, `fra`, `zho`, `jpn`, `spa` all read `pod-1`, unchanged by this job) | **confirmed** | **confirmed** |

**The honest caveat, stated plainly rather than glossed: this is one data move, verified through
two front ends, not two independent moves.** `dev`, `staging` and production all read the same
Supabase database, so "Arabic resolves correctly" is necessarily the same fact checked twice
through two different JS bundles, not two different facts. What staging genuinely adds is
independent confirmation that the **staging bundle itself** carries the resolver code — a real,
separate risk, since a stale staging build could have shown the right data through the wrong code
path.

---

## The Popty admin page

`/production/ara_for_eng/pods/pod-1` was not driven directly — Popty is behind an email one-time
code only Tom receives, so pixels were not checked. This is an explicit gap in coverage of the
admin UI itself, not of the data: the underlying content was independently confirmed by direct
database read and by the same API the page calls, run locally against production data
(`GET /api/pods/ara_for_eng/pod-1` → slug `pod-1`, title "Arabic Listening Pods — Pod 1", 231
sentences). The old slug, `/production/ara_for_eng/pods/pod-0-unrecorded`, now 404s as documented
— confirmed against the same API (`GET /api/pods/ara_for_eng/pod-0-unrecorded` → 404).

The known PodLab trap (resolves "current pod" by picking the largest `pod-0`-prefixed match, so it
will show the *retired* 142-line pod, not the new 231-line one) applies here exactly as it does for
the other rollout courses. The fix for it is written but unreleased — not touched or released as
part of this job.

---

## The way back

```
node tools/pods/pod-switchover.cjs --course=ara_for_eng --stamp=2026-08-22 --promote-to=pod-1 --rollback --apply
```

Rehearsed forward and back on a throwaway clone before the real course was touched; rollback put
every pod back on its original slug with its original counts and zero orphaned progress. No app
change is needed to reverse this: the resolver prefers `pod-1` and falls back to `pod-0` on its
own — if rolled back, it finds nothing on `pod-1` and serves `pod-0` without a deploy.

---

*Protocol: `docs/pods/pod-migration-protocol.md` (plate A-111, adopted 2026-08-16). Prospective
migration log: `docs/pods/ara-pod0-switchover-prospective-2026-08-22.json`.*
