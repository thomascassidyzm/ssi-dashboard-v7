#!/usr/bin/env node
'use strict';
// tools/course-optimization/pdc-american-sweep-497.cjs — pdc_for_eng seeds 1-300 export prep (job #497, Kai 27 Oct 2026).
//
// Two sweeps, one Popty edit-batch, planned OFFLINE from a dump made by course-dump-readonly-2026-10-14.cjs:
//   1. The known side is AMERICAN English: practise→practice, learnt→learned, rubbish→trash, film→movie (the target already
//      says Movie / Football), "at the weekend"→"on the weekend". Words were found by reading the course's whole known-side
//      vocabulary (484 distinct words); the table below is the whole list, nothing is inferred by regex beyond these words.
//      A change to a LEGO is carried into its components, its phrases (every role) and a phrase's decomposition JSON.
//   2. Questions end in "?" on BOTH sides. The phrase ids below were read one by one (build rows lacked the mark that use rows
//      carry); ADD_QMARK_RE only selects candidates, QMARK_EXTRA are questions it cannot see, QMARK_NOT are clauses it must skip.
// Every touched seed is unapproved (edits unapprove their seeds). Held, NOT touched: S0053L01 (needs a reorder), S0075L01
// "have you got" family, fragment seeds 3 4 164 259 264 265 275 286 (punctuation is a style call).
//
//   node …/pdc-american-sweep-497.cjs plan  <dump.json>          # counts + before/after listing
//   node …/pdc-american-sweep-497.cjs dry   <dump.json>          # edit-batch dry run
//   APPLY_CONFIRM=1 node … apply <dump.json>                     # apply, writes the undo to $LOG_DIR
const fs = require('fs');
const path = require('path');
const COURSE = 'pdc_for_eng';
const AGENT = 'pdc-american-sweep (job #497)';
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const MAX_SEED = 300;
const HELD_LEGOS = new Set(['S0053L01']);

const US = [[/\bpractise\b/g, 'practice'], [/\blearnt\b/g, 'learned'], [/\brubbish\b/g, 'trash'], [/\bfilm\b/g, 'movie'], [/\bat the weekend\b/g, 'on the weekend']];
const americanise = (t) => (t == null ? t : US.reduce((s, [re, to]) => s.replace(re, to), t));

const AUX = "do|does|did|can|could|will|would|should|is|are|was|were|have|has|am|shall|may|isn't|don't|doesn't|didn't|aren't|wasn't|won't|can't|couldn't|wouldn't|haven't|hasn't";
const SUBJ = 'you|i|we|he|she|they|it|there|this|that|the|my|your|his|her|our|everyone|anyone|someone|nobody|people|these|those|a|an';
const ADD_QMARK_RE = new RegExp(`^(?:(?:who|what|when|where|why|how(?: long| much| many| often| far| old)?|which \\w+)\\s+)?(?:${AUX})\\s+(?:${SUBJ})\\b|^(?:who|what|which)\\s+(?:is|are|was|were|did|does|do)\\b`, 'i');
const QMARK_NOT = new Set(['what is going to', 'what are going to']);
const QMARK_EXTRA = new Set(['S0174L02U02', 'S0258L01U05', 'S0283L01B01', 'S0283L01U03', 'S0283L01U04', 'S0283L02B01', 'S0283L02B02', 'S0283L02U01', 'S0283L02U02',
  'S0283L02U03', 'S0283L02U05', 'S0283L03U01', 'S0283L03U02', 'S0283L03U05', 'S0283L04U04']);
const sid = (id) => String(id).split(':').pop();
const isQuestionRow = (p) => p.phrase_role !== 'component' && !/\?\s*$/.test(p.known_text) && !QMARK_NOT.has(p.known_text.toLowerCase()) && (ADD_QMARK_RE.test(p.known_text) || QMARK_EXTRA.has(sid(p.id)));
const withQ = (t) => `${String(t).replace(/\s+$/, '')}?`;

function plan(db) {
  const ops = [], changes = [], seeds = new Set();
  const note = (kind, id, seed, fromK, toK, fromT, toT) => { changes.push({ kind, id, seed, fromK, toK, fromT, toT }); seeds.add(seed); };
  for (const s of db.seeds) if (s.seed_number <= MAX_SEED) {
    const k = americanise(s.known_text);
    if (k !== s.known_text) { ops.push({ op: 'seed.update', seed_number: s.seed_number, set: { known_text: k }, expect: { known_text: s.known_text } }); note('seed', `S${String(s.seed_number).padStart(4, '0')}`, s.seed_number, s.known_text, k); }
  }
  for (const l of db.legos) if (l.seed_number <= MAX_SEED && !HELD_LEGOS.has(l.lego_id)) {
    const k = americanise(l.known_text);
    const comps = l.components ? JSON.parse(americanise(JSON.stringify(l.components)).replace(/"known":"at"(?=[^}]*"target":"am")/, '"known":"on"')) : l.components;
    const compsChanged = JSON.stringify(comps) !== JSON.stringify(l.components);
    if (k !== l.known_text || compsChanged) {
      const set = {}; if (k !== l.known_text) set.known_text = k; if (compsChanged) set.components = comps;
      ops.push({ op: 'lego.update', lego_id: l.lego_id, set, expect: { known_text: l.known_text } });
      note('lego', l.lego_id, l.seed_number, l.known_text, k);
    }
  }
  for (const p of db.phrases) if (p.seed_number <= MAX_SEED && !HELD_LEGOS.has(`S${String(p.seed_number).padStart(4, '0')}L${String(p.lego_index).padStart(2, '0')}`)) {
    let k = americanise(p.known_text), t = p.target_text;
    if (isQuestionRow(p)) { k = withQ(k); t = /\?\s*$/.test(t) ? t : withQ(t); }
    if (/^Woman\.$/.test(k)) k = 'woman';
    const set = {};
    if (k !== p.known_text) set.known_text = k;
    if (t !== p.target_text) set.target_text = t;
    if (p.decomposition) { const d2 = americanise(JSON.stringify(p.decomposition)); if (d2 !== JSON.stringify(p.decomposition)) set.decomposition = JSON.parse(d2); }
    if (!Object.keys(set).length) continue;
    ops.push({ op: 'phrase.update', phrase_id: p.id, set, expect: { known_text: p.known_text, target_text: p.target_text } });
    note('phrase', sid(p.id), p.seed_number, p.known_text, k, p.target_text, t);
  }
  for (const n of [...seeds].sort((a, b) => a - b)) ops.push({ op: 'seed.update', seed_number: n, set: { approved_at: null } });
  return { ops, changes, seeds: [...seeds].sort((a, b) => a - b) };
}

async function post(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body), signal: AbortSignal.timeout(300000) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

async function main() {
  const [mode, file] = process.argv.slice(2);
  const p = plan(JSON.parse(fs.readFileSync(file, 'utf8')));
  const by = {}; for (const c of p.changes) by[c.kind] = (by[c.kind] || 0) + 1;
  console.log(`plan: ${p.ops.length} ops; changes ${JSON.stringify(by)}; ${p.seeds.length} seeds unapproved`);
  if (mode === 'plan') { fs.writeFileSync(path.join(process.env.CS_SCRATCH || '.', 'pdc-plan.json'), JSON.stringify(p)); return; }
  const apply = mode === 'apply' && process.env.APPLY_CONFIRM === '1';
  // Popty's API restarts every few minutes on this host, and one 873-op request outlives that; so one request per ~100 ops, grouped
  // by seed (a seed's unapprove goes with its edits). Every op carries an `expect`, so a chunk re-posted after a dropped
  // connection is refused as drift if it had in fact applied — never applied twice. A chunk that did not apply is retried.
  const log = [];
  for (const [i, ops] of chunks(p.ops).entries()) {
    let res;
    for (let attempt = 1; attempt <= 6; attempt++) {
      try { res = await post(`${POPTY}/api/production/${COURSE}/edit-batch`, { ops, ...(apply ? { apply: true } : {}) }); break; }
      catch (e) { console.log(`chunk ${i} attempt ${attempt}: ${e.cause?.code || e.message}`); await new Promise((r) => setTimeout(r, 15000)); }
    }
    console.log(`${apply ? 'APPLY' : 'dry run'} chunk ${i} (${ops.length} ops) HTTP ${res?.status} ${res?.body?.ok === true ? 'ok event ' + res.body.event_id : JSON.stringify(res?.body).slice(0, 500)}`);
    log.push({ chunk: i, status: res?.status, event_id: res?.body?.event_id, undo: res?.body?.undo_ops || res?.body?.undo });
    if (!res || res.status !== 200) { console.log('stopping: chunk failed'); break; }
  }
  if (apply) fs.writeFileSync(path.join(process.env.LOG_DIR || process.cwd(), `pdc-american-sweep-applied-${Date.now()}.json`), JSON.stringify({ log, changes: p.changes }, null, 1));
}

const opSeed = (o) => o.seed_number ?? Number((o.phrase_id || o.lego_id).split(':').pop().slice(1, 5));
function chunks(ops, size = 100) {
  const bySeed = new Map();
  for (const o of ops) { const k = opSeed(o); if (!bySeed.has(k)) bySeed.set(k, []); bySeed.get(k).push(o); }
  const out = []; let cur = [];
  for (const [, g] of [...bySeed.entries()].sort((a, b) => a[0] - b[0])) { if (cur.length && cur.length + g.length > size) { out.push(cur); cur = []; } cur.push(...g); }
  if (cur.length) out.push(cur);
  return out;
}
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { americanise, isQuestionRow, plan, chunks };
