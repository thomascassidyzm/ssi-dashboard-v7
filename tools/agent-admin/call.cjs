#!/usr/bin/env node
// Call a Popty admin route as a NAMED AGENT (job #410).
//   node tools/agent-admin/call.cjs --agent <your-id> METHOD /api/path [json-body]
// e.g. node tools/agent-admin/call.cjs --agent aran-watson GET /api/recording/languages
// Your agent id is recorded in Popty's log and in every response's "by" field —
// use a stable, honest one (job label or Watson name). The request is signed for
// this method + path + body only and is good for 60 s, once. Scopes the key
// carries: voice-slot:write, takes:read, pod:write. Popty is http://localhost:3470.
'use strict';
const { execFileSync } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
const ai = args.indexOf('--agent');
if (ai < 0 || !args[ai + 1]) { console.error('usage: call.cjs --agent <id> METHOD /path [json]'); process.exit(64); }
const agentId = args[ai + 1];
args.splice(ai, 2);
const [method, urlPath, bodyStr] = args;
if (!method || !urlPath || !urlPath.startsWith('/')) { console.error('usage: call.cjs --agent <id> METHOD /path [json]'); process.exit(64); }
const body = bodyStr ? JSON.parse(bodyStr) : undefined;
const base = process.env.POPTY_URL || 'http://localhost:3470';

const header = execFileSync('sudo', ['-n', '-u', 'popty', 'node', path.join(__dirname, 'sign.cjs')], {
  input: JSON.stringify({ agentId, method, path: urlPath, body }),
  encoding: 'utf8',
}).trim();

(async () => {
  const res = await fetch(base + urlPath, {
    method,
    headers: { 'x-agent-admin': header, ...(body !== undefined ? { 'content-type': 'application/json' } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  console.log(text);
  process.exit(res.ok ? 0 : 1);
})();
