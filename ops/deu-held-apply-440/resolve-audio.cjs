#!/usr/bin/env node
'use strict';
// cs #440·AI: for every audio slot build-ops.cjs says a block needs, find the clip.
//   node resolve-audio.cjs <dump.json> <outdir> [--render]
// 1. a clip already linked in this course to a row with exactly these words in the same slot (free, same performance);
// 2. else Popty's render route (library first, spend guard, ONE render) — dry run unless --render;
//    EXISTS_IN_LANGUAGE answers name this course's clips of the words: the same-side one is linked instead.
// Writes <outdir>/audio-plan.json: {key: {role, text, audioId|null, source, chars}}.
const fs = require('fs');
const path = require('path');
const [dumpFile, outDir] = process.argv.slice(2);
const RENDER = process.argv.includes('--render');
const d = JSON.parse(fs.readFileSync(dumpFile, 'utf8'));
const need = JSON.parse(fs.readFileSync(path.join(outDir, 'audio-need.json'), 'utf8'));
const planFile = path.join(outDir, 'audio-plan.json');
const plan = fs.existsSync(planFile) ? JSON.parse(fs.readFileSync(planFile, 'utf8')) : {};
const intro = (k) => `The German for: '${k}', is: <break time="300ms"/> <break time="10ms"/>`;
const n = (s) => String(s || '').toLowerCase().normalize('NFC').replace(/[^\p{L}\p{N}' ]/gu, ' ').replace(/\s+/g, ' ').trim();
// slot index from the dump: (slot, normalised words) -> clip ids
const idx = new Map();
const add = (slot, text, id) => { if (!id) return; const k = `${slot}|${n(text)}`; if (!idx.has(k)) idx.set(k, []); if (!idx.get(k).includes(id)) idx.get(k).push(id); };
for (const r of [...d.seeds, ...d.legos, ...d.phrases]) { add('known', r.known_text, r.known_audio_id); add('target1', r.target_text, r.target1_audio_id); add('target2', r.target_text, r.target2_audio_id); }
for (const i of d.intros) if (i.text) add('presentation', i.text, i.audio_id);
const AGENT = 'cs #440·AI for Kai (deu held items, rulings 17 Nov 2026)';
// Kai's approval (r-2026-10-30) is sent ONLY where the route's EXISTS_IN_LANGUAGE answer names no clip of these words in this
// course to link (the words exist only in other courses): that refusal itself names the grant as the way through. Never a retry
// of a spend refusal (402 / DAILY_TOTAL_CAP / REPEAT / NOT_IN_CHAIN), which stand as the answer.
const APPROVAL = 'kai:2026-11-17:deu_for_eng held items (Kai rulings 17 Nov); words exist only in other courses';
async function render(role, text, approval) {
  const headers = { 'Content-Type': 'application/json', 'x-agent-id': AGENT, ...(approval ? { 'x-cs-conv': process.env.CS_CONV_TOKEN } : {}) };
  const res = await fetch('http://localhost:3470/api/audio/render', { method: 'POST', headers,
    body: JSON.stringify({ courseCode: d.course, role, text, purpose: 'deu_for_eng held items, Kai rulings 17 Nov 2026 (cs #440·AI)', dryRun: !RENDER, job: '#440·AI', ...(approval ? { approval } : {}) }) });
  return res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
}
(async () => {
  const want = [];
  for (const rows of Object.values(need)) for (const r of rows) for (const slot of r.slots) {
    const role = slot; const text = slot === 'presentation' ? intro(r.known) : slot === 'known' ? r.known : r.target;
    want.push({ role, text });
  }
  let chars = 0;
  for (const { role, text } of want) {
    const key = `${role}|${text}`;
    if (plan[key] && plan[key].audioId) continue;
    const dumpHit = idx.get(`${role}|${n(text)}`);
    if (dumpHit && role !== 'presentation') { plan[key] = { role, text, audioId: dumpHit[0], source: 'linked-in-course', chars: 0 }; continue; }
    let a = await render(role, text);
    if (RENDER && a.code === 'EXISTS_IN_LANGUAGE' && !(a.existing || []).some((e) => e.courseCode === d.course)) a = { ...(await render(role, text, APPROVAL)), approved: true };
    if (a.ok && a.audioId) plan[key] = { role, text, audioId: a.audioId, source: a.source + (a.approved ? '+kai-approval' : ''), chars: a.charsSpent || 0, voiceId: a.voiceId };
    else if (a.ok && a.source === 'would-render') { plan[key] = { role, text, audioId: null, source: 'would-render', chars: a.wouldSpendChars }; chars += a.wouldSpendChars; }
    else if (a.code === 'EXISTS_IN_LANGUAGE') {
      const ex = (a.existing || []).filter((e) => e.courseCode === d.course);
      const pick = ex.find((e) => e.side === role) || ex[0];
      plan[key] = { role, text, audioId: pick ? pick.audioId : null, source: pick ? `exists-in-language:${pick.side}:${pick.voiceId}` : 'EXISTS_ELSEWHERE', chars: 0, existing: pick ? undefined : a.existing };
    } else plan[key] = { role, text, audioId: null, source: 'REFUSED', code: a.code, error: a.error };
    if (RENDER && a.ok) chars += a.charsSpent || 0;
    if (RENDER && chars > 32000) { console.log('STOP: over 32,000 characters'); break; }
    if (RENDER && !a.ok && a.code !== 'EXISTS_IN_LANGUAGE') { console.log('STOP: refusal is the answer —', a.code, a.error); break; }
    fs.writeFileSync(planFile, JSON.stringify(plan, null, 1));
  }
  fs.writeFileSync(planFile, JSON.stringify(plan, null, 1));
  const v = Object.values(plan); const by = {}; for (const x of v) by[x.source.split(':')[0]] = (by[x.source.split(':')[0]] || 0) + 1;
  console.log(JSON.stringify(by), 'chars', v.reduce((s, x) => s + (x.chars || 0), 0));
})();
