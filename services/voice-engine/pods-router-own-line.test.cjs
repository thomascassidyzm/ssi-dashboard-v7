/**
 * pods-router-own-line.test.cjs — the ownLineOnly gate on PATCH
 * /sentence/:sentenceId (job #324, foreign-eyes finding, 2026-09-12).
 *
 * The sentence SELECT for this route did not read `speaker`, so
 * `sentence.speaker` was always undefined, `podCast[undefined]` was always
 * null, and `isOwnPodLine` always returned false — a correctly cast artist
 * editing their own line was refused 403 not_your_line every time. The
 * helper-level tests in casting-rights.test.cjs pass a castEntry directly and
 * never exercise this query, so they could not have caught it.
 */

'use strict'

const test = require('node:test')
const assert = require('node:assert')
const createPodsCastRouter = require('./pods-router.cjs')

// Column projection matters here: the whole bug is a SELECT that omitted
// `speaker`, so this stub actually strips to the requested columns rather
// than handing back full rows regardless of what was asked for.
function stubDb(tables) {
  return {
    from(table) {
      let rows = (tables[table] || []).slice()
      let cols = null
      const q = {
        select(colsArg) { cols = String(colsArg).split(',').map((c) => c.trim()); return q },
        eq(col, val) { rows = rows.filter((r) => r[col] === val); return q },
        maybeSingle() {
          const row = rows[0] || null
          const projected = row && cols ? Object.fromEntries(cols.filter((c) => c in row).map((c) => [c, row[c]])) : row
          return Promise.resolve({ data: projected, error: null })
        },
        single() { return q.maybeSingle() },
      }
      return q
    },
  }
}

const TABLES = {
  listening_pod_sentences: [
    { id: 'S1', pod_id: 'P1', speaker: 'Aran', target_text: 'Bore da.', known_text: 'Good morning.', target_audio_id: null, known_audio_id: null },
  ],
  listening_pods: [{ id: 'P1', course_code: 'cym_n_for_eng' }],
  courses: [{ course_code: 'cym_n_for_eng', voice_config: { podCast: { Aran: { voiceId: 'human_aran_cym_n', email: 'aran@example.com' } } } }],
}

function handler() {
  const router = createPodsCastRouter({
    requireDashboardUser: async () => ({}),
    userCanAccessCourse: () => true,
    getDb: () => stubDb(TABLES),
    logger: { log() {}, info() {}, warn() {}, error() {} },
    castingRights: { ...require('./casting-rights.cjs'), recordAccess() {} },
  })
  const layer = router.stack.find((l) => l.route && l.route.path === '/sentence/:sentenceId' && l.route.methods.patch)
  return layer.route.stack[0].handle
}

function mockRes() {
  const out = {}
  const res = { status(c) { out.status = c; return res }, json(b) { out.body = b; out.resolve(out); return res } }
  out.settled = new Promise((r) => { out.resolve = r })
  return { res, out }
}

test('a cast artist editing their own line is accepted, not refused not_your_line', async () => {
  const { res, out } = mockRes()
  const req = {
    params: { courseCode: 'cym_n_for_eng', sentenceId: 'S1' },
    body: { target_text: 'Prynhawn da.' },
    dashboardUser: { email: 'aran@example.com', casting: [{ courseCode: 'cym_n_for_eng', voiceId: 'human_aran_cym_n' }] },
    ownLineOnly: true,
  }
  await handler()(req, res)
  const result = await out.settled
  assert.notEqual(result.status, 403, `expected the cast artist's own-line edit to be accepted, got ${result.status} ${JSON.stringify(result.body)}`)
  assert.notEqual(result.body && result.body.reason, 'not_your_line')
})
