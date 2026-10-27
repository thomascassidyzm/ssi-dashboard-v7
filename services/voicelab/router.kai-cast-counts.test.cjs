/**
 * KAI'S CAST IS A CAST (job #174; r-2026-10-15-kai-can-do-anything-in-popty).
 *
 * #172 cast ara_for_eng's target voices through the Kai-only agent key and every
 * render was then refused VOICE_POLICY target-uncast: the gate counted a row as
 * real only if Tom's account, a named ruling or a "Tom…" note wrote it. The fix is
 * by IDENTITY, not by loosening: a slot PUT the Kai key signed is stamped
 * 'kai-key:<id>', and that stamp (or Kai's own Voice Lab account) counts. The
 * shared agent key signing a kai- id does NOT, nor does any other agent.
 *
 * Drives the real slot PUT, takes the assigned_by it writes, and asks the real
 * render-voice answer (resolveVoice) whether that row is a cast.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import express from 'express'
import routerPkg from './router.cjs'
import rv from '../shared/resolve-voice.cjs'
import gate from '../shared/voice-cast-gate.cjs'
const { mount } = routerPkg
const { resolveVoice } = rv
const { isTomCastRow } = gate

let written = []
let signer = null
function stubSupabase () {
  const chain = {
    select: () => chain, eq: () => chain, in: () => chain, limit: async () => ({ data: [], error: null }),
    maybeSingle: async () => ({ data: { voice_id: 'cartesia_ara-f0', gender: 'f' } }),
    upsert: async () => ({ error: null }),
    then: (resolve) => resolve({ data: [], error: null }),
  }
  return {
    from: () => chain,
    rpc: async (fn, a) => {
      if (fn === 'cast_voice_role') written.push(a)
      return { data: { swapped: false, displaced: null }, error: null }
    },
  }
}

let server, base
beforeAll(async () => {
  const app = express()
  app.use(express.json())
  mount(app, {
    requireAdmin: async (_req, res) => { res.status(403).json({ error: 'Admin access required' }); return null },
    requireAdminOrAgent: async (req) => { req.agentAdmin = signer; return signer.user },
    requireDashboardUser: async () => null,
    logger: { log: () => {}, error: () => {}, warn: () => {} },
    supabase: stubSupabase,
  })
  await new Promise((r) => { server = app.listen(0, r) })
  base = `http://127.0.0.1:${server.address().port}`
})
afterAll(() => server && server.close())

const agent = (id, keyPrefix, scopes) => ({ agent: id, keyPrefix, scopes, user: { email: `agent:${id}`, role: 'admin', viaAgentKey: true } })
async function castAs (s) {
  signer = s; written = []
  const r = await fetch(`${base}/api/voicelab/languages/ara/slot`, {
    method: 'PUT', headers: { 'x-agent-admin': 'v1.x', 'content-type': 'application/json' },
    body: JSON.stringify({ slot: 'phrase', gender: 'f', rank: 0, voiceId: 'cartesia_ara-f0', notes: 'Kai pick from blind audition' }),
  })
  expect(r.status).toBe(200)
  expect(written).toHaveLength(1)
  return { language: 'ara', gender: 'f', rank: 0, slot: 'phrase', voice_id: 'cartesia_ara-f0', notes: written[0].p_notes, assigned_by: written[0].p_assigned_by }
}
const ARA = { course_code: 'ara_for_eng', known_lang: 'eng', target_lang: 'ara' }
const answer = (row) => resolveVoice({ course: ARA, role: 'target1' }, { roles: [row] })

describe("a cast written by Kai's own key renders", () => {
  it('the Kai-only key (admin:all, prefix kai) is stamped kai-key: and resolves to the voice', async () => {
    const row = await castAs(agent('kai-174-ara-cast', 'kai', ['admin:all']))
    expect(row.assigned_by).toBe('kai-key:kai-174-ara-cast')
    expect(answer(row)).toMatchObject({ status: 'voice', voiceId: 'cartesia_ara-f0', rule: 'target-cast' })
  })
  it("Kai's own Voice Lab account counts", () => {
    expect(isTomCastRow({ assigned_by: 'kai@saysomethingin.com', notes: 'Kai pick' })).toBe(true)
  })
})

describe('nobody else gets in by it', () => {
  it('the SHARED key signing a kai- id stays draft (it may sign any id)', async () => {
    const row = await castAs(agent('kai-172-ara-cast', null, ['voice-slot:write', 'admin:all']))
    expect(row.assigned_by).toBe('agent:kai-172-ara-cast')
    expect(answer(row)).toMatchObject({ status: 'refuse', rule: 'target-uncast' })
  })
  it('a hand-typed kai-key: stamp needs a kai- id; a draft note still wins', () => {
    expect(isTomCastRow({ assigned_by: 'kai-key:watson-1', notes: '' })).toBe(false)
    expect(isTomCastRow({ assigned_by: 'kai-key:kai-x', notes: 'draft casting 2026-09-04 — mechanical fill' })).toBe(false)
  })
})
