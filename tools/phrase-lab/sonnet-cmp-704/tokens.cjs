#!/usr/bin/env node
// Job #704: real token use from CLI transcripts. Sonnet arm = every generator call in this job's project dir; Opus = random sample of
// #409 generator calls (27-28 Sep) across all accounts. A generator call = a transcript whose first user message is >20k chars.
const fs = require('fs'), path = require('path'), os = require('os');
const A = path.join(os.homedir(), '.cs-accounts');
const sums = (files, model, want) => {
  const t = { calls: 0, input: 0, output: 0, thinking: 0, cacheWrite: 0, cacheRead: 0, models: {}, efforts: {} };
  for (const f of files) {
    let lines; try { lines = fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)); } catch { continue; }
    const first = lines.find((l) => l.type === 'user'); const txt = JSON.stringify(first?.message?.content || '');
    if (txt.length < 20000 || f.includes('612f16c3')) continue;
    const byId = new Map(); for (const l of lines) if (l.message?.usage && l.message.id) byId.set(l.message.id, l);
    if (!byId.size) continue;
    const ms = [...byId.values()]; if (!ms.some((l) => String(l.message.model).includes(model))) continue;
    t.calls++;
    for (const l of ms) { const u = l.message.usage; t.input += u.input_tokens || 0; t.output += u.output_tokens || 0; t.thinking += u.output_tokens_details?.thinking_tokens || 0; t.cacheWrite += u.cache_creation_input_tokens || 0; t.cacheRead += u.cache_read_input_tokens || 0; t.models[l.message.model] = (t.models[l.message.model] || 0) + 1; t.efforts[l.effort] = (t.efforts[l.effort] || 0) + 1; }
  }
  return t;
};
const jl = (d) => fs.existsSync(d) ? fs.readdirSync(d).filter((x) => x.endsWith('.jsonl')).map((x) => path.join(d, x)) : [];
const mine = jl(path.join(A, 'account-3/projects/-home-tomcassidy--cs-worktrees-ssi-dashboard-v7-clean-704-v3-phrases-sonnet-medium-100-leg'));
const T0 = new Date('2026-09-29T01:47:00Z').getTime(); // run 3 onward: earlier Sonnet transcripts are the shakedown, whose outputs were discarded
const son = sums(mine.filter((f) => fs.statSync(f).mtimeMs >= T0), 'sonnet-5-5');
let opusFiles = [];
for (const a of fs.readdirSync(A)) { const p = path.join(A, a, 'projects'); if (!fs.existsSync(p)) continue; for (const d of fs.readdirSync(p).filter((x) => x.includes('409-premium'))) opusFiles.push(...jl(path.join(p, d))); }
let s = 704; const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
opusFiles = opusFiles.filter((f) => fs.statSync(f).size > 100000).sort(() => rnd() - 0.5).slice(0, 250);
const op = sums(opusFiles, 'opus-5-5');
console.log(JSON.stringify({ sonnet: son, opusSampleOfCalls: op, opusFilesConsidered: opusFiles.length }, null, 1));
