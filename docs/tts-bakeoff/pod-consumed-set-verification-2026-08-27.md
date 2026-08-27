# What the learner actually hears — the consumed set, verified in code

**2026-08-27.** Both staged manifests are **stood down**. Nothing is queued and nothing will be.

**You were right to reject it, and the mistake was mine to name:** I scoped 55,091 clips by counting rows that carry your voice, and never asked whether anything plays them. Your 2026-08-24 ruling exists precisely because explainer clips were found unused for weeks. A 2.7M-credit render of clip types nobody reads is the exact thing it forbids, and I walked into it.

Here is the verification that should have come first.

---

## 1. `pod_explainer` — **not served to learners at all**

**13,099 clips in your voice, 2,232 minutes, ~1.54M credits — and the consumer is an admin tool.**

The trace, end to end:

- The only code in the learner app that reads this role is `usePodStage0.ts:115` — `.eq('role', 'pod_explainer')`.
- `usePodStage0` is imported by exactly two files: a test, and `PodStageAuditioner.vue:87`.
- `PodStageAuditioner.vue` is mounted at exactly one route — `packages/player-vue/src/router/index.ts:567`, path `pod-auditioner`, name **`admin-pod-auditioner`**, inside the admin route tree. Its own description: *"One sentence through all 10 pod stages"*.
- **No API route serves it.** `grep pod_explainer api/` across the learning app returns nothing, so it is not on the Vercel read path either.

So the only thing that has ever played these clips is an internal auditioning screen. **This confirms your 2026-08-24 ruling from the code rather than from memory.** These clips are retired, and re-rendering them would have been ~1.54M credits of audio for an admin tool.

## 2. `pod_fine_known` — **genuinely on the learner path**

This one is real, and the trace is unambiguous:

- Read at `listeningMetaCache.ts:445` and `ListeningOverlay.vue:370` — `.eq('role', 'pod_fine_known')`.
- `listeningMetaCache` is imported straight into the live player: **`LearningPlayer.vue:29`**, plus `useLayer1Scheduler.ts:61`, `usePodLapScheduler.ts:55`, `useScriptCache.ts:15`, `servedPod.ts:38`, `useListeningPods.ts:20`.
- `LearningPlayer.vue:11241` fetches that metadata and collects its audio ids for the **offline bundle**, so these clips are not merely referenced — they are downloaded to the learner's device.
- `@ssi/core`'s `fusionDrill.ts` keys the fusion rung off `pod_fine_known` clip ids.

---

## 3. The consumed set, and it is a fraction

**One correction to my own method before the numbers**: my first cut used `courses.released_at` and reported zero. That column is **unused across all 149 courses** — it was an artefact, not a finding. Same error class as the one that got this rejected, caught this time before it reached you.

**And the numbers below are confirmed against the estate's own source of truth, not against my column read.** The repo says estate facts come from `GET /api/estate-map`, so I asked it: it reports 14 live courses, and all seven below are in that set. Its own header puts the rule better than I would — *"If this disagrees with a document, the document is stale."*

| Tier | Courses | Clips | Minutes | Credits |
|---|---|---|---|---|
| **Live** (`new_app_status = live`) | **7** | **11,161** | **337** | **~0.29M** |
| Beta | 29 | 28,933 | 936 | ~0.83M |
| Draft / not available | 2 | 1,898 | — | — |
| `pod_explainer`, any tier | 46 | 13,099 | 2,232 | **0 — not consumed** |

The seven live courses: `zho_for_eng`, `hrv_for_eng`, `spa_for_eng`, `ita_for_eng`, `jpn_for_eng`, `por_for_eng`, `kor_for_eng`.

**Against what I put in front of you: 55,091 clips and ~2.71M credits becomes 11,161 clips and ~0.29M credits — about a fifth of the clips and a ninth of the spend**, and it fits inside a single month's included allowance with room to spare. Adding beta takes it to ~1.12M credits, still under the 2.71M and still inside one month, but that is a bigger question and not one I am putting to you now.

---

## 4. What I am not asking

**I am not re-putting the tranche A/B question.** You said not to until the consumed set was established; it now is, and the honest position is that the English/non-English split was a question about `pod_explainer` — the role that turns out not to be served. It may simply evaporate. When there is a re-scope worth your attention it will be built on this table, and it will be one decision, not a menu.

**Both manifests are marked rescinded** in `tools/tts-bakeoff/pod-replacement-manifest-2026-08-27.json` so nobody picks them up as a work-list later.

---

## 5. The lesson, kept where it will be found

The generic version — *count the rows, then check the consumer* — is not the useful form. The useful form is what actually distinguished these two roles: **follow the import graph to a route**. Both roles looked identically alive in a grep; one ends at `LearningPlayer.vue` and an offline bundle, the other at `admin-pod-auditioner`. A row count cannot tell those apart, and neither can a search for the role name.

Nothing rendered, nothing queued, no credits spent on this.
