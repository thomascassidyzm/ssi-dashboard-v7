#!/usr/bin/env node
/**
 * RE-HOME THE ORPHANED PRACTICE PHRASES (job #555, Aran 2026-10-13, from job #553's list of 46).
 *
 * Jobs #460/#468 marked five sandbox LEGOs "already taught" (is_new=false): N S0188L02 "nhw", N S0218L02 "pan",
 * S S0194L02 "nhw", S S0230L02 "pan", S S0234L02 "gyda ti". A not-new LEGO's practice phrases never play, so their
 * 46 phrases went dark. Aran approved moving every phrase that has a valid home to that home, in this order:
 *   (a) the seed's other NEW LEGO;
 *   (b) the original earlier LEGO that first taught the word (same Welsh, is_new);
 *   (c) another NEW LEGO the phrase contains — when several are valid, the one CLOSEST AFTER the phrase's original
 *       running position, never an early-block one far before it (closest before only when nothing after is valid).
 * A home is valid when the phrase passes #510's per-line checks there (lineChecks: the Welsh vocab rule
 * welshUntaughtWords — any earlier word counts, soft mutation = same word — plus not-bare and contains-the-LEGO),
 * computed here on a FULLY paginated vocabulary (loadTranslationVocab reads one 1000-row page). A home that already
 * holds the same Welsh is skipped as a duplicate. Phrases with no valid home stay where they are; nothing else moves.
 *
 * A move keeps the row (texts, role, status, audio ids, created_at) and re-files it as the earlier jobs file:
 * id S…L…B/U<next free number for that role>, position after the existing rows, lego_id/lego_position for the new home.
 * decomposition is cleared (it named the old LEGO as salient; NULL = the runtime's alignment fallback).
 *
 *   node tools/course-optimization/weave-cym-rehome-555.cjs plan   → print every phrase, its homes and the choice
 *   node tools/course-optimization/weave-cym-rehome-555.cjs sql    → weave-cym-rehome-555.sql (+ -undo.sql); dry run unless psql -v finish=COMMIT
 */
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { makePhraseId, computeLegoPosition, partitionBareLegoPhrases } = require('../../services/course-builder/lib/phrase-structure.cjs');
const { checkVocabViolations } = require('../../services/course-builder/lib/validation.cjs');
const { normalizeForContainment, extractVocab } = require('../../services/course-builder/lib/text-normalization.cjs');
const { phraseContainsLego } = require('../../services/course-builder/lib/separable-verbs.cjs');
const { welshContainsLego, isSameWelsh } = require('../../services/course-builder/lib/welsh-mutation.cjs');
const { loadRunningOrder } = require('../../services/shared/running-order.cjs');
const { lineChecks } = require('./weave-cym-aran-written-510.cjs');

const JOB = 555;
const N = 'cym_nv2_for_eng';
const S = 'cym_sv2_for_eng';
const SQL = path.join(__dirname, `weave-cym-rehome-${JOB}.sql`);
const EVID = path.join(require('os').homedir(), `ssi-evidence/ssi-dashboard-v7/job-${JOB}`);

// The five LEGOs #460/#468 marked taught, whose phrases #553 listed.
const SOURCES = [[N, 188, 2], [N, 218, 2], [S, 194, 2], [S, 230, 2], [S, 234, 2]];
// #553's verdicts, numbered as on its page, keyed by course|Welsh. Used only to compare; the homes are recomputed live.
const PAGE_NO_HOME = new Set([1, 5, 21, 25, 45]);
const legoKey = (s, l) => `S${String(s).padStart(4, '0')}L${String(l).padStart(2, '0')}`;
const q = (s) => (s === null || s === undefined ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);
const norm = (t) => String(t).toLowerCase().replace(/[’‘']/g, "'").replace(/\s+/g, ' ').trim();

async function all(sb, table, cols, course) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select(cols).eq('course_code', course).order('id').range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

async function loadCourse(sb, course) {
  const order = await loadRunningOrder(sb, course);
  if (!order) throw new Error(`${course}: no running order`);
  const legos = await all(sb, 'course_legos', 'id,seed_number,lego_index,target_text,known_text,type,components,is_new', course);
  const seeds = await all(sb, 'course_seeds', 'id,seed_number,target_text', course);
  return { order, legos, seeds, pos: (s) => order.positionOf.get(s) };
}

/** #510's lineChecks, on a fully paginated vocabulary: everything before the seed in running order + this seed up to l. */
function checkAt(C, course, s, l, lego, target) {
  const p = C.pos(s);
  const vocab = new Set();
  for (const x of C.seeds) if (x.target_text && C.pos(x.seed_number) !== undefined && C.pos(x.seed_number) < p) extractVocab(x.target_text, false).forEach((v) => vocab.add(v));
  for (const x of C.legos) {
    const xp = C.pos(x.seed_number);
    if (xp === undefined) continue;
    if (!(xp < p || (x.seed_number === s && x.lego_index <= l))) continue;
    extractVocab(x.target_text, false).forEach((v) => vocab.add(v));
    if (x.type === 'M' && x.components) for (const c of x.components) extractVocab(c.target, false).forEach((v) => vocab.add(v));
  }
  const errs = [];
  const vv = checkVocabViolations([{ target }], vocab, course, { seedNumber: s });
  if (vv.length) errs.push({ kind: 'vocab', words: vv.flatMap((v) => v.unknown.split(' ')) });
  if (partitionBareLegoPhrases([{ target }], lego.target_text).bare.length) errs.push({ kind: 'bare LEGO' });
  const nl = normalizeForContainment(lego.target_text);
  if (!phraseContainsLego({ courseCode: course, seedNumber: s, legoTarget: lego.target_text, phraseTarget: target,
    baseline: (lt, pt) => normalizeForContainment(pt).includes(nl) })) errs.push({ kind: 'containment' });
  return errs;
}

async function plan(sb) {
  const courses = { [N]: await loadCourse(sb, N), [S]: await loadCourse(sb, S) };
  const phrasesBy = new Map(); // course|s|l -> rows, read per LEGO (the whole table times out)
  const rowsUnder = async (c, s, l) => {
    const k = `${c}|${s}|${l}`;
    if (!phrasesBy.has(k)) {
      const { data, error } = await sb.from('course_practice_phrases').select('id,seed_number,lego_index,position,phrase_role,target_text,known_text')
        .eq('course_code', c).eq('seed_number', s).eq('lego_index', l);
      if (error) throw new Error(error.message);
      phrasesBy.set(k, data);
    }
    return phrasesBy.get(k);
  };
  const out = [];
  let no = 0;
  for (const [course, s, l] of SOURCES) {
    const C = courses[course];
    const src = C.legos.find((x) => x.seed_number === s && x.lego_index === l);
    if (!src || src.is_new) throw new Error(`${course} ${legoKey(s, l)}: missing or still new`);
    const srcPos = C.pos(s);
    // (b) the earlier LEGO that first taught the same Welsh, still new.
    const orig = C.legos.filter((x) => x.is_new && C.pos(x.seed_number) !== undefined && C.pos(x.seed_number) < srcPos
      && (norm(x.target_text) === norm(src.target_text) || isSameWelsh(course, x.target_text, src.target_text)))
      .sort((a, b) => C.pos(a.seed_number) - C.pos(b.seed_number))[0];
    // #553's page lists each LEGO's phrases in Welsh alphabetical order.
    const rows = [...await rowsUnder(course, s, l)].sort((a, b) => a.target_text.localeCompare(b.target_text, 'cy'));
    for (const ph of rows) {
      no += 1;
      const valid = (x) => x.is_new && C.pos(x.seed_number) !== undefined && !(x.seed_number === s && x.lego_index === l)
        && checkAt(C, course, x.seed_number, x.lego_index, x, ph.target_text).length === 0;
      const a = C.legos.filter((x) => x.seed_number === s && x.lego_index !== l && valid(x));
      const b = orig && valid(orig) ? [orig] : [];
      const cand = C.legos.filter((x) => x.is_new && x !== orig && x.seed_number !== s && C.pos(x.seed_number) !== undefined
        && (normalizeForContainment(ph.target_text).includes(normalizeForContainment(x.target_text)) || welshContainsLego(course, x.target_text, ph.target_text)));
      const c = cand.filter(valid).sort((x, y) => C.pos(x.seed_number) - C.pos(y.seed_number) || x.lego_index - y.lego_index);
      const after = c.filter((x) => C.pos(x.seed_number) >= srcPos);
      let type = 'd'; let home = null;
      if (a.length) { type = 'a'; home = a[0]; } else if (b.length) { type = 'b'; home = b[0]; } else if (c.length) {
        type = 'c'; home = after.length ? after[0] : c[c.length - 1];
      }
      let dup = false;
      if (home) dup = (await rowsUnder(course, home.seed_number, home.lego_index)).some((r) => norm(r.target_text) === norm(ph.target_text));
      out.push({ no, course, src: legoKey(s, l), srcPos, ph, type, home, homePos: home ? C.pos(home.seed_number) : null, dup,
        options: { a: a.map((x) => legoKey(x.seed_number, x.lego_index)), b: b.map((x) => legoKey(x.seed_number, x.lego_index)),
          c: c.map((x) => `${legoKey(x.seed_number, x.lego_index)}@${C.pos(x.seed_number)}`) },
        whyNone: home ? null : checkAt(C, course, orig.seed_number, orig.lego_index, orig, ph.target_text) });
    }
  }
  return { courses, phrasesBy, out };
}

function printPlan(out) {
  for (const x of out) {
    const pageAgrees = (x.type === 'd') === PAGE_NO_HOME.has(x.no);
    console.log(`#${x.no} ${x.course === N ? 'N' : 'S'} ${x.src}@${x.srcPos} [${x.type}]${x.dup ? ' DUP' : ''}${pageAgrees ? '' : ' ≠PAGE'} ${x.ph.target_text}`
      + (x.home ? ` → ${legoKey(x.home.seed_number, x.home.lego_index)} "${x.home.target_text}" @${x.homePos}` : ` → none: ${JSON.stringify(x.whyNone)}`)
      + `  {a:${x.options.a.join(',')} b:${x.options.b.join(',')} c:${x.options.c.join(',')}}`);
  }
}

async function sql() {
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const { phrasesBy, out } = await plan(sb);
  printPlan(out);
  const mismatch = out.filter((x) => (x.type === 'd') !== PAGE_NO_HOME.has(x.no));
  if (mismatch.length) throw new Error(`homes differ from #553's page for #${mismatch.map((x) => x.no).join(', #')}: stopping for Aran`);
  const moves = out.filter((x) => x.home && !x.dup);
  // The live phrase check as it runs on main (#510's lineChecks), at each new home.
  for (const m of moves) {
    m.liveCheck = await lineChecks(sb, m.course, m.home.seed_number, m.home.lego_index, m.home, m.ph.target_text);
    if (m.liveCheck.length) console.log(`  live lineChecks at the home of #${m.no}: ${JSON.stringify(m.liveCheck)}`);
  }
  // File after the existing rows, next free number per role, in phrase order.
  const { data: full } = await sb.from('course_practice_phrases').select('*').in('id', moves.map((m) => m.ph.id));
  const fullById = new Map(full.map((r) => [r.id, r]));
  const next = new Map();
  const rows = [];
  for (const m of moves) {
    const k = `${m.course}|${m.home.seed_number}|${m.home.lego_index}`;
    if (!next.has(k)) {
      const cur = phrasesBy.get(k) || [];
      const numOf = (role) => Math.max(0, ...cur.filter((r) => r.phrase_role === role).map((r) => Number(r.id.slice(-2))));
      next.set(k, { pos: Math.max(0, ...cur.map((r) => r.position)), build: numOf('build'), use: numOf('use'), ids: cur.map((r) => r.id).sort().join(','), target: m.home.target_text });
    }
    const n = next.get(k);
    const old = fullById.get(m.ph.id);
    n.pos += 1; n[old.phrase_role] += 1;
    rows.push({ old, hash: crypto.createHash('md5').update(JSON.stringify(old)).digest('hex'),
      id: makePhraseId(m.course, m.home.seed_number, m.home.lego_index, old.phrase_role, n[old.phrase_role]),
      course: m.course, s: m.home.seed_number, l: m.home.lego_index, position: n.pos,
      home_type: m.type, lego_position: computeLegoPosition(old.target_text, m.home.target_text),
      metadata: { ...old.metadata, job: JOB, moved_from: { id: old.id, lego: legoKey(old.seed_number, old.lego_index), position: old.position, home_type: m.type } } });
  }
  const moveSql = `INSERT INTO moves VALUES\n${rows.map((r) => `  (${q(r.old.id)}, ${q(r.id)}, ${q(r.course)}, ${r.s}, ${r.l}, ${r.position}, ${q(r.lego_position)}, ${q(JSON.stringify(r.metadata))}::jsonb, ${q(r.old.target_text)}, ${r.old.version}, ${q(r.old.updated_at)}::timestamptz, ${q(r.home_type)})`).join(',\n')};`;
  const homeSql = `INSERT INTO homes VALUES\n${[...next.entries()].map(([k, n]) => { const [c, s, l] = k.split('|'); return `  (${q(c)}, ${s}, ${l}, ${q(n.target)}, ${q(n.ids)})`; }).join(',\n')};`;
  const fill = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8').replace('--@MOVES@', moveSql).replace('--@HOMES@', homeSql);
  fs.writeFileSync(SQL, fill(`weave-cym-rehome-${JOB}.sql.in`));
  fs.writeFileSync(SQL.replace(/\.sql$/, '-undo.sql'), fill(`weave-cym-rehome-${JOB}-undo.sql.in`));
  fs.mkdirSync(EVID, { recursive: true });
  fs.writeFileSync(path.join(EVID, 'plan.json'), JSON.stringify({ out: out.map(({ home, ...x }) => ({ ...x, home: home && legoKey(home.seed_number, home.lego_index) })), rows }, null, 2));
  const by = (t) => moves.filter((m) => m.type === t).length;
  console.log(`${SQL}: ${rows.length} moves — (a) ${by('a')}, (b) ${by('b')}, (c) ${by('c')}; dup-skipped ${out.filter((x) => x.dup).length}; no home: #${out.filter((x) => !x.home).map((x) => x.no).join(', #')}`);
  for (const r of rows) console.log(`  ${r.old.id} → ${r.id} pos ${r.position} ${r.lego_position} | ${r.old.target_text}`);
}

module.exports = { plan, checkAt };
if (require.main === module) {
  const sb = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const mode = process.argv[2];
  (mode === 'plan' ? plan(sb()).then(({ out }) => printPlan(out)) : mode === 'sql' ? sql() : Promise.reject(new Error('mode: plan | sql')))
    .catch((e) => { console.error(e.message); process.exit(1); });
}
