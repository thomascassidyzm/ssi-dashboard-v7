#!/usr/bin/env node
'use strict';
// kor_for_eng #565: the REAL course-builder gates (tools/phrase-gate/gate-check.cjs = seed-complete's gates replayed) over every
// LEGO this pass changes, run on the course as it is and as it would be, from the Popty seeds dump — NO database connection:
// the gate library only needs a supabase-shaped reader, and this file hands it one backed by the dump (in memory).
// A gate is reported as a REGRESSION if it passed before and fails after, OR if it failed before and fails with MORE offending rows
// after (counted per basket by failCount: a worsened existing failure must not slip through); failures already there are listed apart.
//   node …gate.cjs <seeds.json> [--seeds 74,83]
const fs = require('fs');
const { plan } = require('./kor-lego-follow-seed-565-2026-10-29.cjs');
const { fromApi } = require('./spa-close-read-153-200-2026-10-27.cjs');
const G = require('../phrase-gate/gate-check.cjs');
const COURSE = 'kor_for_eng';

/** A supabase-shaped read-only reader over in-memory tables (only the calls the gate library makes). */
function fakeSupabase(tables) {
  const from = (name) => {
    let rows = tables[name] || [];
    let single = false;
    const q = {
      select() { return q; },
      eq(c, v) { rows = rows.filter((r) => r[c] === v); return q; },
      in(c, vs) { rows = rows.filter((r) => vs.includes(r[c])); return q; },
      lt(c, v) { rows = rows.filter((r) => r[c] < v); return q; },
      lte(c, v) { rows = rows.filter((r) => r[c] <= v); return q; },
      not(c, op, v) { if (op === 'is') rows = rows.filter((r) => (v === null ? r[c] !== null && r[c] !== undefined : r[c] !== v)); return q; },
      order(c) { rows = [...rows].sort((a, b) => (a[c] > b[c] ? 1 : a[c] < b[c] ? -1 : 0)); return q; },
      range(a, b) { rows = rows.slice(a, b + 1); return q; },
      limit(n) { rows = rows.slice(0, n); return q; },
      maybeSingle() { single = true; return q; },
      then(res, rej) { return Promise.resolve({ data: single ? rows[0] || null : rows, error: null }).then(res, rej); },
    };
    return q;
  };
  return { from };
}

function applyPlan(db, p) {
  const legoSet = new Map(p.legoGo.map((g) => [g.lid, g.after]));
  const phrSet = new Map([...p.phraseGo.map((g) => [g.id, g.set]), ...p.compGo.filter(([, e]) => !e.del).map(([id, e]) => [id, e.set])]);
  const gone = new Set([...p.compGo.filter(([, e]) => e.del).map(([id]) => id), ...(p.delGo || []).map((g) => g.id)]);
  const sid = (x) => String(x).split(':').pop();
  return {
    seeds: db.seeds,
    legos: db.legos.map((l) => (legoSet.has(l.lego_id) ? { ...l, ...legoSet.get(l.lego_id) } : l)),
    phrases: db.phrases.filter((x) => !gone.has(sid(x.id))).map((x) => (phrSet.has(sid(x.id)) ? { ...x, ...phrSet.get(sid(x.id)) } : x)),
  };
}

/** How many rows/items one failing gate result is complaining about (the number the gate itself reports; 1 when it reports none). */
function failCount(g) {
  if (!g || g.pass !== false) return 0;
  for (const v of [g.total, g.failing, g.dropped]) if (Number.isFinite(v)) return v;
  if (Array.isArray(g.rejects)) return g.rejects.length || 1;
  return 1;
}
/** Gates that are worse after than before, per basket: newly failing, or failing with a higher count. */
function worsened(b, a) {
  const out = [];
  for (const name of a.failingGates) {
    const [cb, ca] = [failCount(b.gates[name]), failCount(a.gates[name])];
    if (ca > cb) out.push({ gate: name, before: cb, after: ca });
  }
  return out;
}

async function gateLego(d, lid, seedTarget) {
  const sb = fakeSupabase({ course_seeds: d.seeds, course_legos: d.legos, course_practice_phrases: d.phrases });
  const ctx = G.makeCourseCtx(sb, COURSE);
  const l = d.legos.find((x) => x.lego_id === lid);
  const basket = d.phrases.filter((x) => String(x.id).split(':').pop().startsWith(lid) && x.phrase_role !== 'component');
  return G.checkPhraseSet({
    courseCode: COURSE, seedNumber: l.seed_number, legoIndex: l.lego_index, legoId: lid, legoKnown: l.known_text, legoTarget: l.target_text,
    components: l.components || undefined, seedTarget,
    phrases: basket.map((x) => ({ role: x.phrase_role, known: x.known_text, target: x.target_text })),
  }, ctx);
}

async function runGates(db, p) {
  const after = applyPlan(db, p);
  const seedBy = new Map(db.seeds.map((s) => [s.seed_number, s.target_text]));
  const out = [];
  for (const g of p.legoGo) {
    const l = g.before;
    const [b, a] = [await gateLego(db, g.lid, seedBy.get(l.seed_number)), await gateLego(after, g.lid, seedBy.get(l.seed_number))];
    const w = worsened(b, a);
    const regress = w.map((x) => x.gate);
    out.push({ lego: g.lid, seed: l.seed_number, before: b.failingGates, after: a.failingGates, counts: Object.fromEntries(a.failingGates.concat(b.failingGates).map((x) => [x, [failCount(b.gates[x]), failCount(a.gates[x])]])), worsened: w, regress, detail: w.map((x) => ({ ...x, ...a.gates[x.gate] })), afterDetail: Object.fromEntries(a.failingGates.map((x) => [x, a.gates[x]])) });
  }
  return out;
}
module.exports = { runGates, fakeSupabase, applyPlan, failCount, worsened };

if (require.main === module) {
  const args = process.argv.slice(2);
  const only = args.includes('--seeds') ? args[args.indexOf('--seeds') + 1].split(',').map(Number) : null;
  const db = fromApi(JSON.parse(fs.readFileSync(args[0], 'utf8')));
  const p = plan(db, { only });
  runGates(db, p).then((r) => {
    for (const x of r) console.log(`${x.lego} (seed ${x.seed}) before[${x.before.map((g) => g + ':' + x.counts[g][0])}] after[${x.after.map((g) => g + ':' + x.counts[g][1])}] ${x.regress.length ? 'REGRESS ' + JSON.stringify(x.detail).slice(0, 600) : 'no regression'}`);
    if (process.env.GATE_OUT) fs.writeFileSync(process.env.GATE_OUT, JSON.stringify(r, null, 2));
    console.log(`gates: ${r.length} LEGOs, ${r.filter((x) => x.regress.length).length} with a regression`);
  });
}
