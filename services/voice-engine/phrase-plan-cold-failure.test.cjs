// A COLD, FAILING PHRASE PLAN MUST NOT SLOW A BOOTH TAKE (job #602, Aran 2026-10-29).
// Run with: node services/voice-engine/phrase-plan-cold-failure.test.cjs
// With no cached plan, linkPhraseSlotsByWords returns at once instead of waiting out a failing build.
'use strict'
const assert = require('assert')
const rq = require('./recordist-queue.cjs')

;(async () => {
  // A db whose every read hangs ~300 ms then fails, as the statement-timeout builds did.
  const db = {
    from(table) {
      const q = {
        select() { return q }, in() { return q }, eq() { return q }, gte() { return q }, lt() { return q },
        order() { return q }, range() { return q },
        then(ok) {
          if (table === 'courses') return ok({ data: [{ course_code: 'cym_n_for_eng', target_lang: 'cym', known_lang: 'eng' }], error: null })
          setTimeout(() => ok({ data: null, error: { message: 'canceling statement due to statement timeout' } }), 1500)
        },
      }
      return q
    },
  }
  const recordist = { voiceId: 'human_aran_eng', language: 'eng', spellings: ['human_aran_eng'] }
  const quiet = { warn() {}, error() {}, log() {} }
  const t0 = Date.now()
  let out
  try { out = await rq.linkPhraseSlotsByWords({ db, recordist, role: 'known', text: 'Good morning', audioId: 'A1', logger: quiet }) } catch (e) { out = { threw: e.message } }
  const took = Date.now() - t0
  assert.ok(took < 300, `fill must not wait on a plan build (took ${took} ms, ${JSON.stringify(out)})`)
  console.log('ok: phrase fill returned in', took, 'ms', JSON.stringify(out))
  process.exit(0)
})().catch((e) => { console.error(e.message); process.exit(1) })
