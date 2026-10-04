/**
 * The /guess text store: a save is live at once (Tom 2026-10-04), history is kept, learners read live only.
 *
 *  1. THE PUBLIC ENDPOINT RETURNS LIVE TEXT ONLY — never a legacy draft or a superseded row.
 *  2. SAVING MAKES THE NEW TEXT LIVE, KEEPS THE OLD LIVE ROW AS HISTORY, AND STAMPS WHO AND WHEN.
 *  3. THE DRAFT/APPROVE ACTIONS ARE GONE.
 *  4. A KNOWN LANGUAGE WITH NO TEXT GETS ENGLISH; one with its own text overrides item by item.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createFakeSupabase, createFakeRes } from './lib/fake-supabase.js'

const state = vi.hoisted(() => ({ db: null, user: { email: 'aran@ssi.app' } }))
vi.mock('./lib/supabase.js', () => ({ getSupabase: () => state.db }))
vi.mock('./lib/auth.js', () => ({ verifySupabaseJWT: async () => state.user }))

const { default: admin } = await import('./guess-text.js')
const { default: published } = await import('./guess-text-published.js')

const row = (id, known_lang, kind, item_id, content, st, extra = {}) => ({ id, known_lang, kind, item_id, content, state: st, source: 'seed-live', edited_by: null, created_at: 't', approved_by: null, approved_at: null, ...extra })
let n
function seed() {
  state.db = createFakeSupabase({ guess_text_items: [
    row(1, 'eng', 'tell', 'gle', 'LIVE gle tell', 'live'),
    row(2, 'eng', 'tell', 'gle', 'DRAFT gle tell', 'draft', { source: 'seed-draft' }),
    row(3, 'eng', 'tell', 'cym', 'LIVE cym tell', 'live'),
    row(4, 'eng', 'pair', 'gle|cym', 'LIVE pair', 'live'),
    row(5, 'eng', 'tell', 'old', 'SUPERSEDED', 'superseded'),
    row(6, 'cym', 'tell', 'gle', 'LIVE gle in Welsh', 'live'),
  ] }, { defaults: { guess_text_items: (rows) => ({ id: 100 + (n = (n || 0) + 1), created_at: 'now', state: 'draft', approved_by: null }) } })
}
const get = async (handler, query) => { const res = createFakeRes(); await handler({ method: 'GET', query, headers: { authorization: 'Bearer x' } }, res); return res }
const post = async (body) => { const res = createFakeRes(); await admin({ method: 'POST', query: {}, body, headers: { authorization: 'Bearer x' } }, res); return res }

beforeEach(() => { n = 0; seed() })

describe('public read path', () => {
  it('returns live text only — never a draft or a superseded row', async () => {
    const res = await get(published, { known: 'eng' })
    expect(res.body.items.tell).toEqual({ gle: 'LIVE gle tell', cym: 'LIVE cym tell' })
    expect(JSON.stringify(res.body)).not.toMatch(/DRAFT|SUPERSEDED/)
  })
  it('falls back to English per item for a known language, and prefers its own text', async () => {
    const res = await get(published, { known: 'cym' })
    expect(res.body.items.tell.gle).toBe('LIVE gle in Welsh')
    expect(res.body.items.tell.cym).toBe('LIVE cym tell')
    expect(res.body.fallbackFrom).toBe('eng')
    const none = await get(published, { known: 'fra' })
    expect(none.body.items.tell.gle).toBe('LIVE gle tell')
  })
  it('refuses a malformed known language', async () => {
    expect((await get(published, { known: 'e;n' })).statusCode).toBe(400)
  })
})

describe('editor', () => {
  it('save is live at once, supersedes the old live row and stamps who and when', async () => {
    const res = await post({ action: 'save', known: 'eng', kind: 'tell', id: 'cym', content: 'Aran says this' })
    expect(res.body.ok).toBe(true)
    expect((await get(published, { known: 'eng' })).body.items.tell.cym).toBe('Aran says this')
    const rows = state.db.tables.guess_text_items
    expect(rows.find(r => r.content === 'Aran says this')).toMatchObject({ state: 'live', source: 'editor', edited_by: 'aran@ssi.app', approved_by: 'aran@ssi.app' })
    expect(rows.find(r => r.id === 3).state).toBe('superseded')
    expect(rows.filter(r => r.item_id === 'cym' && r.state === 'live')).toHaveLength(1)
  })
  it('cannot invent an item id', async () => {
    expect((await post({ action: 'save', known: 'eng', kind: 'tell', id: 'zzz', content: 'x' })).statusCode).toBe(404)
  })
  it('there is no approve, approve-all or discard any more', async () => {
    for (const action of ['approve', 'approve-all', 'discard']) {
      expect((await post({ action, known: 'eng', kind: 'tell', id: 'gle' })).statusCode).toBe(400)
    }
    expect((await get(published, { known: 'eng' })).body.items.tell.gle).toBe('LIVE gle tell')
  })
  it('the editor listing shows the live text only', async () => {
    const res = await get(admin, { known: 'eng' })
    const gle = res.body.items.find(i => i.id === 'gle')
    expect(gle.live.content).toBe('LIVE gle tell')
    expect(gle.draft).toBeUndefined()
    expect(res.body.items.find(i => i.id === 'old')).toBeUndefined()
  })
})
