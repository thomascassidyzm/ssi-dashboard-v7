#!/usr/bin/env node
'use strict';
// eng_for_hin S0607/S0117 re-cut (job #508) follow-up, job #524: fill the ENGLISH (target1/target2) slots the re-cut left empty,
// through the ONE audio route (POST /api/audio/render: library-first, spend guard, one render, no retries). Kai approved the English
// fill on 29 Oct 2026. Hindi (known) slots are NOT asked for: hin has no Tom-chosen cast, Popty refuses them VOICE_NOT_CAST, and that is correct.
//   node …cjs list                        # prints the empty slots (from GET /api/production/eng_for_hin/seeds), English and Hindi apart
//   node …cjs dry|render <log.jsonl>      # one call per distinct (role,text); stops on the first 402 or network failure; never retries
//   node …cjs link-dry|link <log.jsonl>   # render files a clip in the library but does not fill the slot: POST link-clip (fill-only, text-checked) for each English slot
const fs = require('fs');
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const COURSE = 'eng_for_hin', SEEDS = [607, 117];
const PURPOSE = 'job #524 fill of eng_for_hin S0607/S0117 re-cut slots (Kai approved 29 Oct)';
const SLOTS = ['known', 'target1', 'target2'];

async function empties() {
  const j = await (await fetch(`${POPTY}/api/production/${COURSE}/seeds`)).json();
  const out = [];
  for (const n of SEEDS) {
    const s = j.seeds.find((x) => x.seed_number === n);
    const chk = (o, id, kt, tt) => { for (const r of SLOTS) if (!o[`${r}_audio_id`]) out.push({ role: r, text: r === 'known' ? kt : tt, id }); };
    chk(s, `S${String(n).padStart(4, '0')}`, s.known_text, s.target_text);
    for (const l of s.legos) { chk(l, l.lego_id, l.known_text, l.target_text); for (const p of l.basket_phrases || []) chk(p, p.id || p.phrase_id, p.known_text, p.target_text); }
  }
  return out;
}

(async () => {
  const [mode, logFile] = process.argv.slice(2);
  const all = await empties();
  const english = all.filter((e) => e.role !== 'known'), hindi = all.filter((e) => e.role === 'known');
  if (mode === 'list') { console.log(JSON.stringify({ english, hindi }, null, 1)); return; }
  if (mode === 'link-dry' || mode === 'link') {
    const clip = new Map(); for (const l of fs.readFileSync(logFile, 'utf8').split('\n').filter(Boolean).map((x) => JSON.parse(x))) if (l.body && l.body.audioId) clip.set(l.k, l.body.audioId);
    const links = english.filter((e) => clip.has(`${e.role}\0${e.text}`)).map((e) => {
      const slot = /^S\d{4}$/.test(e.id) ? { seedNumber: Number(e.id.slice(1)) } : /^S\d{4}L\d{2}$/.test(e.id) ? { legoId: e.id } : { phraseId: e.id };
      return { ...slot, role: e.role, audioId: clip.get(`${e.role}\0${e.text}`) };
    });
    const r = await fetch(`${POPTY}/api/production/${COURSE}/link-clip`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': 'eng-for-hin-607-117-audio (job #524)' }, body: JSON.stringify({ links, dryRun: mode === 'link-dry' }) });
    const out = await r.json(); const bad = (out.results || []).filter((x) => !x.ok);
    console.log(r.status, 'links', links.length, 'ok', (out.results || []).length - bad.length, 'linked', out.linked, 'refused', JSON.stringify(bad.slice(0, 5)));
    return;
  }
  if (!['dry', 'render'].includes(mode) || !logFile) { console.error('usage: list | dry|render <log.jsonl>'); process.exit(1); }
  const seen = new Set(fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l).k) : []);
  const asks = new Map(); for (const e of english) asks.set(`${e.role}\0${e.text}`, e);
  for (const [k, a] of asks) {
    if (seen.has(k)) continue;
    let status = 0, body = {};
    try {
      const r = await fetch(`${POPTY}/api/audio/render`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': 'eng-for-hin-607-117-audio (job #524)' },
        body: JSON.stringify({ courseCode: COURSE, role: a.role, text: a.text, purpose: PURPOSE, dryRun: mode === 'dry' }), signal: AbortSignal.timeout(300000) });
      status = r.status; body = await r.json().catch(() => ({}));
    } catch (e) { body = { error: String(e.name) }; }
    fs.appendFileSync(logFile, JSON.stringify({ k, role: a.role, text: a.text, status, body }) + '\n');
    if (status === 402 || status === 0) { console.log('STOP', status, JSON.stringify(body).slice(0, 300)); break; }
  }
  console.log('done', asks.size, 'distinct English asks;', hindi.length, 'Hindi slots left alone');
})();
