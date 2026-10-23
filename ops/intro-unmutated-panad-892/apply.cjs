#!/usr/bin/env node
'use strict';
// Aran 2026-10-23 (job #892): "Intros standing on their own should always be in the unmutated form,
// and then the learner gets to discover and practise the mutated form in context."
// Applied to 'banad' in cym_nv2_for_eng: the standalone intro (LEGO, component, and any phrase that
// is the intro alone / begins with it, no trigger) becomes 'panad'; every 'banad' after a trigger
// (wnei di, ges i/gest ti, gawn ni, am, mae 'na, gen i/gan X/gynnyn nhw) stays, and seeds stay.
// Reads both v2 courses IN FULL through Popty (/seeds?status=all), proves every 'banad' row is
// decided, then posts one edit-batch. Dry run unless --apply. Every op carries `expect` on old text.
const fs = require('fs');
const path = require('path');
const BASE = process.env.POPTY_URL || 'http://localhost:3470';
const AGENT = 'aran-watson-892';
const C = 'cym_nv2_for_eng';
const apply = process.argv.includes('--apply');
const out = path.dirname(__filename);

// Every 'banad' row in either course must be listed here (change or stay) or the run aborts.
const CHANGE = {
  'lego:S0274L03': 'intro LEGO, standalone',
  'lego:S1489L02': 'intro LEGO, standalone (+ component banad -> panad)',
  'phrase:S0274L03B01': "begins with the intro, no trigger ('banad o goffi i mi')",
  'phrase:S1489L02C01': 'bare component phrase',
};
const STAY = {
  'seed:274': 'seed sentence (os na wnei di banad)', 'seed:1489': 'seed sentence (os na wnei di banad)',
  'phrase:S0274L03B02': 'ges i +SM', 'phrase:S0274L03B03': 'gest ti +SM', 'phrase:S0274L03B04': 'gest ti +SM',
  'phrase:S0274L03B05': "mae 'na +SM (written 'mae na')", 'phrase:S0274L03B06': 'wnei di +SM',
  'phrase:S0274L04B04': 'wnei di +SM', 'phrase:S0274L04B05': 'wnei di +SM', 'phrase:S0274L05B06': 'wnei di +SM',
  'phrase:S0206L01B02': 'am +SM', 'phrase:S0206L01B06': 'am +SM', 'phrase:S0277L02B04': 'am +SM',
  'phrase:S0281L01B02': 'gest ti +SM', 'phrase:S1489L02B02': 'wnei di +SM', 'phrase:S1489L02B03': 'gawn ni +SM',
  'phrase:S1489L02U01': 'gawn ni +SM', 'phrase:S1489L02U02': 'gynnyn nhw (possessed) +SM',
  'phrase:S1489L02U03': 'gen i (possessed) +SM', 'phrase:S1489L02U04': "gan y fyfyrwraig 'na (possessed) +SM",
  'phrase:S1489L02U05': 'gynnyn nhw (possessed) +SM', 'phrase:S1489L02U06': 'gawn ni +SM',
  'phrase:S1629L01U02': 'gawn ni +SM',
};
const RX = /(^|[^\p{L}])banad([^\p{L}]|$)/iu;
const swap = (t) => t.replace(/(^|[^\p{L}])banad(?=[^\p{L}]|$)/gu, '$1panad');

// The full read is heavy (20+ MB a course); Popty sometimes answers it with an error under load, so
// it is retried, and an answer without seeds is never treated as an empty course.
async function get(c) {
  let last;
  for (let i = 1; i <= 4; i++) {
    try {
      const r = await fetch(`${BASE}/api/production/${c}/seeds?status=all`, { headers: { 'x-agent-id': AGENT } });
      const j = await r.json();
      if (Array.isArray(j.seeds)) return j;
      last = `HTTP ${r.status} ${JSON.stringify(j).slice(0, 300)}`;
    } catch (e) { last = e.message; }
    console.error(`${c}: read ${i} failed: ${last}`);
    await new Promise((res) => setTimeout(res, 20000));
  }
  throw new Error(`${c}: full read failed 4 times: ${last}`);
}

(async () => {
  const coverage = {};
  const ops = []; const changed = []; const unlisted = [];
  for (const c of ['cym_nv2_for_eng', 'cym_sv2_for_eng']) {
    const data = await get(c);
    let legos = 0, phrases = 0, hits = 0;
    if (data.count !== data.seeds.length) throw new Error(`${c}: count ${data.count} != seeds ${data.seeds.length}`);
    const seen = (key) => { hits++; if (c !== C || !(key in CHANGE || key in STAY)) unlisted.push(`${c} ${key}`); return c === C && key in CHANGE; };
    for (const s of data.seeds) {
      if (RX.test(s.target_text)) seen(`seed:${s.seed_number}`);
      for (const l of s.legos) {
        legos++;
        if (RX.test(l.target_text) || RX.test(JSON.stringify(l.components || []))) {
          if (seen(`lego:${l.lego_id}`)) {
            const comps = Array.isArray(l.components) ? l.components.map((k) => ({ ...k, target: swap(k.target) })) : l.components;
            ops.push({ op: 'lego.update', lego_id: l.lego_id, set: { target_text: swap(l.target_text), components: comps },
              expect: { target_text: l.target_text, components: l.components } });
            changed.push({ kind: 'lego', id: l.lego_id, old: l.target_text, new: swap(l.target_text),
              slots: { target1: l.target1_audio_id, target2: l.target2_audio_id, presentation: l.presentation_audio_id } });
          }
        }
        for (const p of l.basket_phrases || []) {
          phrases++;
          if (!RX.test(p.target_text)) continue;
          const short = p.id.split(':')[1];
          if (!seen(`phrase:${short}`)) continue;
          const dec = (p.decomposition || []).map((g) => (g.target && RX.test(g.target) ? { ...g, target: swap(g.target) } : g));
          ops.push({ op: 'phrase.update', phrase_id: p.id, set: { target_text: swap(p.target_text), decomposition: dec },
            expect: { target_text: p.target_text, decomposition: p.decomposition } });
          changed.push({ kind: 'phrase', id: short, old: p.target_text, new: swap(p.target_text),
            slots: { target1: p.target1_audio_id, target2: p.target2_audio_id } });
        }
      }
    }
    coverage[c] = { seeds: data.seeds.length, legos, phrases, banad_rows: hits };
  }
  const expected = Object.keys(CHANGE).length + Object.keys(STAY).length;
  if (unlisted.length) throw new Error(`undecided 'banad' rows: ${unlisted.join(', ')}`);
  if (coverage[C].banad_rows !== expected) throw new Error(`expected ${expected} banad rows in ${C}, read ${coverage[C].banad_rows}`);
  if (ops.length !== Object.keys(CHANGE).length) throw new Error(`expected ${Object.keys(CHANGE).length} ops, built ${ops.length}`);
  fs.writeFileSync(`${out}/${C}.ops.json`, JSON.stringify({ coverage, change: CHANGE, stay: STAY, ops, changed }, null, 1));
  console.log(JSON.stringify(coverage));
  const r = await (await fetch(`${BASE}/api/production/${C}/edit-batch`, { method: 'POST',
    headers: { 'content-type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify({ ops, apply }) })).json();
  fs.writeFileSync(`${out}/${C}.${apply ? 'applied' : 'dryrun'}.json`, JSON.stringify(r, null, 1));
  console.log(JSON.stringify({ ok: r.ok, dryRun: r.dryRun, applied: r.applied, error: r.error, undo_file: r.undo_file }));
  for (const x of r.results || []) {
    const a = x.after || {}, b = x.before || {};
    console.log(x.op, b.lego_id || b.id, JSON.stringify(b.target_text), '->', JSON.stringify(a.target_text),
      ['target1_audio_id', 'target2_audio_id', 'presentation_audio_id'].map((k) => `${k.split('_')[0]}:${b[k] ? 'take' : '-'}=>${a[k] ? (a[k] === b[k] ? 'same' : 'NEW') : '-'}`).join(' '));
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
