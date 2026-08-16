# Welsh narration lines held out of the recording queues

2026-08-16. Tom's ruling: **Welsh work is pods-only until the provenance of the 18 presentation-narration
lines is known.** He does not recognise them, and the Welsh courses were imported from the old app's
JSON rather than built in Popty — so they may be import artefacts nobody ever chose.

This records the hold. It is a **flag park, not a deletion**: no row deleted, no `course_legos` /
`lego_introductions` pointer touched, no S3 object touched, no audio unlinked.

## What was written

One statement, in a transaction, with a before-state assertion that aborts on drift:

```sql
update course_audio
   set rerecord_wanted = jsonb_build_object(
     'held', rerecord_wanted,
     'held_at', '2026-08-16T00:00:00Z',
     'held_by',  '<the ruling>',
     'hold_reason', '<why>')
 where role='presentation' and rerecord_wanted is not null
   and rerecord_wanted ? 'voice_gender' and not (rerecord_wanted ? 'held');
-- UPDATE 18
```

**Why this shape.** `services/voice-engine/recordist-queue.cjs:336` reads
`rerecord_wanted.voice_gender` and skips any want that does not state one (counting it as `uncast`).
Nesting the original want under `held` removes the top-level `voice_gender`, so the line leaves both
queues while the entire original payload — reason, evidence, detector verdict, `wanted_at` — stays
in the row where it was written. No code change, no new column, and the restore is one statement.

## Restore

```sql
update course_audio set rerecord_wanted = rerecord_wanted->'held'
 where role='presentation' and rerecord_wanted ? 'held';
```

Full before-state, per row: `welsh-narration-wants-held-before-2026-08-16.json` (this directory).

## Verified live, on the served queue

`GET https://popty.app/api/recording/voice/<id>`, before and after:

| Recordist | Before | After | Narration lines (`kind: 'rerecord'`) |
|---|---|---|---|
| Aran `human_aran_cym_n` | 170 total / 170 left | **153 / 153** | 17 → **0** |
| Catrin `human_catrinlliar_cym_n` | 276 total / 276 left | **275 / 275** | 1 → **0** |

Aran cannot now meet an unrecognised line in his first session. The pod work — the whole of it — is
untouched and still queued.

## RESTORED — 2026-08-16, following Tom's ruling on the provenance trace

Tom settled the open question (`welsh-narration-provenance-2026-08-16.md`, published as
[doc 9f4f21f8](https://watson-1.tail4968cb.ts.net/d/9f4f21f8)): **no TTS in the Welsh courses — all 18
are human recordings**, genuinely his own teaching voice. Ruling applied exactly to the doc's own
per-line recommendation table, not a blanket restore:

- **The 17 cym_n lines (measured genuinely end-clipped, tail 0.30–0.53 of p90): restored** — `held`
  key unnested back to the top level, unchanged (`voice_gender: 'm'`, Aran). One statement, in a
  transaction:
  ```sql
  update course_audio set rerecord_wanted = rerecord_wanted->'held'
   where role='presentation' and course_code='cym_n_for_eng' and rerecord_wanted ? 'held';
  -- UPDATE 17
  ```
- **`cym_s_for_eng` `S0301L02` (clean tail, 0.000 — not clipped; the `f` was a routing bug, not a cast
  choice): retired, not restored.** Re-recording it fixes nothing — the audio is correct ("ynoch chi").
  What it needs is a text fix (its stored text is the wrong lead-in), a separate one-row content edit,
  out of scope here.
  ```sql
  update course_audio set rerecord_wanted = null
   where role='presentation' and course_code='cym_s_for_eng' and lego_id='S0301L02'
     and rerecord_wanted ? 'held';
  -- UPDATE 1
  ```

**Landed as a later, named narration session, never at the front of Aran's pods queue.** The 17
restored wants live in `course_audio.rerecord_wanted`, the second source `buildLanguageLines` reads
(`services/voice-engine/recordist-queue.cjs`) — pod lines are collected first, `course_audio` wants are
appended after with `order: Number.MAX_SAFE_INTEGER`, so they land at the tail of the array by
construction, no new grouping code needed.

Verified live, on the served queue:

| Recordist | Before restore | After restore | Narration lines |
|---|---|---|---|
| Aran `human_aran_cym_n` | 153 total / 153 left | **170 / 170** | 0 → **17**, indices 153-169 (all after the 153 pod lines) |
| Catrin `human_catrinlliar_cym_n` | 275 total / 275 left | **275 / 275** (unchanged) | 0 → **0** |

Restore log (18 rows, each with the exact prior/new `rerecord_wanted` state):
`welsh-narration-wants-restored-2026-08-16.json` (this directory).

## The 18

`course_audio` rows, `role='presentation'`, `voice_id='human'`, `origin='human'`:
17 in `cym_n_for_eng` (S0141L01, S0142L01, S0144L01, S0148L02, S0153L01, S0158L02, S0159L01, S0161L03,
S0163L01, S0164L01, S0232L02, S0234L01, S0235L01, S0235L02, S0245L02, S0248L01, S0252L02) and 1 in
`cym_s_for_eng` (S0301L02).

Provenance findings: `welsh-narration-provenance-2026-08-16.md` (same directory).
