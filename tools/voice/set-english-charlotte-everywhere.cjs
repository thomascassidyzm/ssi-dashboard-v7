#!/usr/bin/env node
/**
 * ENGLISH IS CHARLOTTE EVERYWHERE — Kai's ruling, 2026-09-23 14:16Z (job #863).
 *
 * Supersedes the Gemma half of the 12:30Z Deborah + Kai ruling (job #847):
 * there is no longer a "Gemma teaches, Charlotte prompts" split. English,
 * whether it is a course's KNOWN prompt or its TARGET answer, resolves to
 * Cartesia "Charlotte" (en-GB). Tom's addition: the app controls playback
 * speed and gaps, so one clip per text can serve both roles — separate
 * known/target recordings are no longer wanted, and the cost comes down.
 *
 * ── WHAT IT WRITES (apply) ──────────────────────────────────────────────────
 *   1. voice_language_roles ('phrase','eng','f',0)  Gemma → Charlotte.
 *      This is the row target1 reads on every eng_for_* course and the row
 *      `known` falls back to; it was Gemma since Tom's 2026-09-13 cast.
 *   2. voice_language_roles ('guide','eng','f',1)   Gemma → Charlotte.
 *      A rank-1 BACKUP for the English guide (rank 0 is the Aran clone); only
 *      consulted if rank 0 is unusable, but "no Gemma" means no Gemma.
 *   3. voice_language_roles ('known','eng','f',0)   KEPT at Charlotte — the
 *      known-slot mechanism from #847 stays; it just agrees with phrase now.
 *   4. courses.voice_config for eng_for_hin: voices.target1 Gemma → Charlotte,
 *      previousVoice = Gemma, castRuling restated. No overrideLanguageCast
 *      flag: it matches the eng/f phrase cast, exactly as #847 left it.
 *   5. The column comment on voice_language_roles.slot no longer says
 *      "Gemma teaches it".
 *
 * ── WHAT IT DOES NOT DO ────────────────────────────────────────────────────
 *   • Renders NOTHING. The 8,997 Charlotte eng_for_hin target1 clips are live
 *     at revision 1 (job #827) and no Gemma clip was ever rendered, so nothing
 *     is orphaned and nothing is owed. Cartesia charges nothing for a cast row.
 *   • Leaves voices.loudness_offset_db (Charlotte = +5 dB, job #847) alone.
 *   • Leaves every male slot and every other language alone.
 *
 * Usage:  node tools/voice/set-english-charlotte-everywhere.cjs           # dry run
 *         node tools/voice/set-english-charlotte-everywhere.cjs --apply
 *         node tools/voice/set-english-charlotte-everywhere.cjs --revert --apply   # back to the #847 split
 */

'use strict';

const path = require('path');
const fs = require('fs');
const REPO = path.join(__dirname, '..', '..');
const PRIMARY = '/home/tomcassidy/SSi/ssi-dashboard-v7-clean';
for (const p of [path.join(REPO, '.env.psql'), path.join(PRIMARY, '.env.psql')]) {
  if (fs.existsSync(p)) { require('dotenv').config({ path: p, quiet: true }); break; }
}
if (!process.env.DATABASE_URL) throw new Error('no DATABASE_URL: .env.psql not found');
const { Client } = require('pg');

const CHARLOTTE = { voice_id: 'cartesia_71a7ad14-091c-4e8e-a314-022ece01c121', name: 'Charlotte' };
const GEMMA = { voice_id: 'cartesia_62ae83ad-4f6a-430b-af41-a9bede9286ca', name: 'Gemma' };
const ASSIGNED_BY = 'kai-ruling-2026-09-23-charlotte-everywhere';
const RULING = "Kai, 2026-09-23 14:16Z (job #863): English is Charlotte EVERYWHERE, known and target alike, no Gemma. Supersedes the Gemma half of the Deborah + Kai 12:30Z ruling (job #847). Tom: the app controls playback speed and gaps, so one clip per text can serve both roles. Written by tools/voice/set-english-charlotte-everywhere.cjs. Nothing rendered.";
const COURSE = 'eng_for_hin';

// Every slot row this ruling touches: (key) → { from, to } for apply; revert swaps them.
const SLOT_ROWS = [
  { slot: 'phrase', language: 'eng', gender: 'f', rank: 0 },
  { slot: 'guide', language: 'eng', gender: 'f', rank: 1 },
];

const APPLY = process.argv.includes('--apply');
const REVERT = process.argv.includes('--revert');
const want = REVERT ? GEMMA : CHARLOTTE;
const expectPrior = REVERT ? CHARLOTTE : GEMMA;

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const log = { at: new Date().toISOString(), mode: APPLY ? 'applied' : 'dryrun', revert: REVERT, steps: [] };
  if (APPLY) await c.query('begin');

  // 0. Both voices must exist and Charlotte must keep her +5 dB.
  const { rows: v } = await c.query('select voice_id, display_name, gender, is_active, loudness_offset_db from voices where voice_id = any($1)', [[CHARLOTTE.voice_id, GEMMA.voice_id]]);
  const charlotte = v.find((r) => r.voice_id === CHARLOTTE.voice_id);
  if (!charlotte) throw new Error('Charlotte has no voices row — run tools/voice/set-english-known-charlotte.cjs --apply first');
  log.steps.push({ step: 'voices', rows: v, charlotteLoudnessOffsetDb: charlotte.loudness_offset_db });

  // 1-2. The slot rows.
  for (const key of SLOT_ROWS) {
    const { rows: [prior] } = await c.query(
      'select voice_id, assigned_by from voice_language_roles where slot=$1 and language=$2 and gender=$3 and rank=$4',
      [key.slot, key.language, key.gender, key.rank]);
    const entry = { step: 'voice_language_roles', key, prior: prior || null, to: want.voice_id };
    if (!prior) { entry.action = 'skip: no row'; log.steps.push(entry); continue; }
    if (prior.voice_id === want.voice_id) { entry.action = 'already'; log.steps.push(entry); continue; }
    if (prior.voice_id !== expectPrior.voice_id) {
      entry.action = `REFUSED: row is ${prior.voice_id}, neither ${GEMMA.name} nor ${CHARLOTTE.name} — somebody else cast it, not overwriting`;
      log.steps.push(entry); continue;
    }
    entry.action = 'update';
    log.steps.push(entry);
    if (APPLY) {
      await c.query('update voice_language_roles set voice_id=$5, assigned_by=$6, notes=$7, updated_at=now() where slot=$1 and language=$2 and gender=$3 and rank=$4',
        [key.slot, key.language, key.gender, key.rank, want.voice_id, ASSIGNED_BY, REVERT ? `Reverted to ${GEMMA.name} (the #847 split) by set-english-charlotte-everywhere.cjs --revert` : RULING]);
    }
  }

  // 3. The known row is kept; just report it.
  const { rows: [known] } = await c.query("select voice_id from voice_language_roles where slot='known' and language='eng' and gender='f' and rank=0");
  log.steps.push({ step: 'known slot', kept: known || null, note: 'mechanism from #847 stays; now agrees with the phrase slot' });

  // 4. eng_for_hin target1.
  const { rows: [course] } = await c.query('select voice_config from courses where course_code=$1', [COURSE]);
  const vc = course && course.voice_config;
  const t1 = vc && vc.voices && vc.voices.target1;
  const entry = { step: 'courses.voice_config', course: COURSE, prior: t1 ? { name: t1.name, voiceId: t1.voiceId } : null };
  if (!t1) { entry.action = 'skip: no target1'; }
  else if (t1.voiceId === want.voice_id) { entry.action = 'already'; }
  else if (t1.voiceId !== expectPrior.voice_id) { entry.action = `REFUSED: target1 is ${t1.voiceId}, not ${expectPrior.name}`; }
  else {
    entry.action = 'update';
    const next = {
      ...vc,
      updatedAt: new Date().toISOString(),
      voices: {
        ...vc.voices,
        target1: {
          ...t1,
          name: want.name,
          voiceId: want.voice_id,
          gender: 'f',
          language: 'en-GB',
          provider: 'cartesia',
          previousVoice: { name: expectPrior.name, voiceId: expectPrior.voice_id, provider: 'cartesia' },
          castRuling: REVERT
            ? `Reverted to ${GEMMA.name} (the #847 split) by set-english-charlotte-everywhere.cjs --revert`
            : `${RULING} Matches the eng/f phrase-slot language cast, so no override. The 8,997 Charlotte target1 clips rendered by job #827 are the clips of record (S3 copy: preserved/charlotte-eng-for-hin-2026-09-23/).`,
        },
      },
    };
    if (APPLY) await c.query('update courses set voice_config=$2, updated_at=now() where course_code=$1', [COURSE, JSON.stringify(next)]);
  }
  log.steps.push(entry);

  // 5. The column comment.
  if (APPLY && !REVERT) {
    const comment = "phrase = the male/female course-material voices. known = the phrase voice this language uses when it is a course''s KNOWN side; gendered like phrase, read for the `known` role ahead of phrase, empty means same as phrase (slot added by Deborah + Kai 2026-09-23; Kai ruled the same day that English is Charlotte everywhere, so for eng/f both rows agree — job #863). guide = the instruction and encouragement voice, cast against the KNOWN language, one per language, gender informational only (Tom, 2026-08-29). presentation = the course narrator (the LEGO intro), also cast against the KNOWN language, also one per language and gender-informational, and also outside the completeness count (Tom, 2026-09-10).";
    await c.query(`comment on column voice_language_roles.slot is '${comment}'`);
    log.steps.push({ step: 'column comment', action: 'update' });
  }

  if (APPLY) await c.query('commit');

  // Verify against live rows, whatever mode.
  const { rows: after } = await c.query("select slot, gender, rank, voice_id from voice_language_roles where language='eng' order by slot, gender, rank");
  const { rows: [{ t1_voice }] } = await c.query("select voice_config->'voices'->'target1'->>'voiceId' t1_voice from courses where course_code=$1", [COURSE]);
  const { rows: [{ gemma_overrides }] } = await c.query("select count(*)::int gemma_overrides from courses where voice_config::text ilike '%' || $1 || '%'", [GEMMA.voice_id.replace('cartesia_', '')]);
  log.live = { eng_rows: after, [`${COURSE}_target1`]: t1_voice, courses_mentioning_gemma: gemma_overrides,
    gemma_rows_remaining: after.filter((r) => r.voice_id === GEMMA.voice_id).length };
  log.rollback = REVERT
    ? 'node tools/voice/set-english-charlotte-everywhere.cjs --apply'
    : 'node tools/voice/set-english-charlotte-everywhere.cjs --revert --apply  (phrase f0 and guide f1 back to Gemma, eng_for_hin target1 back to Gemma; known row and loudness offset untouched either way)';
  await c.end();
  console.log(JSON.stringify(log, null, 2));
}

main().catch((e) => { console.error(e.message); process.exit(1); });
