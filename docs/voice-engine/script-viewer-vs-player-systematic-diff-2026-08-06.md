# Script Viewer vs the player — systematic diff across 7 courses

**2026-08-06. Read-only investigation. Nothing was changed in either generator.**

Two numbers up front:

- **838 rounds compared across 7 courses. 633 of them (75.5%) differ.** Divergence is not confined to `deu_for_eng` round 11 — it is the normal case, in both directions, on every course checked.
- **Missing audio explains 100% of the whole rounds the player drops (797/797), and 1.8% of the individual rows it drops (15/851).** Tom's recollection is right, and it is bigger than he remembered: the player does not reject a *cycle*, it rejects the **entire LEGO — the whole round — and renumbers every round after it.**

---

## First: the earlier finding was measuring the bootstrap, not the player

The prior writeup concluded the player has no review or consolidate rows at all. That is true of `GET /api/courses/:code/cycles` — and only of it. `cycles.ts` is a **bootstrap window** for instant playback; its own header says cross-LEGO spaced rep is deliberately excluded and built later.

Seconds after playback starts, `LearningPlayer.vue` runs the real generator client-side — `packages/player-vue/src/providers/generateLearningScript.ts` — and calls `replaceQueueFromCurrent` (`LearningPlayer.vue:12509`). That is the script a learner actually hears, and **it is full of reviews**: for `deu_for_eng`, 16,880 `spaced_rep` items across 1,395 rounds.

So the alarming reading — "learners get no spaced repetition" — is **not** what is happening. Everything below compares the two real generators:

| | file |
|---|---|
| Script Viewer | `services/learning-script-generator.cjs` (Popty) |
| Player | `packages/player-vue/src/providers/generateLearningScript.ts` (learning app) |

Both were run in one process, against the live database, with the same live `algorithm_config` (offsets `[1,2,3,5,8,13,21,34,55,89,144,233,377,610,987,1597,2584]`, shape 7/2/12/3). Rounds were aligned **by LEGO id**, not by round number, so renumbering could not masquerade as a content difference.

---

## The systematic diff

Two windows per course — rounds 1-60 (offset 0) and rounds 401-460 (offset 400) — to avoid the selection bias of a single early round.

| course | rounds compared | identical | divergent | SV rows player never plays | …explained by missing audio | player rows SV never shows | …bare-LEGO builds | whole rounds dropped | …explained by missing audio |
|---|---|---|---|---|---|---|---|---|---|
| deu_for_eng | 120 | 27 | 93 | 46 | 4 | 132 | 69 | 0 | — |
| spa_for_eng | 120 | 31 | 89 | 84 | 0 | 145 | 85 | 5 | 5 |
| jpn_for_eng | 119 | 40 | 79 | 208 | 0 | 276 | 67 | 6 | 6 |
| ita_for_eng | 120 | 30 | 90 | 122 | 9 | 128 | 84 | 0 | — |
| fra_for_eng | 119 | 16 | 103 | 221 | 0 | 233 | 96 | 4 | 4 |
| nep_for_eng | 120 | 30 | 90 | 90 | 0 | 168 | 71 | 6 | 6 |
| ara_lb_for_eng | 120 | 31 | 89 | 80 | 2 | 153 | 83 | **776** | **776** |
| **TOTAL** | **838** | **205** | **633** | **851** | **15 (1.8%)** | **1,235** | **555 (44.9%)** | **797** | **797 (100%)** |

Direction: the player both **drops** rows the Script Viewer shows and **plays** rows it never shows. Neither side is a superset.

Early course vs mid-course is a sharp split. In rounds 1-60, review rows match **exactly** on every course whose LEGOs are all fully voiced. From round ~400 the player emits roughly **one extra review per round** that the Script Viewer suppresses.

---

## Four mechanisms, all confirmed in code

**1. Missing audio kills the whole round — and shifts every round after it.**
`generateLearningScript.ts:764-767` filters the LEGO list before the walk:

```ts
const allLegos = allLegosRaw.filter(
  l => l.known_audio_id && l.target1_audio_id && l.target2_audio_id
)
```

A LEGO short of any one of the three audio IDs produces **no round at all**, and because round numbers are assigned after the filter, every later round slides down. Measured shifts: `fra_for_eng` rounds shift by 1 from round 47 (LEGO `S0015L01` lacks its second target voice); `nep_for_eng` shifts by 6 by round 401; `jpn_for_eng` by 4. That shift re-pairs the entire Fibonacci review schedule, which is why `fra_for_eng` shows 65 review rows missing and 64 different ones added **in rounds 1-60 alone** — a single silent audio gap at seed 15 desynchronises the review timeline for the rest of the course.

The extreme case is `ara_lb_for_eng`, a **beta** course: 886 of 1,546 LEGOs lack audio from seed 301 onward. The Script Viewer shows 1,414 rounds. The player plays **638** and then ends. 776 rounds — more than half the course — are invisible to the learner and fully visible to the producer signing it off.

Course-wide, every single one of the 797 dropped rounds is explained by missing audio: **797/797, 100%**. There is no second cause.

The Script Viewer already ports this gate as an opt-in — `?learnerView=1` (`learning-script-generator.cjs:249` `applyLearnerAudioGate`) — but it is **off by default**, and the default is what a producer sees.

Worth flagging separately: six courses (`hak_for_eng`, `mar_for_eng`, `tel_for_eng`, `deu_ch_for_eng`, `fin_for_eng`, `yue_for_eng`) have **zero** fully-voiced LEGOs, so the player would generate nothing at all. All six are `status: draft` — expected, not a bug. `ara_lb_for_eng` is the one that is `beta` with a real hole in it.

**2. The player plays the LEGO alone as a BUILD; the Script Viewer suppresses it.**
This accounts for **555 of the 1,235** player-only rows — 45%, and it is the single commonest divergence. The dashboard seeds its per-round used-set with the LEGO's own text before the BUILD loop (`learning-script-generator.cjs:743`, skipped at `:763`). The learner's BUILD loop (`generateLearningScript.ts:1165-1187`) has no such guard, so where the database holds a build phrase identical to the LEGO it plays it. Real example, `deu_for_eng` `S0001L01`: LEGO `I want / ich will`, and `course_practice_phrases` position 3 is `phrase_role: build`, `I want / Ich will`. The player plays it; the Script Viewer does not.

Because the BUILD cap is 7, that phantom row also **displaces a real BUILD phrase**, which is most of the "SV rows the player never plays" in the early window.

Note for the methodology call: ralph is explicit that a BUILD is the new LEGO plugged into prior vocabulary, **never the LEGO alone**. On that reading the Script Viewer is right and the player is playing a row it should not — but the underlying defect is a data one, a `build` row whose text equals its LEGO.

**3. Graduated seeds — a one-line drift that hides mid-course reviews.**
Learner (`generateLearningScript.ts:1251`, `:1439`):
```ts
if (graduatedSeeds.has(state.seedNum) && !reviewItemIsSeed(offset)) continue
```
Dashboard (`learning-script-generator.cjs:847`):
```js
if (graduatedSeeds.has(reviewLegoState.lego.seed.seed_number)) continue
```
The learner keeps graduated seeds eligible for **seed-phase reviews** (offset ≥144, where the review item is the full parent seed sentence). The dashboard drops graduated seeds from spaced rep entirely. That is exactly one extra review row per round from round ~144 onward, and it matches the data: of the player-only review rows in the offset-400 window, **94% (deu), 100% (spa), 89% (ara_lb), 71% (ita), 70% (fra), 69% (nep)** are verified `course_seeds` sentences.

**4. BUILD/CONSOLIDATE labelling.** Where the same phrase text appears on both sides, the two generators sometimes assign it to different phases — a build on one side, a consolidate on the other — because the used-phrase cascade differs once (1) and (2) have shifted the pools. Second-order, downstream of the above.

---

## Answering the three questions directly

**Is the disagreement systematic?** Yes. 633 of 838 rounds, every course, both directions. `deu_for_eng` round 11 was not unrepresentative — but it was measured against the bootstrap endpoint, which overstated the review problem.

**Missing-audio correlation.** Two very different numbers, and both matter:
- Whole rounds the player drops: **797/797 = 100%** have a missing-audio explanation. Tom's hypothesis is confirmed, at LEGO granularity rather than cycle granularity.
- Individual rows the player drops within a round it does play: **15/851 = 1.8%**. The other 98% are the bare-LEGO-build displacement and the graduated-seed drift.

**Which side is right?** Not answered here — that is Tom's call, and it splits differently per mechanism: on (1) the player is deliberately protecting itself from silent cycles but is silently truncating a beta course; on (2) ralph says the Script Viewer is right and the data is wrong; on (3) the Script Viewer is simply stale against a learner change.

---

## Reproducing this

Harness and analysers: `scripts/script-diff-2026-08-06/` (gitignored workspace). The harness itself lived at
`ssi-learning-app/packages/player-vue/src/__tests__/zzz-scriptdiff.harness.test.ts` and was deleted after the run;
it ran both generators in one Vitest process (`--environment=node`, so `supabase-js` accepts the service key)
against the live database, dumping per-round JSON to `/tmp/scriptdiff-<course>.json`.
