#!/usr/bin/env node
// cs #420·AK: read an own-LEGO changeset back from LIVE through Popty's own read route (GET
// /api/production/<course>/script-view), night only, no write. For every op its ledger marks "applied":
// phrase.update -> live holds the set text AND (unless --text-only) all three audio slots are filled;
// phrase.delete -> the row is gone. Exit 0 = all match · 2 = mismatch or silent slot · 1 = unreadable.
//   node readback.cjs <file.changeset.jsonl> [--text-only]
const cs = require('../../services/shared/changeset.cjs');
const { loadLedger } = require('../../tools/changeset/apply-changeset.cjs');
const [file, ...rest] = process.argv.slice(2);
const TEXT_ONLY = rest.includes('--text-only');
const { header, ops } = cs.read(file);
const course = header.course;
const norm = (t) => String(t == null ? '' : t).normalize('NFC').trim();
(async () => {
  const done = loadLedger(`${file}.applied.jsonl`);
  const applied = ops.map((o, i) => [o, i]).filter(([, i]) => done.get(i) === 'applied');
  const seeds = [...new Set(applied.map(([o]) => Number(o.phrase_id.split(':')[1].slice(1, 5))))].sort((a, b) => a - b);
  const phr = new Map();
  for (const n of seeds) {
    const s = `S${String(n).padStart(4, '0')}`;
    const r = await fetch(`http://localhost:3470/api/production/${course}/script-view?seedStart=${s}&seedEnd=${s}`, { headers: { 'x-agent-id': 'kai-420-readback' }, signal: AbortSignal.timeout(60000) });
    if (!r.ok) throw new Error(`script-view ${course} ${s} -> HTTP ${r.status}`);
    for (const x of (await r.json()).seeds || []) for (const l of x.legos || []) for (const p of l.phrases || []) phr.set(p.id, p);
  }
  const bad = [], silent = [];
  for (const [o, i] of applied) {
    const p = phr.get(o.phrase_id);
    if (o.op === 'phrase.delete') { if (p) bad.push(`${o.phrase_id} still there`); continue; }
    if (!p) { bad.push(`${o.phrase_id} not served`); continue; }
    for (const k of ['known_text', 'target_text']) if (o.set[k] !== undefined && norm(p[k]) !== norm(o.set[k])) bad.push(`${o.phrase_id} ${k} "${p[k]}"`);
    if (!TEXT_ONLY) for (const k of ['known_audio_uuid', 'target1_audio_uuid', 'target2_audio_uuid']) if (!p[k]) silent.push(`${o.phrase_id.split(':')[1]} ${k.split('_')[0]}`);
  }
  console.log(`readback ${header.id}: ${applied.length} applied, ${bad.length} differ, ${TEXT_ONLY ? 'audio not checked' : `${silent.length} silent slot(s)`}` +
    (bad.length ? ` | DIFFER: ${bad.join('; ')}` : '') + (silent.length ? ` | SILENT: ${silent.join(', ')}` : ''));
  process.exit(bad.length || silent.length ? 2 : 0);
})().catch((e) => { console.error(`readback ${header.id}: ${e.message}`); process.exit(1); });
