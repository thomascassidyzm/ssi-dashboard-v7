# cym_n pod speaker alignment — measured, and NOT applied

**2026-09-03, before Aran and Catrin's morning session. No database write was made.**

I was asked to align the stale `listening_pods.speakers` map to
`courses.voice_config.podCast`, and told the acceptance test was Aran's recorded
count moving 26 → 36 and Catrin's 38 → 56, with 28 redundant re-reads
disappearing. I was told to stop and report rather than force the numbers if they
came out differently.

**They came out differently, and the reason is that the instructed change is
inert.** Details below. Nothing was written; nothing was deployed.

## 1. The disagreement is real and is exactly 39 lines

Confirmed on `cym_n_for_eng:pod-0` (231 lines): **39 lines** where
`listening_pods.speakers` and `voice_config.podCast` give different genders.
That part of the brief is exactly right.

The other pod row, `cym_n_for_eng:pod-0-gated-2026-08-06`, holds a `speakers` map
but **no sentences at all**, so it casts nothing.

## 2. But nothing an artist sees reads `listening_pods.speakers`

The `/r/<voice>` screen is served by `recordist-router.cjs` → `buildQueue` in
`services/voice-engine/recordist-queue.cjs`. That file reads
`voice_config.podCast` (lines 574 and 1305, via `castEntryFor`) and never reads
`listening_pods.speakers`.

The only readers of `speakers` in the estate are:

| File | What it uses it for |
|---|---|
| `services/pod-bulk-migrate.cjs` | picking a TTS voice during bulk pod generation |
| `services/pod-voice-approvals.cjs` | the TTS cast fingerprint and the uncast-speaker gate |
| `services/pod-dialogue-generator.cjs` | writing the header row when a pod is generated |

None of them is on the recordist path and none of them feeds a recorded count.
**So rewriting `speakers` to match `podCast` would have moved zero numbers on
either artist's screen** — while changing the TTS cast fingerprint on a live
course a few hours before a recording session. That is cost with no benefit, so
I did not do it.

## 3. What actually deflates the counts

Measured with `tools/recording/diagnose-cast-disagreement.cjs` (committed with
this doc, read-only), and cross-checked against the live API on popty.app, which
returns the identical figures:

```
Catrin  total=466 recorded=38 remaining=428
        pod lines 151: 38 hold a stored take, 0 flagged rerecord_wanted
Aran    total=413 recorded=26 remaining=387
        pod lines  80: 58 hold a stored take, 32 flagged rerecord_wanted
```

Aran's number is not deflated by casting. **58 − 32 = 26**: he holds a take on 58
of his 80 cast lines, and 32 of those takes are flagged `rerecord_wanted` by our
own quality machinery — the boundary-clipped and no-speech takes from the August
passes. A flagged take correctly does not count as recorded (`countsAsRecorded`
in `take-selection.cjs`), and #160 masks the judgement from the artist while
leaving the line outstanding. That is working as designed and I did not touch it.

Catrin's number is not deflated at all: 151 cast lines, 38 with takes, 38
recorded.

## 4. Stranded takes — the real, separate finding

| | Has a take of | Inside their podCast bucket | Stranded in the other's |
|---|---|---|---|
| Aran | 81 lines | 53 | **28** |
| Catrin | 56 lines | 38 | **18** |

46 lines were recorded by one artist and are now cast to the other. Those are the
genuinely redundant re-reads. Recovering them is a **casting change**, not a
bookkeeping one — and it is the direction the brief forbids.

## 5. Why the acceptance numbers are not reachable by any alignment

I simulated re-casting `podCast` from the `speakers` genders, read-only, through
the real `buildQueue`:

| Scenario | Aran recorded | Catrin recorded |
|---|---|---|
| Today (live, verified on popty.app) | 26 | 38 |
| Simulated `podCast := speakers` | 27 | 53 |
| **#162's expected result** | **36** | **56** |

Catrin's 53 lands near her expected 56. Aran's 27 does not go near 36, and the
gap is his 32 `rerecord_wanted` flags: those lines cannot count as recorded under
any casting, because the takes were judged unusable. #162's projection appears to
have credited them.

So: **26 → 36 is not achievable tonight by any change to either map.** It would
require un-flagging 32 takes a quality pass has already ruled against, which is
not bookkeeping and is not mine to decide.

## 6. cym_s_for_eng — reported, not changed

Not the same defect. `cym_s_for_eng.voice_config.podCast` is **empty (`{}`)**, so
all **231** southern pod lines are `uncast` and enter no queue. This is what
accounts for the 239 uncast lines showing in *both* northern queues, since the
queue is built per language across both courses.

Its `listening_pods.speakers` is populated (28 speakers on `pod-0`) and, notably,
already carries the **newer** cast shape — `Diner 1/2`, `Cafe Barista`,
`Bar Customer 1-3`, `Cafe Customer 1-3` — the same roles as cym_n's `podCast`,
whereas cym_n's own `speakers` still holds the older `Customer 1/2/3` shape.
Nothing is urgent while no southern recordist is cast. Not changed.

## 7. Serving path — proven untouched

`tools/recording/verify-take-invariant.cjs cym_n_for_eng`, before and after,
byte-identical because no write occurred:

```
231 lines, 462 tracks checked
  agree (recordist file === learner file): 156
  slot holds no human take (TTS/other):    0
  DISAGREE (different file served):        0
  learner silent while a take exists:      0
  serving a take a human marked 'bad':     64
```

The 64 is pre-existing and is the same 32 flagged Aran takes across two tracks.

## 8. The one decision

The 46 stranded takes are worth recovering, but only by moving the cast toward
whoever already recorded each line — and that re-opens the per-conversation
gender alternation you built on 23 August to stop Aran answering himself. That is
a taste call about whether an alternating scene is worth 46 re-reads, and it is
yours.

Nothing blocks the morning session either way: both queues are live, correct, and
serve from `podCast` today.
