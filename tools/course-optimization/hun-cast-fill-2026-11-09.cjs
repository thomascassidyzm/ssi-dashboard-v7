#!/usr/bin/env node
'use strict';
// Hungarian gap fill (job #599, Kai 9 Nov 2026 14:54Z: cast Cartesia Eszter target1 / Bence target2, accept the voice
// changing partway through the course, fill ONLY the empty target slots, never re-voice the Noemi/Tamas clips).
// Slots are read live from Popty (GET /api/production/:course/seeds); nothing here touches the DB.
// Scope: LEGOs + practice phrases with an empty target1/target2 slot, and seed-level target slots for seeds <= SEED_MAX
// (seeds 301-668 carry no seed-level target audio at all; that is a separate question, not this fill).
//   node …cjs plan                       # counts + characters, no calls
//   node …cjs dry|render <log.jsonl>      # ONE /api/audio/render per distinct (role,text); stops on the first non-200
//   node …cjs link-dry|link <log.jsonl>   # link-clip (fill-only) every empty slot whose (role,text) has a logged clip
const fs = require('fs');
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const COURSE = 'hun_for_eng';
const AGENT = 'kai-599-hun-cast-fill';
const PURPOSE = 'job #599 hun fill empty target slots in cast Eszter/Bence (Kai 9 Nov 2026)';
const SEED_MAX = 300;
const ROLES = ['target1', 'target2'];

/** Pure. Every empty target slot in the seeds payload, in scope. */
function emptySlots(seeds) {
  const out = [];
  const chk = (o, slot) => { if (o && o.target_text) for (const role of ROLES) if (!o[`${role}_audio_id`]) out.push({ ...slot, role, text: o.target_text }); };
  for (const s of seeds) {
    if (s.seed_number <= SEED_MAX) chk(s, { seedNumber: s.seed_number });
    for (const l of s.legos || []) {
      chk(l, { legoId: l.lego_id });
      for (const p of l.basket_phrases || []) chk(p, { phraseId: p.id });
    }
  }
  return out;
}
const keyOf = (x) => `${x.role}\0${x.text}`;
// The route refuses a second performance of words already recorded in hun (EXISTS_IN_LANGUAGE) and names the clips: those
// slots are linked to the existing clip, free — but only a clip in the SAME gender as the slot (target1 = f, target2 = m),
// so a male line never lands in the female slot. A refusal with no same-gender clip is left empty and counted.
const GENDER = { 'azure_hu-HU-NoemiNeural': 'f', 'cartesia_e97c3b37-1aa5-46af-afb7-9545086aaa92': 'f', 'azure_hu-HU-TamasNeural': 'm', 'cartesia_4c5c7be8-6b3b-4c62-b915-c54d049c198f': 'm' };
const ROLE_GENDER = { target1: 'f', target2: 'm' };
/** Pure. The clip a logged answer offers for its slot: a fresh/library clip, or a same-gender existing hun clip. */
function clipFor(l) {
  if (!l.body) return null;
  if (l.body.ok && l.body.audioId && !l.body.dryRun) return l.body.audioId;
  if (l.body.code === 'EXISTS_IN_LANGUAGE') {
    const same = (l.body.existing || []).filter((e) => GENDER[e.voiceId] === ROLE_GENDER[l.role]);
    const pick = same.find((e) => e.courseCode === COURSE && e.side === l.role) || same[0];
    return pick ? pick.audioId : null;
  }
  return null;
}

const call = async (path, body) => {
  const r = await fetch(`${POPTY}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body), signal: AbortSignal.timeout(300000) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};
const live = async () => emptySlots((await (await fetch(`${POPTY}/api/production/${COURSE}/seeds`)).json()).seeds);

if (require.main === module) (async () => {
  const [mode, log] = process.argv.slice(2);
  const slots = await live();
  const asks = new Map(); for (const x of slots) if (!asks.has(keyOf(x))) asks.set(keyOf(x), x);
  if (mode === 'plan') {
    const by = {}; for (const x of slots) { const k = `${Object.keys(x)[0]}:${x.role}`; by[k] = (by[k] || 0) + 1; }
    console.log('slots', slots.length, JSON.stringify(by), 'distinct asks', asks.size, 'chars', [...asks.values()].reduce((n, x) => n + [...x.text].length, 0));
    return;
  }
  if (mode === 'dry' || mode === 'render') {
    const seen = new Set(fs.existsSync(log) ? fs.readFileSync(log, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((l) => (l.status === 200 && !l.body.dryRun) || (l.body && l.body.code === 'EXISTS_IN_LANGUAGE')).map((l) => l.k) : []);
    let n = 0, chars = 0; const src = {};
    for (const [k, x] of asks) {
      if (seen.has(k)) continue; n++;
      let r;
      try { r = await call('/api/audio/render', { courseCode: COURSE, role: x.role, text: x.text, purpose: PURPOSE, dryRun: mode === 'dry' }); } catch (e) { r = { status: 0, body: { error: String(e.name) } }; }
      fs.appendFileSync(log, JSON.stringify({ k, role: x.role, text: x.text, status: r.status, body: r.body }) + '\n');
      if (r.body && r.body.code === 'EXISTS_IN_LANGUAGE') { src[clipFor({ role: x.role, body: r.body }) ? 'exists-same-gender' : 'exists-other-gender-only'] = (src[clipFor({ role: x.role, body: r.body }) ? 'exists-same-gender' : 'exists-other-gender-only'] || 0) + 1; continue; }
      if (r.status !== 200 || !r.body.ok) { console.log('STOP', r.status, JSON.stringify(r.body).slice(0, 400)); break; }
      src[r.body.source] = (src[r.body.source] || 0) + 1; chars += r.body.wouldSpendChars || r.body.charsSpent || 0;
      const v = r.body.voiceId; src[`voice ${x.role} ${v}`] = (src[`voice ${x.role} ${v}`] || 0) + 1;
    }
    console.log(mode, 'asks', n, 'of', asks.size, 'chars', chars, JSON.stringify(src));
    return;
  }
  if (mode === 'link-dry' || mode === 'link') {
    const clip = new Map(); for (const l of fs.readFileSync(log, 'utf8').split('\n').filter(Boolean).map((x) => JSON.parse(x))) if (clipFor(l)) clip.set(l.k, clipFor(l));
    const links = slots.filter((x) => clip.has(keyOf(x))).map(({ text, ...slot }) => ({ ...slot, audioId: clip.get(keyOf({ role: slot.role, text })) }));
    let ok = 0, linked = 0; const bad = [];
    for (let i = 0; i < links.length; i += 400) {
      const r = await call(`/api/production/${COURSE}/link-clip`, { links: links.slice(i, i + 400), dryRun: mode === 'link-dry' });
      if (!r.body.results) { console.log(r.status, JSON.stringify(r.body).slice(0, 400)); break; }
      ok += r.body.results.filter((x) => x.ok).length; linked += r.body.linked || 0; bad.push(...r.body.results.filter((x) => !x.ok));
    }
    const codes = {}; for (const x of bad) codes[x.code] = (codes[x.code] || 0) + 1;
    console.log(mode, 'links', links.length, 'ok', ok, 'linked', linked, 'refused', bad.length, JSON.stringify(codes), JSON.stringify(bad.slice(0, 3)));
    return;
  }
  console.error('usage: plan | dry|render <log> | link-dry|link <log>'); process.exit(1);
})();
module.exports = { emptySlots, clipFor };
