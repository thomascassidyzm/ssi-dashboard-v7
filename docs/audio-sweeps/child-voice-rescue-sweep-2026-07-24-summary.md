# Child-voice rescue sweep — 2026-07-24

Full-fleet run of `tools/rescue-child-voice-clips.cjs` (commit `5acd9292`) across
all `_for_eng` courses. ita_for_eng was already clean from an earlier session
(log `child-voice-rescue-applied-2026-07-24T00-02-49-985Z.json`, 1 gate-failed
row flagged there).

## Starting count

230 child-voice `course_audio` rows across 31 courses (re-queried live before
the sweep; `bul, est, eus, fas, fra_ca, fra, gle, heb, hin, hrv, hye, isl, jpn,
kor, lav, lit, nep, nld, nor, pol, por_br, por, ron, spa, spa_mx, swa, swe,
tha, tur, ukr, zho`).

## Method

Per course: cast purge (any `listening_pods.speakers` entry on a child voice
→ Tom's xAI clone `gfzdpspr5fdp`), then delete+regenerate+relink every
reachable child-voice `course_audio` row, gated by tail-click detection +
whisper phonology check (known clip must detect as the known language),
4 attempts before flagging. Unreachable rows (no pod/course-core link site)
are left in place — deleting assets needs its own approved plan.

## Results — all 31 courses, run foreground one at a time

| course | rows | relinked | orphans left | gate-failed |
|---|---|---|---|---|
| jpn_for_eng | 3 | 3 | 0 | 0 |
| kor_for_eng | 3 | 3 | 0 | 0 |
| spa_for_eng | 3 | 3 | 0 | 0 |
| bul_for_eng | 4 | 0 | 4 | 0 |
| est_for_eng | 4 | 4 | 0 | 0 |
| eus_for_eng | 9 | 7 | 2 | 0 |
| fas_for_eng | 7 | 7 | 0 | 0 |
| gle_for_eng | 7 | 7 | 0 | 0 |
| heb_for_eng | 7 | 7 | 0 | 0 |
| hin_for_eng | 7 | 7 | 0 | 0 |
| hrv_for_eng | 8 | 0 | 8 | 0 |
| hye_for_eng | 7 | 7 | 0 | 0 |
| isl_for_eng | 7 | 7 | 0 | 0 |
| lav_for_eng | 7 | 7 | 0 | 0 |
| lit_for_eng | 7 | 7 | 0 | 0 |
| nep_for_eng | 7 | 7 | 0 | 0 |
| nld_for_eng | 7 | 7 | 0 | 0 |
| nor_for_eng | 7 | 7 | 0 | 0 |
| por_br_for_eng | 7 | 7 | 0 | 0 |
| por_for_eng | 7 | 7 | 0 | 0 |
| ron_for_eng | 7 | 7 | 0 | 0 |
| swa_for_eng | 7 | 7 | 0 | 0 |
| swe_for_eng | 7 | 7 | 0 | 0 |
| tur_for_eng | 7 | 7 | 0 | 0 |
| ukr_for_eng | 7 | 7 | 0 | 0 |
| zho_for_eng | 7 | 7 | 0 | 0 |
| fra_for_eng | 8 | 7 | 1 | 0 |
| fra_ca_for_eng | 10 | 7 | 3 | 0 |
| pol_for_eng | 13 | 6 | 7 | 0 |
| spa_mx_for_eng | 18 | 11 | 10 | 0 |
| tha_for_eng | 14 | 13 | 1 | 0 |
| **total** | **230** | **194** | **36** | **0** |

(jpn_for_eng's first attempt errored 3x on a shell-environment `ffmpeg`
PATH problem in this session — no ebur128 filter found because `ffmpeg` wasn't
resolvable, not a content or infra defect. All 3 rows auto-restored to their
original state by the tool's own rollback; re-run with `ffmpeg` correctly on
PATH succeeded cleanly. Log
`child-voice-rescue-applied-2026-07-24T00-13-57-449Z.json` records the
errored attempt, `...T00-14-17-287Z.json` the clean re-run.)

## Final verification

Live re-query of `course_audio` for `voice_id IN CHILD_VOICE_IDS`:
**36 rows remaining**, matching exactly the orphan counts logged above
(`bul_for_eng`:4, `eus_for_eng`:2, `fra_ca_for_eng`:3, `fra_for_eng`:1,
`hrv_for_eng`:8, `pol_for_eng`:7, `spa_mx_for_eng`:10, `tha_for_eng`:1).
These are rows with no reachable pod-sentence or course-core link — the
tool's designed behaviour is to leave them untouched rather than silently
delete assets. **Zero gate-failure flags** in this run (the phonology +
tail-click gate never needed the 4th-attempt fallback across all 194
regenerated clips).

## Outstanding — not part of this sweep's scope

The 36 orphan rows are dead `course_audio` records (child-voice, unlinked).
Deleting them is a separate approved-plan action per the tool's own
doctrine ("Never delete generated assets without a deletion plan +
approval," CLAUDE.md) — flagging here as the next actionable item, not
auto-actioning it.

## Logs

All per-course JSON logs: `docs/audio-sweeps/child-voice-rescue-applied-2026-07-24T*.json`
(32 files, dry-run sanity checks in `child-voice-rescue-dryrun-2026-07-24T*.json`).
