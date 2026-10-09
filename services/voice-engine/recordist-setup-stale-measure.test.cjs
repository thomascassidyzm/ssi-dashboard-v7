// Astra foreign-eyes 2026-10-09: a failed re-measure must not leave the stale cached measurement to be judged.
'use strict'
const test = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const path = require('node:path')

const src = fs.readFileSync(path.join(__dirname, 'recordist-router.cjs'), 'utf8')
const fn = src.slice(src.indexOf('async function measureAndJudgeSetup'), src.indexOf('async function packQueueResponse'))

test('a failed measurement drops the stale cached entry, so the judge sees the phrase as unmeasured', () => {
  const catchBody = fn.slice(fn.indexOf('} catch (err) {'))
  assert.match(catchBody, /delete measured\[item\.id\]/)
  assert.match(catchBody, /dirty = true/)
})
