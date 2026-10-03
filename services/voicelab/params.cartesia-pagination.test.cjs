/**
 * The Cartesia catalogue is followed to the END of its pages. It used to stop
 * silently after 10 pages (1,000 voices). Run: node --test services/voicelab/params.cartesia-pagination.test.cjs
 */
const test = require('node:test')
const assert = require('node:assert/strict')

process.env.CARTESIA_API_KEY = 'test-key-not-real'
const params = require('./params.cjs')

function fakeFetch(totalPages) {
  let n = 0
  return async () => {
    n += 1
    const more = n < totalPages
    return { ok: true, status: 200, json: async () => ({
      data: [{ id: `v${n}`, name: `Voice ${n}`, language: 'en', gender: 'feminine', accents: [] }],
      has_more: more, next_page: more ? `cursor${n}` : null,
    }) }
  }
}

test('a 25-page catalogue is loaded in full, not cut at 10 pages', async () => {
  const realFetch = global.fetch
  global.fetch = fakeFetch(25)
  try {
    params.invalidateCartesiaCatalogue()
    await params.cartesiaCatalogue()
    assert.equal(params._state().CARTESIA_CATALOGUE.en.length, 25)
  } finally { global.fetch = realFetch; params.invalidateCartesiaCatalogue() }
})

test('a cursor that never ends is stopped, and says so', async () => {
  const realFetch = global.fetch, realWarn = console.warn
  const warns = []
  console.warn = (m) => warns.push(String(m))
  global.fetch = fakeFetch(1e9)
  try {
    params.invalidateCartesiaCatalogue()
    await params.cartesiaCatalogue()
    assert.ok(warns.some((w) => /TRUNCATED/.test(w)))
  } finally { global.fetch = realFetch; console.warn = realWarn; params.invalidateCartesiaCatalogue() }
})
