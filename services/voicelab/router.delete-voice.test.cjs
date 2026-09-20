/**
 * DELETING A CLONE NEVER TOUCHES RENDERED AUDIO (Tom's ruling, 2026-09-20).
 *
 *   "can I delete clones - I have 3 of my voice and I only want to keep one"
 *   "we also must NOT re-render any old audio - these are the voices from now
 *    on … it's not certain that we'll [backfill] … and we definitely won't do
 *    it all in one go"
 *
 * So the route has two deletions and the clip count decides which:
 *
 *   REMOVE   nothing has ever been rendered with the voice and no slot holds
 *            it: the clone goes at Cartesia, then the `voices` row goes.
 *   RETIRE   clips exist: the row is deactivated and NOTHING else happens. No
 *            clip is deleted, none is re-pointed, none is re-rendered. The
 *            voice leaves every picker (registry.cjs `dropRetired`) and cannot
 *            be cast again, and its clips play tomorrow as they play today.
 *
 * A hard delete is REFUSED the moment a clip exists, even if asked for by
 * hand — the `voices` row is the only record of who is speaking in those
 * clips, and deleting it turns a known voice into an unknown one.
 *
 * Run: npx vitest run services/voicelab/router.delete-voice.test.cjs
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import express from 'express'
import routerPkg from './router.cjs'
const { mount } = routerPkg

/**
 * cartesia_spoken has 790 clips; azure_fresh has none; cartesia_cast is cast.
 * The clean-removal case is spelled with a non-Cartesia id deliberately: the
 * Cartesia half of that path is a live API call to the vendor and this test
 * does not stub the vendor. What is under test is WHICH deletion each voice
 * gets and what the database sees.
 */
const CLIPS = { cartesia_spoken: 790, azure_fresh: 0, cartesia_cast: 12 }
const ROLES = { cartesia_cast: [{ language: 'eng', slot: 'phrase', gender: 'm', rank: 0 }] }

const writes = []

function stubSupabase () {
  const table = (name) => {
    let voiceId = null
    // The write is recorded WHEN IT IS AWAITED, not when .update()/.delete() is
    // called: PostgREST's builder takes the verb first and `.eq('voice_id', …)`
    // after it, so recording eagerly would file every write under voiceId null.
    let pending = null
    const chain = {
      select: () => chain,
      eq: (col, val) => { if (col === 'voice_id') voiceId = val; return chain },
      maybeSingle: async () => ({
        data: name === 'voices' ? { voice_id: voiceId, display_name: voiceId, is_active: true } : null,
        error: null,
      }),
      update: (row) => { pending = { op: 'update', table: name, row }; return chain },
      delete: () => { pending = { op: 'delete', table: name }; return chain },
      then: (resolve) => {
        if (pending) { writes.push({ ...pending, voiceId }); pending = null; return resolve({ data: null, error: null }) }
        if (name === 'course_audio') return resolve({ data: [], error: null, count: CLIPS[voiceId] ?? 0 })
        if (name === 'voice_language_roles') return resolve({ data: ROLES[voiceId] || [], error: null })
        return resolve({ data: [], error: null })
      },
    }
    return chain
  }
  return { from: table }
}

let server, base
beforeAll(async () => {
  const app = express()
  app.use(express.json())
  mount(app, {
    requireAdmin: async () => ({ email: 'test@ssi' }),
    requireDashboardUser: async () => ({ email: 'test@ssi' }),
    logger: { log: () => {} },
    supabase: stubSupabase,
  })
  await new Promise((r) => { server = app.listen(0, r) })
  base = `http://127.0.0.1:${server.address().port}`
})
afterAll(() => server && server.close())
beforeEach(() => { writes.length = 0 })

const removal = (id) => fetch(`${base}/api/voicelab/voices/${id}/removal`).then((r) => r.json())
const del = (id, mode) => fetch(`${base}/api/voicelab/voices/${id}${mode ? `?mode=${mode}` : ''}`, { method: 'DELETE' })

describe('GET /voices/:voiceId/removal — the preflight, which writes nothing', () => {
  it('counts the clips and says RETIRE, in words a human reads before pressing', async () => {
    const facts = await removal('cartesia_spoken')
    expect(facts.mode).toBe('retire')
    expect(facts.clips).toBe(790)
    expect(facts.sentence).toMatch(/790 clips that already exist — they will not change/)
    expect(writes).toEqual([])
  })

  it('says REMOVE for a voice nothing has ever been rendered with', async () => {
    const facts = await removal('azure_fresh')
    expect(facts.mode).toBe('remove')
    expect(facts.clips).toBe(0)
    expect(writes).toEqual([])
  })

  it('says BLOCKED, and names the slot, for a voice that is cast', async () => {
    const facts = await removal('cartesia_cast')
    expect(facts.mode).toBe('blocked')
    expect(facts.castInto).toEqual(['phrase eng/m/rank0'])
  })
})

describe('DELETE /voices/:voiceId — no rendered clip is ever touched', () => {
  it('RETIRES a voice with clips: one is_active=false update, and no row delete', async () => {
    const res = await del('cartesia_spoken')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.mode).toBe('retire')
    expect(body.existingClips).toBe(790)
    expect(writes).toEqual([{ op: 'update', table: 'voices', voiceId: 'cartesia_spoken', row: expect.objectContaining({ is_active: false }) }])
    expect(writes.some((w) => w.table === 'course_audio')).toBe(false)
  })

  it('REFUSES a hard remove of a voice that already speaks, and writes nothing', async () => {
    const res = await del('cartesia_spoken', 'remove')
    expect(res.status).toBe(409)
    expect((await res.json()).error).toMatch(/retired rather than deleted/)
    expect(writes).toEqual([])
  })

  it('REFUSES any deletion of a voice that is still cast, and writes nothing', async () => {
    const res = await del('cartesia_cast')
    expect(res.status).toBe(409)
    expect((await res.json()).error).toMatch(/Clear those slots first/)
    expect(writes).toEqual([])
  })

  it('DELETES a voice nothing was rendered with — the only case that removes a row', async () => {
    const res = await del('azure_fresh')
    expect(res.status).toBe(200)
    expect((await res.json()).mode).toBe('remove')
    expect(writes.some((w) => w.op === 'delete' && w.table === 'voices')).toBe(true)
  })
})
