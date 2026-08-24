# Brazilian Portuguese pods — the switchover, done

*2026-08-22. Every number on this page was read back out of the production database after the
move, not forecast before it.*

---

## The headline

**Brazilian Portuguese (`por_br_for_eng`) listening exercises are replaced.** Learners now get the
231-sentence, 22-scene pod that was staged and verified — 231/231 rows independently proven
playable and on-cast — in place of the 142-sentence pod they had before.

It arrives on `pod-1`, the same 1-based convention every other flipped course in this rollout
carries.

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

## The cast

Two target voices: **Julio** (`pt-BR-JulioNeural`, male, azure, unchanged from the prior cast) and
**Ara** (`ara`, female, xai). The known (English) side uses the estate's standard xAI voices.

**A latent hazard, carried forward, not fixed here.** `pod-sync.cjs`'s `langKey()` splits `por_br`
→ `por` for pool lookups, so a future pod-sync run reading the shared pool key could stomp this
cast back toward European Portuguese's pool. This is a shared-ownership file another worker owns;
noted here so it is not lost, not touched in this job.

---

## Render

The systemd render chain (`pod-render-chain-2026-08-22`) reached Brazilian Portuguese and rendered
its missing target clips: **188 generated, 0 failed, veracity 11/11 sampled clips checked and
passed, 0 quarantined.**

---

## What was verified, in order

1. **Full probe-all audio verification** (`verify-pod-audio.cjs --probe-all`): 231 rows, 462/462
   distinct audio ids resolved, HEAD ok=231/231 on both tracks, ffprobe ok=231/0 bad on both
   tracks. Committed: `docs/pods/pod-audio-verify-por_br_for_eng_pod-0-unrecorded.json`.
2. **On-cast check**: 231 rows, 231/231 target audio, 231/231 known audio, exactly **2 distinct
   target voices** (`xai_ara`/`ara` = 137 clips, `azure_pt-BR-JulioNeural` = 94 clips) — **0
   off-cast**.
3. **Prospective migration log**, committed before the real course was touched:
   `docs/pods/por_br-pod0-switchover-prospective-2026-08-22.json` — 109 content survivors, 0
   ambiguous, **17 rows carried, 9 dropped (wording changed at the same position), 11 mis-credits
   prevented**.
4. **Full rehearsal on a throwaway clone** (`rehearse-switchover.cjs --scratch=zzz_rehearsal_porbr`)
   — forward and rollback both landed, pods restored to their original slugs and counts, zero
   orphaned progress.
5. **The flip** (`pod-switchover.cjs --apply`): archived 142 → `pod-0-retired-2026-08-22`, promoted
   231 → `pod-1`, 17 learner rows carried, 9 dropped.
6. **Independent database re-read**: `pod-1` — 231 sentences, 231/231 both audio tracks, titled
   `Brazilian Portuguese Listening Pods — Pod 1`; `pod-0-retired-2026-08-22` — 142 sentences,
   142/142/142, archived intact; `learner_pod_state` for `por_br_for_eng` — **17 rows**, consistent
   with the forecast.
7. **Fleet-wide orphan check** — progress records pointing at a scene/sentence that no longer
   exists in their claimed pod, across every course carrying pod progress: **zero**.
8. **Live browser verification, staging then production** — see below.

---

## Learner progress — measured against the forecast

| | Forecast | Actual |
|---|---:|---:|
| Records carried | 17 | **17** |
| Exposures carried | 219 | **219** |
| Records dropped | 9 | **9** |
| Mis-credits prevented | 11 | **11** |

---

## What was verified live, in a real browser — staging then production

A real headless Chromium session, the deployed app's own anonymous Supabase credentials, driving
the actual course picker on **`https://staging.saysomethingin.app`** and then
**`https://saysomethingin.app`** to select "Brazilian Portuguese for English Speakers" (distinct
from "Portuguese for English Speakers", both listed under the Portuguese group) and reading the
app's own network calls to Supabase — no synthetic queries.

| Check | Staging | Production |
|---|---|---|
| Course resolves to | **`pod-1`** | **`pod-1`** |
| First sentence fetched | `por_br_for_eng:pod-1:SC01-S001`, target "Bom dia, Sarah!", target and known audio both linked | Same row, same ids |

`dev`, `staging` and production all read the same Supabase database, so this is one data move
verified through two front ends, not two independent moves.

---

## The way back

```
node tools/pods/pod-switchover.cjs --course=por_br_for_eng --stamp=2026-08-22 --promote-to=pod-1 --rollback --apply
```

No app change is needed to reverse this: the resolver prefers `pod-1`, falls back to `pod-0`, and
will find nothing on `pod-1` and serve `pod-0` on its own if rolled back.

---

## What needs Tom

**One thing, answerable cold, and it is not a blocker:** the `por_br`/`por` shared pool-key hazard
above. Not this job's file to fix (`pod-sync.cjs` is owned elsewhere), but worth a look before
anyone next runs a pool sync touching Portuguese.

---

*Protocol: `docs/pods/pod-migration-protocol.md` (plate A-111, adopted 2026-08-16). Prospective
migration log: `docs/pods/por_br-pod0-switchover-prospective-2026-08-22.json`. Audio verification:
`docs/pods/pod-audio-verify-por_br_for_eng_pod-0-unrecorded.json`.*
