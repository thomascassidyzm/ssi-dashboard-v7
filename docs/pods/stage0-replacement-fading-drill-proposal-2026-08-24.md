# The fading drill already exists — it is switched off by one flag

*Investigation, 2026-08-24. Nothing built, nothing changed. No DB write, no config edit, no code.*

> **Correction to my earlier draft.** I proposed a seven-step fade schedule of my own. That was
> wrong of me: Tom said "I think we do this anyway", and he is right. The schedule exists, it is
> authored, it is in the live database, and it matches what he described almost slot for slot. This
> version reports the found thing and deletes the invented one.

---

## 1. Where it lives

**`algorithm_config`, row `key='pods'`, field `config.stagePlaylist`.** Written by
**aran@hey.com on 2026-06-30**, version 1, description "Layer 2 pod scheduler". Verbatim from the
live row today:

```json
"stagePlaylist": {
  "1": ["ps","trans","ps","ps"],
  "2": ["ps","trans","ps","ps"],
  "3": ["ps","trans","ps","ps2x"],
  "4": ["ps","trans","ps2x","ps2x"],
  "5": ["ps","trans","ps2x"],
  "6": ["ps","ps2x"],
  "7": ["ps2x","ps2x"],
  "8": ["ps2x"]
},
"stageDurations": { "1": 2, "2": 3 },
"stageDuration": 5,
"podActivationRound": 6,
"gapSuperTightMs": 0, "gapTightMs": 0, "gapGluedMs": 0, "gapBetweenMs": 0
```

`ps` = the pod sentence's target clip at 1.0×, `ps2x` = the same clip at 2.0×, `trans` = the
known-language clip. (`ROLE_SPEED`, `packages/core/src/pods/podStageComposition.ts:43`.)

Read as a schedule, with the dwell times applied:

| stage | exposures of that sentence | pattern | reads as |
|---|---|---|---|
| 1 | 1–2 | ps · trans · ps · ps | **target · known · target · target, all 1×** |
| 2 | 3–5 | ps · trans · ps · ps | the same again |
| 3 | 6–10 | ps · trans · ps · ps2x | last rep speeds up |
| 4 | 11–15 | ps · trans · ps2x · ps2x | both closing reps fast |
| 5 | 16–20 | ps · trans · ps2x | one rep drops |
| 6 | 21–25 | ps · ps2x | **the known clip drops out** |
| 7 | 26–30 | ps2x · ps2x | fully fast |
| 8 | 31+ | ps2x | **bare target at 2×, for ever** |

That is Tom's description: target-known-target-target at 1× at the start, held for the opening
laps, thinning progressively, ending on bare target at 2×. Eight steps, not a shape I had to invent.

**"Twice" is in there literally**: stage 1's dwell is **2** — the T·K·T·T pattern is heard on the
sentence's first two laps before anything changes at all, and stage 2 is a byte-identical playlist
for three more. The first change of any kind comes on the sentence's sixth hearing.

**It has no Stage-0 and no explainer in it.** The nine-stage map in *code*
(`DEFAULT_STAGE_PLAYLIST`, `usePodLapScheduler.ts:124`) has `['ps','explainer','ps']` at stage 1 —
the live DB row does not, and a live row overrides the code defaults wholesale. So the answer to
"what wiring is needed to run this without depending on Stage-0 or the deleted explainer machinery"
is: **none. It never depended on them.** Its only inputs are `target_audio_id` and `known_audio_id`,
which every pod sentence has.

### A second instance of the same idea, also live

The `listening` row (written by Tom, 2026-06-27) carries the same fade for **Layer-1 seed
sandwiches**: `seedPlaylist: ["t1","known","t1","t2"]` — the same target-known-target-target — and
`layer1StagePlaylist: {1:["ps08x","ps"], 2:["ps15x","ps15x"], 3:["ps2x","ps2x"]}` with
`layer1StageDuration: 3`: 0.8× → 1.5× → 2×. Same doctrine, different layer. Git history shows the
lineage plainly: commit `76fac0ff`, *"t-k-t-t sandwich @1x for listening cups"*.

So the pattern is not a one-off — it is the estate's established shape, built twice.

---

## 2. Why nobody is hearing it

The scheduler consults the schedule and then throws the answer away. In
`usePodLapScheduler.nextLap()` (`packages/player-vue/src/composables/usePodLapScheduler.ts:816`):

```js
const playlist = policy.useStagePlaylist
  ? (stagePlaylistMap[stageInfo.stage] || stagePlaylistMap[String(stageInfo.stage)])
  : singlePlaylist          // ← every sentence, every age, the same four slots
```

`policy.useStagePlaylist` comes from `listening.listeningUseStagePlaylist`
(`useAlgorithmConfig.ts:1061`), which **is not present in the live `listening` row at all**, so it
resolves to `false`. The fallback `singlePlaylist` is the 2026-08-07 one-mode pattern —
`['ps','trans','ps','ps']` at a flat 1.0× — which is *stage 1 of the fade, frozen for ever*.

The sequence of events, from the rows themselves:

- **2026-06-27** — Tom writes the `listening` row with the Layer-1 fade.
- **2026-06-30** — Aran writes the `pods` row with the eight-stage Layer-2 fade. Live.
- **2026-08-07** — the one-mode redesign lands: one pattern, one speed, a hard 1.0 ceiling, and a
  boolean that switches the stage ladder off. Its own header calls the fade "the retired nine-stage
  pod playlist".
- The `listening` row has **not been written since 2026-06-27**, so it does not carry the new flag,
  so the flag defaults false, so the ladder is off.

The fade was not deleted. It was superseded by a later change that its own config row is too old to
have an opinion about. Everything downstream still works: `podStageFor` maps a sentence's exposure
count to a stage (line 177), `buildMainStage` builds the plays and enforces end-on-target
(`podStageComposition.ts:153`), and `totalStages` is derived from the row's key count, so the row's
eight stages are honoured as eight without a code change.

---

## 3. The delta

**One field.** Set `listeningUseStagePlaylist: true` on the `algorithm_config` row `key='listening'`.
Nothing else — no code, no deploy, no migration, and reversible by removing the field again.

Four things worth knowing before that field is set. None is a blocker; all four are real.

**a. 2× genuinely works on this path — and it works by bypassing a rule.** The hard
`LISTENING_SPEED_CEILING = 1.0` (`listeningExposureRamp.ts:94`) lives inside `resolveListeningSpeed`,
which the stage path never calls; the stage path takes `ROLE_SPEED` and then
`computeListeningSpeed`, which comments explicitly *"No cap at `base` — `ps2x` legitimately exceeds
it, which is the over-speed exposure we want"* (`toSimpleRounds.ts:171`). So it plays at 2× as
authored. But that means flipping the flag silently reverses Tom's 2026-08-07 "never more than one"
ruling for pods. Better to retire that rule for pods on purpose than to let a boolean outvote it.

**b. All four gap values in the live `pods` row are 0.** No pause between the target and the known
clip, none between reps, and **none between one sentence and the next** — where the code defaults
are 100/200/300/1000 ms. Aran set those zeros on 2026-06-30 and they have never been heard in the
main flow, because the row went dark six weeks later. The fade will sound relentless until they are
tuned. This is the one thing likely to need a second pass by ear.

`gapBetweenMs` is the one that bites: `glue_to_next` is **false on all 12,278 live pod rows**, so
nothing is glued, `gapGluedMs` never fires, and every sentence boundary in every stage of the fade
is a hard cut.

**c. Speed becomes per-role again, not per-phrase.** On the stage path `uniformSpeed` is undefined
(line 827), so the target clips ride 1.0/2.0 while `trans` stays at 1.0. That is the authored
design — and it contradicts the 2026-08-07 "all four clips at the same speed" ruling. The course
`globalSpeed` still applies, by the other route (`playPodLap`, `LearningPlayer.vue:4703`).

**d. It is estate-wide.** `algorithm_config` rows are global; there is no per-course fade today.

---

## 4. What I searched

Popty (`ssi-dashboard-v7-clean`) and `ssi-learning-app`: `services/`, `tools/`, `apml/`, `docs/`,
`packages/core`, `packages/player-vue`, the pod scheduler and its composables, the Stage-0
sequencer, `ralph-methodology.md`, `synonym-choice-architecture.md`; the git history of both repos
for `ps2x` / `stagePlaylist` / `layer1StagePlaylist`; and every row of `algorithm_config` (`pods`,
`listening`, `stage0`, `script_shape`, `normal_mode`, `fast_mode`, `easy_mode`, `adaptation_v2`,
`voice_declarations`).

**The wider estate sweep is now complete** (worker #395; full detail:
https://watson-1.tail4968cb.ts.net/d/d95628df). It found **two more encodings of the same shape,
both written by Tom himself, both admin-preview-only and never written to `algorithm_config`:**

- **`PROPOSED_STAGE_PLAYLIST`** — Popty `src/views/admin/PodLab.vue:56`, commit `ee759557b`,
  **2026-07-01**, one day after Aran's live row. Eight stages, and Tom's own inline comments spell
  the shape out: `t · k · t · t` → `t · k · t · t@2×` → … → `t@2×  (eternal)`. Reachable only by a
  preset button; exports to clipboard.
- **"The unified ladder"** (`ladderRungs`) — same file, line 612, commit `97e8e09a5`, **2026-07-03**,
  whose commit message is *"the unified ladder — one t·k·t·t climb from finest units to pure-2×
  turn"*. A continuous fusion-then-speed climb that supersedes the draft above in code, and is
  referenced nowhere outside that one file.

**That draft answers call 4 below.** Tom's `PROPOSED_STAGE_PLAYLIST` does *not* have the duplicated
stage 1/2 — it goes straight from `t·k·t·t` to `t·k·t·t@2×`, and adds a `ps2x · trans · ps2x` step
later. So a version of this schedule with the fossil already collapsed exists, in Tom's own hand,
one day newer than the live one.

Ruled out with reasons: `learning-script-generator.cjs`'s `phraseRepeatCount` (whole-phrase repeat,
a different mechanism), the retired `stage0Sequence.ts` atom breakdown, `layer1-explorer.html`'s
fallback playlist, and every remaining `algorithm_config` row.

Two things I did **not** find, stated as gaps rather than glossed:
- No per-course or per-pod drill pattern anywhere — no column on `courses`, nothing in
  `listening_pods.metadata`.
- No written *document* describing the fade. It exists as a DB row and as code that consumes it,
  authored directly by Tom and Aran through the admin surface. There is no spec to point at, which
  is precisely why it reads as missing.

---

## 5. Tom's calls

1. **Flip the flag?** One field on one row turns the existing eight-stage fade back on for every
   pod. My recommendation: yes — but tune the gaps in the same edit (see 3b), because zeros will
   make the eight stages sound like one long run-on.
2. **Does "twice" mean the two opening laps, or the pattern played twice inside one drill?** The
   built schedule is the first reading (stage 1 dwell 2, then an identical stage 2). If you meant
   the second — T·K·T·T·K·T·T inside a single hearing — that is a change to the row, not a build,
   and note that a literal double puts three identical target clips in a row, which the A-64 law
   would re-interleave.
3. **Does the 1.0 listening ceiling stand?** It cannot coexist with 2× at the end. Retire it for
   pods explicitly, or the flag does it silently.
4. **Stages 1 and 2 are identical playlists.** That is the fossil of the old explainer stage 1.
   Five laps of the same thing before anything changes may be exactly right — or it may be an
   accident worth collapsing. Your own `PROPOSED_STAGE_PLAYLIST` (PodLab, 2026-07-01) collapses
   them; Aran's live row does not. Which of the two goes in the row is a taste call, and it is
   yours.

---

*Written from the live `algorithm_config` rows and the code as it stands on `main`, 2026-08-24.
Nothing in this document has been applied.*
