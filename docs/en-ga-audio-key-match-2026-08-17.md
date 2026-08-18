# en-ga native Irish audio key match — verdict: NO

**Question:** do the ~5,945 unattributed root-level mp3 objects in the SSi S3 bucket match the legacy native-built Irish course's audio index (`old-samples.tsv`)?

**Verdict: NO.** The root-level objects are current TTS-pipeline output (content-addressed UUID v5 hashes of voice+lang+role+cadence+text), generated Dec 2025–Jan 2026. They are not the legacy Irish native recordings.

## 1. Bucket probed

`ssi-audio-stage` (`AWS_REGION=eu-west-1`), read from `.env` in this repo (`S3_BUCKET` / `S3_AUDIO_BUCKET`, confirmed as the bucket actually referenced by `services/s3-audio-service.cjs`, `services/audio-repair.cjs`, `services/phases/phase8-audio-v13.cjs`). Credentials: the repo's `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` in `.env`. No AWS CLI on the box, so all S3 access was via `@aws-sdk/client-s3` (already in `node_modules`).

## 2. Root-level key format

Full census of the bucket root (Delimiter=`/`, no prefix): **5,947 objects** — matches the ~5,945 figure from the earlier scout.

- Extensions: `mp3` (majority), plus a handful of `json`/`txt`
- **3,880** keys are `UPPERCASE-UUID.mp3` (36-char hyphenated)
- **2,067** keys are `lowercase-uuid.mp3`
- 0 mixed-case
- **LastModified range: 2025-12-01 to 2026-01-11** — i.e. all root-level objects are 1.5–2.5 months old, not a legacy archive

5 example keys:
```
0003AACB-D13B-5BF9-8693-4AC82127C6D6.mp3   26180 bytes  2025-12-05T01:27:58Z
00051C24-DFC1-46F4-84CD-1D2A8FD23662.mp3   73440 bytes  2026-01-05T16:46:17Z
00099ba9-9755-4b72-bf3b-4c8369fe835e.mp3   53280 bytes  2026-01-05T12:34:37Z
000B6614-AA3E-5395-B871-BA9C504F6723.mp3   20156 bytes  2025-12-05T01:27:58Z
001fa0cf-ebf7-4343-914f-0a71ae7827c4.mp3   32400 bytes  2026-01-05T12:20:50Z
```
The two case populations are also two date populations: the uppercase batch clusters around 2025-12-05, the lowercase batch around 2026-01-05 — consistent with two separate sync/generation runs, not one coherent legacy corpus.

## 3. Format comparison and match sample

`old-samples.tsv` ids are also 36-char uppercase hyphenated UUIDs, so on format alone the two populations *look* compatible. Sampled **65 ids** from `old-samples.tsv` — head (15), middle (15), tail (15), plus 10 random `source` and 10 random `presentation` rows for role diversity (roles covered: target1, target2, source, presentation). HEAD-checked each id as both `UPPER.mp3` and `lower.mp3` against `ssi-audio-stage`.

**Result: 0/65 hits, upper or lower case.**

```
Total probed: 65
Upper-case hits: 0
Lower-case hits: 0
Any hit: 0
```

This is a strong negative — 65 ids spread across the whole 49,180-row file and all 4 roles, checked in both cases, found zero matches against 5,947 candidate objects.

## 4. Why: root objects are TTS content-hash keys, not legacy ids

Traced the code path that writes bare-root `{uuid}.mp3` keys: `services/production-api.cjs:6533`, inside the audio-sync endpoint. The key is built from `sample.uuid`, which comes from `supabaseClient.generateAudioUUID(voiceId, text, lang, role, cadence)` (`services/supabase-client.cjs:56`) — a **deterministic hash** of `voiceId:lang:role:cadence:text`, not a random or externally-assigned id. This is the current TTS pipeline's content-addressed cache: any (voice, text, language, role, speed) combination always hashes to the same key, root-level, no course prefix.

That explains the 0/65 cleanly: the legacy native-build's `old-samples.tsv` ids are from a different, older ID scheme (their own DB/export system) with no relationship to this hash function — there is no path by which they'd ever collide.

I could not run a byte-size/duration plausibility check or an id-in-`course_audio` check (step 4/6) because there were no hits to check in step 4, and the database was unreachable for step 6 (see Gap below).

## 5. What the root-level mp3s actually are

Confirmed by code, not just inference: they're TTS-generated audio clips synced into `course_audio` by the endpoint at `production-api.cjs` (~line 6420 onward), keyed by the `generateAudioUUID` content hash, for whichever course's phrases were most recently processed through that sync path. Root placement (no `courses/<code>/` prefix) is how this particular endpoint writes them — other code paths (`s3-audio-service.cjs`) write to `courses/{courseCode}/audio/{uuid}.mp3` instead, so this is one specific (older/parallel) write path, not the only one in the codebase.

## 6. Legacy ids in `course_audio` estate-wide — GAP

**Could not run.** Both direct Postgres (`.env.psql`, pooler at `aws-1-eu-west-1.pooler.supabase.com:5432`) and the Supabase REST API (`SUPABASE_URL`) were unreachable for the duration of this task — the pooler returned `FATAL: Failed to connect to database: timeout` / `ECHECKOUTTIMEOUT` on repeated retries, and the REST endpoint returned a Cloudflare **522 Connection timed out**, which points to a Supabase-side outage rather than a scope or credentials problem (both paths use different auth and both failed the same way). This is an **explicit gap**, not a stale substitute: I have not established how many of the 47,704 distinct legacy ids exist in `course_audio`, estate-wide. Re-run once Supabase is reachable:
```sql
-- from old-samples.tsv distinct ids, e.g. loaded into a temp table:
select count(*) from course_audio ca
join legacy_ids li on upper(ca.s3_key) like upper(li.id) || '%' or ca.id = li.id::uuid;
```
(exact join condition depends on how `course_audio.s3_key`/`id` store these — inspect the schema live, don't assume from memory.)

## Bottom line

**NO** — the root-level mp3 objects in `ssi-audio-stage` are not the native Irish recordings referenced by the legacy audio index. They are current-generation TTS output keyed by a content hash of (voice, language, role, cadence, text), generated Dec 2025–Jan 2026, structurally and temporally unrelated to the legacy `old-samples.tsv` ids. 0/65 sampled legacy ids matched any root-level key in either case. Where the actual native Irish recordings live (if they still exist in S3 at all) is undetermined by this task — that would need a scoped search for `_for_`/`ga`/`irish` in existing course prefixes or the `audit-archive/`/`backups/` top-level prefixes also seen in the bucket root listing, which this task didn't probe.

---
**Landing line:** no commits — this was a read-only forensic task. No branch changes were made. The one artefact produced is this report (`docs/en-ga-audio-key-match-2026-08-17.md`) plus two throwaway probe scripts under `scripts/en-ga-audio-key-match/` (gitignored `scripts/` per CLAUDE.md, not committed, not intended to be).
