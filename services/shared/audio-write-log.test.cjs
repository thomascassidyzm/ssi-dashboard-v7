/**
 * The render route and the bulk filler each leave a content_edit_events row for the course writes they make.
 * Run: npx vitest run services/shared/audio-write-log.test.cjs
 */
import { describe, it, expect } from 'vitest'
const { renderWithEditLog, recordFillPass } = require('./audio-write-log.cjs')
const { recordContentEdit } = require('./content-edit-log.cjs')

// a supabase stand-in that captures the content_edit_events insert (the real recordContentEdit builds the row)
function fakeSb() {
  const inserts = []
  return { inserts, from(t) { return { insert(row) { inserts.push({ t, row }); return { select: () => ({ single: async () => ({ data: { id: `ev${inserts.length}` }, error: null }) }) } } } } }
}
const quiet = { error() {} }

describe('edit-log entry on every audio write', () => {
  it('a real render that wrote a clip records one event as service render-route, in the edit-log row shape', async () => {
    const sb = fakeSb()
    const out = await renderWithEditLog({ renderFn: async () => ({ ok: true, source: 'rendered', audioId: 'a1', charsSpent: 24, voiceId: 'v' }),
      input: { courseCode: 'ita_for_eng', role: 'target2', text: 'ciao', requestedBy: 'agent-x', purpose: 'p' }, deps: {}, supabase: sb })
    expect(sb.inserts).toHaveLength(1)
    expect(sb.inserts[0].t).toBe('content_edit_events')
    expect(sb.inserts[0].row).toMatchObject({ course_code: 'ita_for_eng', actor_kind: 'service', actor_id: 'render-route', operation: 'insert' })
    expect(out.editEventId).toBe('ev1')
  })
  it('a dry run, a trial and a library hit that wrote nothing record nothing', async () => {
    const sb = fakeSb()
    for (const [input, o] of [[{ courseCode: 'c', dryRun: true }, { audioId: 'a' }], [{ courseCode: 'c', trial: true }, { audioId: 'a' }], [{ courseCode: 'c' }, { dryRun: true, audioId: 'a' }]]) {
      await renderWithEditLog({ renderFn: async () => o, input, deps: {}, supabase: sb })
    }
    expect(sb.inserts).toHaveLength(0)
  })
  it('a failing log write does not undo the render and is reported on the response', async () => {
    const out = await renderWithEditLog({ renderFn: async () => ({ audioId: 'a1' }), input: { courseCode: 'c' }, deps: {}, supabase: {},
      recorder: async () => { throw new Error('db down') }, logger: quiet })
    expect(out.audioId).toBe('a1'); expect(out.editEventId).toBeNull(); expect(out.editLogError).toBe('db down')
  })
  it('the bulk filler records one event for a pass that filled slots, none for a pass that filled nothing', async () => {
    const sb = fakeSb()
    const a = await recordFillPass({ supabase: sb, courseCode: 'ita_for_eng', surface: 'phase8:POST /generate', results: { attached: 5, success: 2, reuse: { reused: 3 } }, linked: 1 })
    expect(a.eventId).toBe('ev1')
    expect(sb.inserts[0].row).toMatchObject({ actor_id: 'phase8-fill', course_code: 'ita_for_eng', scope: { rows: 8 } })
    const b = await recordFillPass({ supabase: sb, courseCode: 'ita_for_eng', surface: 's', results: { attached: 0, success: 0 } })
    expect(b.eventId).toBeNull(); expect(sb.inserts).toHaveLength(1)
  })
})
