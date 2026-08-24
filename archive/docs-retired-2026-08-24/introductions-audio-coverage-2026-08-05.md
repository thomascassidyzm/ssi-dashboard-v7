# "Are all introductions and whatnot fixed too? For French and German?"

**2026-08-05 · worker 8b1dae03 · answered from the LIVE database, not from audit documents**

Tom asked this on 2026-08-05 and the honest answer at the time was "I don't know yet". This
document replaces that with a straight answer, per language, per audio role.

**The short answer: no — and `presentation` is the gap.** `presentation` clips ARE the lego
introductions, they ARE exposed to the tail-repair damage class, and they are the one class the
repair tooling deliberately refuses to touch. Everything Tom would call "whatnot" — the
instructions, the encouragements, the welcome — turns out to be **human-voiced**, so it was never
at risk at all.

---

## 1. What the courses actually carry

The brief named five audio roles. The live database carries **twelve**. Counts are live as of
2026-08-05 02:20 (`course_audio`, grouped by `role` and `origin`).

| role | fra_for_eng | deu_for_eng | origin | is this "introductions/whatnot"? |
|---|---:|---:|---|---|
| `target1` | 15,145 | 14,274 | tts | no — course audio |
| `target2` | 13,729 | 13,708 | tts | no — course audio |
| `known` | 13,489 | 14,293 | tts | no — course audio |
| `presentation` | 2,173 | 2,400 | tts | **YES — these are the lego introductions** |
| `pod_explainer` | 1,539 | 994 | tts | yes — pod narration |
| `pod_fine_known` | 2,147 | 1,067 | tts | yes — pod |
| `pod_take_g` | 807 | 470 | tts | yes — pod |
| `instruction` | 48 | 47 | **human** | yes — and safe, see §3 |
| `encouragement` | 26 | 25 | **human** | yes — and safe, see §3 |
| `welcome` | 1 | 1 | **human** | yes — and safe, see §3 |
| `bookend_listen_intro` | 1 | 1 | tts | yes |
| `bookend_listen_outro` | 1 | 1 | tts | yes |

A `presentation` row looks like this, verbatim from the live table:

> `The German for: 'mother', as in — 'My mother…'`

That is a lego introduction. When Tom asks about "introductions", this is the row he means.

---

## 2. The three-question table

For each role: is it exposed to the tail-repair damage class; is it covered by the pre-publish
veracity gate (commit `85bd2a34`); and is it covered or refused by the repair tooling.

| role | exposed to tail-repair damage? | pre-publish veracity gate? | repair tooling? |
|---|---|---|---|
| `target1` / `target2` / `known` | **yes** — phase8 `masterAudio` | **yes** | **covered** |
| `bookend_listen_*` | **yes** — phase8 `masterAudio` | **yes** | **covered** |
| `presentation` | **yes** — phase8 `masterAudio` | **yes** at render | **REFUSED** ⛔ |
| `pod_explainer` / `pod_fine_known` / `pod_take_g` | **yes** — via `phase8.masterAudio` | **NO — bypasses the gate** ⛔ | **REFUSED** ⛔ |
| `instruction` | **no** — human-voiced, never TTS | n/a | n/a (correctly) |
| `encouragement` | **no** — human-voiced | n/a | n/a (correctly) |
| `welcome` | **no** — human-voiced | n/a | n/a (correctly) |

Both languages are identical on every row of this table. There is no French-versus-German
difference in coverage — only in volume.

### Why `presentation` is refused
`tools/audio-veracity-repair.cjs:112` and `tools/repair-silent-clips.cjs:121,208-212`:

```js
const SKIP_ROLE = (role) => role === 'presentation' || /^pod_/.test(String(role))
```

The stated reason is correct and should not be overridden casually: the repair engine works by
minting a **new** audio id and deleting the old row, because the learning app serves audio
`immutable, max-age=31536000` and the player caches blobs in IndexedDB by audio id — so reusing an
id would never reach a device already holding the bad bytes. But deleting a `presentation` row
**CASCADEs into `lego_introductions`** and destroys authored content. Fixing a duration by
destroying an authored introduction is a bad trade.

So the gap is real and it is deliberate. Closing it needs a repair path that replaces
`presentation` audio **without** deleting the row — that is a build, not a sweep, and it is Tom's
call whether it is worth it.

### Why pods are the worse gap
`services/pod-explainer-composite.cjs:302` calls `phase8.masterAudio(...)` **directly**, which runs
`repairTailDefect` (phase8 line 946) — but it never calls `veracity.renderChecked`. So pod audio is
exposed to the damage path **and** publishes without the truncation/silence check. It also has a
CLI entry point (`require.main === module`), so when run from a shell it inherits no
`TAIL_REPAIR_MODE` and takes the damaging branch by default (see §4).

---

## 3. The good news: "whatnot" is human-voiced

`instruction`, `encouragement` and `welcome` are `origin = 'human'` in **both** courses — 75 clips
in French, 73 in German. Human audio is never re-rendered and never passes through
`repairTailDefect`. These were never at risk, and the tooling's silence about them is correct
rather than an oversight.

This is the single cheapest part of the answer and it covers most of what "and whatnot" naturally
points at.

---

## 4. Where the gate reaches, and where it does not

`repairTailDefect` has exactly **one** production caller: `services/phases/phase8-audio-v13.cjs:946`,
inside `masterAudio`. Everything that renders audio therefore divides cleanly:

| path | reaches `repairTailDefect`? | inherits `TAIL_REPAIR_MODE=flag`? |
|---|---|---|
| phase8 service (PID 94946) | yes | **yes** — systemd unit |
| production-api service | yes | **yes** — systemd unit |
| `pod-explainer-composite.cjs` run from a shell | yes, via `phase8.masterAudio` | **NO — takes the damaging branch** |
| any CLI tool requiring phase8 | yes | **NO unless the shell exports it** |
| `presentation-service.cjs` | **no** | n/a |
| `welcome-service.cjs` | **no** | n/a |
| `encouragement-service.cjs` | **no** | n/a |

The last three render TTS themselves (11, 4 and 4 call sites) but use only `concatenateAudio`,
`getAudioDuration`, `ffmpegFilterToLameMp` and `processBatch` from `audio-processor.cjs` — never
`masterAudio`, never `repairTailDefect`. So they cannot cause tail damage. They also do not call
the veracity gate, so anything they *do* publish is unchecked for silence and truncation — a
smaller, separate gap worth noting but not a tail-repair issue.

### The CLI-versus-service split, proven not assumed

`tools/verify-tail-repair-mode.cjs` (committed `b4831755`) runs the real function on a synthetic
fixture at zero TTS cost. Run on watson-1, 2026-08-05 02:18:

```
TAIL_REPAIR_MODE=flag   → action=held      DURATION unchanged at 1.832s — nothing was cut
(unset, code default)   → action=repaired  DURATION 1.832s -> 1.700s (-132ms, 7.2% removed)
```

That is the damage, reproduced on demand. `services/audio-processor.cjs:684` defaults to
`'repair'`, and `.env` carries no `TAIL_REPAIR_MODE`, so **any** tool launched from a plain shell
amputates. This is why every rendering command in this programme exported the flag explicitly and
asserted it against `/proc/<pid>/environ` of the process actually doing the work.

---

## 5. Open items, stated as gaps rather than papered over

- **`presentation` has no repair path at all.** 2,173 French and 2,400 German introduction clips
  are exposed to the damage class with no tool permitted to fix them. Needs a replace-in-place
  repair path that does not delete the row.
- **27 German `presentation` rows have `duration_ms IS NULL`**, all stamped 2026-08-03. Cause not
  established. They are in the refused class, so no tool touched them; German belongs to the
  sibling worker on this programme.
- **Pods bypass the veracity gate entirely** (`pod-explainer-composite.cjs:302`). 4,493 French and
  2,531 German pod clips published unchecked.
- **How much existing `presentation`/pod audio is actually damaged is UNMEASURED.** The decision
  memo is explicit that no per-clip repair record exists and that the 100 ms trailing-room
  fingerprint **failed** as a predictor (45.8% vs 44.0%, p = 1.00), so there is no cheap query for
  it — only acoustic decode. Since nothing can currently repair these roles, measuring them was not
  the best use of a saturated box tonight. Stated as a gap, not an answer.

---

## 6. Addendum, 2026-08-05 03:00 — the French current-state column (worker `ae401eb8`)

Tom's question had a second half this document did not yet answer: not only *is* each type covered,
but *what state is it in*. Measured live for `fra_for_eng`. German is the sibling worker's column
and is recorded in `docs/overnight-audio-2026-08-05/deu-status.md`.

The suspect count is the free ms-per-char predictor calibrated in
`docs/overnight-audio-2026-08-05/fra-audio-repair-record.md` §3 — **high precision, poor recall**.
A 0 in that column is a good sign, never a clearance.

| audio type | fra clips | truncation-suspect (ms/char < 40) | repairable tonight? | state |
|---|---:|---:|---|---|
| `target2` | 13,729 | 1,178 | yes | swept tonight |
| `known` | 13,486 | 433 | yes | swept tonight; 138 also moved off the wrong voice |
| `target1` | 15,145 | 45 | yes | swept tonight |
| `presentation` | 2,173 | **0** | re-voice only, never repair | 10 moved off a character voice onto `eve`; 0 suspects |
| `pod_explainer` | 1,539 | **169** | **no — refused by every tool** | ⛔ unrepairable, unmeasured |
| `pod_fine_known` | 2,147 | 0 | no | ⛔ ungated at publish |
| `pod_take_g` | 807 | 0 | no | ⛔ ungated at publish |
| `bookend_listen_*` | 2 | 0 | yes | both moved off legacy Azure onto `eve` |
| `instruction` / `encouragement` / `welcome` | 75 | n/a | n/a | `origin='human'` — never TTS, never at risk |

Two corrections to §5 above, both in French's favour:

1. **`presentation` is not repair-less in every sense.** It cannot be *repaired*
   (`repair-silent-clips.cjs` deletes first, and that CASCADEs into `lego_introductions`), but it
   CAN be *re-voiced*, because `revoice-clips.cjs` inverts the order — insert, relink, then delete —
   and by then the cascade has nothing to cascade to. 10 French presentations were moved tonight on
   exactly that path. What is still missing is same-voice replace-in-place, and that is a build.
2. **French introductions in the opening stretch are complete**: seeds 1–30 carry 94 legos, all 94
   with a `lego_introductions` row and real presentation audio, 0 null durations.

The one number worth Tom's attention: **`pod_explainer`, 169 French truncation suspects that no
tool is permitted to touch.** Pods are also the one path that bypasses the pre-publish gate. That is
the largest remaining French hole and closing it is a build, not a sweep — reported, not actioned.
