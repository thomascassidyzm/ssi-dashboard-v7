#!/usr/bin/env node
'use strict';
// Aran 2026-10-28 (job #919): 'am hirach' -> 'am yn hirach' in cym_nv2_for_eng and cym_sv2_for_eng,
// every Welsh field (seed, LEGO, components, phrase target_text + decomposition). Word-boundary match.
// Reads each course in FULL through Popty, builds ops, flags exceptions (LEGO that IS the phrase, or a
// component boundary that splits it) for Aran instead of editing them. Dry run unless --apply.
const fs = require('fs');
const BASE = 'http://localhost:3470';
const AGENT = 'aran-watson-919';
const apply = process.argv.includes('--apply');
const out = __dirname;
const RX = /(^|[^\p{L}])am hirach(?=[^\p{L}]|$)/iu;
const swap = (t) => t.replace(/(^|[^\p{L}])(am) (hirach)(?=[^\p{L}]|$)/giu, '$1$2 yn $3');
const H = { 'x-agent-id': AGENT };
const note = (m) => { fs.appendFileSync(`${out}/progress.txt`, `${new Date().toISOString()} ${m}\n`); console.log(m); };
const tfetch = (u, o = {}) => fetch(u, { ...o, signal: AbortSignal.timeout(120000) });
// Phrase decomposition: if swapping inside the groups leaves them not tiling the new text (am | hirach split across groups), put the yn into the group that starts ' hirach'.
const tile = (dec, text) => dec.map((g) => g.target).join('') === text;
const fixDec = (dec, text) => {
  if (tile(dec, text)) return dec;
  const i = dec.findIndex((g) => /^\s*hirach/i.test(g.target || ''));
  if (i > 0) { const d2 = dec.map((g, k) => (k === i ? { ...g, target: g.target.replace(/^(\s*)(hirach)/i, '$1yn $2') } : g)); if (tile(d2, text)) return d2; }
  return null;
};
async function get(c) {
  let last;
  for (let i = 1; i <= 4; i++) {
    try {
      const j = await (await tfetch(`${BASE}/api/production/${c}/seeds?status=all`, { headers: H })).json();
      if (Array.isArray(j.seeds) && j.count === j.seeds.length) return j;
      last = JSON.stringify(j).slice(0, 200);
    } catch (e) { last = e.message; }
    await new Promise((r) => setTimeout(r, 20000));
  }
  throw new Error(`${c}: read failed ${last}`);
}
(async () => {
  const summary = {}; const exceptions = [];
  for (const c of ['cym_nv2_for_eng', 'cym_sv2_for_eng']) {
    note(`${c}: reading`); const data = await get(c); note(`${c}: read ${data.seeds.length} seeds`);
    const ops = []; const changed = []; const cnt = { seeds: data.seeds.length, seed: 0, lego: 0, phrase: 0 };
    for (const s of data.seeds) {
      if (RX.test(s.target_text)) {
        cnt.seed++;
        ops.push({ op: 'seed.update', seed_number: s.seed_number, set: { target_text: swap(s.target_text) }, expect: { target_text: s.target_text } });
        changed.push({ kind: 'seed', id: s.seed_number, old: s.target_text, new: swap(s.target_text), slots: { t1: s.target1_audio_id, t2: s.target2_audio_id } });
      }
      for (const l of s.legos) {
        const comps = Array.isArray(l.components) ? l.components : [];
        const inT = RX.test(l.target_text), inC = RX.test(JSON.stringify(comps));
        if (inT || inC) {
          const bare = l.target_text.trim().toLowerCase() === 'am hirach';
          const split = inT && comps.length && !comps.some((k) => k.target && RX.test(k.target));
          if (bare || split || (inC && !inT)) { exceptions.push({ course: c, lego: l.lego_id, target: l.target_text, components: comps, why: bare ? 'LEGO is literally the phrase' : 'component boundary splits/mismatches the phrase' }); }
          else {
            cnt.lego++;
            const nc = comps.map((k) => ({ ...k, target: k.target ? swap(k.target) : k.target }));
            ops.push({ op: 'lego.update', lego_id: l.lego_id, set: { target_text: swap(l.target_text), components: nc }, expect: { target_text: l.target_text, components: l.components } });
            changed.push({ kind: 'lego', id: l.lego_id, old: l.target_text, new: swap(l.target_text), slots: { t1: l.target1_audio_id, t2: l.target2_audio_id, pres: l.presentation_audio_id } });
          }
        }
        for (const p of l.basket_phrases || []) {
          if (!RX.test(p.target_text) && !RX.test(JSON.stringify(p.decomposition || []))) continue;
          cnt.phrase++;
          let dec = (p.decomposition || []).map((g) => (g.target && RX.test(g.target) ? { ...g, target: swap(g.target) } : g));
          if (Array.isArray(p.decomposition) && p.decomposition.length) { const f = fixDec(dec, swap(p.target_text)); if (!f) { exceptions.push({ course: c, phrase: p.id, target: p.target_text, why: 'phrase decomposition cannot be re-tiled' }); continue; } dec = f; }
          ops.push({ op: 'phrase.update', phrase_id: p.id, set: { target_text: swap(p.target_text), decomposition: dec }, expect: { target_text: p.target_text, decomposition: p.decomposition } });
          changed.push({ kind: 'phrase', id: p.id, old: p.target_text, new: swap(p.target_text), slots: { t1: p.target1_audio_id, t2: p.target2_audio_id } });
        }
      }
    }
    summary[c] = cnt; note(`${c}: ${JSON.stringify(cnt)} ops=${ops.length}`);
    fs.writeFileSync(`${out}/${c}.ops.json`, JSON.stringify({ cnt, ops, changed }, null, 1));
    if (!ops.length) continue;
    const r = await (await tfetch(`${BASE}/api/production/${c}/edit-batch`, { method: 'POST', headers: { ...H, 'content-type': 'application/json' }, body: JSON.stringify({ ops, apply }) })).json();
    fs.writeFileSync(`${out}/${c}.${apply ? 'applied' : 'dryrun'}.json`, JSON.stringify(r, null, 1));
    note(`${c}: ${apply ? 'APPLY' : 'DRYRUN'} done`); console.log(c, JSON.stringify({ ok: r.ok, dryRun: r.dryRun, applied: r.applied, error: r.error, undo_file: r.undo_file, ops: ops.length }));
  }
  fs.writeFileSync(`${out}/exceptions.json`, JSON.stringify(exceptions, null, 1));
  console.log(JSON.stringify(summary), 'exceptions', exceptions.length);
})().catch((e) => { console.error(e.message); process.exit(1); });
