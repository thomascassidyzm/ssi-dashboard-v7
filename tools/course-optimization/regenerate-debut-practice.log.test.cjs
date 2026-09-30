'use strict'
// node --test tools/course-optimization/regenerate-debut-practice.log.test.cjs
// Job #920 (Kai): a regenerate run that cuts and adds phrases must leave the FULL before/after text
// of every row in the event log. Before: the delete event held only ids, so Italian seed 190's three
// deleted phrases were unrecoverable. Fake pg + fake supabase; nothing touches a database.
process.env.VITEST = '1' // no exit hooks
const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('path')

const stub = (rel, exp) => { const f = require.resolve(path.join(__dirname, '..', '..', rel)); require.cache[f] = { id: f, filename: f, loaded: true, exports: exp } }
stub('services/shared/round-index-refresh.cjs', { refreshNow: async () => {} })
stub('services/shared/audio-pass-queue.cjs', { queueAudioPass: async () => ({ queued: true }) })
const { apply } = require('./regenerate-debut-practice.cjs')

const OLD = { id: 'ita_for_eng:S0190L01B03', course_code: 'ita_for_eng', seed_number: 190, lego_index: 1, lego_id: 'S0190L01', position: 3, phrase_role: 'build', known_text: 'do you mind if', target_text: 'ti dispiace se' }

test('a cut row and a created row are logged with full text on both sides', async () => {
  const events = []
  const supabase = { from: () => ({ insert: (row) => ({ select: () => ({ single: async () => { events.push(row); return { data: { id: `evt${events.length}` }, error: null } } }) }) }) }
  const pg = { query: async (sql) => {
    if (/^(DELETE|INSERT|UPDATE|BEGIN|COMMIT)/.test(sql.trim())) return { rows: [], rowCount: 1 }
    if (/FROM course_legos/.test(sql)) return { rows: [{ is_new: true, known_text: 'do you mind if I ask you', target_text: 'ti dispiace se ti chiedo' }] }
    if (/FROM course_practice_phrases/.test(sql)) return { rows: [OLD] }
    if (/FROM course_seeds/.test(sql)) return { rows: [] }
    return { rows: [], rowCount: 1 }
  } }
  const plan = { course: 'ita_for_eng', entries: [{ seed_number: 190, lego_index: 1, lego_id: 'S0190L01', known_text: 'do you mind if I ask you', target_text: 'ti dispiace se ti chiedo', blocked: false, model: 'm', build: [{ known: 'do you mind if I ask', target: 'ti dispiace se chiedo' }], use: [] }] }
  await apply(pg, supabase, plan, ['S0190L01B03'])
  const del = events.find((e) => e.operation === 'phrase-delete').detail.changes
  assert.deepEqual(del.map((c) => [c.change, c.before?.known_text, c.before?.target_text, c.before?.phrase_role, c.after]), [['delete', 'do you mind if', 'ti dispiace se', 'build', null]])
  const ins = events.find((e) => e.operation === 'phrase-insert').detail.changes
  assert.equal(ins[0].change, 'create'); assert.equal(ins[0].before, null)
  assert.equal(ins[0].after.target_text, 'ti dispiace se chiedo'); assert.equal(ins[0].after.known_text, 'do you mind if I ask')
  assert.equal(ins[0].after.lego_id, 'S0190L01'); assert.equal(ins[0].after.course_code, 'ita_for_eng')
})
