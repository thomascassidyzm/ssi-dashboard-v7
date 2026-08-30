# What a human recording actually does to the database

Read-only trace, 2026-08-11. Question: when a human whole-phrase take is uploaded for a
phrase/lego that **already has a clip** (e.g. a glued/concatenated placeholder), what does
the write path do to `course_audio` and its links?

Short answer: **five paths land human audio, and only one of them supersedes cleanly.**
The four recorder paths swap the bytes under a stable id and never bump `audio_revision`,
so every learner who already cached that clip keeps the old bytes permanently.

---

## Per-path table

| # | Path | Entry point (file:line) | New row or in-place? | `audio_revision` bump + ledger | `audio_stamp` / `content_stamp` | MV refresh |
|---|------|------------------------|----------------------|-------------------------------|--------------------------------|-----------|
| P1 | Autocue **regeneration** (re-record an existing clip) | `services/production-api.cjs:4394` → `:4544-4557` | **UPDATE IN PLACE** — same uuid, new `s3_key`, `origin='human'` | **NO** — neither | both, by DB trigger | no (not needed) |
| P2 | Autocue **script** mode (new course, no clip yet) | `services/production-api.cjs:4410`, `:4423` | **neither** — no `course_audio` row is written at all | n/a | n/a | n/a |
| P3 | **Pod** mode (dialogue autocue) | `services/production-api.cjs:4565-4575` → `services/voice-engine/pods-registration.cjs:266-279` | **UPSERT** on the 5-col key: in-place if a row exists for that voice, else INSERT + explicit FK re-point | **NO** — neither | both, by DB trigger | no |
| P4 | **Voice-engine** whole-take / splice job | `services/voice-engine/synthesis-job.cjs:336`, `:433` → `services/voice-engine/db.cjs:146-166` | **UPSERT** on the same 5-col key: in-place if same voice, else new row | **NO** — neither | both, by DB trigger | no |
| P5 | **Audio-repair upload** (`source:'upload'`) | `services/api/audio-repair-routes.cjs:86` propose → `:138` accept → `services/audio-repair-core.cjs:686-712` | **UPDATE IN PLACE**, deliberately same id | **YES** — ledger row written *first* (`:686`), then `audio_revision = prev+1` (`:710`) | both | no |

Client entry points: `src/composables/useAutocueState.js:572-580` (sends `uuid: phrase.id` → P1);
`src/composables/useAudioUpload.ts:46`, `:194` (generic queue, carries `metadata.uuid`);
`src/components/production/autocue/AutocueStudio.vue:352-357` (`uuid:null, mode:'script'` → P2);
`src/utils/podRecordingPlan.js:229` (`mode:'pod'` → P3).

`services/course-builder-api.cjs` handles no audio at all — it is a ~91-line text-content shell
(`services/course-builder-api.cjs:1-13`).

---

## The four questions, answered

### 1. Insert-and-repoint, or update-in-place?

**In-place, everywhere it matters.** No path in the estate mints a new row and re-points the
FK columns for a same-voice replacement. P1 patches `{s3_key, origin, duration_ms,
file_size_bytes}` on the existing row (`production-api.cjs:4545-4555`); P3/P4 upsert onto
`unique_course_audio_per_voice`, which resolves to an UPDATE when the voice matches
(`pods-registration.cjs:268`, `voice-engine/db.cjs:160`); P5 patches the row with the id
explicitly held constant and asserts it did not move (`audio-repair-core.cjs:706-728`).

Because the id never moves, **no FK ever needs re-pointing** — `course_legos`,
`course_practice_phrases`, `course_seeds`, `lego_introductions` and `listening_pod_sentences`
all keep pointing at the same uuid and silently start serving different bytes. P5 additionally
asserts the link census is byte-identical either side of the swap (`audio-repair-core.cjs:737-745`).

The one case that DOES create a new row: **P3/P4 when the human take's `voice_id` differs from
the existing clip's** (which is the normal case for a human replacing a TTS or glued clip).
That INSERT fires the `audio_autolink` trigger — and the trigger, the `link_all_audio_ids` RPC
and the JS fallback **all only fill FK columns that are already NULL** (live trigger source:
`... WHERE known_audio_id IS NULL AND ...`; RPC: `WHERE cl.known_audio_id IS NULL`;
`services/phases/phase8-audio-v13.cjs:1459` `.is(audioCol, null)`).

> **So a human recording made at a new voice does not take the slot from an existing glued
> placeholder.** The FK is non-null, so nothing displaces it. The human clip lands in the table
> and is never played. `linkAudioIds`' "human-first pre-pass"
> (`phase8-audio-v13.cjs:1363-1383`) only wins the race for slots that are *still empty*.

### 2. Revision bump and the revisions ledger?

**Only P5.** `grep -c audio_revision` over `services/production-api.cjs` and
`services/voice-engine/pods-registration.cjs` returns **0** for both. `course_audio_revisions`
is written in exactly one place: `services/audio-repair-core.cjs:686`.

This is the serious finding, and the codebase already documents why. The learner-facing ref is
built by `buildAudioRef` (`ssi-learning-app/api/_utils/audioAccess.ts:129`, mirrored client-side
at `packages/player-vue/src/providers/revisedAudioRefs.ts:65`):

```ts
return revision && revision > 1 ? `${id}.v${revision}` : id
```

With `audio_revision` still 1, the ref stays a **bare uuid**. Downstream:

* IndexedDB `ssi-audio-cache-v2` keys blobs by audio **id**, never by URL
  (`packages/player-vue/src/cache/AudioCache.ts:23`; the reasoning is spelled out at
  `revisedAudioRefs.ts:14-24`);
* `/api/audio/:id` serves `Cache-Control: public, max-age=31536000, immutable`
  (`ssi-learning-app/api/audio/[audioId].ts:150`).

The `courses.audio_stamp` trigger **does** fire for P1/P3/P4 — it is
`AFTER UPDATE OF audio_revision, s3_key ... WHEN (OLD.audio_revision IS DISTINCT FROM
NEW.audio_revision OR OLD.s3_key IS DISTINCT FROM NEW.s3_key)` (verified live; DDL at
`ssi-learning-app/supabase/migrations/20260806_course_audio_stamp.sql:58-66`) — and that drops
the client's script cache (`packages/player-vue/src/composables/useScriptCache.ts:463-477`).

**But that rescues nothing here**, and the code says so in as many words
(`revisedAudioRefs.ts:21-23`): *"Dropping the script cache on an `audio_stamp` move does NOT fix
this: the regenerated walk produces bare uuids again."* The refetched script hands back the same
bare uuid, the IndexedDB blob still hits, the HTTP cache still hits.

**Net: for P1/P3/P4, a learner who has already played the old clip hears the old clip forever.
A learner who has not cached it gets the new bytes.** For P5 the ref moves to `<uuid>.v2`, both
caches miss, the new bytes arrive, and the old ref keeps serving the old bytes for free rollback
(`audioAccess.ts:145-175`).

### 3. `content_version` / `version` / `audio_stamp` / MV refresh?

* `courses.audio_stamp` and `courses.content_stamp` — bumped **automatically by DB triggers**
  on every path, no application code involved (live triggers `course_audio_touch_audio_stamp`
  and `course_audio_touch_content_stamp`).
* `courses.content_version` and `courses.version` — **never touched** by any upload path.
  `content_version` is the hand-bumped "clear everything" escape hatch
  (`20260806_course_audio_stamp.sql:24-26`).
* **`REFRESH MATERIALIZED VIEW course_round_index` — never needed, correctly.** The live
  matview definition selects from `course_legos` only (`lego_id, seed_number, lego_index`,
  `WHERE is_new = true`); it does not read `course_audio` at all. The only refresh call site in
  the repo is the manual `tools/refresh-round-index.cjs:52`.

### 4. Is the old clip deleted? Make-before-break?

**Nothing is deleted, anywhere.** No upload path issues a DELETE against `course_audio` or S3.
The superseded S3 object stays at its old key on every path:
`production-api.cjs:4421-4422` ("the old object stays at the old key for reversibility"),
`pods-registration.cjs:262-263` ("the old take's row and S3 object are kept"),
`audio-repair-core.cjs:50-53`.

Ordering:
* **P5 is fully make-before-break** — propose renders/masters/verifies and uploads to a
  candidate key, and accept HEADs the candidate object before touching the row
  (`audio-repair-core.cjs:657-661`), writes history before the swap, and rolls both back on
  failure (`:786-792`).
* **P1/P3/P4 are "PUT then update"** with pre-PUT validation, which is the same shape: the
  uuid lookup (`production-api.cjs:4446-4463`), pod-identity resolution (`:4432-4441`), the
  unprocessed-audio refusal (`:4496-4502`) and the silent-take refusal (`:4516-4524`) all run
  *before* the S3 PUT, so a bad take never orphans bytes and never repoints a live slot at an
  unplayable stub. Nothing is deleted, so §6b's "deletion never precedes a verified
  replacement" is satisfied trivially.

---

## The unique constraint

**Not** `(course_code, text, voice_id)`. Live:

```
"unique_course_audio_per_voice" UNIQUE CONSTRAINT,
  btree (course_code, text_normalized, language, role, voice_id)
```

Five columns. **It does not force delete-before-insert for a same-voice replacement** — the
upsert paths (P3/P4) land on it and UPDATE, and P5 deliberately keeps
`text/text_normalized/language/role/voice_id` out of its patch precisely so the key is never
disturbed (`audio-repair-core.cjs:703-705`). The old delete-then-insert dance and the tombstone
hack in `tools/repair-presentation-clips.cjs` exist only because *older* repair tools minted new
ids (`docs/audio-repair-2026-08-05/non-destructive-repair.md:13`).

Also live on the table: `CHECK (origin IN ('tts','human'))`, and `origin='human'` is the
precious-audio guard TTS regeneration refuses to overwrite
(`phase8-audio-v13.cjs:4198-4205`, `:4433-4441`, `:5010-5027`).

## How a human take is voiced and keyed

* **P1 does not set `voice_id` at all.** It patches only `{s3_key, origin, duration_ms,
  file_size_bytes}` (`production-api.cjs:4545`). The human take therefore **inherits whatever
  `voice_id` the TTS row had** — the row now claims a synthetic voice spoke it. `voice_id` is
  resolved server-side (`:4630-4640`) but only for the `recording_provenance` record, never
  written to `course_audio`.
* **P3** resolves the cast voice server-side from `voice_config.podCast[speaker]` before the PUT
  and writes it onto the row (`pods-registration.cjs:259`); client `metadata.voiceId` is advisory.
* **P4** uses `job.voiceId` (`synthesis-job.cjs:341`, `:438`).
* **P2** writes no row, so nothing is keyed.

---

## Verdict, plainly

1. **A new human recording does not cleanly supersede an existing clip on any of the four
   recorder paths.** It swaps the bytes under a stable uuid without bumping `audio_revision`,
   so the served ref never changes, so both learner caches (IndexedDB by id, HTTP immutable for
   a year) keep returning the old audio to anyone who already played it. The `audio_stamp`
   script-cache drop fires but cannot help, because the refreshed script regenerates the same
   bare uuid — the codebase states this explicitly at `revisedAudioRefs.ts:21-23`.
2. **The one path that does it right is the audio-repair upload** (`propose` with
   `source:'upload'` → `accept`): same id, ledger row, revision bump, versioned ref, link-census
   assertion, free revert. That machinery already exists and the recorder paths simply do not
   use it.
3. **Second, quieter failure:** when the human take is recorded at a *different voice* from the
   clip in the slot (the normal case for replacing a glued placeholder), P3/P4 INSERT a new row —
   and every linker in the estate only fills NULL FKs, so the slot keeps pointing at the
   placeholder and the human recording is never played.
4. Nothing is ever deleted, so no make-before-break violation and no data loss — the old bytes
   and old rows are all still there.
5. No MV refresh is needed; `course_round_index` doesn't touch audio.

---

## Explicit gaps

* **`supabase/schema.sql` does not exist in Popty**, contrary to `CLAUDE.md`'s "DB schema source
  of truth" pointer. The real snapshot lives at
  `/home/tomcassidy/SSi/ssi-learning-app/supabase/schema.sql` — and **that snapshot is itself
  stale**: at `:5663-5683` `course_audio` has no `audio_revision`, there is no
  `course_audio_revisions` table, and `courses` has no `audio_stamp`, even though the snapshot
  was committed 2026-08-11 (`a0997a9f`). All three **are live** — I verified every schema claim
  above by read-only introspection against the live DB via `.env.psql`, not from the snapshot.
* **CDN in front of S3**: not determined. `/api/audio/:id` proxies with a one-year immutable
  header, but whether an edge cache sits in front of the S3 objects themselves could not be
  established from code or config in either repo.
* **Whether P3's superseded pod rows are ever garbage-collected**: no reaper found. Assumed kept
  indefinitely, consistent with the "old row + object kept" comments, but absence of a tool is
  not proof of absence.
* **Runtime confirmation** that a real learner device serves stale bytes after a P1 upload was
  not attempted — this is a static trace plus live schema introspection only. The mechanism is
  documented in the learning-app's own comments (`useScriptCache.ts:434-455` records exactly this
  class of bug observed live on 2026-08-06), but I did not reproduce it.
