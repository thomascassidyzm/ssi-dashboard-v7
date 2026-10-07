// Review #895 regression: Dan's clip belongs to a DRAFT/hidden course but a
// RELEASED course's slot references it (linkSeedTake links one clip across
// courses). The live guard must still refuse. The fake client answers by the
// table/column the query names, over a small in-memory world.
'use strict'
const test = require('node:test')
const assert = require('node:assert')
const { liveCoursesForVoice } = require('./recordist-rerecord-all.cjs')

const COURSES = { draft_c: { status: 'draft', new_app_status: 'not_available', visibility: 'hidden' },
                  live_c: { status: 'released', new_app_status: 'live', visibility: 'public' } }
const reachable = (code) => { const c = COURSES[code]; return c.status === 'released' || ['live', 'beta'].includes(c.new_app_status) || c.visibility === 'beta' }

function fake(world) {
  return async () => ({
    async end() {},
    async query(sql, params) {
      const ids = params[params.length - 1] && Array.isArray(params[0]) ? params[0] : null
      if (/from course_audio where language/.test(sql)) return { rows: world.clips.map((id) => ({ id })) }
      if (/from course_audio ca join courses/.test(sql)) return { rows: world.owner.filter(reachable).map((course_code) => ({ course_code })) }
      const m = sql.match(/from (\w+) t join/)
      const col = (sql.split(' where ')[1].match(/t\.(\w+)/) || [])[1]
      const rows = (world.slots[`${m[1]}.${col}`] || []).filter(reachable).map((course_code) => ({ course_code }))
      return { rows }
    },
  })
}
const args = { language: 'cym', spellings: ['human_dan_cym_s'] }

test('clip owned by a draft course but referenced by a released course\'s seed slot is LIVE', async () => {
  const live = await liveCoursesForVoice({ ...args, connect: fake({ clips: ['X'], owner: ['draft_c'], slots: { 'course_seeds.target1_audio_id': ['live_c'] } }) })
  assert.deepStrictEqual(live, ['live_c'])
})
test('a pod slot counts via its parent course', async () => {
  const live = await liveCoursesForVoice({ ...args, connect: fake({ clips: ['X'], owner: ['draft_c'], slots: { 'listening_pod_sentences.target_audio_id': ['live_c'] } }) })
  assert.deepStrictEqual(live, ['live_c'])
})
test('draft-only ownership and references is not live; no clips is not live', async () => {
  assert.deepStrictEqual(await liveCoursesForVoice({ ...args, connect: fake({ clips: ['X'], owner: ['draft_c'], slots: { 'course_seeds.target1_audio_id': ['draft_c'] } }) }), [])
  assert.deepStrictEqual(await liveCoursesForVoice({ ...args, connect: fake({ clips: [], owner: [], slots: {} }) }), [])
})
