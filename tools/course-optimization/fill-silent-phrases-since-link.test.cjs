const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('links all 501 identical silent slots within the route limit', async () => {
  const rows = Array.from({ length: 501 }, (_, i) => ({
    id: `phrase-${i}`, known_text: 'Hello', target_text: 'Bonjour',
    known_audio_id: null, target1_audio_id: 'filled', target2_audio_id: 'filled',
  }));
  const batches = [];
  const context = {
    __dirname, module: { exports: {} },
    require(name) {
      if (name === 'path') return path;
      if (name === 'dotenv') return { config() {} };
      if (name === '../../services/shared/agent-db.cjs') return {
        connect: async () => ({ query: async () => ({ rows }), end: async () => {} }),
      };
      throw new Error(`Unexpected dependency: ${name}`);
    },
    process: { argv: ['node', 'tool', 'fra_for_eng'], env: { RENDER: '1' } },
    console: { log() {} }, AbortSignal,
    fetch: async (url, options) => {
      const body = JSON.parse(options.body);
      if (url.endsWith('/api/audio/render')) return {
        status: 200, json: async () => ({ ok: true, source: 'library', audioId: '11111111-1111-4111-8111-111111111111' }),
      };
      assert.ok(url.endsWith('/link-clip'));
      batches.push(body.links);
      const ok = body.links.length <= 500;
      return { ok, status: ok ? 200 : 400, json: async () => ok
        ? { ok: true, linked: body.links.length }
        : { ok: false, code: 'TOO_MANY', error: 'at most 500 links per request' } };
    },
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'fill-silent-phrases-since.cjs'), 'utf8'), context);
  await vm.runInContext('main()', context);
  assert.ok(batches.length > 0);
  assert.ok(batches.every(batch => batch.length <= 500), 'link-clip refuses oversized batches');
  assert.equal(batches.flat().length, 501);
});
