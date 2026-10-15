const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const qa = path.resolve(__dirname, '..');
test('nightlies use the protected owner env as popty and audio-gap honours it', () => {
  for (const [dir, name] of [['audio-gap','audio-gap'], ['sibling-identity','sibling-identity'], ['voice-policy','voice-audit'], ['voice-variety','voice-variety'], ['debut-practice','debut-practice']]) {
    const unit = fs.readFileSync(path.join(qa, dir, 'systemd', `ssi-${name}.service`), 'utf8');
    assert.match(unit, /^User=popty$/m, name);
    assert.match(unit, /^EnvironmentFile=\/etc\/popty\/owner.env$/m, name);
  }
  const src = fs.readFileSync(path.join(qa, 'audio-gap/count-audio-gap.cjs'), 'utf8');
  const fn = src.match(/function databaseUrl\(\) \{[\s\S]*?\n\}/)[0];
  const result = vm.runInNewContext(`${fn}; databaseUrl()`, {
    process: {env: {DATABASE_URL: 'owner-sentinel'}},
    path, REPO: '/nonexistent', fs: {existsSync() {throw Error('must not read fallback');}}
  });
  assert.equal(result, 'owner-sentinel');
});
