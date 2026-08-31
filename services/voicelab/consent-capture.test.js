/**
 * The key to the consent lock, tested where it can actually go wrong: a voice
 * with a row, a voice WITHOUT one, and the refusal to write a yes the
 * declaration did not produce.
 */
import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'

const require_ = createRequire(import.meta.url)
const { recordConsentOnVoice } = require_('./consent-capture.cjs')
const declaration = require_('./declaration.cjs')
const consent = require_('./consent.cjs')
const cloneConfirmation = require_('./clone-confirmation.cjs')

/** The smallest supabase stand-in that can tell an update from an insert. */
function fakeDb ({ existing = null } = {}) {
  const calls = { updated: null, inserted: null }
  const chain = (result) => ({
    select: () => chain(result),
    eq: () => chain(result),
    maybeSingle: async () => ({ data: result, error: null }),
    single: async () => ({ data: result, error: null }),
  })
  return {
    calls,
    from () {
      return {
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: existing, error: null }) }) }),
        update (patch) { calls.updated = patch; return chain({ voice_id: 'v', ...patch }) },
        insert (row) { calls.inserted = row; return chain(row) },
      }
    },
  }
}

const attested = declaration.declarationRecord({ kind: 'attested', attestedBy: 'Tom Cassidy', person: 'Aran Jones' })

describe('recordConsentOnVoice', () => {
  it('updates a voice that already has a row, and writes only consent columns', async () => {
    const db = fakeDb({ existing: { voice_id: 'gfzdpspr5fdp' } })
    const { created } = await recordConsentOnVoice(db, {
      voiceId: 'gfzdpspr5fdp', declarationRecord: attested, person: 'Aran Jones', recordedBy: 'tom@x',
    })
    expect(created).toBe(false)
    expect(db.calls.inserted).toBe(null)
    // ONE STAMP SHORT, not authorised. This row is a voice with a human named
    // on it, which is a class the consent gate asks about, and nobody has heard
    // it yet — see the awaiting-hearing tests below.
    expect(db.calls.updated.consent_status).toBe('awaiting_authorisation')
    expect(db.calls.updated.consent_declaration_kind).toBe('attested')
    expect(db.calls.updated.consent_person).toBe('Aran Jones')
    // Nothing about the voice itself moves — a consent step is not the place to
    // change somebody's provider, languages or gender.
    const touched = Object.keys(db.calls.updated).filter((k) => !k.startsWith('consent_') && k !== 'updated_at')
    expect(touched).toEqual([])
  })

  it('CREATES a row for a human_* id that has none — the population the gate protects', async () => {
    const db = fakeDb({ existing: null })
    const { created } = await recordConsentOnVoice(db, {
      voiceId: 'human_aran_cym_n', declarationRecord: attested, person: 'Aran Jones', language: 'cym',
    })
    expect(created).toBe(true)
    expect(db.calls.inserted.type).toBe('human')
    expect(db.calls.inserted.languages).toEqual(['cym'])
    expect(db.calls.inserted.consent_status).toBe('authorised')
  })

  // ── THE SECOND STAMP ───────────────────────────────────────────────────────
  // The hole an adversarial pass found on 2026-08-31: this route wrote
  // captureDeclaration's `authorised` straight onto a voice, so a tick box and a
  // name cast a Cartesia clone that nobody had ever listened to — at a lower
  // privilege tier than the confirm screen itself. Every other creator of a
  // consented voice already held the voice one stamp short; this one was missed.

  it('HOLDS a clone one stamp short — a declaration is not a hearing', async () => {
    const db = fakeDb({ existing: { voice_id: 'cartesia_e7ed10ad-1111-2222-3333-444455556666', type: 'tts', metadata_source: 'cartesia-clone (Voice Lab)' } })
    const { held } = await recordConsentOnVoice(db, {
      voiceId: 'cartesia_e7ed10ad-1111-2222-3333-444455556666',
      declarationRecord: attested, person: 'Aran Jones', recordedBy: 'editor@x',
    })
    expect(held).toBe(true)
    expect(db.calls.updated.consent_status).toBe('awaiting_authorisation')
    // Held back, never lost: the declaration itself is written in full, and the
    // three authorised_* fields are what the confirmation fills in.
    expect(db.calls.updated.consent_declaration_kind).toBe('attested')
    expect(db.calls.updated.consent_declaration).toBeTruthy()
    expect(db.calls.updated.consent_authorised_by).toBe(null)
    expect(db.calls.updated.consent_authorised_at).toBe(null)
    // And the gate must still refuse it, which is the whole point of the hold.
    expect(consent.isAuthorised(db.calls.updated)).toBe(false)
    expect(cloneConfirmation.stageOf(db.calls.updated)).toBe('awaiting_hearing')
  })

  it('holds a clone that has no row yet — a fresh row is not a way round the hearing', async () => {
    const db = fakeDb({ existing: null })
    const { created, held } = await recordConsentOnVoice(db, {
      voiceId: 'cartesia_aaaabbbb-cccc-dddd-eeee-ffff00001111',
      declarationRecord: attested, person: 'Aran Jones', language: 'cym',
    })
    expect(created).toBe(true)
    expect(held).toBe(true)
    expect(db.calls.inserted.consent_status).toBe('awaiting_authorisation')
  })

  it('does NOT hold a recordist — their own recording is the consent, and the gate never asks', async () => {
    const db = fakeDb({ existing: { voice_id: 'human_aran_cym_n', type: 'human' } })
    const { held } = await recordConsentOnVoice(db, {
      voiceId: 'human_aran_cym_n', declarationRecord: attested, person: 'Aran Jones',
    })
    expect(held).toBe(false)
    expect(db.calls.updated.consent_status).toBe('authorised')
    expect(db.calls.updated.consent_authorised_by).toBe('Tom Cassidy')
  })

  it('accepts a declaration that is ALREADY held — the guard tests for a declaration, not a status', async () => {
    const db = fakeDb({ existing: { voice_id: 'human_kai_fin', type: 'human' } })
    const preHeld = cloneConfirmation.awaitingHearing(attested)
    await expect(recordConsentOnVoice(db, {
      voiceId: 'human_kai_fin', declarationRecord: preHeld, person: 'Kai',
    })).resolves.toBeTruthy()
    expect(db.calls.updated.consent_declaration_kind).toBe('attested')
  })

  it('will not invent a row without being told the language', async () => {
    const db = fakeDb({ existing: null })
    await expect(recordConsentOnVoice(db, {
      voiceId: 'human_kai_fin', declarationRecord: attested, person: 'Kai',
    })).rejects.toThrow(/which language/i)
  })

  it('refuses to write a yes the declaration did not produce', async () => {
    const db = fakeDb({ existing: { voice_id: 'v' } })
    await expect(recordConsentOnVoice(db, {
      voiceId: 'v', person: 'Someone', declarationRecord: { consent_status: 'awaiting_authorisation' },
    })).rejects.toThrow(/without a declaration/i)
    expect(db.calls.updated).toBe(null)
  })

  it('will not walk back a recorded no — that decision is not overturnable from a cast screen', async () => {
    const db = fakeDb({ existing: { voice_id: 'v', consent_status: 'refused', consent_person: 'Aran Jones' } })
    await expect(recordConsentOnVoice(db, {
      voiceId: 'v', declarationRecord: attested, person: 'Aran Jones',
    })).rejects.toThrow(/already said no/i)
    expect(db.calls.updated).toBe(null)
  })

  it('insists on a named person — a yes nobody can be matched to is decorative', async () => {
    const db = fakeDb({ existing: { voice_id: 'v' } })
    await expect(recordConsentOnVoice(db, {
      voiceId: 'v', declarationRecord: attested, person: '',
    })).rejects.toThrow(/Name whose voice this is/i)
  })
})
