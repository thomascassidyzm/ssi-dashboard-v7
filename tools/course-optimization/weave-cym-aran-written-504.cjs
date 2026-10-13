#!/usr/bin/env node
/**
 * ARAN'S HELD PRACTICE LINES, RE-CHECKED UNDER HIS RULE (job #504, Aran 2026-10-13).
 *
 * Job #494 wrote 59 of Aran's hand-written lines for 17 new LEGOs in cym_nv2_for_eng (N) /
 * cym_sv2_for_eng (S) and held 67. The gate that held them tiled each phrase from WHOLE earlier
 * chunks, so a word taught only inside a bigger LEGO (old seeds 1-137 carry no components) or a
 * soft-mutated spelling read as untaught. Aran's rule — any Welsh taught earlier in the running
 * order, plus the current LEGO, soft mutation = same word — is now the Welsh gate
 * (welsh-mutation.cjs welshUntaughtWords / welshContainsLego). This re-runs #494's per-line checks
 * with it, plus Aran's two corrections, and RE-FILES every LEGO that gains a line: its #494 rows
 * are replaced by the whole accepted set in Aran's order (first three build, rest use), exactly as
 * #494 files them. LEGOs that gain nothing are untouched. Lines still refused are listed, with the
 * word and where (if anywhere) it is first taught.
 *
 *   node tools/course-optimization/weave-cym-aran-written-504.cjs sql
 *     → weave-cym-aran-written-504.sql (+ -undo.sql); dry run unless psql -v finish=COMMIT.
 */
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { makePhraseId, computeLegoPosition, generateBuildupPhrases, partitionBareLegoPhrases, phraseFloor } = require('../../services/course-builder/lib/phrase-structure.cjs');
const { loadTranslationVocab } = require('../../services/course-builder/lib/vocab-cache.cjs');
const { checkVocabViolations } = require('../../services/course-builder/lib/validation.cjs');
const { normalizeForContainment, extractVocab } = require('../../services/course-builder/lib/text-normalization.cjs');
const { phraseContainsLego } = require('../../services/course-builder/lib/separable-verbs.cjs');
const { welshPieces, softRadicals } = require('../../services/course-builder/lib/welsh-mutation.cjs');
const { loadRunningOrder, seedsBefore } = require('../../services/shared/running-order.cjs');
const { tidyWelsh, SETS: SETS_494 } = require('./weave-cym-aran-written-494.cjs');

const JOB = 504;
const N = 'cym_nv2_for_eng';
const SQL = path.join(__dirname, `weave-cym-aran-written-${JOB}.sql`);
const EVID = path.join(require('os').homedir(), 'ssi-evidence/ssi-dashboard-v7/job-504');

// Aran's corrections to #494's held lines (2026-10-13): the typo, and the South "gyda ti".
const CORRECTED = new Map([
  ['pob hapus ydyn nhw', ['pobl hapus ydyn nhw', 'they’re happy people']],
  ['cael sgwrs efo chdi', ['cael sgwrs gyda ti', 'to have a conversation with you']],
  ['cael sgwrs arall efo chdi', ['cael sgwrs arall gyda ti', 'to have another conversation with you']],
  ['teimlo fel cael sgwrs efo chdi', ['teimlo fel cael sgwrs gyda ti', 'to feel like having a conversation with you']],
  ['dwi\'n teimlo fel cael sgwrs efo chdi', ['dwi\'n teimlo fel cael sgwrs gyda ti', 'I feel like having a conversation with you']],
]);
const SETS = SETS_494.map(([c, s, l, lines]) => [c, s, l, lines.map(([w, k, held]) => (CORRECTED.has(w) ? CORRECTED.get(w) : [w, k, held]))]);

const q = (s) => (s === null || s === undefined ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);

/** #494's per-line checks, verbatim, now on the corrected Welsh gate. */
async function lineChecks(sb, course, s, l, lego, target) {
  const errs = [];
  const vocab = await loadTranslationVocab({ supabase: sb }, course, s);
  const { data: cur } = await sb.from('course_legos').select('target_text,type,components').eq('course_code', course).eq('seed_number', s).lte('lego_index', l);
  for (const x of cur || []) {
    extractVocab(x.target_text, false).forEach((v) => vocab.add(v));
    if (x.type === 'M' && x.components) for (const c of x.components) extractVocab(c.target, false).forEach((v) => vocab.add(v));
  }
  const vv = checkVocabViolations([{ target }], vocab, course, { seedNumber: s });
  if (vv.length) errs.push({ kind: 'vocab', words: vv.flatMap((v) => v.unknown.split(' ')) });
  if (partitionBareLegoPhrases([{ target }], lego.target_text).bare.length) errs.push({ kind: 'bare LEGO' });
  const norm = normalizeForContainment(lego.target_text);
  if (!phraseContainsLego({ courseCode: course, seedNumber: s, legoTarget: lego.target_text, phraseTarget: target,
    baseline: (lt, pt) => normalizeForContainment(pt).includes(norm) })) errs.push({ kind: 'containment', lego: lego.target_text });
  return errs;
}

/** Where a word is first taught in the course's running order (LEGO or component), soft-mutation aware. */
async function firstTaught(sb, course, word) {
  const keys = softRadicals(word.replace(/’/g, "'"));
  const order = await loadRunningOrder(sb, course);
  const all = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await sb.from('course_legos').select('seed_number,lego_index,target_text,components').eq('course_code', course).range(from, from + 999);
    all.push(...data);
    if (data.length < 1000) break;
  }
  const hits = all.filter((x) => [x.target_text, ...(x.components || []).map((c) => c.target)]
    .some((t) => welshPieces(t).some((p) => [...softRadicals(p)].some((k) => keys.has(k)))))
    .map((x) => ({ seed: x.seed_number, lego: x.lego_index, text: x.target_text, position: order.positionOf.get(x.seed_number) }))
    .filter((x) => x.position !== undefined).sort((a, b) => a.position - b.position);
  return hits[0] || null;
}

async function sql() {
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const prev = JSON.parse(fs.readFileSync(path.join(require('os').homedir(), 'ssi-evidence/ssi-dashboard-v7/job-494/report.json'), 'utf8'));
  const held494 = new Set(prev.report.filter((r) => r.status !== 'UNDER FLOOR').map((r) => `${r.tag}|${r.target}`));
  const rows = [];
  const lines = [];
  const refiled = [];
  for (const [course, s, l, set] of SETS) {
    const { data: lego } = await sb.from('course_legos').select('type,components,known_text,target_text,is_new')
      .eq('course_code', course).eq('seed_number', s).eq('lego_index', l).single();
    const tag = `${course === N ? 'N' : 'S'} S${s}L${String(l).padStart(2, '0')}`;
    const order = await loadRunningOrder(sb, course);
    const accepted = [];
    let gained = false;
    for (const [raw, known, held] of set) {
      const target = tidyWelsh(raw);
      const original = SETS_494.find(([c, ss, ll]) => c === course && ss === s && ll === l)[3].find(([w]) => tidyWelsh(CORRECTED.has(w) ? CORRECTED.get(w)[0] : w) === target);
      const was = held494.has(`${tag}|${tidyWelsh(original[0])}`) ? 'held by #494' : 'written by #494';
      const errs = held ? [{ kind: 'held', why: held }] : await lineChecks(sb, course, s, l, lego, target);
      const line = { tag, target, known, was, errs };
      for (const e of errs) if (e.kind === 'vocab') {
        e.where = [];
        for (const w of e.words) {
          const f = await firstTaught(sb, course, w);
          e.where.push({ word: w, first: f, before: f ? f.position < order.positionOf.get(s) : false });
        }
      }
      lines.push(line);
      if (errs.length) continue;
      accepted.push({ known, target });
      if (was === 'held by #494') gained = true;
    }
    if (!gained) continue;
    refiled.push([course, s, l]);
    let start = 1;
    const rc = { component: 0, build: 0, use: 0 };
    if (lego.type === 'M' && lego.components?.length) {
      const b = generateBuildupPhrases({ seed: s, idx: l, known: lego.known_text, target: lego.target_text, components: lego.components }, course);
      rows.push(...b.buildupPhrases.map((x) => ({ ...x, course_code: course, metadata: { ...x.metadata, job: JOB } })));
      start = b.startPosition;
      Object.assign(rc, b.roleCounts);
    }
    accepted.forEach((p, i) => {
      const role = i < 3 ? 'build' : 'use';
      rows.push({ id: makePhraseId(course, s, l, role, ++rc[role]), course_code: course, seed_number: s, lego_index: l, position: start + i,
        known_text: p.known, target_text: p.target, word_count: p.target.length, lego_count: (p.known.match(/\s+/g) || []).length + 1,
        phrase_role: role, introduce: true, lego_position: computeLegoPosition(p.target, lego.target_text),
        metadata: { format: 'build_use', pipeline: 'v2', job: JOB, author: 'aran' } });
    });
    const { minBuild, minUse } = phraseFloor(s, l);
    const nb = Math.min(accepted.length, 3);
    if (nb < minBuild || accepted.length - nb < minUse) lines.push({ tag, floor: `${nb} build + ${accepted.length - nb} use; the v2 door asks ${minBuild} + ${minUse}` });
  }
  const fill = (f, m) => fs.readFileSync(path.join(__dirname, f), 'utf8').replace('--@LEGOS@', m.legos || '').replace('--@ROWS@', m.rows || '');
  const legoSql = `INSERT INTO legos VALUES ${refiled.map(([c, s, l]) => `(${q(c)},${s},${l})`).join(',')};`;
  const rowSql = `INSERT INTO add_rows VALUES\n${rows.map((r) => `  (${q(r.id)}, ${q(r.course_code)}, ${r.seed_number}, ${r.lego_index}, ${r.position}, ${q(r.known_text)}, ${q(r.target_text)}, ${r.word_count}, ${r.lego_count}, ${q(r.phrase_role)}, ${r.introduce}, ${q(r.lego_position)}, ${q(JSON.stringify(r.metadata))}::jsonb)`).join(',\n')};`;
  fs.writeFileSync(SQL, fill(`weave-cym-aran-written-${JOB}.sql.in`, { legos: legoSql, rows: rowSql }));
  fs.writeFileSync(SQL.replace(/\.sql$/, '-undo.sql'), fill(`weave-cym-aran-written-${JOB}-undo.sql.in`, {}));
  fs.mkdirSync(EVID, { recursive: true });
  fs.writeFileSync(path.join(EVID, 'report.json'), JSON.stringify({ refiled, rows, lines }, null, 2));
  console.log(`${SQL}: ${rows.length} rows under ${refiled.length} re-filed LEGOs`);
  for (const x of lines) {
    if (x.floor) { console.log(`  FLOOR ${x.tag} ${x.floor}`); continue; }
    const why = x.errs.map((e) => e.kind === 'vocab' ? `untaught: ${e.where.map((w) => `${w.word} (${w.first ? `first S${w.first.seed}L${w.first.lego} "${w.first.text}" pos ${w.first.position}${w.before ? '' : ' — AFTER this seed'}` : 'never taught'})`).join(', ')}`
      : e.kind === 'containment' ? `does not contain LEGO "${e.lego}"` : e.kind === 'held' ? e.why : e.kind).join('; ');
    console.log(`  ${x.errs.length ? 'HOLD ' : 'OK   '} ${x.tag} [${x.was}] ${x.target}${why ? ' — ' + why : ''}`);
  }
}

module.exports = { SETS, CORRECTED };
if (require.main === module) {
  (process.argv[2] === 'sql' ? sql() : Promise.reject(new Error('mode: sql'))).catch((e) => { console.error(e); process.exit(1); });
}
