import { it as test } from 'vitest';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

test('audio gap bounds each course read on its backend and closes on timeout without saving', async () => {
  const calls = []; let config; let ended = false;
  class Client {
    constructor(c) { config = c; }
    async connect() {}
    async end() { ended = true; }
    async query(sql, params) {
      calls.push({ sql, params });
      if (/from courses/.test(sql)) return { rows: [{ course_code: 'a' }, { course_code: 'b' }] };
      if (/with slots/.test(sql)) {
        assert.deepEqual(Array.from(params || []), ['a', '']);
        assert.match(sql, /course_practice_phrases\s+where course_code = \$1/);
        assert.match(sql, /course_legos\s+where course_code = \$1/);
        assert.match(sql, /s.course_code = \$1/);
        assert.match(sql, /clips as materialized \(select distinct text_normalized from course_audio where course_code = \$1/);
        throw Object.assign(new Error('statement timeout'), { code: '57014' });
      }
      return { rows: [] };
    }
  }
  const filename = path.join(__dirname, 'count-audio-gap.cjs');
  const module = { exports: {} };
  const localRequire = name => name === 'pg' ? { Client } : name === 'fs' ? {
    ...fs, mkdirSync() { throw new Error('must not save incomplete count'); }
  } : require(require.resolve(name, { paths: [__dirname] }));
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    require: localRequire, module, __dirname, __filename: filename,
    process: { env: { DATABASE_URL: 'postgres://unused' } }, console,
  });
  await assert.rejects(module.exports.main(['node', 'count', '--no-save']), /statement timeout/);
  assert.equal(config.statement_timeout, 5000);
  assert.equal(ended, true);
  assert.equal(calls.at(-1).sql, 'ROLLBACK');
  const bound = calls.find(c => /set_config\('statement_timeout'/.test(c.sql));
  assert.deepEqual(Array.from(bound.params), ['qa:audio-gap', '5000']);
  assert.match(bound.sql, /true/);
  assert.equal(calls[0].sql, 'BEGIN READ ONLY');
});
