#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-held-650-fill-2026-11-03.cjs — job #650: fill every empty audio slot in the seeds Kai's
// 3 Nov rulings touched, cheapest source first, and nothing outside them.
//   1. the clip the slot held BEFORE the pass (seeds 71/311 were resubmitted, which drops every link — their unchanged rows
//      get their own old clips back), matched by role + exact text from the pre-pass dump; intros by the LEGO's known text
//   2. the library, through the one audio route (POST /api/audio/render, dryRun) — any clip already speaking those words
//   3. a render through the same route, once, no retry; a refusal stops the run and is reported
// Links go through POST /api/production/ita_for_eng/edit-batch audio.link (refused unless the clip speaks the row's words;
// presentation is exempt, so intro reuse is limited to the five LEGOs whose words did not change and is checked afterwards
// with tools/check-intro-mirror.cjs). Then POST …/sync-intro-links re-points lego_introductions at the LEGO's link.
//   node …cjs <pre-pass seeds.json> <fresh seeds.json>                        # plan + dry runs, no spend
//   MAX_CHARS=<n> RENDER_CONFIRM=1 node …cjs <pre-pass seeds.json> <fresh seeds.json>
const fs = require('fs');
const COURSE = 'ita_for_eng';
const AGENT = 'ita-held-30-apply (job #650)';
const PURPOSE = "job #650 ita_for_eng: Kai's 3 Nov rulings on the 30 held #36 rows — fill the slots the edits and the seed 71/311 resubmissions emptied";
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const SEEDS = [26, 71, 237, 238, 302, 311, 313, 358, 387, 413, 464, 501, 526, 563, 571, 590, 597, 619];
const ROLES = ['known', 'target1', 'target2'];
// Intros. Reused: the LEGO's previous intro clip, words unchanged (71 L01–L03 were L01/L03/L04 before the re-order).
const INTRO_REUSE = { S0071L01: '71d0edd2-2e64-438c-90b0-75fbf3642383', S0071L02: '4d1d8fd3-3d16-4be7-9380-f1167cdb9c14',
  S0071L03: '96fe2555-4c9b-4063-ad60-8b133b6fbada', S0311L01: '0fe21563-46fa-4644-b663-0231af2d84aa', S0311L02: '730b4b1f-b760-4917-aa63-dee2f3d1a120' };
// New intros, in the course's own two frames (presentation-author: B with "as in", A without). The as-in sentence contains
// the LEGO's words (the intro-mirror rule). 71 L04 gets the frame because the heard thing goes inside it (PR3, d/88dbe7f4);
// "since" gets one so it cannot be heard as "because".
const INTRO_NEW = {
  S0071L04: "The Italian for: 'let anyone hear', as in — 'we didn't want to let anyone hear the truth', is:",
  S0311L03: "The Italian for: 'to believe', is:",
  S0311L04: "The Italian for: 'to believe the facts', is:",
  S0619L02: "The Italian for: 'since', as in — 'since we first met', is:",
};
const sid = (id) => String(id).split(':').pop();
function rows(api) {
  const out = [];
  for (const s of api.seeds) {
    out.push({ kind: 'seed', key: s.seed_number, seed: s.seed_number, r: s });
    for (const l of s.legos || []) { out.push({ kind: 'lego', key: l.lego_id, seed: s.seed_number, r: l }); for (const p of l.basket_phrases || []) out.push({ kind: 'phrase', key: sid(p.id), seed: s.seed_number, r: p }); }
  }
  return out;
}
const textOf = (r, role) => (role === 'known' ? r.known_text : r.target_text);
const target = (x) => (x.kind === 'seed' ? { target: 'seed', seed_number: x.key } : x.kind === 'lego' ? { target: 'lego', lego_id: x.key } : { target: 'phrase', phrase_id: x.r.id });

function plan(before, fresh) {
  const prior = new Map(); // role|text -> clip id (pre-pass)
  for (const x of rows(before)) for (const role of ROLES) { const id = x.r[`${role}_audio_id`]; const t = textOf(x.r, role); if (id && t && !prior.has(`${role}|${t}`)) prior.set(`${role}|${t}`, id); }
  const slots = [];
  for (const x of rows(fresh)) {
    if (!SEEDS.includes(x.seed)) continue;
    for (const role of ROLES) if (!x.r[`${role}_audio_id`]) slots.push({ x, role, text: textOf(x.r, role) });
    if (x.kind === 'lego' && x.r.is_new && !x.r.presentation_audio_id) slots.push({ x, role: 'presentation', text: INTRO_NEW[x.key] || null, reuse: INTRO_REUSE[x.key] || null });
  }
  for (const s of slots) {
    if (s.role === 'presentation') { s.source = s.reuse ? 'prior' : s.text ? 'ask' : 'NO-INTRO-TEXT'; s.audioId = s.reuse; continue; }
    const p = prior.get(`${s.role}|${s.text}`);
    if (p) { s.source = 'prior'; s.audioId = p; } else s.source = 'ask';
  }
  return slots;
}

async function post(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body), signal: AbortSignal.timeout(300000) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

async function main() {
  const [bf, ff] = process.argv.slice(2); if (!bf || !ff) throw new Error('usage: <pre-pass seeds.json> <fresh seeds.json>');
  const slots = plan(JSON.parse(fs.readFileSync(bf, 'utf8')), JSON.parse(fs.readFileSync(ff, 'utf8')));
  const bad = slots.filter((s) => s.source === 'NO-INTRO-TEXT'); if (bad.length) throw new Error(`no intro text for ${bad.map((s) => s.x.key)}`);
  // one ask per (role, text, intro LEGO)
  const asks = new Map();
  for (const s of slots.filter((q) => q.source === 'ask')) { const k = `${s.role}|${s.text}|${s.role === 'presentation' ? s.x.key : ''}`; if (!asks.has(k)) asks.set(k, { role: s.role, text: s.text, legoId: s.role === 'presentation' ? s.x.key : undefined, slots: [] }); asks.get(k).slots.push(s); }
  let chars = 0;
  for (const a of asks.values()) {
    const d = await post(`${POPTY}/api/audio/render`, { courseCode: COURSE, role: a.role, text: a.text, ...(a.legoId ? { legoId: a.legoId } : {}), purpose: PURPOSE, dryRun: true });
    a.dry = d.body; if (d.body.ok && d.body.source === 'library') a.audioId = d.body.audioId; else if (d.body.ok) chars += d.body.wouldSpendChars || a.text.length;
  }
  const lib = [...asks.values()].filter((a) => a.audioId).length, refused = [...asks.values()].filter((a) => !a.dry.ok);
  console.log(`slots ${slots.length}: ${slots.filter((s) => s.source === 'prior').length} from the pre-pass clip, ${asks.size} asks (${lib} library, ${asks.size - lib - refused.length} to render = ${chars} chars, ${refused.length} refused)`);
  for (const a of refused) console.log('  REFUSED', a.role, JSON.stringify(a.text), JSON.stringify(a.dry).slice(0, 200));
  for (const a of asks.values()) if (!a.audioId && a.dry.ok) console.log('  render', a.role, JSON.stringify(a.text));
  const max = Number(process.env.MAX_CHARS);
  let spent = 0;
  if (process.env.RENDER_CONFIRM === '1' && Number.isFinite(max) && chars <= max && !refused.length) {
    for (const a of asks.values()) {
      if (a.audioId) continue;
      const r = await post(`${POPTY}/api/audio/render`, { courseCode: COURSE, role: a.role, text: a.text, ...(a.legoId ? { legoId: a.legoId } : {}), purpose: PURPOSE });
      if (!r.body.ok) { console.log('REFUSED — no retry:', a.role, JSON.stringify(a.text), JSON.stringify(r.body).slice(0, 300)); break; }
      a.audioId = r.body.audioId; spent += r.body.charsSpent || 0;
    }
  } else if (process.env.RENDER_CONFIRM === '1') console.log('STOP: nothing rendered (no MAX_CHARS, over it, or a refusal)');
  for (const a of asks.values()) for (const s of a.slots) s.audioId = a.audioId;
  const ops = slots.filter((s) => s.audioId).map((s) => ({ op: 'audio.link', ...target(s.x), slot: s.role, audio_id: s.audioId }));
  console.log(`chars spent ${spent}; ${ops.length} links of ${slots.length} slots`);
  const BATCH = 25; const events = [];
  for (let i = 0; i < ops.length; i += BATCH) {
    const body = { ops: ops.slice(i, i + BATCH), ...(process.env.RENDER_CONFIRM === '1' ? { apply: true } : {}) };
    const r = await post(`${POPTY}/api/production/${COURSE}/edit-batch`, body);
    events.push(r.body.event_id); console.log(`link batch ${i / BATCH + 1}: ${r.status} ${r.body.event_id || ''} ${r.body.error || ''} ${r.body.index ?? ''}`);
    if (r.status !== 200) break;
  }
  if (process.env.RENDER_CONFIRM === '1') {
    const s = await post(`${POPTY}/api/production/${COURSE}/sync-intro-links`, { apply: true });
    console.log('sync-intro-links:', s.status, JSON.stringify(s.body).slice(0, 300));
  }
  fs.writeFileSync(process.env.LOG || `${process.env.CS_SCRATCH || '.'}/fill-650.json`, JSON.stringify({ spent, events, asks: [...asks.values()].map((a) => ({ role: a.role, text: a.text, legoId: a.legoId, audioId: a.audioId, dry: a.dry, n: a.slots.length })) }, null, 1));
}
if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
module.exports = { plan };
