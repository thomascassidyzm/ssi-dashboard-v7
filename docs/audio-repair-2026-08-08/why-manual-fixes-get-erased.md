# Why Tom's manual fixes got erased — text identity is the only thing the pipeline believes

**2026-08-08. Read-only. Row-level evidence and timestamps throughout.**

---

## Verdict in one line

**The pipeline decides what a slot should hold by matching TEXT, and nothing else.** Tom fixed those clips by *nudging the text* — typing `erklären…` instead of `erklären` to coax the voice into a fuller pronunciation. That is exactly the fix the pipeline cannot see: a row whose text is not character-identical (after normalisation) to the LEGO's `target_text` is invisible to it, so it concluded the slot was unsatisfied, re-rendered, and relinked the slot away. **The fix method and the destruction mechanism are the same fact.**

There is a natural experiment inside Tom's own session that proves it, below.

## Prime suspect: CONFIRMED, with one correction

Job `c6412b2c` (04:43Z → 05:45Z) is the right suspect. Inside its window sit the two writes that did the damage:

| Run | Started | Finished |
|---|---|---|
| `reuse-deu_for_eng-r100-1786166350406` | 2026-08-08T05:19:47.661Z | 05:22:37.112Z |
| `reuse-deu_for_eng-r101to200-1786166591362` | 05:23:57.888Z | 05:27:53.633Z |

**The correction:** it did *not* overwrite Tom's clips' bytes. I checked `course_audio_revisions` for all five of his row ids — **no revision rows exist for any of them**. His audio is still on S3, untouched. What the run did was *relink the slots away from his rows*, leaving his clips orphaned but alive. "Reverted", not "overwritten". That distinction matters, because it means nothing of his is lost — it is unreferenced.

---

## Tom's session, located exactly

Five clips, all `deu_for_eng`, all seed 8, all `target2`, minted 2026-08-08 **00:13Z → 01:43Z** — after yesterday's 1-200 run, hours before job `c6412b2c`. Two different Popty buttons:

**Regen Lego** (`POST /api/audio/regenerate-lego/:courseCode/:legoId`):

| Time (Z) | LEGO | Text he typed | New row |
|---|---|---|---|
| 00:13:22 | S0008L01 | `"erklären…"` | `6e01eb96…` |
| 00:34:39 | S0008L02 | `"was ich meine…"` | `0e252419…` |
| 00:35:32 | S0008L02 | `"was ich meine,"` | `8aa8cc0d…` |

**Regen Phrase** (`POST /api/audio/regenerate-phrase/:courseCode/:phraseId`):

| Time (Z) | Phrase | Text | New row |
|---|---|---|---|
| 01:42:01 | S0008L02B02 | `"Ich will sagen, was ich meine"` | `9d97e197…` |
| 01:43:05 | S0008L02B03 | `"Ich werde erklären, was ich meine"` | `9d1046bb…` |

Both paths mint a **new** `course_audio` row and repoint the holder. Neither writes a revision, neither leaves any mark that a human did it.

## The natural experiment

| His fix | Row text | LEGO/phrase `target_text` | Match? | Outcome |
|---|---|---|---|---|
| S0008L01 target2 | `erklären…` | `erklären` | ✗ | **ERASED** |
| S0008L02 target2 | `was ich meine…` | `was ich meine` | ✗ | **ERASED** |
| S0008L02 target2 | `was ich meine,` | `was ich meine` | ✗ | **ERASED** |
| S0008L02B02 target2 | `Ich will sagen, was ich meine` | *identical* | ✓ | **SURVIVED** |
| S0008L02B03 target2 | `Ich werde erklären, was ich meine` | *identical* | ✓ | **SURVIVED** |

**Three for three, both ways.** Every fix where he changed the text was erased. Every fix where he kept the canonical text survived and is still held right now. Nothing else distinguishes the two groups — same course, same seed, same voice, same role, same hour, same service.

I ran the pipeline's own normaliser (`services/shared/text-normalize.cjs`) over the exact strings to be sure the difference is real and not cosmetic:

```
ARMED   "erklären"       vs "erklären…"          → normalised "erklären…"       ≠ candidate
ARMED   "was ich meine"  vs "was ich meine,"     → normalised "was ich meine,"  ≠ candidate
FOLDED  "Très bien"      vs "Très bien."         → normalised "très bien"       = candidate
FOLDED  "morgen Nachmittag" vs "morgen nachmittag" → folded (case)
```

`normalizeForAudio` folds case and a trailing full stop. It does **not** fold a trailing `…`, `,` or `?`. So an ellipsis is a different clip as far as the estate is concerned.

## What the run actually did, from its own log

```
action:   RENDERED
clipKey:  target2|deu|xai_leo|erklären          <- built from course_legos.target_text
holder:   course_legos / S0008L01 / target2_audio_id
          cur 6e01eb96…  (Tom's 00:13 clip)
          to  32035a8d…  applied: true
```

`32035a8d…` is a **17 January** row, re-rendered in place this morning to `audio_revision 2`. So the slot now plays a fresh machine render published into a January row id, and Tom's clip is orphaned. `S0008L02 target2` went the same way, to `9a8ccea8…`, also a 17 January row.

That is precisely "the clips were the earlier ones, not my manually replaced ones" — the row **ids** really are the earlier ones.

## Why the pipeline behaves this way

`services/audio-reuse-planner.cjs:675` looks candidates up by text and nothing else:

```js
.select('id, course_code, text, text_normalized, …')
.in('text_normalized', texts.slice(i, i + batchSize))
```

A slot's required clip is derived entirely from `target_text`. If the row in the slot does not carry that text, the planner does not ask "did someone put this here on purpose?" — that question does not exist in the code. It renders and relinks.

**This is the same root cause as the `ich will` regression**, in a different disguise: there the invisible text was the tombstone `ich will ::superseded-regen`, here it is `erklären…`. One rule, two symptoms.

## The deciding code, precisely

There is **no staleness test**. The planner never compares the linked row's text to anything. `services/audio-reuse-planner.cjs:863-874`:

```js
if (own.length) {
  const holdersPointingAtIt = clip.holders.filter(h => h.currentAudioId === winner.id).length
  if (clip.holders.length && holdersPointingAtIt === clip.holders.length) {
    return { decision: 'SATISFIED', reason: `already linked to …` }
  }
  return { decision: 'REUSE_OWN', … }   // ← drag the holder
}
```

and the write, `:1628-1642`, which consults nothing about what the holder currently points at — not NULL-ness, not `origin`, not age:

```js
async function relinkHolders (supabase, clip, audioId, { dryRun = true } = {}) {
  for (const holder of clip.holders) {
    if (holder.currentAudioId === audioId) continue
    … .from(holder.table).update({ [holder.column]: audioId }).eq('id', holder.id)
```

So the sequence is: derive the winner from text alone → the human's row was never a candidate → `holdersPointingAtIt = 0` → relink. **The pipeline does not decide the human was wrong; it never learns a human was involved.** The tell is in the artifacts: the run of 2026-08-07 04:51Z, *before* the hand-fix, logged `"action":"NONE","reason":"already linked to 823cf48a…"`. The pointer only became "wrong" in the planner's eyes once a human moved it.

**A second, independent destroyer:** `tools/regen-seed-clips-from-scratch.cjs:330-353` explicitly treats a holder pointing at a tombstoned row as *"damage an earlier run left behind"* and relinks it forward. Two code paths, same outcome.

**The reuse key** (`audio-reuse-planner.cjs:44-58, 748-775`) is `voice × text × language` — **role-agnostic and course-agnostic** by default, role enforced only for Azure sources, **locale not in the key at all**, `lego_id` not in the key. That last one is why a row stamped `lego_id=S0241L01` can legitimately satisfy `S0001L01`.

## Is there any human marker? No — and the shape of the gap is exact.

- `course_audio_revisions` since 07 Aug: **50,143 rows. Zero human.** 50,010 `reuse-first-rebuild | phase8 /reuse-apply`, 76 `tts | claude`, 57 `regen-targeted-wordloss | founder-order-2026-08-06`.
- `course_audio.origin='human'` **is** honoured, and widely — the precious-audio guard at `phase8-audio-v13.cjs:341-372` and its three callers, `regen-seed-clips-from-scratch.cjs:319` (REFUSED), `revoice-clips.cjs:379` (REFUSING), `audio-veracity-repair.cjs:160`, and the ranking tie-break at `shared/audio-link-preference.cjs:16`. Six places. But the reuse planner reads `origin` **only to rank a winner** (`:833`) — `decideClip` and `relinkHolders` never ask what the *current holder's* origin is. So a human take that isn't the winner is relinked away from regardless.
- Also written-but-never-read by the pipeline: `course_audio_revisions.accepted_by` (used only to render history and to `revert`), `veracity_*`, `audio_revision` (a cache key, not a lock), and `recording_provenance.quality_notes` (read by the recording UI only).
- No `locked`, `pinned`, `protected`, `approved`, `verified` or `do_not_touch` column exists anywhere on the audio path, and there is no exclusion list or skip-file in `services/`, `tools/`, `src/` or `database/`.

**So the gap has an exact shape:** the estate protects human **bytes** in six separate places, and protects **nothing at all** about a human's decision on *which row a slot points at*. That class of correction has no representation in the schema, so no code can honour it.

**And there is one design that already survives.** The repair-accept path (`AudioRepairPanel.vue:617` → `audio-repair-core.cjs:636`) writes new bytes into the **same row id** — new `s3_key`, bumped `audio_revision`, ledger entry — and **never moves a pointer**. Nothing can relink away from it because the id never changes. The two paths Tom used (Regen Lego, Regen Phrase) both mint a new row and rebind the FK, which is precisely what the next reuse pass undoes.

## Blast radius

**Tom's own handful: 3 of 5 erased** (S0008L01 target2, S0008L02 target2 ×2), 2 surviving. Plus the separate `S0001L01` `ich will` pair, also erased by the same run — **5 slots in total this morning**.

**Still armed.** Slots in rounds 1-200 whose current row is invisible to the planner, so the next run will re-render and relink them — measured with the planner's own normaliser, not a raw string compare:

| Course | Slots checked | **Armed** |
|---|---|---|
| `deu_for_eng` | 884 | **14** |
| `fra_for_eng` | 978 | **2** |

Two of the 14 are the `ich will` tombstone pair. The other twelve, and both French ones, are a single recurring pattern — the clip's text carries a question mark the LEGO's `target_text` does not, e.g. `target_text "wonach suchst du"` against row `"Wonach suchst du?"` (S0194L01, both voices). Those clips are healthy; they are simply about to be re-rendered and thrown away for a punctuation difference.

**A larger, separate fact for the record:** between 02:51:19Z and 05:27:53Z this morning, **24,357 `deu_for_eng` clips had their bytes swapped in place** (`reuse-first-rebuild`, revision bumped, holder untouched) — plus 25,484 in `fra_for_eng`. None of Tom's five are among them. But it does mean that a hand fix which *replaces the bytes of an existing row* is destroyed by that path with no pointer change and no orphan left behind — the opposite failure to the one that bit here, and completely invisible unless you read the revisions ledger.

## Honest gaps

- I have not proven that job id `c6412b2c` is the label for those two reuse runs. The timestamps nest exactly inside the 04:43-05:45 window and no other deu writer appears in that period, but I could not find a job record tying the id to the runs. If that identification matters, it is unverified.
- The armed count covers `course_legos` for rounds 1-200 in deu and fra only. `course_practice_phrases` slots and rounds 201+ are not in that number.
- I have not listened to any clip. Every claim here is from rows, logs and timestamps.

## Nothing was touched

Read-only throughout. No re-render, no re-link, no repair, no restart. Tom's three orphaned clips are still alive on S3 at their original keys and can be put back with a pointer move whenever he rules — but that fix would itself be erased by the next run unless the text question is settled first.
