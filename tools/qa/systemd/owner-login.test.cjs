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

test('every unit that loads the owner or popty env names its database connections (PGAPPNAME)', () => {
  const root = path.resolve(qa, '../..');
  const { execFileSync } = require('node:child_process');
  const files = execFileSync('git', ['ls-files', '*.service'], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
  let checked = 0;
  for (const f of files) {
    const unit = fs.readFileSync(path.join(root, f), 'utf8');
    if (!/owner\.env|popty\.env/.test(unit)) continue;
    checked++;
    assert.match(unit, /^Environment=PGAPPNAME=\S+$/m, f);
  }
  assert.ok(checked >= 10, `only ${checked} units checked`);
});

test('every nightly QA check names its backend qa:<check> and the timers sit ≥15 min apart inside 01:00-06:00Z (job #683)', () => {
  const checks = [['audio-gap', 'audio-gap/count-audio-gap.cjs', 'qa:audio-gap'], ['sibling-identity', 'sibling-identity/check.cjs', 'qa:sibling-identity'],
    ['debut-practice', 'debut-practice/nightly.cjs', 'qa:debut-practice'], ['voice-audit', 'voice-policy/nightly.cjs', 'qa:voice-audit']];
  for (const [, file, name] of checks) {
    const src = fs.readFileSync(path.join(qa, file), 'utf8');
    assert.ok(src.includes(`nameBackend(`) && src.includes(`'${name}'`), `${file} must nameBackend '${name}'`);
  }
  const at = [['audio-gap', 'audio-gap'], ['sibling-identity', 'sibling-identity'], ['debut-practice', 'debut-practice'], ['voice-variety', 'voice-variety'], ['voice-policy', 'voice-audit']].map(([d, n]) => {
    const m = fs.readFileSync(path.join(qa, d, 'systemd', `ssi-${n}.timer`), 'utf8').match(/^OnCalendar=\*-\*-\* (\d\d):(\d\d):00 UTC$/m);
    assert.ok(m, `${n} timer must be in UTC`);
    return Number(m[1]) * 60 + Number(m[2]);
  }).sort((a, b) => a - b);
  assert.ok(at[0] >= 60 && at[at.length - 1] < 5 * 60 + 45, 'inside the 01:00-06:00Z window with room to finish');
  for (let i = 1; i < at.length; i++) assert.ok(at[i] - at[i - 1] >= 15, 'heavy nightlies must not overlap');
});
