#!/usr/bin/env node
'use strict';
// cael-get-time-chance-485.cjs — Aran's TEXT-ONLY ruling (job #485), the positive twin of ches-ddim-didnt-get-472.cjs:
// where the Welsh is a POSITIVE PAST OF CAEL (ges i / gest ti / gafodd ...) and the English says "had/have" about TIME or a
// CHANCE, the English becomes "get/got" ("did you have time to ask for help?" -> "did you get time to ask for help?",
// "have a chance" -> "get a chance", "enough / more / less time" likewise). "a good time", eat/drink, "a cup of coffee" stay "had".
// Same mechanics as #472 (plain row edit unlinks the old English take so it lands on Aran's Re-record card; LEGO and phrase
// presentation clips are put straight back), every write is Popty's edit-batch, dry run unless --apply.
//
//   node cael-get-time-chance-485.cjs <course> --data <seeds.json> --out <dir> [--apply]
const fs = require('fs');
const path = require('path');
const { buildPlainOps, NEG_CAEL } = require('./ches-ddim-didnt-get-472.cjs');

const BASE = process.env.POPTY_URL || 'http://localhost:3470';
const AGENT = 'aran-watson-485-cael-get-time-chance';

const POS_CAEL = /\b(?:ces|ges|cest|gest|cafodd|gafodd|cawson|gawson|cawsoch|gawsoch|cawsom|gawsom|caethon|gaethon|caeth|gaeth)\b/i;
// have/had followed by time or a chance, with an optional quantity ("enough time", "less time"); "a good time" does not match.
const HAVE_TIME = /\b(had|have)(?=\s+(?:(?:enough|more|less|much|any|some)\s+)?(?:time\b|a chance\b))/gi;
const ANY_HAVE = /\b(?:had|have)\b/gi;

/** New known text, or null when nothing changes (not positive cael, no time/chance 'have', or another 'have' we can't tell apart). */
function getTimeChance(known, target) {
  if (typeof known !== 'string' || typeof target !== 'string' || !POS_CAEL.test(target) || NEG_CAEL.test(target)) return null;
  const hits = known.match(HAVE_TIME) || [];
  if (!hits.length || hits.length !== (known.match(ANY_HAVE) || []).length) return null;
  return known.replace(HAVE_TIME, (m) => (m.toLowerCase() === 'had' ? 'got' : 'get'));
}

function changesFor(data) {
  const out = [];
  const audio = (r) => ({ known: r.known_audio_id || null, target1: r.target1_audio_id || null, target2: r.target2_audio_id || null });
  const push = (kind, id, row) => {
    const nk = getTimeChance(row.known_text, row.target_text);
    if (nk) out.push({ kind, id, known: row.known_text, target: row.target_text, audio: audio(row), newKnown: nk, newTarget: null });
  };
  for (const s of data.seeds) {
    push('seed', s.seed_number, s);
    for (const l of s.legos || []) {
      push('lego', l.lego_id, l);
      (l.components || []).forEach((c, i) => {
        if (!c || typeof c !== 'object') return;
        const nk = getTimeChance(c.known, c.target);
        if (nk) out.push({ kind: 'lego_component', id: `${l.lego_id}#${i}`, lego_id: l.lego_id, index: i, known: c.known, target: c.target, audio: {}, newKnown: nk, newTarget: null });
      });
      for (const p of l.basket_phrases || []) push('phrase', p.id, p);
    }
  }
  return out;
}

async function post(course, body) {
  const r = await fetch(`${BASE}/api/production/${course}/edit-batch`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body),
  });
  return { status: r.status, json: await r.json() };
}

module.exports = { getTimeChance, changesFor };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const course = argv[0];
  const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
  const apply = argv.includes('--apply');
  const out = arg('--out');
  (async () => {
    const data = JSON.parse(fs.readFileSync(arg('--data'), 'utf8'));
    const chg = changesFor(data);
    const ops = buildPlainOps(course, data, chg);
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, `${course}.plan.json`), JSON.stringify(chg, null, 1));
    console.log(JSON.stringify({ course, changes: chg.length, ops: ops.length, withKnownClip: chg.filter((c) => c.audio.known).length }));
    const res = await post(course, { ops, apply });
    fs.writeFileSync(path.join(out, `${course}.${apply ? 'applied' : 'dryrun'}.json`), JSON.stringify(res.json, null, 1));
    if (!res.json.ok) { console.error('REFUSED', JSON.stringify(res.json).slice(0, 600)); process.exit(1); }
    console.log(JSON.stringify({ ok: res.json.ok, applied: res.json.applied, results: res.json.results.length, undo_file: res.json.undo_file || null }));
  })().catch((e) => { console.error(e); process.exit(1); });
}
