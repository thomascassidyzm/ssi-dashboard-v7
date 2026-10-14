#!/usr/bin/env node
/**
 * Aran's ruling of 2026-10-14 (job #170), NORTH SANDBOX cym_nv2_for_eng only:
 * LEGO S0264L01 'rhan o’r' / 'part of the' becomes 'rhai o’r' / 'some of the', so it matches the
 * S1457L02 phrases that now say 'rhai o’r ardaloedd' / 'some of the areas' (jobs #160, #161).
 *
 *   node tools/north-s0264l01-rhai-170.cjs                         # dry run: every row before -> after, and what is left
 *   node tools/north-s0264l01-rhai-170.cjs --apply                 # backup tables + write, ONE transaction
 *   node tools/north-s0264l01-rhai-170.cjs --undo <prefix> --test  # run the undo, fire deferred guards, check, ROLL BACK
 *   node tools/north-s0264l01-rhai-170.cjs --undo <prefix> --apply # restore
 *
 * What the ruling does, and the judgement it asked for:
 *   - The LEGO's target, known and components change. Its spoken words change on both sides, so its
 *     clips are left to the text-change trigger (null_lego_audio_on_text_change): it relinks a
 *     same-voice clip of the NEW words if one exists, else drops the link and logs it in
 *     content_audio_link_drops. The old clips themselves are never deleted (O11).
 *   - A phrase or seed changes 'rhan o’r' -> 'rhai o’r' ONLY where 'some of the' still makes sense.
 *     'rhai o’r' wants a PLURAL noun; 'rhan o’r siop / gwesty / wal / problem' are all singular, so
 *     none of the S0264L01 phrases, nor the seed, read sensibly with it. They are listed, not changed
 *     (sensible() below is the test, and it is deliberately narrow: a plural noun Aran names).
 *   - A decomposition tile must say its LEGO's words. Once S0264L01 says 'rhai o’r', a 'rhan o’r'
 *     tile pointing at it is wrong. From seed 1457 on, the course has its own 'rhan o’r' LEGO
 *     (S1457L01), so those tiles are re-pointed there. Before seed 1457 there is no other 'rhan o’r'
 *     LEGO to point at, so those rows are LISTED for Aran, not guessed at.
 *   - The S1457L02 'rhai o’r' tiles already point at S0264L01; the tool checks that and says so.
 *
 * Never touches cym_n_for_eng, cym_s_for_eng or canonical_seeds.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const COURSE = 'cym_nv2_for_eng';
const SURFACE = 'tools/north-s0264l01-rhai-170.cjs';
const LEGO = { lego_id: 'S0264L01', seed_number: 264, lego_index: 1 };
const FROM = { target: 'rhan o’r', known: 'part of the' };
const TO = { target: 'rhai o’r', known: 'some of the',
  components: [{ known: 'some', target: 'rhai' }, { known: 'of the', target: 'o’r' }] };
// The course's own 'rhan o’r' LEGO from seed 1457 on (is_new, debuts there).
const RHAN_FROM_1457 = { lego_id: 'S1457L01', seed_number: 1457 };
// Plural nouns after 'rhan o’r' that Aran has ruled read as 'rhai o’r'. Empty: none of the rows
// under S0264L01 (siop, gwesty, wal) nor the seed (problem) is plural.
const PLURAL_OK = new Set([]);

const AUDIO = { course_legos: ['known_audio_id', 'target1_audio_id', 'target2_audio_id', 'presentation_audio_id'],
  course_practice_phrases: ['known_audio_id', 'target1_audio_id', 'target2_audio_id', 'presentation_audio_id'] };
const TEXT_COLS = { course_legos: ['known_text', 'target_text', 'components'], course_practice_phrases: ['known_text', 'target_text', 'decomposition'] };

const hasRhan = (s) => typeof s === 'string' && s.includes(FROM.target);
const nounAfterRhan = (s) => (s.split(FROM.target)[1] || '').trim().split(/\s+/)[0] || '';
const sensible = (s) => PLURAL_OK.has(nounAfterRhan(s));
const tileOf = (p) => (p.decomposition || []).find((t) => t.legoId === LEGO.lego_id && t.target.trim() === FROM.target);

/** Pure: rows -> {edits, left, checks}. lego = the S0264L01 row; seed = S0264; phrases = every row
 *  filed under S0264L01 or tiling to it. */
function plan({ lego, seed, phrases }) {
  const edits = []; const left = []; const checks = [];
  if (lego.target_text !== FROM.target && lego.target_text !== TO.target) throw new Error(`S0264L01 reads "${lego.target_text}", expected "${FROM.target}"`);
  if (lego.target_text === FROM.target) {
    edits.push({ table: 'course_legos', id: lego.id, label: LEGO.lego_id, before: `${lego.target_text} / ${lego.known_text}`,
      after: `${TO.target} / ${TO.known} + components`, set: { target_text: TO.target, known_text: TO.known, components: TO.components } });
  }
  if (hasRhan(seed.target_text) && !sensible(seed.target_text)) {
    left.push(`seed S0264: "${seed.target_text}" / "${seed.known_text}" — 'some of the ${nounAfterRhan(seed.target_text)}' does not read; seed stays, and no longer contains its own LEGO S0264L01`);
  }
  for (const p of phrases) {
    const short = p.id.split(':')[1];
    const under = p.seed_number === LEGO.seed_number && p.lego_index === LEGO.lego_index;
    if (/rhai o’r/.test(p.target_text) && (p.decomposition || []).some((t) => t.target.trim() === 'rhai o’r')) {
      const t = p.decomposition.find((x) => x.target.trim() === 'rhai o’r');
      checks.push(`${short}: 'rhai o’r' tile -> ${t.legoId}${t.legoId === LEGO.lego_id ? ' (already right)' : ' (NOT S0264L01)'}`);
      continue;
    }
    if (!hasRhan(p.target_text)) { if (under) left.push(`${short}: "${p.target_text}" — filed under S0264L01 but has no 'rhan o’r' (nothing to change; it does not practise the LEGO either way)`); continue; }
    if (sensible(p.target_text)) { left.push(`${short}: plural noun, would convert — not wired (PLURAL_OK)`); continue; }
    const tile = tileOf(p);
    if (tile && p.seed_number >= RHAN_FROM_1457.seed_number) {
      edits.push({ table: 'course_practice_phrases', id: p.id, label: short, before: `'rhan o’r' tile -> S0264L01`, after: `-> ${RHAN_FROM_1457.lego_id}`,
        set: { decomposition: p.decomposition.map((t) => (t === tile ? { ...t, legoId: RHAN_FROM_1457.lego_id } : t)) } });
    } else {
      left.push(`${short}: "${p.target_text}" / "${p.known_text}" — 'some of the ${nounAfterRhan(p.target_text)}' does not read; stays${tile ? `, its 'rhan o’r' tile still points at S0264L01 (no 'rhan o’r' LEGO before S1457)` : ''}${under ? ' [filed under S0264L01]' : ''}`);
    }
  }
  return { edits, left, checks };
}

// ── DB ────────────────────────────────────────────────────────────────────────────────────
function dbUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const m = /^DATABASE_URL=(.*)$/m.exec(fs.readFileSync(path.join(__dirname, '..', '.env.psql'), 'utf8'));
  return m[1].replace(/^["']|["']$/g, '');
}
function psql(sql, { file = false } = {}) {
  const args = [dbUrl(), '-v', 'ON_ERROR_STOP=1', '-At'];
  if (file) { const f = path.join(process.env.CS_SCRATCH || require('os').tmpdir(), `n170-${process.pid}.sql`); fs.writeFileSync(f, sql); args.push('-1', '-f', f); } else args.push('-c', sql);
  const r = spawnSync('psql', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`psql failed: ${r.stderr}`);
  return r.stdout.trim();
}
const q = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const qj = (v) => (v === null || v === undefined ? 'NULL' : `${q(JSON.stringify(v))}::jsonb`);
const rows = (sql) => JSON.parse(psql(`select coalesce(json_agg(t),'[]') from (${sql}) t`));

function load() {
  const [lego] = rows(`select id,target_text,known_text,components from course_legos where course_code='${COURSE}' and seed_number=264 and lego_index=1`);
  const [seed] = rows(`select id,target_text,known_text from course_seeds where course_code='${COURSE}' and seed_number=264`);
  const phrases = rows(`select id,seed_number,lego_index,target_text,known_text,decomposition from course_practice_phrases where course_code='${COURSE}'
    and ((seed_number=264 and lego_index=1) or decomposition::text like '%"S0264L01"%') order by seed_number,lego_index,id`);
  return plan({ lego, seed, phrases });
}

function sqlFor(edits, prefix, eventId) {
  const out = [];
  const byTable = {};
  for (const e of edits) (byTable[e.table] ||= []).push(e);
  for (const [table, es] of Object.entries(byTable)) {
    out.push(`create table ${prefix}_${table.replace('course_', '')} as select * from ${table} where course_code=${q(COURSE)} and id::text in (${es.map((e) => q(e.id)).join(',')});`);
    for (const e of es) {
      const sets = Object.entries(e.set).map(([k, v]) => `${k}=${['components', 'decomposition'].includes(k) ? qj(v) : q(v)}`);
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
  return recordContentEdit(sb, { identity: serviceIdentity('north-s0264l01-rhai-170', { role: 'content-fix' }), courseCode: COURSE, surface: SURFACE, operation, scope, detail });
}

async function undo(prefix, apply, testOnly) {
  if (!/^backup_n170_[0-9]+$/.test(prefix)) throw new Error(`bad backup prefix ${prefix}`);
  const tables = psql(`select tablename from pg_tables where starts_with(tablename, '${prefix}_')`).split('\n').filter(Boolean);
  if (!tables.length) throw new Error(`no backup tables ${prefix}_*`);
  const out = []; const checks = [];
  for (const b of tables) {
    const table = `course_${b.slice(prefix.length + 1)}`;
    if (psql(`select count(*) from ${b} where course_code<>${q(COURSE)}`) !== '0') throw new Error(`refusing: ${b} holds rows outside ${COURSE}`);
    console.log(`${apply ? 'UNDO' : 'UNDO DRY RUN'} ${table}: ${psql(`select count(*) from ${b}`)} rows from ${b}`);
    // Text with links set explicitly (so the text-change trigger leaves them), straight from the backup.
    const cols = [...TEXT_COLS[table], ...AUDIO[table], 'last_edit_event_id'];
    out.push(`update ${table} t set ${cols.map((c) => `${c}=b.${c}`).join(', ')} from ${b} b where t.id=b.id;`);
    checks.push(`select '${table} rows differing from backup after undo: '||count(*) from ${table} t join ${b} b using(id) where ${[...TEXT_COLS[table], ...AUDIO[table]].map((c) => `t.${c} is distinct from b.${c}`).join(' or ')}`);
  }
  if (testOnly) {
    const r = spawnSync('psql', [dbUrl(), '-At', '-v', 'ON_ERROR_STOP=1'], { encoding: 'utf8',
      input: ['begin;', ...out, 'set constraints all immediate;', ...checks.map((c) => c + ';'), 'rollback;'].join('\n') });
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
  const { edits, left, checks } = load();
  console.log(`${apply ? 'APPLY' : 'DRY RUN'} on ${COURSE}: ${edits.length} rows`);
  for (const e of edits) console.log(`  ${e.label}: ${e.before}  ->  ${e.after}`);
  console.log(`\n[S1457L02 check]\n  ${checks.join('\n  ')}`);
  console.log(`\n[left for Aran: ${left.length}]\n  ${left.join('\n  ')}`);
  if (!edits.length) return console.log('nothing to do');
  if (!apply) return console.log('\n(dry run: nothing written; add --apply)');
  const prefix = `backup_n170_${new Date().toISOString().replace(/\D/g, '').slice(0, 12)}`;
  const eventId = await record('update', { seed_numbers: [264], lego_ids: [LEGO.lego_id], phrase_ids: edits.filter((e) => e.table === 'course_practice_phrases').map((e) => e.id) },
    { ruling: 'Aran 2026-10-14 S0264L01 rhan o’r -> rhai o’r', backup_prefix: prefix, rows: edits.length });
  psql(sqlFor(edits, prefix, eventId), { file: true });
  console.log(`\nwritten. backup tables ${prefix}_*\nundo: node ${SURFACE} --undo ${prefix} --apply`);
}

module.exports = { plan, sqlFor, nounAfterRhan };
if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
