'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

test('a budget refusal must hold later rows whose clips were never rendered', async () => {
  const ids = ['S0001L01U01', 'S0002L01U01'];
  const dump = { seeds: [], legos: [], phrases: ids.map((id, i) => ({
    id: `fra_for_eng:${id}`, phrase_role: 'use', known_text: `old ${i}`, target_text: `cible ${i}`,
  })) };
  const verdicts = ids.map((id, i) => [id, 'real', 'fix', [`new ${i}`, null], 'S7', 'fixture']);
  const edits = [];
  const renders = [];
  const source = fs.readFileSync(path.join(__dirname, 'fra-222-mismatch-pass-2026-10-14.cjs'), 'utf8');
  // Execute the actual CLI in isolation: no database, network, provider, or evidence writes.
  const context = {
    module: { exports: {} },
    require: (name) => {
      if (name === 'fs') return { readFileSync: () => JSON.stringify(dump), mkdirSync() {}, writeFileSync() {} };
      if (name === 'path') return path;
      if (name.endsWith('.data.cjs')) return verdicts;
      if (name === './audit-phrase-zut.cjs') return require('./audit-phrase-zut.cjs');
      if (name === '../lib/evidence-path.cjs') return { evidencePath: () => 'unused.json' };
      throw new Error(`unexpected import ${name}`);
    },
    process: { argv: ['node', 'tool', 'fixture.json'], env: { RENDER: '1', APPLY: '1', APPLY_CONFIRM: '1' } },
    console: { log() {} }, AbortSignal,
    fetch: async (url, options) => {
      const body = JSON.parse(options.body);
      if (url.endsWith('/api/audio/render')) {
        if (body.dryRun) return { status: 200, json: async () => ({ ok: true, source: 'would-render', wouldSpendChars: 5 }) };
        renders.push(body.text);
        return { status: 402, json: async () => ({ ok: false, error: 'daily budget exhausted' }) };
      }
      edits.push(body);
      return { status: 200, json: async () => ({ ok: true, results: [] }) };
    },
  };
  await vm.runInNewContext(source + '\nmain();', context);
  assert.deepEqual(renders, ['new 0']);
  assert.equal(edits.flatMap((batch) => batch.ops).length, 0,
    'neither row has its new clip, so neither may reach edit-batch');
});
