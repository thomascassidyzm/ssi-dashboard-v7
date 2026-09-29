// node --test tools/course-optimization/ita-s0072l01-penso-che-phrases-2026-09-29.test.cjs
const test = require('node:test');
const assert = require('node:assert');
const { PHRASES, startsWithLego } = require('./ita-s0072l01-penso-che-phrases-2026-09-29.cjs');
test('every phrase starts with the LEGO on both sides', () => { for (const p of PHRASES) assert.ok(startsWithLego(p), p.id); });
test('no subjunctive after penso che: only future (-ai, -ò) or conditional (-rebbe) verbs', () => {
  for (const p of PHRASES) assert.match(p.target, /penso che (mi aiuterai|non potrò|mi piacerebbe)/, p.id);
});
