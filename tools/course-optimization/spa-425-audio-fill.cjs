#!/usr/bin/env node
'use strict';
// spa_for_eng job #425 follow-up: fill every slot the Deborah edits left empty, through the ONE audio route
// (POST /api/audio/render on Popty — library-first, spend guard, one render, no retries). A refusal is the answer:
// the loop stops on the first spend-guard refusal (402) and records the remainder; it never retries or routes round.
//   node …cjs <empties.json> dry|render <log.jsonl> [limit]
// empties.json: [{role, text, kind, id}] for slots whose text is set and whose *_audio_id is null (from GET /api/production/spa_for_eng/seeds).
const fs = require('fs');
const [file, mode, logFile, limit] = process.argv.slice(2);
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const PURPOSE = 'job #459 spa_for_eng fill of slots emptied by #425 Deborah edits (Kai 29 Oct)';
const seen = new Set(fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8').split('\n').filter(Boolean).map((l) => { const j = JSON.parse(l); return j.k; }) : []);
const asks = new Map();
for (const e of JSON.parse(fs.readFileSync(file, 'utf8'))) if (e.role !== 'presentation') asks.set(`${e.role}\0${e.text}`, e);
let todo = [...asks.entries()].filter(([k]) => !seen.has(k)).map(([, e]) => e);
if (limit) todo = todo.slice(0, Number(limit));
let i = 0, stop = false;
async function worker() {
  while (i < todo.length && !stop) {
    const a = todo[i++]; const k = `${a.role}\0${a.text}`;
    let status = 0, body = {};
    try {
      const r = await fetch(`${POPTY}/api/audio/render`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': 'spa-425-audio-fill (job #459)' }, body: JSON.stringify({ courseCode: 'spa_for_eng', role: a.role, text: a.text, purpose: PURPOSE, dryRun: mode === 'dry' }), signal: AbortSignal.timeout(300000) });
      status = r.status; body = await r.json().catch(() => ({}));
    } catch (e) { body = { error: String(e.name) }; }
    fs.appendFileSync(logFile, JSON.stringify({ k, role: a.role, text: a.text, status, body }) + '\n');
    if (status === 402 || status === 0) { stop = true; console.log('STOP', status, JSON.stringify(body).slice(0, 300)); }
  }
}
Promise.all(Array.from({ length: mode === 'dry' ? 4 : 2 }, worker)).then(() => console.log('done', i, 'of', todo.length));
