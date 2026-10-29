#!/usr/bin/env node
'use strict';
// kor_for_eng duplicate-LEGO holds from job #516 (Kai 29 Oct 2026): a duplicate LEGO (both sides exact; a lone question mark does not
// make it different) goes not-new even if its seed is left with no new LEGO ("we do not need to preserve seeds at all costs").
// Basket phrases that validly fit another basket (everything in them taught by that LEGO, natural, no same-known row there already)
// move there: phrase.insert + audio.link of the SAME clips + phrase.delete. The rest stay and go unplayed (P25).
// S0567L02 is INVERTED (earlier S0455L02 is not-new): the flags swap so the EARLIER one is new; it borrows S0567L02's presentation clip.
//   node …/kor-dup-flip-502-2026-10-29.cjs <seeds.json>     # re-checks the duplicates, prints the plan, edit-batch DRY RUN
//   APPLY_CONFIRM=1 node … <seeds.json>                     # then applies
const fs = require('fs');
const COURSE = 'kor_for_eng';
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const sid = (id) => String(id).split(':').pop();
const bare = (t) => String(t).replace(/[?.!]/g, '').trim();

// flip -> earlier twin (S0559L03 differs from S0514L03 only by the question mark on both sides)
const FLIPS = { S0498L01: 'S0390L01', S0559L03: 'S0514L03', S0620L01: 'S0572L02', S0662L02: 'S0314L01', S0662L03: 'S0009L01' };
const INVERTED = { flipOff: 'S0567L02', flipOn: 'S0455L02' };
// moves: [phrase, destination LEGO] — taught-by checks done against first-teaching position of every word (see commit message)
const MOVES = [
  ['S0498L01U03', 'S0390L01'],
  ['S0559L03U02', 'S0556L01'],
  ['S0567L02U03', 'S0455L02'],
  ['S0662L02B07', 'S0314L01'], ['S0662L02B05', 'S0314L01'], ['S0662L02B08', 'S0314L01'], ['S0662L02U08', 'S0314L01'],
  ['S0662L02U07', 'S0314L01'], ['S0662L02U09', 'S0314L01'], ['S0662L02U10', 'S0314L01'], ['S0662L02B06', 'S0425L01'],
  ['S0662L03U04', 'S0410L01'], ['S0662L03U06', 'S0314L01'], ['S0662L03U03', 'S0314L01'],
];

function build(api) {
  const seeds = api.seeds, legos = {}, phrases = {};
  for (const s of seeds) for (const l of s.legos || []) { legos[l.lego_id] = l; for (const p of l.basket_phrases || []) phrases[sid(p.id)] = p; }
  const ops = [], log = [], touched = new Set();
  const same = (a, b) => bare(a.known_text) === bare(b.known_text) && bare(a.target_text) === bare(b.target_text);
  for (const [id, earlier] of Object.entries(FLIPS)) {
    const l = legos[id], e = legos[earlier];
    if (!l || !e || !same(l, e)) throw new Error(`${id} is NOT a both-sides duplicate of ${earlier}`);
    if (!e.is_new) throw new Error(`${earlier} is not new`);
    ops.push({ op: 'lego.update', lego_id: id, set: { is_new: false }, expect: { is_new: true, known_text: l.known_text, target_text: l.target_text } });
    touched.add(l.seed_number);
  }
  { // inverted pair
    const off = legos[INVERTED.flipOff], on = legos[INVERTED.flipOn];
    if (!off || !on || off.known_text !== on.known_text || off.target_text !== on.target_text) throw new Error('inverted pair is not an exact twin');
    if (!off.is_new || on.is_new || on.seed_number >= off.seed_number) throw new Error('inverted pair is not in the expected state');
    ops.push({ op: 'lego.update', lego_id: off.lego_id, set: { is_new: false }, expect: { is_new: true } });
    ops.push({ op: 'lego.update', lego_id: on.lego_id, set: { is_new: true }, expect: { is_new: false } });
    if (off.presentation_audio_id && !on.presentation_audio_id)
      ops.push({ op: 'audio.link', target: 'lego', lego_id: on.lego_id, slot: 'presentation', audio_id: off.presentation_audio_id });
    touched.add(off.seed_number); touched.add(on.seed_number);
  }
  const nextU = {}, nextPos = {};
  for (const [pid, dest] of MOVES) {
    const p = phrases[pid], home = legos[dest];
    if (!p || !home) throw new Error(`bad move ${pid} -> ${dest}`);
    const rows = home.basket_phrases;
    if (rows.some((r) => r.known_text.trim().toLowerCase() === p.known_text.trim().toLowerCase() || r.target_text.trim() === p.target_text.trim()))
      throw new Error(`${dest} already has a row for "${p.known_text}" | "${p.target_text}"`);
    nextU[dest] = nextU[dest] || 1 + Math.max(0, ...rows.map((r) => +(sid(r.id).match(/U(\d+)$/) || [0, 0])[1]));
    nextPos[dest] = nextPos[dest] || 1 + Math.max(0, ...rows.map((r) => r.position || 0));
    const id = `${dest}U${String(nextU[dest]++).padStart(2, '0')}`;
    const row = { ...p, id: `${COURSE}:${id}`, seed_number: home.seed_number, lego_index: home.lego_index, phrase_role: 'use', lego_position: 'end', position: nextPos[dest]++,
      metadata: { ...(p.metadata || {}), moved_from: pid, moved_by: 'kor-dup-flip-502 (Kai 29 Oct: duplicate LEGO not new)' } };
    for (const c of ['known_audio_id', 'target1_audio_id', 'target2_audio_id', 'presentation_audio_id', 'target1_duration_ms', 'target2_duration_ms',
      'last_edit_event_id', 'created_at', 'updated_at', 'version', 'qa_checked', 'decomposition', 'display_tiling', 'display_tiling_version']) delete row[c];
    ops.push({ op: 'phrase.insert', row });
    for (const [slot, col] of [['known', 'known_audio_id'], ['target1', 'target1_audio_id'], ['target2', 'target2_audio_id']])
      if (p[col]) ops.push({ op: 'audio.link', target: 'phrase', phrase_id: row.id, slot, audio_id: p[col] });
    ops.push({ op: 'phrase.delete', phrase_id: `${COURSE}:${pid}` });
    touched.add(home.seed_number); touched.add(p.seed_number);
    log.push(`${pid} -> ${id}: ${p.known_text} | ${p.target_text}`);
  }
  for (const n of touched) { const s = seeds.find((x) => x.seed_number === n); if (s && s.approved_at) ops.push({ op: 'seed.update', seed_number: n, set: { approved_at: null }, expect: { approved_at: new Date(s.approved_at).toISOString() } }); }
  return { ops, log };
}

async function post(body) {
  const r = await fetch(`${POPTY}/api/production/${COURSE}/edit-batch`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': 'kor-dup-flip-502' }, body: JSON.stringify(body), signal: AbortSignal.timeout(120000) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}
async function main() {
  const { ops, log } = build(JSON.parse(fs.readFileSync(process.argv[2], 'utf8')));
  console.log(log.join('\n'), `\n${ops.length} ops`);
  const prev = await post({ ops });
  console.log('dry run', prev.status, JSON.stringify(prev.body).slice(0, 800));
  if (prev.status !== 200 || process.env.APPLY_CONFIRM !== '1') return;
  const res = await post({ ops, apply: true });
  console.log('APPLY', res.status, JSON.stringify(res.body).slice(0, 1500));
  fs.writeFileSync(`${process.env.CS_SCRATCH || '.'}/applied.json`, JSON.stringify(res.body));
}
if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
module.exports = { build, FLIPS, MOVES, INVERTED };
