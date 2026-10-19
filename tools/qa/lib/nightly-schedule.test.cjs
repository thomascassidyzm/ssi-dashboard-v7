'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const names = ['audio-gap', 'sibling-identity', 'debut-practice', 'voice-variety', 'voice-policy'];
const windows = names.map(name => {
  const timer = fs.readFileSync(path.join(root, `tools/qa/${name}/systemd/ssi-${name === 'voice-policy' ? 'voice-audit' : name}.timer`), 'utf8');
  const [, h, m] = timer.match(/^OnCalendar=\*-\*-\* (\d\d):(\d\d):00 UTC$/m);
  const start = Number(h) * 60 + Number(m);
  const jitter = Number(timer.match(/^RandomizedDelaySec=(\d+)$/m)[1]) / 60;
  const end = start + jitter + 1 + 10; // accuracy plus maximum service runtime
  assert.match(timer, /^Persistent=false$/m);
  assert.ok(end < 7 * 60, `${name} must finish before UK school hours, including BST`);
  assert.ok(end < 240 || start > 240, `${name} overlaps 04:00Z`);
  return { name, start, end };
}).sort((a,b) => a.start - b.start);
for (let i = 1; i < windows.length; i++) assert.ok(windows[i-1].end < windows[i].start, 'nightlies overlap');
console.log('nightly schedule: no overlap, no 04:00Z, no school hours or catch-up');
