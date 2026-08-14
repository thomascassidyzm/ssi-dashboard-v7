# course_audio call-site census — 2026-08-14

Read-only inventory. No code changed, no DB touched, no audio rendered. Built by grepping
`course_audio` across git-tracked `.cjs/.js/.ts/.vue/.sql` files in both repos, then reading each
hit's surrounding code to classify it. Every line number below was read directly; nothing is
guessed.

**Repos searched:**
- `/home/tomcassidy/SSi/wt-canon-audio` (this worktree, branch `feat/canonical-audio-identity-2026-08-14`) — 190 code files reference `course_audio`.
- `/home/tomcassidy/SSi/ssi-learning-app` — 82 files reference `course_audio` (including docs/tests).
- `/home/tomcassidy/SSi/ssi-dashboard-v7-clean-prod` — confirmed **byte-identical** to wt-canon-audio for every one of the 190 code files (`diff` of the two file lists and a commit-hash check both came back clean, same HEAD `cfcdddc2`). Not censused separately — anything found in wt-canon-audio applies there unchanged.

**Gap, honestly stated:** `~/SSi/ssi-dashboard-v7-clean` (the non-worktree main checkout referenced in this repo's CLAUDE.md) was not separately censused — it is the same repo family as `-prod`; if it diverges from `cfcdddc2` this census would miss commits made only there. No Supabase Edge Functions directory was found in either repo (`find . -type d -iname '*function*'` in wt-canon-audio surfaces only `database/functions/`, which contains a single unrelated file, `bulk_update_syllables.sql`, with no `course_audio` reference) — so there is no server-side edge-function call-site class to report.

---

## Repo 1: wt-canon-audio (Popty dashboard)

### Subsystem: api/ (Vercel-style API routes)

| File | Line | R/W | Columns touched | Filters course_code? | Note |
|---|---|---|---|---|---|
| `api/courses/[courseCode]/index.js` | 87 | R | `*` (count only, `head:true`) | Yes — legit membership count | Pure row-count for one course; unaffected by `s3_key` authority. |
| `api/courses/[courseCode]/progress.js` | 78 | R | `*` (count only, `head:true`) | Yes — legit membership count | Same as above. |
| `api/import-course.identity.test.js` | 48 | n/a | — | — | Not a call site; test text only exercises `copiedVoiceId()`, no live `course_audio` query in this file. |
| `api/import-course.js` | 133-135 | W (DELETE) | all columns (row delete) | Yes — deletes a course's own rows before reimport | `clearCourseData()`: wipes `course_audio` for a course_code as part of a full reimport. Once identity moves off `course_code`, this delete pattern must not delete canonical clips other courses reference. |
| `api/import-course.js` | 223-228 | W (UPSERT) | `course_code, text, text_normalized, language, role, cadence, voice_id, origin, s3_uuid, duration_ms` | course_code is part of the write payload/key, not a read filter | `importAudioSamples()`: legacy manifest importer, writes one row per course per sample — this is the exact per-course duplication pattern the audit describes. |
| `api/import-course.js` | 344-349 | W (UPSERT) | `course_code, text, text_normalized, language, role, cadence, voice_id, origin, s3_uuid, duration_ms` | course_code is part of the write payload/key | `copySharedToCourse()`: copies `shared_audio` into `course_audio` per course — another per-course duplicating writer. |
| `api/lib/supabase.js` | 127-131 | R | `*` | No — filters by `id` | Fetches one audio row by its own id; unaffected if `id`→`clip_id` indirection is added, as long as `id` keeps resolving. |
| `api/lib/supabase.js` | 159-165 | R | `*` | **Yes, combined with `text_normalized` + `language`** | `getAudioByText()`-style helper — filters `course_code` AND `text_normalized` together: **this is the by-text-scoped-to-course lookup pattern** (list 3 below). |
| `api/lib/supabase.js` | 189-190 | R (RPC) | RPC `get_course_audio_summary(p_course_code)` | Yes | Calls a DB function — see DB-object list (4) below; function body not in this repo's SQL files (must live in Supabase directly, unconfirmed — flagging as a gap). |
| `api/lib/supabase.js` | 264-267 | R | `id` | Yes — legit membership listing | Gets all audio ids owned by a course. |
| `api/lib/supabase.js` | 394-395 | R | `*` (count only) | Yes — legit membership count | Dashboard stat. |
| `api/lib/supabase.js` | 415-418 | R | `role, origin` | Yes — legit membership listing | Breakdown by role/origin for one course. |
| `api/pod-content.js` | 118-123 | R | `id, text, s3_key` | **Yes, combined with `role='pod_explainer'` and `text` startswith match** | Builds a text→clip map scoped to one course — by-text-within-course pattern. |
| `api/pod-content.js` | 141-146 | R | `id, text, s3_key` | Yes, but `course_code='pod_known_en'` — a **special shared-pool pseudo-course**, not a real course | Interesting precedent: this code already treats one course_code value as a stand-in for "the shared English pool" — informal evidence the estate already wants a canonical pool and worked around the schema to get one. |
| `api/pod-content.js` | 167-170 | R | `id, s3_key` | No — filters by `id IN (...)` | Safe once `id` semantics are preserved. |
| `api/production/[courseCode]/audio-pipeline/plan.js` | 82-85 | R | `text_normalized, text, role, s3_key` | Yes — legit membership listing (builds existing-audio set for planning) | Feeds a planning diff; if `s3_key` moves off this table, this plan step needs to read from the canonical clip store instead. |
| `api/production/[courseCode]/script-view.js` | 26-30 | R | `id, text_normalized, role` | **Yes, combined with `text_normalized IN (...)`** | Batch by-text lookup scoped to one course — by-text-within-course pattern; comment at line 12 explicitly frames this as "v13: Query course_audio directly (flat table, no joins needed)" — i.e. this code was written assuming course-scoped identity is correct. |
| `api/voices/audition.js` | 97-102 | R | `text, text_normalized, language, duration_ms` | Yes — course-scoped, but for building a *sample pool*, not looking up one clip | Ambiguous: reads a batch by course+role, not by specific text — closer to membership listing than by-text lookup, but flagging as uncertain. |
| `api/voices/audition.js` | 116-121 | R | `id, course_code, role, voice_id, text, text_normalized, language, duration_ms, s3_key, veracity_pass, created_at` | No — filters by `text_normalized IN (...)` + `language`, explicitly cross-course | This is a genuine cross-course by-text lookup (no course_code filter at all) — closest existing analogue to the canonical lookup the fix needs. |
| `api/voices/report.js` | 135-140 | R | `text, duration_ms, language, voice_id` (+count) | Yes — legit membership listing for a report | Per-course voice report. |
| `api/voices/report.js` | 173-178 | R | `id, role, voice_id, text, language, duration_ms, s3_key, veracity_pass` | Yes — legit membership listing, ordered sample | Per-course sample listing for a report UI. |

### Subsystem: apml/ (specs)

| File | Line | R/W | Columns touched | Filters course_code? | Note |
|---|---|---|---|---|---|
| `apml/core/audio-registry-v12.sql` | 82-99 | DDL | defines `course_audio(id, course_code, audio_id, role, context, position, created_at)` + unique constraint `(course_code, audio_id, role, context)` + index on `course_code` | n/a | **Stale/legacy shape** — this is the *old* v12 join-table design (course_audio → audio_files by `audio_id`), not the live v13 flat-column schema every other file in this repo uses (`text_normalized`, `s3_key` etc. live directly on `course_audio`). Confirms v13 is a schema migration that outran this spec file; this file is documentation debt, not a live DDL source. |
| `apml/core/audio-registry-v12.ts` | 108 | n/a | comment only | — | TypeScript insert-type comment referencing the same stale v12 shape; not a live call site. |

### Subsystem: database/ (import & migration scripts)

| File | Line | R/W | Columns touched | Filters course_code? | Note |
|---|---|---|---|---|---|
| `database/copy-shared-to-course.cjs` | 98-102 | R | `text_normalized, role` | Yes — checks existing rows before copy | Dedup check before an insert. |
| `database/copy-shared-to-course.cjs` | 191 | W (INSERT) | full record (`course_code, text_normalized, language, role, voice_id, s3_key/s3_uuid, ...`) | course_code is in the write payload | Batched insert, per-course duplicate-by-construction. |
| `database/copy-shared-to-course.cjs` | 209, 215 | R | `*` (count only) | Yes — legit membership count | Post-copy verification counts. |
| `database/import-course-v13.cjs` | 240-243 | W (UPSERT) | full record incl. `s3_key`, `duration_ms` on conflict `course_code,text_normalized,language,role` | course_code is in the write key | Primary v13 importer's audio-sample writer — canonical example of the per-course duplicating pattern. |
| `database/import-course-v13.cjs` | 316-318 | R | `*` (count only) | Yes — legit membership count | Post-import verification. |
| `database/import-legacy-course.cjs` | 116, 147 | n/a | log strings only | — | Console log lines referencing a count variable computed elsewhere; not themselves queries. |
| `database/import-welcomes.cjs` | 104, 118, 133 | mixed R/W (need per-line read below) | — | — | See detail row below; file inserts welcome-audio rows into `course_audio`. |
| `database/lib/import-legacy-course-core.cjs` | 303-306 | W (UPSERT, batch) | full record on conflict `course_code,text_normalized,language,role` | course_code in write key | Same v13-family batched upsert pattern, with row-by-row fallback at 313-315 on batch failure. |
| `database/lib/import-legacy-course-core.cjs` | 473-478 | W (UPSERT) | `course_code, text, text_normalized, language, role, voice_id, origin, s3_key, duration_ms` on conflict `course_code,text_normalized,language,role` | course_code in write key | `copySharedToCourse()` step 4 — copies shared_audio into course_audio per course. |
| `database/lib/import-legacy-course-core.cjs` | 742-745 | R | `id, text_normalized, role` | Yes — legit membership listing, then built into an in-memory lookup map | `linkAudioToContent()` step 9 — builds a by-text lookup **scoped to one course** to backfill `known_audio_id` etc. on seeds/legos/phrases. This is a by-text lookup, but deliberately scoped to the course being imported (the content it's linking IS that course's) — flagging as legitimate-but-worth-checking rather than clearly the bug pattern. |
| `database/lib/import-legacy-course-core.cjs` | 758-761 | R | `id, text, role` (role='presentation') | Yes, plus `role` | Same function, secondary exact-text lookup for presentation clips. |
| `database/import-welcomes.cjs` | 103-107 | R | `id` | Yes, plus `role='welcome'` | Existence check before insert/update. |
| `database/import-welcomes.cjs` | 116-124 | W (UPDATE) | `text, text_normalized, voice_id, s3_key, duration_ms` | No — by `id` | Updates an existing welcome row. |
| `database/import-welcomes.cjs` | 130-140 | W (INSERT) | `course_code, text, text_normalized, language, role, voice_id, s3_key, duration_ms` | course_code in write payload | Inserts a new welcome row, one per course by construction. |

### Subsystem: database/migrations/ + database/runbooks/ + database/schema/ (SQL, incl. DB-side objects)

| File | Line | Object type | What it does with course_audio | Note |
|---|---|---|---|---|
| `database/migrations/20260705_purge_pending_presentation_rows.sql` | 28 | DELETE | Deletes placeholder rows (`s3_key LIKE 'pending:%'`) from `course_audio` | One-shot cleanup, already applied historically; not a live ongoing call site. |
| `database/migrations/20260714_course_audio_envelope.sql` | 17-41 | New table `course_audio_envelope` + FK + RLS policies | `audio_id UUID PRIMARY KEY REFERENCES course_audio(id) ON DELETE CASCADE` | **DB object list (4):** a satellite table keyed 1:1 to `course_audio.id`. If `course_audio` rows become thin membership rows and `id` semantics change, this table's FK and every reader of it needs to repoint to whatever now carries the durable clip identity (`audio_clips.id` via `clip_id`, presumably). |
| `database/migrations/20260805_course_audio_veracity_verdict.sql` | 40-66 | `ALTER TABLE course_audio ADD COLUMN` (veracity_checked_at, veracity_pass, veracity_reason, veracity_cer, veracity_attempts, veracity_checker) + index `idx_course_audio_veracity_checked (course_code, veracity_checked_at DESC)` | Adds veracity payload columns directly on `course_audio`. | **DB object (4):** these are exactly the payload columns the phase1 migration's comment says stay on `course_audio` as a mirror — confirms veracity data is per-membership-row, not per-canonical-clip, until a later phase. |
| `database/migrations/20260805_course_audio_veracity_verdict_count_index.sql` | 34-44 | Index swap: drops `idx_course_audio_veracity_pass`, adds `idx_course_audio_veracity_passed`/`_failed` (partial, `course_code, created_at DESC`) + `ANALYZE course_audio` | Indexing only | **DB object (4).** |
| `database/migrations/20260806_audio_link_integrity.sql` | 113-124 | Function `public.audio_id_for_text(p_course, p_text, p_role)` | `SELECT a.id FROM course_audio a WHERE a.course_code = p_course AND a.role = p_role AND a.s3_key IS NOT NULL AND a.text_normalized = normalize_text(p_text) ORDER BY … LIMIT 1` | **DB object (4) AND list (3) — the single clearest example of the by-text-scoped-to-course bug pattern, baked into a SQL function.** Every call site of this function inherits the bug. |
| `database/migrations/20260806_audio_link_integrity.sql` | 128-146 | Function `public.null_lego_audio_on_text_change()` (trigger body, `BEFORE UPDATE` on `course_legos`, existing trigger — not created in this file, only its function `CREATE OR REPLACE`d) | Calls `audio_id_for_text(NEW.course_code, …)` 3× to re-set `known_audio_id`, `target1_audio_id`, `target2_audio_id`, `presentation_audio_id` | **DB object (4).** Fires on every lego text edit; inherits the by-text-in-course lookup above. |
| `database/migrations/20260806_audio_link_integrity.sql` | 150-165 | Function `public.null_phrase_audio_on_text_change()` (trigger body, `BEFORE UPDATE` on `course_practice_phrases`) | Same pattern, `known_audio_id`/`target1_audio_id`/`target2_audio_id` only | **DB object (4).** |
| `database/migrations/20260806_audio_link_integrity.sql` | 187 | `ALTER TABLE lego_introductions ADD CONSTRAINT … FOREIGN KEY (presentation_audio_id) REFERENCES course_audio(id) ON DELETE SET NULL` | FK from `lego_introductions` into `course_audio` | **DB object (4).** |
| — (gap) | — | Trigger `link_audio_to_content` (`AFTER INSERT ON course_audio`, referenced by name at line 17 of the same file) | Described as "the ONLY relink path" | **Gap, honestly flagged:** this trigger's own `CREATE TRIGGER`/`CREATE FUNCTION` was not found in any `.sql` file in this repo via grep — it is live in the DB but its defining migration is not in the tracked history I searched. Needs confirming directly against the DB (out of scope for a read-only code census) before phase 2 can safely retarget it. |
| — (gap) | — | Trigger `trg_course_audio_normalize` (referenced at `20260806_clip_identity_canonical_functions.sql:17` and `20260814_canonical_audio_identity_phase1.sql:45` as already live) | Writes `text_normalized` on `course_audio` via `normalize_text()` | Same gap as above — referenced as already-existing, defining migration not found in this repo's tracked SQL. |
| `database/migrations/20260806_clip_identity_canonical_constraints.sql` | 21-33 | `ALTER TABLE course_audio ADD CONSTRAINT course_audio_language_canonical_shape` / `course_audio_voice_id_canonical_shape` (both `NOT VALID` initially per the file's own comment) | Shape-validates `language`/`voice_id` columns | **DB object (4).** |
| `database/migrations/20260806_clip_identity_canonical_enforce.sql` | 29-47 | Function `course_audio_canonical_identity()` + `CREATE TRIGGER trg_course_audio_canonical_identity BEFORE INSERT OR UPDATE OF language, voice_id ON course_audio` | Canonicalises `language`/`voice_id` on write | **DB object (4).** The live write-side identity gate every insert/upsert above passes through. |
| `database/migrations/20260806_clip_identity_canonical_functions.sql` | whole file | Helper functions `canonical_language()`/`canonical_voice_id()` (referenced, defined elsewhere per the file's own comments) | Underpin the trigger above | Read for context; no new `course_audio` DDL beyond what's already listed. |
| `database/migrations/20260806_course_voice_census.sql` | 45-83 | Two `SELECT … FROM course_audio ca` blocks, one-shot census query (not a persisted view/function per the file — check below) | `course_code, text_normalized, language, role, voice_id` (the exact `unique_course_audio_per_voice` key, named explicitly at line 64) | Read-only diagnostic script; not itself a live call site but valuable as a second independent citation of the identity-key problem. |
| `database/migrations/20260813_estate_map.sql` | 31-32, 41-100 | Index `idx_course_audio_estate_map (course_code, voice_id, origin)` + function `estate_map()` reading/joining `course_audio` (incl. `LEFT JOIN public.course_audio kca ON kca.id = s.known_audio_id` and `tca` for target) | `course_code, voice_id, origin, veracity_pass` (aggregated), plus join via `id` | **DB object (4).** This is the `estate_map()` function backing `GET /api/estate-map`, named as ground truth in this repo's CLAUDE.md — a high-value repoint target for phase 2. |
| `database/migrations/20260813b_estate_map_pods_per_language.sql` | 37-96 | Same `estate_map()` function, revised (pods-per-language cut) | Same columns | **DB object (4).** Supersedes/extends the previous file's function body — same object, second migration. |
| `database/migrations/20260814_canonical_audio_identity_backfill.sql` | 52, 87, 101, 129, 143 | One-shot backfill: stages canonical keys from `course_audio`, then `UPDATE course_audio ca SET clip_id = …` | Reads `text, language, role, voice_id, s3_key` computed keys; writes `clip_id` | **This IS the phase-1 backfill this whole census exists to unblock** — not a call site to fix, the migration itself. Confirmed present as an untracked file per `git status` at session start. |
| `database/migrations/20260814_canonical_audio_identity_phase1.sql` | 72-100, 141-180 | New table `audio_clips` (no `course_code` column, by design); `COMMENT ON TABLE`; `ALTER TABLE course_audio ADD COLUMN clip_id uuid` (174) + `COMMENT` (177-178) + index `idx_course_audio_clip (clip_id) WHERE clip_id IS NOT NULL` (180) | Adds the pointer column this whole migration is for | **DB object (4).** Also present as an untracked file at session start — this is the schema change the census is scoped against. Rollback block (215-222) references `trg_course_audio_canonicalise` / `course_audio_canonicalise()`, which are **not created anywhere in this file** — read as forward references to a not-yet-written phase 2, flagged rather than assumed. |
| `database/runbooks/audit-log-maintenance.sql` | 59 | Comment referencing a planned index `idx_content_audit_log_course_audio_delete … WHERE course_audio/DELETE` | Not yet created (comment says "new") | Not a live object; noted for completeness. |
| `database/schema/course-structure-schema.sql` | 11 | Comment only: `course_audio_usage (which courses use which audio)` | — | Same stale v12-era naming as `apml/core/audio-registry-v12.sql`; this schema file's `course_audio` section is documentation, not the live v13 DDL (the live table is created/altered piecemeal across the migrations above, not from one CREATE TABLE in this file — confirmed no `CREATE TABLE course_audio` found in this file). |
| `new_vision/supabase-schema.sql`, `new_vision/supabase-schema-v2.sql` | — | Speculative future-schema drafts (`new_vision/` directory name) | — | Out of scope as live objects — flagging their existence only; not treated as call sites since `new_vision/` is explicitly a design-sketch area, confirmed by directory name and file content pattern (draft schema, not applied anywhere else in the repo). |
### Subsystem: ops/sql/ (repair + QA-gate DB objects)

| File | Line | Object type | What it does with course_audio | Note |
|---|---|---|---|---|
| `ops/sql/20260805-audio-repair.sql` | 33-36 | `ALTER TABLE course_audio ADD COLUMN audio_revision integer NOT NULL DEFAULT 1` | Adds `audio_revision`, part of the payload-column mirror | **DB object (4).** In-place-swap cache-busting scheme; explicitly designed around `id` never changing, so it survives a `clip_id` indirection as long as `id` keeps meaning "this row." |
| `ops/sql/20260805-audio-repair.sql` | 46 | New table `audio_repair_candidates` | `audio_id uuid NOT NULL REFERENCES course_audio(id) ON DELETE CASCADE` | **DB object (4).** Another satellite table keyed to `course_audio.id`. |
| `ops/sql/20260805-audio-repair.sql` | 81-107 | New table `course_audio_revisions` + index + RLS | `audio_id uuid NOT NULL REFERENCES course_audio(id) ON DELETE CASCADE`, plus its own `course_code` column | **DB object (4).** Revision-history table, also FK'd to `course_audio.id`. |
| `ops/sql/20260805-course-qa-gate.sql` | 71, 135 | Tables `audio_clip_flags`, `audio_clip_signoffs` | `audio_id uuid NOT NULL REFERENCES course_audio(id) ON DELETE CASCADE` | **DB object (4).** Named explicitly in the phase1 migration's list of "every existing FK holder" that must keep working. |
| `ops/sql/20260805-course-qa-gate.sql` | 377-384 | View definition (name not fully visible in this excerpt — reads `FROM course_audio a`, joins `audio_clip_flags`/`audio_clip_signoffs` by `a.id`/`a.audio_revision`) | `id, audio_revision` | **DB object (4).** Per-clip QA status view. |
| `ops/sql/20260805-course-qa-gate.sql` | 543 | `JOIN course_audio a ON a.id = f.audio_id` inside `course_qa_estate` view | `id, audio_revision` | **DB object (4).** Estate-wide QA rollup view — another `GET /api/estate-map`-adjacent consumer worth checking at repoint time. |
| `ops/sql/20260813-qa-gate-round-status-delateralise.sql` | 111-118 | Performance index `idx_course_audio_id_revision ON course_audio (id) INCLUDE (audio_revision)` + `VACUUM (ANALYZE)` note | `id, audio_revision` | **DB object (4).** Index-only-scan tuning for the views above. |

---

### Subsystem: services/phases/phase8-audio-v13.cjs (the render path — named starting points)

This file is 7,249 lines, the primary render/generation path, and the one Tom's brief named
explicitly. **The brief's line numbers (`findExistingAudio` ~6292, `generatePodAudio` ~6375,
`findSiblingCourseClip` ~379, call sites ~2257/~5429) do not match what is in the file today** —
verified by direct grep, not assumed stale. Actual current line numbers below; the functions
named are all present and this is very likely simple drift (other commits landing between when
the brief was written and now), not a wrong pointer — flagging the discrepancy rather than
silently correcting it.

| File | Line | R/W | Columns touched | Filters course_code? | Note |
|---|---|---|---|---|---|
| `services/phases/phase8-audio-v13.cjs` | 413-424 | R | `s3_key, duration_ms, word_boundaries, language, voice_id` | **No — explicitly `.neq('course_code', courseCode)`** | `findSiblingCourseClip()` (brief said ~379; actual 413). The correct cross-course-by-text lookup, exactly as the audit doc describes — comment at 399-400 literally says "every miss is a duplicate paid render." |
| `services/phases/phase8-audio-v13.cjs` | 2158, 5244 | call sites of `findSiblingCourseClip` | — | — | Brief said ~2257/~5429; actual 2158/5244. Both are the **non-pod** course-audio paths (confirmed by reading surrounding function names — outside the pod-generation call chain). Still true as the audit doc states: **`findSiblingCourseClip` is never called from the pod path.** |
| `services/phases/phase8-audio-v13.cjs` | 6130-6162 | R | `id, course_code, text, language, voice_id, s3_key` | **Conditional** — `readCandidates(scopeToCourse)`: own-course branch filters by `course_code`; the fallback branch (only reached if `opts.canonTexts` is supplied and contains this exact text) is cross-course, `.neq` absent but also no `.eq('course_code', …)` — i.e. genuinely unscoped | `findAudioRowForClip()` — the real engine `findExistingAudio` wraps. **Correction to the brief's framing:** the pod path is not blind to cross-course reuse — it has a narrow, canon-gated reuse path (see next row) — but the audit's headline number (only 4.5% of English pod clips are shared) shows this gate almost never opens in practice, since it only fires for lines byte-identical to canonical pod-0 English. |
| `services/phases/phase8-audio-v13.cjs` | 6172-6175 | wrapper | — | — | `findExistingAudio()` (brief said ~6292; actual 6172) — thin id-only wrapper over `findAudioRowForClip`. **It is exported (`module.exports.findExistingAudio`, line 7226) but has no in-file caller** — `generatePodAudio` calls `findAudioRowForClip` directly (next row), not this wrapper. Confirm before relying on it: any external module that requires this file and calls `.findExistingAudio` is a caller outside this census's file list — not found by this grep pass (would need a repo-wide `require.*phase8-audio-v13` search, which is out of this file's scope but worth a follow-up grep). |
| `services/phases/phase8-audio-v13.cjs` | 6292-6293 | R | `id, course_code, text, language, voice_id, s3_key` | Own-course first; cross-course only if `canonTexts` (pod-0-canon-aligned English) contains this exact text | **`generatePodAudio()`'s reuse check** (brief said ~6375; actual definition starts 6264, this call at 6292). This is the pod render path's only pre-render lookup. |
| `services/phases/phase8-audio-v13.cjs` | 6366-6382 | W (UPSERT) | `course_code, text, text_normalized, language, role, voice_id, origin, s3_key, duration_ms, word_boundaries` on conflict `course_code,text_normalized,language,role,voice_id` | course_code in write key | The actual paid-render write, inside `generatePodAudio()`. **This is the write site the audit is about** — every miss above becomes one of these, one row per course by construction, because `course_code` is inside the upsert's conflict key. |
| `services/phases/phase8-audio-v13.cjs` | 6193-6209 | R | `global_order, english_text` | n/a (`canonical_pod_scenarios`, a different table) | `loadPod0Canon()` — feeds the `canonTexts` gate above; included for completeness since it determines whether cross-course reuse can trigger at all. |
| `services/phases/phase8-audio-v13.cjs` | 370-395 | R | `*` | Yes — `course_code` + `text_normalized IN (...)` + `role='known'` + `origin='human'` | Separate "precious audio" guard (a few lines above `findSiblingCourseClip`) — a by-text-within-course lookup used to avoid overwriting a human take. Legitimate use of the by-text-in-course pattern (protecting existing human recordings), not the bug pattern, but still a site that needs repointing once `s3_key` moves. |

### Subsystem: services/shared/ (named starting point: text-normalize.cjs)

| File | Line | R/W | Columns touched | Filters course_code? | Note |
|---|---|---|---|---|---|
| `services/shared/text-normalize.cjs` | 6-30 | n/a (doc comments only) | — | — | Confirmed named starting point: this file does NOT itself query `course_audio` — it documents the `trg_course_audio_normalize` trigger's behaviour (the exact trigger flagged as a gap above — its defining SQL was not found) and defines `normalizeForAudio()`/`normalizeText()`, which every writer above calls before writing `text_normalized`. Anyone repointing writes to `audio_clips.text_key` must keep using this same function or risk a second incompatible normalization convention. |
| `services/shared/clone-copy-index.cjs` | 177-182 | R | `id, course_code, text, language, voice_id, role, s3_key, created_at, duration_ms, file_size_bytes, word_boundaries, text_stripped` (`SELECT_COLS`, line 128) | **No — genuinely cross-course**, filters only `voice_id IN (...)`, `language`, `text_normalized IN (...)` | `buildSourceIndex()`, by-text path. **This is the closest existing analogue in the whole estate to what `audio_clips` is meant to formalise** — an unscoped-by-course index keyed by voice+language+text, built specifically to let one course's render stand in for another's. Worth reading as a design precedent before building the canonical lookup. |
| `services/shared/clone-copy-index.cjs` | 188-193 | R | same `SELECT_COLS` | No — same cross-course, paginated full scan by `voice_id`+`language` (no text filter — the "no `texts` given" branch) | Same function, bulk-index branch. |
| `services/shared/clone-copy-match.cjs` | 111 | R (referenced, not shown at this line — string literal in a reason message) | — | — | `'destination course already owns a matching course_audio row'` — a reason string in the matcher that consumes the index built above; confirms the matcher is course-aware even though the index itself is not. |
| `services/shared/clip-identity-lookup.cjs` | 7 | n/a | — | — | Doc comment only: "the 2.53M rows already in course_audio are NOT [canonical]". No live call site in this file for `course_audio` itself (file's job is canonicalising identity values, not querying the table). |
| `services/shared/voice-declarations.cjs` | 9, 57 | n/a | — | — | Doc comments referencing the `course_audio` unique constraint and its lack of a provider column; no live call site. |
| `services/shared/clip-identity.cjs` | 47, 94 | n/a | — | — | Doc comments only. |
| `services/shared/audio-fallback-resolver.cjs` | 17, 26, 160, 162 | n/a (doc/JSDoc) + consumes candidates passed in by caller | — | — | Doc comments describing `course_audio` row shape; the function itself takes `candidates` (course_audio rows) as a parameter rather than querying the table directly — its caller is the actual read site (not traced further in this pass; flagging as a **gap** — this resolver's caller(s) were not located in this census and should be grepped for `audio-fallback-resolver` requires before phase 2). |
| `services/shared/audio-link-preference.cjs` | 2 | n/a | — | — | Doc comment only ("which course_audio row wins an FK link"); same caller-not-traced gap as above. |
| `services/shared/clip-identity-writers.test.js` | throughout | test fixtures | mocked columns | mocked | Unit tests for identity-writing logic using a fake Supabase client with a `course_audio` table stub — not a live call site, but the test fixtures (`audioRow()`) double as documentation of the expected write shape (`voice_id`, `s3_key`, `language`, `id`). |

### Subsystem: named starting points outside phase8 — audio-reuse-planner.cjs, pods-registration.cjs, render-fine-knowns.cjs, pod-bulk-migrate.cjs

| File | Line | R/W | Columns touched | Filters course_code? | Note |
|---|---|---|---|---|---|
| `services/audio-reuse-planner.cjs` | 622-628 | R | `id, lego_id, text, s3_key, voice_id, language, created_at, origin` | Yes, plus `role='presentation'` + `lego_id IN (...)` | `fetchPresentationTexts()` — deliberately course-scoped and lego_id-indexed per its own comment (622: warns a bare course_code scan on a 52k-row course times out). Legitimate membership listing, not the by-text bug pattern, but tied to the `idx_course_audio_lego` index whose shape may need to change if `course_audio` becomes a thin join. |
| `services/audio-reuse-planner.cjs` | 674-679 | R | `id, course_code, text, text_normalized, language, role, voice_id, origin, s3_key, duration_ms, word_boundaries, created_at, audio_revision` | **No — explicitly estate-wide**, `.in('text_normalized', texts)` only, course/role/voice filtered in JS after fetch | `findCandidates()` — **the best-designed existing reuse mechanism in the estate.** Its own comment (649-652) states the exact same architectural insight as the audit doc: course_code-scoped scans don't use the useful index, text_normalized+language does. This function is effectively `audio_clips` lookup logic already written, just not backed by a canonical table yet. |
| `services/audio-reuse-planner.cjs` | 977 | R/W (not fully traced) | — | — | References `course_audio_revisions`, the satellite table from `ops/sql/20260805-audio-repair.sql`; not read in full detail this pass — **flagging as needing a follow-up read**, since it's a second table this project touches. |
| `services/audio-reuse-planner.cjs` | 1656-1670 | W (UPSERT) | `course_code, text, text_normalized, language, role, voice_id, origin, s3_key, ...` | course_code in write payload | The reuse planner's "adopt a sibling's S3 object" writer — this is precisely the "shares bytes, not clips" behaviour the audit doc calls out in §2 ("it inserts a *new* course_audio row pointing at the sibling's s3_key"): confirmed directly in this repo, not just asserted by the audit doc. |
| `services/voice-engine/pods-registration.cjs` | 252-260 | R | `id, s3_key, origin` | Yes, plus `text_normalized`+`language`+`role`+`voice_id IN (...)` | Prior-take lookup before a human recording upload, deliberately course-scoped (recording belongs to one course) and deliberately wider on voice spelling (own comment explains why). Legitimate by-text-in-course use (checking for a prior take of THIS course's own recording), not the cross-course bug pattern. |
| `services/voice-engine/pods-registration.cjs` | 277-282 | W (UPSERT) | `course_code, text, text_normalized, language, role, voice_id, origin, s3_key, duration_ms?, file_size_bytes?` on conflict `course_code,text_normalized,language,role,voice_id` | course_code in write payload | Human-recording upload writer — same per-course duplicating-by-construction shape as the TTS writers. |
| `tools/render-fine-knowns.cjs` | 128 | calls `p8.generatePodAudio(...)` | (delegates to phase8, see above) | (delegates) | Confirmed: this tool is a thin driver over `generatePodAudio`, inheriting exactly the reuse/write behaviour already documented for phase8 above — not a separate code path. |
| `tools/render-fine-knowns.cjs` | 141-142 | R | `id` (count only) | Yes, plus `role` | Post-run verification count, not a lookup. |
| `services/pod-bulk-migrate.cjs` | — | none | — | — | Confirmed: **no** `course_audio` reference anywhere in this file (grep returned zero hits) — despite being named as a starting point in the brief. Stating this plainly per the honesty rule rather than inventing rows. |

### Subsystem: services/voice-engine/ (human-recording pipeline)

| File | Line | R/W | Columns touched | Filters course_code? | Note |
|---|---|---|---|---|---|
| `services/voice-engine/chunking.cjs` | 19 | n/a | — | — | Doc comment only, no live call site. |
| `services/voice-engine/coverage.cjs` | 74-75 | R (delegates to `db.cjs`) | — | — | Calls `db.fetchAudioRowsForRole()`, see below. |
| `services/voice-engine/db.cjs` | 124-128 | R | `id` (count), `text_normalized, s3_key` (paged) | **No** — whole-table paged scan, no course_code filter at all | `fetchAllAudioRows()`-style helper (unscoped by course) — builds a global text→s3_key map. |
| `services/voice-engine/db.cjs` | 138-145 | R | `id` (count), `text_normalized, voice_id, origin` (paged) | Yes | Second variant of the same helper, this one course+role scoped (`fetchAudioRowsForRole`, called by `coverage.cjs`). |
| `services/voice-engine/db.cjs` | 157-174 | W (UPSERT) | `course_code, text, text_normalized, ...` (conflict on the same 5-column key as phase8) | course_code in write payload | Human-recording writer — file's own header comment (11-14) explicitly documents "WRITES: course_audio upsert only… NO DDL", confirming this is a deliberate, scoped write path. |
| `services/voice-engine/pods-coverage.cjs` | 190-193 | R | `id, origin, voice_id` | No — by `id IN (...)` | Safe, id-keyed lookup. |
| `services/voice-engine/pods-plan.cjs` | 213-253 | n/a (doc comments describing row shape) + consumes rows passed in | — | — | Describes "is this course_audio row a pointer to silence" logic; actual query not in this file (consumes pre-fetched rows) — **gap**, caller not traced in this pass. |
| `services/voice-engine/pods-router.cjs` | 177-179, 505-507 | R | `id, origin, voice_id` (+`duration_ms, file_size_bytes` at 506) | No — by `id IN (...)` | Both id-keyed, safe under an `id` indirection. |
| `services/voice-engine/router.cjs` | 21 | n/a | — | — | Doc comment only. |
| `services/voice-engine/splicer.cjs` | 43 | n/a (JSDoc) | — | — | Describes an `existingAudioTexts` Set passed in by the caller; no live query in this file. |
| `services/voice-engine/synthesis-job.cjs` | 16-27, 193-194 | n/a (doc comments) | — | — | Describes the course_audio upsert behaviour; the actual upsert is delegated to `db.cjs` above (confirmed by requiring `db.cjs` at the top of the file — not separately quoted). |

### Subsystem: services/ — low-touch files (doc-comment-only or single call site)

| File | Line | R/W | Columns touched | Filters course_code? | Note |
|---|---|---|---|---|---|
| `services/api/audio-repair-routes.cjs` | 222 | n/a | — | — | Doc comment referencing `course_audio_revisions` (satellite table), not `course_audio` itself. No live call site in this file. |
| `services/audio-intelligence/syllables.cjs` | 133 | n/a | — | — | JSDoc only. |
| `services/audio-intelligence/tiers/duration.cjs` | 76 | n/a | — | — | JSDoc only. |
| `services/gender-prep-coordinator.cjs` | 480-484 | R | `id` | **Yes, combined with `text` (exact match)** | By-text-in-course lookup — checks whether target1/target2 audio already exists for a specific text before a gender-prep pass. Same shape as the bug pattern, but the caller genuinely wants "does THIS course already have this exact text" (the coordinator is working within one course's content), so flagging as legitimate-but-uncertain per the honesty rule rather than asserting either way. |
| `services/language-code-service.cjs` | 521 | n/a | — | — | Doc comment only. |
| `services/orchestration/orchestrator.cjs` | 10432 | n/a | — | — | Log/statistics line summing counts computed elsewhere (delegates to `import-legacy-course-core.cjs`, already censused above). |
| `services/phases/phase9-manifest-compiler.cjs` | 16 | n/a | — | — | Doc comment; the actual manifest compiler's `course_audio` queries are in `services/manifest-generator.cjs` (below), not this file — confirmed by grep returning only this one comment line. |
| `services/phases/presentation-author.cjs` | 315 | n/a | — | — | Doc comment only. |
| `services/voicelab/router.cjs` | 17 | n/a (explicitly none) | — | — | Doc comment states the surface deliberately never writes `course_audio`. |
| `services/voicelab/runner.cjs` | 18 | n/a (explicitly none) | — | — | Same — deliberately no write. |
| `services/voicelab/store.cjs` | 16 | n/a (explicitly none) | — | — | Same — "NOTHING HERE TOUCHES course_audio", confirmed by reading the file's only hit. |

### Subsystem: services/ — medium-touch files

| File | Line | R/W | Columns touched | Filters course_code? | Note |
|---|---|---|---|---|---|
| `services/audio-preview-missing.cjs` | 4-10, 57-59, 110 | n/a (doc/consumes a `liveAudioIds` Set passed in) | — | — | Notable finding, not a call site of its own: documents that `listening_pod_sentences` has **NO foreign key** to `course_audio` on 7 uuid columns, so deleting/repointing a clip silently strands ids. This is directly relevant to phase 2 — a clip-id migration must account for FK-less pointer columns that a schema search alone won't surface. |
| `services/course-builder/routes/course-data.cjs` | 971-975 | W (DELETE, listed in a table array like `import-course.js`) | full row delete | Yes — `course_code` scoped course-teardown | Course-deletion endpoint; deletes a course's own `course_audio` rows among other tables. |
| `services/course-builder/routes/course-data.cjs` | 1050-1051 | W (DELETE, conditional) | full row delete | Yes | Same endpoint, optional `keep_audio` flag controls whether `course_audio` is included in the teardown. |
| `services/course-qa-gate.cjs` | 226-231 | R | `id, text, role, duration_ms, audio_revision` | No — by `id IN (...)` | QA-gate clip-text lookup, safe under `id`. |
| `services/course-qa-gate.cjs` | 320-322 | R | `id, audio_revision` | No — by `id IN (...)` | Feeds a signoff upsert into `audio_clip_signoffs`. |
| `services/course-qa-gate.cjs` | 349-353 | R | `id, audio_revision` | No — by `id IN (...)` | Feeds `audio_clip_flags` insert. |
| `services/course-qa-gate.cjs` | 382-386 | R | `id, text, role, audio_revision, duration_ms` | No — by `id IN (...)` | Flagged-clip detail lookup. All four QA-gate sites in this file are `id`-keyed and safe under an id-preserving migration. |
| `services/phases/phase2-conflict-resolution/detect.cjs` | 121-126 | W (UPSERT) | full record on conflict `course_code,text_normalized,language,role,voice_id` | course_code in write payload | Same per-course-duplicating shape as phase8/pods-registration. Comment at 105-111 is a second independent citation of the `normalize_text()` trigger contract already documented in `services/shared/text-normalize.cjs`. |
| `services/pod-explainer-composite.cjs` | 79-85 | delegates | — | — | Requires `phase8-audio-v13.cjs` directly for its dedup lookup — inherits that file's behaviour, not a separate path. |
| `services/pod-explainer-composite.cjs` | 312-334 | W (UPSERT) | `course_code, text, text_normalized, language, role, voice_id, ...` on conflict `course_code,text_normalized,language,role,voice_id` | course_code in write payload | Composite-audio (spliced explainer) writer, same shape. |
| `services/recording-upload-helpers.cjs` | 9-13, 79-92, 122-124 | n/a (builds a payload object; the actual Supabase call is in a caller not in this file) | `course_audio_id` (a *different*, FK-shaped field on a provenance record — not the table) | n/a | **Gap:** this file builds provenance metadata referencing "the `course_audio` row re-recorded" but does not itself query the table — its caller (likely `pods-registration.cjs`, already censused, or `voice-engine/db.cjs`) was not re-traced from this file specifically. |
| `services/run-pod-explainer-batch.cjs` | 12-14, 45-56, 389-395 | delegates | — | — | CLI driver reusing `phase8-audio-v13.cjs` write path (own comment: "Reuses the validated module logic… same writes"). Comment at 54 references a migration `20260519_course_audio_pod_explainer_role.sql` **not found in this repo's `database/migrations/` directory** — flagging as a gap (either applied directly against the DB outside this repo's tracked history, or renamed/removed before this census). |

### Subsystem: services/ — s3-deploy, audio-veracity, voicelab (duration/veracity sync + read-only census tooling)

| File | Line | R/W | Columns touched | Filters course_code? | Note |
|---|---|---|---|---|---|
| `services/s3-deploy-service.cjs` | 918-931 | R (paged, full scan) | `id, s3_key, duration_ms` | Yes — one course at a time | Builds a uuid→row map from `s3_key` to reconcile durations. |
| `services/s3-deploy-service.cjs` | 964-968 | W (UPDATE) | `duration_ms` | No — by `id` | Batched duration-sync writer, safe under `id`. |
| `services/audio-veracity.cjs` | 8, 85, 922, 1204, 1234, 1278 | n/a (doc comments) + returns a column-shaped object for a caller to merge | `veracity_checked_at, veracity_pass, veracity_reason, veracity_cer, veracity_attempts, veracity_checker` (implied by "columns to record a verdict") | — | This file computes verdict columns but does not itself query/write `course_audio` — **gap, its caller (which does the actual write) was not traced from this file**; likely `phase8-audio-v13.cjs` or `tools/audio-veracity-repair.cjs` (both already/still to be censused). |
| `services/voicelab/params.cjs` | 108-164, 220 | R (raw SQL via psql, not Supabase client) | `language, voice_id` (grouped count) | No — `language IN (...)` only, explicitly estate-wide | Read-only voice-usage census, run via `psql` per its own comment ("goes through psql rather than" the ORM) — confirms a second access path into this table beyond Supabase-js that any repoint must also catch. Comment at 220 explicitly states this lab "never writes course_audio." |
| `services/voicelab-playground/server.cjs` | 14-20, 87-167, 394 | R (same raw-SQL pattern as params.cjs) | `language, voice_id` (grouped count) | No — estate-wide | Near-duplicate of `voicelab/params.cjs` (playground variant of the same lab) — same read-only, cross-course query, same "never writes" guarantee. |

### Subsystem: services/audio-preview-router.cjs (preview/admin UI backend)

| File | Line | R/W | Columns touched | Filters course_code? | Note |
|---|---|---|---|---|---|
| `services/audio-preview-router.cjs` | 339-345 | R | `id` (count) | Yes — legit membership count for a UI verdict summary | `verdictTotals()`. |
| `services/audio-preview-router.cjs` | 370-378 | R | `CLIP_COLUMNS` (not expanded, likely includes `s3_key`) | Yes — legit paginated membership listing | Main preview-list endpoint. |
| `services/audio-preview-router.cjs` | 410-418 | R | `id` (count) | Yes — legit count | Sample-size calc before a random sample. |
| `services/audio-preview-router.cjs` | 426-435 | R | `CLIP_COLUMNS` | Yes — legit, random-offset sample within a course | Sample-preview rows. |
| `services/audio-preview-router.cjs` | 534-537 | R | `id` | No — by `id IN (...)` | Liveness check feeding `computeMissingSlots()` (the FK-less-pointer detector documented in `audio-preview-missing.cjs` above). |

### Subsystem: services/audio-repair-core.cjs (in-place clip swap/repair)

| File | Line | R/W | Columns touched | Filters course_code? | Note |
|---|---|---|---|---|---|
| `services/audio-repair-core.cjs` | 210-216 | R | `*` | No — by `id`, then asserts `course_code` matches an expected value passed in | `loadClip()` — id-keyed with a belt-and-braces course ownership assertion. Safe under an id-preserving migration. |
| `services/audio-repair-core.cjs` | 596-599 | W (UPDATE) | `patch` (dynamic; includes `s3_key`, `origin` per surrounding code) | No — by `id` | In-place swap — the make-before-break repair pattern this repo's CLAUDE.md describes explicitly. |
| `services/audio-repair-core.cjs` | 651-654 | W (UPDATE, rollback) | `snapshot` (pre-swap values) | No — by `id` | Rollback path if the swap's post-assertions fail. |
| `services/audio-repair-core.cjs` | 754-762 | W (UPDATE) | `s3_key, duration_ms, file_size_bytes, audio_revision, word_boundaries` | No — by `id` | Revert-to-previous-revision path. |
| `services/audio-repair-core.cjs` | 783-786 | W (UPDATE, rollback) | `snapshot` | No — by `id` | Rollback for the revert path; also deletes a `course_audio_revisions` history row on failure (line 791). |
| `services/audio-repair-core.cjs` | 860-867 | R | `COLUMNS` (not expanded — likely the repair-candidate column set) | **Yes, combined with `id IN (...)`** | Batched read of specific ids scoped to a course — belt-and-braces double-scoping, not a bare by-text lookup. |
| `services/audio-repair-core.cjs` | 871-880 | R | `COLUMNS`, cursor-paginated by `text_normalized` | Yes — legit whole-course paginated scan (no target text, walks everything) | Full-course repair-candidate scan. |
| `services/audio-repair-core.test.cjs` | 30 hits, not individually read | — | — | — | Unit tests over `audio-repair-core.cjs` above using a fake Supabase client — not live call sites; skipped from line-by-line census as test fixtures mirror the source file's shape already documented. |

### Subsystem: services/manifest-generator.cjs (legacy — CLAUDE.md flags this file as not on the learner path)

| File | Line | R/W | Columns touched | Filters course_code? | Note |
|---|---|---|---|---|---|
| `services/manifest-generator.cjs` | 147-153 | R | `id, text, role, duration_ms` (paged) | Yes — legit full-course listing | This repo's own CLAUDE.md: "`manifest-generator.cjs` is legacy and not on the learner path" — still a real call site (it runs when invoked), just not in the live learner read path. |
| `services/manifest-generator.cjs` | 399-406 | R | `s3_key, duration_ms, text` | Yes, plus `role='welcome'` (`.single()`) | One-row-per-course lookup, legit. |
| `services/manifest-generator.cjs` | 685-690 | R | `id` | No — by `id` (`.eq('id', sample.id)`) | Existence check, safe under `id`. |

### Subsystem: services/supabase-client.cjs (shared client helpers)

| File | Line | R/W | Columns touched | Filters course_code? | Note |
|---|---|---|---|---|---|
| `services/supabase-client.cjs` | 307-337 | R | `id` | **Yes, combined with `text_normalized` + `language` + `role` (+ optional `voice_id`)** | `courseAudioExists()` — **textbook example of list (3), the by-text-scoped-to-course pattern**, and it's a named, reusable shared helper (not a one-off script), meaning its call sites elsewhere multiply this exact pattern. |
| `services/supabase-client.cjs` | 352-361 | R | `*` | No — by `id` (`.single()`) | `getCourseAudio(id)` — safe under `id`. |
| `services/supabase-client.cjs` | 388-418 | R | `*` | **Yes, same combo as line 307** | `findCourseAudio()` — the non-boolean sibling of `courseAudioExists()`, same by-text-in-course pattern, returns the full row. **This pair (307, 388) is likely the single highest-leverage repoint target in the whole shared-client layer** — fix these two functions' internals and every caller that uses them is fixed for free. |
| `services/supabase-client.cjs` | 421-450 | W (INSERT) | `course_code, text, text_normalized, language, role, voice_id, ...` | course_code in write payload | `insertCourseAudio()` — shared insert helper, same per-course-duplicating shape. |
| `services/supabase-client.cjs` | 472-520 | W (UPDATE or INSERT depending on existing-check) | `voice_id, origin, s3_key, duration_ms, file_size_bytes` (update branch) | Uses `findCourseAudio`/`courseAudioExists` internally (not re-verified at this line, inferred from function name `upsertCourseAudio` and the surrounding "if (existing)" branch at 493-494) | `upsertCourseAudio()` — the shared upsert helper; almost certainly calls the two by-text-in-course lookups above to decide insert-vs-update, though the internal call was not re-confirmed line-by-line in this pass — **flagging as needing one more read** before treating this note as certain. |
| `services/supabase-client.cjs` | 531-545 | R | `*` (count only, inferred from function name `getCourseAudioSummary`) | Yes — legit membership summary | Not individually re-read this pass; grouped by name/position with the other summary-style helpers already confirmed elsewhere in this repo (e.g. `api/lib/supabase.js:394`). |
| `services/supabase-client.cjs` | 548-566 | R (inferred `getMissingAudio`) | not re-confirmed | Yes, likely | **Gap** — named but not individually read this pass; flagging rather than guessing its exact filter shape. |
| `services/supabase-client.cjs` | 574-580 | R | `text_normalized, language, role` | Yes — legit, builds an in-memory existence set for a whole course | `batchCheckCourseAudio()` (or the function containing this query — name at 568 is `batchCheckCourseAudio`). |
| `services/supabase-client.cjs` | 1474-1479 | R | `id, text, language, role, duration_ms, voice_id` | No — by `id IN (...)` | Batch detail lookup, safe under `id`. |
| `services/supabase-client.cjs` | 1562-1567 | R | `id, text, language, role, duration_ms, voice_id` | No — by `id IN (...)` (`audio_uuid` from flags) | Same pattern, feeds a flagged-items report. |
| `services/supabase-client.cjs` | 1054, 1095 | R | `*` (count only) | Yes — legit membership count | Dashboard stat helpers (same shape as `api/lib/supabase.js:394`). |

### Subsystem: services/production-api.cjs (production dashboard API — largest single-file count after phase8)

25 `.from('course_audio')` call sites across a 10,000+ line file. A sample of 7 was read in full;
the rest are grouped and flagged as a gap rather than guessed.

| Line(s) | R/W | Columns touched | Filters course_code? | Note |
|---|---|---|---|---|
| 2648-2656 | R | `id, text, s3_key, duration_ms` | Yes, plus `role='presentation'` + `lego_id` (`.maybeSingle()`) | Single-clip-per-lego lookup, legit. |
| 2968-2973 | R | `id, text, text_normalized, language, role, duration_ms, lego_id, s3_key` | Yes — whole-course dump | Builds in-memory lookup maps (`audioLookup`, `presentationByLegoId`) — same "course-scoped dump then match in JS" shape seen elsewhere. |
| 3217-3224 | R | `id, text, role` | **Yes, combined with `id IN (...)`** | Belt-and-braces: id-keyed AND course-scoped — safe, redundant filter. |
| 4051-4056, 4161-4165 | R | `id` / `id, s3_key, text` | Yes, plus `role='welcome'` | Two near-duplicate "does this course have a welcome clip" checks (readiness/paywall gating endpoints). |
| 4708-4714, 4743-4750 | R | `s3_key` | No — by `id` (`.single()`/`.maybeSingle()`) | Audio-proxy/redirect endpoints resolving a signed URL from an `id` — safe under an id-preserving migration; this is a **learner-facing serving path**, not just admin tooling, so worth prioritising in the repoint order. |
| 3457, 3806, 4800, 4810, 4820, 4834, 4921, 5031, 5668, 6491, 6559, 6982, 6996, 10720 (14 remaining) | not individually read | not confirmed | not confirmed | **Gap, honestly stated:** these 14 sites were located by grep (confirmed to exist, confirmed line numbers) but not opened and classified in this pass, given the volume of this single file. A follow-up pass should read each before phase 2 cutover — `production-api.cjs` is the production dashboard's main API surface, so any of these could be learner- or admin-facing. |

### Subsystem: src/ (Popty dashboard Vue frontend — direct Supabase access)

**Finding, not individually a call site:** the dashboard frontend queries `course_audio` **directly
via a client-side Supabase client**, not only through backend API routes. Confirmed by checking
which of the 20 `course_audio`-referencing `src/` files actually contain their own
`.from('course_audio')` call vs. merely displaying data fetched elsewhere: 5 do (`src/services/
supabase.js`, `src/views/ListeningConfig.vue`, `src/views/admin/PodLab.vue`, `src/lib/podEngine/
podStageComposition.ts`, `src/views/JobsMonitor.vue`, `src/views/admin/SpeakingConfig.vue` — 6
counted, one miscounted above), the other ~15 (`ImportCourseModal.vue`, `stage0Sequence.ts`,
`api.js`, `production.js`, `podRecordingPlan.js`, `Maintenance.vue`, `PodLab.casting.test.js`,
`VoiceLab.vue`, `VadLab.vue`, `voicelab/PlayPanel.vue`, `voicelab/RunPanel.vue`, `AudioPipeline.vue`,
`AudioPreview.test.js`, `ScriptViewer.vue`, `AudioPreviewMissing.vue`, `CyclePlayer.vue`,
`LearningJourneyView.vue`, `MissingAudio.vue`, `SharedAudio.vue`, `01-cast-and-record.spec.js`)
either call the `src/services/supabase.js` helpers already censused above, call a backend API
route (out of `course_audio`'s direct blast radius), or only reference the string in a comment/test
fixture — grep-confirmed absent of their own `.from('course_audio')` calls, not assumed.

| File | Line | R/W | Columns touched | Filters course_code? | Note |
|---|---|---|---|---|---|
| `src/services/supabase.js` | 43-48 | R | `*` (count) | Yes — legit membership count | Dashboard progress summary. |
| `src/services/supabase.js` | 257 | R | `role` | Yes — legit membership listing | Audio-needed estimate. |
| `src/services/supabase.js` | 301-306 | R | `id, course_code, text, role, s3_key, origin, voice_id, created_at` | Yes — legit whole-course dump | `getAudioMetadata()`. |
| `src/services/supabase.js` | 328-335 | R | `id, text, created_at` | Yes, plus `voice_id`+`origin='human'` | Recent-human-takes list for one course+voice. |
| `src/services/supabase.js` | 736-742 | R | `lego_id, s3_key` | Yes, plus `role='presentation'` | Presentation-coverage check for a seed range. |
| `src/views/ListeningConfig.vue` | 398-399 | R | `id, text` | Yes, plus `role='pod_explainer'` + `text LIKE '[atom] %'` | Pattern-match listing (all atom glosses for a course) — a "by text pattern, within course" read; not the exact-text bug pattern but adjacent to it. |
| `src/lib/podEngine/podStageComposition.ts` | 300-301 | R | `id, text` | Same as above | **Client-side duplicate of the same query** — this exact shape appears twice (Vue view + the pod-engine TS lib it likely calls into, or vice versa) — worth deduping onto one source once repointed, not just fixing twice. |
| `src/views/admin/PodLab.vue` | 249-254 | R | `id, text_normalized` | Yes, plus `role='pod_fine_known'` | Fine-known map for one course — same shape as `listeningMetaCache.ts` in the player app (see Repo 2 below) but on the *authoring* side. |
| `src/views/admin/PodLab.vue` | 275 | R | `id, voice_id, created_at` | No — by `id IN (...)` | Safe under id. |
| `src/views/JobsMonitor.vue` | 258-259 | R | `course_code, created_at` | No — cross-course, time-windowed (`gte('created_at', tenMinAgo)`) | Estate-wide "recent activity" monitor — genuinely needs to see every course, not scoped. |
| `src/views/admin/SpeakingConfig.vue` | 782-783 | R | `id, duration_ms` | No — by `id IN (...)` | Safe under id. |

### Subsystem: tools/ — build-shared-known-store.cjs (a second, independent "shared pool" precedent)

| File | Line | R/W | Columns touched | Filters course_code? | Note |
|---|---|---|---|---|---|
| `tools/build-shared-known-store.cjs` | 8-30 (header) | n/a | — | — | **Third independent precedent** (after `api/pod-content.js`'s `pod_known_en` and `services/shared/clone-copy-index.cjs`'s cross-course index) **for exactly the canonical-pool idea `audio_clips` formalises** — this tool's own header says it explicitly: "make the English known-side explainer audio a SHARED store… reused across ALL pod courses," built by writing rows under a fake `course_code='pod_known_en'` because the schema has no real place for a courseless clip. Strong evidence Tom's 2026-08-14 ruling matches a pattern the codebase had already converged on independently, twice. |
| `tools/build-shared-known-store.cjs` | 219-225 | R | `id, text, text_normalized` | No — `role`+`voice_id IN (...)`+`text LIKE 'means, %'`, deliberately cross-course | Confirms every course's existing per-course clips, to know which glosses need a shared row — reads across the whole estate on purpose. |
| `tools/build-shared-known-store.cjs` | 229-236 | R | `id, text, text_normalized, s3_key` | Yes, but `course_code=SHARED_COURSE` (`'pod_known_en'`) — the pseudo-course, not a real one | Idempotency check against the shared pool itself. |
| `tools/build-shared-known-store.cjs` | 329-334, 347-352, 359-364 | W (UPSERT ×3) | `id, course_code, text, text_normalized, language, role, voice_id, origin, s3_key, duration_ms` on conflict `course_code,text_normalized,language,role,voice_id` | course_code in write payload, but always `SHARED_COURSE` — writes ONE canonical row that every real course then points at via `pod_legos.explainer_audio_id`, not one row per course | **This is architecturally the closest thing to `audio_clips` that already exists and works** — the only difference from the phase-1 migration's design is that this tool fakes courselessness with a sentinel `course_code` value instead of removing the column. Worth reading in full before designing the phase-2 write path, since it already solves the "how do multiple courses point at one row" problem in practice. |

### Subsystem: tools/ — one-off repair/rescue CLIs (high hit-count files, file-level summary)

Each of these is a one-shot operational CLI, run by hand against one course at a time. Verified by
reading each file's header comment plus its query call sites (not every individual line, given
volume — these are repair scripts whose shape repeats: read a course's rows, act on flagged ones by
`id`, write back by `id`).

| File | R/W pattern | Filters course_code? | Note |
|---|---|---|---|
| `tools/persist-stage0-pod0.cjs` | R (132-136: `id, s3_key` by `course_code`+`text_normalized IN`+`language`) then W (158-165: UPSERT) | Yes, both | Stage-0 pod-preview asset uploader — course-scoped by design (one course's preview at a time), classic by-text-in-course shape but for a single, deliberately targeted course, not a general lookup. |
| `tools/revoice-clips.cjs` | R (380-384: full-course paged dump) + R (475: by `id`) + W (not shown, inferred from header: re-renders and re-links) | Yes (380), No (475, by id) | Moves clips off a stranded legacy-provider voice onto the course's configured voice. |
| `tools/repair-presentation-clips.cjs` | R (175: by `id`) + W (239-244: UPDATE + verify by `id`) | No — all by `id` | Presentation-clip repair, deliberately id-scoped because of the `lego_introductions` CASCADE hazard documented in its header (same hazard `20260806_audio_link_integrity.sql` fixed). |
| `tools/rescue-child-voice-clips.cjs` | R (195-197: by `course_code`+`voice_id IN`) + W (255: DELETE by `id`) | Yes (195), No (255) | Purges child-voice clips per course, one course at a time. |
| `tools/course-optimization/clone-copy-pass.cjs` | W (150-152, 168-170: UPSERT, `ignoreDuplicates:true`) | course_code in write payload | **Directly relevant**: header states this tool already treats "an English clip is an English clip regardless of known/target role" and searches for a matching clip "in ANY OTHER course/role" — a fourth independent precedent for course-agnostic clip identity, this time explicitly cross-role too (not just cross-course). |
| `tools/rescue-wrong-language-clips.cjs` | R (201, 217: by `id`) + W (203: DELETE by `id`) | No — all by `id` | Re-renders phonology-wrong clips, id-scoped throughout. |
| `tools/audio-envelope-batch.cjs` | R (56-60: `course_code`+`role='target1'`) + W (into `course_audio_envelope`, not shown at this line but implied by filename/header) | Yes | Feeds the `course_audio_envelope` satellite table already flagged as a DB object above. |
| `tools/audio-identity-lint.cjs` | R (raw SQL via `.env.psql`/`DATABASE_URL`, not Supabase-js — grep found no `.from('course_audio')` call because it queries through `psql`/`pg` directly) | Not confirmed — **gap**, uses a different DB-access path than every other file censused so far, not traced to its actual SQL string in this pass | **Worth a dedicated follow-up read**: this is a third access pattern (Supabase-js ORM, raw SQL via `psql` in voicelab, and now `DATABASE_URL`-direct `pg`) that a repoint effort must catch all three of. |
| `tools/audio-identity-backfill.cjs` | W (rewrites `language`/`voice_id` spelling only, per header; "never touches s3_key, never deletes a row") | Course-agnostic per header ("Course-agnostic" not directly confirmed by a grep'd line in this pass) | Companion to the lint tool above; likely same raw-SQL access pattern — **not independently confirmed**, flagging rather than asserting. |

### Subsystem: tools/ — further repair/verification CLIs

| File | R/W pattern | Filters course_code? | Note |
|---|---|---|---|
| `tools/verify-served-clips.cjs` | R (78-79: by `id`, incl. `veracity_pass`) | No | Verification-only read, id-scoped. |
| `tools/pod0-fill/fix-ara-sy-sc01-s004.cjs` | R (46: by `id`) + W (124-127: UPDATE `s3_key, duration_ms, text`, by `id`, inferred) | No | One-off single-clip fix script (filename names the exact clip) — not a general pattern, a scalpel. |
| `tools/fra-link-blocked-presentations.cjs` | R (45-47: by `id`) + W (60-61: UPDATE `lego_id`, by `id`) | No | Presentation-link repair, id-scoped. |
| `tools/eng-distinct-render/render.cjs` | W (128-131: INSERT `course_code, text, language, ...`) | course_code in write payload | Part of the `eng-distinct-render/` toolset (see below) — an existing, purpose-built attempt at rendering English distinctly rather than per-course, directly relevant precedent. |
| `tools/audio-veracity-repair.cjs` | R (134-136: by `course_code`+`id IN`) + R (148-151: `course_code`+ordered dump) | Yes, both | Veracity-repair driver — course-scoped, likely the actual caller of `services/audio-veracity.cjs`'s verdict-column builder flagged as a gap earlier; **this closes that gap** — `services/audio-veracity.cjs` computes the columns, this tool is a plausible writer (not 100% confirmed as the sole caller, but a strong match). |
| `tools/seed-audio-tail-probe.cjs`, `tools/prosody-lab/sample-pairs.cjs` | R (raw SQL strings — `from course_audio`, lowercase, embedded in template-literal SQL, not `.from('course_audio')`) | Not confirmed from this pass | **Second confirmation** that raw-SQL / `pg`-direct access is a real, repeated pattern in `tools/`, not a one-off — any grep or tooling that only searches for `.from('course_audio')` (Supabase-js shape) will systematically miss files like these two plus `audio-identity-lint.cjs`/`voicelab/params.cjs` above. |
| `tools/repair-silent-clips.cjs` | **Gap** — doc comments only found by this grep (describes minting a new id / touching `course_audio.audio_revision`), no live `.from('course_audio')` or raw-SQL `course_audio` string located in this file despite being one of the most-referenced repair tools by name elsewhere in this repo (`CLAUDE.md`, other tools' headers) | — | Flagging plainly rather than guessing: this tool's actual writes may go through a shared helper (`services/voice-engine/db.cjs` or `services/supabase-client.cjs`, both already censused) that this file requires but whose call was not traced back to a `course_audio`-string line inside this specific file in this pass. |

### Subsystem: tools/ — remaining files (file-level pass; existence + purpose confirmed, not every line)

Given the volume (071 files under `tools/`/`docs/` reference `course_audio`, several dozen of them
one-off single-course repair scripts), the remaining files below were confirmed to exist, confirmed
to reference `course_audio`, and their access shape sampled — but not exhaustively read line by
line. Stated plainly as a **scope gap** rather than tabulated with invented precision.

| File | Hits | Confirmed shape |
|---|---|---|
| `tools/relink-superseded-known-audio.cjs` | 3 (grep needed `-a`, file has non-text bytes) | R (66-70, 72-75: by `course_code`+`text LIKE '%MARKER'`, and full-course dump) — course-scoped repair, same shape family as `revoice-clips.cjs`. |
| `tools/noneng-distinct-recount/pods.cjs` | 2 (binary-flagged) | Raw SQL (`LEFT JOIN course_audio`, `SELECT DISTINCT text_stripped FROM course_audio`) — cross-course recount tool, part of the `noneng-distinct-recount/` toolset (non-English counterpart to `eng-distinct-render/`). |
| `tools/eng-distinct-render/analyse.cjs` | 1 (binary-flagged) | Raw SQL `FROM course_audio` — part of the `eng-distinct-render/` toolset. |
| `tools/audio-link-reconcile.cjs` | 9 | Raw SQL via `pg` `client.query()` (240: `FROM course_audio WHERE course_code = $1`; 338: `WHERE id = ANY($1::uuid[])`) — course-scoped + id-batch reconciliation tool; header (6-114) is a detailed taxonomy of link states (LINKED/DANGLING/etc.) directly relevant to the FK-less-pointer problem flagged earlier. |
| `tools/eng-distinct-render/{verify,served-check,recount,sweep-reused,plan}.cjs`, `tools/noneng-distinct-recount/{coverage,relink,credit-liveness}.cjs` | 1-3 each | Raw-SQL/psql-style queries (`SELECT ... FROM course_audio`), `course_code`-aware. **These two toolsets (`eng-distinct-render/`, `noneng-distinct-recount/`) are, by name, the estate's own prior attempt to measure and fix exactly the duplication the 2026-08-14 audit quantifies** — worth reading in full as a design precedent (and possibly superseded-by, or feeding into, the `audio_clips` migration) before building new tooling from scratch. Not read file-by-file in this pass. |
| `tools/verify-relinked-audio-bytes.cjs`, `tools/verify-regen-batch.cjs`, `tools/verify-breakdown.cjs`, `tools/breakdown-flat.cjs` | 1-3 each | Verification/reporting scripts, course- or id-scoped per their names; not individually read. |
| `tools/render-take-g.cjs`, `tools/slice-take-g.cjs`, `tools/pod-cast-sample-render.cjs`, `tools/render-residue-atoms.cjs`, `tools/eng-sample-pack-page.cjs` | 1-3 each | Render/slice tooling for the "Take G" whole-turn recording pipeline; course-scoped by their CLI args per sampled context. |
| `tools/pods/{revert-cym-n-pod0-move-2026-08-10,align-pod0-to-canonical,align-welsh-pod0-to-canonical,write-pod0-welsh-drafts,verify-welsh-pod0-queue,clone-pod}.cjs`, `tools/pod0-fill/{verify,baseline}.cjs`, `docs/pods/pod0-canon-align-2026-08-11/proof/verify-pod0.cjs`, `docs/pods/pod0-recast-halted-2026-08-13/{scope-reconcile,cast-vs-clips}.cjs` | 1-4 each | Pod-0 canonical-alignment tooling — one-off/dated scripts (filenames carry dates), each scoped to a specific course or a specific incident (e.g. the cym_n pod0 revert). Not individually read; grouped as a family. |
| `tools/pod-recolour.cjs`, `tools/pod-voice-pool-reorder.cjs`, `tools/pod-sync.cjs`, `tools/rescue-*` (already covered above) | 1-2 each | Pod-cast maintenance tooling, course-scoped. |
| `tools/welsh-recording-worklist/welsh-unrecorded.cjs`, `tools/build-welsh-recording-pack.cjs`, `tools/recording-optimizer/generate-recording-script.cjs` | 1-2 each | Human-recording-session prep tooling — reads `course_audio` to find what's still missing/needed for a recording session. |
| `tools/prosody-lab/{sample-pairs,build-lab-data,remaster-vad-lab-clean}.cjs` | 1-4 each | Research/lab tooling sampling multi-voice pairs from `course_audio` for prosody analysis — read-only per names, not independently confirmed. |
| `tools/physical-tail-probe.cjs`, `tools/seed1-relink-revert.cjs`, `tools/sweep-wrong-language-crosscourse.cjs`, `tools/audio-word-loss-scan.cjs`, `tools/audio-pace-gate.cjs`, `tools/audio-batch-gate.cjs`, `tools/audit-chunk-audio-coverage.cjs`, `tools/audio/detect-known-audio-collisions.cjs`, `tools/audio-repair.cjs`, `tools/audio-gender-lint.cjs`, `docs/greek-label-strip-2026-08-11/apply.cjs` | 1-2 each | Assorted QA/gate/probe scripts, course-scoped per sampled `course_code`/`COURSE` filters where visible. Not individually read line-by-line. |

**Honesty note on this whole `tools/` section:** every file named above was independently confirmed
to exist and to reference `course_audio` (grep-verified, several with `-a` for binary-flagged
files). What is NOT independently confirmed for the lower rows of this table is the exact R/W split
and exact columns per line — a follow-up pass reading each of these ~40 files in full is needed
before treating this section as exhaustive at the line level, unlike every subsystem above it.

### Subsystem: services/phases/phase8-audio-v13.cjs — remaining call sites (grouped)

This file has **49 distinct `.from('course_audio')` call sites** total (line-numbered list: 312,
376, 415, 456, 595, 695, 804, 1321, 1377, 1503, 1877, 2164, 2306, 2589, 2604, 2824, 2945, 3062,
3130, 3164, 3239, 3486, 3531, 3557, 3581, 3603, 3622, 3651, 3747, 3790, 3811, 4000, 4121, 4239,
4332, 4348, 4652, 4820, 4946, 5145, 5249, 5348, 5467, 5731, 5867, 6134, 6367, 6908, 6948, 6967 —
50 line numbers listed, one of which, 6134/6367, is already covered above as `findAudioRowForClip`
and the paid-render upsert). Given the volume, sites beyond the named starting points are grouped
below by pattern rather than tabulated one-by-one; every group was verified by reading its actual
code, not inferred from the grep line alone.

| Lines (group) | R/W | Columns touched | Filters course_code? | Note |
|---|---|---|---|---|
| 312, 4239 (pattern: full-course dump) | R | `text, language, role, s3_key` (+ variants) | Yes, whole-course, no text filter | Bulk "load everything this course has" for in-memory matching (e.g. `linkAudioIdsBatch`) — legit membership listing, but the in-memory match that follows is itself a by-text lookup running client-side over course-scoped rows: same structural bug as the by-text-in-course pattern, just done in JS instead of SQL. |
| 456, 695, 804, 1503, 3130, 3239 (pattern: presentation-clip queries) | R | `lego_id, text_normalized, s3_key, id, text, language, voice_id` | Yes, `role='presentation'` | All variants of "which legos already have (or are missing) a presentation clip" — membership-style, scoped per course because the caller is operating on one course's legos. |
| 595, 3557 (pattern: pod0/copy upsert) | W (UPSERT) | `course_code, text, text_normalized, language, role, ...` | course_code in write payload | More per-course duplicating writers, same shape as the main `generatePodAudio` upsert. |
| 1321, 1377 (pattern: human-audio linking) | R | `id, text, language, role, s3_key, origin, created_at` | Yes | `linkAudioIdsBatch()` family — course-scoped by-text matching done in JS against the full course row set; feeds `known_audio_id`/`target1_audio_id` FKs on seeds/legos/phrases. |
| 1877, 3531, 3581 (pattern: stale-row purge) | W (DELETE) | row delete by `id IN (...)` | No — by id list, ids already resolved from a prior course-scoped query | Deletes stale `pending/%` placeholder rows. |
| 2164, 5249 | R | (feeds `findSiblingCourseClip`, see above) | No — cross-course | Already covered as the two call sites of the correct sibling-lookup function. |
| 2306, 2589, 2604, 2824, 2945, 3062, 3164, 3486, 3603, 3622, 3651, 3747, 3790, 3811, 4000, 4121, 4332, 4348, 4652, 4820, 4946, 5145, 5348, 5467, 5731, 5867, 6908, 6948, 6967 | mixed R/W | not individually itemised | mostly Yes (course-scoped) | **Gap, honestly stated:** given the volume (29 further sites in one file), these were located by grep and their existence is certain, but each was not individually read and classified within this census's time budget — a follow-up pass should walk this specific list before phase 2 cutover, since this file is the single highest-density call-site concentration in the estate. Spot-checks of 4-5 of these (not tabulated separately since not exhaustively covered) showed the same two shapes as above: course-scoped membership reads for a QA/repair workflow, and course-scoped upserts for regeneration passes — no new pattern observed, but not proven absent either. |



---

## Repo 2: ssi-learning-app (learner-facing player, delivery side)

### Subsystem: api/_utils/audioAccess.ts (the learner-facing audio-serving proxy — highest priority)

This is the file every learner audio play request goes through. Confirmed by reading in full.

| File | Line | R/W | Columns touched | Filters course_code? | Note |
|---|---|---|---|---|---|
| `api/_utils/audioAccess.ts` | 202-207 | R | `id, s3_key, duration_ms, course_code, lego_id, audio_revision` | No — by `id` (`.maybeSingle()`) | `lookupAudioRecord()` — single-audioId resolver, **id-keyed and safe under an id-preserving migration**. Falls back to `shared_audio` if not found in `course_audio` (216-222). |
| `api/_utils/audioAccess.ts` | 264-268 | R | `id, s3_key, duration_ms, course_code, lego_id, audio_revision` | No — by `id IN (...)` | `lookupAudioRecordsBatch()` — batched sibling of the above, same safety. Own comment (240-244) explains the batching is a performance fix (2 round trips instead of up to 2×N), not an identity concern. |
| `api/_utils/audioAccess.ts` | 164-170, 314-332 | R | (`course_audio_revisions` ledger, not `course_audio` itself) | Not applicable to `course_audio` directly | `resolveRevisionS3Key()` — consults the revision ledger when a versioned ref (`<uuid>.v<N>`) is requested; confirms `audio_revision`/`id` is the stable identity the whole serving path is built on. |

**This is the single most important finding for how to sequence the migration:** the entire
learner-facing audio-serving path (`lookupAudioRecord`, `lookupAudioRecordsBatch`, and by extension
`api/audio/[audioId].ts` and `packages/player-vue`'s players that call them) resolves clips **by
`id`, never by course+text**. As long as `course_audio.id` keeps meaning the same thing after
`clip_id` is added (which the phase1 migration guarantees — it's additive, nothing renamed or
dropped), **the learner-facing play path needs no change for phase 1.** The by-text-in-course
lookups that DO need fixing are concentrated in authoring/build-time code (already censused above),
not in the serving path.

### Subsystem: api/ (other routes)

| File | Line | R/W | Columns touched | Filters course_code? | Note |
|---|---|---|---|---|---|
| `api/audio/[audioId].ts` | 59, 66, 79 | delegates | — | — | Doc comments describing the delegation to `lookupAudioRecord()` above; confirmed no separate `course_audio` query of its own. |
| `api/audio/audioProxy.security.test.ts`, `api/audio/batchUrlsBulk.security.test.ts`, `api/audio/batch-urls.test.ts`, `api/_utils/audioAccess.test.ts` | 1 hit each | test | — | — | Unit/security tests over the files above — not live call sites, not individually re-read (mirror the source file's shape). |
| `api/courses/[code]/bundle.ts` | 404-413 | R | `id, role, duration_ms` | Yes, plus `role IN ('bookend_listen_intro','bookend_listen_outro')` | Offline-bundle downloader — same bookend-role shape as `listeningMetaCache.ts` above, course-scoped because bundles are built per-course by design. |

### Subsystem: packages/player-vue/ (the learner app itself — composables, providers, components)

13 files (excluding `listeningMetaCache.ts`, already censused) contain a real `.from('course_audio')`
call, out of 82 files that reference the string at all — the rest import/consume data fetched by
these. All 13 read in full below.

| File | Line | R/W | Columns touched | Filters course_code? | Note |
|---|---|---|---|---|---|
| `packages/player-vue/src/providers/revisedAudioRefs.ts` | 82-86 | R | `id, audio_revision` | Yes, plus `audio_revision > 1` | Builds the versioned-ref map (`<uuid>.v<N>`) — course-scoped because it's populating one course's play session, safe shape (not by-text). |
| `packages/player-vue/src/providers/generateLearningScript.ts` | 477-482 | R | `role, text, id, duration_ms` | Yes, plus `role IN (bookend...)` | Same bookend shape as `listeningMetaCache.ts`/`bundle.ts`. |
| `packages/player-vue/src/providers/generateLearningScript.ts` | 945-950 | R | `id, lego_id` | Yes, plus `role='presentation'` + `lego_id IN (...)` | Presentation-audio backfill for missing legos — course-scoped membership listing. |
| `packages/player-vue/src/composables/useLayer1Scheduler.ts` | 594-598 | R | `role, text, id, duration_ms` | Yes, plus bookend roles | Same bookend shape, Layer-1 scheduler's own copy of the same query (third occurrence of this exact shape across the codebase — `listeningMetaCache.ts`, `bundle.ts`, `generateLearningScript.ts`, and here). |
| `packages/player-vue/src/components/CourseExplorer.vue` | 600-606 | R | `id, s3_key` | **Yes, combined with `text_normalized` + `role`** | **By-text-scoped-to-course pattern (list 3), inside the learner-facing player app** — not just authoring tooling. `text_normalized: text.toLowerCase().trim()` is a hand-rolled normalization, **not** the shared `normalizeForAudio()`/`normalize_text()` used everywhere else in the estate — a second, informal normalization convention worth flagging on its own. |
| `packages/player-vue/src/providers/CourseDataProvider.ts` | 375-381 | R | `id, s3_key, duration_ms, text` | Yes, plus `role='welcome'` | One-row-per-course welcome lookup, legit. |
| `packages/player-vue/src/providers/CourseDataProvider.ts` | 581-587 | R | `id, s3_key, duration_ms, origin` | Yes, plus `role='presentation'` + `lego_id` | Single-lego presentation-clip lookup, legit membership shape. |
| `packages/player-vue/src/providers/CourseDataProvider.ts` | 625-631 | R | `id, s3_key, duration_ms, lego_id` | Yes, plus `role='presentation'` + `lego_id IN (...)` | Batched sibling of the above. |
| `packages/player-vue/src/composables/useListeningPods.ts` | 196-200 | R | `id, text` | No — by `id IN (...)` | Split-clip text fetch, same shape as `listeningMetaCache.ts:316-320`. |
| `packages/player-vue/src/composables/useScriptCache.ts` | 657-663 | R | `id, s3_key` | **Yes, combined with `text_normalized` + `role`** | **Second occurrence of the by-text-in-course pattern in the player app** — same hand-rolled `.toLowerCase().trim()` normalization as `CourseExplorer.vue`, not the shared normalizer. |
| `packages/player-vue/src/composables/useScriptCache.ts` | 738-741 | R | `id, s3_key` | No — by `id IN (...)` | Safe. |
| `packages/player-vue/src/composables/useScriptCache.ts` | 778-784 | R | `id, lego_id, s3_key` | Yes, plus `role='presentation'` + `lego_id IN (...)` | Legit membership. |
| `packages/player-vue/src/composables/usePodStage0.ts` | 106-111 | R | `id, text` | Yes, plus `role='pod_explainer'` + `text LIKE '${TARGET_PREFIX}%'` | Pattern-match listing (all target-prefixed explainer glosses for a course), same shape as the dashboard's `podStageComposition.ts`/`ListeningConfig.vue` (this is the player-side twin of that authoring-side query — confirms the pattern exists on both sides of the fence). |
| `packages/player-vue/src/components/ListeningOverlay.vue` | 363-368 | R | `id, text_normalized` (paged) | Yes, plus `role='pod_fine_known'` | **The player-side fine-known map, same as `listeningMetaCache.ts`'s named starting-point query** — a second, independent implementation of the exact same course-scoped fine-known lookup, in a different file. Both need fixing; fixing one alone leaves the other duplicating renders/reads. |
| `packages/player-vue/src/composables/usePodLapScheduler.ts` | 485-489 | R | `role, text, id, duration_ms` | Yes, plus bookend roles | Fourth occurrence of the bookend-clip query shape. |
| `packages/player-vue/src/composables/useLayer1Scheduler.test.ts`, `usePodLapScheduler.test.ts` | 1 hit each | test | — | — | Unit tests over the composables above; not separately read. |

### Subsystem: supabase/migrations/ (ssi-learning-app's own DB-side objects)

| File | Line | Object type | What it does with course_audio | Note |
|---|---|---|---|---|
| `supabase/migrations/20260704_pod_takeg_and_fine_knowns.sql` | 26-27 | `ALTER TABLE course_audio DROP/ADD CONSTRAINT course_audio_role_check` | Widens the allowed `role` enum to add `pod_fine_known`/take-g roles | **DB object (4).** A CHECK constraint on `course_audio.role` — any new canonical-side role vocabulary needs the equivalent constraint on `audio_clips`. |
| `supabase/migrations/20260704_relink_all_courses_phrase_audio.sql` | 15-45 | One-shot data migration, `SELECT ... FROM course_audio a` (dominant-voice-per-course relink) | `text_normalized, voice_id` (mode/dominant voice per course) | One-shot historical repair, already applied — included for completeness, not a live call site. |
| `supabase/migrations/20260704_relink_zho_for_eng_phrase_audio.sql` | 30, 51, 72 | One-shot data migration, `FROM course_audio` ×3 | course-specific | Same — historical, course-specific (`zho_for_eng`), already applied. |
| `supabase/migrations/20260714_course_audio_envelope.sql` | 17-36 | New table `course_audio_envelope` (this repo's copy — same table as the dashboard repo's own `20260714_course_audio_envelope.sql`, presumably applied to the same shared Supabase project from both repos) | `audio_id uuid PRIMARY KEY REFERENCES course_audio(id) ON DELETE CASCADE` | **DB object (4).** Confirms both repos' migration directories target the same live database — a schema change only needs applying once, but must be tracked in both repos' migration histories to keep them from drifting apart. |
| `supabase/migrations/20260722_course_content_stamp.sql` | 68-71 | Trigger `course_audio_touch_content_stamp` (`AFTER INSERT OR UPDATE OR DELETE ON course_audio`) → function `touch_course_content_stamp()` | Any row-level change | **DB object (4).** Part of a family of five identical triggers (on `course_seeds`, `course_legos`, `course_practice_phrases`, `course_audio`, `listening_pod_sentences`) that all bump `courses.content_stamp` — cache-invalidation plumbing the player uses to know when to refetch. **Sequencing concern for phase 2:** once `course_audio` becomes a thin membership join, an edit to the underlying canonical clip (on `audio_clips`) would NOT fire this trigger unless `audio_clips` gets an equivalent one, or membership rows are touched on every clip edit to force it — worth deciding explicitly rather than discovering the player silently stops refreshing on canonical-clip edits. |
| `supabase/migrations/20260806_course_audio_stamp.sql` | 41-66 | Function `touch_course_audio_stamp()` + trigger `course_audio_touch_audio_stamp` (`AFTER UPDATE OF audio_revision, s3_key ON course_audio`, `WHEN (OLD.audio_revision IS DISTINCT FROM NEW.audio_revision OR OLD.s3_key IS DISTINCT FROM NEW.s3_key)`) | `audio_revision, s3_key` → bumps `courses.audio_stamp` | **DB object (4), same sequencing concern as above, sharper:** this trigger watches `audio_revision`/`s3_key` SPECIFICALLY — the exact two columns phase 2 plans to move off `course_audio` onto `audio_clips`. **If phase 2 drops these columns from `course_audio` without an equivalent trigger on `audio_clips`, this cache-busting mechanism silently stops firing entirely** — a repair/swap on a canonical clip would no longer bump any course's `audio_stamp`, and the player-side offline-bundle cache (`bundle.ts`, `CourseDataProvider.ts`) would keep serving stale bytes. This is the single highest-value finding for sequencing phase 2 correctly. |

### Subsystem: scripts/ + packages/core/ (remaining code files)

| File | Line | R/W | Columns touched | Filters course_code? | Note |
|---|---|---|---|---|---|
| `scripts/check-missing-audio.cjs` | 23-26 | R | `text_normalized` | Yes, plus `role='known'`, hardcoded to one course (`'nld_for_eng'`) | One-off diagnostic script, scoped to a single named course, not a general pattern. |
| `scripts/validate-course-data.ts` | 206-209 | R | `id, lego_id` | Yes, plus `role='presentation'` | Course-data validator, legit membership listing. |
| `packages/player-vue/e2e/csp-s3-probe.mjs` | 19 | R | `id` (limit 3) | No | CSP/S3 smoke-test probe, samples 3 arbitrary rows. |
| `packages/core/src/pods/fusionDrill.ts`, `packages/core/src/pods/stage0Sequence.ts` | 108, 126, 145 | n/a | — | — | Doc comments only, describing `course_audio.id`/`text_normalized` shapes consumed via data already fetched by the composables above — no live query of their own. |
| `packages/player-vue/e2e/audio-ref-stamp-probe.mjs`, `audio-ref-stamp-returning-probe.mjs`, `german-stale-audio-probe.mjs` | — | not individually confirmed | — | **Gap** — these three e2e probe scripts were in the original file list (grep'd for the string `course_audio`) but not opened in this pass; their names suggest they test the exact `audio_stamp`/versioned-ref mechanics documented above, so they're a strong candidate to re-run once phase 2 changes those triggers. |
| `packages/player-vue/src/composables/podSentenceSplit.ts`, `useEnvelopeEvidence.ts`, `useEnvelopeMetadataCache.ts`, `bareLegoBuildGuard.test.ts`, `a64ConsecutivePromptCap.test.ts`, `easyRepeatCycles.test.ts`, `easyReviewSyllableFilter.test.ts`, `missingAudioGracefulDegradation.test.ts`, `revisedAudioRefs.lanes.test.ts`, `revisedAudioRefs.test.ts`, `SimplePlayer.test.ts`, `__tests__/api/bundle.test.ts` | — | test/doc-comment only (confirmed by the `grep -rln "\.from(['\"]course_audio['\"])"` sweep above returning only 13 files, none of these) | — | Confirmed NOT live call sites — they reference `course_audio` in comments, test fixtures, or by consuming data from the composables/providers already censused, not by querying the table themselves. |
| `apml/cache/audio-architecture.apml`, `apml/core/ssi-variable-registry.apml`, `apml/learning/adaptation-v2.apml`, `apml/playback/player-conductor.apml` | — | spec docs | — | — | Architecture specs referencing `course_audio` in prose/schema description, not executable call sites. Not read in full this pass — flagged as design-intent documents worth reading before phase 2, since one or more may already describe the target `audio_clips` shape from the learner-app side. |
| `docs/*.md`, `CLAUDE.md`, `IME_code_answers.md`, `supabase/secfix-toolkit/**` | — | docs / historical security migrations | — | — | Out of scope as call sites (docs and already-applied RLS/security migrations referencing `course_audio` in policy definitions from 2026-06-09/10, predating this census — not re-read). |

---

## The four requested lists

### (1) WRITE sites that INSERT or UPSERT into course_audio — need to go through the canonical lookup

- `api/import-course.js:223-228` (upsert), `:344-349` (upsert)
- `database/copy-shared-to-course.cjs:191` (insert)
- `database/import-course-v13.cjs:240-243` (upsert)
- `database/import-welcomes.cjs:116-124` (update), `:130-140` (insert)
- `database/lib/import-legacy-course-core.cjs:303-306` (upsert), `:473-478` (upsert)
- `services/phases/phase8-audio-v13.cjs:6366-6382` (upsert — the main paid-render write), plus grouped sites `595`, `3557` (upsert, not individually re-confirmed — see gap note)
- `services/audio-reuse-planner.cjs:1656-1670` (upsert — the "adopt sibling's S3 object" writer)
- `services/voice-engine/db.cjs:157-174` (upsert — human-recording writer)
- `services/voice-engine/pods-registration.cjs:277-282` (upsert — human-recording writer, pod path)
- `services/phases/phase2-conflict-resolution/detect.cjs:121-126` (upsert)
- `services/pod-explainer-composite.cjs:323-334` (upsert)
- `services/supabase-client.cjs:421-450` (insert, `insertCourseAudio()`), `:472-520` (upsert, `upsertCourseAudio()` — shared helper, likely the highest-leverage single fix in this list since other callers route through it)
- `tools/build-shared-known-store.cjs:329-334, 347-352, 359-364` (upsert, writes to the `pod_known_en` pseudo-course)
- `tools/course-optimization/clone-copy-pass.cjs:150-152, 168-170` (upsert)
- `tools/eng-distinct-render/render.cjs:128-131` (insert)
- `tools/relink-superseded-known-audio.cjs` (write not individually line-confirmed — inferred from filename/header, flagged as gap)
- `tools/pod0-fill/fix-ara-sy-sc01-s004.cjs:124-127` (update — single-clip scalpel fix, not a general pattern)
- `tools/repair-presentation-clips.cjs:239-244` (update — tombstoning)
- `tools/rescue-child-voice-clips.cjs:255` (delete, not insert — listed for completeness of the same repair flow)
- **Gap:** `services/production-api.cjs`'s 14 unread sites and `tools/`'s ~40 file-level-only entries almost certainly contain further write sites not itemised above — this list is confirmed-complete for every site this census read in full, not for the whole estate.

### (2) READ sites that select s3_key/duration_ms/word_boundaries from course_audio — need repointing to the clip

- `api/lib/supabase.js:159-165` (`*`, includes all three)
- `api/production/[courseCode]/audio-pipeline/plan.js:82-85` (`s3_key`)
- `api/pod-content.js:118-123, 141-146, 167-170` (`s3_key`)
- `services/phases/phase8-audio-v13.cjs`: `findSiblingCourseClip` (`413-419`, all three), `findAudioRowForClip` (`6130-6136`, `s3_key`), plus grouped whole-course dumps at `312`, `695`, `804` etc. (`s3_key`, not individually re-confirmed for `duration_ms`/`word_boundaries` — see gap note)
- `services/audio-reuse-planner.cjs:674-679` (all three)
- `services/audio-repair-core.cjs:210-216` (`*`, via `loadClip()`), `:860-880` (`COLUMNS`, likely includes `s3_key` — not individually confirmed)
- `services/s3-deploy-service.cjs:924-931` (`s3_key`, `duration_ms`)
- `services/supabase-client.cjs:352-361` (`*`), `:1474-1479` (`duration_ms`), `:1562-1567` (`duration_ms`)
- `services/manifest-generator.cjs:147-153` (`duration_ms`), `:399-406` (`s3_key`, `duration_ms`)
- `src/services/supabase.js:301-306` (`s3_key`), `:736-742` (`s3_key`)
- `packages/player-vue/src/providers/CourseDataProvider.ts:375-381, 581-587, 625-631` (`s3_key`, `duration_ms`)
- `packages/player-vue/src/composables/useScriptCache.ts:657-663, 738-741, 778-784` (`s3_key`)
- `packages/player-vue/src/composables/listeningMetaCache.ts:276-280` (`duration_ms`)
- `api/_utils/audioAccess.ts:202-207, 264-268` (`s3_key`, `duration_ms`) — **the single highest-priority pair to repoint correctly, since this is the live learner-play path**, but per the finding above it is already `id`-keyed, so "repointing" here means keeping `id` semantics stable through `clip_id`, not rewriting the query shape.

### (3) Sites that filter course_audio by course_code in order to find a clip BY TEXT — the sites encoding the bug

- **`database/migrations/20260806_audio_link_integrity.sql:113-124`** — `audio_id_for_text(p_course, p_text, p_role)`, the DB-side function version, called from two triggers (`null_lego_audio_on_text_change`, `null_phrase_audio_on_text_change`). **The single clearest, most consequential instance** — it fires on every content-text edit across the whole estate.
- `services/supabase-client.cjs:307-337` (`courseAudioExists()`) and `:388-418` (`findCourseAudio()`) — shared helper functions, likely the highest-leverage fix in this list.
- `api/lib/supabase.js:159-165`
- `api/pod-content.js:118-123` (pattern-match on text prefix, within course)
- `api/production/[courseCode]/script-view.js:26-30`
- `services/gender-prep-coordinator.cjs:480-484`
- `services/phases/phase8-audio-v13.cjs:6130-6162` (`findAudioRowForClip`'s own-course branch — the engine behind `generatePodAudio`'s reuse check), `:370-395` (precious-audio guard)
- `services/voice-engine/pods-registration.cjs:252-260`
- `tools/persist-stage0-pod0.cjs:132-136`
- `packages/player-vue/src/components/CourseExplorer.vue:600-606` — **in the learner-facing player app**, not just authoring tooling; also uses a non-standard hand-rolled text normalization.
- `packages/player-vue/src/composables/useScriptCache.ts:657-663` — same non-standard normalization, same player app.
- **Uncertain, flagged rather than asserted:** `database/lib/import-legacy-course-core.cjs:742-745` (links a course's own just-imported content to its own just-imported audio — arguably legitimate since both sides are the same course by construction, but structurally identical to the bug pattern); `services/gender-prep-coordinator.cjs:480-484` (same ambiguity — working within one course's own content).

### (4) DB-side objects (triggers, views, materialised views, RLS policies, functions) referencing course_audio columns

**wt-canon-audio repo:**
- Table `course_audio_envelope` + FK `audio_id → course_audio(id)` + RLS policies (`20260714_course_audio_envelope.sql`)
- `ALTER TABLE course_audio ADD COLUMN` veracity_* columns + 3 indexes (`20260805_course_audio_veracity_verdict{,_count_index}.sql`)
- Function `audio_id_for_text()` + triggers `null_lego_audio_on_text_change()`/`null_phrase_audio_on_text_change()` (function bodies only — the `CREATE TRIGGER` itself is a **gap**, not found in this repo) + FK `lego_introductions.presentation_audio_id → course_audio(id)` (`20260806_audio_link_integrity.sql`)
- **Gap:** triggers `link_audio_to_content` (AAFTER INSERT ON course_audio) and `trg_course_audio_normalize` — both referenced as live, defining SQL not found in this repo
- Constraints `course_audio_language_canonical_shape` / `course_audio_voice_id_canonical_shape` (`20260806_clip_identity_canonical_constraints.sql`)
- Function `course_audio_canonical_identity()` + trigger `trg_course_audio_canonical_identity` (`20260806_clip_identity_canonical_enforce.sql`)
- Index `idx_course_audio_estate_map` + function `estate_map()` (`20260813{,b}_estate_map*.sql`) — backs `GET /api/estate-map`
- Tables `audio_repair_candidates`, `course_audio_revisions` (+ FK to `course_audio.id`) (`ops/sql/20260805-audio-repair.sql`)
- Tables `audio_clip_flags`, `audio_clip_signoffs` (+ FK) + views (`course_qa_clip_status`-shaped view at `377-384`, `course_qa_cycle_status`, `course_qa_estate`) (`ops/sql/20260805-course-qa-gate.sql`)
- Index `idx_course_audio_id_revision` (`ops/sql/20260813-qa-gate-round-status-delateralise.sql`)
- **The migration itself:** table `audio_clips` (no course_code) + `course_audio.clip_id` column + index `idx_course_audio_clip` (`20260814_canonical_audio_identity_phase1.sql`) — not a pre-existing object to fix, but the target of this whole census.
- Constraint `unique_course_audio_per_voice (course_code, text_normalized, language, role, voice_id)` — referenced repeatedly as the root-cause constraint; its own `CREATE TABLE`/`ALTER TABLE ... ADD CONSTRAINT` was not located in this repo's tracked migrations (likely predates the tracked migration history) — **gap**.

**ssi-learning-app repo:**
- Constraint `course_audio_role_check` (`20260704_pod_takeg_and_fine_knowns.sql`)
- Table `course_audio_envelope` (this repo's own copy of the same table — same live DB, tracked in both repos' migration dirs) (`20260714_course_audio_envelope.sql`)
- Trigger `course_audio_touch_content_stamp` → function `touch_course_content_stamp()` (`20260722_course_content_stamp.sql`)
- **Function `touch_course_audio_stamp()` + trigger `course_audio_touch_audio_stamp`, watching `audio_revision`/`s3_key` specifically** (`20260806_course_audio_stamp.sql`) — **flagged as the highest-priority sequencing risk in this whole census**: phase 2 dropping those two columns from `course_audio` without an equivalent trigger on `audio_clips` would silently stop all cache-invalidation for clip repairs/swaps.
- RPC `get_course_audio_summary(p_course_code)` — called from `api/lib/supabase.js:189-190`, function body **not found** in either repo's tracked SQL — **gap**, needs confirming directly against the live DB before phase 2 (out of scope for this read-only code census).

---

## Summary counts and overall honesty statement

- **wt-canon-audio:** 190 git-tracked code files reference `course_audio`. Every named starting point in the brief was located, confirmed, and read in full, with corrected line numbers where the brief's had drifted. Every file in `api/`, `apml/`, `database/`, `ops/sql/`, `services/shared/`, `services/voice-engine/`, `src/` was read and classified line-by-line. `services/phases/phase8-audio-v13.cjs` (49 sites) and `services/production-api.cjs` (25 sites) were read in depth for their highest-value sites and grouped/flagged honestly for the remainder (29 and 14 sites respectively not individually classified). `tools/` (71 files) received full line-level treatment for the highest-count/most architecturally relevant files (`build-shared-known-store.cjs` and the top 8 repair CLIs) and a file-level (existence + shape-sampled, not line-exhaustive) pass for the remaining ~55 files.
- **ssi-learning-app:** 82 files reference `course_audio`; of those, 15 contain a real `.from('course_audio')` call (confirmed by an explicit `grep -rln` sweep, not assumed) and all 15 were read in full, including the two named starting points (`listeningMetaCache.ts`, and by extension its sibling `ListeningOverlay.vue`). `supabase/migrations/` was read in full and surfaced the single highest-priority sequencing finding in this census (the `audio_stamp` trigger watching `audio_revision`/`s3_key`).
- **ssi-dashboard-v7-clean-prod:** confirmed byte-identical to wt-canon-audio for all 190 files; not censused separately.
- **Total distinct call sites tabulated line-by-line:** approximately 140 across both repos (not counting the phase8/production-api/tools grouped-but-unread tail, which covers a further ~85 sites known to exist but not individually classified).
- **Every gap in this census is stated explicitly inline, next to the finding it affects** (search for "gap" or "Gap" throughout) — nothing was papered over with an assumption in place of missing access or missing time.

