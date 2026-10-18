const { test } = require('node:test')
const assert = require('node:assert/strict')
const { podGap, seedGap } = require('./gap-report.cjs')
const { loadIndex } = require('./index-walk.cjs')
const { clipTextKey } = require('../../services/shared/clip-index.cjs')

test('pod gap: unlinked and off-cast slots count, chars are code points', () => {
  const g = podGap([{ text: 'hola', voiceId: 'cartesia_a' }, { text: 'adiós', voiceId: 'azure_x' }, { text: '你好', voiceId: null }], ['cartesia_a'])
  assert.deepEqual(g, { slots: 3, notInCast: 2, unlinked: 1, chars: 7 })
})

test('seed gap: a line missing either seat is a gap, counted once', () => {
  const held = new Map([[clipTextKey('uno'), new Set(['f', 'm'])], [clipTextKey('dos'), new Set(['f'])]])
  assert.deepEqual(seedGap(['uno', 'dos', 'tres'], held, ['f', 'm']), { lines: 3, missingAnySeat: 2, perSeatMissing: { f: 1, m: 2 }, chars: 7 })
})

test('index walk pages by keyset, logs progress, and filters by language', async () => {
  const calls = []
  const pages = [[{ language: 'spa', text_key: 'a', voice_id: 'v', s3_key: 'k', duration_ms: 900, origin: 'tts' }, { language: 'spa', text_key: 'b', voice_id: 'v', s3_key: 'k', duration_ms: 900, veracity_pass: false }], [{ language: 'spa', text_key: 'c', voice_id: 'w', s3_key: 'pending/x', duration_ms: 0 }]]
  const pg = { query: async (sql, params) => { calls.push(params); return { rows: pages.shift() } } }
  const logs = []
  const held = await loadIndex(pg, { languages: ['spa'], page: 2, log: m => logs.push(m) })
  assert.deepEqual(calls, [['spa', '', '', 'spa'], ['spa', 'b', 'v', 'spa']])
  assert.equal(held.entries, 3); assert.equal(held.playable, 1); assert.equal(held.failing, 1)
})
