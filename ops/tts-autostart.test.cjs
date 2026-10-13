const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('TTS services stay manual-only across boot, crash, deployment and watchdogs', () => {
  const failures = [];
  for (const file of ['ops/systemd/popty-phase8-audio.service', 'ops/systemd/popty-staging-phase8.service', 'ops/systemd/popty-orchestrator.service', 'ops/systemd/voicelab-playground.service']) {
    const unit = read(file);
    if (!/^Restart=no$/m.test(unit)) failures.push(`${file}: crash restart enabled`);
    if (/^WantedBy=/m.test(unit)) failures.push(`${file}: boot enablement present`);
    if (!/^ExecStart=.+/m.test(unit)) failures.push(`${file}: manual start lost`);
  }
  if (/^Wants=.*popty-staging-phase8/m.test(read('ops/systemd/popty-staging-api.service'))) failures.push('staging API starts Phase 8');
  for (const file of ['ops/watchdog/popty-services-watchdog.sh', 'ops/watchdog/popty-staleness-watchdog.sh', 'tools/deploy/auto-deploy-prod.cjs']) {
    const executableLines = read(file).split('\n').filter(line => !/^\s*(#|\/\/|\*)/.test(line)).join('\n');
    if (/popty-phase8-audio|check popty-orchestrator/.test(executableLines)) failures.push(`${file}: starts Phase 8`);
  }
  assert.deepEqual(failures, []);
});
