'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

test('an own-course library hit is explicitly linked to the silent phrase', async () => {
  const requests = [];
  const phraseId = 'deu_for_eng:S0009L02B02';
  const audioId = '11111111-1111-4111-8111-111111111111';
  let finished;
  const done = new Promise(resolve => { finished = resolve; });
  const entry = { exports: {} };
  const fakeRequire = name => {
    if (name === 'path') return path;
    if (name === 'dotenv') return { config() {} };
    if (name === '../../services/shared/agent-db.cjs') return {
      connect: async () => ({
        query: async () => ({ rows: [{ id: phraseId, known_text: 'I speak German', target_text: 'Ich spreche Deutsch', known_audio_id: 'filled', target1_audio_id: null, target2_audio_id: 'filled' }] }),
        end: async () => {},
      }),
    };
    throw new Error(`Unexpected import: ${name}`);
  };
  fakeRequire.main = entry;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'fill-silent-phrases-since.cjs'), 'utf8'), {
    require: fakeRequire, module: entry, __dirname,
    process: { argv: ['node', 'tool', 'deu_for_eng'], env: { RENDER: '1' }, exit: code => { throw new Error(`exit ${code}`); } },
    console: { log: (...args) => { if (String(args[0]).startsWith('DONE:')) finished(); }, error: finished },
    fetch: async (url, opts) => {
      requests.push({ url, body: JSON.parse(opts.body) });
      return { status: 200, json: async () => ({ ok: true, source: 'library', audioId, charsSpent: 0 }) };
    },
  });
  await done;
  assert.ok(requests.some(r => r.body.ops?.some(op =>
    op.op === 'audio.link' && op.target === 'phrase' && op.phrase_id === phraseId && op.slot === 'target1' && op.audio_id === audioId)),
  'the own-course library path writes no content row; the caller must link the returned ID');
});
