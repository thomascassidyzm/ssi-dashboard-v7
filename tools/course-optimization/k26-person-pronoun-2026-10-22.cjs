#!/usr/bin/env node
'use strict';
// tools/course-optimization/k26-person-pronoun-2026-10-22.cjs  (job #531, Kai 22 Oct 2026)
//
// Canon K26 (the PERSON must match on both sides: where the target verb marks a person, the known side names it, in LEGOs,
// components and phrases) plus its narrow companion K28 (a complete finite target clause whose seed subject is a NOUN PHRASE
// outside the LEGO takes the pronoun that noun takes). Applied to por_br_for_eng, por_for_eng, ara_for_eng, spa_for_eng.
// The ENGLISH side only, through Popty edit-batch, one batch per course. The per-LEGO decisions are DATA
// (k26-person-pronoun-2026-10-22.data.cjs), made by reading every row in full: a regex found the candidates, it decided nothing.
//
// What this tool adds to the data, mechanically:
//   - drift guard: a unit whose live LEGO/phrase text is not the text the reader saw is SKIPPED and listed;
//   - recency guard: a row changed in the last hour (job #530·V is editing the same English) is SKIPPED and listed;
//   - ZUT guard: a unit that makes a non-component known text point at two different targets (one English, two targets)
//     is HELD with the rows it clashes with; held units are dropped and the check re-run until stable;
//   - duplicate note: a unit whose new LEGO is an exact both-sides copy of an EARLIER LEGO is applied and LISTED;
//   - every touched seed is unapproved (approved_at null) when approved.
//   node …/k26-person-pronoun-2026-10-22.cjs <course> plan  [--api file.json] [--now ISO]    # no writes; prints plan + ZUT
//   node …/k26-person-pronoun-2026-10-22.cjs <course> apply [--api file.json]                # edit-batch dry run, then apply with APPLY_CONFIRM=1
const fs = require('fs');
const path = require('path');
const audit = require('./audit-phrase-zut.cjs');

const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const AGENT = 'k26-person-pronoun (job #531)';
const RECENT_MS = 60 * 60 * 1000;

const sid = (id) => String(id).split(':').pop();
const nk = audit.nk;

function fromApi(api) {
  const seeds = [], legos = [], phrases = [];
  for (const s of api.seeds) {
    const { legos: ls, ...seed } = s; seeds.push(seed);
    for (const l of ls || []) { const { basket_phrases, ...lego } = l; legos.push(lego); for (const p of basket_phrases || []) phrases.push(p); }
  }
  return { seeds, legos, phrases };
}

/** Build the concrete unit list from the data: [lego_id, from, to, compsOrNull, {phraseId: [from, to]}]. */
function expand(rows) {
  return rows.map(([lego_id, from, to, comps, phrases]) => ({ lego_id, from, to, comps: comps || null, phrases: phrases || {} }));
}

/** Resolve each unit against live rows. Returns { units (ready), skipped }. */
function resolve(db, course, rows, now) {
  const L = new Map(db.legos.map((l) => [l.lego_id, l]));
  const P = new Map(db.phrases.map((p) => [sid(p.id), p]));
  const ready = [], skipped = [];
  for (const u of expand(rows)) {
    const lego = L.get(u.lego_id);
    const why = [];
    if (!lego) { skipped.push({ ...u, why: 'LEGO not found' }); continue; }
    if (lego.known_text !== u.from) why.push(`LEGO now reads "${lego.known_text}", not "${u.from}"`);
    const ops = [];
    const touched = [lego];
    if (u.comps) {
      const comps = (lego.components || []);
      const rowsC = db.phrases.filter((p) => p.seed_number === lego.seed_number && p.lego_index === lego.lego_index && p.phrase_role === 'component')
        .sort((a, b) => ((a.metadata && a.metadata.component_index) ?? a.position) - ((b.metadata && b.metadata.component_index) ?? b.position));
      if (comps.length !== u.comps.length) why.push(`components: live ${comps.length}, data ${u.comps.length}`);
      else {
        u.newComps = comps.map((c, i) => ({ ...c, known: u.comps[i] === null ? c.known : u.comps[i] }));
        u.compRows = [];
        for (let i = 0; i < comps.length; i++) {
          const row = rowsC.find((r) => nk(r.target_text) === nk(comps[i].target) && nk(r.known_text) === nk(comps[i].known)) ||
            rowsC.find((r) => nk(r.target_text) === nk(comps[i].target));
          if (row && u.comps[i] !== null && u.comps[i] !== row.known_text) { u.compRows.push({ row, to: u.comps[i] }); touched.push(row); }
        }
      }
    }
    u.phraseRows = [];
    for (const [pid, [pf, pt]] of Object.entries(u.phrases)) {
      const row = P.get(pid);
      if (!row) { why.push(`phrase ${pid} not found`); continue; }
      if (row.known_text !== pf) why.push(`${pid} now reads "${row.known_text}", not "${pf}"`);
      u.phraseRows.push({ row, from: pf, to: pt }); touched.push(row);
    }
    const recent = touched.filter((r) => now - new Date(r.updated_at).getTime() < RECENT_MS);
    if (recent.length) why.push(`changed in the last hour: ${recent.map((r) => r.lego_id && !r.phrase_role ? r.lego_id : sid(r.id)).join(', ')} (job #530·V)`);
    u.seed = lego.seed_number; u.lego = lego;
    if (why.length) skipped.push({ ...u, why: why.join('; ') }); else ready.push(u);
  }
  return { ready, skipped };
}

const strictKey = (v) => v.known_norm;
function zutSet(db, overlayLego, overlayPhrase) {
  const legos = db.legos.map((l) => ({ ...l, id: l.lego_id, known_text: overlayLego.has(l.lego_id) ? overlayLego.get(l.lego_id) : l.known_text }));
  const phrases = db.phrases.map((p) => ({ ...p, known_text: overlayPhrase.has(p.id) ? overlayPhrase.get(p.id) : p.known_text }));
  const r = audit.auditRows({ legos, phrases, seeds: db.seeds });
  return new Map(r.bidirectional.violationsStrict.map((v) => [strictKey(v), v]));
}

function overlays(units) {
  const ol = new Map(), op = new Map();
  for (const u of units) {
    ol.set(u.lego_id, u.to);
    for (const c of u.compRows || []) op.set(c.row.id, c.to);
    for (const p of u.phraseRows) op.set(p.row.id, p.to);
  }
  return { ol, op };
}

/** Drop units that open a NEW one-known-two-targets clash, until stable. */
function guardZut(db, units) {
  const before = zutSet(db, new Map(), new Map());
  let live = units.slice(); const held = [];
  for (;;) {
    const { ol, op } = overlays(live);
    const after = zutSet(db, ol, op);
    const bad = [];
    for (const u of live) {
      const knowns = [u.to, ...u.phraseRows.map((p) => p.to)].map(nk);
      const clashes = knowns.filter((k) => after.has(k) && !before.has(k));
      if (clashes.length) bad.push({ u, clashes });
    }
    if (!bad.length) return { live, held, before, after };
    for (const { u, clashes } of bad) {
      const rows = [];
      const lgs = db.legos.map((l) => ({ id: l.lego_id, known: ol.has(l.lego_id) ? ol.get(l.lego_id) : l.known_text, target: l.target_text }));
      const phs = db.phrases.filter((p) => p.phrase_role !== 'component').map((p) => ({ id: sid(p.id), known: op.has(p.id) ? op.get(p.id) : p.known_text, target: p.target_text }));
      for (const r of lgs.concat(phs)) if (clashes.includes(nk(r.known)) && !r.id.startsWith(u.lego_id + 'x')) rows.push(`${r.id} "${r.known}" | ${r.target}`);
      held.push({ ...u, why: 'ZUT: one English, two targets', clashes: [...new Set(rows)].slice(0, 8) });
    }
    const dropIds = new Set(bad.map((b) => b.u.lego_id));
    live = live.filter((u) => !dropIds.has(u.lego_id));
  }
}

/** A unit that turns its LEGO into an exact both-sides copy of an EARLIER LEGO that it was not before. */
function newDuplicates(db, units) {
  const ord = (a, b) => a.seed_number - b.seed_number || a.lego_index - b.lego_index;
  const legos = db.legos.slice().sort(ord);
  const ov = new Map(units.map((u) => [u.lego_id, u.to]));
  const out = [];
  for (const u of units) {
    const me = u.lego;
    const find = (known, usingOverlay) => legos.find((l) => ord(l, me) < 0 && (usingOverlay && ov.has(l.lego_id) ? ov.get(l.lego_id) : l.known_text) === known && l.target_text === me.target_text);
    const after = find(u.to, true);
    if (after && !find(u.from, false)) out.push({ lego: u.lego_id, earlier: after.lego_id, isNew: me.is_new });
  }
  return out;
}

function buildOps(db, units) {
  const ops = [];
  const seedsDone = new Set();
  for (const u of units) {
    const set = { known_text: u.to };
    if (u.newComps) set.components = u.newComps;
    const expect = { known_text: u.from };
    ops.push({ op: 'lego.update', lego_id: u.lego_id, set, expect });
    for (const c of u.compRows || []) ops.push({ op: 'phrase.update', phrase_id: c.row.id, set: { known_text: c.to }, expect: { known_text: c.row.known_text } });
    for (const p of u.phraseRows) ops.push({ op: 'phrase.update', phrase_id: p.row.id, set: { known_text: p.to }, expect: { known_text: p.from } });
    const seed = db.seeds.find((s) => s.seed_number === u.seed);
    if (seed.approved_at && !seedsDone.has(u.seed)) { seedsDone.add(u.seed); ops.push({ op: 'seed.update', seed_number: u.seed, set: { approved_at: null }, expect: { approved_at: new Date(seed.approved_at).toISOString() } }); }
  }
  return ops;
}

async function post(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body), signal: AbortSignal.timeout(180000) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

async function main() {
  const [course, mode, ...rest] = process.argv.slice(2);
  const arg = (n) => { const i = rest.indexOf(n); return i >= 0 ? rest[i + 1] : null; };
  const data = require('./k26-person-pronoun-2026-10-22.data.cjs')[course];
  if (!data) throw new Error('no data for ' + course);
  let apiJson;
  if (arg('--api')) apiJson = JSON.parse(fs.readFileSync(arg('--api'), 'utf8'));
  else { const r = await fetch(`${POPTY}/api/production/${course}/seeds?status=all`, { signal: AbortSignal.timeout(180000) }); apiJson = await r.json(); }
  const db = fromApi(apiJson);
  const now = arg('--now') ? new Date(arg('--now')).getTime() : Date.now();
  const { ready, skipped } = resolve(db, course, data.edits, now);
  const g = guardZut(db, ready);
  const dups = newDuplicates(db, g.live);
  const dupIds = new Set(dups.filter((d) => d.isNew).map((d) => d.lego));
  const dupHeld = g.live.filter((u) => dupIds.has(u.lego_id));
  g.live = g.live.filter((u) => !dupIds.has(u.lego_id));
  const ops = buildOps(db, g.live);
  const nOps = ops.length;
  const report = {
    course, at: new Date(now).toISOString(),
    changed: g.live.map((u) => ({ lego: u.lego_id, seed: u.seed, from: u.from, to: u.to, target: u.lego.target_text, comps: u.comps, phrases: Object.fromEntries(u.phraseRows.map((p) => [sid(p.row.id), [p.from, p.to]])) })),
    held: g.held.map((u) => ({ lego: u.lego_id, seed: u.seed, from: u.from, to: u.to, target: u.lego.target_text, clashes: u.clashes, phrases: Object.fromEntries(u.phraseRows.map((p) => [sid(p.row.id), [p.from, p.to]])) })),
    skipped: skipped.map((u) => ({ lego: u.lego_id, why: u.why })),
    listed: data.listed || {},
    dupHeld: dupHeld.map((u) => ({ lego: u.lego_id, seed: u.seed, from: u.from, to: u.to, target: u.lego.target_text, earlier: dups.find((d) => d.lego === u.lego_id).earlier })),
    zut: { before: g.before.size, after: g.after.size }, nOps,
  };
  if (mode === 'plan') { console.log(JSON.stringify(report, null, 1)); return; }
  const prev = await post(`${POPTY}/api/production/${course}/edit-batch`, { ops });
  console.log(`dry run HTTP ${prev.status} ${JSON.stringify(prev.body).slice(0, 1500)}`);
  if (prev.status !== 200 || process.env.APPLY_CONFIRM !== '1') return;
  const res = await post(`${POPTY}/api/production/${course}/edit-batch`, { ops, apply: true });
  const logFile = path.join(process.env.CS_SCRATCH || '.', `k26-applied-${course}.json`);
  fs.writeFileSync(logFile, JSON.stringify({ report, ops, applied: { status: res.status, body: res.body } }, null, 1));
  console.log(`APPLY HTTP ${res.status}; event ${res.body.event_id}; log ${logFile}`);
}
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
/** K26 as a function: does the known side open by naming a person (a subject pronoun, or a do/have/would-you question)? */
const NAMES_PERSON = /^(i|you|he|she|it|we|they|that|this|there)(\b|['’])|^(do|does|did|have|has|would|will|can|could|should|are|is|was|were) (you|he|she|it|we|they|i)\b/i;
const namesPerson = (known) => NAMES_PERSON.test(String(known || '').trim());

module.exports = { namesPerson, fromApi, resolve, guardZut, newDuplicates, buildOps, expand };
