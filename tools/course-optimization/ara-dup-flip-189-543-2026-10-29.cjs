#!/usr/bin/env node
'use strict';
// ara_for_eng S0189L01 + S0543L01 (held by job #513): Kai 29 Oct 2026 — a duplicate LEGO goes not-new even if its seed is left
// with no new LEGO ("We do not need to preserve seeds at all costs"). Each basket phrase of the flipped LEGO that validly fits
// another basket (a LEGO it contains, every word already taught at that point, no same-known row there already) moves there;
// the rest stay and go unplayed (P25). Moves = phrase.insert under the new LEGO + audio.link of the SAME clips + phrase.delete.
//   node …/ara-dup-flip-189-543-2026-10-29.cjs <seeds.json>               # re-checks the duplicates, prints the plan, edit-batch DRY RUN
//   APPLY_CONFIRM=1 node … <seeds.json>                                   # then applies
const fs = require('fs');
const COURSE = 'ara_for_eng';
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const sid = (id) => String(id).split(':').pop();
// flip -> earlier duplicate; moves: [phrase, destination LEGO]. Destinations chosen from first-teaching positions of every word
// (U04 الذهاب is first taught at S0668L02, hence that home; B03 ليست at S0134, so any LEGO from S0160 on that it contains).
const FLIPS = { S0189L01: 'S0123L02', S0543L01: 'S0387L01' };
const MOVES = [
  ['S0189L01B02', 'S0123L02'], // the seed sentence itself (yes that's a good idea)
  ['S0189L01U02', 'S0123L02'], ['S0189L01U06', 'S0123L02'],
  ['S0189L01B03', 'S0160L02'], ['S0189L01U04', 'S0668L02'],
  ['S0543L01U06', 'S0387L01'], ['S0543L01U07', 'S0387L01'], ['S0543L01U08', 'S0387L01'],
];
const UNAPPROVE = [189, 123]; // seeds that lose or gain rows and are approved (the others receiving rows are already unapproved)

function build(api) {
  const seeds = api.seeds, legos = {}, phrases = {};
  for (const s of seeds) for (const l of s.legos || []) { legos[l.lego_id] = l; for (const p of l.basket_phrases || []) phrases[sid(p.id)] = p; }
  const ops = [], log = [];
  for (const [id, earlier] of Object.entries(FLIPS)) {
    const l = legos[id], e = legos[earlier];
    if (!l || !e || l.known_text !== e.known_text || l.target_text !== e.target_text) throw new Error(`${id} is NOT an exact both-sides duplicate of ${earlier}`);
    if (!e.is_new) throw new Error(`${earlier} is not new`);
    ops.push({ op: 'lego.update', lego_id: id, set: { is_new: false }, expect: { is_new: true, known_text: l.known_text, target_text: l.target_text } });
  }
  const nextU = {}, nextPos = {};
  for (const [pid, dest] of MOVES) {
    const p = phrases[pid], home = legos[dest];
    if (!p || !home || !home.is_new) throw new Error(`bad move ${pid} -> ${dest}`);
    const rows = home.basket_phrases;
    if (rows.some((r) => r.known_text.trim().toLowerCase() === p.known_text.trim().toLowerCase())) throw new Error(`${dest} already has a row for "${p.known_text}"`);
    nextU[dest] = nextU[dest] || 1 + Math.max(0, ...rows.map((r) => +(sid(r.id).match(/U(\d+)$/) || [0, 0])[1]));
    nextPos[dest] = nextPos[dest] || 1 + Math.max(0, ...rows.map((r) => r.position || 0));
    const id = `${dest}U${String(nextU[dest]++).padStart(2, '0')}`;
    const row = { ...p, id: `${COURSE}:${id}`, seed_number: home.seed_number, lego_index: home.lego_index, phrase_role: 'use', lego_position: 'end', position: nextPos[dest]++,
      metadata: { ...(p.metadata || {}), moved_from: pid, moved_by: 'ara-dup-flip (Kai 29 Oct: duplicate LEGO not new)' } };
    for (const c of ['known_audio_id', 'target1_audio_id', 'target2_audio_id', 'presentation_audio_id', 'target1_duration_ms', 'target2_duration_ms',
      'last_edit_event_id', 'created_at', 'updated_at', 'version', 'qa_checked', 'decomposition', 'display_tiling', 'display_tiling_version']) delete row[c];
    ops.push({ op: 'phrase.insert', row });
    for (const [slot, col] of [['known', 'known_audio_id'], ['target1', 'target1_audio_id'], ['target2', 'target2_audio_id']])
      if (p[col]) ops.push({ op: 'audio.link', target: 'phrase', phrase_id: row.id, slot, audio_id: p[col] });
    ops.push({ op: 'phrase.delete', phrase_id: `${COURSE}:${pid}` });
    log.push(`${pid} -> ${id}: ${p.known_text} | ${p.target_text}`);
  }
  for (const n of UNAPPROVE) { const s = seeds.find((x) => x.seed_number === n); if (s && s.approved_at) ops.push({ op: 'seed.update', seed_number: n, set: { approved_at: null }, expect: { approved_at: new Date(s.approved_at).toISOString() } }); }
  return { ops, log };
}

async function post(body) {
  const r = await fetch(`${POPTY}/api/production/${COURSE}/edit-batch`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': 'ara-dup-flip-189-543' }, body: JSON.stringify(body), signal: AbortSignal.timeout(120000) });
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
module.exports = { build, FLIPS, MOVES };
