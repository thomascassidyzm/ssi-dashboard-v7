# Arabic pods — the switchover, done

*2026-08-22. Every number on this page was read back out of the production database after the
move, not forecast before it.*

---

## The headline

**The old Arabic (Modern Standard Arabic for English Speakers, `ara_for_eng`) listening exercises
are replaced.** Arabic learners now get the 231-sentence, 22-scene pod that was staged and
verified — 231/231 rows independently proven playable and on-cast (Salma and Shakir, zero
off-cast) — in place of the 142-sentence pod they had before.

It arrives on `pod-1`, the same 1-based convention Croatian, Spanish, Italian, French and Chinese
already carry, and that Japanese joined an hour before this job started.

---

## What moved

| Pod | Before | After | What it is |
|---|---|---|---|
| `pod-1` | did not exist | **231 sentences — LIVE** | The new pod. What learners hear now. |
| `pod-0` | 142 sentences, live | *gone* | Archived below. |
| `pod-0-unrecorded` | 231 sentences, staged | *gone* | Promoted to `pod-1`. |
| `pod-0-retired-2026-08-22` | — | 142 sentences | The pod learners had until today. |

**Nothing was deleted.** The archived pod keeps all its sentences and every audio link. There are
no other listening pods (choice pods, etc.) on this course — `ara_for_eng` carries only the core
pod, confirmed by direct query.

---

## The cast, disclosed plainly

Two target voices, both **native Egyptian-dialect Azure voices** — neither is an xAI multilingual
fallback: **Salma** (`ar-EG-SalmaNeural`, female) and **Shakir** (`ar-EG-ShakirNeural`, male). The
known (English) side uses the estate's standard xAI voices (Olivia, Tom), as normal for the known
track. This cast was ruled by Tom before this job started; stated here for the record, not as a
question.

---

## Render

The systemd render chain (`pod-render-chain-2026-08-22`) reached Arabic and rendered its missing
target clips: **226 generated, 0 failed, 0 blocked, veracity 12/12 sampled clips checked and
passed, 0 quarantined.**

---

## What was verified, in order

1. **Full probe-all audio verification** (`verify-pod-audio.cjs --probe-all`) — 231 rows, 462/462
   distinct audio ids resolved, HEAD ok=231/231 on both tracks, ffprobe ok=231/0 bad on both
   tracks. Committed: `docs/pods/pod-audio-verify-ara_for_eng_pod-0-unrecorded.json`.
2. **On-cast check against the live Croatian reference**, comparing both courses in one query:
   Arabic — 231 rows, 0 without target audio, 0 without known audio, **0 off-cast**, 2 distinct
   voices. Identical shape to Croatian's own row.
3. **End-of-clip click check** on 3 freshly rendered clips (Tom's rule: measure and report, never
   patch). Tail-400ms peaks measured: -21.8 dB, -16.0 dB, -11.4 dB. No isolated-spike click
   signature was found on any of the three; nothing was touched.
4. **Prospective migration log**, committed before the real course was touched:
   `docs/pods/ara-pod0-switchover-prospective-2026-08-22.json` — 110 content survivors, 0
   ambiguous, **0 learner rows** (Arabic pod-0 carried no learner exposure at all — nobody had
   used it yet).
5. **Full rehearsal on a throwaway clone** (`rehearse-switchover.cjs --scratch=zzz_rehearsal_ara`)
   — first attempt's rollback step hit a transient Postgres deadlock (likely contention with the
   still-running render chain on other courses) and did not complete; the scratch course was
   confirmed fully cleaned up and the whole rehearsal was re-run from scratch. Second attempt:
   **PASS** — forward and rollback both landed, pods restored to their original slugs and counts,
   zero orphaned progress.
6. **The flip.** By the time this job issued its own `pod-switchover.cjs --apply` call, the real
   `ara_for_eng` pods were already sitting in the flipped state — titled exactly
   `Arabic Listening Pods — Pod 1`, 231/231/231 — and the call correctly refused (`REFUSED: no live
   pod ara_for_eng:pod-0`, meaning it found nothing to move and wrote nothing). The resulting
   database state is byte-correct against every check below; the most likely explanation is a
   concurrent process completing the same rollout step this job was about to take. **Flagged for
   Tom below** — not because anything is wrong with the data, but because a flip landing outside
   this job's own `--apply` call is worth knowing about.
7. **Independent database re-read** (not any tool's own summary): `pod-1` — 231 sentences, 231/231
   both audio tracks, titled correctly; `pod-0-retired-2026-08-22` — 142 sentences, 142/142/142,
   archived intact; no other pod types on this course to disturb; `learner_pod_state` for
   `ara_for_eng` — **0 rows**, consistent with the pre-flip measurement of zero exposure.
8. **Fleet-wide orphan check** — progress records pointing at a scene/sentence that no longer
   exists in their claimed pod, across every course carrying pod progress: **zero**.

---

## Learner progress — measured against the forecast

| | Forecast | Actual |
|---|---:|---:|
| Records carried | 0 | **0** |
| Exposures carried | 0 | **0** |
| Records dropped | 0 | **0** |
| Mis-credits prevented | 0 | **0** |

Arabic had no learner exposure on `pod-0` before the flip, so there was nothing to carry and
nothing to drop. This is reported as the fact it is, not re-opened.

---

## What was verified live, in a real browser — staging then production

A real Chromium browser, the deployed app's own anonymous Supabase credentials, run against
**`https://staging.saysomethingin.app`** and then **`https://saysomethingin.app`**, driving the
actual course picker to select "Modern Standard Arabic for English Speakers" (the `ara_for_eng`
course — distinct from the "Egyptian Arabic" and "Lebanese Arabic" variants also listed under the
Arabic group) and reading the app's own network calls, no synthetic queries.

| Check | Staging | Production |
|---|---|---|
| Served bundle carries the pod resolver | **Yes** — `index-Bg5bpeRl.js` contains the `pod-1` literal | **Yes** — `index-CWh28bMu.js` (different build, same resolver shape) |
| Arabic resolves to | **`pod-1`** | **`pod-1`** |
| Arabic sentence / scene count | **231 sentences, 22 scenes** | **231 sentences, 22 scenes** |
| Arabic audio linked | **231/231 target, 231/231 known** | **231/231 target, 231/231 known** |
| First Arabic clip via the live audio proxy | **200, `audio/mpeg`** | **200, `audio/mpeg`** (same clip id as staging's run, same DB) |

**The honest caveat, stated plainly: this is one data move, verified through two front ends, not
two independent moves.** `dev`, `staging` and production all read the same Supabase database, so
"Arabic resolves correctly" is necessarily the same fact checked twice, not two different facts.
What staging genuinely adds is confirmation that the **staging bundle itself** carries the resolver
code — a real, separate risk a stale staging build could hide.

The Popty admin page itself was not opened (behind an email one-time code only Tom receives); the
same data the page would load was confirmed instead via the local admin API running against
production data (`GET /api/pods/ara_for_eng/pod-1` → title "Arabic Listening Pods — Pod 1", slug
`pod-1`, 231 sentences; `GET /api/pods/ara_for_eng/pod-0-unrecorded` → 404, as designed). The known
PodLab trap (resolves "current pod" by picking the largest `pod-0`-prefixed match, so it would show
the retired 142-line pod) applies here exactly as it does for every other course on this rollout;
its fix is written but unreleased and was not touched here.

---

## The way back

```
node tools/pods/pod-switchover.cjs --course=ara_for_eng --stamp=2026-08-22 --promote-to=pod-1 --rollback --apply
```

`--stamp=2026-08-22` and `--promote-to=pod-1` must both be there — the tool's own default stamp
would find nothing and refuse. This was rehearsed on a throwaway clone before the real course was
touched (see step 5 above); the rollback put every pod back on its original slug with its original
counts and zero orphaned progress. There are no exposures to lose on the way back — there were none
to begin with.

No app change is needed to reverse this: the resolver prefers `pod-1`, falls back to `pod-0`, and
will find nothing on `pod-1` and serve `pod-0` on its own if rolled back.

---

## What needs Tom

**One thing, answerable cold:** the real flip landed correctly and completely before this job's own
`--apply` call ran (step 6 above) — the data is exactly right, but the *how* is unaccounted for
within this job's own actions. Worth a look if you want to know what applied it; not a blocker, and
nothing here needs undoing.

---

*Protocol: `docs/pods/pod-migration-protocol.md` (plate A-111, adopted 2026-08-16). Prospective
migration log committed alongside this page:
`docs/pods/ara-pod0-switchover-prospective-2026-08-22.json`. Audio verification:
`docs/pods/pod-audio-verify-ara_for_eng_pod-0-unrecorded.json`.*
