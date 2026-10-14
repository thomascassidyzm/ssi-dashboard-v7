#!/usr/bin/env node
/**
 * SOLE-NEW LEGOs BACK TO NEW in the South sandbox cym_sv2_for_eng (job #468, reconciling #459/#460,
 * Aran 2026-10-13). Job #460 marked S1159L1, S1400L1 and S1409L2 already taught (same Welsh taught
 * earlier under other English), but each is the ONLY new LEGO of its seed — with it off, the seed
 * has no new LEGO and never plays, and #459's pairing phrases have no new sibling to live under.
 * New is the default for these (S1159 is being confirmed with Aran). They go back to is_new=true
 * WITH a full practice basket.
 *
 * Why not the #429 door (POST /api/v2/phrases): it refuses a not-new LEGO, and the deferred
 * debut_keeps_practice trigger refuses a NEW LEGO with no practice at commit — so the flip and the
 * basket must land in ONE transaction. This tool therefore:
 *   generate  phrase-generation.cjs generateLegoPhrases (the v3 door's generator: Opus, the real
 *             gates, retries) with debutInSameWrite — read-only on the DB;
 *             → ~/ssi-evidence/ssi-dashboard-v7/job-468/sole-new/S….json
 *   sql       re-runs the v2 door's own checks (counts, vocab-at-this-seed, bare-LEGO, containment)
 *             and builds the rows exactly as the door does (ids, positions, roles, metadata), then
 *             writes weave-cym-sv2-sole-new-468.sql (flip + rows in one transaction, backup, edit
 *             event, live-Welsh fingerprint check; dry run unless -v finish=COMMIT) and its -undo.sql.
 */
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const os = require('os');
const { createClient } = require('@supabase/supabase-js');
const { generateLegoPhrases } = require('../../services/course-builder/lib/phrase-generation.cjs');
const { makePhraseId, computeLegoPosition, checkBuildUsePhrases, generateBuildupPhrases, partitionBareLegoPhrases } = require('../../services/course-builder/lib/phrase-structure.cjs');
const { loadTranslationVocab } = require('../../services/course-builder/lib/vocab-cache.cjs');
const { checkVocabViolations } = require('../../services/course-builder/lib/validation.cjs');
const { normalizeForContainment, extractVocab } = require('../../services/course-builder/lib/text-normalization.cjs');
const { phraseContainsLego } = require('../../services/course-builder/lib/separable-verbs.cjs');

const COURSE = 'cym_sv2_for_eng';
const LEGOS = [[1159, 1], [1400, 1], [1409, 2]];
const OUT = path.join(os.homedir(), 'ssi-evidence/ssi-dashboard-v7/job-468/sole-new');
const SQL = path.join(__dirname, 'weave-cym-sv2-sole-new-468.sql');
const fileFor = (s, l) => path.join(OUT, `S${String(s).padStart(4, '0')}L${String(l).padStart(2, '0')}.json`);
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
// Generated rows DROPPED by hand, each with its evidence (never re-guessed: the fix would leave taught material).
const DROPS = [
  // South corpus (cym_s/cym_sv2 phrases): "moyn dweud" 240×, "moyn ddweud" 0× — no mutation after moyn. The
  // unmutated "dweud e" is not a taught chunk (only "ddweud e", S1208L4), so the v2 door refuses the fix.
  'sut ŷn ni’n moyn ddweud e?',
];
const P26_UNPLACED = [];
const q = (s) => (s === null || s === undefined ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);

async function generate() {
  fs.mkdirSync(OUT, { recursive: true });
  await Promise.all(LEGOS.map(async ([s, l]) => {
    let r;
    try { r = await generateLegoPhrases(sb, COURSE, s, l, { debutInSameWrite: true }); }
    catch (e) { r = { seedNumber: s, legoIndex: l, error: e.message }; }
    fs.writeFileSync(fileFor(s, l), JSON.stringify(r, null, 2));
    console.log(`S${s}L${l} ${r.error ? `ERROR ${r.error}` : r.blocked ? `BLOCKED ${(r.gate?.failingGates || []).join(',')}` : `${r.build.length}B/${r.use.length}U`}`);
    for (const p of [...(r.build || []), ...(r.use || [])]) console.log(`   ${p.known} = ${p.target}`);
  }));
}

/** The v2 door's checks (routes/v2.cjs POST /v2/phrases), in its order. Returns error strings. */
async function doorChecks(lego, s, l, build, use) {
  const errs = [];
  const count = checkBuildUsePhrases({ idx: l, type: lego.type, known: lego.known_text, target: lego.target_text,
    build: build.map((p) => ({ known: p.known, target: p.target })), use: use.map((p) => ({ known: p.known, target: p.target })) }, COURSE, s);
  if (!count.valid) errs.push(`Phrase count: ${count.error}`);
  const vocab = await loadTranslationVocab({ supabase: sb }, COURSE, s);
  const { data: cur } = await sb.from('course_legos').select('target_text,type,components').eq('course_code', COURSE).eq('seed_number', s).lte('lego_index', l);
  for (const x of cur || []) {
    extractVocab(x.target_text, false).forEach((v) => vocab.add(v));
    if (x.type === 'M' && x.components) for (const c of x.components) extractVocab(c.target, false).forEach((v) => vocab.add(v));
  }
  const all = [...build, ...use].map((p) => ({ target: p.target }));
  const vv = checkVocabViolations(all, vocab, COURSE, { seedNumber: s });
  if (vv.length) errs.push(`Vocab violations: ${vv.map((v) => `"${v.phrase}" uses unknown: ${v.unknown}`).join('; ')}`);
  const bare = [...partitionBareLegoPhrases(build, lego.target_text).bare, ...partitionBareLegoPhrases(use, lego.target_text).bare];
  if (bare.length) errs.push(`${bare.length} bare-LEGO phrase(s)`);
  const norm = normalizeForContainment(lego.target_text);
  const cf = all.filter((p) => !phraseContainsLego({ courseCode: COURSE, seedNumber: s, legoTarget: lego.target_text, phraseTarget: p.target,
    baseline: (lt, pt) => normalizeForContainment(pt).includes(norm) }));
  if (cf.length) errs.push(`Containment: ${cf.length} phrase(s) don't contain "${lego.target_text}"`);
  return errs;
}

async function sql() {
  const flips = [];
  const rows = [];
  for (const [s, l] of LEGOS) {
    const r = JSON.parse(fs.readFileSync(fileFor(s, l), 'utf8'));
    if (r.error || r.blocked) throw new Error(`S${s}L${l} has no passed set (${r.error || 'blocked'}): nothing is written, the seed stays as it is`);
    r.build = r.build.filter((p) => !DROPS.includes(p.target));
    r.use = r.use.filter((p) => !DROPS.includes(p.target));
    // P26: the seed sentence is said in a played basket — under this, the seed's only new LEGO.
    const { data: seed } = await sb.from('course_seeds').select('known_text,target_text').eq('course_code', COURSE).eq('seed_number', s).single();
    const norm0 = (x) => String(x).toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
    if (![...r.build, ...r.use].some((p) => norm0(p.target) === norm0(seed.target_text))) {
      r.use.push({ known: seed.known_text, target: seed.target_text, p26_seed_sentence: true });
    }
    const { data: lego } = await sb.from('course_legos').select('type,components,known_text,target_text').eq('course_code', COURSE).eq('seed_number', s).eq('lego_index', l).single();
    // The seed sentence goes in only if the door takes it here (P2: no later sibling); else it is listed.
    const ss = r.use.find((p) => p.p26_seed_sentence);
    if (ss && (await doorChecks(lego, s, l, r.build, r.use)).length && !(await doorChecks(lego, s, l, r.build, r.use.filter((p) => p !== ss))).length) {
      r.use = r.use.filter((p) => p !== ss);
      P26_UNPLACED.push(`S${s}: "${seed.known_text}" = "${seed.target_text}" — needs later siblings of L${l} (P2), so not under it`);
    }
    const errs = await doorChecks(lego, s, l, r.build, r.use);
    if (errs.length) throw new Error(`S${s}L${l} fails the v2 door checks: ${errs.join(' | ')}`);
    flips.push({ s, l, target: lego.target_text });
    // Rows exactly as routes/v2.cjs builds them.
    let start = 1;
    const rc = { component: 0, build: 0, use: 0 };
    if (lego.type === 'M' && lego.components?.length) {
      const b = generateBuildupPhrases({ seed: s, idx: l, known: lego.known_text, target: lego.target_text, components: lego.components }, COURSE);
      rows.push(...b.buildupPhrases.map((x) => ({ ...x, metadata: { ...x.metadata, job: 468 } })));
      start = b.startPosition;
      Object.assign(rc, b.roleCounts);
    }
    r.build.forEach((p, i) => rows.push({ id: makePhraseId(COURSE, s, l, 'build', ++rc.build), seed_number: s, lego_index: l, position: start + i,
      known_text: p.known, target_text: p.target, word_count: p.target.length, lego_count: (p.known.match(/\s+/g) || []).length + 1,
      phrase_role: 'build', introduce: true, lego_position: computeLegoPosition(p.target, lego.target_text),
      metadata: { format: 'build_use', pipeline: 'v2', job: 468 } }));
    r.use.forEach((p, i) => rows.push({ id: makePhraseId(COURSE, s, l, 'use', ++rc.use), seed_number: s, lego_index: l, position: start + r.build.length + i,
      known_text: p.known, target_text: p.target, word_count: p.target.length, lego_count: (p.known.match(/\s+/g) || []).length + 1,
      phrase_role: 'use', introduce: true, lego_position: computeLegoPosition(p.target, lego.target_text),
      metadata: { format: 'build_use', pipeline: 'v2', job: 468, ...(p.p26_seed_sentence ? { p26_seed_sentence: true } : {}), score: p.score || p.target_score, known_score: p.known_score, target_score: p.target_score } }));
  }
  const tmpl = fs.readFileSync(path.join(__dirname, 'weave-cym-sv2-sole-new-468.sql.in'), 'utf8');
  const flipSql = `INSERT INTO flip VALUES ${flips.map((f) => `(${f.s},${f.l},${q(f.target)})`).join(',')};`;
  const rowSql = `INSERT INTO add_rows VALUES\n${rows.map((r) => `  (${q(r.id)}, ${r.seed_number}, ${r.lego_index}, ${r.position}, ${q(r.known_text)}, ${q(r.target_text)}, ${r.word_count}, ${r.lego_count}, ${q(r.phrase_role)}, ${r.introduce}, ${q(r.lego_position)}, ${q(JSON.stringify(r.metadata))}::jsonb)`).join(',\n')};`;
  fs.writeFileSync(SQL, tmpl.replace('--@FLIPS@', flipSql).replace('--@ROWS@', rowSql));
  const undo = fs.readFileSync(path.join(__dirname, 'weave-cym-sv2-sole-new-468-undo.sql.in'), 'utf8')
    .replace('--@ROWS@', `INSERT INTO added VALUES ${rows.map((r) => `(${q(r.id)})`).join(', ')};`);
  fs.writeFileSync(SQL.replace(/\.sql$/, '-undo.sql'), undo);
  console.log(`${SQL}: ${flips.length} flips, ${rows.length} rows`);
  for (const r of rows) console.log(`  ${r.id} ${r.known_text} = ${r.target_text}`);
  for (const x of P26_UNPLACED) console.log(`  P26 seed sentence NOT placed: ${x}`);
}

(process.argv[2] === 'generate' ? generate() : process.argv[2] === 'sql' ? sql() : Promise.reject(new Error('mode: generate | sql')))
  .catch((e) => { console.error(e); process.exit(1); });
