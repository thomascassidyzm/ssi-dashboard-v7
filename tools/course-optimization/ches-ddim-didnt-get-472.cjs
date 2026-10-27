#!/usr/bin/env node
'use strict';
// ches-ddim-didnt-get-472.cjs — Aran's TEXT-ONLY ruling (job #472) for cym_nv2_for_eng / cym_sv2_for_eng:
// where the Welsh is a NEGATIVE PAST OF CAEL (ches i ddim, chest ti ddim, chafodd o ddim, chawson ni ddim ... and the
// 'na chest ti amser' form where the negative particle na carries the negation) and the English says "didn't have",
// the English becomes "didn't get". 'doedd gen i ddim' / 'do'n i ddim yn cael' etc. are NOT cael-past and are never touched.
// The Welsh is unchanged (no Welsh re-recording), but the SPOKEN ENGLISH changes (have → get), so unlike the punctuation/spelling
// jobs the take is NOT kept: a plain row edit lets null_known_audio_on_text_change unlink the old English take, which then shows
// as 'text changed' on that voice's Re-record card (services/voice-engine/booth-rerecord.cjs pairs orphan takes live).
// A LEGO's presentation clip is put straight back (as welsh-question-marks-apply.cjs does) so no LEGO loses its intro.
// Every write is Popty's edit-batch: dry run unless --apply.
//
//   node ches-ddim-didnt-get-472.cjs <course> --data <seeds.json> --out <dir> [--apply]
const fs = require('fs');
const path = require('path');

const BASE = process.env.POPTY_URL || 'http://localhost:3470';
const AGENT = 'aran-watson-472-ches-ddim-didnt-get';
const SLOTS = { known: ['known'], target: ['target1', 'target2'] };

const CAEL_PAST = '(?:ches|chest|chafodd|chawson|chawsoch|chawsom|chaethon|chaeth)';
// Negative past of cael: the form followed (anywhere after it in the line) by ddim / mo, or the form straight after 'na'.
const NEG_CAEL = new RegExp(`\\b${CAEL_PAST}\\b[^]*\\b(?:ddim|mo)\\b|\\bna\\s+${CAEL_PAST}\\b`, 'i');
// A line with more than one 'didn't have' cannot be told apart from the other negative, so it is left for a human.
const DIDNT_HAVE = /\bdidn[’']t have\b/gi;

/** New known text, or null when nothing changes. */
function didntGet(known, target) {
  if (typeof known !== 'string' || typeof target !== 'string' || !NEG_CAEL.test(target)) return null;
  const hits = known.match(DIDNT_HAVE) || [];
  if (hits.length !== 1) return null;
  return known.replace(DIDNT_HAVE, (m) => m.slice(0, -4) + 'get');
}

/** Every row (seed, LEGO, LEGO component, phrase) of the course that changes, in buildOps' row shape. */
function changesFor(data) {
  const out = [];
  const audio = (r) => ({ known: r.known_audio_id || null, target1: r.target1_audio_id || null, target2: r.target2_audio_id || null });
  const push = (kind, id, row) => {
    const nk = didntGet(row.known_text, row.target_text);
    if (nk) out.push({ kind, id, known: row.known_text, target: row.target_text, audio: audio(row), newKnown: nk, newTarget: null });
  };
  for (const s of data.seeds) {
    push('seed', s.seed_number, s);
    for (const l of s.legos || []) {
      push('lego', l.lego_id, l);
      (l.components || []).forEach((c, i) => {
        if (!c || typeof c !== 'object') return;
        const nk = didntGet(c.known, c.target);
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

/** Plain edit ops: one row update per changed row (with before-state `expect`), components folded into their LEGO's update, presentation clips relinked. */
function buildPlainOps(course, data, chg) {
  const legoById = new Map();
  const presentation = new Map();
  for (const s of data.seeds) for (const l of s.legos || []) {
    legoById.set(l.lego_id, l);
    if (l.presentation_audio_id) presentation.set(`lego|${l.lego_id}`, l.presentation_audio_id);
    for (const p of l.basket_phrases || []) if (p.presentation_audio_id) presentation.set(`phrase|${p.id}`, p.presentation_audio_id);
  }
  const compEdits = new Map();
  for (const c of chg.filter((x) => x.kind === 'lego_component')) {
    if (!compEdits.has(c.lego_id)) compEdits.set(c.lego_id, JSON.parse(JSON.stringify(legoById.get(c.lego_id).components)));
    compEdits.get(c.lego_id)[c.index].known = c.newKnown;
  }
  const ops = [], link = [], done = new Set();
  const relinkPresentation = (kind, id) => { const a = presentation.get(`${kind}|${id}`); if (a) link.push({ op: 'audio.link', target: kind, ...(kind === 'lego' ? { lego_id: id } : { phrase_id: id }), slot: 'presentation', audio_id: a }); };
  for (const c of chg.filter((x) => x.kind !== 'lego_component')) {
    const set = { known_text: c.newKnown };
    const expect = { known_text: c.known, known_audio_id: c.audio.known, target1_audio_id: c.audio.target1, target2_audio_id: c.audio.target2 };
    let op;
    if (c.kind === 'seed') op = { op: 'seed.update', seed_number: c.id };
    else if (c.kind === 'lego') {
      op = { op: 'lego.update', lego_id: c.id };
      if (compEdits.has(c.id)) { set.components = compEdits.get(c.id); expect.components = legoById.get(c.id).components; done.add(c.id); }
    } else op = { op: 'phrase.update', phrase_id: c.id };
    ops.push({ ...op, set, expect });
    if (c.kind === 'lego' || c.kind === 'phrase') relinkPresentation(c.kind, c.id);
  }
  for (const [legoId, comps] of compEdits) if (!done.has(legoId)) ops.push({ op: 'lego.update', lego_id: legoId, set: { components: comps }, expect: { components: legoById.get(legoId).components } });
  return [...ops, ...link];
}

module.exports = { didntGet, changesFor, buildPlainOps, NEG_CAEL };

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
    fs.writeFileSync(path.join(out, `${course}.plan.json`), JSON.stringify(ops, null, 1));
    console.log(JSON.stringify({ course, changes: chg.length, ops: ops.length, withKnownClip: chg.filter((c) => c.audio.known).length }));
    const res = await post(course, { ops, apply });
    fs.writeFileSync(path.join(out, `${course}.${apply ? 'applied' : 'dryrun'}.json`), JSON.stringify(res.json, null, 1));
    if (!res.json.ok) { console.error('REFUSED', JSON.stringify(res.json).slice(0, 600)); process.exit(1); }
    console.log(JSON.stringify({ ok: res.json.ok, applied: res.json.applied, results: res.json.results.length, undo_file: res.json.undo_file || null }));
  })().catch((e) => { console.error(e); process.exit(1); });
}
