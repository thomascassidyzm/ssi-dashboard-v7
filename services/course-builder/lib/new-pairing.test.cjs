/**
 * A new pairing of taught Welsh gets 2-3 phrases under a new sibling, no intro (Aran, 2026-10-13).
 * Run: npx vitest run services/course-builder/lib/new-pairing.test.cjs
 */
import { describe, it, expect } from 'vitest'
const path = require('path')

// The model, the prompt builder and the gates are stubbed through the require cache: this tests
// the rule and the routing, not Opus or the database.
const stub = (rel, exports) => {
  const p = require.resolve(rel)
  require.cache[p] = { id: p, filename: p, loaded: true, exports: { ...require(p), ...exports } }
}
const calls = []
let reply = ''
stub('../../shared/claude-cli.cjs', { claudeChat: async (prompt) => { calls.push(prompt); return reply } })
stub(path.join(__dirname, '../../../tools/phrase-lab/build-prompt.cjs'), {
  buildPrompt: async (sb, c, s, l) => ({ prompt: `HOST PROMPT S${s}L${l}`, inventory: {}, lego: {}, seed: {} }),
})
stub(path.join(__dirname, '../../../tools/phrase-gate/gate-check.cjs'), {
  makeCourseCtx: () => ({}),
  // The real gate fails BUILD count on a USE-only set; the pairing route must not be blocked by it.
  checkPhraseSet: async (e) => ({ overallPass: false, failingGates: ['buildCountSpec', 'buildUseFloors'], gates: { knownSide: { pass: true } }, legoIndex: e.legoIndex }),
})
const { newPairingOf, hostFor, checkPairingSet, containsWelsh } = require('./new-pairing.cjs')
const { generatePairingPhrases } = require('./phrase-generation.cjs')

const N = 'cym_nv2_for_eng'
const S106 = { seed_number: 106, lego_index: 2, known_text: 'a bit', target_text: 'am dipyn', is_new: true }
const seed1092 = [
  { seed_number: 1092, lego_index: 1, known_text: 'I’d like', target_text: 'liciwn i', is_new: false },
  { seed_number: 1092, lego_index: 2, known_text: 'to keep on', target_text: 'gario ymlaen', is_new: true },
  { seed_number: 1092, lego_index: 3, known_text: 'for a while', target_text: 'am dipyn', is_new: false },
]

describe('newPairingOf — the rule', () => {
  it('same Welsh taught earlier under OTHER English is a new pairing (N1092 "for a while" = am dipyn)', () => {
    expect(newPairingOf(N, seed1092[2], [S106])?.taughtAs).toBe(S106)
  })
  it('same Welsh AND same English earlier is an ordinary duplicate: unchanged, nothing (N1180)', () => {
    const later = { seed_number: 1180, lego_index: 3, known_text: 'for a while', target_text: 'am dipyn', is_new: false }
    expect(newPairingOf(N, later, [S106, seed1092[2]])).toBeNull()
  })
  it('a soft-mutated Welsh form counts as the same Welsh', () => {
    const earlier = { known_text: 'that he wanted', target_text: 'bod e’n moyn' }
    expect(newPairingOf('cym_sv2_for_eng', { known_text: 'that he wants', target_text: 'fod e’n moyn' }, [earlier])).not.toBeNull()
  })
  it('never fires for a non-Welsh course', () => {
    expect(newPairingOf('ita_for_eng', { known_text: 'a while', target_text: 'un po' }, [{ known_text: 'a bit', target_text: 'un po' }])).toBeNull()
  })
})

describe('hostFor — where the phrases are filed (P25)', () => {
  it('is the seed’s last NEW LEGO other than the taught one', () => {
    expect(hostFor(seed1092, 3).lego_index).toBe(2)
  })
  it('is null when the seed has no other new LEGO', () => {
    expect(hostFor([{ lego_index: 1, is_new: false }, { lego_index: 2, is_new: false }], 1)).toBeNull()
  })
})

describe('checkPairingSet', () => {
  it('needs the new English and the Welsh (mutated allowed) in every phrase, 2-3 of them, no repeats', () => {
    const ok = [
      { known: 'I’m going to keep on for a while', target: 'dw i’n mynd i gario ymlaen am dipyn' },
      { known: 'I’d like to keep on for a while tonight', target: 'liciwn i gario ymlaen am dipyn heno' },
    ]
    expect(checkPairingSet(N, seed1092[2], ok).pass).toBe(true)
    const bad = checkPairingSet(N, seed1092[2], [ok[0], { known: 'I’d like to keep on a bit', target: 'liciwn i gario ymlaen am dipyn' }], [{ target_text: ok[0].target }])
    expect(bad.pass).toBe(false)
    expect(bad.reasons.join('\n')).toMatch(/does not say "for a while"/)
    expect(bad.reasons.join('\n')).toMatch(/repeat/)
    expect(checkPairingSet(N, seed1092[2], [ok[0]]).reasons.join()).toMatch(/count/)
    expect(containsWelsh('cym_sv2_for_eng', 'fod e’n moyn', 'dw i’n meddwl bod e’n moyn aros')).toBe(true)
  })
})

describe('generatePairingPhrases — same v3 route, filed under the host', () => {
  it('generates USE rows for the host LEGO from the host prompt plus the pairing section', async () => {
    calls.length = 0
    reply = JSON.stringify({ build: [{ known: 'x', target: 'y' }], use: [
      { known: 'I’m going to keep on for a while', target: 'dw i’n mynd i gario ymlaen am dipyn' },
      { known: 'I’d like to keep on for a while tonight', target: 'liciwn i gario ymlaen am dipyn heno' },
      { known: 'we can keep on for a while now', target: 'dan ni’n gallu cario ymlaen am dipyn rŵan' },
    ] })
    const r = await generatePairingPhrases({}, N, 1092, 3, { seedLegos: seed1092, earlier: [S106] })
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatch(/^HOST PROMPT S1092L2/)
    expect(calls[0]).toMatch(/"for a while" = "am dipyn"/)
    expect(r.blocked).toBe(false)
    expect(r.hostIndex).toBe(2)
    expect(r.build).toEqual([])
    expect(r.use).toHaveLength(3)
  })
  it('holds without a model call: no host, an ordinary duplicate, or a NEW LEGO', async () => {
    calls.length = 0
    const noHost = [{ ...seed1092[0] }, { ...seed1092[1], is_new: false }, seed1092[2]]
    expect((await generatePairingPhrases({}, N, 1092, 3, { seedLegos: noHost, earlier: [S106] })).held).toMatch(/no other NEW LEGO/)
    expect((await generatePairingPhrases({}, N, 1092, 3, { seedLegos: seed1092, earlier: [{ known_text: 'for a while', target_text: 'am dipyn' }] })).held).toMatch(/not a new pairing/)
    expect((await generatePairingPhrases({}, N, 1092, 2, { seedLegos: seed1092, earlier: [] })).held).toMatch(/is new/)
    expect(calls).toHaveLength(0)
  })
})
