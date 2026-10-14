#!/usr/bin/env node
/**
 * Aran's ruling of 2026-10-14 (job #198), NORTH SANDBOX cym_nv2_for_eng only:
 * four practice phrases under LEGO S0145L01 'pump' / 'five', written by Aran (text only, no audio).
 *
 *   node tools/north-s0145l01-pump-phrases-198.cjs                         # dry run: the rows that would be inserted
 *   node tools/north-s0145l01-pump-phrases-198.cjs --apply                 # backup table + insert, ONE transaction
 *   node tools/north-s0145l01-pump-phrases-198.cjs --undo <prefix> --test  # run the undo, fire deferred guards, ROLL BACK
 *   node tools/north-s0145l01-pump-phrases-198.cjs --undo <prefix> --apply # delete the four rows
 *
 * Conventions copied from the LEGO's own rows (B03-B06) and its neighbour S0145L02:
 *   - ids are <course>:S0145L01<B|U><nn>; build positions 1-2 were FREE (B03-B06 sit at 3-6, never
 *     renumbered), so the two build phrases take B01/B02 at positions 1/2; use phrases follow the
 *     last build at U01/U02, positions 7/8 (S0145L02 runs B01-B07 then U01 at position 8).
 *   - decomposition: a tile per LEGO already taught before seed 145 ('mae o' S0061L01, 'dw i’n meddwl'
 *     S0024L02), 'bump' is the salient tile for S0145L01, every other word is a ghost tile.
 *     'mae hi', 'fod o’n' and 'bod hi’n' are not LEGOs by seed 145, so they are ghosts.
 *   - connected_lego_ids = the other LEGOs tiled; lego_position stays NULL (as on B03-B06).
 *   - status 'draft' (as the 10-14 #142 inserts): Aran's text, no audio yet. The recording queues read
 *     course_practice_phrases directly (services/voice-engine/phrase-queue.cjs) so no queue write is needed.
 *
 * Never touches cym_n_for_eng, cym_s_for_eng or canonical_seeds.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const COURSE = 'cym_nv2_for_eng';
const SURFACE = 'tools/north-s0145l01-pump-phrases-198.cjs';
const LEGO = { lego_id: 'S0145L01', seed_number: 145, lego_index: 1 };

const G = (target) => ({ known: '', legoId: null, target, isGhost: true });
const HE = { known: 'he', legoId: 'S0061L01', target: 'mae o', isGhost: false };
const THINK = { known: 'I think', legoId: 'S0024L02', target: 'dw i’n meddwl', isGhost: false };
const FIVE = { known: 'five', legoId: 'S0145L01', target: ' bump', isGhost: false, isSalient: true };

// role, id suffix, position, known, target, tiles. The words are Aran's, exactly.
const PHRASES = [
  ['build', 'B01', 1, 'he’s five', 'mae o’n bump', [HE, G('’n'), FIVE]],
  ['build', 'B02', 2, 'she’s five', 'mae hi’n bump', [G('mae'), G(' hi’n'), FIVE]],
  ['use', 'U01', 7, 'I think he’s five', 'dw i’n meddwl fod o’n bump', [THINK, G(' fod'), G(' o’n'), FIVE]],
  ['use', 'U02', 8, 'I think she’s five', 'dw i’n meddwl bod hi’n bump', [THINK, G(' bod'), G(' hi’n'), FIVE]],
];

/** Pure: -> rows to insert. Checks each tile list spells the target exactly. */
function plan() {
  const { countTargetSyllables } = require('../services/voice-engine/phrase-queue.cjs');
  return PHRASES.map(([role, suffix, position, known, target, tiles]) => {
    const spelt = tiles.map((t) => t.target).join('');
    if (spelt !== target) throw new Error(`${suffix}: tiles spell "${spelt}", not "${target}"`);
    if (!/^[^']*$/.test(target + known)) throw new Error(`${suffix}: straight apostrophe`);
    return {
      id: `${COURSE}:${LEGO.lego_id}${suffix}`, ...LEGO, position, phrase_role: role, known_text: known, target_text: target,
      word_count: target.split(/\s+/).length, lego_count: 1, target_syllable_count: countTargetSyllables(target),
      connected_lego_ids: [...new Set(tiles.filter((t) => t.legoId && t.legoId !== LEGO.lego_id).map((t) => t.legoId))],
      decomposition: tiles,
    };
  });
}

// ── DB ────────────────────────────────────────────────────────────────────────────────────
function dbUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const m = /^DATABASE_URL=(.*)$/m.exec(fs.readFileSync(path.join(__dirname, '..', '.env.psql'), 'utf8'));
  return m[1].replace(/^["']|["']$/g, '');
}
function psql(sql, { file = false } = {}) {
  const args = [dbUrl(), '-v', 'ON_ERROR_STOP=1', '-At'];
  if (file) { const f = path.join(process.env.CS_SCRATCH || require('os').tmpdir(), `n198-${process.pid}.sql`); fs.writeFileSync(f, sql); args.push('-1', '-f', f); } else args.push('-c', sql);
  const r = spawnSync('psql', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`psql failed: ${r.stderr}`);
  return r.stdout.trim();
}
const q = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const qj = (v) => `${q(JSON.stringify(v))}::jsonb`;

function sqlFor(rows, prefix, eventId) {
  const out = [`create table ${prefix}_inserted as select unnest(array[${rows.map((r) => q(r.id)).join(',')}]) as id, ${q(COURSE)}::text as course_code;`];
  for (const r of rows) {
    out.push(`insert into course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count, target_syllable_count, metadata, status, phrase_role, connected_lego_ids, lego_position, introduce, decomposition, lego_id, last_edit_event_id) values (${[
      q(r.id), q(COURSE), r.seed_number, r.lego_index, r.position, q(r.known_text), q(r.target_text), r.word_count, r.lego_count, r.target_syllable_count,
      qj({ format: 'build_use', source: 'written by Aran (Welsh methodology lead)', job: '#198' }), "'draft'", q(r.phrase_role),
      `'{${r.connected_lego_ids.join(',')}}'`, 'NULL', 'true', qj(r.decomposition), q(r.lego_id), q(eventId)].join(', ')});`);
  }
  return out.join('\n');
}

async function record(operation, scope, detail) {
  const { createClient } = require('@supabase/supabase-js');
  const { serviceIdentity } = require('../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../services/shared/content-edit-log.cjs');
  for (const line of fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').split('\n')) {
    const m = /^(SUPABASE_URL|SUPABASE_SERVICE_KEY)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  return recordContentEdit(sb, { identity: serviceIdentity('north-s0145l01-pump-phrases-198', { role: 'content-fix' }), courseCode: COURSE, surface: SURFACE, operation, scope, detail });
}

function undo(prefix, apply, testOnly) {
  if (!/^backup_n198_[0-9]+$/.test(prefix)) throw new Error(`bad backup prefix ${prefix}`);
  const b = `${prefix}_inserted`;
  if (psql(`select count(*) from ${b} where course_code<>${q(COURSE)}`) !== '0') throw new Error(`refusing: ${b} holds rows outside ${COURSE}`);
  const out = [`delete from course_practice_phrases t using ${b} b where t.id=b.id and t.course_code=${q(COURSE)};`];
  const check = `select 'rows left after undo: '||count(*) from course_practice_phrases t join ${b} b using(id)`;
  if (testOnly) {
    const r = spawnSync('psql', [dbUrl(), '-At', '-v', 'ON_ERROR_STOP=1'], { encoding: 'utf8', input: ['begin;', ...out, 'set constraints all immediate;', check + ';', 'rollback;'].join('\n') });
    return console.log(r.stdout.trim(), r.stderr.trim());
  }
  if (!apply) return console.log(out.join('\n'));
  psql(out.join('\n'), { file: true });
  console.log(`deleted. ${psql(check)}`);
}

async function main() {
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  if (argv[0] === '--undo') return undo(argv[1], apply, argv.includes('--test'));
  const rows = plan();
  const have = psql(`select id from course_practice_phrases where course_code=${q(COURSE)} and lego_id=${q(LEGO.lego_id)}`).split('\n').filter(Boolean);
  const clash = psql(`select id||' at position '||position from course_practice_phrases where course_code=${q(COURSE)} and seed_number=145 and lego_index=1 and (position in (${rows.map((r) => r.position)}) or id in (${rows.map((r) => q(r.id))}))`);
  if (clash) throw new Error(`id/position already taken: ${clash}`);
  console.log(`${apply ? 'APPLY' : 'DRY RUN'} on ${COURSE}: ${rows.length} new rows under ${LEGO.lego_id} (existing: ${have.map((h) => h.split(':')[1]).join(', ')})`);
  for (const r of rows) console.log(`  ${r.id.split(':')[1]} pos ${r.position} ${r.phrase_role}: ${r.target_text} / ${r.known_text}  connected=${JSON.stringify(r.connected_lego_ids)} tiles=${r.decomposition.map((t) => t.legoId || '·').join(',')}`);
  if (!apply) return console.log('\n(dry run: nothing written; add --apply)');
  const prefix = `backup_n198_${new Date().toISOString().replace(/\D/g, '').slice(0, 12)}`;
  const eventId = await record('insert', { seed_numbers: [145], lego_ids: [LEGO.lego_id], phrase_ids: rows.map((r) => r.id) }, { ruling: 'Aran 2026-10-14 four pump/five phrases', backup_prefix: prefix, rows: rows.length });
  psql(sqlFor(rows, prefix, eventId), { file: true });
  console.log(`\nwritten. backup table ${prefix}_inserted\nundo: node ${SURFACE} --undo ${prefix} --apply`);
}

module.exports = { plan, sqlFor };
if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
