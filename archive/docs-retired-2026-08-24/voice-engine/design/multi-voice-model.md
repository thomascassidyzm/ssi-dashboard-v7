# Multi-voice data model — the keystone decision

*2026-06-10. Parameterizes the synthesis engine, recorder shell, and roster builds. Derived from the
audit (esp. `../audit/06-data-model.md`, `04-synthesis.md`); chosen for zero-DDL viability today.
Forks resolved per Tom's go on the stated leans (2026-06-10).*

## The core insight

Human voices ride the **same slots TTS already uses**. Nothing downstream changes.

- A course's voices live in `courses.voice_config` JSONB: `voices.known / target1 / target2 /
  presentation`, each `{provider, voiceId, speed}`. **Live today, writable without DDL.**
- Serving is hard-wired to exactly two target voices via `known_audio_id / target1_audio_id /
  target2_audio_id` FKs on `course_legos` / `course_practice_phrases`.
- `course_audio` has `role` and `voice_id` columns, and the **live unique index includes `voice_id`**
  (5-col, live-verified) — per-voice rows are representable now.

So: a human voice = `voice_config.voices.targetN = { provider: 'human', voiceId: <human voice id> }`.
The engine writes `course_audio` rows with `role: 'targetN'`, `voice_id: <human voice id>`,
`origin: 'human'`; the existing link pass (now human-preferring) points the FKs at them.

## Decisions

1. **Voice slots are the unit of assignment.** A course has slots `target1`, `target2` (+ `known`,
   `presentation`, and pod speakers later). A leader assigns ONE helper to ONE slot. The helper records
   the full minimal script (~150 phrases ≈ ~35 min reading) for that slot. No per-phrase division of
   labour inside a slot — splice space partitions hard by `(voice_id, cadence)`; mixing recorders
   inside a slot would splice two larynxes into one phrase.
2. **>2 spliced voices is out of scope** (would need schema surgery on the FK columns). Extra voices
   appear only in listening/pod content as **whole-utterance takes, never spliced** — separate,
   later workstream.
3. **`voice_id` format:** `human_{email-localpart}_{course target lang}`, minted at slot-assignment
   time (NOT invite time — the invite-time minting keyed to the first course's language and is NULL
   for all 7 live users anyway). On collision append `_2`, `_3`, …. Stored on `dashboard_users.voice_id`
   AND in `voice_config.voices.targetN.voiceId` — the latter is canonical for the course.
4. **Upload stamping:** the recorder records *for a slot*. Autocue passes `role: <slot>` (killing the
   `target1` hard-code) and the server resolves slot → `voiceId` from `voice_config`, stamping both
   into `recording_provenance` (and onto any `course_audio` writes). Identity comes from the
   authenticated session, not client assertion.
5. **Cadence:** the recording script interleaves natural + slow takes. Both are uploaded and kept.
   Alignment runs on the **slow** take (clean gaps; align-audio's zero-ML slow-gap mode — aeneas not
   installed, don't depend on it); spliced output assembles **natural** chunks. A recorded whole-phrase
   natural take is ALWAYS preferred over splicing that same phrase — splice only the uncovered ~1350.
6. **Spliced output rows:** `origin='human'` (live CHECK allows only `tts`/`human`; adding `'splice'`
   is a deferred migration for Tom). Provenance records `method: 'spliced'` vs `'take'` so the two are
   distinguishable. The origin guard (safety build) protects both from TTS regen.
7. **Segments (chopped LEGO clips):** stored in S3 under `segments/{courseCode}/{voiceId}/…` with a
   JSON manifest object alongside (no DDL for a segments table today). If `recording_provenance`
   turns out to have a usable JSONB column, the manifest may live there instead — engine builder's
   call, but the S3 manifest is the default. The deferred `recording_sessions`/`phrase_recordings`
   migration (apml/core/human-recording-v1.apml) replaces this later.
8. **DB-keyed, never filename-keyed.** The CLI tools' Latin-only `safeFilename` collapses Cyrillic
   (Macedonian = Cyrillic). All engine identity flows through UUIDs/DB ids; filenames are opaque.
9. **No TTS spend, ever, in this engine.** The cost being minimised is the recorder's time.

## Roles (fork 1, resolved)

- Resurrect the **`recorder`** tier (still in the schema CHECK; UI-retired 2026-04-21). A recorder
  lands in a minimal record-only shell (teleprompter + their progress), never the admin console.
- `editor` unchanged. Leaders are editors who hold the course; they get a **roster view**: see team,
  remove member, assign voice slots, mint invite codes (invite backend already scopes correctly).
- No new "leader" role this round — the leader IS the course-holding editor.

## Interfaces between the parallel builds

- **Engine input contract:** `recording_provenance` rows carrying `{course_code, s3_key, phrase
  identity (seed/phrase text), chunksString, voice_id, role/slot, cadence, recorded_by}`. The safety
  build is landing the writer side now; integration reconciles exact field names to what it shipped.
- **Recorder shell → upload:** adds `role` (slot) to the existing autocue upload payload; does NOT
  restructure the queue (safety build owns that file territory).
- **Roster → voice_config:** slot assignment writes `voice_config.voices.targetN` and
  `dashboard_users.voice_id`. The engine and recorder both READ voice_config; only roster writes it.
