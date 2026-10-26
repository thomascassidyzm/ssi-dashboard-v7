#!/usr/bin/env node
'use strict';
// Job #71 (Aran 2026-10-26): Welsh edits in cym_nv2/cym_sv2_for_eng, through Popty edit-batch only.
//   node apply.cjs A|B|C [--apply]     (dry run unless --apply; plan/dryrun/applied files land next to this script)
//   A  'at lle' -> 'at le' (soft mutation after 'at'); spoken words change -> plain row update, Popty unlinks the clip -> Re-record card.
//   B  'dorri o' -> 'dorri fo' (also "dorri o'n"); TEXT-ONLY: clip text relabelled first, then the row, takes kept (as #952: the RELABEL planner).
//   C  'grêt' -> 'bendigedig' / 'fendigedig' by context (rules in cMutation below); spoken words change -> Re-record.
// A hit whose context the rules cannot place stops the run (HOLD) rather than guessing.
const fs = require('fs');
const BASE = process.env.POPTY_URL || 'http://localhost:3470';
const EDIT = process.argv[2];
const AGENT = 'aran-watson-71';
const apply = process.argv.includes('--apply');
const out = __dirname;
const COURSES = ['cym_nv2_for_eng', 'cym_sv2_for_eng'];
const L = '\\p{L}';

// ---- per-edit finders: text -> [{s,e,rep,why}] on that text; throws on a context it cannot place ----
const cap = (from, to) => (from[0] !== from[0].toLowerCase() ? to[0].toUpperCase() + to.slice(1) : to);
function findA(t) {
  const r = []; const rx = new RegExp(`(^|[^${L}])(at\\s+)(lle)(?![${L}])`, 'giu'); let m;
  while ((m = rx.exec(t))) { const s = m.index + m[1].length + m[2].length; r.push({ s, e: s + 3, rep: cap(m[3], 'le'), why: 'soft mutation after at' }); }
  return r;
}
function findB(t) {
  const r = []; const rx = new RegExp(`(^|[^${L}])(dorri\\s+)(o)(?![${L}])`, 'giu'); let m;
  while ((m = rx.exec(t))) { const s = m.index + m[1].length + m[2].length; r.push({ s, e: s + 1, rep: cap(m[3], 'fo'), why: 'dorri fo (as recorded)' }); }
  return r;
}
// Mutation of the word that follows each context (Aran's rule: standalone / utterance-initial / after masculine noun = unmutated).
function cMutation(before) {
  const b = before.replace(/\s+$/, '');
  if (!b || /[,.?!;:–—]$/.test(b)) return ['bendigedig', 'utterance/phrase-initial: unmutated'];
  if (/[’']n$/.test(b)) return ['fendigedig', "predicative 'n: soft"];
  if (/(^|\s)(yn\s+)?(gwbl|hollol|reit|mor)$/i.test(b)) return ['fendigedig', `after ${b.split(/\s+/).pop()}: soft`];
  if (/(^|\s)(siop|botel)$/i.test(b)) return ['fendigedig', `after feminine noun ${b.split(/\s+/).pop()}: soft`];
  if (/(^|\s)(tŷ|llwybr)$/i.test(b)) return ['bendigedig', `after masculine noun ${b.split(/\s+/).pop()}: unmutated`];
  throw new Error(`HOLD: cannot place context "...${b.slice(-30)}" before grêt`);
}
function findC(t) {
  const r = []; const rx = new RegExp(`(?<![${L}])(gr[eêé]t)(?![${L}])`, 'giu'); let m;
  while ((m = rx.exec(t))) { const [to, why] = cMutation(t.slice(0, m.index)); r.push({ s: m.index, e: m.index + m[1].length, rep: cap(m[1], to), why }); }
  return r;
}
const FIND = { A: findA, B: findB, C: findC }[EDIT];
if (!FIND) { console.error('usage: apply.cjs A|B|C [--apply]'); process.exit(1); }

const fix = (t) => { let o = t; for (const x of FIND(t).sort((a, b) => b.s - a.s)) o = o.slice(0, x.s) + x.rep + o.slice(x.e); return o; };
const hit = (t) => !!t && FIND(t).length > 0;
const whyOf = (t) => FIND(t).map((x) => `${t.slice(x.s, x.e)}→${x.rep} (${x.why})`).join('; ');
// decomposition segments carry the words: apply the joined-text edits at the right segment, refusing one that straddles a segment edge
function fixDecomp(dec) {
  if (!dec) return dec;
  const segs = dec.map((x) => x.target || ''); const joined = segs.join('');
  const edits = FIND(joined); if (!edits.length) return dec;
  const nd = JSON.parse(JSON.stringify(dec)); let off = 0; const starts = segs.map((s) => { const o = off; off += s.length; return o; });
  for (const e of edits.sort((a, b) => b.s - a.s)) {
    const i = starts.findIndex((st, k) => e.s >= st && e.e <= st + segs[k].length);
    if (i < 0) throw new Error('HOLD: edit straddles decomposition segments: ' + JSON.stringify(segs));
    const rel = e.s - starts[i]; nd[i].target = nd[i].target.slice(0, rel) + e.rep + nd[i].target.slice(rel + (e.e - e.s));
  }
  if (nd.map((x) => x.target || '').join('') !== fix(joined)) throw new Error('decomposition rebuild mismatch');
  return nd;
}
const audio = (r) => ({ known: r.known_audio_id, target1: r.target1_audio_id, target2: r.target2_audio_id });
const get = async (c) => (await fetch(`${BASE}/api/production/${c}/seeds?status=all`, { headers: { 'x-agent-id': AGENT } })).json();
const post = async (c, body) => (await fetch(`${BASE}/api/production/${c}/edit-batch`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body) })).json();

(async () => {
  for (const course of COURSES) {
    const data = await get(course);
    const chg = [], decomp = new Map(), table = [];
    const note = (kind, id, a, b, known, au) => table.push({ kind, id, old: a, new: b, why: whyOf(a), known, takes: au ? [au.target1_audio_id, au.target2_audio_id].filter(Boolean).length : 0 });
    for (const s of data.seeds) {
      if (hit(s.target_text)) { chg.push({ kind: 'seed', id: s.seed_number, known: s.known_text, target: s.target_text, newKnown: null, newTarget: fix(s.target_text), audio: audio(s) }); note('seed', s.seed_number, s.target_text, fix(s.target_text), s.known_text, s); }
      for (const l of s.legos) {
        if (l.is_new && hit(l.target_text)) { chg.push({ kind: 'lego', id: l.lego_id, known: l.known_text, target: l.target_text, newKnown: null, newTarget: fix(l.target_text), audio: audio(l) }); note('lego', l.lego_id, l.target_text, fix(l.target_text), l.known_text, l); }
        (l.components || []).forEach((k, i) => { if (l.is_new && hit(k.target)) { chg.push({ kind: 'lego_component', lego_id: l.lego_id, index: i, newTarget: fix(k.target), old: k.target }); note('comp', `${l.lego_id}#${i}`, k.target, fix(k.target), k.known, null); } });
        for (const p of l.basket_phrases || []) {
          const dh = (p.decomposition || []).some((x) => hit(x.target));
          if (!hit(p.target_text)) { if (dh) throw new Error('HOLD: decomposition hit without text hit ' + p.id); continue; }
          if (p.display_tiling && hit(JSON.stringify(p.display_tiling))) throw new Error('HOLD: display_tiling carries the word ' + p.id);
          chg.push({ kind: 'phrase', id: p.id, known: p.known_text, target: p.target_text, newKnown: null, newTarget: fix(p.target_text), audio: audio(p) });
          note('phrase', p.id, p.target_text, fix(p.target_text), p.known_text, p); decomp.set(p.id, p.decomposition);
        }
      }
    }
    console.log(course, 'rows to change', chg.length);
    fs.writeFileSync(`${out}/${EDIT}.${course}.table.json`, JSON.stringify(table, null, 1));
    if (!chg.length) continue;
    let ops;
    if (EDIT === 'B') {
      const { buildOps, clipRefs, probeClips, linksKept } = require('../../tools/course-optimization/welsh-question-marks-apply.cjs');
      const ids = new Set();
      for (const c of chg) if (c.kind !== 'lego_component') for (const s of ['target1', 'target2']) if (c.audio[s]) ids.add(c.audio[s]);
      const { found, unknown } = ids.size ? await probeClips([...ids], [course]) : { found: new Map(), unknown: [] };
      if (unknown.length) throw new Error(`${course}: clips not in course: ${unknown}`);
      const plan = buildOps(course, data, chg, found, clipRefs([data]));
      for (const op of plan.ops) if (op.op === 'phrase.update' && decomp.has(op.phrase_id)) { const dec = decomp.get(op.phrase_id) || []; const nd = fixDecomp(dec); if (nd !== dec) { op.set.decomposition = nd; op.expect.decomposition = dec; } }
      fs.writeFileSync(`${out}/${EDIT}.${course}.plan.json`, JSON.stringify({ chg, plan, clips: [...found.values()] }, null, 1));
      console.log(course, JSON.stringify({ rows: plan.rowCount, relabel: plan.relabelCount, relink: plan.relinkCount, holds: plan.holds }), 'ops', plan.ops.length);
      if (plan.holds.length) { console.error('HOLDS — stopping'); process.exit(3); }
      ops = plan.ops; var kept = linksKept;
    } else {
      ops = [];
      for (const s of data.seeds) {
        if (hit(s.target_text)) ops.push({ op: 'seed.update', seed_number: s.seed_number, set: { target_text: fix(s.target_text) }, expect: { target_text: s.target_text } });
        for (const l of s.legos) {
          const compHit = (l.components || []).some((k) => hit(k.target));
          if (l.is_new && (hit(l.target_text) || compHit)) ops.push({ op: 'lego.update', lego_id: l.lego_id, set: { target_text: fix(l.target_text), components: (l.components || []).map((k) => ({ ...k, target: fix(k.target) })) }, expect: { target_text: l.target_text, components: l.components } });
          for (const p of l.basket_phrases || []) if (hit(p.target_text)) ops.push({ op: 'phrase.update', phrase_id: p.id, set: { target_text: fix(p.target_text), decomposition: fixDecomp(p.decomposition) }, expect: { target_text: p.target_text, decomposition: p.decomposition } });
        }
      }
    }
    fs.writeFileSync(`${out}/${EDIT}.${course}.ops.json`, JSON.stringify(ops, null, 1));
    const res = await post(course, { ops, apply });
    fs.writeFileSync(`${out}/${EDIT}.${course}.${apply ? 'applied' : 'dryrun'}.json`, JSON.stringify(res, null, 1));
    if (!res.ok) { console.error('REFUSED', JSON.stringify(res).slice(0, 1200)); process.exit(1); }
    console.log(JSON.stringify({ ops: ops.length, ok: res.ok, applied: res.applied, undo_file: res.undo_file || null }));
    if (EDIT === 'B') { const lost = kept(res.results); console.log('linksLost', lost.length); if (lost.length) { console.error('LINKS LOST', JSON.stringify(lost)); process.exit(2); } }
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
