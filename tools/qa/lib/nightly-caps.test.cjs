import { it as test } from 'vitest';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
test('nightly statements stay capped and paged counts remain complete', async () => {
for (const file of ['tools/qa/sibling-identity/check.cjs', 'tools/qa/debut-practice/nightly.cjs', 'tools/qa/voice-policy/nightly.cjs', 'tools/refresh-round-index.cjs']) {
  assert.match(fs.readFileSync(path.join(root,file),'utf8'), /boundedClient\(/, file);
}
assert.match(fs.readFileSync(path.join(root,'tools/qa/voice-variety/named-read.cjs'),'utf8'), /STATEMENT_TIMEOUT_MS = 5000/);
console.log('nightly caps wiring pass');

  const { boundedClient } = require('./bounded-client.cjs');
  const seen = [];
  const connection = { async query(sql, params) {
    seen.push({sql, params});
    if (sql === 'SELECT slow') throw Object.assign(new Error('timeout'), {code:'57014'});
    return {rows: []};
  }};
  const db = boundedClient(connection, 'qa:sibling-identity');
  const results = await Promise.allSettled([db.query('SELECT slow'), db.query('SELECT next')]);
  assert.equal(results[0].reason.code, '57014');
  assert.equal(results[1].status, 'fulfilled');
  assert.deepEqual(seen.map(r=>r.sql).filter(s=> /^(BEGIN|COMMIT|ROLLBACK)/.test(s)),
    ['BEGIN READ ONLY','ROLLBACK','BEGIN READ ONLY','COMMIT']);
  for (const r of seen.filter(r=>r.sql.includes('set_config'))) {
    assert.match(r.sql, /'statement_timeout', '5000', true/);
    assert.deepEqual(r.params, ['qa:sibling-identity']);
  }
  // Exercise an oversized course: three pages per side must retain the whole count.
  const vm = require('node:vm');
  const filename = path.join(root,'tools/qa/audio-gap/count-audio-gap.cjs');
  const module = {exports:{}};
  let pages = 0;
  class Client {
    async connect() {} async end() {}
    async query(sql, values) {
      if (/from courses/.test(sql)) return {rows:[{course_code:'large'}]};
      if (!/with slots/.test(sql)) return {rows:[]};
      assert.match(sql,/limit 200/);
      assert.match(sql,/\(kind \|\| ':' \|\| row_id\) > \$2/);
      assert.equal(values[0], 'large');
      const i = pages++ % 3;
      assert.equal(values[1], ['', 'phrase:0200', 'phrase:0400'][i]);
      return {rows:[{course_code:'large', kind:'phrase', cursor:['phrase:0200','phrase:0400','phrase:0450'][i], scanned:i===2?50:200,
        total:i===2?50:200, missing:1, missing_relinkable:1, missing_unrendered:0, stale_text:0, ts_stale:0}]};
    }
  }
  vm.runInNewContext(fs.readFileSync(filename,'utf8'), {
    module, require: name=>name==='pg'?{Client}:name==='fs'?{...fs,mkdirSync(){},readdirSync(){return []}}:require(name),
    __dirname:path.dirname(filename), __filename:filename, process:{env:{DATABASE_URL:'postgres://unused'}}, console,
  });
  const snap = await module.exports.main(['node','count','--no-save','--quiet']);
  assert.equal(pages,6);
  assert.equal(snap.courses[0].known.total,450);
  assert.equal(snap.courses[0].known.by_kind.phrase.total,450);
  assert.equal(snap.courses[0].known.missing,3);
  console.log('rollback, serialisation and large-course pagination pass');
});
