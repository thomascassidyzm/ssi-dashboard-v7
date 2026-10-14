#!/usr/bin/env node
'use strict';
// tools/course-optimization/deu-second-intros-notnew-2026-10-14.cjs  (job #502)
//
// KAI'S RULING, 2026-10-14, deu_for_eng: five LEGOs that exactly re-teach an earlier LEGO (same English AND same
// German) become NOT NEW: S0447L03 home|nach Hause (= S0401L04), S0522L03 was|war (= S0361L01), S0530L01 so that|damit
// (= S0505L01), S0538L04 don't care|egal (= S0048L01), S0464L03 said|gesagt (= S0449L01). No intro for a not-new LEGO.
// P25: a not-new LEGO's basket is never played, so each of its phrases moves under a NEW LEGO it contains on BOTH
// sides, at whose position every word (target AND known) is already taught. No such home → the row is HELD, not forced.
// Nothing is rewritten. The LEGO's own row (B01) stays in the dark basket (spa #412 / deu #494 precedent).
// Moved rows keep text and audio: edit-batch phrase.insert (new id, same clip ids) + phrase.delete, no TTS.
//
//   node …/deu-second-intros-notnew-2026-10-14.cjs check <dump.json>      # plan + held list
//   node …/deu-second-intros-notnew-2026-10-14.cjs ops <dump.json> --out ops.json
//   node …/deu-second-intros-notnew-2026-10-14.cjs verify <fresh-dump.json>
const fs = require('fs');
const T = require('./p26-early-placement-sweep-2026-10-06.cjs');
const Y = require('./deu-yet-noch-519-baby-2026-10-14.cjs');

const COURSE = 'deu_for_eng';
const P = (s) => `${COURSE}:${s}`;
const sid = (id) => id.slice(COURSE.length + 1);
const FLIPS = { S0447L03: 'S0401L04', S0522L03: 'S0361L01', S0530L01: 'S0505L01', S0538L04: 'S0048L01', S0464L03: 'S0449L01' };
const before = (a, b) => a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);
const ord = (l) => (l.round_index != null ? l.round_index : l.seed_number * 100 + l.lego_index);
const legoOfPhrase = (p) => sid(p.id).slice(0, 8);
const pk = (k, t) => `${T.words(k).join(' ')}|${T.words(t).join(' ')}`;

function firstIntroKnown(legos) {
  const first = new Map();
  for (const l of legos) if (l.is_new !== false) for (const w of T.words(l.known_text)) { const q = [l.seed_number, l.lego_index]; if (!first.has(w) || before(q, first.get(w))) first.set(w, q); }
  return first;
}
const untaughtKnown = Y.untaughtKnown;

/** two-sided duplicate check: same English and same German as the earlier LEGO */
function duplicateProblems(dump) {
  const out = [];
  for (const [id, twin] of Object.entries(FLIPS)) {
    const a = dump.legos.find((l) => l.lego_id === id), b = dump.legos.find((l) => l.lego_id === twin);
    if (!a || !b) out.push(`${id}/${twin} missing`);
    else if (a.known_text.toLowerCase() !== b.known_text.toLowerCase() || a.target_text.toLowerCase() !== b.target_text.toLowerCase()) out.push(`${id} is NOT a two-sided duplicate of ${twin}`);
    else if (b.is_new === false) out.push(`${twin} is itself not new`);
  }
  return out;
}

function plan(dump) {
  const legos = dump.legos.map((l) => (FLIPS[l.lego_id] ? { ...l, is_new: false } : l));
  const first = T.firstIntro(legos), firstK = firstIntroKnown(legos);
  const news = legos.filter((l) => l.is_new !== false);
  const used = new Set(dump.phrases.map((p) => sid(p.id)));
  const basket = new Map(); for (const p of dump.phrases) { const k = legoOfPhrase(p); (basket.get(k) || basket.set(k, []).get(k)).push(p); }
  const nextPos = new Map(), nextN = new Map();
  const moves = [], held = [];
  for (const id of Object.keys(FLIPS)) {
    const src = legos.find((l) => l.lego_id === id);
    for (const p of (basket.get(id) || []).filter((x) => x.phrase_role !== 'component')) {
      if (pk(p.known_text, p.target_text) === pk(src.known_text, src.target_text) || sid(p.id).endsWith('B01')) { held.push({ id: sid(p.id), from: id, row: `${p.known_text} | ${p.target_text}`, why: 'the LEGO\'s own row — stays in the dark basket (precedent S0519L04B01)', stays: true }); continue; }
      const cands = news.filter((l) => l.lego_id !== id && T.containsWords(p.target_text, l.target_text) && T.containsWords(p.known_text, l.known_text)
        && !T.untaughtAt(p.target_text, l, first).length && !untaughtKnown(p.known_text, l, firstK).length);
      if (!cands.length) {
        const any = news.filter((l) => T.containsWords(p.target_text, l.target_text) && T.containsWords(p.known_text, l.known_text));
        held.push({ id: sid(p.id), from: id, row: `${p.known_text} | ${p.target_text}`, why: any.length ? `contains ${any.length} new LEGO(s) (${any.slice(0, 3).map((l) => l.lego_id).join(', ')}) but every word is not yet taught at any of them` : 'contains no other new LEGO on both sides' });
        continue;
      }
      // prefer the LEGO whose basket gives the row the longest legal fit: the one with the most words (most specific), nearest in round order
      cands.sort((a, b) => Math.abs(ord(a) - ord(src)) - Math.abs(ord(b) - ord(src)));
      const dest = cands[0];
      const dup = (basket.get(dest.lego_id) || []).find((q) => pk(q.known_text, q.target_text) === pk(p.known_text, p.target_text));
      if (dup) { held.push({ id: sid(p.id), from: id, row: `${p.known_text} | ${p.target_text}`, why: `${sid(dup.id)} under ${dest.lego_id} already says the same on both sides (delete-candidate)`, deleteCandidate: true }); continue; }
      const role = 'use'; // a build belongs to its own LEGO's debut; a moved row is practice (deu #494 precedent)
      const L = 'U';
      const nk = dest.lego_id + L; let n = nextN.get(nk) || 21; while (used.has(`${nk}${n}`)) n++; nextN.set(nk, n + 1); used.add(`${nk}${n}`);
      const pos = (nextPos.get(dest.lego_id) || Math.max(0, ...(basket.get(dest.lego_id) || []).map((q) => q.position || 0))) + 1; nextPos.set(dest.lego_id, pos);
      const row = { ...p, id: P(`${nk}${n}`), seed_number: dest.seed_number, lego_index: dest.lego_index, lego_id: dest.lego_id, position: pos, phrase_role: role,
        metadata: { ...(p.metadata || {}), moved_from: sid(p.id), moved_by: 'job #502 deu duplicate LEGOs not new (P25)' } };
      delete row.course_code;
      moves.push({ from: p, row, dest, note: `${sid(p.id)} → ${sid(row.id)} under ${dest.lego_id} "${dest.known_text} | ${dest.target_text}" (round ${dest.round_index})` });
    }
  }
  return { legos, moves, held };
}

function textOps(dump) {
  const { moves } = plan(dump);
  const ops = Object.keys(FLIPS).map((id) => ({ op: 'lego.update', lego_id: id, expect: { is_new: true }, set: { is_new: false } }));
  for (const m of moves) {
    ops.push({ op: 'phrase.insert', row: m.row });
    ops.push({ op: 'phrase.delete', phrase_id: m.from.id, expect: { known_text: m.from.known_text, target_text: m.from.target_text } });
  }
  return ops;
}

/** invariants on a (fresh) dump: flipped, and no flipped LEGO's basket holds anything but its own row or held rows */
function invariants(d, allowLeft) {
  const out = [];
  for (const id of Object.keys(FLIPS)) {
    const l = d.legos.find((x) => x.lego_id === id);
    if (!l || l.is_new !== false) out.push(`${id} is still new`);
    for (const p of d.phrases.filter((x) => legoOfPhrase(x) === id && x.phrase_role !== 'component')) if (!allowLeft.has(sid(p.id))) out.push(`${sid(p.id)} still sits in dark ${id}`);
  }
  return out;
}

module.exports = { plan, textOps, duplicateProblems, invariants, FLIPS };

if (require.main === module) {
  const [cmd, dumpPath, ...rest] = process.argv.slice(2);
  const dump = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));
  const dp = duplicateProblems(dump); if (dp.length) { console.log(dp.join('\n')); process.exit(2); }
  const { moves, held } = plan(dump);
  if (cmd === 'check') {
    console.log(`${moves.length} moves, ${held.length} stay/held`);
    for (const m of moves) console.log('  MOVE', m.note, '|', m.row.known_text, '|', m.row.target_text);
    for (const h of held) console.log(h.stays ? '  STAYS' : '  HELD', h.id, '|', h.row, '—', h.why);
  } else if (cmd === 'ops') {
    const i = rest.indexOf('--out'); const ops = textOps(dump);
    fs.writeFileSync(rest[i + 1], JSON.stringify({ ops }, null, 1)); console.log(`${ops.length} ops`);
  } else if (cmd === 'verify') {
    const left = new Set(held.map((h) => h.id)); const pr = invariants(dump, left);
    console.log(pr.length ? pr.join('\n') : 'flips hold; dark baskets hold only own/held rows'); process.exit(pr.length ? 2 : 0);
  }
}
