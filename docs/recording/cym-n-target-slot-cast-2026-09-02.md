# cym_n_for_eng target slots cast — Catrin = target1, Aran = target2

2026-09-02. Executed against the live DB. Tom's decision (relayed via Command); this doc records
only *how the slot split was chosen* and what was verified.

## Which route was taken: **no pattern found — the tie-break was used**

Catrin = target1, Aran = target2, on Tom's own recollection that Catrin comes first.

The existing clips genuinely do not establish a slot pattern. What I read:

| evidence | what it says |
|---|---|
| `course_audio` for cym_n_for_eng, grouped by role + voice_id | **Every** human-minted clip sits on `role='target1'`: Aran 81 (`human_aran_cym_n`) + 42 (`human_aran_cym_n_2`), **and Catrin 56** (`human_catrinlliar_cym_n`, 2026-08-23). `target2` carries nothing but `legacy_import`. |
| the 19 seed rows that already have takes | `target1_audio_id` and `target2_audio_id` both point at `voice_id='legacy_import'` — no speaker attribution at all. |
| `recording_provenance` | zero rows for either Welsh course (as the 2026-08-19 forensics already found). |
| `docs/welsh-eyes-rerecord-list-2026-08-19.md` §2 | Refused to guess. Its one weak signal — "all 111 non-legacy tags are on target1, so maybe target1 = Aran" — is now **dead**: Catrin's 56 clips landed on target1 too. `target1` is where booth uploads land by default, not an attribution. |

So the signal the prior investigation flagged as narrow is not just narrow, it is contradicted. Tie-break it is.

## The write

`courses.voice_config.voices.target1/.target2` for `cym_n_for_eng`, via the canonical
`assignVoiceToSlot()` surgical merge (same transform `POST /api/production/:course/team/assign-slot`
applies), plus `bumpCourseVersion` patch and the `dashboard_users.voice_id` mirror.

- `target1` → `human_catrinlliar_cym_n` (Catrin, catrinlliar@gmail.com), provider `human`
- `target2` → `human_aran_cym_n` (Aran, aran@hey.com), provider `human`
- Both voice ids are the canonical ones in `language_recording_policy` for `cym` — not new mints.
- `aran@hey.com` had `voice_id = null`; now mirrors `human_aran_cym_n`.
- Asserted before writing: neither slot already held a human (abort on drift); `known`, `presentation`
  and every non-`voices` key byte-identical afterwards. Read back from the DB after the write.
- content_version 0.0.2 → 0.0.3.

Nothing else touched: no other course's casting, no `podCast` entry for cym_n_for_eng.

## The queue was broken as well, and is fixed

Baselining the queue first paid for itself: `GET /api/recording/voice/<id>` returned **500** for both
Welsh voices — `"seed clip voice read failed: TypeError: fetch failed"`. Cause: `audioVoicesById`
read seed-clip voice ids 500 uuids per page, PostgREST echoes the whole `id=in.(...)` filter in a
response header, and ~22KB of headers trips undici's `UND_ERR_HEADERS_OVERFLOW`. cym_n + cym_s carry
504 such ids, so the *first* page failed and the whole Welsh queue was dead — the cast would have
changed nothing visible. Page size is now 100 (~4.5KB), reason written into the code.

Landed as `21a00ee5f` on `main`; the prod checkout was pulled and `popty-production-api` restarted.

## Verified live, after the write and the fix

| voice | display | seed lines in queue | role |
|---|---|---|---|
| `human_catrinlliar_cym_n` | Catrin | **305** | all `target1` |
| `human_aran_cym_n` | Aran | **305** | all `target2` |

First line for each is seed 1, `dw i isio siarad Cymraeg` / "I want to speak Welsh".

**Correction to the brief's number:** it is **305 lines each, not 93.** cym_n_for_eng has 668 seeds
but only **306 distinct** Welsh sentences, and the queue collapses duplicates by text (one is already
covered), so each recordist sees 305. At a booth pace of a few seconds a line that is roughly
20–25 minutes of reading each, not 8. Both queues also carry their pre-existing pod lines
(Catrin 466 total, Aran 441).
