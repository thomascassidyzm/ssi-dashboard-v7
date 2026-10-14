#!/usr/bin/env node
'use strict';
// Job #458, cat_for_eng. Tom cast Catalan in Popty (Alba target1, Enric target2; ec39bf9a9), so the 5 Oct bracket-tag
// pass's stale slots can be filled the sanctioned way: the one render route WITHOUT a voiceId (known takes the course
// cast), then Popty's link-clip to swap the pointer (replace + expectCurrent). Nothing here writes the DB itself.
// The 5 Oct tool's AUDIO=1 path hand-picked Sonia and swapped links over SQL — do not use it.
//   node …/cat-render-after-cast-2026-10-14.cjs                 # census + route dry runs (nothing rendered)
//   RENDER=1 MAX_CHARS=25000 node …                             # real calls, ONCE each, stop on first 402
// Slots covered: known/target1/target2 of the plan's LEGOs and phrases whose clip does not say the row's words (or is
// empty), plus silent slots on phrases edited since SINCE. Presentation (intro) slots are only COUNTED: link-clip does
// not sync lego_introductions, so they stay out until Tom's side owns a route that does.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
const db = require('../../services/shared/agent-db.cjs');
const { normalizeForDb } = require('../../services/shared/text-normalize.cjs');
const D = require('./cat-bracket-tags-2026-10-05.data.cjs');

const COURSE = D.COURSE;
const URL = process.env.POPTY_URL || 'http://localhost:3470';
const AGENT = 'cat-render-after-cast (job #458)';
const PURPOSE = 'job #458 cat_for_eng K42 stale/silent slots after Catalan cast';
const COLS = { known: ['known_audio_id', 'known_text'], target1: ['target1_audio_id', 'target_text'], target2: ['target2_audio_id', 'target_text'] };

const post = async (p, body) => {
  try {
    const r = await fetch(`${URL}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body), signal: AbortSignal.timeout(120000) });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  } catch (e) { return { status: 0, body: { ok: false, error: String(e.cause && e.cause.code || e.name) } }; }
};

/** Slots needing a clip: empty, or linked to a clip that does not say the row's words (the rule link-clip enforces). */
function staleSlots(rows, clips, kind) {
  const out = [];
  for (const r of rows) {
    const roles = r.phrase_role === 'component' ? ['known'] : Object.keys(COLS);
    for (const role of roles) {
      const [col, tcol] = COLS[role];
      const text = r[tcol]; if (!text) continue;
      const cur = r[col] ? String(r[col]) : null;
      const c = cur && clips.get(cur);
      if (c && normalizeForDb(c.text) === normalizeForDb(text)) continue;
      out.push({ kind, ref: kind === 'lego' ? r.lego_id : r.id, role, text, current: cur });
    }
  }
  return out;
}

async function main() {
  const since = process.env.SINCE || '2026-10-01';
  const RENDER = process.env.RENDER === '1', MAX = +(process.env.MAX_CHARS || 25000);
  const held = new Set(D.HELD.map((h) => h.id));
  const legoIds = Object.keys(D.LEGOS).filter((id) => !held.has(id));
  const phraseIds = Object.keys(D.PHRASES).map((id) => `${COURSE}:${id}`);
  const pg = await db.connect();
  const L = (await pg.query('SELECT lego_id, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id, is_new FROM course_legos WHERE course_code=$1 AND lego_id = ANY($2)', [COURSE, legoIds])).rows;
  const P = (await pg.query('SELECT id, phrase_role, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND (id = ANY($2) OR (updated_at >= $3 AND (known_audio_id IS NULL OR target1_audio_id IS NULL OR target2_audio_id IS NULL)))', [COURSE, phraseIds, since])).rows;
  const ids = [...L, ...P].flatMap((r) => [r.known_audio_id, r.target1_audio_id, r.target2_audio_id, r.presentation_audio_id]);
  const clips = await db.clipMap(pg, ids, { cols: 'id::text AS id, text, voice_id' });
  await pg.end();
  const slots = [...staleSlots(L, clips, 'lego'), ...staleSlots(P, clips, 'phrase')];
  const asks = new Map();
  for (const s of slots) { const k = `${s.role}\u0000${s.text}`; if (!asks.has(k)) asks.set(k, { role: s.role, text: s.text, slots: [] }); asks.get(k).slots.push(s); }
  console.log(`${COURSE}: ${L.length} plan LEGOs, ${P.length} phrases in scope; ${slots.length} stale/silent slots (known/target); ${asks.size} distinct asks; intro slots NOT touched (link-clip does not sync lego_introductions)`);

  const tally = { library: 0, wouldRender: 0, chars: 0, refused: [] };
  const plan = [];
  for (const a of asks.values()) {
    const d = await post('/api/audio/render', { courseCode: COURSE, role: a.role, text: a.text, purpose: PURPOSE, dryRun: true });
    if (d.status !== 200 || !d.body.ok) { tally.refused.push({ ...a, status: d.status, answer: d.body }); continue; }
    if (d.body.source === 'library') tally.library++; else { tally.wouldRender++; tally.chars += d.body.wouldSpendChars || a.text.length; }
    plan.push(a);
  }
  const byRole = {}; for (const a of plan) byRole[a.role] = (byRole[a.role] || 0) + 1;
  console.log(`DRY: ${tally.library} library, ${tally.wouldRender} would render (${tally.chars} chars), ${tally.refused.length} refused; plan by role ${JSON.stringify(byRole)}`);
  for (const r of tally.refused.slice(0, 15)) console.log('  REFUSED', r.role, JSON.stringify(r.text), r.status, JSON.stringify(r.answer).slice(0, 200));
  if (!RENDER) return;
  if (tally.chars > MAX) { console.log(`STOP: ${tally.chars} chars > MAX_CHARS ${MAX}; nothing rendered`); return; }

  const out = { rendered: 0, spent: 0, linked: 0, linkRefused: [], refused: [] };
  for (const a of plan) {
    const r = await post('/api/audio/render', { courseCode: COURSE, role: a.role, text: a.text, purpose: PURPOSE });
    if (r.status !== 200 || !r.body.ok) { out.refused.push({ role: a.role, text: a.text, status: r.status, answer: r.body }); console.log('  REFUSED', a.role, JSON.stringify(a.text), r.status, JSON.stringify(r.body).slice(0, 200)); if (r.status === 402) break; continue; }
    if (r.body.source === 'rendered') { out.rendered++; out.spent += r.body.charsSpent || 0; }
    const links = a.slots.map((s) => ({ ...(s.kind === 'lego' ? { legoId: s.ref } : { phraseId: s.ref }), role: s.role, audioId: r.body.audioId, ...(s.current ? { replace: true, expectCurrent: s.current } : {}) }));
    const l = await post(`/api/production/${COURSE}/link-clip`, { links });
    out.linked += l.body.linked || 0;
    for (const x of l.body.results || []) if (!x.ok) { out.linkRefused.push(x); console.log('  LINK-REFUSED', JSON.stringify(x).slice(0, 250)); }
    if (l.status !== 200 && !(l.body.results || []).length) console.log('  LINK-HTTP', l.status, JSON.stringify(l.body).slice(0, 250));
  }
  console.log(`DONE: rendered ${out.rendered} (${out.spent} chars), slots linked ${out.linked}, render-refused ${out.refused.length}, link-refused ${out.linkRefused.length}`);
}
module.exports = { staleSlots };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
