#!/usr/bin/env node
// Pooled re-run of the probe. Measured 2026-08-18: 6 parallel calls complete in
// the same wall time as 1 (67s), so the endpoint's latency is queue wait, not
// throughput. The original serial runner (run.cjs) paid ~60s per call for no
// reason; this keeps its resume semantics and its RUNS/sampling shape.
const fs = require('fs');
const D = __dirname;
const TOKEN = fs.readFileSync('/home/tomcassidy/.secrets/hetzner-inference.env', 'utf8')
  .match(/HETZNER_INFERENCE_TOKEN=["']?([^"'\n]+)/)[1];
const URL = 'https://inference.hetzner.com/api/v1/chat/completions';
const POOL = 6;

const RUNS = [
  { model: 'Qwen/Qwen3.6-35B-A3B-FP8', think: false, tag: 'qwen-fast' },
  { model: 'Qwen/Qwen3.6-35B-A3B-FP8', think: true, tag: 'qwen-think' },
];
const THINK_SAMPLE = 12; // translate; other classes take 4

const sleep = ms => new Promise(r => setTimeout(r, ms));
const tasks = JSON.parse(fs.readFileSync(`${D}/tasks.json`, 'utf8'));
const OUT = `${D}/results.jsonl`;

const done = new Set();
if (fs.existsSync(OUT)) for (const l of fs.readFileSync(OUT, 'utf8').split('\n').filter(Boolean)) {
  try { const r = JSON.parse(l); if (r.ok) done.add(`${r.tag}|${r.id}`); } catch {}
}

async function call(run, prompt) {
  const body = {
    model: run.model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: run.think ? 8000 : 2000,
    temperature: 0.2,
  };
  if (!run.think) body.chat_template_kwargs = { enable_thinking: false };
  for (let attempt = 0; attempt < 4; attempt++) {
    const t0 = Date.now();
    try {
      const res = await fetch(URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(600000),
      });
      const txt = await res.text();
      if (res.status === 429) { console.error(`  429, backing off ${20 * (attempt + 1)}s`); await sleep(20000 * (attempt + 1)); continue; }
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${txt.slice(0, 300)}` };
      const d = JSON.parse(txt);
      const m = d.choices?.[0]?.message || {};
      return {
        ok: true, content: m.content, reasoning_len: (m.reasoning || '').length,
        finish: d.choices?.[0]?.finish_reason, usage: d.usage, ms: Date.now() - t0,
      };
    } catch (e) {
      console.error(`  error: ${e.message}`); await sleep(10000);
    }
  }
  return { ok: false, error: 'exhausted retries' };
}

(async () => {
  const queue = [];
  for (const run of RUNS) {
    const seen = {};
    for (const t of tasks) {
      if (run.think) {
        seen[t.cls] = (seen[t.cls] || 0) + 1;
        if (seen[t.cls] > (t.cls === 'translate' ? THINK_SAMPLE : 4)) continue;
      }
      if (done.has(`${run.tag}|${t.id}`)) continue;
      queue.push({ run, t });
    }
  }
  const total = queue.length;
  console.log(`${total} calls to make (${done.size} already done), pool=${POOL}`);
  let n = 0, i = 0;
  const worker = async () => {
    while (i < queue.length) {
      const { run, t } = queue[i++];
      const r = await call(run, t.prompt);
      fs.appendFileSync(OUT, JSON.stringify({ tag: run.tag, id: t.id, cls: t.cls, ...r }) + '\n');
      n++;
      console.log(`[${n}/${total}] ${run.tag} ${t.id} ${r.ok ? `ok ${r.ms}ms fin=${r.finish} think=${r.reasoning_len}c` : 'FAIL ' + r.error}`);
    }
  };
  await Promise.all(Array.from({ length: POOL }, worker));
  console.log('done');
})();
