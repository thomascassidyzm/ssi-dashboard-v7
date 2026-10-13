#!/usr/bin/env node
/**
 * SEVEN REPEATED LEGOs MARKED ALREADY TAUGHT, THEIR PHRASES MOVED (job #556, Aran 2026-10-13).
 *
 * Seven sandbox LEGOs repeat Welsh and English taught earlier, and each is its seed's only new LEGO:
 * North cym_nv2_for_eng S0194L01 "gest ti?", S0195L01 "wnest ti wylio?", S0208L01 "ddudest ti", S0222L01 "efo chdi";
 * South cym_sv2_for_eng S0205L01 "be' ti'n mynd i wneud?", S0217L01 "ddwedest ti", S0219L01 "gofyn i ti".
 * Aran ruled them already taught (is_new=false). Their seeds then introduce nothing new and are heard as whole
 * sentences through the seed-sentence review (learning app, PR #570), which needs the seed's own known + target1 +
 * target2 clips. A not-new LEGO's practice phrases never play, so under Aran's standing rule each is MOVED, by #555's
 * method (weave-cym-rehome-555.cjs, whose plan logic this copies):
 *   (a) the seed's other NEW LEGO (none of these seeds has one);
 *   (b) the original earlier LEGO that first taught the item (same Welsh, still new), if the phrase is valid there;
 *   (c) another NEW LEGO the phrase contains, the one CLOSEST AFTER the original running position
 *       (closest before only when nothing after is valid).
 * Valid = #510's per-line checks on a fully paginated vocabulary (Welsh vocab rule, not bare, contains the LEGO).
 * A home that already holds the same Welsh is a duplicate: that phrase is not moved. No valid home: it stays and is
 * listed for Aran with the words that block it. None of the seven is a home for another.
 *
 * KNOWN CLIPS, LIBRARY FIRST. English is not a human-recorded language, so a missing known clip cannot be queued.
 * Where the seed's known slot is empty and the sister live Welsh course already has a HUMAN take of the identical
 * English (the legacy_import clips the sandboxes' other seeds already play), that clip is linked. Nothing is rendered.
 * Missing Welsh target clips are not written here: the recordist queue already lists them (it is derived from the
 * course cast), and a take filed there fills the sandbox seed slot.
 *
 *   node tools/course-optimization/weave-cym-taught-556.cjs plan   → print every phrase, its homes and the choice
 *   node tools/course-optimization/weave-cym-taught-556.cjs sql    → weave-cym-taught-556.sql (+ -undo.sql); dry run unless psql -v finish=COMMIT
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

const JOB = 556;
const N = 'cym_nv2_for_eng';
const S = 'cym_sv2_for_eng';
const LIVE = { [N]: 'cym_n_for_eng', [S]: 'cym_s_for_eng' };
const SQL = path.join(__dirname, `weave-cym-taught-${JOB}.sql`);
const EVID = path.join(require('os').homedir(), `ssi-evidence/ssi-dashboard-v7/job-${JOB}`);

// The seven LEGOs Aran ruled already taught, with the Welsh each must still carry.
const FLIPS = [[N, 194, 1, 'gest ti?'], [N, 195, 1, 'wnest ti wylio?'], [N, 208, 1, 'ddudest ti'], [N, 222, 1, 'efo chdi'],
  [S, 205, 1, 'be’ ti’n mynd i wneud?'], [S, 217, 1, 'ddwedest ti'], [S, 219, 1, 'gofyn i ti']];
// Aran's count was 49; job #555 then moved two "pan …" phrases under S0208L01 (N) and S0217L01 (S), so 51 move on.
const EXPECTED_PHRASES = 51;
const legoKey = (s, l) => `S${String(s).padStart(4, '0')}L${String(l).padStart(2, '0')}`;
const q = (s) => (s === null || s === undefined ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);
const norm = (t) => String(t).toLowerCase().replace(/[’‘']/g, "'").replace(/\s+/g, ' ').trim();
const isFlip = (course, s, l) => FLIPS.some(([c, fs_, fl]) => c === course && fs_ === s && fl === l);

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
  // The plan is made as if the seven were already flipped: none of them is new, so none is a home.
  for (const x of legos) if (isFlip(course, x.seed_number, x.lego_index)) { x.wasNew = x.is_new; x.is_new = false; }
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
  for (const [course, s, l, welsh] of FLIPS) {
    const C = courses[course];
    const src = C.legos.find((x) => x.seed_number === s && x.lego_index === l);
    if (!src || !src.wasNew) throw new Error(`${course} ${legoKey(s, l)}: missing or already not new`);
    if (norm(src.target_text) !== norm(welsh)) throw new Error(`${course} ${legoKey(s, l)}: Welsh is now "${src.target_text}"`);
    if (s === 15) throw new Error('seed 15 is not to be touched');
    const srcPos = C.pos(s);
    // (b) the earlier LEGO that first taught the same Welsh, still new.
    const orig = C.legos.filter((x) => x.is_new && C.pos(x.seed_number) !== undefined && C.pos(x.seed_number) < srcPos
      && (norm(x.target_text) === norm(src.target_text) || isSameWelsh(course, x.target_text, src.target_text)))
      .sort((a, b) => C.pos(a.seed_number) - C.pos(b.seed_number))[0];
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
      out.push({ no, course, src: legoKey(s, l), srcWelsh: src.target_text, srcPos, ph, type, home, homePos: home ? C.pos(home.seed_number) : null, dup,
        orig: orig ? `${legoKey(orig.seed_number, orig.lego_index)}@${C.pos(orig.seed_number)}` : null,
        options: { a: a.map((x) => legoKey(x.seed_number, x.lego_index)), b: b.map((x) => legoKey(x.seed_number, x.lego_index)),
          c: c.map((x) => `${legoKey(x.seed_number, x.lego_index)}@${C.pos(x.seed_number)}`) },
        whyNone: home ? null : {
          // at the original LEGO that taught the item, and at every other new LEGO the phrase contains
          atOrig: orig ? checkAt(C, course, orig.seed_number, orig.lego_index, orig, ph.target_text) : 'no earlier LEGO with the same Welsh',
          contained: cand.map((x) => ({ lego: `${legoKey(x.seed_number, x.lego_index)} "${x.target_text}"@${C.pos(x.seed_number)}`,
            errs: checkAt(C, course, x.seed_number, x.lego_index, x, ph.target_text) })),
        } });
    }
  }
  if (no !== EXPECTED_PHRASES) throw new Error(`${no} phrases under the seven, expected ${EXPECTED_PHRASES}: stopping for Aran`);
  return { courses, phrasesBy, out };
}

function printPlan(out) {
  for (const x of out) {
    console.log(`#${x.no} ${x.course === N ? 'N' : 'S'} ${x.src}@${x.srcPos} (orig ${x.orig}) [${x.type}]${x.dup ? ' DUP' : ''} ${x.ph.target_text}`
      + (x.home ? ` → ${legoKey(x.home.seed_number, x.home.lego_index)} "${x.home.target_text}" @${x.homePos}` : ` → none: ${JSON.stringify(x.whyNone)}`)
      + `  {a:${x.options.a.join(',')} b:${x.options.b.join(',')} c:${x.options.c.join(',')}}`);
  }
}

/** Known slots empty on the seven seeds, filled from the sister live course's HUMAN take of the identical English. */
async function knownLinks(sb) {
  const links = [];
  for (const [course, s] of FLIPS) {
    const { data: seed } = await sb.from('course_seeds').select('id,known_text,known_audio_id').eq('course_code', course).eq('seed_number', s).single();
    if (seed.known_audio_id) continue;
    const { data: clips, error } = await sb.from('course_audio').select('id,voice_id,origin,text,course_code,role,language')
      .in('course_code', [LIVE[N], LIVE[S]]).eq('role', 'known').eq('language', 'eng').eq('origin', 'human');
    if (error) throw new Error(error.message);
    // Prefer this course's own live sister, then the other dialect's (English known side, same legacy reader).
    const hit = clips.filter((a) => norm(a.text).replace(/[?.!]$/, '') === norm(seed.known_text).replace(/[?.!]$/, ''))
      .sort((a, b) => (b.course_code === LIVE[course]) - (a.course_code === LIVE[course]) || a.id.localeCompare(b.id))[0];
    links.push({ course, s, seedId: seed.id, known: seed.known_text, audio: hit || null });
  }
  return links;
}

async function sql() {
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const { phrasesBy, out } = await plan(sb);
  printPlan(out);
  const moves = out.filter((x) => x.home && !x.dup);
  // The live phrase check as it runs on main (#510's lineChecks), at each new home.
  for (const m of moves) {
    m.liveCheck = await lineChecks(sb, m.course, m.home.seed_number, m.home.lego_index, m.home, m.ph.target_text);
    if (m.liveCheck.length) throw new Error(`live lineChecks refuse #${m.no} at its home: ${JSON.stringify(m.liveCheck)}`);
  }
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
  const links = await knownLinks(sb);
  const empty = (t) => `-- (none)\nSELECT 1 WHERE false;`;
  const moveSql = rows.length ? `INSERT INTO moves VALUES\n${rows.map((r) => `  (${q(r.old.id)}, ${q(r.id)}, ${q(r.course)}, ${r.s}, ${r.l}, ${r.position}, ${q(r.lego_position)}, ${q(JSON.stringify(r.metadata))}::jsonb, ${q(r.old.target_text)}, ${r.old.version}, ${q(r.old.updated_at)}::timestamptz, ${q(r.home_type)})`).join(',\n')};` : empty();
  const homeSql = next.size ? `INSERT INTO homes VALUES\n${[...next.entries()].map(([k, n]) => { const [c, s, l] = k.split('|'); return `  (${q(c)}, ${s}, ${l}, ${q(n.target)}, ${q(n.ids)})`; }).join(',\n')};` : empty();
  const flipSql = `INSERT INTO flips VALUES\n${FLIPS.map(([c, s, l, w]) => `  (${q(c)}, ${s}, ${l}, ${q(w)})`).join(',\n')};`;
  const lk = links.filter((x) => x.audio);
  const knownSql = lk.length ? `INSERT INTO known_links VALUES\n${lk.map((x) => `  (${q(x.seedId)}, ${q(x.course)}, ${x.s}, ${q(x.known)}, ${q(x.audio.id)})`).join(',\n')};` : empty();
  const fill = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8').replace('--@MOVES@', moveSql).replace('--@HOMES@', homeSql)
    .replace('--@FLIPS@', flipSql).replace('--@KNOWN@', knownSql).replace(/@NMOVES@/g, String(rows.length)).replace(/@NKNOWN@/g, String(lk.length));
  fs.writeFileSync(SQL, fill(`weave-cym-taught-${JOB}.sql.in`));
  fs.writeFileSync(SQL.replace(/\.sql$/, '-undo.sql'), fill(`weave-cym-taught-${JOB}-undo.sql.in`));
  fs.mkdirSync(EVID, { recursive: true });
  fs.writeFileSync(path.join(EVID, 'plan.json'), JSON.stringify({ out: out.map(({ home, ...x }) => ({ ...x, home: home && legoKey(home.seed_number, home.lego_index), homeWelsh: home && home.target_text })), rows, links }, null, 2));
  const by = (t) => moves.filter((m) => m.type === t).length;
  console.log(`${SQL}: ${rows.length} moves — (a) ${by('a')}, (b) ${by('b')}, (c) ${by('c')}; dup-skipped ${out.filter((x) => x.dup).length}; no home: ${out.filter((x) => !x.home).map((x) => `#${x.no}`).join(', ') || 'none'}`);
  for (const r of rows) console.log(`  ${r.old.id} → ${r.id} pos ${r.position} ${r.lego_position} | ${r.old.target_text}`);
  for (const x of links) console.log(`  known ${x.course} seed ${x.s} "${x.known}" ← ${x.audio ? `${x.audio.id} (${x.audio.course_code} ${x.audio.voice_id})` : 'NO human take in the library'}`);
}

module.exports = { plan, checkAt, FLIPS };
if (require.main === module) {
  const sb = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const mode = process.argv[2];
  (mode === 'plan' ? plan(sb()).then(({ out }) => printPlan(out)) : mode === 'sql' ? sql() : Promise.reject(new Error('mode: plan | sql')))
    .catch((e) => { console.error(e.message); process.exit(1); });
}
