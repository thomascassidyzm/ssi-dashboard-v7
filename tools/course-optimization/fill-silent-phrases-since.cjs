#!/usr/bin/env node
// Job #431 (Kai's OK 2026-10-14): fill practice-phrase audio slots left silent on rows edited since a date.
// Reads silent slots (agent login, read-only), asks POST /api/audio/render for each DISTINCT (role,text) —
// the route is library-first and links/writes back the course rows itself, so nothing here writes the DB.
//   node …/fill-silent-phrases-since.cjs <course> [--since 2026-10-01]                 # census + route dry runs
//   RENDER=1 MAX_CHARS=10000 node … <course>                                          # real calls, ONCE each, stop on first 402
// A refusal is the answer: recorded, never retried. Exceeding MAX_CHARS in the dry run stops before any real call.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
const db = require('../../services/shared/agent-db.cjs');

const ROLE_COL = { known: ['known_audio_id', 'known_text'], target1: ['target1_audio_id', 'target_text'], target2: ['target2_audio_id', 'target_text'] };
const PURPOSE = 'job #431 fill silent after 2 Oct fix pass';

/** Group silent slots into distinct (role,text) asks, keeping the phrase ids behind each. */
function asks(rows) {
  const m = new Map();
  for (const r of rows) for (const [role, [col, tcol]] of Object.entries(ROLE_COL)) {
    if (r[col] || !r[tcol]) continue;
    const k = `${role}\u0000${r[tcol]}`;
    if (!m.has(k)) m.set(k, { role, text: r[tcol], ids: [] });
    m.get(k).ids.push(r.id);
  }
  return [...m.values()];
}

async function call(body, url = process.env.POPTY_URL || 'http://localhost:3470') {
  // A hung or dropped request (Popty restarts on every main push) is recorded as status 0, never retried here;
  // the next run's dry pass finds the clip in the library if the server finished it anyway.
  try {
    const r = await fetch(`${url}/api/audio/render`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': 'fill-silent-phrases-since (job #431)' }, body: JSON.stringify(body), signal: AbortSignal.timeout(120000) });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  } catch (e) { return { status: 0, body: { ok: false, error: String(e.cause && e.cause.code || e.name) } }; }
}

async function main() {
  const course = process.argv[2]; const i = process.argv.indexOf('--since');
  const since = i > 0 ? process.argv[i + 1] : '2026-10-01';
  const RENDER = process.env.RENDER === '1', MAX = +(process.env.MAX_CHARS || 10000);
  const pg = await db.connect();
  const { rows } = await pg.query('SELECT id, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND updated_at >= $2 AND (known_audio_id IS NULL OR target1_audio_id IS NULL OR target2_audio_id IS NULL) ORDER BY id', [course, since]);
  await pg.end();
  const list = asks(rows);
  const slots = rows.reduce((n, r) => n + Object.values(ROLE_COL).filter(([c]) => !r[c]).length, 0);
  console.log(`${course}: ${rows.length} phrases edited since ${since} with a silent slot; ${slots} silent slots; ${list.length} distinct asks`);
  const tally = { library: 0, wouldRender: 0, chars: 0, refused: [], rendered: 0, spent: 0 };
  const plan = [];
  for (const a of list) {
    const d = await call({ courseCode: course, role: a.role, text: a.text, purpose: PURPOSE, dryRun: true });
    if (d.status !== 200 || !d.body.ok) { tally.refused.push({ ...a, status: d.status, answer: d.body }); continue; }
    if (d.body.source === 'library') tally.library++; else { tally.wouldRender++; tally.chars += d.body.wouldSpendChars || a.text.length; }
    plan.push(a);
  }
  console.log(`DRY: ${tally.library} from library, ${tally.wouldRender} would render (${tally.chars} chars), ${tally.refused.length} refused`);
  for (const r of tally.refused) console.log('  REFUSED', r.role, JSON.stringify(r.text), r.status, JSON.stringify(r.answer));
  if (!RENDER) return;
  if (tally.chars > MAX) { console.log(`STOP: ${tally.chars} chars > MAX_CHARS ${MAX}; nothing rendered`); return; }
  tally.refused = [];
  for (const a of plan) {
    const r = await call({ courseCode: course, role: a.role, text: a.text, purpose: PURPOSE });
    if (r.status !== 200 || !r.body.ok) { tally.refused.push({ ...a, status: r.status, answer: r.body }); console.log('  REFUSED', a.role, JSON.stringify(a.text), r.status, JSON.stringify(r.body)); if (r.status === 402) break; continue; }
    if (r.body.source === 'rendered') { tally.rendered++; tally.spent += r.body.charsSpent || 0; }
    // The route stores the clip but does not point these phrase rows at it: fill the slots through link-clip (fill-only, text-checked).
    const url = process.env.POPTY_URL || 'http://localhost:3470';
    try {
      const l = await fetch(`${url}/api/production/${course}/link-clip`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': 'fill-silent-phrases-since (job #431)' }, body: JSON.stringify({ links: a.ids.map((phraseId) => ({ phraseId, role: a.role, audioId: r.body.audioId })) }), signal: AbortSignal.timeout(120000) });
      const lj = await l.json().catch(() => ({}));
      tally.linked = (tally.linked || 0) + (lj.linked || 0);
      if (!l.ok) console.log('  LINK-REFUSED', a.role, JSON.stringify(a.text), l.status, JSON.stringify(lj).slice(0, 300));
    } catch (e) { console.log('  LINK-FAILED', a.role, JSON.stringify(a.text), String(e.cause && e.cause.code || e.name)); }
  }
  console.log(`DONE: rendered ${tally.rendered} (${tally.spent} chars), slots linked ${tally.linked || 0}, refused ${tally.refused.length}`);
}
module.exports = { asks };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
