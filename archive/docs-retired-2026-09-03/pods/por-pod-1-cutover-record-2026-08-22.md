# Portuguese pods — the switchover, done

*2026-08-22. Every number on this page was read back out of the production database after the
move, not forecast before it.*

---

## The headline

**Portuguese (`por_for_eng`) listening exercises are replaced.** Learners now get the 231-sentence,
22-scene pod that was staged and verified — 231/231 rows independently proven playable and
on-cast — in place of the 142-sentence pod they had before.

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

## The cast, disclosed plainly

Two target voices: **Rex** (`rex`, male) and **Eve** (`eve`, female) — the same pair Egyptian
Arabic carries, both xAI multilingual fallback voices rather than native Portuguese voices. This
was visible to Tom when he ruled the cast; stated here for the record, not as a question.

---

## The veracity gate fix that unblocked this course

Three number-drill lines (scene 12/13/15) were quarantined at first render — every non-numeric
word decoded exactly right, but the whisper decode read the numerals as digits ("19", "20") while
the checker's numeral-fallback logic, past its cartesian-product cap, only ever offered three fixed
reading positions and never the target-language reading itself. Fixed in
`5668ddb7c256b78805267f1123531bd40478289c` (merged to `main`, verified 179/179 green including 6
new tests, 5,341 remembered decodes re-judged with 0 flips), deployed by restarting
`popty-production-api` and `popty-phase8-audio` from the prod checkout (confirmed via `/health` →
commit `5668ddb7`). All three lines re-rendered through the fixed gate and independently re-decoded
by this job outside the render pipeline: **CER 0 on all three**, e.g. "Dezanove. Vinte. Vinte e
um..." decodes and reads back as itself, not as English numerals.

---

## What was verified, in order

1. **Full probe-all audio verification** (`verify-pod-audio.cjs --probe-all`), run after the
   re-render: 231 rows, 462/462 distinct audio ids resolved, HEAD ok=231/231 on both tracks,
   ffprobe ok=231/0 bad on both tracks. Committed:
   `docs/pods/pod-audio-verify-por_for_eng_pod-0-unrecorded.json`.
2. **On-cast check**: 231 rows, 231/231 target audio, 231/231 known audio, exactly **2 distinct
   target voices** (`xai_eve`/`eve` = 139 clips, `xai_rex`/`rex` = 92 clips) — **0 off-cast**.
3. **Prospective migration log**, committed before the real course was touched:
   `docs/pods/por-pod0-switchover-prospective-2026-08-22.json` — 113 content survivors, 0
   ambiguous, **89 rows carried, 37 dropped (wording changed at the same position), 39 mis-credits
   prevented**.
4. **Full rehearsal on a throwaway clone** (`rehearse-switchover.cjs --scratch=zzz_rehearsal_por`)
   — forward and rollback both landed, pods restored to their original slugs and counts, zero
   orphaned progress.
5. **The switchover readiness gate**, exercised for real: `pod-switchover.cjs` refuses to promote
   any pod with rows lacking target audio. Before the re-render this course would have been
   refused; after it, readiness read 0 untranslated / 0 draft / 0 without target audio / 0 without
   known audio and the flip proceeded cleanly.
6. **The flip** (`pod-switchover.cjs --apply`): archived 142 → `pod-0-retired-2026-08-22`, promoted
   231 → `pod-1`, 89 learner rows carried, 37 dropped.
7. **Independent database re-read**: `pod-1` — 231 sentences, 231/231 both audio tracks, titled
   `Portuguese Listening Pods — Pod 1`; `pod-0-retired-2026-08-22` — 142 sentences, 142/142/142,
   archived intact; `learner_pod_state` for `por_for_eng` — **89 rows**, consistent with the
   forecast.
8. **Fleet-wide orphan check** — progress records pointing at a scene/sentence that no longer
   exists in their claimed pod, across every course carrying pod progress: **zero**.
9. **Live browser verification, staging then production** — see below.

---

## Learner progress — measured against the forecast

| | Forecast | Actual |
|---|---:|---:|
| Records carried | 89 | **89** |
| Exposures carried | 155 | **155** |
| Records dropped | 37 | **37** |
| Mis-credits prevented | 39 | **39** |

---

## What was verified live, in a real browser — staging then production

A real headless Chromium session, the deployed app's own anonymous Supabase credentials, driving
the actual course picker on **`https://staging.saysomethingin.app`** and then
**`https://saysomethingin.app`** to select "Portuguese for English Speakers" (distinct from
"Brazilian Portuguese for English Speakers", both listed under the Portuguese group) and reading
the app's own network calls to Supabase — no synthetic queries.

| Check | Staging | Production |
|---|---|---|
| Course resolves to | **`pod-1`** | **`pod-1`** |
| First sentence fetched | `por_for_eng:pod-1:SC01-S001`, target "Bom dia, Sarah!", target and known audio both linked | Same row, same ids |

`dev`, `staging` and production all read the same Supabase database, so this is one data move
verified through two front ends, not two independent moves.

---

## The way back

```
node tools/pods/pod-switchover.cjs --course=por_for_eng --stamp=2026-08-22 --promote-to=pod-1 --rollback --apply
```

No app change is needed to reverse this: the resolver prefers `pod-1`, falls back to `pod-0`, and
will find nothing on `pod-1` and serve `pod-0` on its own if rolled back. Rolling back does not
touch the veracity gate fix — that stays merged regardless of this course's pod state.

---

## What needs Tom

Nothing. The cast disclosure above restates a fact Tom already had in front of him; the veracity
fix follows his own ruling ("Resolve the checker") from the equivalent French case.

---

*Protocol: `docs/pods/pod-migration-protocol.md` (plate A-111, adopted 2026-08-16). Prospective
migration log: `docs/pods/por-pod0-switchover-prospective-2026-08-22.json`. Audio verification:
`docs/pods/pod-audio-verify-por_for_eng_pod-0-unrecorded.json`. Veracity fix:
`5668ddb7c256b78805267f1123531bd40478289c` on `main`.*
