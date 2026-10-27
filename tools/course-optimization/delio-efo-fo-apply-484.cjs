#!/usr/bin/env node
'use strict';
// delio-efo-fo-apply-484.cjs — Aran's ruling (job #484), cym_nv2_for_eng (North) ONLY:
// a practice phrase or seed whose Welsh ENDS with a bare 'delio'/'ddelio' (no object) becomes '… efo fo',
// and the English gains 'with it' ('I must deal' -> 'I must deal with it').
// Never touched: the taught LEGO/component itself, and lines where delio already has an object or
// continues with other words (those are listed for Aran, not changed). South is not applied.
// The spoken words change, so this is a PLAIN row edit: the text-change trigger unlinks the old clips
// and the booth Re-record card lists any recorded take. Popty's edit-batch, dry run unless --apply.
//   node delio-efo-fo-apply-484.cjs <course> --data <seeds.json> --out <dir> [--apply]
const fs = require('fs');
const path = require('path');
const BASE = process.env.POPTY_URL || 'http://localhost:3470';
const AGENT = 'aran-watson-484-delio-efo-fo';

const BARE_END = /(\s)(d?delio)([?.!]*)$/i;

/** New {target, known}, or null when the Welsh does not end with a bare delio/ddelio. */
function efoFoFor(known, target) {
  if (typeof known !== 'string' || typeof target !== 'string') return null;
  const m = target.match(BARE_END);
  if (!m) return null; // also skips a one-word LEGO 'ddelio' (no leading space)
  const kn = known.match(/^(.*\bdeal)([?.!]*)$/i);
  if (!kn) return null;
  return { target: target.replace(BARE_END, `$1$2 efo fo$3`), known: `${kn[1]} with it${kn[2]}` };
}

function changesFor(data) {
  const out = [];
  const audio = (r) => ({ known_audio_id: r.known_audio_id || null, target1_audio_id: r.target1_audio_id || null, target2_audio_id: r.target2_audio_id || null });
  const push = (kind, id, row) => { const n = efoFoFor(row.known_text, row.target_text); if (n) out.push({ kind, id, old: { known_text: row.known_text, target_text: row.target_text }, nw: n, audio: audio(row) }); };
  for (const s of data.seeds) {
    push('seed', s.seed_number, s);
    for (const l of s.legos || []) {
      if (!l.lego_id) continue;
      for (const p of l.basket_phrases || []) push('phrase', p.id, p);
    }
  }
  return out;
}

function opsFor(chg) {
  return chg.map((c) => ({
    op: c.kind === 'seed' ? 'seed.update' : 'phrase.update',
    ...(c.kind === 'seed' ? { seed_number: c.id } : { phrase_id: c.id }),
    set: { known_text: c.nw.known, target_text: c.nw.target },
    expect: { ...c.old, ...c.audio },
  }));
}

module.exports = { efoFoFor, changesFor, opsFor };

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
