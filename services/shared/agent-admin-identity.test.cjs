import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { signHeader, createAgentAdminVerifier, adminOrAgent, SCOPES } = require('./agent-admin-identity.cjs')
const { patchVoiceSlot, withoutRetired } = require('./policy-voice-patch.cjs')

const secret = 'a'.repeat(64)
const T = 1_800_000_000
const key = { secret, scopes: [SCOPES.VOICE_SLOT_WRITE, SCOPES.TAKES_READ] }
const quiet = { warn() {}, info() {}, log() {} }

function req(header, over = {}) {
  return { method: 'PATCH', originalUrl: '/api/recording/languages/eng/voice/x', body: { email: 'a@b.co' },
    headers: header ? { 'x-agent-admin': header } : {}, socket: { remoteAddress: '127.0.0.1' }, ...over }
}
const sign = (o = {}) => signHeader({ secret, agentId: 'aran-watson', method: 'PATCH', path: '/api/recording/languages/eng/voice/x', body: { email: 'a@b.co' }, ts: T, ...o })
const verifier = () => createAgentAdminVerifier({ key, now: () => T * 1000, logger: quiet })

describe('agent admin identity', () => {
  it('accepts a dotted agent id accepted by the signing helper', () => {
    const header = sign({ agentId: 'cs.425' })
    expect(verifier().check(req(header), SCOPES.VOICE_SLOT_WRITE).ok).toBe(true)
  })
  it('ignores a request with no header (the normal admin path)', () => {
    expect(verifier().check(req(null), SCOPES.VOICE_SLOT_WRITE)).toBe(null)
  })
  it('accepts a signed call and names the agent', () => {
    const r = verifier().check(req(sign()), SCOPES.VOICE_SLOT_WRITE)
    expect(r.ok).toBe(true)
    expect(r.user.email).toBe('agent:aran-watson')
  })
  it('refuses a changed body, path or method', () => {
    const h = sign()
    expect(verifier().check(req(h, { body: { email: 'evil@x.co' } }), SCOPES.VOICE_SLOT_WRITE).ok).toBe(false)
    expect(verifier().check(req(h, { originalUrl: '/api/recording/languages/cym/voice/x' }), SCOPES.VOICE_SLOT_WRITE).ok).toBe(false)
    expect(verifier().check(req(h, { method: 'DELETE' }), SCOPES.VOICE_SLOT_WRITE).ok).toBe(false)
  })
  it('refuses a replay, an old signature, a non-loopback caller and an uncarried scope', () => {
    const v = verifier()
    const h = sign()
    expect(v.check(req(h), SCOPES.VOICE_SLOT_WRITE).ok).toBe(true)
    expect(v.check(req(h), SCOPES.VOICE_SLOT_WRITE).error).toMatch(/already used/)
    expect(verifier().check(req(sign({ ts: T - 120 })), SCOPES.VOICE_SLOT_WRITE).error).toMatch(/expired/)
    expect(verifier().check(req(sign(), { headers: { 'x-agent-admin': sign(), 'x-forwarded-for': '1.2.3.4' } }), SCOPES.VOICE_SLOT_WRITE).status).toBe(403)
    expect(verifier().check(req(sign()), "nope:write").status).toBe(403)
  })
  it('a failed agent attempt never falls through to the admin gate', async () => {
    let asked = false
    const gate = adminOrAgent(verifier(), async () => { asked = true; return { email: 'admin' } })
    const res = { status(c) { this.c = c; return this }, json(b) { this.b = b } }
    expect(await gate(req('v1.x.1800000000.' + '0'.repeat(64)), res, SCOPES.VOICE_SLOT_WRITE)).toBe(null)
    expect(asked).toBe(false)
    expect(res.c).toBe(401)
  })
})

describe('second (Kai) key', () => {
  const kSecret = 'b'.repeat(64)
  const kai = { secret: kSecret, scopes: [SCOPES.ADMIN_ALL], agentIdPrefix: 'kai' }
  const v = () => createAgentAdminVerifier({ keys: [key, kai], now: () => T * 1000, logger: quiet })
  const kSign = (o = {}) => signHeader({ secret: kSecret, agentId: 'kai-watson', method: 'PATCH', path: '/api/recording/languages/eng/voice/x', body: { email: 'a@b.co' }, ts: T, ...o })
  it('the Kai key carries admin:all, the shared key still does not', () => {
    expect(v().check(req(kSign()), 'anything:write').ok).toBe(true)
    expect(v().check(req(sign()), 'admin:all').status).toBe(403)
    expect(v().check(req(sign()), SCOPES.VOICE_SLOT_WRITE).ok).toBe(true)
  })
  it('the Kai key cannot sign as another agent', () => {
    expect(v().check(req(kSign({ agentId: 'aran-watson' })), 'admin:all').status).toBe(401)
  })
})

describe('Kai key prefix is strict', () => {
  const kai = { secret: 'b'.repeat(64), scopes: [SCOPES.ADMIN_ALL], agentIdPrefix: 'kai' }
  const v = createAgentAdminVerifier({ keys: [key, kai], now: () => T * 1000, logger: quiet })
  it('refuses the bare id "kai", accepts kai-<id>', () => {
    const s = (agentId) => signHeader({ secret: kai.secret, agentId, method: 'PATCH', path: '/api/recording/languages/eng/voice/x', body: { email: 'a@b.co' }, ts: T })
    expect(v.check(req(s('kai')), 'admin:all').status).toBe(401)
    expect(v.check(req(s('kai-watson')), 'admin:all').ok).toBe(true)
  })
})

describe('kai_go: only the Kai-only key satisfies the live-course gate', () => {
  const { kaiGoFromRequest } = require('./agent-admin-identity.cjs')
  const shared = { secret: 'a'.repeat(64), scopes: [SCOPES.ADMIN_ALL] }
  const kai = { secret: 'b'.repeat(64), scopes: [SCOPES.ADMIN_ALL], agentIdPrefix: 'kai' }
  const v = createAgentAdminVerifier({ keys: [shared, kai], now: () => T * 1000, logger: quiet })
  const via = (secret, agentId) => {
    const r = v.check(req(signHeader({ secret, agentId, method: 'PATCH', path: '/api/recording/languages/eng/voice/x', body: { email: 'a@b.co' }, ts: T })), null)
    return { agentAdmin: r }
  }
  it('Kai key + kai- id -> the agent id', () => expect(kaiGoFromRequest(via(kai.secret, 'kai-watson'))).toBe('kai-watson'))
  it('shared key, even with a kai- id, is not kai_go', () => expect(kaiGoFromRequest(via(shared.secret, 'kai-watson'))).toBeNull())
  it('no agent identity -> null', () => { expect(kaiGoFromRequest({})).toBeNull(); expect(kaiGoFromRequest(null)).toBeNull() })
})

describe('voice slot patch', () => {
  const voices = {
    m: { voiceId: 'human_aran_eng', gender: 'm' },
    f: { voiceId: 'human_cae_cym', email: 'old@x.co', dialect: 'south' },
  }
  it('changes only the named entry', () => {
    const r = patchVoiceSlot(voices, 'human_aran_eng', { email: ' Aran@Hey.com ' })
    expect(r.voices.m.email).toBe('aran@hey.com')
    expect(r.voices.f).toBe(voices.f)
  })
  it('retire hides the slot from readers and un-retire restores it', () => {
    const r = patchVoiceSlot(voices, 'human_cae_cym', { active: false })
    expect(r.voices.f.active).toBe(false)
    expect(r.voices.f.email).toBe('old@x.co')
    expect(Object.keys(withoutRetired(r.voices))).toEqual(['m'])
    expect('active' in patchVoiceSlot(r.voices, 'human_cae_cym', { active: true }).voices.f).toBe(false)
  })
  it('refuses unknown voices, bad emails and empty patches', () => {
    expect(patchVoiceSlot(voices, 'nobody', { active: false }).status).toBe(404)
    expect(patchVoiceSlot(voices, 'human_aran_eng', { email: 'a name' }).status).toBe(400)
    expect(patchVoiceSlot(voices, 'human_aran_eng', {}).status).toBe(400)
  })
})
