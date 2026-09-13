// #522: the bulk driver writes a pod reuse pointer ONLY where the column is
// still null at write time — the same guard /generate-pods link_only applies.
// Before this the in-process queue did a bare .update().eq('id'), so a pointer
// another writer had set between the read and the write was overwritten.
// ESM import of vitest inside a .cjs test — house style (pod-visibility.test.cjs).
import { describe, it, expect } from 'vitest'

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://stub.invalid'
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'stub'
const { linkPodClipIfStillNull } = require('./pod-bulk-migrate.cjs')

function stubSupabase (rowsByFilter) {
  const calls = []
  return {
    calls,
    from (table) {
      const call = { table, filters: {} }
      const api = {
        update (patch) { call.patch = patch; return api },
        eq (col, val) { call.filters[col] = val; return api },
        is (col, val) { call.filters[`${col} is`] = val; return api },
        select () { calls.push(call); return Promise.resolve({ data: rowsByFilter(call), error: null }) },
      }
      return api
    },
  }
}

describe('linkPodClipIfStillNull', () => {
  it('asserts the column is null in the write itself and reports a row already linked as skipped', async () => {
    const db = stubSupabase(call => call.filters['known_audio_id is'] === null ? [] : [{ id: 'S1' }])
    const r = await linkPodClipIfStillNull(db, { sentence_id: 'S1', link_column: 'known_audio_id' }, 'CLIP')
    expect(db.calls[0].filters).toMatchObject({ id: 'S1', 'known_audio_id is': null })
    expect(db.calls[0].patch).toEqual({ known_audio_id: 'CLIP' })
    expect(r).toEqual({ written: false })
  })

  it('writes where the column is still null', async () => {
    const db = stubSupabase(() => [{ id: 'S1' }])
    expect(await linkPodClipIfStillNull(db, { sentence_id: 'S1', link_column: 'target_audio_id' }, 'CLIP')).toEqual({ written: true })
  })

  it('fails closed on a write error', async () => {
    const db = { from: () => ({ update: () => ({ eq: () => ({ is: () => ({ select: async () => ({ data: null, error: { message: 'boom' } }) }) }) }) }) }
    await expect(linkPodClipIfStillNull(db, { sentence_id: 'S1', link_column: 'known_audio_id' }, 'CLIP')).rejects.toThrow(/link: boom/)
  })
})
