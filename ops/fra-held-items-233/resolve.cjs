#!/usr/bin/env node
'use strict';
// cs #233: find a clip for every audio slot a family plan needs (after #440·AI's resolve-audio.cjs).
//   node resolve.cjs <course-dump.json> <plan.json> [--render]
// 1. a clip this course ALREADY links in the same slot to a row with exactly these words (free, same performance);
// 2. else Popty's one audio route POST /api/audio/render (library first, spend guard, ONE render) — dry run unless --render.
//    An EXISTS_IN_LANGUAGE answer that names this course's clip of the words in the same side links that clip; any other
//    refusal is the answer: recorded, never retried or re-routed, and the run STOPS there.
// Writes plan.audio = {"<slot>|<text>": {audioId|null, source, chars}}.
const fs = require('fs');
const [dumpFile, planFile] = process.argv.slice(2);
const RENDER = process.argv.includes('--render');
const d = JSON.parse(fs.readFileSync(dumpFile, 'utf8'));
const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
plan.audio = plan.audio || {};
const n = (s) => String(s || '').toLowerCase().normalize('NFC').replace(/[^\p{L}\p{N}' ]/gu, ' ').replace(/\s+/g, ' ').trim();
const idx = new Map();
const add = (slot, text, id) => { if (!id) return; const k = `${slot}|${n(text)}`; if (!idx.has(k)) idx.set(k, id); };
// rows this plan changes are excluded: their CURRENT clip speaks the old words of a row we are rewriting
const touched = new Set(plan.ops.map((o) => o.phrase_id || o.lego_id || (o.seed_number != null ? `seed:${o.seed_number}` : null)));
for (const r of d.seeds) if (!touched.has(`seed:${r.seed_number}`)) { add('known', r.known_text, r.known_audio_id); add('target1', r.target_text, r.target1_audio_id); add('target2', r.target_text, r.target2_audio_id); }
for (const r of [...d.legos, ...d.phrases]) if (!touched.has(r.lego_id) && !touched.has(r.id)) { add('known', r.known_text, r.known_audio_id); add('target1', r.target_text, r.target1_audio_id); add('target2', r.target_text, r.target2_audio_id); }
const AGENT = 'kai-233-fra-held';
const CAST = { known: 'cartesia_d293d509-eb96-4df4-8cfd-80a693aa49a9', target1: 'cartesia_5f83e88f-9b5a-4563-95c4-904f4b0036e9', target2: 'cartesia_ab636c8b-9960-4fb3-bb0c-b7b655fb9745' };
const CASTG = { known: 'm', target1: 'f', target2: 'm' };
const GENDER = (v) => (/Henri|Ryan|Oliver|Thomas|Alfie|Elliot|Ethan|Noah|Remy|Alain|Claude|Jerome|Yves|Guy/i.test(v) ? 'm' : /Celeste|Sonia|Libby|Denise|Eloise|Vivienne|Coralie|Brigitte|Jacqueline|Josephine|Maisie|Abbi|Bella|Hollie|Olivia/i.test(v) ? 'f' : '?');
async function render(role, text, legoId) {
  const res = await fetch('http://localhost:3470/api/audio/render', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT },
    body: JSON.stringify({ courseCode: d.course, role, text, legoId, purpose: `fra_for_eng held items #424·AI applied for Kai (cs #233, ${plan.family})`, dryRun: !RENDER }) });
  return res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
}
(async () => {
  let spent = 0; let stop = null;
  for (const x of plan.need) {
    const key = `${x.slot}|${x.text}`;
    if (plan.audio[key] && plan.audio[key].audioId) continue;
    const hit = x.slot !== 'presentation' && idx.get(`${x.slot}|${n(x.text)}`);
    if (hit) { plan.audio[key] = { audioId: hit, source: 'linked-in-course', chars: 0 }; continue; }
    if (stop) continue;
    const a = await render(x.slot, x.text); // no legoId: the presentation link happens inside the edit batch, with the text
    if (a.ok && a.audioId) { plan.audio[key] = { audioId: a.audioId, source: a.source, chars: a.charsSpent || 0, voiceId: a.voiceId }; spent += a.charsSpent || 0; }
    else if (a.ok && !RENDER) plan.audio[key] = { audioId: null, source: a.source || 'would-render', chars: a.wouldSpendChars || a.charsSpent || 0, voiceId: a.voiceId };
    else if (a.code === 'EXISTS_IN_LANGUAGE') {
      // The route's answer names the clips that already say these words and offers "link an existing clip". Kai, 18 Nov:
      // "fill whatever needs filling, doesn't matter if it doesn't match the voice that's already there." So the best of
      // the NAMED clips is linked (this course's cast voice > same side > same gender as the slot's cast); nothing is
      // rendered, no grant is sent. A per-text answer, so the run goes on to the next slot.
      const score = (e) => (e.courseCode === d.course ? 8 : 0) + (e.voiceId === CAST[x.slot] ? 4 : 0) + (e.side === x.slot ? 2 : 0) + (GENDER(e.voiceId) === CASTG[x.slot] ? 1 : 0);
      const pick = [...(a.existing || [])].sort((p, q) => score(q) - score(p))[0];
      plan.audio[key] = pick ? { audioId: pick.audioId, source: `exists-in-language:${pick.courseCode}:${pick.side}:${pick.voiceId}`, chars: 0, refusal: a.error }
        : { audioId: null, source: 'REFUSED', code: a.code, error: a.error, existing: a.existing };
    } else { plan.audio[key] = { audioId: null, source: 'REFUSED', code: a.code, error: a.error }; if (RENDER) stop = `${a.code} ${a.error}`; }
    fs.writeFileSync(planFile, JSON.stringify(plan, null, 1));
  }
  fs.writeFileSync(planFile, JSON.stringify(plan, null, 1));
  const v = Object.values(plan.audio); const by = {};
  for (const x of v) by[x.source.split(':')[0]] = (by[x.source.split(':')[0]] || 0) + 1;
  console.log(plan.family, JSON.stringify(by), 'chars', v.reduce((s, x) => s + (x.chars || 0), 0), 'spent now', spent, stop ? `STOP: ${stop}` : '');
})();
