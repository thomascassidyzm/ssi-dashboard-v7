# The fading drill sweep — addendum: two more instances, both dead ends

*Addendum to `docs/pods/stage0-replacement-fading-drill-proposal-2026-08-24.md`
(committed as `131eeb0b1`, already on `main`). That doc's finding stands
unchanged: the live fade is `algorithm_config` row `key='pods'`, off by one
flag. This note reports the rest of the wider sweep it flagged as pending
(its own "worker #395"). Read-only. Nothing built, nothing changed.*

---

## What's new here

Two more encodings of the same target·known·target·target → bare-target·2×
shape exist in the codebase, both **admin-tool preview code, never wired to
any learner path, never written to `algorithm_config`**. They are Tom's own
design iteration in the day after Aran's live row landed — earlier drafts of
the same idea, superseded by what's live today.

### 1. `PROPOSED_STAGE_PLAYLIST` — `src/views/admin/PodLab.vue:56-65`

Authored by **thomascassidyzm, 2026-07-01** (commit `ee759557b`), one day
after Aran's live `pods` row (2026-06-30). Comment: *"The ladder specified
with Tom on 2026-07-01."*

```js
const PROPOSED_STAGE_PLAYLIST = {
  1: ['ps', 'trans', 'ps', 'ps'],       // t · k · t · t
  2: ['ps', 'trans', 'ps', 'ps2x'],     // t · k · t · t@2×
  3: ['ps', 'trans', 'ps2x', 'ps2x'],   // t · k · t@2× · t@2×
  4: ['ps', 'trans', 'ps2x'],           // t · k · t@2×
  5: ['ps2x', 'trans', 'ps2x'],         // t@2× · k · t@2×
  6: ['ps', 'ps2x'],                    // t · t@2×
  7: ['ps2x', 'ps2x'],                  // t@2× · t@2×
  8: ['ps2x'],                          // t@2×  (eternal)
}
```

Differs from the live row in one telling way: **the known clip (`trans`)
survives through stage 5** here (`t@2× · k · t@2×`), where the live row drops
it at stage 6. Reached only by clicking the "Proposed (07-01)" preset button
on `/admin/configs/pods` (`PodLab.vue:298`); it clones into the in-session
`labStagePlaylist` ref and is exported to clipboard for a human to apply —
per the file's own safety comment, this Lab **never writes `algorithm_config`
itself**. Live-routed page, dead code path for a learner.

### 2. "The Ladder" — `ladderRungs` computed, `PodLab.vue:612` (~300 lines)

Authored by **thomascassidyzm, 2026-07-03** (commit `97e8e09a5`), two days
after the `PROPOSED_STAGE_PLAYLIST` draft above — Tom's own reshape of it,
per the commit message: *"the stage number IS the fusion level until the
chunk is the whole turn, then it becomes the speed ramp… every rung, every
chunk size, plays the same t·k·t·t at 1× … then the locked speed cascade …
tops out at pure t@2×."* This supersedes the discrete 8-stage draft above
with a continuous fusion-then-speed climb: finest units → sentence → whole
turn, all at t·k·t·t/1×, then the same engine-stage-2-through-8 speed cascade
on top. `PodLab.vue`'s own docstring calls this "THE LADDER," sibling to
"STAGE ARC" (today's live `composeSentenceArc` engine output), for
comparison on the same screen.

Confirmed **not** live: `ladderRungs` has no reference anywhere outside
`PodLab.vue` (`grep -rl` across the repo, excluding worktrees, returns only
this one file), unlike `composeSentenceArc`, which the same file imports
"straight from `@ssi/core/pods` — the exact function the learner's main flow
runs." `/admin/configs/pods` is an authenticated admin route; this is a
visualisation for tuning by ear, not a second scheduler.

---

## Everything else checked, nothing else found

- `services/learning-script-generator.cjs`'s `phraseRepeatCount` /
  `repeatedCycleTypes` (live in `fast_mode`/`easy_mode` rows) is a different
  mechanism: it repeats a whole BUILD/USE **phrase** N times back-to-back
  within the text-practice script generator, not an audio-role interleave
  with a speed ramp. Not a match, noted so it isn't mistaken for one later.
- `stage0Sequence.ts`/`podStageComposition.ts` vendored into
  `scripts/wt-a135` (a stale worktree) carry a 2026-07-14 retirement notice:
  the per-atom breakdown they compose no longer plays in the main pod flow at
  all (replaced by an always-visible LEGO-tile display); the only surviving
  caller is the admin-only Pod Stage Auditioner. Different concept (atom-level
  first-encounter breakdown, not the repetition/speed fade), and already dead
  before this sweep started.
- `public/layer1-explorer.html`'s `LAYER1_PLAYLIST` local variable is a
  fallback default only, "overwritten by DB load (`algorithm_config`
  key=`listening`)" per its own comment — not an independent implementation.
- `algorithm_config` rows `stage0`, `script_shape`, `normal_mode`,
  `adaptation_v2`, `voice_declarations` — queried fresh, direct from
  Supabase, today: no `stagePlaylist`/`ps2x`/fade-shaped keys beyond what's
  already reported live (`stage0`'s `targetRepeats` is the atom-breakdown
  concept above, unrelated to the speed fade).
- No per-course or per-pod override column anywhere (`courses`,
  `listening_pods.metadata`) — confirmed again, matches the prior doc.
- `git log --all -S` for `ps2x`, `stagePlaylist`, `PROPOSED_STAGE_PLAYLIST`,
  `targetRepeats` across every branch in this repo: no hits beyond the pod-lab
  and listening-admin build history already accounted for above and in the
  main doc.

## Bottom line

Three authored versions of the same idea exist in this codebase, in this
order: Aran's live 8-stage `algorithm_config` row (2026-06-30, **the one
running**), Tom's discrete `PROPOSED_STAGE_PLAYLIST` draft (2026-07-01, admin
preview only), and Tom's continuous ladder reshape (2026-07-03, admin preview
only, supersedes the previous draft in code but never landed in config). All
three agree on the shape Tom described. Nothing to build — the open question
is still the one the main doc already put to Tom: flip
`listeningUseStagePlaylist` on the live `listening` row, or not.
