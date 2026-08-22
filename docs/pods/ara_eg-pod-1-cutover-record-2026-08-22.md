# Egyptian Arabic pods — the switchover, done

*2026-08-22. Every number on this page was read back out of the production database after the
move, not forecast before it. This record was written after the flip — the flip itself landed
earlier in today's bulk render chain and switchover run, ahead of this job — but every check below
was re-run independently by this job, not copied from an earlier report.*

---

## The headline

**Egyptian Arabic (`ara_eg_for_eng`) listening exercises are replaced.** Learners now get the
231-sentence, 22-scene pod that was staged and verified — 231/231 rows independently proven
playable and on-cast — in place of the 142-sentence pod they had before.

It arrives on `pod-1`, the same 1-based convention Croatian, Spanish, Italian, French, Chinese,
Japanese, Arabic (MSA), Mexican Spanish, Korean and Brazilian Portuguese already carry.

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

## The cast, disclosed plainly

Two target voices: **Rex** (`rex`, male) and **Eve** (`eve`, female) — in the previous worker's own
words to Tom, **"both are xAI multilingual fallback voices, not native Egyptian Arabic."** That was
visible to Tom when he ruled them on 2026-08-17, so it is stated here as a disclosure, not a
question. The known (English) side uses the estate's standard xAI voices, as normal for the known
track.

---

## Render

The systemd render chain (`pod-render-chain-2026-08-22`) reached Egyptian Arabic and rendered its
missing target clips: **141 generated, 0 failed, 0 blocked, veracity 15/15 sampled clips checked
and passed, 1 rerendered on retry, 0 quarantined.**

---

## What was verified, in order — all re-run independently by this job

1. **Full probe-all audio verification** (`verify-pod-audio.cjs --probe-all`) against the live
   `pod-1`: 231 rows, HEAD ok=231/231 on both tracks, ffprobe ok=231/0 bad on both tracks.
2. **On-cast check**: 231 rows, 231/231 target audio, 231/231 known audio, exactly **2 distinct
   target voices** (`xai_eve`/`eve` = 141 clips, `xai_rex`/`rex` = 90 clips — the bare/`xai_`-prefixed
   forms are the same voice, so this is 2 voices, not 4) — **0 off-cast**.
3. **Prospective migration log** (already committed pre-flip):
   `docs/pods/ara_eg-pod0-switchover-prospective-2026-08-22.json` — 118 content survivors, 0
   ambiguous, **1 learner row carrying 1 exposure, 0 dropped, 0 mis-credits prevented** (there was
   nothing to prevent — the one row's content and position both matched cleanly).
4. **Independent database re-read**, done by this job, not any tool's own summary: `pod-1` — 231
   sentences, 231/231 both audio tracks, titled `Egyptian Arabic Listening Pods — Pod 1`;
   `pod-0-retired-2026-08-22` — 142 sentences, 142/142/142, archived intact; `learner_pod_state`
   for `ara_eg_for_eng` — **1 row**, consistent with the prospective forecast.
5. **Fleet-wide orphan check** — progress records pointing at a scene/sentence that no longer
   exists in their claimed pod, across every course carrying pod progress, re-run after this job's
   own Korean/Brazilian-Portuguese/Portuguese flips: **zero**.
6. **Live browser verification, staging then production** — see below.

---

## Learner progress — measured against the forecast

| | Forecast | Actual |
|---|---:|---:|
| Records carried | 1 | **1** |
| Exposures carried | 1 | **1** |
| Records dropped | 0 | **0** |
| Mis-credits prevented | 0 | **0** |

---

## What was verified live, in a real browser — staging then production

A real headless Chromium session, the deployed app's own anonymous Supabase credentials, driving
the actual course picker on **`https://staging.saysomethingin.app`** and then
**`https://saysomethingin.app`** to select "Egyptian Arabic for English Speakers" and reading the
app's own network calls to Supabase — no synthetic queries.

| Check | Staging | Production |
|---|---|---|
| Course resolves to | **`pod-1`** (`listening_pods` slug lookup) | **`pod-1`** |
| First sentence fetched | `ara_eg_for_eng:pod-1:SC01-S001`, target "صباح الخير، سارة!", target and known audio both linked | Same row, same ids |

**The honest caveat, stated plainly: this is one data move, verified through two front ends, not
two independent moves.** `dev`, `staging` and production all read the same Supabase database, so
"Egyptian Arabic resolves correctly" is necessarily the same fact checked twice. What staging
genuinely adds is confirmation that the staging bundle's resolver logic (`servedPod.ts`, merged to
`main` 2026-08-22 as part of the pods-are-1-based ruling) is exercised correctly against real data,
not just present in source.

The Popty admin page itself was not opened (behind an email one-time code only Tom receives); the
database reads above are the equivalent check against the same data the page would show.

---

## The way back

```
node tools/pods/pod-switchover.cjs --course=ara_eg_for_eng --stamp=2026-08-22 --promote-to=pod-1 --rollback --apply
```

No app change is needed to reverse this: the resolver prefers `pod-1`, falls back to `pod-0`, and
will find nothing on `pod-1` and serve `pod-0` on its own if rolled back.

---

## What needs Tom

Nothing new. The cast disclosure above (Rex/Eve as multilingual fallback voices) restates a fact
Tom already had in front of him when he ruled the cast on 2026-08-17 — it is carried into this
record for completeness, not reopened as a question.

---

*Protocol: `docs/pods/pod-migration-protocol.md` (plate A-111, adopted 2026-08-16). Prospective
migration log: `docs/pods/ara_eg-pod0-switchover-prospective-2026-08-22.json`.*
