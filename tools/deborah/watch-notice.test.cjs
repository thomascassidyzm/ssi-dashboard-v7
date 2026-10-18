/**
 * --test-notice: under --dry-run it posts NOTHING, and otherwise it posts under the Kai session named by
 * DEBORAH_WATCH_SESSION. A stand-in `post` is used; nothing reaches any surface.
 *
 * Run: node tools/deborah/watch-notice.test.cjs
 */
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { testNotice } = require('./watch-notice.cjs')

const kaiFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dbw-')), 'kai')
fs.writeFileSync(kaiFile, 'v2.kai\n')

test('--dry-run posts nothing', async () => {
  const calls = []
  const r = await testNotice({ dryRun: true, text: 'hi', surface: 's', post: async (...a) => { calls.push(a); return { posted: true } }, env: { DEBORAH_WATCH_SESSION: kaiFile } })
  assert.equal(calls.length, 0)
  assert.equal(r.posted, false)
  assert.equal(r.wouldSend, 'hi')
})

test('a real test notice posts under the DEBORAH_WATCH_SESSION cookie', async () => {
  let seen
  await testNotice({ dryRun: false, text: 'hi', surface: 'http://s', post: async (t, headers) => { seen = headers; return { posted: true } }, env: { DEBORAH_WATCH_SESSION: kaiFile } })
  assert.equal(seen.Cookie, 'cs_user=v2.kai')
})
