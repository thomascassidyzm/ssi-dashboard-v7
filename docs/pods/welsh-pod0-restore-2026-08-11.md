# Welsh pod-0 restored on the new canon — 2026-08-11

**The outage is over.** `cym_n_for_eng:pod-0` and `cym_s_for_eng:pod-0` — both **released**
courses — served an empty Pods tab for five days. Both now hold **232 sentence rows across
22 scenes**, the new-canon content, read successfully through the learner app's own query
with the learner's own anon key.

No audio was generated. No audio was touched. No voice casting was touched. No content was
deleted.

---

## What was wrong

On 2026-08-06 someone gated the unfinished Welsh pods by hand — a raw
`update listening_pod_sentences set pod_id = '<course>:pod-0-unrecorded'` — instead of the
safe clone-then-swap. Two consequences:

1. **The live pod went to zero rows.** The app reads the literal id `<course>:pod-0` with no
   fallback (`useListeningPods.ts:161`, `usePodLapScheduler.ts:505`), so a pod on any other
   slug is invisible. Learners got nothing.
2. **464 rows kept the live pod's id prefix.** A row id is `<course>:<slug>:<tail>` — the slug
   is baked into the primary key. A `pod_id` update does not touch it, so every row sitting on
   `pod-0-unrecorded` was still keyed `<course>:pod-0:SCnn-Snnn`. Id-keyed writers read the id,
   not `pod_id`, decide the row belongs to the live pod, and drag it back. That is not
   theoretical: it happened on 2026-08-10, 19 rows.

**The root cause is a missing tool.** `clone-pod.cjs` takes a live pod off to a working slug.
Nothing ever put one back. The gap got filled by hand, and the hand-rolled version is the outage.

## What was done

### 1. `tools/pods/reslug-pod-rows.cjs` — defuse the landmine

Rewrites only the slug segment of a row's primary key so it agrees with the pod it actually
lives on. Nothing else moves: not `pod_id`, not text, not audio pointers, not scene/sentence
numbering (which is what the align tools match on). Dry run by default; refuses on any id
collision anywhere in the table; asserts count and prefix inside the transaction before commit.

Applied: **cym_n 232/232, cym_s 232/232 — 464 rows re-slugged.**

### 2. `tools/pods/promote-pod.cjs` — the missing other half of clone-pod

One transaction: verify the source is fit to go live → rename the current live pod out to an
archive slug, rows and all → rename the source onto `pod-0`, rows and all.

Make-before-break. Nothing is deleted but the two now-childless pod *header* rows the renames
leave behind, and only after asserting they are childless. Rollback is the same command with
`--from` and `--to` swapped — the archived pod's own `metadata.rollback_by` spells out the
exact line.

Every fitness gate has a named escape hatch, so a knowing exception appears on the command
line and in the log, never silently. All three were used here:

| Override | Why |
|---|---|
| `--allow-missing-audio` | cym_n has 87/232 clips, cym_s has 0/232. Recording is Aran and Catrin's separate track — explicitly out of scope for this swap. |
| `--allow-empty-target=1` | The blank `SC15-S012` row — see the flag below. |
| `--allow-drafts` | cym_s only: 104 rows are `target_text_draft=true`. |

### 3. The swap

| pod | before | after |
|---|---|---|
| `cym_n_for_eng:pod-0` | 0 rows | **232 rows, 22 scenes, 231 Welsh, 87 clips** |
| `cym_s_for_eng:pod-0` | 0 rows | **232 rows, 22 scenes, 231 Welsh, 0 clips** |
| `cym_*_for_eng:pod-0-gated-2026-08-06` | — | archived old header, 0 rows |
| `cym_*_for_eng:pod-0-unrecorded` | 232 rows each | gone — renamed onto `pod-0` |

**The archive pods are empty, and that is honest, not a failure.** The old ~142-line content
was never a separate set of rows: the 2026-08-06 align edited those very rows *in place* and
the hand-rolled move then repointed them. There was no old row set left in the database to
preserve. The genuine ~142-line rollback is on disk and always was:
`docs/pods/pod0-welsh-prealign-archive-2026-08-06/cym_{n,s}_for_eng-pod0-sentences-prealign.json`,
full per-row before-state including audio ids.

## Verification

Read back through the learner app's **exact** query — same column list, same `.eq('pod_id',
'<course>:pod-0')`, same `global_order` sort — using the **anon key**, so RLS was exercised as
a real learner's browser exercises it, not bypassed with the service key:

```
cym_n_for_eng:pod-0: 232 rows, 22 scenes, 231 with Welsh text, 87 with target clip
  [SC1] Neighbour (8 am): Bore da, Sarah!
  [SC1] Sarah: Bore da. Sut wyt ti?
  [SC1] Neighbour: Dw i'n dda iawn, diolch. Wyt ti'n mynd i'r gwaith?

cym_s_for_eng:pod-0: 232 rows, 22 scenes, 231 with Welsh text, 0 with target clip
  [SC1] Neighbour (8 am): Bore da, Sarah!
  [SC1] Sarah: Bore da. Sut wyt ti?
  [SC1] Neighbour: Dw i'n dda iawn, diolch. Ti'n mynd i'r gwaith?
```

North and South diverge exactly where they should (`Wyt ti'n mynd` / `Ti'n mynd`) — the two
dialects are genuinely different content, not a copy.

No deploy is required: the player reads Supabase directly at runtime.

### Live in the real app, in a real browser (worker #316)

Not a DB assertion dressed up as a verification — the actual `player-vue` app, running in
headless Chromium, driven through the actual learner path: course picker → Welsh → Northern
/ Southern → mode tray → Listening mode.

- **cym_n_for_eng** — Dialogues tab renders **22 scenes** ("Scene 1 · 8 am · 4 sentences" …
  through Scene 22), not empty. Scene 1 opens on real Welsh over its English gloss
  ("Bore da, Sarah!" / "Good morning, Sarah!"). Pressing play issues real
  `/api/audio/<uuid>` requests for the pod's own `target_audio_id`s, all `200` — the 87
  existing clips genuinely sound.
- **Rows with no clip do not break the scene.** They render as text and the teleprompter keeps
  flowing — no stall, no error. This is the answer that mattered for the South.
- **cym_s_for_eng** — same 22 scenes, same side-by-side Welsh/English, reads through fine as
  text-only content. No pod audio plays, which is correct: 0/232 clips, recording is a separate
  track. (#316 flagged honestly that ~229 `/api/audio` hits fired during that test and then
  cross-checked the UUIDs: they are the main learning-script loader's background prefetch in
  the same tab, not pod audio.)
- **Confirmed on the deployed dev alias too** (`ssi-learning-app-git-dev-zenjin.vercel.app`) —
  22 scenes, same behaviour. Dev/staging/prod share one Supabase and this fix is data-only, so
  it is already live everywhere the code is deployed.

Screenshots: [`welsh-pod0-verify-2026-08-11/`](./welsh-pod0-verify-2026-08-11/) —
`12-cymn-scene1.png` (North, scene 1 playing), `15-cyms-dialogues.png` (South, 22 scenes),
`17-DEPLOYED-dev-cymn.png` (deployed build).

---

## Two things for Tom

> **Both resolved, 2026-08-11.** The 104 unproofread lines are now tracked *alongside* `deu_at`'s
> 155 as the draft-debt ledger in
> [`docs/pods/scope-scout-2026-08-11/PLAN-all-pods-pod0.md`](../pods/scope-scout-2026-08-11/PLAN-all-pods-pod0.md)
> §"Read this first" #2 — both clear together on the proofreading-policy ruling with Kai. The blank
> `SC15-S012` card was cut on all four pods:
> [`pod0-blank-sc15-s012-deletion-2026-08-11.md`](./pod0-blank-sc15-s012-deletion-2026-08-11.md).

**1. Southern Welsh goes live with 104 unproofread lines.** `cym_s_for_eng` has 104 of 232 rows
flagged `target_text_draft=true` — machine-written Welsh nobody has read. Northern has zero
(Aran proofread it). I promoted anyway: 104 unproofread lines beat 0 lines on a released
course, and the flag is precisely what routes them to the `/drafts` proofreading queue. But
that is a judgment you may want to reverse. Reversing is one command, and the archived pod's
metadata carries it.

**2. A blank card at the end of scene 15, on every new-canon pod.** `SC15-S012` is empty in
*both* languages and parked at `global_order` 90142 — a sentinel someone used to shove it out
of the way. Canonical stops at S011, so this row corresponds to nothing. It is not Welsh and
not mine: it is on all four new-canon pods — `cym_n`, `cym_s`, `deu_at`, and
`spa_for_eng:pod-0-unrecorded` — an artefact the align tool left behind. Clean cut-it-out
material, provably lossless. I did not cut it, because it reaches across two other courses
that other work is live on and my brief was a text/row-slug swap. Say the word and it goes in
one pass.
