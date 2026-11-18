// The rule of approval-origin.cjs (job #116·AI): an approval counts only when the surface says the sending conversation is on
// the seat the token names. Not run while tests are off estate-wide (r-2026-11-03); it is here so the rule is written in code.
import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
const { verifyApprovalOrigin, originMismatch, approvalHeaders } = createRequire(import.meta.url)('./approval-origin.cjs')

const TOKEN = 'c1.23d290e6-bdad-4e31-a1f3-5e18a9b44a5b.' + 'x'.repeat(43)
const KAI = 'kai:2026-11-16:re-record S0301 known cues'
const surface = (status, body, seen = []) => async (url, opts) => { seen.push({ url, opts }); return { ok: status === 200, status, json: async () => body } }

describe('approval origin', () => {
  it('passes a kai: approval sent from a Kai-seat conversation', async () => {
    await expect(verifyApprovalOrigin(KAI, TOKEN, { fetchImpl: surface(200, { id: 'kai' }) })).resolves.toEqual({ approver: 'kai', seat: 'kai' })
  })
  it('refuses a forged kai: approval with no x-cs-conv, and never asks the surface (no header there answers "tom")', async () => {
    const seen = []
    await expect(verifyApprovalOrigin(KAI, undefined, { fetchImpl: surface(200, { id: 'tom' }, seen) })).rejects.toMatchObject({ code: 'APPROVAL_UNVERIFIED', status: 403 })
    expect(seen).toHaveLength(0)
  })
  it('refuses a token the surface rejects (bad signature)', async () => {
    await expect(verifyApprovalOrigin(KAI, TOKEN, { fetchImpl: surface(403, { error: 'bad signature' }) })).rejects.toMatchObject({ code: 'APPROVAL_UNVERIFIED' })
  })
  it('refuses a kai: approval from another seat, and a tom: approval from Kai', async () => {
    await expect(verifyApprovalOrigin(KAI, TOKEN, { fetchImpl: surface(200, { id: 'dom' }) })).rejects.toThrow(/on dom's seat/)
    expect(originMismatch('tom:2026-11-16:something here', 'kai')).toMatch(/says tom/)
    expect(originMismatch(KAI, 'tom')).toMatch(/says kai/)
  })
  it('fails closed when the surface cannot be reached, and says why', async () => {
    const down = async () => { throw Object.assign(new Error('fetch failed'), { cause: { code: 'ECONNREFUSED' } }) }
    await expect(verifyApprovalOrigin(KAI, TOKEN, { fetchImpl: down })).rejects.toThrow(/could not be reached.*ECONNREFUSED/)
  })
  it('tools send the conversation token only with an approval', () => {
    expect(approvalHeaders({ approval: KAI }, { CS_CONV_TOKEN: TOKEN })).toEqual({ 'x-cs-conv': TOKEN })
    expect(approvalHeaders({}, { CS_CONV_TOKEN: TOKEN })).toEqual({})
  })
})
