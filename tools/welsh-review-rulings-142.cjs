#!/usr/bin/env node
/**
 * Aran's Welsh review rulings of 2026-10-14 (job #142), applied to the v2 SANDBOX courses only.
 *
 *   node tools/welsh-review-rulings-142.cjs unmutate            # SOUTH: 33 LEGOs stored soft-mutated → radical form, + 'fy i arian nôl'
 *   node tools/welsh-review-rulings-142.cjs unrhyw-beth         # SOUTH: 'unrhywbeth' → 'unrhyw beth' in seeds, LEGOs, phrases, decompositions
 *   node tools/welsh-review-rulings-142.cjs unlink-stale        # NORTH: drop the four stale clips #836 left behind
 *   node tools/welsh-review-rulings-142.cjs north-s0076l03 --plan <regenerate-debut-practice plan.json>   # NORTH: 4 BUILD + 3 USE
 *   ... <part> --apply                                         # backup tables + write, in ONE transaction
 *   node tools/welsh-review-rulings-142.cjs --undo <backup_prefix> [--apply | --test]   # --test: run it, check, ROLL BACK
 *
 * The rules, as Aran gave them:
 *   - A Welsh word on its own is unmutated; it mutates only after a trigger. So a LEGO row (a word or
 *     chunk on its own) is stored in its radical form. A phrase keeps whatever mutation its context
 *     needs; it is changed only when it copies the bare mutated LEGO at its START, with nothing before
 *     it to trigger the mutation. Adverbial mutation is a trigger in its own right, so the adverbials
 *     'gymaint â phosib' and 'ddiwedd mis …' keep theirs (ADVERBIAL_KEEP).
 *   - 'unrhywbeth' is written 'unrhyw beth'. It SOUNDS the same, so every clip on those rows is kept:
 *     the text-change trigger (null_*_audio_on_text_change, job #778) only leaves a link alone when the
 *     writer sets it explicitly in the same UPDATE, so the text goes in with the link cleared and the
 *     link is put straight back from the backup table, inside the same transaction.
 *   - A row whose SPEECH changes (fwcio → bwcio) is left to that trigger: it relinks a same-voice clip
 *     of the new words if one exists, else drops the stale one.
 *
 * Never touches cym_n_for_eng, cym_s_for_eng or canonical_seeds (SANDBOX).
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { mirrorEdit } = require('./apply-phrase-review-answers.cjs');

const SANDBOX = new Set(['cym_nv2_for_eng', 'cym_sv2_for_eng']);
const SURFACE = 'tools/welsh-review-rulings-142.cjs';
const SOUTH = 'cym_sv2_for_eng';
const NORTH = 'cym_nv2_for_eng';
const AUDIO = { course_seeds: ['known_audio_id', 'target1_audio_id', 'target2_audio_id'],
  course_legos: ['known_audio_id', 'target1_audio_id', 'target2_audio_id', 'presentation_audio_id'],
  course_practice_phrases: ['known_audio_id', 'target1_audio_id', 'target2_audio_id', 'presentation_audio_id'] };
const TEXT_COLS = { course_seeds: ['known_text', 'target_text'], course_legos: ['known_text', 'target_text', 'components'],
  course_practice_phrases: ['known_text', 'target_text', 'decomposition'] };

// The 33 LEGOs the South review (2026-10-13, lego_wide) found stored soft-mutated with no trigger.
// Only the FIRST word ever differs, so `firstWord` is the whole edit.
const UNMUTATE = [
  ['fwyta', 'bwyta'], ['gymaint â', 'cymaint â'], ['wneud camgymeriadau', 'gwneud camgymeriadau'],
  ['brofi dy hunan', 'profi dy hunan'], ['fynd gytre', 'mynd gytre'], ['ofyn i dy hunan', 'gofyn i dy hunan'],
  ['garedig iawn ohonot ti', 'caredig iawn ohonot ti'], ['fyddai’n digwydd', 'byddai’n digwydd'],
  ['rywbeth gwahanol', 'rhywbeth gwahanol'], ['ddweud e', 'dweud e'], ['drio helpu', 'trio helpu'],
  ['ofyn am', 'gofyn am'], ['fod yn barod', 'bod yn barod'], ['bwysica’', 'pwysica’'], ['fwcio', 'bwcio'],
  ['gadw bwrdd', 'cadw bwrdd'], ['gymaint â phosib', 'cymaint â phosib'], ['ddal y trên', 'dal y trên'],
  ['fyd mawr', 'byd mawr'], ['ddiwedd', 'diwedd'], ['galon', 'calon'], ['bont', 'pont'],
  ['ddishgled gryf o', 'dishgled gryf o'], ['goffi', 'coffi'], ['fynd ar goll', 'mynd ar goll'],
  ['wely newydd', 'gwely newydd'], ['barco’r car', 'parco’r car'], ['gyrraedd', 'cyrraedd'],
  ['ddala’r drws ar agor', 'dala’r drws ar agor'], ['ddiwrnod cyntaf', 'diwrnod cyntaf'],
  ['bedair munud', 'pedair munud'], ['rannu', 'rhannu'], ['fywiog', 'bywiog'],
];
// Not a mutation: the LEGO's word order is garbled; every phrase under it already says 'fy arian i nôl'.
const GARBLED = [['fy i arian nôl', 'fy arian i nôl']];
// Phrases that open with the mutated form but are ADVERBIAL, so the mutation is the grammar's, not a copy.
const ADVERBIAL_KEEP = [/^gymaint â phosib\b/, /^ddiwedd mis\b/];

const firstWord = (s) => s.split(' ')[0];

/** Pure: the row edits for the unmutate part. legos/phrases are DB rows. */
function planUnmutate(legos, phrases) {
  const pairs = new Map([...UNMUTATE, ...GARBLED]);
  const edits = []; const kept = [];
  const legoByKey = new Map();
  for (const l of legos) {
    const to = pairs.get(l.target_text);
    if (!to) continue;
    legoByKey.set(`${l.seed_number}:${l.lego_index}`, l);
    const set = { target_text: to };
    if (Array.isArray(l.components) && l.components.length) {
      const [fw, tw] = [firstWord(l.target_text), firstWord(to)];
      let done = false;
      set.components = l.components.map((c) => {
        if (done || !c.target) return c;
        if (c.target === l.target_text) { done = true; return { ...c, target: to }; }
        if (firstWord(c.target) === fw && fw !== tw) { done = true; return { ...c, target: tw + c.target.slice(fw.length) }; }
        return c;
      });
      if (!done) delete set.components;
    }
    edits.push({ table: 'course_legos', id: l.id, label: l.lego_id, before: l.target_text, set });
  }
  for (const p of phrases) {
    const l = legoByKey.get(`${p.seed_number}:${p.lego_index}`);
    if (!l || GARBLED.some(([g]) => g === l.target_text)) continue;
    const from = l.target_text; const to = pairs.get(from);
    const fw = firstWord(from);
    if (!(p.target_text === from || p.target_text.startsWith(fw + ' ') || p.target_text === fw)) continue;
    if (ADVERBIAL_KEEP.some((re) => re.test(p.target_text))) { kept.push(`${p.id}: "${p.target_text}" (adverbial, keeps its mutation)`); continue; }
    const newText = firstWord(to) + p.target_text.slice(fw.length);
    const set = { target_text: newText };
    if (p.decomposition) {
      const m = mirrorEdit(p.decomposition, 'target', p.target_text, newText);
      if (m.status === 'ok') set.decomposition = m.segments;
      else kept.push(`${p.id}: decomposition not mirrored (${m.status})`);
    }
    edits.push({ table: 'course_practice_phrases', id: p.id, label: p.id.split(':')[1], before: p.target_text, set });
  }
  return { edits, kept };
}

const UNRHYW = /([Uu])nrhywbeth/g;
const fixUnrhyw = (s) => (typeof s === 'string' ? s.replace(UNRHYW, '$1nrhyw beth') : s);
const fixSegs = (arr) => (Array.isArray(arr) ? arr.map((c) => ({ ...c, target: fixUnrhyw(c.target) })) : arr);

/** Pure: 'unrhywbeth' → 'unrhyw beth'. Same sound, so every audio link on these rows is KEPT. */
function planUnrhyw(rowsByTable) {
  const edits = [];
  for (const [table, rows] of Object.entries(rowsByTable)) {
    for (const r of rows) {
      const set = {};
      const has = (v) => /unrhywbeth/i.test(typeof v === 'string' ? v : JSON.stringify(v || null));
      if (has(r.target_text)) set.target_text = fixUnrhyw(r.target_text);
      if (table === 'course_legos' && has(r.components)) set.components = fixSegs(r.components);
      if (table === 'course_practice_phrases' && has(r.decomposition)) set.decomposition = fixSegs(r.decomposition);
      if (!Object.keys(set).length) continue;
      edits.push({ table, id: r.id, label: r.lego_id || r.seed_id || String(r.id).split(':')[1], before: r.target_text, set, keepAudio: true });
    }
  }
  return { edits, kept: [] };
}

// NORTH: rows #836 rewrote whose clips spoke the OLD words. Only the named column is cleared. On 2026-10-14
// the text-change trigger had already dropped all six of those links when #836 wrote (content_audio_link_drops,
// 2026-10-13 18:52Z), so this part finds nothing to do; it stays as the check.
const STALE = [
  { id: 'cym_nv2_for_eng:S0123L02B02', cols: ['target1_audio_id', 'target2_audio_id'] },
  { id: 'cym_nv2_for_eng:S0127L01B07', cols: ['target1_audio_id', 'target2_audio_id'] },
  { id: 'cym_nv2_for_eng:S0121L01B04', cols: ['known_audio_id'] },
  { id: 'cym_nv2_for_eng:S0131L01B01', cols: ['known_audio_id'] },
];

// NORTH S0076L03 "he wanted me to tell you" had no practice. Phrase v3 (regenerate-debut-practice.cjs
// --lego S0076L03, plan only) wrote 4 BUILD + 7 USE and its gate passed them; Aran asked for 4 + 3, so
// the three USE lines kept are the plainest North ones (the four left out used 'bo’ ti', a South form,
// 'ti’n siarad hi' and 'dw i’n meddwl oedd o'). They are written here rather than by that tool's APPLY
// because its APPLY also queues an audio pass, and this was a text-only ruling.
const S0076L03_USE = ['mae’n ddrwg gen i ond oedd o isio i mi ddeud wrthot ti',
  'do’n i ddim isio siarad ond oedd o isio i mi ddeud wrthot ti',
  'oedd o isio i mi ddeud wrthot ti rŵan ond fedra i ddim'];

/** Pure: plan entry (from regenerate-debut-practice) -> rows to insert. */
function planNewPhrases(entry, keepUse, capitaliseEnglish) {
  const { makePhraseId, computeLegoPosition } = require('../services/course-builder/lib/phrase-structure.cjs');
  const use = keepUse.map((t) => entry.use.find((u) => u.target === t) || (() => { throw new Error(`USE "${t}" not in plan`); })());
  const out = []; let pos = 0;
  for (const [role, list] of [['build', entry.build], ['use', use]]) {
    list.forEach((ph, i) => {
      pos += 1;
      const known = capitaliseEnglish(ph.known);
      out.push({ id: makePhraseId(NORTH, entry.seed_number, entry.lego_index, role, i + 1), seed_number: entry.seed_number, lego_index: entry.lego_index,
        position: pos, phrase_role: role, known_text: known, target_text: ph.target, word_count: ph.target.length, lego_count: known.split(/\s+/).length,
        lego_position: computeLegoPosition(ph.target, entry.target_text),
        decomposition: ph.tiles.map((t) => ({ known: t.known, legoId: t.legoId, target: t.target, isGhost: false })) });
    });
  }
  return out;
}

// ── DB ────────────────────────────────────────────────────────────────────────────────────
function dbUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const m = /^DATABASE_URL=(.*)$/m.exec(fs.readFileSync(path.join(__dirname, '..', '.env.psql'), 'utf8'));
  return m[1].replace(/^["']|["']$/g, '');
}
function psql(sql, { file = false } = {}) {
  const args = [dbUrl(), '-v', 'ON_ERROR_STOP=1', '-At'];
  if (file) { const f = path.join(process.env.CS_SCRATCH || require('os').tmpdir(), `wrr142-${process.pid}.sql`); fs.writeFileSync(f, sql); args.push('-1', '-f', f); } else args.push('-c', sql);
  const r = spawnSync('psql', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`psql failed: ${r.stderr}`);
  return r.stdout.trim();
}
const q = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const qj = (v) => (v === null || v === undefined ? 'NULL' : `${q(JSON.stringify(v))}::jsonb`);
const rows = (sql) => JSON.parse(psql(`select coalesce(json_agg(t),'[]') from (${sql}) t`));

function load(part) {
  if (part === 'unmutate') {
    const forms = [...UNMUTATE, ...GARBLED].map(([f]) => q(f)).join(',');
    const legos = rows(`select id,lego_id,seed_number,lego_index,target_text,components from course_legos where course_code='${SOUTH}' and target_text in (${forms})`);
    const phrases = rows(`select p.id,p.seed_number,p.lego_index,p.target_text,p.decomposition from course_practice_phrases p join course_legos l using(course_code,seed_number,lego_index) where p.course_code='${SOUTH}' and l.target_text in (${forms})`);
    return { course: SOUTH, ...planUnmutate(legos, phrases) };
  }
  if (part === 'unrhyw-beth') {
    const w = `course_code='${SOUTH}' and row_to_json(x)::text ilike '%unrhywbeth%'`;
    return { course: SOUTH, ...planUnrhyw({
      course_seeds: rows(`select id,seed_id,target_text from course_seeds x where ${w}`),
      course_legos: rows(`select id,lego_id,target_text,components from course_legos x where ${w}`),
      course_practice_phrases: rows(`select id,target_text,decomposition from course_practice_phrases x where ${w}`),
    }) };
  }
  if (part === 'unlink-stale') {
    const have = rows(`select id,target_text,known_text,known_audio_id,target1_audio_id,target2_audio_id from course_practice_phrases where id in (${STALE.map((s) => q(s.id)).join(',')})`);
    const edits = STALE.map((s) => {
      const r = have.find((h) => h.id === s.id);
      if (!r) throw new Error(`${s.id} not found`);
      const set = Object.fromEntries(s.cols.filter((c) => r[c]).map((c) => [c, null]));
      return { table: 'course_practice_phrases', id: s.id, label: s.id.split(':')[1], before: s.cols.map((c) => `${c}=${r[c] || '-'}`).join(' '), set };
    }).filter((e) => Object.keys(e.set).length);
    return { course: NORTH, edits, kept: [] };
  }
  if (part === 'north-s0076l03') {
    const planPath = process.argv[process.argv.indexOf('--plan') + 1];
    const entry = JSON.parse(fs.readFileSync(planPath, 'utf8')).entries.find((e) => e.lego_id === 'S0076L03');
    const have = rows(`select id from course_practice_phrases where course_code='${NORTH}' and seed_number=76 and lego_index=3`);
    if (have.length) throw new Error(`S0076L03 already has ${have.length} phrases`);
    const { capitaliseEnglish } = require('./apply-phrase-review-answers.cjs');
    const ins = planNewPhrases(entry, S0076L03_USE, capitaliseEnglish);
    return { course: NORTH, edits: ins.map((r) => ({ table: 'course_practice_phrases', id: r.id, label: r.id.split(':')[1], before: '(new)', insert: r, set: { target_text: r.target_text, known_text: r.known_text } })), kept: [] };
  }
  throw new Error(`unknown part ${part}`);
}

function sqlFor(course, edits, prefix, eventId) {
  const out = [];
  const byTable = {};
  for (const e of edits) (byTable[e.table] ||= []).push(e);
  const inserts = edits.filter((e) => e.insert);
  if (inserts.length) {
    out.push(`create table ${prefix}_inserted as select unnest(array[${inserts.map((e) => q(e.id)).join(',')}]) as id, ${q(course)}::text as course_code;`);
    for (const { insert: r } of inserts) {
      out.push(`insert into course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count, metadata, status, phrase_role, connected_lego_ids, lego_position, introduce, decomposition, last_edit_event_id) values (${[q(r.id), q(course), r.seed_number, r.lego_index, r.position, q(r.known_text), q(r.target_text), r.word_count, r.lego_count, qj({ format: 'build_use', pipeline: 'v3', source: 'regenerate-debut-practice plan, written by welsh-review-rulings-142', job: '#142' }), "'draft'", q(r.phrase_role), "'{}'", q(r.lego_position), 'true', qj(r.decomposition), q(eventId)].join(', ')});`);
    }
    return out.join('\n');
  }
  for (const [table, es] of Object.entries(byTable)) {
    out.push(`create table ${prefix}_${table.replace('course_', '')} as select * from ${table} where course_code=${q(course)} and id::text in (${es.map((e) => q(e.id)).join(',')});`);
    for (const e of es) {
      const sets = Object.entries(e.set).map(([k, v]) => `${k}=${['components', 'decomposition'].includes(k) ? qj(v) : q(v)}`);
      // keepAudio: clear the links explicitly WITH the text so the trigger leaves them alone, then restore them.
      if (e.keepAudio) sets.push(...AUDIO[table].map((c) => `${c}=NULL`));
      if (eventId) sets.push(`last_edit_event_id=${q(eventId)}`);
      out.push(`update ${table} set ${sets.join(', ')} where course_code=${q(course)} and id::text=${q(e.id)};`);
    }
    if (es.some((e) => e.keepAudio)) {
      const b = `${prefix}_${table.replace('course_', '')}`;
      out.push(`update ${table} t set ${AUDIO[table].map((c) => `${c}=b.${c}`).join(', ')} from ${b} b where t.id=b.id and (${AUDIO[table].map((c) => `b.${c} is not null`).join(' or ')});`);
    }
  }
  return out.join('\n');
}

async function record(course, operation, scope, detail) {
  const { createClient } = require('@supabase/supabase-js');
  const { serviceIdentity } = require('../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../services/shared/content-edit-log.cjs');
  for (const line of fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').split('\n')) {
    const m = /^(SUPABASE_URL|SUPABASE_SERVICE_KEY)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  return recordContentEdit(sb, { identity: serviceIdentity('welsh-review-rulings-142', { role: 'content-fix' }), courseCode: course, surface: SURFACE, operation, scope, detail });
}

function scopeOf(edits) {
  return {
    seed_numbers: [...new Set(edits.filter((e) => e.table === 'course_seeds').map((e) => Number(e.label.slice(1))))],
    lego_ids: edits.filter((e) => e.table === 'course_legos').map((e) => e.label),
    phrase_ids: edits.filter((e) => e.table === 'course_practice_phrases').map((e) => e.id),
  };
}

async function undo(prefix, apply, testOnly) {
  if (!/^backup_wrr142_[a-z0-9_]+$/.test(prefix)) throw new Error(`bad backup prefix ${prefix}`);
  const tables = psql(`select tablename from pg_tables where starts_with(tablename, '${prefix}_')`).split('\n').filter(Boolean);
  const course = psql(`select course_code from ${tables[0]} limit 1`);
  if (!SANDBOX.has(course)) throw new Error(`refusing: ${course}`);
  const out = [];
  const checks = [];
  for (const b of tables) {
    if (b === `${prefix}_inserted`) {
      // Inserted rows: undo deletes them. For a debut LEGO that had NO practice before, the deferred
      // DB guard debut_keeps_practice refuses this at commit, by design — say so rather than bypass it.
      out.push(`delete from course_practice_phrases t using ${b} b where t.id=b.id;`);
      checks.push(`select 'left after delete: '||count(*) from course_practice_phrases t join ${b} b using(id)`);
      continue;
    }
    const table = `course_${b.slice(prefix.length + 1)}`;
    const n = psql(`select count(*) from ${b}`);
    console.log(`${apply ? 'UNDO' : 'UNDO DRY RUN'} ${table}: ${n} rows from ${b}`);
    const text = TEXT_COLS[table].map((c) => `${c}=b.${c}`);
    // Same two-step as the forward write: text with links cleared explicitly, then links from the backup.
    out.push(`update ${table} t set ${[...text, ...AUDIO[table].map((c) => `${c}=NULL`), 'last_edit_event_id=b.last_edit_event_id'].join(', ')} from ${b} b where t.id=b.id;`);
    out.push(`update ${table} t set ${AUDIO[table].map((c) => `${c}=b.${c}`).join(', ')} from ${b} b where t.id=b.id;`);
    const cols = [...TEXT_COLS[table], ...AUDIO[table]];
    checks.push(`select '${table} rows differing from backup after undo: '||count(*) from ${table} t join ${b} b using(id) where ${cols.map((c) => `t.${c} is distinct from b.${c}`).join(' or ')}`);
  }
  if (testOnly) {
    // Run the undo for real inside a transaction, fire the deferred guards, measure, ROLL BACK.
    const r = spawnSync('psql', [dbUrl(), '-At', '-v', 'ON_ERROR_STOP=1'], { encoding: 'utf8',
      input: ['begin;', ...out, 'set constraints all immediate;', ...checks.map((c) => c + ';'), 'rollback;'].join('\n') });
    console.log(r.stdout.trim(), r.stderr.trim());
    return;
  }
  if (!apply) return console.log(out.join('\n'));
  await record(course, 'update', {}, { undo_of: prefix });
  psql(out.join('\n'), { file: true });
  console.log('restored.');
}

async function main() {
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  if (argv[0] === '--undo') return undo(argv[1], apply, argv.includes('--test'));
  const part = argv[0];
  const { course, edits, kept } = load(part);
  if (!SANDBOX.has(course)) throw new Error(`refusing: ${course} is not a sandbox course`);
  console.log(`${apply ? 'APPLY' : 'DRY RUN'} ${part} on ${course}: ${edits.length} rows (${Object.entries(edits.reduce((a, e) => ((a[e.table] = (a[e.table] || 0) + 1), a), {})).map(([k, v]) => `${k} ${v}`).join(', ')})`);
  for (const e of edits) console.log(`  ${e.label}: "${e.before}" -> ${JSON.stringify(e.set.target_text ?? e.set)}${e.set.components ? ' +components' : ''}${e.set.decomposition ? ' +decomposition' : ''}${e.keepAudio ? ' [audio kept]' : ''}`);
  if (kept.length) console.log(`\n[left as they are]\n  ${kept.join('\n  ')}`);
  if (!edits.length) return console.log('nothing to do');
  if (argv.includes('--sql')) console.log(sqlFor(course, edits, 'backup_wrr142_preview', null));
  if (!apply) return console.log('\n(dry run: nothing written; add --apply)');
  const tag = new Date().toISOString().replace(/\D/g, '').slice(0, 12);
  const prefix = `backup_wrr142_${part.replace(/-/g, '')}_${tag}`;
  const eventId = await record(course, part === 'unlink-stale' ? 'audio-unlink' : 'update', scopeOf(edits), { part, backup_prefix: prefix, rows: edits.length });
  psql(sqlFor(course, edits, prefix, eventId), { file: true });
  console.log(`\nwritten. backup tables ${prefix}_*\nundo: node ${SURFACE} --undo ${prefix} --apply`);
}

module.exports = { planUnmutate, planUnrhyw, planNewPhrases, fixUnrhyw, sqlFor, UNMUTATE };
if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
