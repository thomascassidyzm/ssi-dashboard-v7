#!/usr/bin/env node
'use strict';
// ymdopi-cope-apply-469.cjs — Aran's ruling (job #469) for cym_nv2_for_eng / cym_sv2_for_eng:
// wherever the Welsh contains 'ymdop*' and the English renders it 'manage', the English becomes 'cope'.
// Only rows whose Welsh has ymdop* are touched; 'manage' elsewhere (llwyddo, rheoli…) is never edited.
// The English words really change, so this is a PLAIN row edit: the take-on-text-change trigger unlinks
// the old English clip, and the booth Re-record card then lists any recorded take as 'text_changed'.
// Every write is Popty's edit-batch (dry run unless --apply); each op carries `expect`. No database code.
//   node ymdopi-cope-apply-469.cjs <course> --data <seeds.json> --out <dir> [--apply]
const fs = require('fs');
const path = require('path');
const BASE = process.env.POPTY_URL || 'http://localhost:3470';
const AGENT = 'aran-watson-469-ymdopi-cope';

const keepCase = (from, to) => (from[0] === from[0].toUpperCase() ? to[0].toUpperCase() + to.slice(1) : to);
const COPE = { manage: 'cope', manages: 'copes', managed: 'coped', managing: 'coping' };

/** New English, or null when the Welsh has no ymdop* or the English has no 'manage' form. */
function copeFor(known, target) {
  if (typeof known !== 'string' || typeof target !== 'string' || !/ymdop/i.test(target)) return null;
  const out = known.replace(/\bmanag(e|es|ed|ing)\b/gi, (m) => keepCase(m, COPE[m.toLowerCase()]));
  return out === known ? null : out;
}

function changesFor(data) {
  const out = [];
  const audio = (r) => ({ known_audio_id: r.known_audio_id || null, target1_audio_id: r.target1_audio_id || null, target2_audio_id: r.target2_audio_id || null });
  const push = (kind, id, row) => { const nk = copeFor(row.known_text, row.target_text); if (nk) out.push({ kind, id, old: row.known_text, nk, audio: audio(row) }); };
  for (const s of data.seeds) {
    push('seed', s.seed_number, s);
    for (const l of s.legos || []) {
      push('lego', l.lego_id, l);
      (l.components || []).forEach((c, i) => { if (c && typeof c === 'object' && copeFor(c.known, c.target)) throw new Error(`component hit ${l.lego_id}#${i}: handle by hand`); });
      for (const p of l.basket_phrases || []) push('phrase', p.id, p);
    }
  }
  return out;
}

function opsFor(chg) {
  return chg.map((c) => ({
    op: c.kind === 'seed' ? 'seed.update' : c.kind === 'lego' ? 'lego.update' : 'phrase.update',
    ...(c.kind === 'seed' ? { seed_number: c.id } : c.kind === 'lego' ? { lego_id: c.id } : { phrase_id: c.id }),
    set: { known_text: c.nk },
    expect: { known_text: c.old, ...c.audio },
  }));
}

module.exports = { copeFor, changesFor, opsFor };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const course = argv[0];
  const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
  const apply = argv.includes('--apply');
  (async () => {
    const data = JSON.parse(fs.readFileSync(arg('--data'), 'utf8'));
    const chg = changesFor(data);
    const ops = opsFor(chg);
    fs.mkdirSync(arg('--out'), { recursive: true });
    fs.writeFileSync(path.join(arg('--out'), `${course}.changes.json`), JSON.stringify(chg, null, 1));
    const r = await fetch(`${BASE}/api/production/${course}/edit-batch`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify({ ops, apply }) });
    const json = await r.json();
    fs.writeFileSync(path.join(arg('--out'), `${course}.${apply ? 'applied' : 'dryrun'}.json`), JSON.stringify(json, null, 1));
    console.log(JSON.stringify({ course, changes: chg.length, ok: json.ok, applied: json.applied, results: (json.results || []).length, undo_file: json.undo_file || null, err: json.ok ? undefined : JSON.stringify(json).slice(0, 500) }));
    if (!json.ok) process.exit(1);
  })().catch((e) => { console.error(e); process.exit(1); });
}
