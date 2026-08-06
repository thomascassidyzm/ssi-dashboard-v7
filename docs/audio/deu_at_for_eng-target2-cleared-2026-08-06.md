# deu_at_for_eng — target 2 cleared for human recording (2026-08-06)

**Course code: `deu_at_for_eng`** — "Austrian German for English Speakers", status `draft`,
target `deu` (de-AT) / known `eng`.

Authorised by Kai: *"I'd prefer it if you just cleared target 2 anyway, it won't hurt."*
No TTS was generated. No spend. Delete-and-verify only.

## What target 2 was

`voice_config.voices.target2` was flipped to a human slot on 2026-08-04:

```
voiceId: human_sasha_wanasky_deu_at   provider: human
assignedEmail: sasha.wanasky@gmail.com
previousVoice: { voiceId: de-AT-JonasNeural, provider: azure }
```

…but the 12,411 Azure Jonas TTS clips were never removed. They are now.

## Rows cleared

**12,411** rows deleted from `course_audio` — every row matching
`course_code = 'deu_at_for_eng' AND role = 'target2'`, all of them
`origin = 'tts'`, `voice_id = 'azure_de-AT-JonasNeural'`. Nothing else was touched.

The FK cascades (`ON DELETE SET NULL`) also cleared the `target2_audio_id` pointers on
668 seeds, 1,259 legos and 12,551 practice phrases — that is the intended effect of
clearing the slot.

## Before / after

| Slot | clips before | clips after |
|---|---|---|
| known (azure Sonia 10,415 + xai eve 1,604 + gfzdpspr5fdp 957 + azure_ 13) | 12,989 | **12,989 — unchanged** |
| target1 (azure de-AT-Ingrid 11,645 + narakeet fritzi 766) | 12,411 | **12,411 — unchanged** |
| presentation (xai gfzdpspr5fdp) | 1,767 | **1,767 — unchanged** |
| target2 (azure de-AT-Jonas) | 12,411 | **0** |

Also unchanged: instruction 48, encouragement 48, welcome 1.

Link counts after: seeds target1 668/668, known 668/668; legos target1 1,259/1,259,
presentation 1,253; phrases target1 12,551/12,551, presentation 1,300. target2: 0 everywhere.

Estate check: `content_audit_log` shows exactly 12,411 `course_audio` DELETE entries in
this window, all `deu_at_for_eng` / `target2`. No other course lost a clip.
(There are 94 earlier `deu_at_for_eng` *known-side* deletes logged at 18:59–19:06 UTC —
before this job's baseline was taken, from another process, not from this work. The known
count is identical before and after this job.)

## Rollback path

`docs/audio/deu_at_for_eng-target2-clear-snapshot-2026-08-06.json.gz` (committed) holds:

- all 12,411 deleted rows, every column including `s3_key`, `duration_ms`,
  `word_boundaries`, `text`, `voice_id`, `origin`, `created_at`;
- the 668 seed / 1,259 lego / 12,551 phrase link mappings, so the pointers can be
  restored too.

**The S3 objects were NOT deleted** — 12,411 distinct keys, all still in place. Restoring
the rows from the snapshot and replaying the link mappings is therefore a complete
rollback. (Deleting generated assets needs its own plan and approval; it was not in scope
and was not done.) Apostrophes survived the round trip — 1,246 snapshot rows contain one
(`i wü's lernen` etc.), verified after write.

## Recording tool, with target 2 empty

`generateRecordingScript('deu_at_for_eng', { role: 'target2', excludeRecorded: true })`:

- **496 phrases** to record, **0** direct-record items, **100.0% LEGO coverage**,
  60.3% effort reduction, est. ~67 min for both passes.
- The autocue interleaves natural + slow, so **992 queued items** for the recordist.
- Identical to what `role: 'target1'` returns (496/0), i.e. clearing changed nothing about
  the queue — as expected, since the optimizer only excludes prior *human* takes and this
  course has none (`origin`: 27,264 tts, 0 human).

## Schema change this required (please note)

The delete was initially unrunnable — a single 1,000-row batch ran >10 minutes without
finishing. Cause: two columns that reference `course_audio` had **no index**, so every
deleted row forced a sequential scan:

- `course_practice_phrases.presentation_audio_id` — 899k rows / 1.6 GB
- `course_audio_envelope.audio_id` — 520k rows / 58 MB

Two indexes were created `CONCURRENTLY` (additive, no lock, no data change):

```sql
CREATE INDEX CONCURRENTLY idx_practice_phrases_presentation_audio
  ON course_practice_phrases (presentation_audio_id) WHERE presentation_audio_id IS NOT NULL;
CREATE INDEX CONCURRENTLY idx_course_audio_envelope_audio
  ON course_audio_envelope (audio_id);
```

After that the same work finished in about two minutes. They were **kept**, deliberately:
the pathology is estate-wide — *any* `course_audio` delete on *any* course hits it — and
dropping them would restore it. They are not in `supabase/schema.sql`; that snapshot needs
regenerating, or a migration adding these two, which is not done here.
