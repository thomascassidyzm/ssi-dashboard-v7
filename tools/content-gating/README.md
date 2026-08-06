# Content gating — holding unrecorded content off live

## Welsh listening pods (gated 2026-08-06)

Tom, 2026-08-06: *"Welsh pods should not be live yet — Aran and Catrin have yet
to record them."*

Both Welsh courses were `new_app_status = live` with essentially unrecorded
Dialogues pods:

| Course | Pod sentences | With a target take | Scenes fully silent |
|---|---|---|---|
| `cym_n_for_eng` | 232 | 26 (11%) | 12 of 22 |
| `cym_s_for_eng` | 232 | 0 | 22 of 22 |

Real learners were reaching this — Dialogues is the listening overlay's default
tab, and a learner played a silent Welsh clip twice within one second on
2026-08-05.

### The mechanism

No new flag was invented. Every learner-facing pod path queries the **exact** id
`<course>:pod-0`:

- `useListeningPods.ts` — the Dialogues scene list
- `listeningMetaCache.ts` — the offline download
- `usePodLapScheduler.ts` — the in-session pod lap
- `generateLearningScript.ts` — Phase 7 pod injection (`hasPods = rows > 0`)

So a pod parked on any **other** slug is invisible to learners. That is already
how `spa_for_eng:music` and `spa_for_eng:travel-situations` sit unrecorded and
unreachable. The Welsh sentences were re-parented onto `pod-0-unrecorded`, and
the original `pod-0` row was left in place, childless, as the placeholder that
keeps reading as "no pods yet".

**Nothing was deleted.** All 464 sentences, their text and their takes are
intact under `<course>:pod-0-unrecorded`.

Because dev, staging and production share one Supabase, this took effect for
every learner immediately, with no deploy.

### What it deliberately does NOT block

Aran and Catrin's recording flow is untouched. `pods-router.cjs` resolves pods
dynamically per course and derives each item's `podId` from the sentence row, so
the `pods-registration.cjs:164` membership gate still passes. Verified: all 232
sentences per course remain in the recording plan and will register.

`PodStageAuditioner` also still works — it matches on sentence `id`, which was
not changed.

### Re-enabling, once the recordings land

```bash
cd ssi-dashboard-v7-clean
RESTORE=1 DRY_RUN=0 node tools/content-gating/gate-welsh-pods.mjs
node tools/content-gating/verify-gate.mjs   # expects rows > 0 for the Welsh courses
```

That moves the sentences back to `<course>:pod-0` and restores the placeholder's
original title. Do it **per course** — north and south will finish at different
times; edit `COURSES` in the script to gate/ungate one at a time.

Deployed clients pick the change up on their next pod read, and a stale offline
snapshot is dropped automatically by `clearCachedListeningPodRows`
(`player-vue/src/composables/listeningMetaCache.ts`) whenever a live read reports
zero pods.

### Scripts

| Script | Purpose |
|---|---|
| `gate-welsh-pods.mjs` | Applies/reverses the gate. `DRY_RUN=1` by default; `RESTORE=1` to reverse. |
| `verify-gate.mjs` | Replays the learner queries as the **anon** role, plus control courses. |
| `verify-recording-path.mjs` | Proves the recording plan and upload registration still work. |
| `welsh-pod-gate-applied-log.json` | Every sentence id moved, for provenance. |
