#!/usr/bin/env node
'use strict';
// cs #690·AI — talks ONLY to Popty over HTTP (render route + edit-batch). No DB access. Shape copied from #519·AI.
//   node run.cjs audio            dry-run every render → out/audio-dry.json
//   node run.cjs audio --render   render for real (stops at the 1,500-char cap or the first refusal) → out/audio.json
//   node run.cjs batch <X>        edit-batch dry run → out/dry-<X>.json ;  --apply → out/apply-<X>.json
//   Structural ops (none planned) would need the Kai-key signature; this script sends none.
const fs = require('fs'); const path = require('path');
const { C, L654, P654, P660, INTRO_654, INTRO_657 } = require('./plan.cjs');
const OUT = path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
const AGENT = 'cs #690·AI for Kai (deu proofreader last 3 items, 18 Nov 2026)';
const PURPOSE = 'deu_for_eng last 3 proofreader items passed by Kai 18 Nov 2026 (cs #690·AI)';
const APPROVAL = 'kai:2026-11-18:deu_for_eng last 3 proofreader items passed by Kai 18 Nov, cap 1,500 chars (cs #690·AI)';
const CAP = 1500;
const NEW = [{ role: 'known', text: L654.known }, { role: 'target1', text: L654.target }, { role: 'target2', text: L654.target },
  { role: 'presentation', text: INTRO_654 }];
for (const [k, t] of [...Object.values(P654), ...Object.values(P660)]) NEW.push({ role: 'known', text: k }, { role: 'target1', text: t }, { role: 'target2', text: t });
const RERECORD = [{ role: 'presentation', text: INTRO_657.text, id: INTRO_657.id, spoken: INTRO_657.spoken, slots: 'S0657L02 intro' }];

async function post(url, body) {
  const headers = { 'Content-Type': 'application/json', 'x-agent-id': AGENT, ...(process.env.CS_CONV_TOKEN ? { 'x-cs-conv': process.env.CS_CONV_TOKEN } : {}) };
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(240000) });
  const txt = await res.text();
  try { return { status: res.status, ...JSON.parse(txt) }; } catch { return { status: res.status, ok: false, error: txt.slice(0, 300) }; }
}
const render = (b) => post('http://localhost:3470/api/audio/render', { courseCode: C, purpose: PURPOSE, job: '#690·AI', approval: APPROVAL, ...b });

async function audio(real) {
  const file = path.join(OUT, real ? 'audio.json' : 'audio-dry.json');
  const done = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  let spent = Object.values(done).reduce((s, x) => s + (x.charsSpent || 0), 0);
  const jobs = [...RERECORD.map((r) => ({ key: `re|${r.id}`, body: { role: r.role, text: r.text, replaceAudioId: r.id, spokenText: r.spoken }, meta: r })),
    ...NEW.map((n) => ({ key: `new|${n.role}|${n.text}`, body: { role: n.role, text: n.text }, meta: n }))];
  const seen = new Set(); let would = 0;
  for (const j of jobs) {
    if (seen.has(j.key)) continue; seen.add(j.key);
    if (real && done[j.key] && done[j.key].ok) continue;
    const a = await render({ ...j.body, dryRun: !real });
    done[j.key] = { ...a, meta: j.meta };
    fs.writeFileSync(file, JSON.stringify(done, null, 1));
    if (!real) { would += a.wouldSpendChars || 0; console.log(j.key.slice(0, 80), a.status, a.ok ? `${a.source} would=${a.wouldSpendChars} voice=${a.voiceId || ''}` : `${a.code} ${String(a.error).slice(0, 200)}`); continue; }
    spent += a.charsSpent || 0;
    console.log(j.key.slice(0, 80), a.status, a.ok ? `${a.source} ${a.audioId} spent=${a.charsSpent} total=${spent}` : `REFUSED ${a.code} ${String(a.error).slice(0, 200)}`);
    if (!a.ok) { console.log('STOP: a refusal is the answer'); break; }
    if (spent > CAP) { console.log('STOP: over cap'); break; }
  }
  console.log(real ? `TOTAL spent ${spent}` : `TOTAL would spend ${would}`);
}

async function batch(name, apply) {
  const ops = JSON.parse(fs.readFileSync(path.join(__dirname, `batch-${name}.ops.json`), 'utf8'));
  const r = await post(`http://localhost:3470/api/production/${C}/edit-batch`, { ops, apply: !!apply });
  fs.writeFileSync(path.join(OUT, `${apply ? 'apply' : 'dry'}-${name}.json`), JSON.stringify(r, null, 1));
  console.log(name, apply ? 'APPLY' : 'dry', r.status, r.ok, r.event_id || '', r.error || r.code || '', (r.results || []).map((x) => `${x.op}:${x.changed}${x.error ? ' ' + x.error : ''}`).join(' | '));
}
const [cmd, a1] = process.argv.slice(2);
if (cmd === 'audio') audio(process.argv.includes('--render'));
else if (cmd === 'batch') batch(a1, process.argv.includes('--apply'));
else console.log('usage: audio [--render] | batch <name> [--apply]');
