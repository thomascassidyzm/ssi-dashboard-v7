# cast-vs-rendered — does the voice a course is CAST with match the voice that actually spoke?

Read-only. Nothing here writes, renders, or repairs.

The defect this exists to find was discovered by accident during the per-voice-pace build
(#265/#269): `deu_at_for_eng` target2 is configured as `human_sasha_wanasky_deu_at`, and 96% of the
target2 clips a learner is actually served were rendered by `azure_de-AT-JonasNeural`. Nothing in
the estate compared the two, so nothing could have said so.

## The unit is a SERVED slot, not a library row

`course_audio` is a clip library; a row nobody points at is dead stock. `linked-slots.sql` counts
only clips reachable from `course_seeds.*_audio_id` and `course_practice_phrases.*_audio_id` — what
a learner is actually handed. Judging on library rows instead roughly doubles the apparent problem
(162 slots / 343k clips vs 93 slots / 80k) with superseded stock nobody will hear. `audit.cjs`
reports both, and says per row which unit it judged on: only `known`/`target1`/`target2`/
`presentation` have link columns, so every other role can only be judged on the library.

## Matching is within a provider, by construction

Both sides go through `tryCanonicalVoiceId` (`services/shared/clip-identity.cjs`), so
`en-GB-SoniaNeural` and `azure_en-GB-SoniaNeural` are one voice, and a voice id that cannot be
canonicalised (`legacy_import`, `human_recording`, bare hex ids) is reported as `UNRESOLVED:` rather
than guessed at.

The cast side is resolved through the real reader — `applyLanguageCast` — not a reimplementation, so
the language cast, the human-voice guard and the course override all behave here exactly as they do
on the render path.

## Two classifications that are NOT defects, and why

- `human-vs-TTS-expected` — Welsh, Breton and Pennsylvania Dutch are human-recorded and permanently
  excluded from every TTS render queue. A human clip disagreeing with a TTS-shaped config is the
  expected state there, so it gets its own bucket and is never counted as a mismatch (Tom, 2026-09-08).
- The language cast (`voice_language_roles`) landing after the audio was rendered. The cast is a
  decision about FUTURE renders; comparing it to existing clips reports the whole estate as
  divergent, which is true and useless. `cast_source` on each row says whether the cast reached that
  slot, and the two comparisons are kept apart on purpose.

## Running it

    psql "$DATABASE_URL" -A -F$'\t' -t -c "select course_code, role, voice_id, origin, count(*) \
      from course_audio group by 1,2,3,4" > $CS_SCRATCH/agg.tsv
    psql "$DATABASE_URL" -A -F$'\t' -t -f linked-slots.sql > $CS_SCRATCH/linked.tsv
    # plus courses.json / voices.json / roles.json / humanrows.json as jsonb_agg dumps
    node tools/qa/cast-vs-rendered/audit.cjs

Full-estate cost, measured 2026-09-08: 12.5 s for the library aggregate, ~40 s for the link join.
Pre-flight on one course first — it is ~8 s and it is what proves the join shape before paying at
scale.
