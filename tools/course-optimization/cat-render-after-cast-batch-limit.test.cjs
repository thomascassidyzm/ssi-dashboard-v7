'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { linkClips } = require('../../services/shared/link-clip.cjs');

test('501 silent component slots sharing one text are linked within the route limit', async () => {
  const rows = Array.from({ length: 501 }, (_, i) => ({
    id: `cat_for_eng:S${String(i + 1).padStart(4, '0')}L01C01`,
    phrase_role: 'component', known_text: 'I', target_text: 'jo',
    known_audio_id: null, target1_audio_id: null, target2_audio_id: null,
  }));
  const pg = {
    query: async (sql) => ({ rows: sql.includes('course_legos') ? [] : rows }),
    end: async () => {},
  };
  let linked = 0;
  const logs = [];
  const source = fs.readFileSync(path.join(__dirname, 'cat-render-after-cast-2026-10-14.cjs'), 'utf8');
  const sandbox = {
    __dirname, module: { exports: {} },
    process: { env: { RENDER: '1' }, exit: () => assert.fail('unexpected exit') },
    AbortSignal,
    console: { log: (...args) => logs.push(args.join(' ')), error: assert.fail },
    require: (name) => {
      if (name === 'dotenv') return { config: () => {} };
      if (name.endsWith('/agent-db.cjs')) return { connect: async () => pg, clipMap: async () => new Map() };
      return require(name);
    },
    fetch: async (url, options) => {
      const body = JSON.parse(options.body);
      if (url.endsWith('/api/audio/render')) return {
        status: 200,
        json: async () => ({ ok: true, source: 'library', audioId: '11111111-1111-4111-8111-111111111111' }),
      };
      // Use the real route helper's rejection, without any database access.
      if (body.links.length > 500) {
        const result = await linkClips({ db: {}, courseCode: 'cat_for_eng', links: body.links });
        return { status: 400, json: async () => result };
      }
      linked += body.links.length;
      return { status: 200, json: async () => ({ ok: true, linked: body.links.length, results: [] }) };
    },
  };
  await vm.runInNewContext(`${source}\nmain();`, sandbox);
  assert.equal(linked, 501, logs.join('\n'));
});
