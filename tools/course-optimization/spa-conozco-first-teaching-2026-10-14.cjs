#!/usr/bin/env node
'use strict';
// node tools/course-optimization/spa-conozco-first-teaching-2026-10-14.cjs <spa_dump.json> <eng_for_spa_dump.json> <out-ops-dir>
// PURE: reads two course-dump-readonly JSON files, writes the edit-batch op lists (spa_for_eng.ops.json,
// eng_for_spa.ops.json) that are then POSTed to Popty's /api/production/:course/edit-batch. It touches no database.
//
// WHY (job #412, Kai 2026-10-14; canon P25/L31): spa_for_eng "I know | conozco" was first taught at S0230L01 (round 535)
// while S0085L01 — the same pair, EARLIER — was marked not new, so it was never played: conozco was used in seeds 85/87
// and eight phrases around round 200 before any played teaching. Fix = the earlier LEGO is the debut:
//   • S0085L01 → is_new true; S0230L01 → is_new false (the repeat).
//   • Phrases that exercise conozco at seed 85 and sit under S0085L02 move under S0085L01 so the new debut has a real
//     basket (P30). Same text, same clips: a move is INSERT-new-id + DELETE-old-id in one transaction.
//   • S0230L01's drill phrases (now under a not-new LEGO = dark, P25) move under NEW LEGOs they contain, nearest first,
//     builds becoming use rows (a build after the destination's uses breaks the build→use order). Never a LEGO deleted.
// eng_for_spa has the same shape once, without an earlier twin: S0207L01 "has hecho | you've done" is not new and no
// new LEGO anywhere teaches "you've" — L31: a not-new marking with no earlier exact pair has no ground, so it becomes NEW.
const fs = require('fs');
const path = require('path');
const T = require('./p26-early-placement-sweep-2026-10-06.cjs');

const sid = (p) => p.id.split(':')[1];
const legoOfPhrase = (p) => sid(p).slice(0, 8);

const MOVES_SPA = {
  // S0230L01 (now not new): each goes under the nearest new LEGO whose pair it contains and at whose seed every word is taught
  S0230L01B02: { to: 'S0228L01', role: 'use' }, S0230L01U02: { to: 'S0228L01' },
  S0230L01B03: { to: 'S0229L01', role: 'use' }, S0230L01U12: { to: 'S0229L01' }, S0230L01U17: { to: 'S0229L01' },
  S0230L01B04: { to: 'S0213L01', role: 'use' },
  S0230L01U16: { to: 'S0226L01' },
  S0230L01U18: { to: 'S0088L02' },
};
// S0085L01 is the DEBUT now and has no basket (P30). No existing phrase can move in: every S0085L02 row that says conozco also says
// "esas", taught one LEGO later at S0085L02, and S0230's rows need "ese hombre"/"esa mujer" (seeds 228/229). So the basket is authored
// from words taught by seed 85 on BOTH sides (checked in plan()): 3 build + 5 use, audio via the single Popty route.
const AUTHORED_85L01 = [
  ['build', 'I know someone else', 'Conozco a otra persona'],
  ['build', 'I know people who speak Spanish', 'Conozco a personas que hablan español'],
  ['build', 'I know no one here', 'No conozco a nadie aquí'],
  ['use', 'I know someone else who wants to learn', 'Conozco a otra persona que quiere aprender'],
  ['use', "I don't know people who speak Spanish", 'No conozco a personas que hablan español'],
  ['use', 'I know someone else who wants to speak with you', 'Conozco a otra persona que quiere hablar contigo'],
  ['use', "I know someone else but he doesn't want to speak with me", 'Conozco a otra persona pero él no quiere hablar conmigo'],
  ['use', 'I know people who speak Spanish very well', 'Conozco a personas que hablan español muy bien'],
];
// S0230L01B01 "I know | conozco" (the bare LEGO row) stays under its own LEGO: it is the LEGO, not a drill phrase.

/**
 * plan(dump, { legoFlips, moves }) → { ops, moved: [...], problems: [...] }. Every move is checked against the live gate's
 * rules before it is emitted: the row contains the destination LEGO on both sides (word multiset), and no target word is
 * untaught at the destination (new LEGOs only teach — the fixed detector).
 */
function plan(dump, { legoFlips, moves, authored = [] }) {
  const legos = dump.legos.map((l) => (legoFlips[l.lego_id] !== undefined ? { ...l, is_new: legoFlips[l.lego_id] } : l));
  const byId = new Map(legos.map((l) => [l.lego_id, l]));
  const first = T.firstIntro(legos);
  const live = new Map(dump.phrases.map((p) => [sid(p), p]));
  const ops = [], moved = [], problems = [];
  for (const [lid, isNew] of Object.entries(legoFlips)) {
    const was = dump.legos.find((l) => l.lego_id === lid);
    if (!was) { problems.push(`${lid}: no such LEGO`); continue; }
    ops.push({ op: 'lego.update', lego_id: lid, set: { is_new: isNew }, expect: { is_new: was.is_new } });
  }
  const used = new Map(); // dest lego → next numbers per role
  const nextId = (to, role) => {
    const L = role === 'build' ? 'B' : 'U';
    const k = `${to}${L}`;
    if (!used.has(k)) used.set(k, Math.max(0, ...[...live.keys()].filter((i) => i.startsWith(k)).map((i) => Number(i.slice(k.length)))));
    used.set(k, used.get(k) + 1);
    return `${k}${String(used.get(k)).padStart(2, '0')}`;
  };
  const posOf = new Map();
  for (const [id, m] of Object.entries(moves)) {
    const p = live.get(id), dest = byId.get(m.to);
    if (!p) { problems.push(`${id}: no such phrase`); continue; }
    if (!dest || !dest.is_new) { problems.push(`${id}: destination ${m.to} is not a NEW LEGO`); continue; }
    if (!T.containsWords(p.target_text, dest.target_text) || !T.containsWords(p.known_text, dest.known_text)) { problems.push(`${id}: does not contain ${m.to} on both sides`); continue; }
    const untaught = T.untaughtAt(p.target_text, dest, first);
    if (untaught.length) { problems.push(`${id}: uses ${untaught.join(', ')} before it is taught at ${m.to}`); continue; }
    const dupe = dump.phrases.find((q) => legoOfPhrase(q) === m.to && q.known_text === p.known_text && q.target_text === p.target_text);
    if (dupe) { problems.push(`${id}: ${m.to} already holds the identical pair (${sid(dupe)}) — would be a duplicate`); continue; }
    const role = m.role || p.phrase_role;
    const newId = nextId(m.to, role);
    if (!posOf.has(m.to)) posOf.set(m.to, Math.max(0, ...dump.phrases.filter((q) => legoOfPhrase(q) === m.to).map((q) => q.position || 0)));
    posOf.set(m.to, posOf.get(m.to) + 1);
    const course = dump.course;
    const row = { ...p, id: `${course}:${newId}`, seed_number: dest.seed_number, lego_index: dest.lego_index, position: posOf.get(m.to), phrase_role: role,
      metadata: { ...(p.metadata || {}), moved_from: sid(p), moved_by: 'job #412 conozco first teaching (P25)' } };
    delete row.course_code;
    ops.push({ op: 'phrase.insert', row });
    ops.push({ op: 'phrase.delete', phrase_id: p.id, expect: { known_text: p.known_text, target_text: p.target_text } });
    moved.push({ from: sid(p), to: newId, known: p.known_text, target: p.target_text, role });
  }
  // authored rows: a fresh basket for a debut, every word taught on both sides before it (new LEGOs only teach)
  const firstK = new Map();
  for (const l of legos) if (l.is_new) for (const w of T.words(l.known_text)) { const q = [l.seed_number, l.lego_index]; const o = firstK.get(w); if (!o || q[0] < o[0] || (q[0] === o[0] && q[1] < o[1])) firstK.set(w, q); }
  const byDest = new Map();
  for (const a of authored) {
    const dest = byId.get(a.lego), at = [dest.seed_number, dest.lego_index];
    const uT = T.untaughtAt(a.target, dest, first);
    const uK = [...new Set(T.words(a.known))].filter((w) => !firstK.has(w) || (firstK.get(w)[0] > at[0] || (firstK.get(w)[0] === at[0] && firstK.get(w)[1] > at[1])));
    if (!dest.is_new) problems.push(`${a.target}: ${a.lego} is not new`);
    else if (!T.containsWords(a.target, dest.target_text) || !T.containsWords(a.known, dest.known_text)) problems.push(`${a.target}: does not contain ${a.lego} on both sides`);
    else if (uT.length || uK.length) problems.push(`${a.target}: untaught at ${a.lego} — target [${uT}] known [${uK}]`);
    const n = (byDest.get(a.lego) || 0) + 1; byDest.set(a.lego, n);
    const k = a.role === 'build' ? 'B' : 'U';
    const num = dump.phrases.filter((q) => legoOfPhrase(q) === a.lego && sid(q)[8] === k).length + authored.filter((x, i) => x.lego === a.lego && x.role === a.role && authored.indexOf(x) <= authored.indexOf(a)).length;
    const words = a.target.split(/\s+/);
    const row = { id: `${dump.course}:${a.lego}${k}${String(num).padStart(2, '0')}`, seed_number: dest.seed_number, lego_index: dest.lego_index, position: n, phrase_role: a.role,
      known_text: a.known, target_text: a.target, word_count: a.target.length, lego_count: words.length, status: 'draft', introduce: true, lego_id: a.lego, connected_lego_ids: [],
      lego_position: 'start', metadata: { format: 'build_use', source: 'spa-conozco-first-teaching-2026-10-14', job: '#412', why: 'basket for the S0085L01 debut (P30); words taught by seed 85' },
      decomposition: words.map((w) => (T.words(w)[0] === T.words(dest.target_text)[0] ? { known: dest.known_text, legoId: a.lego, target: (words.indexOf(w) ? ' ' : '') + w, isGhost: false } : { known: '', legoId: null, target: (words.indexOf(w) ? ' ' : '') + w, isGhost: true })) };
    ops.push({ op: 'phrase.insert', row });
    moved.push({ from: '(new)', to: row.id.split(':')[1], known: a.known, target: a.target, role: a.role });
  }
  return { ops, moved, problems };
}

function main() {
  const [spaPath, engPath, outDir] = process.argv.slice(2);
  if (!spaPath || !engPath || !outDir) throw new Error('usage: <spa dump> <eng_for_spa dump> <out dir>');
  const spa = plan(JSON.parse(fs.readFileSync(spaPath, 'utf8')), { legoFlips: { S0085L01: true, S0230L01: false }, moves: MOVES_SPA, authored: AUTHORED_85L01.map(([role, known, target]) => ({ lego: 'S0085L01', role, known, target })) });
  const eng = plan(JSON.parse(fs.readFileSync(engPath, 'utf8')), { legoFlips: { S0207L01: true }, moves: {} });
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'spa_for_eng.ops.json'), JSON.stringify({ ops: spa.ops }, null, 1));
  fs.writeFileSync(path.join(outDir, 'eng_for_spa.ops.json'), JSON.stringify({ ops: eng.ops }, null, 1));
  console.log(`spa_for_eng: ${spa.ops.length} ops, ${spa.moved.length} phrase moves, problems: ${spa.problems.length}`);
  for (const m of spa.moved) console.log(`  ${m.from} → ${m.to} (${m.role}) ${m.known} | ${m.target}`);
  for (const x of spa.problems.concat(eng.problems)) console.log('  PROBLEM', x);
  console.log(`eng_for_spa: ${eng.ops.length} ops, problems: ${eng.problems.length}`);
  process.exitCode = spa.problems.length + eng.problems.length ? 2 : 0;
}
module.exports = { plan, MOVES_SPA, AUTHORED_85L01 };
if (require.main === module) main();
