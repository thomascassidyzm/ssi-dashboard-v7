#!/usr/bin/env node
/**
 * Aran's ruling of 2026-10-14 (job #191), NORTH SANDBOX cym_nv2_for_eng only:
 * 'panad gref o goffi' (and the mutated 'banad gref', and 'gref o goffi' inside longer lines) -> 'cryf'.
 * Applies to the Welsh side only (target_text, components[].target, decomposition[].target).
 *
 *   node tools/north-panad-cryf-191.cjs                         # dry run: every row before -> after
 *   node tools/north-panad-cryf-191.cjs --apply                 # backup tables + write, ONE transaction
 *   node tools/north-panad-cryf-191.cjs --undo <prefix> --test  # run the undo, check, ROLL BACK
 *   node tools/north-panad-cryf-191.cjs --undo <prefix> --apply # restore
 *
 * Re-record rule: the spoken words change, so any linked audio must be unlinked. The row is read live
 * and, if it carries a link, the link is set NULL (the clip itself is never deleted); an unlinked row
 * is already in the fill-empty booth queues. Any 'gref' NOT in a 'gref o goffi' phrase is reported, not changed.
 * Never touches cym_n_for_eng, cym_s_for_eng or canonical_seeds.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const COURSE = 'cym_nv2_for_eng';
const SURFACE = 'tools/north-panad-cryf-191.cjs';
const WORD = /(^|[^\p{L}])gref(?![\p{L}])/gu;
const IN_COFFEE = /(^|[^\p{L}])gref o goffi/u;
const AUDIO = ['known_audio_id', 'target1_audio_id', 'target2_audio_id', 'presentation_audio_id'];
const TABLES = {
  course_seeds: { cols: ['target_text'], audio: ['known_audio_id', 'target1_audio_id', 'target2_audio_id'] },
  course_legos: { cols: ['target_text', 'components'], audio: AUDIO },
  course_practice_phrases: { cols: ['target_text', 'decomposition'], audio: AUDIO },
};

const fix = (s) => s.replace(WORD, '$1cryf');
/** Pure: swap 'gref' for 'cryf' in the target text and in the target of each tile/component. */
function fixRow(row, cols) {
  const set = {};
  for (const c of cols) {
    const v = row[c];
    if (v == null) continue;
    if (typeof v === 'string') { const n = fix(v); if (n !== v) set[c] = n; }
    else { const n = v.map((t) => (typeof t.target === 'string' ? { ...t, target: fix(t.target) } : t)); if (JSON.stringify(n) !== JSON.stringify(v)) set[c] = n; }
  }
  return set;
}
/** Pure: the 'gref' occurrences that are NOT part of 'gref o goffi' (a tile 'gref' of a coffee row is checked by the caller). */
const strayGref = (text) => typeof text === 'string' && WORD.test(text) && !IN_COFFEE.test(text);

function dbUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const m = /^DATABASE_URL=(.*)$/m.exec(fs.readFileSync(path.join(__dirname, '..', '.env.psql'), 'utf8'));
  return m[1].replace(/^["']|["']$/g, '');
}
function psql(sql, { file = false } = {}) {
  const args = [dbUrl(), '-v', 'ON_ERROR_STOP=1', '-At'];
  if (file) { const f = path.join(process.env.CS_SCRATCH || require('os').tmpdir(), `n191-${process.pid}.sql`); fs.writeFileSync(f, sql); args.push('-1', '-f', f); } else args.push('-c', sql);
  const r = spawnSync('psql', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`psql failed: ${r.stderr}`);
  return r.stdout.trim();
}
const q = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const qj = (v) => `${q(JSON.stringify(v))}::jsonb`;
const rows = (sql) => JSON.parse(psql(`select coalesce(json_agg(t),'[]') from (${sql}) t`));

/** Read live. */
function load() {
  const edits = []; const stray = [];
  for (const [table, def] of Object.entries(TABLES)) {
    const idcol = table === 'course_practice_phrases' ? 'id' : 'id::text as id';
    const lbl = table === 'course_seeds' ? `seed_id` : table === 'course_legos' ? `lego_id` : `id`;
    const all = rows(`select ${idcol}, ${lbl} as label, ${def.cols.join(',')}, ${def.audio.join(',')} from ${table} where course_code='${COURSE}'
      and (${def.cols.map((c) => `${c}::text ilike '%gref%'`).join(' or ')}) order by 2`);
    for (const r of all) {
      const text = r.target_text;
      if (!IN_COFFEE.test(text) && !(table !== 'course_seeds' && r.label.endsWith('C02') && /^gref$/.test(text))) { stray.push(`${table} ${r.label}: "${text}"`); continue; }
      const set = fixRow(r, def.cols);
      if (!Object.keys(set).length) continue;
      const linked = def.audio.filter((a) => r[a]);
      edits.push({ table, id: r.id, label: r.label, before: text, after: set.target_text ?? text, set, unlink: linked, audioWas: Object.fromEntries(linked.map((a) => [a, r[a]])) });
    }
  }
  return { edits, stray };
}

function sqlFor(edits, prefix, eventId) {
  const out = []; const by = {};
  for (const e of edits) (by[e.table] ||= []).push(e);
  for (const [table, es] of Object.entries(by)) {
    out.push(`create table ${prefix}_${table.replace('course_', '')} as select * from ${table} where course_code=${q(COURSE)} and id::text in (${es.map((e) => q(e.id)).join(',')});`);
    for (const e of es) {
      const sets = Object.entries(e.set).map(([k, v]) => `${k}=${typeof v === 'string' ? q(v) : qj(v)}`);
      for (const a of e.unlink) sets.push(`${a}=NULL`);
      if (eventId) sets.push(`last_edit_event_id=${q(eventId)}`);
      out.push(`update ${table} set ${sets.join(', ')} where course_code=${q(COURSE)} and id::text=${q(e.id)};`);
    }
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
  return recordContentEdit(sb, { identity: serviceIdentity('north-panad-cryf-191', { role: 'content-fix' }), courseCode: COURSE, surface: SURFACE, operation, scope, detail });
}

async function undo(prefix, apply, testOnly) {
  if (!/^backup_n191_[0-9]+$/.test(prefix)) throw new Error(`bad backup prefix ${prefix}`);
  const tables = psql(`select tablename from pg_tables where starts_with(tablename, '${prefix}_')`).split('\n').filter(Boolean);
  if (!tables.length) throw new Error(`no backup tables ${prefix}_*`);
  const out = []; const checks = [];
  for (const b of tables) {
    const table = `course_${b.slice(prefix.length + 1)}`;
    if (psql(`select count(*) from ${b} where course_code<>${q(COURSE)}`) !== '0') throw new Error(`refusing: ${b} holds rows outside ${COURSE}`);
    console.log(`${apply ? 'UNDO' : 'UNDO DRY RUN'} ${table}: ${psql(`select count(*) from ${b}`)} rows from ${b}`);
    const cols = [...TABLES[table].cols, ...TABLES[table].audio, 'last_edit_event_id'];
    out.push(`update ${table} t set ${cols.map((c) => `${c}=b.${c}`).join(', ')} from ${b} b where t.id=b.id;`);
    checks.push(`select '${table} rows differing from backup after undo: '||count(*) from ${table} t join ${b} b using(id) where ${[...TABLES[table].cols, ...TABLES[table].audio].map((c) => `t.${c} is distinct from b.${c}`).join(' or ')}`);
  }
  if (testOnly) {
    const r = spawnSync('psql', [dbUrl(), '-At', '-v', 'ON_ERROR_STOP=1'], { encoding: 'utf8', input: ['begin;', ...out, 'set constraints all immediate;', ...checks.map((c) => c + ';'), 'rollback;'].join('\n') });
    console.log(r.stdout.trim(), r.stderr.trim());
    return;
  }
  if (!apply) return console.log(out.join('\n'));
  await record('update', {}, { undo_of: prefix });
  psql(out.join('\n'), { file: true });
  console.log('restored.');
}

async function main() {
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  if (argv[0] === '--undo') return undo(argv[1], apply, argv.includes('--test'));
  const { edits, stray } = load();
  console.log(`${apply ? 'APPLY' : 'DRY RUN'} on ${COURSE}: ${edits.length} rows`);
  for (const e of edits) console.log(`  ${e.table} ${e.label}: "${e.before}"  ->  "${e.after}"${e.unlink.length ? `  [unlink ${e.unlink.join(',')}]` : ''}`);
  console.log(`\n[other 'gref', left alone: ${stray.length}]\n  ${stray.join('\n  ') || '(none)'}`);
  if (!edits.length) return console.log('nothing to do');
  if (!apply) return console.log('\n(dry run: nothing written; add --apply)');
  const prefix = `backup_n191_${new Date().toISOString().replace(/\D/g, '').slice(0, 12)}`;
  const eventId = await record('update', { lego_ids: edits.filter((e) => e.table === 'course_legos').map((e) => e.label), seed_numbers: [1489],
    phrase_ids: edits.filter((e) => e.table === 'course_practice_phrases').map((e) => e.id) }, { ruling: 'Aran 2026-10-14 panad gref o goffi -> panad cryf o goffi', backup_prefix: prefix, rows: edits.length });
  psql(sqlFor(edits, prefix, eventId), { file: true });
  console.log(`\nwritten. backup tables ${prefix}_*\nundo: node ${SURFACE} --undo ${prefix} --apply`);
}

module.exports = { fix, fixRow, strayGref };
if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
