/**
 * A window with no frames available yet (coverage null, tooltip "–") is not a weak
 * window: it must not be painted in the darkest "50% or more unused" bin.
 * Run: node --test tools/frame-layer/v4/cross-course-report.test.cjs
 */
const test = require('node:test');
const assert = require('node:assert');
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://unused';
const { heatmap, BINS } = require('./cross-course-report.cjs');

test('null-coverage window is not painted as the weakest bin', () => {
  const m = { course: 'xxx_for_eng', summary: { mean_w20: 0.9 },
    windows: { all: { w20: [{ start: 1, end: 20, coverage: null, available: 0, phrases: 0 }] } } };
  const svg = heatmap([{ m, s: {} }]);
  const rect = svg.match(/<rect x="190"[^>]*fill="(#[0-9a-f]+)"/)[1];
  assert.notStrictEqual(rect, BINS[BINS.length - 1].hex);
});
