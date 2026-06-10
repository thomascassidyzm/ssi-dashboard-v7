# Human Voice Engine — READY FOR TESTING

*2026-06-10. Branch `feature/human-voice-engine` (worktree `~/SSi/wt-voice-engine`), 45 commits
on top of the audit (5f4113a8), NOT pushed, NOT merged to main. Confidence it does its job: >90%
— basis and residuals below.*

## What's on the branch

**Safety (the dangerous stuff, fixed first):**
- Course scoping: one `app.param('courseCode')` gate covers all ~180 course routes server-side
  (ngrok/LAN always gated; same-host service mesh exempt by design) + router guard + central
  Authorization wiring (fetch wrapper + axios interceptor).
- Precious-audio origin guard: no TTS path can overwrite an `origin='human'` row (regen-role,
  -single, -presentation(s), -phrase, generate, insert, splice, pods); FK linking prefers human.
- Upload seam: server-minted UUIDs at canon `mastered/` (global `script-N` collision killed),
  re-records repoint their `course_audio` row with `origin='human'`, provenance actually written
  (with `chunksString` + server-resolved `voice_id`), the post-PUT 500 fixed, S3 metadata
  Cyrillic-safe and under the 2KB cap.

**The engine (`services/voice-engine/`):** align (zero-ML slow-gap; QA gate, never guesses) →
segment store (UUID-keyed, Cyrillic-safe, S3 + manifest) → splicer (one `(voice_id, cadence)`
per phrase, recorded-take-beats-splice, gap-report-never-partial, ffmpeg→lame iOS-safe) →
job orchestrator (per course+voice, resume-idempotent, re-records supersede) → human-first link.
Honest `/coverage` endpoint (real counts — `totalLegos × 10` is dead). Mounted behind the gate at
`/api/production/:courseCode/voice-engine/*`.

**The team layer:** `recorder` role resurrected (server-enforced read-only on team routes);
Record Room at `/record/:courseCode` (jargon-free, slot-aware, recorders confined to it);
Team Roster at `/production/:courseCode/team` (assign voice slots → surgical `voice_config`
merge keyed by `assignedEmail`, recorder invite codes, member removal with admin protection).

**The leader's journey:** `/production/:courseCode/journey` — 7 plain-language steps with live
status. Community-course breakers fixed: 300-seed approve gate, `/668` labels, the gendered-
language hard-exclusion (Macedonian works), ScriptViewer defaults, user-facing "source" purged.

**Identity (added at Tom's request, 2026-06-10):** one Supabase account stays the single
authentication for the learning app AND Popty; `dashboard_users` is now THE Popty authorization
authority (`services/shared/popty-identity.cjs`, tested) — editing it always changes effective
access, with `learners` ssi_admin/god as the no-row admin fallback. Verified read-only against
every live identity: all admins keep full access on both auth paths, editors keep exactly their
courses, and team routes now work for dashboard-only users on Supabase sessions.

## How it was verified

- **100/100 unit tests** (engine boundary math, splice plan, cadence-never-mixes, re-record
  supersede, provenance round-trip incl. the PostgREST 1000-row paging, voice_config surgical
  merge, upload helpers, link preference) + `vite build` green.
- **Live boot** on a spare port against the real DB: course-scope gate correct on all four auth
  paths (anonymous-via-XFF 401, garbage token 401, loopback mesh bypass, team defense-in-depth);
  coverage returns real numbers for `cym_anthem_for_jpn`; dry-run synthesis traverses the whole
  pipeline read-only, plans nothing already covered, and gives a clear roster-first error for
  unassigned slots. Live pm2 untouched throughout.
- **Real-speech round-trip locally** (`say`, no TTS spend): slow/natural takes → gap-align →
  proportional transfer → 3 segments → splice → valid 48kHz mono lame MP3.
- **Three adversarial review rounds** (2 on safety, 4-lens on the integrated diff); every
  confirmed BLOCKER/MAJOR fixed — including provenance pagination, a recorder→editor invite
  escalation, and re-records-never-superseded.

## The one empirical unknown

Alignment quality on **real microphones** (room noise, breath, soft gaps) — every automated
fixture is clean audio. The engine's failure mode is designed-honest: chunk-count mismatch →
QA flag + re-record request, never a guessed cut. This is exactly what the human test answers.

## Your test script (the E2E only a human can run)

Small course, two browser profiles (leader + a second email as recorder):
1. **Journey**: `/production/<course>/journey` — steps read sensibly, statuses live.
2. **Team**: invite a recorder (copy the `/record/<course>` link), assign yourself `target1`
   → check `courses.voice_config` gained `{provider:'human', voiceId, assignedEmail}`.
3. **Record**: in the Record Room, read ~10 script phrases (both cadences) → uploads succeed,
   `recording_provenance` rows appear (context JSON in `quality_notes`), S3 keys under `mastered/`.
4. **Synthesize**: dry-run from the journey, then the real `POST .../voice-engine/synthesize`
   → spliced `course_audio` rows (`origin='human'`), **listen to a spliced phrase**.
5. **Guard**: regenerate-phrase over a human-audio phrase → it rebinds to the human row, no TTS overwrite.

## Needs your decision (deliberately NOT done — DB writes / deploy ritual)

1. **Welsh relabel — DONE 2026-06-10 (Tom approved, run via psql).** 39,351 of 39,391
   `voice_id='legacy_import'` rows now `origin='human'` (19,971 `cym_s_for_eng`, 19,061
   `cym_n_for_eng`, 319 `cym_anthem_for_jpn`) — the origin guard + human-first linking now cover
   the Welsh corpus. Discovery during the run: `trg_course_audio_normalize` recomputes
   `text_normalized` on ANY update, and 3,773 rows carried a stale normalization vintage; in 40
   cases an apostrophe-variant duplicate pair would have collapsed onto one unique key. The
   first attempt aborted cleanly on that; the final run excluded exactly those **40 stale-norm
   duplicate siblings** (19 N + 21 S, still `origin='tts'`, each shadowed by a now-protected
   twin). FOLLOW-UP (small, with Tom): dedup the 40 pairs — check which member the FKs point
   at, repoint if needed, retire the sibling. Revert of the relabel: `SET origin='tts' WHERE
   voice_id='legacy_import' AND origin='human'`.
2. **Deploy coupling**: once merged+restarted, tabs on the old bundle 401 on course routes until
   hard-refresh; an autocue session spanning the restart loses its queued uploads. Coordinate
   with Aran.
3. **Migrations, later**: `origin='splice'` CHECK value; the `recording_sessions` /
   `phrase_recordings` tables (apml human-recording-v1) to replace quality_notes-JSON + S3 manifest.
4. **Still parked** (per brief): Vercel `api/` duplicates + `/api/checkpoint` proxy unauthenticated.
5. **Known v1 limits**: no in-UI course switcher for multi-course recorders; MissionControl's
   `autoCreateQueue` deep-link degrades to manual; crash-window S3 orphans (logged, additive).
