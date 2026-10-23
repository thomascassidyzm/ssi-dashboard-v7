#!/usr/bin/env node
'use strict';
// Aran 2026-10-23 (job #926), items 1 and 2, cym_nv2_for_eng. Popty edit-batch only; dry run unless --apply.
//  (1) soft mutation after the feminine article: "y problem" / "’r problem" -> "y broblem" / "’r broblem"
//      (seed 264 + the phrases carrying it). LEGO S0264L02 'problem' stays unmutated (intros stand unmutated);
//      the surface form lives in the phrase segment tagged with no LEGO, as before.
//      NOT touched, listed for Aran: 'yr un problem', 'dim problem', 'deg problem bosib', 'cael/isio/ffeindio/ystyried problem'.
//  (2) English 'the the first part' -> 'the first part' (known side only, text-only): the clip is relabelled FIRST,
//      then the row, in the same batch, so the take stays linked (text-only-fix pattern, #280). These known clips belong to the
//      legacy course, so they are not relabelled: the row is edited, then audio.link puts the same clip back (allow_text_mismatch).
const fs = require('fs');
const path = require('path');
const BASE = process.env.POPTY_URL || 'http://localhost:3470';
const AGENT = 'aran-watson-926';
const C = 'cym_nv2_for_eng';
const apply = process.argv.includes('--apply');
const out = path.dirname(__filename);
const RX = /(\by|’r) problem/g;
const KNOWN_FIX = ['S0277L03B01', 'S0277L03B02', 'S0277L03B04', 'S0278L02B01'];
const join = (d) => d.map((s) => s.target).join('');

(async () => {
  const data = await (await fetch(`${BASE}/api/production/${C}/seeds?status=all`, { headers: { 'x-agent-id': AGENT } })).json();
  if (!Array.isArray(data.seeds)) throw new Error('read failed');
  const phr = new Map(); const clipUse = new Map();
  const use = (id, who) => { if (id) clipUse.set(id, [...(clipUse.get(id) || []), who]); };
  for (const s of data.seeds) {
    use(s.known_audio_id, `seed${s.seed_number}`);
    for (const l of s.legos) { use(l.known_audio_id, l.lego_id); for (const p of l.basket_phrases || []) { phr.set(p.id.split(':')[1], p); use(p.known_audio_id, p.id); } }
  }
  const ops = []; const log = [];
  // item 1
  for (const s of data.seeds) {
    if (RX.test(s.target_text)) {
      RX.lastIndex = 0;
      const nt = s.target_text.replace(RX, '$1 broblem');
      ops.push({ op: 'seed.update', seed_number: s.seed_number, set: { target_text: nt }, expect: { target_text: s.target_text } });
      log.push({ item: 1, row: `seed ${s.seed_number}`, old: s.target_text, new: nt });
    }
    RX.lastIndex = 0;
    for (const l of s.legos) for (const p of l.basket_phrases || []) {
      RX.lastIndex = 0;
      if (!RX.test(p.target_text)) continue;
      RX.lastIndex = 0;
      const nt = p.target_text.replace(RX, '$1 broblem');
      const dec = p.decomposition.map((x, i) => (x.legoId === null && /^ ?problem$/.test(x.target) ? { ...x, target: x.target.replace('problem', 'broblem') } : { ...x }));
      if (join(dec) !== nt) throw new Error(`tiling ${p.id}: '${join(dec)}' != '${nt}'`);
      ops.push({ op: 'phrase.update', phrase_id: p.id, set: { target_text: nt, decomposition: dec }, expect: { target_text: p.target_text, decomposition: p.decomposition } });
      log.push({ item: 1, row: p.id, old: p.target_text, new: nt, recorded: ['target1_audio_id', 'target2_audio_id'].filter((k) => p[k]) });
    }
  }
  // item 2
  for (const id of KNOWN_FIX) {
    const p = phr.get(id);
    if (!/\bthe the\b/.test(p.known_text)) throw new Error(`${id} known has no 'the the': ${p.known_text}`);
    const nk = p.known_text.replace(/\bthe the\b/, 'the');
    if (p.known_audio_id) {
      const sharers = clipUse.get(p.known_audio_id);
      if (sharers.length !== 1) throw new Error(`${id}: known clip shared by ${sharers}`);
    }
    ops.push({ op: 'phrase.update', phrase_id: p.id, set: { known_text: nk }, expect: { known_text: p.known_text, known_audio_id: p.known_audio_id } });
    // The known clip belongs to the legacy course (not this one): leave its label, put the same take back after the edit.
    if (p.known_audio_id) ops.push({ op: 'audio.link', target: 'phrase', phrase_id: p.id, slot: 'known', audio_id: p.known_audio_id, allow_text_mismatch: true });
    log.push({ item: 2, row: p.id, old: p.known_text, new: nk, knownClip: p.known_audio_id });
  }
  fs.writeFileSync(`${out}/items12.ops.json`, JSON.stringify({ ops, log }, null, 1));
  const r = await (await fetch(`${BASE}/api/production/${C}/edit-batch`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify({ ops, apply }) })).json();
  fs.writeFileSync(`${out}/items12.${apply ? 'applied' : 'dryrun'}.json`, JSON.stringify(r, null, 1));
  console.log(log.length, 'rows,', ops.length, 'ops;', JSON.stringify({ ok: r.ok, applied: r.applied, error: r.error, code: r.code, index: r.index }));
})().catch((e) => { console.error(e); process.exit(1); });
