# Sascha's seed-10-and-above takes are out of learner playback — unlinked, not deleted

**Course:** `deu_at_for_eng` (Austrian German for English speakers)
**Recordist:** Sascha, who uses they/them.
**Ruling applied:** Kai, 2026-08-25 — *seeds 1–9 are the real recording session and every
human take there stays; everything from seed 10 upwards is test material and goes back to
the synthetic voice.*
**Done:** 2026-08-25, verified by reading the live database back afterwards.

---

## The count, on the record

Sascha has **225 human clips** in this course — every one of them `role = target2`,
voice `human_sasha_wanasky_deu_at`. What matters for playback is not the clips but the
**slots** those clips are bound into, because one clip can serve many slots: the little
lego words (`ned`, `wos`, `iatz`, `a bissl`, `mit dir`) are reused across the whole course.

| | slots bound to a Sascha take | distinct takes |
|---|---|---|
| **seeds 1–9** — the real session | 227 | 202 |
| **seed 10+** — test material | **78** | **26** |

Two more numbers that decided *how* this was done:

- **7 takes are bound on both sides at once** — live at a seed 1–9 slot *and* at a seed 10+
  slot. Those are the reused lego words.
- **4 human clips are bound to no slot at all** — they are in the database and in the
  bucket, and no learner has ever heard them. Untouched.

## What changed

**78 slots**, spread over 60 seeds, were repointed from Sascha's take back to the
synthetic clip the course otherwise uses — every one of them
`azure_de-AT-JonasNeural`, the course's target2 voice.

- **0 slots refused.** Every one of the 78 had a surviving synthetic twin.
- **0 slots need audio generating.** Nothing was generated; no money was spent.
- **0 empty slots.** Read back live afterwards: no `target2_audio_id` is NULL at seed 10+.
- **225 human rows still present**, and not one S3 object was touched.

Read back from the live database after the write:

| | seeds 1–9 | seed 10+ |
|---|---|---|
| slots on a human take | **227** (unchanged) | **0** |
| slots on a synthetic take | 46 | 14,205 |

## Why this is an FK repoint and not `swapClipInPlace`

The brief named `swapClipInPlace` + an `audio_revision` bump as the safe path. That is the
right instrument when a row's *bytes* are wrong. It is the wrong instrument here, and the
live data is what says so:

1. **Sascha's takes are their own `course_audio` rows.** The Azure row they displaced was
   never overwritten — it is still there. Every one of the 78 slots has exactly one
   surviving `origin='tts'` target2 twin on the same normalised text. So the reversal is
   simply pointing the slot's foreign key back at the row it used to point at. The human
   row and its S3 object are not read, not written, not moved.
2. **Overwriting bytes would have broken Kai's ruling.** Seven takes are bound at both
   seeds 1–9 and seed 10+. Swapping the bytes under such a row would have silently
   replaced a seed 1–9 slot that Kai said must stay. The FK is per-slot; the bytes are not.

**No `audio_revision` bump, deliberately.** The audio id *is* the learner's cache address:
the app builds its ref as `id` or `id.vN` (`buildAudioRef`,
`ssi-learning-app/api/_utils/audioAccess.ts:129`). A relink hands the learner a
**different id**, so the address changes on its own and the new audio is fetched. Bumping
the Azure row's revision instead would have been actively harmful — `.vN` refs resolve
through `course_audio_revisions`, and a bump with no revision row behind it names a
revision that does not exist.

Before writing, each fallback object was proved present in the bucket with `HeadObject`,
and **its own `coursecode` metadata was read** — the check that caught five "Austrian"
takes being Welsh in job #628. All 78 claimed `deu_at_for_eng`.

## Reversing it

One command, and it reverses the whole batch:

```
node tools/deu-at-listen/unlink-test-seeds.cjs --rollback \
  scripts/deu-at-listen/unlink-test-seeds-2026-08-25T21-26-11-431Z.json
```

The batch file carries, per slot, the table, the row, the take it held and the take it
now holds. The rollback names both, so a slot something else has moved in the meantime is
reported rather than clobbered.

## The tool

`tools/deu-at-listen/unlink-test-seeds.cjs` — `--plan` (writes nothing) / `--apply` /
`--rollback <batch>`. It refuses out loud rather than guessing: a slot with no synthetic
twin, a slot with more than one, a twin whose object is missing from the bucket, or a twin
whose metadata claims another course. It generates no audio, ever, and deletes nothing.
