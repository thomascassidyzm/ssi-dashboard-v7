/**
 * DECLARATION — the words that ARE the consent, and the check that they were said.
 *
 * Tested rather than trusted for the same reason consent.cjs is: every rule here
 * is one Tom stated in words, and the failure they prevent is silent. The two
 * that matter most and are easiest to lose in a refactor:
 *   1. the exact wording — a redline that changes one of these strings must show
 *      up as a failing test, because the string is the record;
 *   2. the third outcome — "we could not listen" must never be reported as
 *      "we listened and it was fine", and must never come out as an exception.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRequire } from 'node:module'

// require(), NOT `import x from './x.cjs'`, and that is load-bearing. Vitest's
// ESM interop hands an ESM importer a WRAPPER around a CommonJS module's
// exports, so a vi.spyOn against the imported object patches the wrapper while
// declaration.cjs — which reaches audio-veracity through require() — goes on
// calling the real function. Measured here on 2026-09-01: the whisper-missing
// test passed while the REAL whisper ran, i.e. it was green for the wrong
// reason. Going through require on both sides means the object the test patches
// is the object the code under test holds.
const require = createRequire(import.meta.url)
const declaration = require('./declaration.cjs')
const audioVeracity = require('../audio-veracity.cjs')

afterEach(() => { vi.restoreAllMocks() })

describe('the wording — one version, verbatim', () => {
  it('ships the spoken line exactly as Tom wrote it', () => {
    // Not a substring match and not a regex: this string IS the consent record
    // that gets stored against a real person's voice. If it changes, that is a
    // decision, and a decision should have to edit this line deliberately.
    expect(declaration.SPOKEN_PHRASE).toBe(
      'This is my own voice, and I am happy for it to be copied and used in language courses.',
    )
  })

  it('ships the attestation exactly as Tom wrote it', () => {
    expect(declaration.ATTESTATION).toBe(
      'This is my own voice, or I have the right to use this recording. I am happy for it to be copied and used in language courses.',
    )
  })

  it('names no product, so the decoder has no coined word to mangle', () => {
    // Tom's ruling, 2026-08-31. "SaySomethingin" cost a clean reading 0.15
    // coverage every single time, and refused a heavily accented one outright.
    for (const line of [declaration.SPOKEN_PHRASE, declaration.ATTESTATION]) {
      expect(line.toLowerCase()).not.toContain('saysomethingin')
      expect(line.toLowerCase()).not.toContain('say something in')
    }
  })

  it('offers no alternative wording', () => {
    // Two accepted phrasings would mean two different things had been consented
    // to, with no way to tell from the row which.
    const strings = Object.entries(declaration).filter(([, v]) => typeof v === 'string')
    expect(strings.map(([k]) => k).sort()).toEqual(['ATTESTATION', 'SPOKEN_PHRASE'])
  })
})

describe('the threshold — fitted, not guessed', () => {
  it('sits at 0.7, between the two measured populations', () => {
    // Measured end to end on this box with the real whisper: on the current,
    // brand-free wording a clean reading scores 1.00, the worst accented
    // reading in the set 0.74, and an unrelated sentence 0.21. The gate sits
    // well clear of both populations, and it is pinned here so that moving it
    // is a decision somebody makes on purpose rather than a number that drifts.
    expect(declaration.COVERAGE_THRESHOLD).toBe(0.7)
    expect(declaration.COVERAGE_THRESHOLD).toBeLessThan(0.74)
    expect(declaration.COVERAGE_THRESHOLD).toBeGreaterThan(0.21)
  })
})

describe('verifySpoken — three outcomes, never two', () => {
  it('reports "could not check" when whisper is missing, and does not throw', async () => {
    vi.spyOn(audioVeracity, 'availability').mockReturnValue({ available: false, missing: ['whisper-cli'], bin: '', model: '' })
    const decode = vi.spyOn(audioVeracity, 'decodeAudio')
    const out = await declaration.verifySpoken(Buffer.from('not really audio'), { language: 'eng' })
    expect(out).toEqual({ available: false, heard: null, coverage: null, ok: false })
    // "Could not check" must not be "checked and failed": nothing was decoded.
    expect(decode).not.toHaveBeenCalled()
  })

  it('reports "could not check" rather than throwing when the decode falls over', async () => {
    vi.spyOn(audioVeracity, 'availability').mockReturnValue({ available: true, missing: [], bin: '', model: '' })
    vi.spyOn(audioVeracity, 'decodeAudio').mockRejectedValue(new Error('ffmpeg died'))
    const out = await declaration.verifySpoken(Buffer.from('x'), { language: 'eng' })
    expect(out.available).toBe(false)
    expect(out.ok).toBe(false)
  })

  it('passes a recording that contains the line', async () => {
    vi.spyOn(audioVeracity, 'availability').mockReturnValue({ available: true, missing: [], bin: '', model: '' })
    vi.spyOn(audioVeracity, 'decodeAudio').mockResolvedValue(declaration.SPOKEN_PHRASE)
    const out = await declaration.verifySpoken(Buffer.from('x'), { language: 'eng' })
    expect(out.available).toBe(true)
    expect(out.coverage).toBe(1)
    expect(out.ok).toBe(true)
    expect(out.heard).toBe(declaration.SPOKEN_PHRASE)
  })

  it('passes a reading whisper heard imperfectly, at or above the threshold', async () => {
    // The line has 19 words; dropping the last two leaves coverage above 0.8,
    // which is the headroom the threshold exists to give an accent or a fan.
    vi.spyOn(audioVeracity, 'availability').mockReturnValue({ available: true, missing: [], bin: '', model: '' })
    vi.spyOn(audioVeracity, 'decodeAudio').mockResolvedValue(
      'this is my own voice and I am happy for saysomethingin to copy it and use it in',
    )
    const out = await declaration.verifySpoken(Buffer.from('x'), {})
    expect(out.coverage).toBeGreaterThanOrEqual(declaration.COVERAGE_THRESHOLD)
    expect(out.ok).toBe(true)
  })

  it('fails a recording that does not contain the line, and hands back what it heard', async () => {
    vi.spyOn(audioVeracity, 'availability').mockReturnValue({ available: true, missing: [], bin: '', model: '' })
    vi.spyOn(audioVeracity, 'decodeAudio').mockResolvedValue('the quick brown fox jumped over the lazy dog')
    const out = await declaration.verifySpoken(Buffer.from('x'), { language: 'eng' })
    expect(out.available).toBe(true)
    expect(out.coverage).toBeLessThan(declaration.COVERAGE_THRESHOLD)
    expect(out.ok).toBe(false)
    // The evidence comes back so the operator can be told WHY.
    expect(out.heard).toBe('the quick brown fox jumped over the lazy dog')
  })

  it('treats a half-read line as a failure, not a pass', async () => {
    vi.spyOn(audioVeracity, 'availability').mockReturnValue({ available: true, missing: [], bin: '', model: '' })
    vi.spyOn(audioVeracity, 'decodeAudio').mockResolvedValue('this is my own voice')
    const out = await declaration.verifySpoken(Buffer.from('x'), { language: 'eng' })
    expect(out.coverage).toBeLessThan(declaration.COVERAGE_THRESHOLD)
    expect(out.ok).toBe(false)
  })

  it('never throws on an empty clip', async () => {
    vi.spyOn(audioVeracity, 'availability').mockReturnValue({ available: true, missing: [], bin: '', model: '' })
    await expect(declaration.verifySpoken(Buffer.alloc(0), { language: 'eng' })).resolves.toEqual({
      available: false, heard: null, coverage: null, ok: false,
    })
  })
})

describe('declarationRecord — the consent event, written down', () => {
  const now = new Date('2026-09-01T10:00:00.000Z')

  it('moves a spoken declaration straight to authorised, in the person’s own name', () => {
    // Tom, 2026-09-01: reading the line aloud IS the consent event. Leaving such
    // a voice "awaiting authorisation" would say nobody had asked about a voice
    // whose owner had just said yes into the microphone.
    const rec = declaration.declarationRecord({ kind: 'spoken', heard: 'this is my own voice and…', person: 'Aran', now })
    expect(rec.consent_status).toBe('authorised')
    expect(rec.consent_authorised_by).toBe('Aran')
    expect(rec.consent_authorised_how).toBe('read the consent line aloud on the recording')
    expect(rec.consent_authorised_at).toBe('2026-09-01T10:00:00.000Z')
    expect(rec.consent_declaration).toBe(declaration.SPOKEN_PHRASE)
    expect(rec.consent_declaration_kind).toBe('spoken')
    expect(rec.consent_declaration_heard).toBe('this is my own voice and…')
  })

  it('records an attestation in the name of whoever made it, with nothing heard', () => {
    const rec = declaration.declarationRecord({ kind: 'attested', attestedBy: 'tom@hey.com', now })
    expect(rec.consent_status).toBe('authorised')
    expect(rec.consent_authorised_by).toBe('tom@hey.com')
    expect(rec.consent_authorised_how).toBe('agreed to the consent wording when uploading the recording')
    expect(rec.consent_declaration).toBe(declaration.ATTESTATION)
    expect(rec.consent_declaration_kind).toBe('attested')
    // Explicitly null, never '': an empty string would read as "we listened and
    // heard silence", which is a different and much worse claim.
    expect(rec.consent_declaration_heard).toBeNull()
  })

  it('keeps the two kinds apart — an attestation never claims to be spoken', () => {
    const a = declaration.declarationRecord({ kind: 'attested', attestedBy: 'tom@hey.com', now })
    expect(a.consent_declaration).not.toBe(declaration.SPOKEN_PHRASE)
    expect(a.consent_declaration_kind).not.toBe('spoken')
  })

  it('refuses an attestation with nobody making it', () => {
    expect(() => declaration.declarationRecord({ kind: 'attested', attestedBy: '   ' }))
      .toThrow(/who is making this statement/i)
    expect(() => declaration.declarationRecord({ kind: 'attested' })).toThrow(/tick box, not a permission/)
  })

  it('refuses a spoken declaration with nobody named', () => {
    // The line says "this is MY OWN voice" — a yes with no whose is a record
    // nobody can act on, and the database's own CHECK would refuse it anyway.
    expect(() => declaration.declarationRecord({ kind: 'spoken', heard: 'x', person: '  ' }))
      .toThrow(/Name whose voice this is/)
  })

  it('refuses a kind it does not know', () => {
    expect(() => declaration.declarationRecord({ kind: 'implied' })).toThrow(/'spoken' or 'attested'/)
  })

  it('errors carry a 400, so the route answers the operator rather than 500ing', () => {
    try { declaration.declarationRecord({ kind: 'attested' }) } catch (e) { expect(e.status).toBe(400) }
  })
})

describe('merging over a birth record — what the voice is actually written with', () => {
  it('keeps the person and the provenance, and overwrites the state', () => {
    // This is the shape cartesia.createClone builds: birthRecord first, then the
    // declaration merged over it. Asserted here because the merge is the moment
    // a "pending" voice becomes an "authorised" one and nothing else re-checks it.
    const consent = require('./consent.cjs')
    const birth = consent.birthRecord({ person: 'Aran', source: 'recorded in the browser', recordedBy: 'tom@hey.com' })
    const merged = { ...birth, ...declaration.declarationRecord({ kind: 'spoken', heard: 'x', person: 'Aran', now: new Date() }) }
    expect(merged.consent_person).toBe('Aran')
    expect(merged.consent_source).toBe('recorded in the browser')
    expect(merged.consent_recorded_by).toBe('tom@hey.com')
    expect(merged.consent_status).toBe('authorised')
    expect(consent.describe(merged).declaration).toEqual({
      kind: 'spoken', words: declaration.SPOKEN_PHRASE, heard: 'x',
    })
  })
})
