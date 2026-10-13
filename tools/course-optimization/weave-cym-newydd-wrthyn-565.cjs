#!/usr/bin/env node
/**
 * TWO OF ARAN'S RULINGS (2026-10-13), APPLIED IN THE WELSH SANDBOXES cym_nv2_for_eng (N) / cym_sv2_for_eng (S) ONLY
 * (job #565). Live cym_n/cym_s and master canonical_seeds are fingerprinted unchanged.
 *
 * RULING 1 — 'newydd ddechrau', the simple version (job #558's page): 'wedi dechrau' is taught at seed 14, so
 *   seed 15 'dw i newydd ddechrau cofio' becomes 'dw i wedi dechrau cofio', its LEGO S0015L01 then repeats seed 14's
 *   'dw i wedi dechrau' and is marked already taught (seed 15 introduces nothing new and plays as a whole sentence).
 *   'newydd' is first introduced at N seed 64 'mae o newydd ddechrau' / S seed 62 'ma fe newydd ddechrau' (asserted
 *   new). Every line that PLAYS BEFORE that seed — seed sentence, LEGO or practice phrase — and contains
 *   'newydd ddechrau' becomes 'wedi dechrau' (soft mutation dropped), English 'just started' → 'started'. Lines at
 *   or after N64/S62, and lines in dropped seeds (no running position, never played), are left as they are.
 *   S0015L01's phrases are re-homed by Aran's standing rule (never orphan), #555's order:
 *   (a) the seed's other new LEGO, (b) the original earlier LEGO with the same Welsh (S0014L01), (c) another new LEGO
 *   the phrase contains, closest after the original running position. No valid home → stays, listed.
 *
 * RULING 2 — 'wrthyn nhw' (job #563): Hadau Creiddiol seed 1250 in each sandbox 'wrtha i' → 'wrthyn nhw',
 *   'tell me' → 'tell them' (sandbox seed rows only). A NEW LEGO 'wrthyn nhw' = 'to them' goes between the
 *   'rhywbeth arall' LEGO and the 'cyn i … ateb' LEGO: the 'cyn i … ateb' LEGO moves up one index with its phrases
 *   (ids follow), intro and proof flag — renumbering is safe only because both sandboxes have zero enrollments,
 *   asserted in the SQL. Seed ids are kept. Aran's 4 held sentences are filed: three under the new LEGO, N
 *   "bydden ni'n licio deud rhywbeth arall wrthyn nhw" under N S0187 'bydden ni'n licio' if that is a valid home,
 *   else by rule (c). Stage 2 tops the new LEGO up from the live generator (phrase-generation.cjs).
 *
 * Every changed or moved line passes the Welsh vocab rule (checkVocabViolations → welshUntaughtWords, on a fully
 * paginated vocabulary with the planned changes applied) plus not-bare and contains-the-LEGO at its home.
 * Changed text drops its old recordings by the DB triggers (null_*_audio_on_text_change: relinked only to a
 * same-voice clip of the NEW text, else NULL). Known (English) seed clips are linked library-first from the sister
 * live course's human take of the identical English; nothing is rendered.
 *
 *   node tools/course-optimization/weave-cym-newydd-wrthyn-565.cjs plan     read-only: prints every change
 *   node tools/course-optimization/weave-cym-newydd-wrthyn-565.cjs sql      → -565.sql, -565-undo.sql, -565-test.sql
 *   node tools/course-optimization/weave-cym-newydd-wrthyn-565.cjs generate (after stage 1) basket for the new LEGO
 *   node tools/course-optimization/weave-cym-newydd-wrthyn-565.cjs sql2     → -565-stage2.sql
 *   node tools/course-optimization/weave-cym-newydd-wrthyn-565.cjs verify   (after apply) live check of every line
 * Every .sql is a dry run unless psql -v finish=COMMIT. -test.sql runs apply then undo in one rolled-back transaction
 * and asserts the touched seeds come back byte-identical. The undo restores every touched seed whole, so it also
 * removes the stage-2 basket.
 */
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const os = require('os');
const { createClient } = require('@supabase/supabase-js');
const { makePhraseId, computeLegoPosition, partitionBareLegoPhrases, generateBuildupPhrases, phraseFloor } = require('../../services/course-builder/lib/phrase-structure.cjs');
const { checkVocabViolations } = require('../../services/course-builder/lib/validation.cjs');
const { normalizeForContainment, extractVocab } = require('../../services/course-builder/lib/text-normalization.cjs');
const { phraseContainsLego } = require('../../services/course-builder/lib/separable-verbs.cjs');
const { welshContainsLego, isSameWelsh } = require('../../services/course-builder/lib/welsh-mutation.cjs');
const { loadRunningOrder } = require('../../services/shared/running-order.cjs');

const JOB = 565;
const N = 'cym_nv2_for_eng';
const S = 'cym_sv2_for_eng';
const LIVE = { [N]: 'cym_n_for_eng', [S]: 'cym_s_for_eng' };
const DIR = __dirname;
const BASE = path.join(DIR, `weave-cym-newydd-wrthyn-${JOB}`);
const EVID = path.join(os.homedir(), `ssi-evidence/ssi-dashboard-v7/job-${JOB}`);
const BACKUP = `backup_cym_newydd_wrthyn_${JOB}`;

// Ruling 1: where 'newydd' is first introduced; everything playing before it loses 'newydd ddechrau'.
const NEWYDD_SEED = { [N]: 64, [S]: 62 };
const NEWYDD_LEGO = { [N]: 'mae o newydd ddechrau', [S]: 'ma fe newydd ddechrau' };
// Ruling 2: seed 1250's layout as it stands, and where the new LEGO goes.
const R2 = {
  [N]: { s: 1250, seedWas: 'fedri di ddeud rhywbeth arall wrtha i cyn i mi ateb?', prev: [2, 'rhywbeth arall'], next: [3, 'cyn i mi ateb'] },
  [S]: { s: 1250, seedWas: 'alli di ddweud rhywbeth arall wrtha i cyn i fi ateb?', prev: [3, 'rhywbeth arall'], next: [4, 'cyn i fi ateb'] },
};
// Aran 2026-10-13 (second ruling): North seed 15 would be identical to seed 14 after ruling 1, so it is DROPPED from the
// North running order (course_seed_weave_drops, the mechanism the weave's other drops use). Row and seed id kept; its
// text still follows ruling 1 so the row is coherent; its phrases move under seed 14 as planned. South seed 15 stays.
const DROPS = [{ c: N, s: 15, reason: 'Aran 2026-10-13: after newydd ddechrau → wedi dechrau it is identical to seed 14 (dw i wedi dechrau cofio); dropped, not kept as a duplicate (job #565)' }];
const NEW_LEGO = { type: 'M', known: 'to them', target: 'wrthyn nhw', components: [{ known: 'to them', target: 'wrthyn nhw' }] };
// Aran's four held sentences (job #555 left them under taught LEGOs), and the home Aran named for each.
const HELD = [
  { c: N, target: 'doeddan ni ddim yn gwybod beth i ddeud wrthyn nhw', home: 'new' },
  { c: S, target: 'do’n ni ddim yn gwybod beth i ddweud wrthyn nhw', home: 'new' },
  { c: S, target: 'hoffen ni ddweud rhywbeth arall wrthyn nhw', home: 'new' },
  { c: N, target: 'bydden ni’n licio deud rhywbeth arall wrthyn nhw', home: [187, 1, 'bydden ni’n licio'] },
];

const sbClient = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
const q = (s) => (s === null || s === undefined ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);
const qj = (o) => (o === null || o === undefined ? 'NULL' : `${q(JSON.stringify(o))}::jsonb`);
const qa = (a) => (a ? `ARRAY[${a.map(q).join(',')}]::text[]` : 'NULL');
const tag = (s, l) => `S${String(s).padStart(4, '0')}L${String(l).padStart(2, '0')}`;
const norm = (t) => String(t).toLowerCase().replace(/[’‘']/g, "'").replace(/\s+/g, ' ').trim();
const cc = (c) => (c === N ? 'N' : 'S');

// The text rules.
const R1_TARGET = /newydd ddechrau/gi;
const r1Target = (t) => t.replace(R1_TARGET, 'wedi dechrau');
const r1Known = (k) => k.replace(/just started/g, 'started').replace(/Just started/g, 'Started');
const r2Target = (t) => t.replace(/wrtha i/g, 'wrthyn nhw');
const r2Known = (k) => k.replace(/tell me/g, 'tell them');

async function all(sb, table, cols, course, extra = (x) => x) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await extra(sb.from(table).select(cols).eq('course_code', course)).order('id').range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

async function loadCourse(sb, course) {
  const order = await loadRunningOrder(sb, course);
  if (!order) throw new Error(`${course}: no running order`);
  const legos = await all(sb, 'course_legos', 'id,seed_number,lego_index,target_text,known_text,type,components,is_new,version,status,release_batch', course);
  const seeds = await all(sb, 'course_seeds', 'id,seed_number,target_text,known_text,version,known_audio_id,target1_audio_id,target2_audio_id', course);
  return { course, order, legos, seeds, pos: (s) => order.positionOf.get(s) };
}

/** #555's checkAt: Welsh vocab rule on everything before the seed in running order + this seed up to l; not bare; contains the LEGO. */
function checkAt(C, s, l, legoTarget, target) {
  const p = C.pos(s);
  if (p === undefined) return [{ kind: 'not in running order' }];
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
  const vv = checkVocabViolations([{ target }], vocab, C.course, { seedNumber: s });
  if (vv.length) errs.push({ kind: 'vocab', words: vv.flatMap((v) => v.unknown.split(' ')) });
  if (partitionBareLegoPhrases([{ target }], legoTarget).bare.length) errs.push({ kind: 'bare LEGO' });
  const nl = normalizeForContainment(legoTarget);
  if (!phraseContainsLego({ courseCode: C.course, seedNumber: s, legoTarget, phraseTarget: target,
    baseline: (lt, pt) => normalizeForContainment(pt).includes(nl) })) errs.push({ kind: 'containment' });
  return errs;
}

async function phrasesWhere(sb, course, col, pattern) {
  return all(sb, 'course_practice_phrases', '*', course, (x) => x.ilike(col, pattern));
}

async function build(sb) {
  const out = { drops: DROPS, seedEdits: [], legoEdits: [], phraseEdits: [], moves: [], held: [], legoMoves: [], adds: [], knownLinks: [], connRewrites: [],
    noHome: [], warnings: [], zut: [], snapshot: {} };
  for (const c of [N, S]) {
    const C = await loadCourse(sb, c);
    // The drop, applied to the running order the plan reasons over (the view numbers kept seeds 1..n, so later ones move up).
    for (const d of DROPS.filter((x) => x.c === c)) {
      const p = C.order.positionOf.get(d.s);
      if (p === undefined) { out.warnings.push(`${cc(c)} seed ${d.s} is already out of the running order`); continue; }
      C.order.positionOf.delete(d.s);
      for (const [k, v] of C.order.positionOf) if (v > p) C.order.positionOf.set(k, v - 1);
      C.order.seeds = C.order.seeds.filter((x) => x !== d.s);
    }
    const dropped = (s) => DROPS.some((d) => d.c === c && d.s === s);
    const seedRow = (s) => C.seeds.find((x) => x.seed_number === s);
    const legoRow = (s, l) => C.legos.find((x) => x.seed_number === s && x.lego_index === l);
    const cut = C.pos(NEWYDD_SEED[c]);
    const plays = (s) => C.pos(s) !== undefined;
    const before = (s) => plays(s) && C.pos(s) < cut;
    // A dropped seed 15 still takes ruling 1's text (its row stays coherent); its position for re-homing is seed 14's.
    const before15 = (s) => before(s) || (s === 15 && dropped(15));
    const posOr = (s) => C.pos(s) ?? (s === 15 ? C.pos(14) + 0.5 : undefined);

    // ── preconditions, read live ────────────────────────────────────────────────────────────────
    const nl = legoRow(NEWYDD_SEED[c], 1);
    if (!nl || norm(nl.target_text) !== norm(NEWYDD_LEGO[c]) || !nl.is_new) out.warnings.push(`${cc(c)} ${tag(NEWYDD_SEED[c], 1)} is not the NEW '${NEWYDD_LEGO[c]}': ${JSON.stringify(nl)}`);
    const s15 = seedRow(15);
    if (norm(s15.target_text) !== norm('dw i newydd ddechrau cofio')) out.warnings.push(`${cc(c)} seed 15 is "${s15.target_text}" (already changed?)`);
    const l15 = legoRow(15, 1);
    if (norm(l15.target_text) !== norm('dw i newydd ddechrau') || !l15.is_new) out.warnings.push(`${cc(c)} S0015L01 is ${JSON.stringify(l15)}`);
    if (C.legos.some((x) => x.seed_number === 15 && x.lego_index !== 1)) out.warnings.push(`${cc(c)} seed 15 has more than one LEGO`);
    const l14 = legoRow(14, 1);
    if (norm(l14.target_text) !== norm('dw i wedi dechrau') || !l14.is_new) out.warnings.push(`${cc(c)} S0014L01 is ${JSON.stringify(l14)}`);
    const r2 = R2[c];
    const s1250 = seedRow(r2.s);
    if (norm(s1250.target_text) !== norm(r2.seedWas)) out.warnings.push(`${cc(c)} seed 1250 is "${s1250.target_text}"`);
    const lp = legoRow(r2.s, r2.prev[0]); const ln = legoRow(r2.s, r2.next[0]);
    if (!lp || norm(lp.target_text) !== norm(r2.prev[1])) out.warnings.push(`${cc(c)} ${tag(r2.s, r2.prev[0])} is ${JSON.stringify(lp)}`);
    if (!ln || norm(ln.target_text) !== norm(r2.next[1])) out.warnings.push(`${cc(c)} ${tag(r2.s, r2.next[0])} is ${JSON.stringify(ln)}`);
    const maxIdx = Math.max(...C.legos.filter((x) => x.seed_number === r2.s).map((x) => x.lego_index));
    if (maxIdx !== r2.next[0]) out.warnings.push(`${cc(c)} seed 1250 has LEGOs after ${tag(r2.s, r2.next[0])}`);

    // ── Ruling 1 on seeds and LEGOs (virtual state updated as we go, so the checks see the new course) ──
    for (const x of C.seeds) {
      if (!before15(x.seed_number) || !R1_TARGET.test(x.target_text)) { R1_TARGET.lastIndex = 0; continue; }
      R1_TARGET.lastIndex = 0;
      const e = { c, s: x.seed_number, id: x.id, version: x.version, pos: C.pos(x.seed_number) ?? 'dropped', was: [x.target_text, x.known_text],
        now: [r1Target(x.target_text), r1Known(x.known_text)], why: 'ruling 1' };
      if (e.now[1] === e.was[1]) out.warnings.push(`${cc(c)} seed ${x.seed_number}: English has no 'just started': "${x.known_text}"`);
      out.seedEdits.push(e);
      x.target_text = e.now[0]; x.known_text = e.now[1];
    }
    for (const x of C.legos) {
      if (!before15(x.seed_number) || !/newydd ddechrau/i.test(x.target_text + JSON.stringify(x.components || []))) continue;
      const now = [r1Target(x.target_text), r1Known(x.known_text)];
      const comps = x.components ? x.components.map((k) => ({ known: r1Known(k.known), target: r1Target(k.target) })) : x.components;
      // Taught already when an earlier NEW LEGO carries the same Welsh and English (S0014L01 for S0015L01).
      const earlier = C.legos.find((y) => y.is_new && before(y.seed_number) && C.pos(y.seed_number) < posOr(x.seed_number)
        && norm(y.target_text) === norm(now[0]) && norm(y.known_text) === norm(now[1]));
      out.legoEdits.push({ c, s: x.seed_number, l: x.lego_index, id: x.id, version: x.version, was: [x.target_text, x.known_text, x.is_new],
        now: [...now, earlier ? false : x.is_new], components: comps, compsWas: x.components, taughtAt: earlier ? tag(earlier.seed_number, earlier.lego_index) : null });
      x.wasNew = x.is_new; x.target_text = now[0]; x.known_text = now[1]; x.components = comps; if (earlier) x.is_new = false;
    }
    if (C.legos.some((x) => before(x.seed_number) && x.is_new && /newydd/i.test(x.target_text))) out.warnings.push(`${cc(c)} a new LEGO before seed ${NEWYDD_SEED[c]} still carries 'newydd'`);

    // ── Ruling 2 on seed 1250 and its LEGOs (virtual) ──
    out.seedEdits.push({ c, s: r2.s, id: s1250.id, version: s1250.version, pos: C.pos(r2.s), was: [s1250.target_text, s1250.known_text],
      now: [r2Target(s1250.target_text), r2Known(s1250.known_text)], why: 'ruling 2' });
    s1250.target_text = r2Target(s1250.target_text); s1250.known_text = r2Known(s1250.known_text);
    out.legoMoves.push({ c, s: r2.s, a: r2.next[0], b: r2.next[0] + 1, target: ln.target_text, id: ln.id, version: ln.version });
    ln.lego_index = r2.next[0] + 1;
    const add = { c, s: r2.s, l: r2.next[0], ...NEW_LEGO, status: ln.status, release_batch: ln.release_batch, is_new: true };
    out.adds.push(add);
    C.legos.push({ seed_number: r2.s, lego_index: add.l, target_text: add.target, known_text: add.known, type: add.type, components: add.components, is_new: true, added: true });

    // ── Ruling 1 on practice phrases ──
    const hits = await phrasesWhere(sb, c, 'target_text', '%newydd ddechrau%');
    const under15 = await all(sb, 'course_practice_phrases', '*', c, (x) => x.eq('seed_number', 15).eq('lego_index', 1));
    const rows = new Map([...hits, ...under15].map((r) => [r.id, r]));
    out.snapshot[c] = {};
    const phrasesUnder = new Map();
    const rowsUnder = async (s, l) => {
      const k = `${s}|${l}`;
      if (!phrasesUnder.has(k)) phrasesUnder.set(k, await all(sb, 'course_practice_phrases', 'id,seed_number,lego_index,position,phrase_role,target_text,known_text', c,
        (x) => x.eq('seed_number', s).eq('lego_index', l)));
      return phrasesUnder.get(k);
    };
    const nextFree = new Map(); // `${s}|${l}` -> {pos, build, use, component}
    const claim = async (s, l, role) => {
      const k = `${s}|${l}`;
      if (!nextFree.has(k)) {
        const cur = C.legos.find((x) => x.seed_number === s && x.lego_index === l)?.added ? [] : await rowsUnder(s, l);
        const numOf = (r) => Math.max(0, ...cur.filter((x) => x.phrase_role === r).map((x) => Number(x.id.slice(-2))));
        nextFree.set(k, { pos: Math.max(0, ...cur.map((x) => x.position)), build: numOf('build'), use: numOf('use'), component: numOf('component'),
          ids: cur.map((x) => x.id).sort(), texts: cur.map((x) => norm(x.target_text)) });
      }
      const n = nextFree.get(k);
      n.pos += 1; n[role] += 1;
      return { id: makePhraseId(c, s, l, role, n[role]), position: n.pos };
    };
    const homeHolds = async (s, l, target) => {
      if (C.legos.find((x) => x.seed_number === s && x.lego_index === l)?.added) return false;
      return (await rowsUnder(s, l)).some((r) => norm(r.target_text) === norm(target)) || (nextFree.get(`${s}|${l}`)?.texts || []).includes(norm(target));
    };
    const legoAt = (s, l) => C.legos.find((x) => x.seed_number === s && x.lego_index === l);
    // (a)/(b)/(c) home search, #555's order; srcPos = the phrase's original running position.
    const findHome = (target, s, l, srcPos, orig) => {
      const valid = (x) => x.is_new && plays(x.seed_number) && !(x.seed_number === s && x.lego_index === l) && checkAt(C, x.seed_number, x.lego_index, x.target_text, target).length === 0;
      const a = C.legos.filter((x) => x.seed_number === s && x.lego_index !== l && valid(x));
      if (a.length) return { type: 'a', home: a[0] };
      if (orig && valid(orig)) return { type: 'b', home: orig };
      const cand = C.legos.filter((x) => x.is_new && x !== orig && x.seed_number !== s && plays(x.seed_number)
        && (` ${normalizeForContainment(target)} `.includes(` ${normalizeForContainment(x.target_text)} `) || welshContainsLego(c, x.target_text, target)));
      const ok = cand.filter(valid).sort((x, y) => C.pos(x.seed_number) - C.pos(y.seed_number) || x.lego_index - y.lego_index);
      const after = ok.filter((x) => C.pos(x.seed_number) >= srcPos);
      if (ok.length) return { type: 'c', home: after.length ? after[0] : ok[ok.length - 1] };
      return null;
    };

    const reCheck = []; // edited phrases that stay put: checked once all moves are planned
    for (const r of [...rows.values()].sort((a, b) => (C.pos(a.seed_number) ?? 1e9) - (C.pos(b.seed_number) ?? 1e9) || a.id.localeCompare(b.id))) {
      const edit = before15(r.seed_number) && /newydd ddechrau/i.test(r.target_text);
      const now = edit ? [r1Target(r.target_text), r1Known(r.known_text)] : [r.target_text, r.known_text];
      if (edit && now[1] === r.known_text) out.warnings.push(`${cc(c)} ${r.id}: English has no 'just started': "${r.known_text}"`);
      out.snapshot[c][r.id] = { target: r.target_text, version: r.version };
      const lego = legoAt(r.seed_number, r.lego_index);
      const isSrc = r.seed_number === 15 && r.lego_index === 1;
      const conn = r.connected_lego_ids && r.connected_lego_ids.includes('S0015L01') && edit
        ? r.connected_lego_ids.map((x) => (x === 'S0015L01' ? 'S0014L01' : x)).filter((x, i, a) => a.indexOf(x) === i) : r.connected_lego_ids;
      if (isSrc) {
        const h = findHome(now[0], 15, 1, posOr(15), legoAt(14, 1));
        if (!h) { out.noHome.push({ c, id: r.id, was: [r.target_text, r.known_text], now, why: checkAt(C, 14, 1, legoAt(14, 1).target_text, now[0]) }); if (edit) out.phraseEdits.push({ c, id: r.id, was: [r.target_text, r.known_text], now, conn, stays: true, pos: C.pos(r.seed_number) ?? 'dropped' }); continue; }
        if (await homeHolds(h.home.seed_number, h.home.lego_index, now[0])) {
          out.noHome.push({ c, id: r.id, was: [r.target_text, r.known_text], now, dupAt: tag(h.home.seed_number, h.home.lego_index) });
          if (edit) out.phraseEdits.push({ c, id: r.id, was: [r.target_text, r.known_text], now, conn, stays: true, pos: C.pos(r.seed_number) ?? 'dropped' });
          continue;
        }
        const slot = await claim(h.home.seed_number, h.home.lego_index, r.phrase_role);
        nextFree.get(`${h.home.seed_number}|${h.home.lego_index}`).texts.push(norm(now[0]));
        out.moves.push({ c, oldId: r.id, newId: slot.id, s: h.home.seed_number, l: h.home.lego_index, position: slot.position, type: h.type,
          homeTarget: h.home.target_text, homePos: C.pos(h.home.seed_number), was: [r.target_text, r.known_text], now, edit, conn,
          lego_position: computeLegoPosition(now[0], h.home.target_text), metadata: { ...r.metadata, job: JOB, moved_from: { id: r.id, lego: 'S0015L01', position: r.position, home_type: h.type } } });
        continue;
      }
      if (!edit) continue;
      out.phraseEdits.push({ c, id: r.id, was: [r.target_text, r.known_text], now, conn, pos: C.pos(r.seed_number), lego: tag(r.seed_number, r.lego_index), legoNew: lego.is_new });
      reCheck.push({ r, now, lego });
    }
    for (const { r, now, lego } of reCheck) {
      const e = out.phraseEdits.find((x) => x.c === c && x.id === r.id);
      // Only what the change INTRODUCES is the change's problem: a line already filed under a LEGO it does not contain,
      // or already carrying a word untaught there, is reported as pre-existing (same check on the old text).
      const nowErrs = checkAt(C, r.seed_number, r.lego_index, lego.target_text, now[0]);
      const oldErrs = checkAt(C, r.seed_number, r.lego_index, lego.target_text, r.target_text);
      const had = (k) => oldErrs.find((x) => x.kind === k);
      e.preExisting = nowErrs.filter((x) => had(x.kind) && (x.kind !== 'vocab' || x.words.every((w) => had('vocab').words.includes(w))));
      e.check = nowErrs.filter((x) => !e.preExisting.includes(x));
      const sib = (await rowsUnder(r.seed_number, r.lego_index)).filter((x) => x.id !== r.id && norm(rows.has(x.id) && before(x.seed_number) ? r1Target(x.target_text) : x.target_text) === norm(now[0]));
      if (sib.length) e.dupUnderSameLego = sib.map((x) => x.id);
    }

    // ── Ruling 2: the four held sentences ──
    for (const h of HELD.filter((x) => x.c === c)) {
      const found = await all(sb, 'course_practice_phrases', '*', c, (x) => x.eq('target_text', h.target));
      if (found.length !== 1) { out.warnings.push(`${cc(c)} held "${h.target}": ${found.length} rows`); continue; }
      const r = found[0];
      out.snapshot[c][r.id] = { target: r.target_text, version: r.version };
      let home = h.home === 'new' ? legoAt(r2.s, add.l) : legoAt(h.home[0], h.home[1]);
      let type = h.home === 'new' ? 'new LEGO' : `S${h.home[0]} as #563 advised`;
      let note = null;
      const errsAt = (x) => (x ? checkAt(C, x.seed_number, x.lego_index, x.target_text, r.target_text) : [{ kind: 'no such LEGO' }]);
      if (!home || !home.is_new || errsAt(home).length) {
        note = `named home ${home ? tag(home.seed_number, home.lego_index) : '?'} "${home?.target_text}" is ${!home ? 'missing' : !home.is_new ? 'not new (its phrases never play)' : `refused: ${JSON.stringify(errsAt(home))}`}`;
        const f = findHome(r.target_text, r.seed_number, r.lego_index, C.pos(r2.s), null);
        if (!f) { out.noHome.push({ c, id: r.id, was: [r.target_text, r.known_text], held: true, why: note }); continue; }
        home = f.home; type = `rule (${f.type})`;
      }
      if (await homeHolds(home.seed_number, home.lego_index, r.target_text)) { out.noHome.push({ c, id: r.id, was: [r.target_text, r.known_text], held: true, dupAt: tag(home.seed_number, home.lego_index) }); continue; }
      const slot = await claim(home.seed_number, home.lego_index, r.phrase_role);
      nextFree.get(`${home.seed_number}|${home.lego_index}`).texts.push(norm(r.target_text));
      out.moves.push({ c, oldId: r.id, newId: slot.id, s: home.seed_number, l: home.lego_index, position: slot.position, type, note,
        homeTarget: home.target_text, homePos: C.pos(home.seed_number), was: [r.target_text, r.known_text], now: [r.target_text, r.known_text], edit: false,
        conn: r.connected_lego_ids, held: true, lego_position: computeLegoPosition(r.target_text, home.target_text),
        metadata: { ...r.metadata, job: JOB, moved_from: { id: r.id, lego: tag(r.seed_number, r.lego_index), position: r.position, home_type: type } } });
    }
    add.heldHere = out.moves.filter((m) => m.c === c && m.held && m.s === r2.s && m.l === add.l).length;
    if (!add.heldHere) { add.is_new = false; out.warnings.push(`${cc(c)} the new LEGO gets none of the held sentences: written not-new, flipped in stage 2`); }

    // connected_lego_ids naming the renumbered LEGO follow it.
    const ta = tag(r2.s, r2.next[0]); const tb = tag(r2.s, r2.next[0] + 1);
    for (const r of await all(sb, 'course_practice_phrases', 'id,seed_number,lego_index,connected_lego_ids,version', c, (x) => x.contains('connected_lego_ids', [ta]))) {
      if (r.seed_number === r2.s && r.lego_index === r2.next[0]) continue; // moves with its LEGO; handled there
      out.connRewrites.push({ c, id: r.id, s: r.seed_number, from: ta, to: tb, version: r.version });
    }

    // ── ZUT: a changed line whose English is already used elsewhere for different Welsh ──
    const changed = [...out.seedEdits.filter((x) => x.c === c), ...out.phraseEdits.filter((x) => x.c === c), ...out.legoEdits.filter((x) => x.c === c)];
    for (const e of changed) {
      const { data } = await sb.from('course_practice_phrases').select('id,target_text,known_text,seed_number').eq('course_code', c).ilike('known_text', e.now[1].replace(/[%_]/g, '\\$&'));
      const clash = (data || []).filter((x) => plays(x.seed_number) && norm(x.target_text) !== norm(e.now[0])
        && !changed.some((y) => y.id === x.id && norm(y.now[0]) === norm(e.now[0])));
      if (clash.length) out.zut.push({ c, line: e.id || tag(e.s, e.l), known: e.now[1], target: e.now[0], others: clash.map((x) => `${x.id}: ${x.target_text}`) });
    }

    // ── known clips for the changed seeds, library first ──
    for (const e of out.seedEdits.filter((x) => x.c === c && !dropped(x.s))) {
      const seed = seedRow(e.s);
      const { data: clips, error } = await sb.from('course_audio').select('id,voice_id,origin,text,course_code')
        .in('course_code', [LIVE[N], LIVE[S]]).eq('role', 'known').eq('origin', 'human');
      if (error) throw new Error(error.message);
      const hit = clips.filter((a) => norm(a.text).replace(/[?.!]$/, '') === norm(e.now[1]).replace(/[?.!]$/, ''))
        .sort((a, b) => (b.course_code === LIVE[c]) - (a.course_code === LIVE[c]) || a.id.localeCompare(b.id))[0];
      out.knownLinks.push({ c, s: e.s, id: seed.id, known: e.now[1], had: seed.known_audio_id, audio: hit ? hit.id : null, from: hit ? `${hit.course_code} ${hit.voice_id}` : null });
    }
  }
  // Touched seeds: every seed whose seed row, LEGOs or phrases this writes, plus every home.
  const touched = new Set();
  const t = (c, s) => touched.add(`${c}|${s}`);
  for (const e of out.seedEdits) t(e.c, e.s);
  for (const d of DROPS) t(d.c, d.s);
  for (const e of out.legoEdits) t(e.c, e.s);
  for (const e of out.phraseEdits) t(e.c, Number(e.id.split(':')[1].slice(1, 5)));
  for (const m of out.moves) { t(m.c, m.s); t(m.c, Number(m.oldId.split(':')[1].slice(1, 5))); }
  for (const m of out.legoMoves) t(m.c, m.s);
  for (const m of out.connRewrites) t(m.c, m.s);
  out.touched = [...touched].map((x) => { const [c, s] = x.split('|'); return { c, s: Number(s) }; });
  for (const e of out.phraseEdits) if (e.check && e.check.length) out.warnings.push(`${cc(e.c)} ${e.id} "${e.now[0]}" fails the live check where it is: ${JSON.stringify(e.check)}`);
  return out;
}

function printPlan(o) {
  console.log('── DROPPED FROM THE RUNNING ORDER');
  for (const d of o.drops) console.log(`${cc(d.c)} seed ${d.s}: ${d.reason}`);
  console.log('── SEEDS');
  for (const e of o.seedEdits) console.log(`${cc(e.c)} seed ${e.s} @${e.pos} [${e.why}]  "${e.was[0]}" / ${e.was[1]}  →  "${e.now[0]}" / ${e.now[1]}`);
  console.log('── LEGOs');
  for (const e of o.legoEdits) console.log(`${cc(e.c)} ${tag(e.s, e.l)}  "${e.was[0]}" = ${e.was[1]} (new ${e.was[2]})  →  "${e.now[0]}" = ${e.now[1]} (new ${e.now[2]}${e.taughtAt ? `, taught at ${e.taughtAt}` : ''})`);
  for (const m of o.legoMoves) console.log(`${cc(m.c)} MOVE ${tag(m.s, m.a)} → ${tag(m.s, m.b)} "${m.target}" (phrases, intro, flags follow)`);
  for (const a of o.adds) console.log(`${cc(a.c)} ADD ${tag(a.s, a.l)} [${a.type}] "${a.target}" = ${a.known}, new ${a.is_new} (held sentences filed here: ${a.heldHere})`);
  console.log('── PHRASES CHANGED IN PLACE');
  for (const e of o.phraseEdits) console.log(`${cc(e.c)} ${e.id.split(':')[1]} @${e.pos}${e.stays ? ' (STAYS, no home)' : ''}${e.dupUnderSameLego ? ` DUP-SAME-LEGO ${e.dupUnderSameLego}` : ''}${e.check?.length ? ` CHECK ${JSON.stringify(e.check)}` : ''}${e.preExisting?.length ? ` (pre-existing: ${JSON.stringify(e.preExisting)})` : ''}  "${e.was[0]}" → "${e.now[0]}"  |  ${e.was[1]} → ${e.now[1]}`);
  console.log('── PHRASES MOVED');
  for (const m of o.moves) console.log(`${cc(m.c)} ${m.oldId.split(':')[1]} → ${m.newId.split(':')[1]} [${m.type}] home "${m.homeTarget}" @${m.homePos} pos ${m.position}${m.note ? ` (${m.note})` : ''}  "${m.was[0]}"${m.edit ? ` → "${m.now[0]}"` : ''}`);
  console.log('── NO HOME');
  for (const x of o.noHome) console.log(`${cc(x.c)} ${x.id.split(':')[1]} "${(x.now || x.was)[0]}" ${x.dupAt ? `duplicate at ${x.dupAt}` : JSON.stringify(x.why)}`);
  console.log('── connected_lego_ids follow the renumber:', o.connRewrites.length);
  console.log('── KNOWN CLIPS');
  for (const k of o.knownLinks) console.log(`${cc(k.c)} seed ${k.s} "${k.known}": had ${k.had || 'none'}, link ${k.audio || 'NONE FOUND'} ${k.from || ''}`);
  console.log('── ZUT (same English, other Welsh)');
  for (const z of o.zut) console.log(`${cc(z.c)} ${z.line} "${z.known}" = "${z.target}" vs ${z.others.slice(0, 4).join(' ; ')}`);
  console.log(`── touched seeds: ${o.touched.length}`);
  for (const w of o.warnings) console.log(`WARNING ${w}`);
}

// ── SQL ────────────────────────────────────────────────────────────────────────────────────────────
const SEED_COLS = 'id, course_code, seed_number, known_text, target_text, status, release_batch, version, updated_at, created_at, known_audio_id, target1_audio_id, target2_audio_id, decomposed_at, approved_at, target_text_roman, flagged_at, last_edit_event_id';

function fingerprintFn() {
  return `CREATE FUNCTION pg_temp.fp() RETURNS TABLE(t text, n bigint, h text) LANGUAGE sql AS $$
  SELECT 'canonical_seeds (master)', count(*), md5(string_agg(md5(x::text), '' ORDER BY x::text)) FROM canonical_seeds x
  UNION ALL SELECT 'live '||x.course_code||' seeds', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_seeds x WHERE x.course_code IN ('cym_n_for_eng','cym_s_for_eng') GROUP BY x.course_code
  UNION ALL SELECT 'live '||x.course_code||' legos', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_legos x WHERE x.course_code IN ('cym_n_for_eng','cym_s_for_eng') GROUP BY x.course_code
  UNION ALL SELECT 'live '||x.course_code||' phrases', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_practice_phrases x WHERE x.course_code IN ('cym_n_for_eng','cym_s_for_eng') GROUP BY x.course_code
  UNION ALL SELECT 'weave drops '||x.course_code, count(*), md5(string_agg(md5(row(x.course_code, x.seed_number, x.reason, x.decided_by)::text), '' ORDER BY x.seed_number)) FROM course_seed_weave_drops x
    WHERE (x.course_code, x.seed_number) NOT IN (SELECT c, s FROM t_seeds) GROUP BY x.course_code
  UNION ALL SELECT 'sandbox '||x.course_code||' other seeds', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_seeds x
    WHERE x.course_code IN ('cym_nv2_for_eng','cym_sv2_for_eng') AND (x.course_code, x.seed_number) NOT IN (SELECT c, s FROM t_seeds) GROUP BY x.course_code
  UNION ALL SELECT 'sandbox '||x.course_code||' other legos', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_legos x
    WHERE x.course_code IN ('cym_nv2_for_eng','cym_sv2_for_eng') AND (x.course_code, x.seed_number) NOT IN (SELECT c, s FROM t_seeds) GROUP BY x.course_code
  UNION ALL SELECT 'sandbox '||x.course_code||' other phrases', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_practice_phrases x
    WHERE x.course_code IN ('cym_nv2_for_eng','cym_sv2_for_eng') AND (x.course_code, x.seed_number) NOT IN (SELECT c, s FROM t_seeds) GROUP BY x.course_code
$$;`;
}

// The touched seeds' state as one hash per table (version/updated_at excluded for seeds and LEGOs: the triggers bump them).
const SEEDS_STATE = (src) => `(SELECT md5(string_agg(md5(row(x.id, x.known_text, x.target_text, x.known_audio_id, x.target1_audio_id, x.target2_audio_id)::text), '' ORDER BY x.id)) FROM ${src} x JOIN t_seeds t ON (t.c, t.s) = (x.course_code, x.seed_number))`;
const LEGOS_STATE = (src) => `(SELECT md5(string_agg(md5(row(x.id, x.course_code, x.seed_number, x.lego_index, x.type, x.is_new, x.known_text, x.target_text, x.components, x.known_audio_id, x.target1_audio_id, x.target2_audio_id, x.presentation_audio_id)::text), '' ORDER BY x.id)) FROM ${src} x JOIN t_seeds t ON (t.c, t.s) = (x.course_code, x.seed_number))`;
const PHR_STATE = (src) => `(SELECT md5(string_agg(md5(row(x.id, x.seed_number, x.lego_index, x.position, x.known_text, x.target_text, x.phrase_role, x.known_audio_id, x.target1_audio_id, x.target2_audio_id, x.connected_lego_ids, x.lego_position)::text), '' ORDER BY x.id)) FROM ${src} x JOIN t_seeds t ON (t.c, t.s) = (x.course_code, x.seed_number))`;

function applyBody(o) {
  const tSeeds = o.touched.map((x) => `(${q(x.c)}, ${x.s})`).join(', ');
  const ev = (c) => `(SELECT id FROM ev WHERE course_code = ${q(c)})`;
  const snap = [];
  for (const c of [N, S]) for (const [id, v] of Object.entries(o.snapshot[c])) snap.push(`(${q(id)}, ${q(v.target)}, ${v.version})`);
  const lines = [];
  lines.push(`CREATE TEMP TABLE t_seeds (c text, s int, PRIMARY KEY (c, s));
INSERT INTO t_seeds VALUES ${tSeeds};
CREATE TEMP TABLE snap (id text PRIMARY KEY, target_text text, version int);
INSERT INTO snap VALUES
  ${snap.join(',\n  ')};
-- Lock what we read; under REPEATABLE READ a row changed by another transaction since our snapshot raises here.
SELECT count(*) AS locked_seeds FROM (SELECT 1 FROM course_seeds x JOIN t_seeds t ON (t.c, t.s) = (x.course_code, x.seed_number) FOR UPDATE OF x) z;
SELECT count(*) AS locked_legos FROM (SELECT 1 FROM course_legos x JOIN t_seeds t ON (t.c, t.s) = (x.course_code, x.seed_number) FOR UPDATE OF x) z;
SELECT count(*) AS locked_phrases FROM (SELECT 1 FROM course_practice_phrases x JOIN t_seeds t ON (t.c, t.s) = (x.course_code, x.seed_number) FOR UPDATE OF x) z;
${fingerprintFn()}
CREATE TEMP TABLE pre AS SELECT * FROM pg_temp.fp();
SELECT 'BEFORE' k, * FROM pre ORDER BY t;
DO $$ BEGIN
  IF to_regclass('${BACKUP}_seeds') IS NOT NULL THEN RAISE EXCEPTION 'already applied (${BACKUP}_seeds exists)'; END IF;
  IF EXISTS (SELECT 1 FROM course_enrollments WHERE course_id IN ('cym_nv2_for_eng','cym_sv2_for_eng')) THEN
    RAISE EXCEPTION 'a sandbox has enrollments: renumbering would move learners (PROGRESS RULE)'; END IF;
  IF EXISTS (SELECT 1 FROM t_seeds WHERE c NOT IN ('cym_nv2_for_eng','cym_sv2_for_eng')) THEN RAISE EXCEPTION 'a touched seed is outside the sandboxes'; END IF;
  IF (SELECT count(*) FROM snap n JOIN course_practice_phrases p ON p.id = n.id AND p.target_text = n.target_text AND p.version = n.version) <> (SELECT count(*) FROM snap) THEN
    RAISE EXCEPTION 'CHANGED UNDER US: a phrase this edits or moves is gone or was edited since the plan — re-plan'; END IF;
${o.drops.map((d) => `  IF EXISTS (SELECT 1 FROM course_seed_weave_drops WHERE course_code = ${q(d.c)} AND seed_number = ${d.s}) THEN RAISE EXCEPTION '${cc(d.c)} seed ${d.s} is already dropped'; END IF;`).join('\n')}
${o.seedEdits.map((e) => `  IF NOT EXISTS (SELECT 1 FROM course_seeds WHERE id = ${q(e.id)} AND target_text = ${q(e.was[0])} AND known_text = ${q(e.was[1])} AND version = ${e.version}) THEN RAISE EXCEPTION 'CHANGED UNDER US: ${cc(e.c)} seed ${e.s}'; END IF;`).join('\n')}
${o.legoEdits.map((e) => `  IF NOT EXISTS (SELECT 1 FROM course_legos WHERE id = ${q(e.id)} AND target_text = ${q(e.was[0])} AND is_new = ${e.was[2]} AND version = ${e.version}) THEN RAISE EXCEPTION 'CHANGED UNDER US: ${cc(e.c)} ${tag(e.s, e.l)}'; END IF;`).join('\n')}
${o.legoMoves.map((m) => `  IF NOT EXISTS (SELECT 1 FROM course_legos WHERE id = ${q(m.id)} AND lego_index = ${m.a} AND target_text = ${q(m.target)} AND version = ${m.version}) THEN RAISE EXCEPTION 'CHANGED UNDER US: ${cc(m.c)} ${tag(m.s, m.a)}'; END IF;
  IF EXISTS (SELECT 1 FROM course_legos WHERE course_code = ${q(m.c)} AND seed_number = ${m.s} AND lego_index >= ${m.b}) THEN RAISE EXCEPTION '${cc(m.c)} ${tag(m.s, m.b)} is taken'; END IF;`).join('\n')}
  IF EXISTS (SELECT 1 FROM course_legos WHERE (course_code, seed_number, lego_index) IN (${o.adds.map((a) => `(${q(a.c)}, ${a.s}, ${a.l + 1})`).join(', ')}) AND NOT is_new) THEN RAISE EXCEPTION 'cyn i … ateb is not new'; END IF;
${Object.entries(NEWYDD_SEED).map(([c, s]) => `  IF NOT EXISTS (SELECT 1 FROM course_legos WHERE course_code = ${q(c)} AND seed_number = ${s} AND lego_index = 1 AND is_new AND target_text = ${q(NEWYDD_LEGO[c])}) THEN RAISE EXCEPTION '${cc(c)} 'newydd' LEGO at seed ${s} is not new'; END IF;`).join('\n')}
END $$;

-- The backup: every row of every touched seed (seed row, LEGOs, phrases, intros, proof flags) as it stands now.
CREATE TABLE ${BACKUP}_seeds AS SELECT x.* FROM course_seeds x JOIN t_seeds t ON (t.c, t.s) = (x.course_code, x.seed_number);
CREATE TABLE ${BACKUP}_legos AS SELECT x.* FROM course_legos x JOIN t_seeds t ON (t.c, t.s) = (x.course_code, x.seed_number);
CREATE TABLE ${BACKUP}_phrases AS SELECT x.* FROM course_practice_phrases x JOIN t_seeds t ON (t.c, t.s) = (x.course_code, x.seed_number);
CREATE TABLE ${BACKUP}_intros AS SELECT x.* FROM lego_introductions x JOIN t_seeds t ON t.c = x.course_code AND substr(x.lego_id, 2, 4)::int = t.s;
CREATE TABLE ${BACKUP}_flags AS SELECT x.* FROM lego_proof_flags x JOIN t_seeds t ON t.c = x.course_code AND substr(x.lego_id, 2, 4)::int = t.s;
CREATE TABLE ${BACKUP}_touched AS SELECT * FROM t_seeds;
CREATE TABLE ${BACKUP}_drops AS SELECT x.* FROM course_seed_weave_drops x JOIN t_seeds t ON (t.c, t.s) = (x.course_code, x.seed_number);
REVOKE ALL ON ${BACKUP}_seeds, ${BACKUP}_legos, ${BACKUP}_phrases, ${BACKUP}_intros, ${BACKUP}_flags, ${BACKUP}_touched, ${BACKUP}_drops FROM anon, authenticated;

INSERT INTO content_edit_events (course_code, surface, operation, actor_kind, actor_id, actor_label, actor_verified, actor_role, scope, detail)
SELECT c, 'sql:job-565 weave-cym-newydd-wrthyn', 'weave-newydd-wrthyn-rulings', 'agent', 'claude-job-565-newydd-wrthyn', 'agent (claude-job-565-newydd-wrthyn)', false, 'creator',
  jsonb_build_object('seeds', (SELECT jsonb_agg(s ORDER BY s) FROM t_seeds WHERE t_seeds.c = v.c)),
  jsonb_build_object('ruling', 'Aran 2026-10-13: (1) newydd ddechrau → wedi dechrau before N64/S62, seed 15 = dw i wedi dechrau cofio, S0015L01 already taught, its phrases re-homed; (2) seed 1250 wrtha i → wrthyn nhw, new LEGO wrthyn nhw = to them, the 4 held sentences filed.',
                     'backup', '${BACKUP}', 'stage', 1)
FROM (VALUES ('cym_nv2_for_eng'), ('cym_sv2_for_eng')) v(c);
CREATE TEMP TABLE ev AS SELECT DISTINCT ON (course_code) course_code, id FROM content_edit_events WHERE detail->>'backup' = '${BACKUP}' AND (detail->>'stage') = '1' ORDER BY course_code, occurred_at DESC, id;

-- Move one LEGO up its seed (b free): copy the row to b, move its phrases (ids follow), intro and proof flag, delete the
-- old row, give the copy the old row's uuid back (job #554's move_lego).
CREATE FUNCTION pg_temp.move_lego(c text, s int, a int, b int, ev uuid) RETURNS void LANGUAGE plpgsql AS $f$
DECLARE old_uuid uuid; new_uuid uuid := gen_random_uuid();
  ta text := 'S'||lpad(s::text,4,'0')||'L'||lpad(a::text,2,'0'); tb text := 'S'||lpad(s::text,4,'0')||'L'||lpad(b::text,2,'0');
BEGIN
  SELECT id INTO old_uuid FROM course_legos WHERE course_code=c AND seed_number=s AND lego_index=a;
  INSERT INTO course_legos (id, course_code, seed_number, lego_index, type, is_new, known_text, target_text, components, status, release_batch, version, created_at,
    known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id, target1_duration_ms, target2_duration_ms, target_text_roman, target_lego_id, known_gloss_segments, last_edit_event_id)
  SELECT new_uuid, course_code, seed_number, b, type, is_new, known_text, target_text, components, status, release_batch, version, created_at,
    known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id, target1_duration_ms, target2_duration_ms, target_text_roman, target_lego_id, known_gloss_segments, ev
  FROM course_legos WHERE id = old_uuid;
  UPDATE course_practice_phrases SET lego_index = b, id = replace(id, ':'||ta, ':'||tb), lego_id = tb,
    connected_lego_ids = array_replace(connected_lego_ids, ta, tb),
    decomposition = NULL, decomposition_course_version = NULL, display_tiling = NULL, display_tiling_version = NULL, last_edit_event_id = ev
  WHERE course_code=c AND seed_number=s AND lego_index=a;
  UPDATE lego_introductions SET lego_id = tb WHERE course_code=c AND lego_id=ta;
  UPDATE lego_proof_flags SET lego_id = tb WHERE course_code=c AND lego_id=ta;
  DELETE FROM course_legos WHERE id = old_uuid;
  UPDATE course_legos SET id = old_uuid WHERE id = new_uuid;
END $f$;
`);
  lines.push('-- 0. DROP (Aran 2026-10-13): North seed 15 leaves the running order; row and id kept');
  for (const d of o.drops) lines.push(`INSERT INTO course_seed_weave_drops (course_code, seed_number, reason, decided_by) VALUES (${q(d.c)}, ${d.s}, ${q(d.reason)}, 'aran (job-565)');`);
  lines.push('-- 1. RULING 2: the cyn i … ateb LEGO moves up one; the new LEGO wrthyn nhw takes its index');
  for (const m of o.legoMoves) lines.push(`SELECT pg_temp.move_lego(${q(m.c)}, ${m.s}, ${m.a}, ${m.b}, ${ev(m.c)});`);
  for (const a of o.adds) lines.push(`INSERT INTO course_legos (course_code, seed_number, lego_index, type, is_new, known_text, target_text, components, status, release_batch, last_edit_event_id)
  VALUES (${q(a.c)}, ${a.s}, ${a.l}, ${q(a.type)}, ${a.is_new}, ${q(a.known)}, ${q(a.target)}, ${qj(a.components)}, ${q(a.status)}, ${a.release_batch ?? 'NULL'}, ${ev(a.c)});`);
  for (const r of o.connRewrites) lines.push(`UPDATE course_practice_phrases SET connected_lego_ids = array_replace(connected_lego_ids, ${q(r.from)}, ${q(r.to)}), last_edit_event_id = ${ev(r.c)} WHERE id = ${q(r.id)};`);
  lines.push('-- 2. SEEDS (text change: the trigger drops each old clip unless a same-voice clip of the new text exists)');
  for (const e of o.seedEdits) lines.push(`UPDATE course_seeds SET target_text = ${q(e.now[0])}, known_text = ${q(e.now[1])}, last_edit_event_id = ${ev(e.c)} WHERE id = ${q(e.id)};`);
  lines.push('-- 3. LEGOs (ruling 1)');
  for (const e of o.legoEdits) lines.push(`UPDATE course_legos SET target_text = ${q(e.now[0])}, known_text = ${q(e.now[1])}, components = ${qj(e.components)}, is_new = ${e.now[2]}, last_edit_event_id = ${ev(e.c)} WHERE id = ${q(e.id)};`);
  lines.push('-- 4. PHRASES changed in place (ruling 1)');
  for (const e of o.phraseEdits) lines.push(`UPDATE course_practice_phrases SET target_text = ${q(e.now[0])}, known_text = ${q(e.now[1])}, connected_lego_ids = ${qa(e.conn)}, decomposition = NULL, decomposition_course_version = NULL, display_tiling = NULL, display_tiling_version = NULL, last_edit_event_id = ${ev(e.c)} WHERE id = ${q(e.id)};`);
  lines.push('-- 5. PHRASES moved (S0015L01 re-homed; the held wrthyn nhw sentences filed). Text first (triggers drop stale clips), then re-key.');
  for (const m of o.moves) {
    if (m.edit) lines.push(`UPDATE course_practice_phrases SET target_text = ${q(m.now[0])}, known_text = ${q(m.now[1])}, connected_lego_ids = ${qa(m.conn)} WHERE id = ${q(m.oldId)};`);
    lines.push(`UPDATE course_practice_phrases SET id = ${q(m.newId)}, seed_number = ${m.s}, lego_index = ${m.l}, lego_id = ${q(tag(m.s, m.l))}, position = ${m.position}, lego_position = ${q(m.lego_position)},
  metadata = ${qj(m.metadata)}, decomposition = NULL, decomposition_course_version = NULL, display_tiling = NULL, display_tiling_version = NULL, last_edit_event_id = ${ev(m.c)} WHERE id = ${q(m.oldId)};`);
  }
  lines.push('-- 6. KNOWN CLIPS, library first (the sister live course\'s human take of the identical English)');
  for (const k of o.knownLinks) if (k.audio) lines.push(`UPDATE course_seeds SET known_audio_id = ${q(k.audio)} WHERE id = ${q(k.id)} AND known_audio_id IS NULL;`);
  lines.push(`SET CONSTRAINTS ALL IMMEDIATE;

CREATE TEMP TABLE post AS SELECT * FROM pg_temp.fp();
SELECT 'AFTER' k, * FROM post ORDER BY t;
DO $$ BEGIN
  IF EXISTS (SELECT * FROM pre EXCEPT SELECT * FROM post) OR EXISTS (SELECT * FROM post EXCEPT SELECT * FROM pre) THEN
    RAISE EXCEPTION 'CHECK FAILED: live Welsh, master canonical_seeds, or a sandbox row outside the touched seeds changed'; END IF;
  IF (SELECT count(*) FROM course_practice_phrases x JOIN t_seeds t ON (t.c, t.s) = (x.course_code, x.seed_number)) <> (SELECT count(*) FROM ${BACKUP}_phrases) THEN
    RAISE EXCEPTION 'CHECK FAILED: phrase count in the touched seeds'; END IF;
  IF EXISTS (SELECT 1 FROM course_legos l WHERE l.course_code IN ('cym_nv2_for_eng','cym_sv2_for_eng') AND l.is_new AND l.target_text ~* 'newydd'
      AND (SELECT position FROM course_running_order r WHERE (r.course_code, r.seed_number) = (l.course_code, l.seed_number)) <
          (SELECT position FROM course_running_order r WHERE r.course_code = l.course_code AND r.seed_number = CASE l.course_code WHEN 'cym_nv2_for_eng' THEN 64 ELSE 62 END)) THEN
    RAISE EXCEPTION 'CHECK FAILED: a new LEGO before the newydd seed still carries newydd'; END IF;
  IF EXISTS (SELECT 1 FROM course_practice_phrases p JOIN course_running_order r USING (course_code, seed_number) WHERE p.course_code IN ('cym_nv2_for_eng','cym_sv2_for_eng')
      AND p.target_text ~* 'newydd ddechrau' AND r.position < (SELECT position FROM course_running_order r2 WHERE r2.course_code = p.course_code AND r2.seed_number = CASE p.course_code WHEN 'cym_nv2_for_eng' THEN 64 ELSE 62 END)
      AND EXISTS (SELECT 1 FROM course_legos l WHERE (l.course_code, l.seed_number, l.lego_index) = (p.course_code, p.seed_number, p.lego_index) AND l.is_new)) THEN
    RAISE EXCEPTION 'CHECK FAILED: a playing phrase before the newydd seed still says newydd ddechrau'; END IF;
  IF EXISTS (SELECT 1 FROM course_seeds s JOIN course_running_order r USING (course_code, seed_number) WHERE s.course_code IN ('cym_nv2_for_eng','cym_sv2_for_eng')
      AND s.target_text ~* 'newydd ddechrau' AND r.position < (SELECT position FROM course_running_order r2 WHERE r2.course_code = s.course_code AND r2.seed_number = CASE s.course_code WHEN 'cym_nv2_for_eng' THEN 64 ELSE 62 END)) THEN
    RAISE EXCEPTION 'CHECK FAILED: a seed before the newydd seed still says newydd ddechrau'; END IF;
  IF EXISTS (SELECT 1 FROM course_seeds WHERE course_code IN ('cym_nv2_for_eng','cym_sv2_for_eng') AND seed_number = 1250 AND target_text !~ 'wrthyn nhw') THEN RAISE EXCEPTION 'CHECK FAILED: seed 1250'; END IF;
  IF EXISTS (SELECT 1 FROM course_running_order WHERE course_code = 'cym_nv2_for_eng' AND seed_number = 15) THEN RAISE EXCEPTION 'CHECK FAILED: North seed 15 still in the running order'; END IF;
  IF NOT EXISTS (SELECT 1 FROM course_running_order WHERE course_code = 'cym_sv2_for_eng' AND seed_number = 15) THEN RAISE EXCEPTION 'CHECK FAILED: South seed 15 left the running order'; END IF;
  RAISE NOTICE 'ALL CHECKS PASSED';
END $$;
SELECT course_code, seed_number, target_text, known_text, known_audio_id IS NOT NULL k, target1_audio_id IS NOT NULL t1, target2_audio_id IS NOT NULL t2 FROM course_seeds
  WHERE last_edit_event_id IN (SELECT id FROM ev) ORDER BY 1, 2;
SELECT lego_id, lego_index, is_new, target_text, known_text FROM course_legos WHERE course_code IN ('cym_nv2_for_eng','cym_sv2_for_eng') AND seed_number IN (15, 1250) ORDER BY course_code, seed_number, lego_index;
`);
  return lines.join('\n');
}

function undoBody() {
  return `DO $$ BEGIN IF to_regclass('${BACKUP}_seeds') IS NULL THEN RAISE EXCEPTION 'not applied (no ${BACKUP}_seeds)'; END IF; END $$;
CREATE TEMP TABLE IF NOT EXISTS t_seeds (c text, s int, PRIMARY KEY (c, s));
TRUNCATE t_seeds; INSERT INTO t_seeds SELECT * FROM ${BACKUP}_touched;
SET CONSTRAINTS ALL DEFERRED;  -- the debut guard judges the restored state, not the moment between delete and re-insert
SELECT count(*) AS locked_phrases FROM (SELECT 1 FROM course_practice_phrases x JOIN t_seeds t ON (t.c, t.s) = (x.course_code, x.seed_number) FOR UPDATE OF x) z;
-- Restore every touched seed whole: phrases and LEGOs (and their intros/flags) deleted and re-inserted verbatim, seed rows set back.
DELETE FROM course_practice_phrases x USING t_seeds t WHERE (t.c, t.s) = (x.course_code, x.seed_number);
DELETE FROM lego_introductions x USING t_seeds t WHERE t.c = x.course_code AND substr(x.lego_id, 2, 4)::int = t.s;
DELETE FROM lego_proof_flags x USING t_seeds t WHERE t.c = x.course_code AND substr(x.lego_id, 2, 4)::int = t.s;
DELETE FROM course_legos x USING t_seeds t WHERE (t.c, t.s) = (x.course_code, x.seed_number);
INSERT INTO course_legos SELECT * FROM ${BACKUP}_legos;
INSERT INTO course_practice_phrases SELECT * FROM ${BACKUP}_phrases;
INSERT INTO lego_introductions SELECT * FROM ${BACKUP}_intros;
INSERT INTO lego_proof_flags SELECT * FROM ${BACKUP}_flags;
DELETE FROM course_seed_weave_drops x USING t_seeds t WHERE (t.c, t.s) = (x.course_code, x.seed_number);
INSERT INTO course_seed_weave_drops SELECT * FROM ${BACKUP}_drops;
UPDATE course_seeds x SET known_text = b.known_text, target_text = b.target_text, known_audio_id = b.known_audio_id, target1_audio_id = b.target1_audio_id,
  target2_audio_id = b.target2_audio_id, last_edit_event_id = b.last_edit_event_id FROM ${BACKUP}_seeds b WHERE b.id = x.id;
SET CONSTRAINTS ALL IMMEDIATE;
DO $$ BEGIN
  IF ${SEEDS_STATE('course_seeds')} IS DISTINCT FROM ${SEEDS_STATE(`${BACKUP}_seeds`)} THEN RAISE EXCEPTION 'UNDO CHECK FAILED: seeds'; END IF;
  IF ${LEGOS_STATE('course_legos')} IS DISTINCT FROM ${LEGOS_STATE(`${BACKUP}_legos`)} THEN RAISE EXCEPTION 'UNDO CHECK FAILED: LEGOs'; END IF;
  IF (SELECT md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_practice_phrases x JOIN t_seeds t ON (t.c, t.s) = (x.course_code, x.seed_number))
     IS DISTINCT FROM (SELECT md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM ${BACKUP}_phrases x) THEN RAISE EXCEPTION 'UNDO CHECK FAILED: phrases'; END IF;
  RAISE NOTICE 'RESTORED: % seeds, % LEGOs, % phrases byte-identical to the backup', (SELECT count(*) FROM ${BACKUP}_seeds), (SELECT count(*) FROM ${BACKUP}_legos), (SELECT count(*) FROM ${BACKUP}_phrases);
END $$;
DROP TABLE ${BACKUP}_seeds, ${BACKUP}_legos, ${BACKUP}_phrases, ${BACKUP}_intros, ${BACKUP}_flags, ${BACKUP}_touched, ${BACKUP}_drops;
`;
}

const HEAD = (title) => `-- GENERATED by weave-cym-newydd-wrthyn-565.cjs — ${title}
\\set ON_ERROR_STOP on
\\if :{?finish}
\\else
  \\set finish ROLLBACK
\\endif
BEGIN ISOLATION LEVEL REPEATABLE READ;
SET LOCAL statement_timeout = '20min';
`;
const FOOT = `SELECT 'finishing with' k, :'finish' v;
:finish;
SELECT :'finish' = 'COMMIT' AS do_refresh \\gset
\\if :do_refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index;
\\endif
`;

// ── stage 2: top the new LEGO up from the live generator ───────────────────────────────────────────
const resultFile = (c) => path.join(EVID, `${c}-S1250-wrthyn-nhw.json`);
async function legoIndexOfNew(sb, c) {
  const { data } = await sb.from('course_legos').select('lego_index,target_text,is_new').eq('course_code', c).eq('seed_number', 1250).eq('target_text', NEW_LEGO.target);
  return data && data.length === 1 ? data[0] : null;
}
async function generate() {
  const sb = sbClient();
  const { generateLegoPhrases } = require('../../services/course-builder/lib/phrase-generation.cjs');
  fs.mkdirSync(EVID, { recursive: true });
  for (const c of [N, S]) {
    const lego = await legoIndexOfNew(sb, c);
    if (!lego) { console.log(`${cc(c)} SKIP: stage 1 not applied`); continue; }
    let r;
    try { r = await generateLegoPhrases(sb, c, 1250, lego.lego_index, { debutInSameWrite: !lego.is_new }); } catch (e) { r = { error: e.message }; }
    const rec = { c, l: lego.lego_index, blocked: r.blocked || !!r.error, error: r.error, failingGates: r.gate?.failingGates, build: r.build, use: r.use };
    fs.writeFileSync(resultFile(c), JSON.stringify(rec, null, 2));
    console.log(`${cc(c)} ${tag(1250, lego.lego_index)}: ${rec.blocked ? `BLOCKED ${rec.error || (rec.failingGates || []).join(',')}` : `${(r.build || []).length}B/${(r.use || []).length}U`}`);
    for (const p of [...(r.build || []), ...(r.use || [])]) console.log(`    ${p.target}  =  ${p.known}`);
  }
}
async function sql2() {
  const sb = sbClient();
  const rows = []; const held = []; const flips = [];
  for (const c of [N, S]) {
    if (!fs.existsSync(resultFile(c))) { held.push(`${cc(c)}: not generated`); continue; }
    const r = JSON.parse(fs.readFileSync(resultFile(c), 'utf8'));
    const lego = await legoIndexOfNew(sb, c);
    if (r.blocked) { held.push(`${cc(c)}: generator blocked (${r.error || (r.failingGates || []).join(',')})`); }
    const C = await loadCourse(sb, c);
    const { data: cur } = await sb.from('course_practice_phrases').select('id,position,phrase_role,target_text').eq('course_code', c).eq('seed_number', 1250).eq('lego_index', lego.lego_index);
    const have = new Set(cur.map((x) => norm(x.target_text)));
    const n = { pos: Math.max(0, ...cur.map((x) => x.position)), build: 0, use: 0 };
    for (const role of ['build', 'use']) n[role] = Math.max(0, ...cur.filter((x) => x.phrase_role === role).map((x) => Number(x.id.slice(-2))));
    for (const role of ['build', 'use']) for (const p of (r[role] || [])) {
      if (have.has(norm(p.target))) { held.push(`${cc(c)} "${p.target}": already there`); continue; }
      const errs = checkAt(C, 1250, lego.lego_index, NEW_LEGO.target, p.target);
      if (errs.length) { held.push(`${cc(c)} "${p.target}": ${JSON.stringify(errs)}`); continue; }
      have.add(norm(p.target)); n.pos += 1; n[role] += 1;
      rows.push({ id: makePhraseId(c, 1250, lego.lego_index, role, n[role]), c, l: lego.lego_index, position: n.pos, known: p.known, target: p.target, role,
        lego_position: computeLegoPosition(p.target, NEW_LEGO.target) });
    }
    if (!lego.is_new) flips.push({ c, l: lego.lego_index });
    const { minBuild, minUse } = phraseFloor(1250, lego.lego_index);
    const b = cur.filter((x) => x.phrase_role === 'build').length + rows.filter((x) => x.c === c && x.role === 'build').length;
    const u = cur.filter((x) => x.phrase_role === 'use').length + rows.filter((x) => x.c === c && x.role === 'use').length;
    console.log(`${cc(c)} ${tag(1250, lego.lego_index)}: after stage 2 ${b} build + ${u} use (floor ${minBuild} + ${minUse})`);
  }
  const evq = (c) => `(SELECT id FROM content_edit_events WHERE detail->>'backup' = '${BACKUP}' AND (detail->>'stage') = '2' AND course_code = ${q(c)} ORDER BY occurred_at DESC LIMIT 1)`;
  const sql = `${HEAD('stage 2: the generator basket for the new LEGO wrthyn nhw (seed 1250). Undo: the stage-1 undo restores seed 1250 whole.')}
${held.map((h) => `-- HELD: ${h}`).join('\n')}
DO $$ BEGIN IF to_regclass('${BACKUP}_seeds') IS NULL THEN RAISE EXCEPTION 'stage 1 is not applied'; END IF; END $$;
INSERT INTO content_edit_events (course_code, surface, operation, actor_kind, actor_id, actor_label, actor_verified, actor_role, scope, detail)
SELECT c, 'sql:job-565 weave-cym-newydd-wrthyn stage2', 'weave-newydd-wrthyn-basket', 'agent', 'claude-job-565-newydd-wrthyn', 'agent (claude-job-565-newydd-wrthyn)', false, 'creator',
  '{}'::jsonb, jsonb_build_object('stage', 2, 'backup', '${BACKUP}', 'generator', 'phrase-generation.cjs generateLegoPhrases + Welsh line check')
FROM (VALUES ('cym_nv2_for_eng'), ('cym_sv2_for_eng')) v(c);
${rows.length ? `INSERT INTO course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count,
  phrase_role, introduce, connected_lego_ids, lego_position, metadata, status, version, last_edit_event_id) VALUES
${rows.map((r) => `  (${q(r.id)}, ${q(r.c)}, 1250, ${r.l}, ${r.position}, ${q(r.known)}, ${q(r.target)}, ${r.target.length}, ${(r.known.match(/\s+/g) || []).length + 1}, ${q(r.role)}, true, '{}', ${q(r.lego_position)}, ${qj({ format: 'build_use', pipeline: 'v3', job: JOB, generator: 'phrase-generation.cjs generateLegoPhrases' })}, 'draft', 1, ${evq(r.c)})`).join(',\n')};` : '-- nothing to insert'}
${flips.map((x) => `UPDATE course_legos SET is_new = true WHERE course_code = ${q(x.c)} AND seed_number = 1250 AND lego_index = ${x.l};`).join('\n')}
SET CONSTRAINTS ALL IMMEDIATE;
SELECT course_code, lego_index, phrase_role, target_text, known_text FROM course_practice_phrases WHERE course_code IN ('cym_nv2_for_eng','cym_sv2_for_eng') AND seed_number = 1250 AND target_text ~ 'wrthyn nhw' ORDER BY 1, 2, position;
${FOOT}`;
  fs.writeFileSync(`${BASE}-stage2.sql`, sql);
  console.log(`${BASE}-stage2.sql: ${rows.length} rows`);
  for (const h of held) console.log(`HELD ${h}`);
}

// ── verify: after apply, every changed / moved line through the live check on the course as it now stands ──
async function verify() {
  const sb = sbClient();
  const plan = JSON.parse(fs.readFileSync(path.join(EVID, 'stage1-plan.json'), 'utf8'));
  const { lineChecks } = require('./weave-cym-aran-written-510.cjs');
  let bad = 0;
  const report = [];
  for (const c of [N, S]) {
    const C = await loadCourse(sb, c);
    const ids = [...plan.phraseEdits.filter((x) => x.c === c && !x.stays).map((x) => x.id), ...plan.moves.filter((x) => x.c === c).map((x) => x.newId)];
    const { data: newIds } = await sb.from('course_practice_phrases').select('id').eq('course_code', c).eq('seed_number', 1250).ilike('target_text', '%wrthyn nhw%');
    for (const r of newIds || []) if (!ids.includes(r.id)) ids.push(r.id);
    for (let i = 0; i < ids.length; i += 100) {
      const { data } = await sb.from('course_practice_phrases').select('id,seed_number,lego_index,target_text,known_text').in('id', ids.slice(i, i + 100));
      for (const r of data) {
        const lego = C.legos.find((x) => x.seed_number === r.seed_number && x.lego_index === r.lego_index);
        const errs = checkAt(C, r.seed_number, r.lego_index, lego.target_text, r.target_text);
        const live = await lineChecks(sb, c, r.seed_number, r.lego_index, lego, r.target_text);
        const ok = !errs.length && lego.is_new;
        if (!ok) bad += 1;
        report.push({ c, id: r.id, target: r.target_text, legoNew: lego.is_new, check: errs, lineChecks: live });
        console.log(`${ok ? 'OK ' : 'BAD'} ${cc(c)} ${r.id.split(':')[1]} new=${lego.is_new} ${r.target_text}${errs.length ? ` ${JSON.stringify(errs)}` : ''}${live.length ? ` (lineChecks, 1000-row vocab page: ${JSON.stringify(live)})` : ''}`);
      }
      if (data.length !== ids.slice(i, i + 100).length) { console.log('MISSING ids'); bad += 1; }
    }
  }
  fs.writeFileSync(path.join(EVID, 'verify.json'), JSON.stringify(report, null, 2));
  console.log(bad ? `${bad} BAD` : 'every line passes');
}

async function main() {
  const mode = process.argv[2];
  if (mode === 'generate') return generate();
  if (mode === 'sql2') return sql2();
  if (mode === 'verify') return verify();
  const o = await build(sbClient());
  printPlan(o);
  if (mode === 'plan') return;
  if (mode === 'sql') {
    if (o.warnings.length) throw new Error('warnings above: fix the plan first');
    fs.mkdirSync(EVID, { recursive: true });
    fs.writeFileSync(path.join(EVID, 'stage1-plan.json'), JSON.stringify(o, null, 2));
    const body = applyBody(o);
    fs.writeFileSync(`${BASE}.sql`, `${HEAD('stage 1 (Aran 2026-10-13 rulings 1 and 2). Dry run unless -v finish=COMMIT. Undo: -565-undo.sql')}${body}\n${FOOT}`);
    fs.writeFileSync(`${BASE}-undo.sql`, `${HEAD('UNDO of stage 1 (and stage 2): restores every touched seed whole from the backup')}${undoBody()}\n${FOOT}`);
    fs.writeFileSync(`${BASE}-test.sql`, `${HEAD('TEST: apply then undo in ONE transaction, always rolled back')}${body}
CREATE TEMP TABLE before_seeds AS SELECT * FROM ${BACKUP}_seeds;
CREATE TEMP TABLE before_legos AS SELECT * FROM ${BACKUP}_legos;
CREATE TEMP TABLE before_phrases AS SELECT * FROM ${BACKUP}_phrases;
${undoBody()}
DO $$ BEGIN
  IF ${SEEDS_STATE('course_seeds')} IS DISTINCT FROM ${SEEDS_STATE('before_seeds')} THEN RAISE EXCEPTION 'TEST FAILED: seeds'; END IF;
  IF ${LEGOS_STATE('course_legos')} IS DISTINCT FROM ${LEGOS_STATE('before_legos')} THEN RAISE EXCEPTION 'TEST FAILED: LEGOs'; END IF;
  IF ${PHR_STATE('course_practice_phrases')} IS DISTINCT FROM ${PHR_STATE('before_phrases')} THEN RAISE EXCEPTION 'TEST FAILED: phrases'; END IF;
  IF EXISTS (SELECT * FROM pre EXCEPT SELECT * FROM pg_temp.fp()) THEN RAISE EXCEPTION 'TEST FAILED: fingerprint'; END IF;
  IF NOT EXISTS (SELECT 1 FROM course_running_order WHERE course_code = 'cym_nv2_for_eng' AND seed_number = 15) THEN RAISE EXCEPTION 'TEST FAILED: North seed 15 not back in the running order'; END IF;
  IF EXISTS (SELECT 1 FROM course_seed_weave_drops WHERE course_code = 'cym_nv2_for_eng' AND seed_number = 15) THEN RAISE EXCEPTION 'TEST FAILED: drop row survived the undo'; END IF;
  RAISE NOTICE 'TEST PASSED: apply then undo leaves every touched seed as it was';
END $$;
ROLLBACK;
`);
    console.log(`wrote ${BASE}.sql, -undo.sql, -test.sql`);
    return;
  }
  throw new Error('mode: plan | sql | generate | sql2 | verify');
}

module.exports = { checkAt, r1Target, r1Known, r2Target, r2Known };
if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
