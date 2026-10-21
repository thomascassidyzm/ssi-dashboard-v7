// Run with: node services/shared/speakability-grid.test.cjs  (standalone node:test, listed in vite.config.js exclude)
const test = require('node:test')
const assert = require('node:assert')
const { buildGrid, loadStore } = require('./speakability-grid.cjs')

const store = loadStore()
const tagFile = { layers: { 1: 'Basic needs' }, tags: {
  'seeds#S0001': { layer: '1', qrs: 'S', text: 'I want a coffee.' },
  'seeds#S0002': { layer: '2', qrs: 'Q', text: 'Is that so?' },
  'pod-1#1': { layer: '2', qrs: 'S', text: 'Good morning, Sarah!', move: 'opening-greeting' },
  'podx#1': { layer: '3', qrs: 'R', text: 'Yes I think so.', shape: 'N2.2', move: 'answer' },
} }
const live = {
  seeds: [{ id: 'S0001', text: 'I want a coffee.' }, { id: 'S0002', text: 'Is that really so?' }, { id: 'S0003', text: 'A brand new seed.' }],
  pods: [
    { id: 'pod-1', label: 'pod-1', kind: 'canonical', prefix: 'g', rows: [{ order: 1, scene: 1, speaker: 'N', text: 'Good morning, Sarah!' }, { order: 2, scene: 1, speaker: 'S', text: 'A line nobody tagged.' }] },
    { id: 'podx', label: 'podx', kind: 'canonical', prefix: 'g', rows: [{ order: 1, scene: 1, speaker: 'A', text: 'Yes I think so.' }] },
  ],
}
const g = buildGrid(live, tagFile, store)

test('counts only lines whose stored tag still matches their live text', () => {
  assert.strictEqual(g.grid[1].cells[2].seeds, 1) // L1 x S: S0001
  assert.strictEqual(g.grid[2].cells[0].seeds, 0) // S0002's text changed since it was tagged
})
test('reports new and edited lines as untagged, with the reason, never guessed', () => {
  const seeds = g.sources.find((s) => s.id === 'seeds')
  assert.deepStrictEqual(seeds.untagged.map((u) => [u.id, u.reason]), [['S0002', 'changed'], ['S0003', 'new']])
  assert.strictEqual(g.sources.find((s) => s.id === 'pod-1').untagged[0].reason, 'new')
  assert.strictEqual(g.untaggedTotal, 3)
})
test('pod-1 lines take their shape from the store; other pods from their own tag', () => {
  assert.strictEqual(g.layerShape.shapes.find((s) => s.id === 'N1').counts[2], 1) // pod-1 g1 is N1.1 in the store, tagged L2
  assert.strictEqual(g.layerShape.shapes.find((s) => s.id === 'N2').counts[3], 1)
})
test('the stored tag file covers the 668 seeds and parses against the store', () => {
  const t = require('./metagraph/speakability/tags.json').tags
  assert.strictEqual(Object.keys(t).filter((k) => k.startsWith('seeds#')).length, 668)
  assert.ok(Object.keys(t).filter((k) => k.startsWith('pod-1#')).length >= 231)
})
