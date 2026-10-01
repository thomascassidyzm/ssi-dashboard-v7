/**
 * The audio-pass queue keeps a HELD request held (Tom 2026-09-28, job #569).
 * Run: npx vitest run services/shared/audio-pass-queue.test.cjs
 */
import { describe, it, expect } from 'vitest'
const { queueAudioPass } = require('./audio-pass-queue.cjs')

// Just enough of the supabase-js builder for queueAudioPass: select → filters → maybeSingle, update, insert.
function fakeSupabase(rows) {
  return {
    rows,
    from() {
      const f = { eq: {}, in: {} }
      const q = {
        select() { return q },
        eq(k, v) { f.eq[k] = v; return q },
        in(k, v) { f.in[k] = v; return q },
        order() { return q }, limit() { return q },
        async maybeSingle() {
          const hit = rows.filter(r => Object.entries(f.eq).every(([k, v]) => r[k] === v) && Object.entries(f.in).every(([k, v]) => v.includes(r[k])))
          return { data: hit[0] || null, error: null }
        },
        update(patch) { return { eq: async (k, v) => { rows.filter(r => r[k] === v).forEach(r => Object.assign(r, patch)); return { error: null } } } },
        insert(row) { const r = { id: `new-${rows.length}`, status: 'pending', ...row }; rows.push(r); return { select: () => ({ single: async () => ({ data: r, error: null }) }) } },
      }
      return q
    },
  }
}

describe('queueAudioPass and a held request', () => {
  it('a new text edit joins the held request and it stays held — no fresh pending row', async () => {
    const sb = fakeSupabase([{ id: 'h1', course_code: 'deu_for_eng', status: 'held', metadata: { hold: { by: 'Tom' } } }])
    const r = await queueAudioPass(sb, { courseCode: 'deu_for_eng', reason: 'later edit', metadata: { rowsTouched: 3 } })
    expect(r).toMatchObject({ touched: true, id: 'h1', held: true })
    expect(sb.rows).toHaveLength(1)
    expect(sb.rows[0]).toMatchObject({ status: 'held', metadata: { hold: { by: 'Tom' }, rowsTouched: 3 } })
  })

  it('with no open request a new pending row is queued as before', async () => {
    const sb = fakeSupabase([{ id: 'f1', course_code: 'deu_for_eng', status: 'fulfilled', metadata: {} }])
    const r = await queueAudioPass(sb, { courseCode: 'deu_for_eng', reason: 'edit' })
    expect(r.queued).toBe(true)
    expect(sb.rows.filter(x => x.status === 'pending')).toHaveLength(1)
  })

  it('append: joining an open request keeps its reason and requester, metadata under its own key', async () => {
    const sb = fakeSupabase([{ id: 'p1', course_code: 'cat_for_eng', status: 'pending', reason: 'Earlier pronunciation repairs', requested_by: 'X', metadata: { rows: 99 } }])
    await queueAudioPass(sb, { courseCode: 'cat_for_eng', reason: 'job 46: 8 phrases', requestedBy: '@sweep', metadata: { rows: 8 }, append: true, metadataKey: 'cat-deborah' })
    expect(sb.rows).toHaveLength(1)
    expect(sb.rows[0]).toMatchObject({ reason: 'Earlier pronunciation repairs; job 46: 8 phrases', requested_by: 'X', metadata: { rows: 99, 'cat-deborah': { rows: 8 } } })
  })
})
