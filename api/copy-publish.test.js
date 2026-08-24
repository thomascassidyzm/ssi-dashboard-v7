/**
 * Save is not publish, and publish is reversible.
 *
 * The load-bearing assertions, in the order they matter:
 *
 * 1. A SAVE AFTER A PUBLISH LEAVES THE LIVE TEXT ALONE. The editor autosaves
 *    every two seconds; if any of that reached a learner, the draft safety net
 *    would be a live wire.
 * 2. PUBLISHING AN OLDER ROW ROLLS BACK. That is the whole undo story — no
 *    delete, no overwrite of content, just a newer stamp on an older row.
 * 3. THE PUBLIC ENDPOINT CANNOT REACH A DRAFT. It is the only unauthenticated
 *    surface in the Copy area, so "unpublished text is unreachable without a
 *    JWT" is the one thing it must never get wrong.
 * 4. A DOC THAT HAS NEVER BEEN PUBLISHED 404s rather than falling back to the
 *    newest save or the frozen original — the learner app answers that with its
 *    own built-in text, and a helpful fallback here would publish by accident.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createFakeSupabase, createFakeRes } from './lib/fake-supabase.js'
import { liveVersion, versionList, publicationState, nextPublishStamp } from './lib/copy-publish.js'

const state = vi.hoisted(() => ({ db: null, user: { email: 'kai@ssi.app' } }))

vi.mock('./lib/supabase.js', () => ({ getSupabase: () => state.db }))
vi.mock('./lib/auth.js', () => ({ verifySupabaseJWT: async () => state.user }))

const { handleCopy } = await import('./copy.js')
const { default: publishedHandler } = await import('./copy-published.js')

const ORIGINAL = 'the frozen original'
const EDITED = 'the words Aran changed'
const NEWER = 'the words Aran changed again'

const TABLE = 'htw_copy_versions'

/** htw: original (1), two saves (2, 3). Nothing published — today's real state. */
function seed(rows) {
  return createFakeSupabase(
    {
      [TABLE]: rows ?? [
        { id: 1, doc_id: 'htw', kind: 'original', content: ORIGINAL, saved_by: 'seed', saved_at: '2026-08-01T10:00:00Z', published_at: null, published_by: null },
        { id: 2, doc_id: 'htw', kind: 'save', content: EDITED, saved_by: 'aran@ssi.app', saved_at: '2026-08-02T10:00:00Z', published_at: null, published_by: null },
        { id: 3, doc_id: 'htw', kind: 'save', content: NEWER, saved_by: 'aran@ssi.app', saved_at: '2026-08-03T10:00:00Z', published_at: null, published_by: null },
        // A second doc, so every query has something it must NOT pick up.
        { id: 4, doc_id: 'onboarding', kind: 'original', content: 'other doc', saved_by: 'seed', saved_at: '2026-08-01T10:00:00Z', published_at: null, published_by: null },
      ],
    },
    {
      defaults: {
        [TABLE]: existing => ({
          id: existing.reduce((m, r) => Math.max(m, Number(r.id)), 0) + 1,
          saved_at: new Date().toISOString(),
          published_at: null,
          published_by: null,
        }),
      },
    }
  )
}

const rowsOf = () => state.db.tables[TABLE]
const htwRows = () => rowsOf().filter(r => r.doc_id === 'htw')
const row = id => rowsOf().find(r => Number(r.id) === id)

function get(query = {}) {
  const res = createFakeRes()
  return handleCopy({ method: 'GET', headers: { authorization: 'Bearer t' }, query }, res).then(() => res)
}

function save(content, query = { doc: 'htw' }) {
  const res = createFakeRes()
  return handleCopy({ method: 'POST', headers: { authorization: 'Bearer t' }, query, body: { content } }, res).then(() => res)
}

function publish(body = {}, query = { doc: 'htw', publish: '1' }) {
  const res = createFakeRes()
  return handleCopy({ method: 'POST', headers: { authorization: 'Bearer t' }, query, body }, res).then(() => res)
}

function readPublished(query = { doc: 'htw' }, method = 'GET') {
  const res = createFakeRes()
  return publishedHandler({ method, query }, res).then(() => res)
}

beforeEach(() => {
  state.db = seed()
  state.user = { email: 'kai@ssi.app' }
})

// ---------------------------------------------------------------------------

describe('the rules, over rows', () => {
  it('nothing published means nothing live', () => {
    expect(liveVersion(htwRows())).toBe(null)
  })

  it('the greatest published_at wins, not the greatest id', () => {
    const rows = [
      { id: 2, published_at: '2026-08-10T00:00:00Z', content: 'b' },
      { id: 9, published_at: '2026-08-04T00:00:00Z', content: 'a' },
      { id: 11, published_at: null, content: 'draft' },
    ]
    expect(liveVersion(rows).id).toBe(2)
  })

  it('a legacy published_at tie still resolves, so the order is always total', () => {
    const same = '2026-08-10T00:00:00Z'
    const rows = [{ id: 5, published_at: same }, { id: 7, published_at: same }]
    expect(liveVersion(rows).id).toBe(7)
    expect(liveVersion([...rows].reverse()).id).toBe(7)
  })

  it('a publish is never stamped at or before the one it replaces', () => {
    // The failure this prevents: a rollback clicked in the same millisecond as
    // the publish it undoes ties, and the older row — which IS the rollback
    // target — loses any id-based tie-break. Two clicks a millisecond apart
    // would leave the wrong words in front of learners, silently.
    const live = { id: 9, published_at: '2026-08-10T00:00:00.500Z' }
    const sameMs = new Date('2026-08-10T00:00:00.500Z')
    expect(nextPublishStamp(live, sameMs)).toBe('2026-08-10T00:00:00.501Z')
    // A clock that has gone backwards is handled by the same rule.
    expect(nextPublishStamp(live, new Date('2026-08-09T00:00:00.000Z'))).toBe('2026-08-10T00:00:00.501Z')
    // Normally it is simply now().
    expect(nextPublishStamp(live, new Date('2026-08-11T00:00:00.000Z'))).toBe('2026-08-11T00:00:00.000Z')
    expect(nextPublishStamp(null, sameMs)).toBe('2026-08-10T00:00:00.500Z')
  })

  it('the version list is newest first, carries the original, and flags exactly one live row', () => {
    const rows = htwRows().map(r => (Number(r.id) === 2 ? { ...r, published_at: '2026-08-05T00:00:00Z' } : r))
    const list = versionList(rows)
    expect(list.map(v => v.versionId)).toEqual([3, 2, 1])
    expect(list.filter(v => v.isLive).map(v => v.versionId)).toEqual([2])
    // The frozen original is offered as a rollback target — republishing it is
    // how the whole document goes back to where it started.
    expect(list.find(v => v.versionId === 1).kind).toBe('original')
    // A picker, not a payload: no content is shipped in the list.
    expect(list.every(v => !('content' in v))).toBe(true)
  })

  it('draftDiffers compares words, not version numbers', () => {
    const rows = htwRows().map(r => (Number(r.id) === 3 ? { ...r, published_at: '2026-08-05T00:00:00Z' } : r))
    const draft = rows.find(r => Number(r.id) === 3)
    expect(publicationState(rows, draft).draftDiffers).toBe(false)
    // Same words saved again under a new id: a learner is reading exactly what
    // the editor sees, so the status line must not nag.
    const resaved = { id: 4, kind: 'save', content: NEWER, published_at: null }
    expect(publicationState([...rows, resaved], resaved).draftDiffers).toBe(false)
    expect(publicationState([...rows, { id: 5, content: 'something else' }], { content: 'something else' }).draftDiffers).toBe(true)
  })

  it('with nothing published, the draft always differs — there is nothing to match', () => {
    expect(publicationState(htwRows(), htwRows()[0]).draftDiffers).toBe(true)
  })
})

describe('saving never publishes', () => {
  it('a plain save leaves published_at null on the new row', async () => {
    const res = await save('a fresh draft')
    expect(res.statusCode).toBe(200)
    expect(res.body.ok).toBe(true)
    const created = row(res.body.versionId)
    expect(created.content).toBe('a fresh draft')
    expect(created.published_at).toBe(null)
    expect(liveVersion(htwRows())).toBe(null)
  })

  it('a save AFTER a publish leaves the published text untouched', async () => {
    await publish({ versionId: 2 })
    const liveBefore = liveVersion(htwRows())
    expect(liveBefore.content).toBe(EDITED)

    await save('an autosave two seconds later')

    const liveAfter = liveVersion(htwRows())
    expect(liveAfter.id).toBe(liveBefore.id)
    expect(liveAfter.content).toBe(EDITED)

    // And the learner endpoint agrees.
    const pub = await readPublished()
    expect(pub.statusCode).toBe(200)
    expect(pub.body.content).toBe(EDITED)
  })
})

describe('publishing', () => {
  it('with no version named, publishes the newest save', async () => {
    const res = await publish()
    expect(res.statusCode).toBe(200)
    expect(res.body.versionId).toBe(3)
    expect(res.body.publishedBy).toBe('kai@ssi.app')
    expect(liveVersion(htwRows()).content).toBe(NEWER)
  })

  it('accepts publish as a body field as well as a query flag', async () => {
    const res = await publish({ publish: true }, { doc: 'htw' })
    expect(res.statusCode).toBe(200)
    expect(res.body.versionId).toBe(3)
    // The row count is unchanged: publishing stamps, it never mints.
    expect(htwRows()).toHaveLength(3)
  })

  it('never copies, edits or deletes content — a publish only stamps', async () => {
    const before = htwRows().map(r => ({ id: r.id, content: r.content }))
    await publish({ versionId: 2 })
    expect(htwRows().map(r => ({ id: r.id, content: r.content }))).toEqual(before)
  })

  it('publishing an older row rolls back', async () => {
    await publish({ versionId: 3 })
    expect(liveVersion(htwRows()).content).toBe(NEWER)

    const res = await publish({ versionId: 2 })
    expect(res.statusCode).toBe(200)
    expect(res.body.rolledBack).toBe(true)
    expect(liveVersion(htwRows()).content).toBe(EDITED)

    // Both rows are still there, both still carry their own words.
    expect(row(3).content).toBe(NEWER)
    expect(row(2).content).toBe(EDITED)

    // And forward again — rollback is not a one-way door.
    await publish({ versionId: 3 })
    expect(liveVersion(htwRows()).content).toBe(NEWER)
  })

  it('publishing the frozen original puts the whole document back', async () => {
    await publish({ versionId: 3 })
    await publish({ versionId: 1 })
    expect(liveVersion(htwRows()).content).toBe(ORIGINAL)
    const pub = await readPublished()
    expect(pub.body.content).toBe(ORIGINAL)
  })

  it('republishing what is already live is a no-op, not a new publish event', async () => {
    const first = await publish({ versionId: 2 })
    const again = await publish({ versionId: 2 })
    expect(again.body.alreadyLive).toBe(true)
    expect(again.body.publishedAt).toBe(first.body.publishedAt)
  })

  it('refuses a version id that belongs to another document', async () => {
    const res = await publish({ versionId: 4 })
    expect(res.statusCode).toBe(404)
    expect(row(4).published_at).toBe(null)
  })

  it('refuses an unknown version id', async () => {
    const res = await publish({ versionId: 999 })
    expect(res.statusCode).toBe(404)
  })

  it('refuses an unsigned-in caller', async () => {
    const res = createFakeRes()
    await handleCopy({ method: 'POST', headers: {}, query: { doc: 'htw', publish: '1' }, body: {} }, res)
    expect(res.statusCode).toBe(401)
    expect(liveVersion(htwRows())).toBe(null)
  })

  it('refuses a sign-in with no Popty access', async () => {
    state.user = null
    const res = await publish({ versionId: 2 })
    expect(res.statusCode).toBe(403)
    expect(liveVersion(htwRows())).toBe(null)
  })
})

describe('what the editor is told', () => {
  it('reports nothing live, and the draft as unpublished, before any publish', async () => {
    const res = await get({ doc: 'htw' })
    expect(res.body.published).toBe(null)
    expect(res.body.publishedContent).toBe(null)
    expect(res.body.draftDiffers).toBe(true)
    expect(res.body.current).toBe(NEWER)
    expect(res.body.original).toBe(ORIGINAL)
    expect(res.body.versionList.map(v => v.versionId)).toEqual([3, 2, 1])
  })

  it('reports who published what and when, once something is live', async () => {
    await publish({ versionId: 2 })
    const res = await get({ doc: 'htw' })
    expect(res.body.published.versionId).toBe(2)
    expect(res.body.published.publishedBy).toBe('kai@ssi.app')
    expect(res.body.publishedContent).toBe(EDITED)
    // The box holds save 3; a learner is reading save 2.
    expect(res.body.draftDiffers).toBe(true)
    expect(res.body.versionList.find(v => v.versionId === 2).isLive).toBe(true)
  })

  it('the index flags a surface whose editing a learner cannot see yet', async () => {
    const before = await get({ list: '1' })
    const htwBefore = before.body.docs.find(d => d.id === 'htw')
    expect(htwBefore.unpublished).toBe(true)
    expect(htwBefore.publishedAt).toBe(null)

    await publish()
    const after = await get({ list: '1' })
    const htwAfter = after.body.docs.find(d => d.id === 'htw')
    expect(htwAfter.unpublished).toBe(false)
    expect(htwAfter.publishedBy).toBe('kai@ssi.app')

    await save('and one more edit')
    const later = await get({ list: '1' })
    expect(later.body.docs.find(d => d.id === 'htw').unpublished).toBe(true)
  })
})

describe('the learner read path', () => {
  it('an unauthenticated caller can read published text', async () => {
    await publish({ versionId: 2 })
    const res = await readPublished()
    expect(res.statusCode).toBe(200)
    expect(res.body.content).toBe(EDITED)
    expect(res.body.versionId).toBe(2)
    expect(res.body.publishedBy).toBe('kai@ssi.app')
    expect(res.headers['Cache-Control']).toBe('public, s-maxage=60, stale-while-revalidate=300')
    expect(res.headers['Access-Control-Allow-Origin']).toBe('*')
  })

  it('an unauthenticated caller CANNOT read a draft', async () => {
    // Save 3 is the newest text by a mile; save 2 is what was published.
    await publish({ versionId: 2 })
    const res = await readPublished()
    expect(res.body.content).not.toBe(NEWER)
    expect(res.body.content).toBe(EDITED)
    // Nothing in the response leaks the draft's words or its existence.
    expect(JSON.stringify(res.body)).not.toContain(NEWER)
  })

  it('404s when nothing has ever been published — no fallback to a save or the original', async () => {
    const res = await readPublished()
    expect(res.statusCode).toBe(404)
    expect(res.body.error).toBe('Nothing published yet')
    expect(res.body.id).toBe('htw')
    expect(res.body.content).toBeUndefined()
  })

  it('cannot be asked for a specific version', async () => {
    await publish({ versionId: 2 })
    // A caller who tries anyway gets the live text, never the row they named.
    const res = await readPublished({ doc: 'htw', versionId: 3, id: 3 })
    expect(res.body.content).toBe(EDITED)
  })

  it('refuses an unregistered doc id', async () => {
    const res = await readPublished({ doc: 'invented-doc' })
    expect(res.statusCode).toBe(404)
    expect(res.body.error).toMatch(/No such copy document/)
  })

  it('does not cross documents', async () => {
    await publish({ versionId: 2 })
    const res = await readPublished({ doc: 'onboarding' })
    expect(res.statusCode).toBe(404)
  })

  it('refuses to be written to', async () => {
    const res = await readPublished({ doc: 'htw' }, 'POST')
    expect(res.statusCode).toBe(405)
  })
})

describe('the /api/htw-copy alias', () => {
  it('still answers for htw without a ?doc, and publishes through the same path', async () => {
    const res = createFakeRes()
    await handleCopy({ method: 'GET', headers: { authorization: 'Bearer t' }, query: {} }, res, 'htw')
    expect(res.statusCode).toBe(200)
    expect(res.body.id).toBe('htw')
    expect(res.body.current).toBe(NEWER)

    const pubRes = createFakeRes()
    await handleCopy({ method: 'POST', headers: { authorization: 'Bearer t' }, query: { publish: '1' }, body: {} }, pubRes, 'htw')
    expect(pubRes.body.versionId).toBe(3)
  })
})
