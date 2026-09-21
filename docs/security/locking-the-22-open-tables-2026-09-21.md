# Locking the 22 open tables — who would actually lose access

**Answer: nobody.** Not a learner, not a teacher, not even a Popty screen. All 22 tables are still exactly the 22 the audit named, confirmed against the live catalogue this morning. Every one of them is content-pipeline plumbing: **14 hold zero rows** (the `_canon_*`, `_fix_*`, `_converge_*`, `_divergence_partition`, `_audit_s3_touch` staging scratch), and the 8 with rows are audio-clip ledgers, the language-code lookup, the voice-casting registry, the pod walk-step store and the script-edit history. **The learner app does not reference a single one of them** — not in `player-vue`, not in the Vercel routes under `api/courses/[code]/*`, not in the `/schools` teacher dashboard. Zero hits across the whole repo apart from the committed `schema.sql` dump. **Every consumer that does exist is Popty server-side on the service-role key or a `tools/` script on the direct `DATABASE_URL`** — both of which bypass RLS and anon grants entirely, so a revoke cannot touch them. Popty's browser SPA never creates a Supabase client at all; it talks to its own HTTP API. So the split you asked about is: 22 safe to lock outright, 0 needing anon READ kept, 0 carrying a learner or teacher path.

Evidence: live `pg_class` / `has_table_privilege` / `pg_trigger` / `pg_proc` reads, plus greps over `ssi-learning-app` and `ssi-dashboard-v7-clean`. No document was used as a source.

## Per-table

| Table | Rows | Last write | Who reads/writes it | With which key | Breaks a learner? | Breaks a teacher? |
|---|---|---|---|---|---|---|
| `audio_clips` | 746,535 | 14 Aug | `tools/promote-accepted-clips-to-mastered.cjs`, `tools/repair-nonserving-course-audio.cjs`, `tools/qa/sibling-identity/register.cjs`; DB fn `course_audio_link_canonical_clip` | direct `DATABASE_URL` (postgres) / service-role | **NO** | **NO** |
| `audio_convergence_log` | 204,262 | 14 Aug | same two repair/promote tools (INSERT only) | direct `DATABASE_URL` | **NO** | **NO** |
| `relink_refusals` | 14,875 | 10 Sep | written by DB fns `link_audio_to_content` / `link_all_audio_ids`, fired by the `audio_autolink` trigger on `course_audio`; `phase8-audio-v13.cjs` only names it in a log line | service-role (anon/authenticated have SELECT-only on `course_audio`, so the trigger never fires for them) | **NO** | **NO** |
| `audio_clip_promotions` | 334 | 14 Aug | DB fn `course_audio_link_canonical_clip` only; no app call site | service-role | **NO** | **NO** |
| `language_canonical` | 203 | — | DB fn `canonical_language()` (via `course_audio_canonical_identity` trigger on `course_audio`); `tools/generate-language-canonical-sql.cjs`, audio-regen probe | service-role writes only; the trigger cannot fire for anon | **NO** | **NO** |
| `voice_language_roles` | 146 | **today 12:12** | Voicelab: `services/voicelab/router.cjs`, `voice-config-service.cjs`, `production-api.cjs`, `phase8`, `tools/pod-sync.cjs`, voice QA tools. The Voicelab UI (`labApi.js`) reaches it only through `/api/voicelab/*` | service-role / direct `DATABASE_URL` | **NO** | **NO** |
| `canonical_pod_walk_steps` | 709 | 1 Sep | `production-api.cjs` route `GET /api/admin/canonical-pods/:slug`; `tools/pods/*` ingest/sync scripts | service-role (route is `requireAdmin`); tools on `DATABASE_URL` | **NO** | **NO** |
| `canonical_script_versions` | 45 | 16 Sep | Script Lab line editor `api/canonical-script.js` (Vercel route) | **service-role** — `api/lib/supabase.js` builds its client from `SUPABASE_SERVICE_ROLE_KEY`; the user's JWT is only used to verify the admin, never to query | **NO** | **NO** |
| `_fix_plan` | 0 | — | `tools/repair-nonserving-course-audio.cjs` reads it | direct `DATABASE_URL` | **NO** | **NO** |
| `_canon_alive` | 0 | — | no consumer found in either repo (searched all of `ssi-learning-app` and `ssi-dashboard-v7-clean` excluding `node_modules`/`archive`; only hit is `supabase/schema.sql`) | — | **NO** | **NO** |
| `_canon_lang_map` | 0 | — | no consumer found in either repo | — | **NO** | **NO** |
| `_canon_reselect` | 0 | — | no consumer found in either repo | — | **NO** | **NO** |
| `_canon_stage` | 0 | — | no consumer found in either repo | — | **NO** | **NO** |
| `_canon_voice_map` | 0 | — | no consumer found in either repo | — | **NO** | **NO** |
| `_converge_probe` | 0 | — | no consumer found in either repo | — | **NO** | **NO** |
| `_converge_set` | 0 | — | no consumer found in either repo | — | **NO** | **NO** |
| `_divergence_partition` | 0 | — | no consumer found in either repo | — | **NO** | **NO** |
| `_fix_broken` | 0 | — | no consumer found in either repo | — | **NO** | **NO** |
| `_fix_lang_map` | 0 | — | no consumer found in either repo | — | **NO** | **NO** |
| `_fix_serving` | 0 | — | no consumer found in either repo | — | **NO** | **NO** |
| `_fix_voice_map` | 0 | — | no consumer found in either repo | — | **NO** | **NO** |
| `_audit_s3_touch` | 0 | — | no consumer found in either repo | — | **NO** | **NO** |

## The two things that could have hidden a path, and did not

- **The security-definer views.** The five `security_invoker=off` views anon can read (`course_human_recorded_roles`, `human_clip_speakers`, `voice_guide_in_use`, `serving_pod`, `pod_text_divergence`) read `course_audio`, `courses`, `listening_pods` and `listening_pod_sentences` — **none of them touches any of the 22**. No back door.
- **The triggers.** Two triggers reach into this set: `audio_autolink` on `course_audio` (writes `relink_refusals`) and `trg_course_audio_canonical_identity` on `course_audio` (reads `language_canonical`). Both functions are SECURITY INVOKER, so a lock *would* break them for a caller without the grants — but anon and authenticated hold **SELECT only** on `course_audio`, so neither trigger can ever fire for them. Only service-role writes `course_audio`, and service-role is unaffected.

## One thing worth a line

`link_all_audio_ids`, `link_audio_to_content` and `course_audio_link_canonical_clip` are all **EXECUTE-granted to anon** and are SECURITY INVOKER. Today that plus the open table grants means the public key can drive the relink machinery directly. Revoking the table grants closes that by itself. Not chased further.

## Gap

I established this from the live catalogue and from the code in the two repos. If anything **outside** those two repos uses the public anon key against these tables — an n8n flow, a one-off script on another box, a Retool — I cannot see it and did not look. And I ran no canary: nothing was executed as the `anon` role, so this is a reasoning verdict from grants and call sites, not an observed one.
