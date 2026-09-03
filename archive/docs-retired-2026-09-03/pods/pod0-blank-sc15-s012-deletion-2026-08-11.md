# The blank `SC15-S012` card — deleted, and why the aligner leaves it

**2026-08-11. Four rows deleted with Tom's approval. Nothing else touched, no audio generated,
no audio row deleted.**

## What was deleted

| row | pod | live? | before-state |
|---|---|---|---|
| `cym_n_for_eng:pod-0:SC15-S012` | Northern Welsh | live, released course | blank / blank, no clip pointers |
| `cym_s_for_eng:pod-0:SC15-S012` | Southern Welsh | live, released course | blank / blank, no clip pointers |
| `deu_at_for_eng:pod-0:SC15-S012` | Austrian German | live | blank / blank, no clip pointers |
| `spa_for_eng:pod-0-unrecorded:SC15-S012` | Spanish | gated | blank / blank, **11 clip pointers** |

All four were empty in both languages, `scene 15 / sentence 12`, parked at `global_order` 90142.
Canonical scene 15 (`canonical_pod_scenarios`) stops at S011, so none of them corresponded to any
line of the canon.

Full per-row before-image, including every column:
`docs/pods/pod0-blank-sc15-s012-deletion-applied-log.json`.

## The audio check, which was not a formality

Three rows were clip-free as expected. **The Spanish row was not** — it still carried 5
`sentence_audio_ids`, 5 `sentence_known_audio_ids` and 1 `takeg_audio_ids`, left over from when
that row held the old-canon Narrator drill line *"Cien mil. Sesenta. Setenta. La una en punto. Las
once en punto."* before the alignment blanked it.

Deleting it was still lossless, and provably so: all 11 ids are **byte-identical to the pointers on
`spa_for_eng:pod-0:SC15-S012`**, the live Spanish pod's own row, which still holds that text and
still plays those clips. The script checked every pointer against every other row in the table
before deleting anything and would have aborted the whole run on a single clip nobody else
referenced. Nothing in `course_audio` was deleted; row deletion drops pointers, never clips.

## Verification

Read back through the learner's anon key, the same query the player runs:

```
cym_n_for_eng:pod-0            231 rows, 22 scenes, last: SC22-S011
cym_s_for_eng:pod-0            231 rows, 22 scenes, last: SC22-S011
deu_at_for_eng:pod-0           231 rows, 22 scenes, last: SC22-S011
spa_for_eng:pod-0-unrecorded   231 rows, 22 scenes, last: SC22-S011
```

231 = the canon exactly. The trailing blank card is gone from all four.

## Root cause: not a bug, a deletion gate

The old canon's scene 15 ran to 12 lines; the new one stops at 11. `align-pod0-to-canonical.cjs`
handles a row the new canon has no slot for by **retiring** it, not deleting it — blanking both
texts and setting `global_order = 90000 + old`, so `pods-plan`'s `if (target)` / `if (known)`
guards drop it from every queue (`tools/pods/align-pod0-to-canonical.cjs:207`). Its own comment
says why:

> Rows the new canonical has no slot for. NOT deleted — blanked… Deletion is a recommendation for
> Tom and Aran, never an action here.

That is CLAUDE.md's never-delete-without-approval gate working exactly as written, not an
off-by-one in scene-boundary handling. **The tool is therefore unchanged.** Making it delete by
default would put an unreviewed destructive write inside a bulk fleet tool — the wrong trade for a
cosmetic residue.

What the residue costs is one invisible row per shrunken scene, per pod, until someone asks. The
run's own report already surfaces it: `retired_not_deleted` in the align log. **The standing
answer for future canon changes**: retired rows accumulate, are queue-inert, and are cleared by a
deliberate approved pass like this one — never silently by the aligner.

Tool used, with dry-run and per-row assertions:
`scripts/delete-pod0-blank-sc15-s012.cjs` (gitignored workspace; the logs are committed).
