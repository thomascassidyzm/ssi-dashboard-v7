/**
 * SELF-CONSENT — the owner, signed in, saying "this is my voice".
 *
 * Tom, 2026-09-04: "when the AUTHENTICATED USER IS THE OWNER OF THE VOICE,
 * consent is self-evident" — and, in the same breath, "YOU MUST NOT WEAKEN
 * CONSENT FOR ANYONE ELSE."
 *
 * So the tests come in two halves and the second half is the load-bearing one:
 * everything the tap does NOT open. A second person hitting the same
 * unconsented voice is still refused, a recorded no is never walked back, and a
 * voice already carrying somebody else's verified address cannot be claimed.
 *
 * Pure: a fake supabase client, no network, no key.
 *
 * Run: npx vitest run services/voicelab/self-consent.test.js
 */

import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'

const require_ = createRequire(import.meta.url)
const selfConsent = require_('./self-consent.cjs')
const ownership = require_('../shared/voice-ownership.cjs')
const gate = require_('../shared/voice-consent-gate.cjs')

const TOM = { email: 'thomas.cassidy+ssi@gmail.com', name: 'Tom' }
const SOMEBODY_ELSE = { email: 'editor@saysomethingin.com', name: 'An Editor' }

/** A clone of a person, born one stamp short — the state that blocked Tom. */
const clone = (over = {}) => ({
  voice_id: 'cartesia_0b09cc76',
  type: 'tts',
  tts_engine: 'cartesia',
  display_name: 'Tom — Italian clone',
  metadata_source: 'cartesia-clone (Voice Lab)',
  consent_status: 'awaiting_authorisation',
  consent_person: 'Tom Cassidy',
  consent_person_contact: null,
  human_email: null,
  ...over,
})

/**
 * The narrowest supabase stand-in that can tell a right write from a wrong one:
 * it records every update and answers `.in()` from a fixed set of rows.
 */
function fakeDb (rows) {
  const writes = []
  return {
    writes,
    rows,
    from () {
      return {
        select () {
          return {
            in: (_col, ids) => Promise.resolve({ data: rows.filter((r) => ids.includes(r.voice_id)), error: null }),
          }
        },
        update (patch) {
          return {
            eq: (_col, id) => ({
              select: () => ({
                single: async () => {
                  const row = rows.find((r) => r.voice_id === id)
                  writes.push({ voiceId: id, patch })
                  Object.assign(row, patch)
                  return { data: row, error: null }
                },
              }),
            }),
          }
        },
      }
    },
  }
}

describe('ownership — the link, and the gap it refuses to paper over', () => {
  it('matches a verified email and nothing else', () => {
    expect(ownership.isOwnedBy({ consent_person_contact: 'TOM@x.com' }, 'tom@x.com')).toBe(true)
    expect(ownership.isOwnedBy({ human_email: 'tom@x.com' }, 'tom@x.com')).toBe(true)
    expect(ownership.isOwnedBy({ consent_person_contact: 'tom@x.com' }, 'other@x.com')).toBe(false)
  })

  it('NEVER matches on a name — the whole reason the module exists', () => {
    // 426 of 427 live voices tie to a person by a free-text name. If a name
    // could match a session, anybody called Tom Cassidy could consent to Tom's
    // clone.
    const voice = { consent_person: 'Tom Cassidy', consent_authorised_by: 'Tom Cassidy' }
    expect(ownership.ownerEmailOf(voice)).toBe(null)
    expect(ownership.isOwnedBy(voice, 'Tom Cassidy')).toBe(false)
    expect(ownership.ownership(voice, TOM.email).claimable).toBe(true) // unlinked: claimable
  })

  it('a voice linked to somebody else is not claimable', () => {
    const own = ownership.ownership({ consent_person_contact: 'aran@hey.com' }, TOM.email)
    expect(own.linked).toBe(true)
    expect(own.isOwner).toBe(false)
    expect(own.claimable).toBe(false)
  })
})

describe('the tap — the owner consenting to their own voice', () => {
  it('records consent AND mints the identity link that was missing', async () => {
    const db = fakeDb([clone()])
    const out = await selfConsent.claimOwnVoice(db, { voiceId: 'cartesia_0b09cc76', user: TOM })
    expect(out.alreadyAuthorised).toBe(false)
    const patch = db.writes[0].patch
    expect(patch.consent_status).toBe('authorised')
    // The link. Without this write the derivation is unreachable and the wall
    // comes back on the next clone, which is what happened on 2026-09-04.
    expect(patch.consent_person_contact).toBe(TOM.email)
    expect(patch.consent_authorised_by).toBe(TOM.email)
    expect(patch.consent_authorised_how).toContain(TOM.email)
    // Legible as a claim, forever, including whose name it replaced.
    expect(patch.consent_note).toContain('claimed this voice as their own')
    expect(patch.consent_note).toContain('Tom Cassidy')
  })

  it('claims every spelling of the same voice, so the wall cannot come back under the other one', async () => {
    const db = fakeDb([clone({ voice_id: 'cartesia_0b09cc76' }), clone({ voice_id: '0b09cc76' })])
    await selfConsent.claimOwnVoice(db, { voiceId: '0b09cc76', user: TOM })
    expect(db.writes.map((w) => w.voiceId).sort()).toEqual(['0b09cc76', 'cartesia_0b09cc76'])
  })

  it('is idempotent once the voice is authorised and linked', async () => {
    const db = fakeDb([clone({ consent_status: 'authorised', consent_person_contact: TOM.email })])
    const out = await selfConsent.claimOwnVoice(db, { voiceId: 'cartesia_0b09cc76', user: TOM })
    expect(out.alreadyAuthorised).toBe(true)
    expect(db.writes).toHaveLength(0)
  })
})

describe('what the tap does NOT open', () => {
  it('refuses a voice already carrying somebody else\'s verified address', async () => {
    const db = fakeDb([clone({ consent_person: 'Aran Jones', consent_person_contact: 'aran@hey.com' })])
    await expect(selfConsent.claimOwnVoice(db, { voiceId: 'cartesia_0b09cc76', user: TOM }))
      .rejects.toMatchObject({ code: 'NOT_YOUR_VOICE', status: 403 })
    expect(db.writes).toHaveLength(0)
  })

  it('never walks back a recorded no', async () => {
    for (const status of ['refused', 'withdrawn']) {
      const db = fakeDb([clone({ consent_status: status, consent_person_contact: TOM.email })])
      await expect(selfConsent.claimOwnVoice(db, { voiceId: 'cartesia_0b09cc76', user: TOM }))
        .rejects.toMatchObject({ code: 'CONSENT_REFUSED_ALREADY' })
      expect(db.writes).toHaveLength(0)
    }
  })

  it('refuses a stock voice — there is nobody to ask, so nothing to consent to', async () => {
    const db = fakeDb([{
      voice_id: 'azure_en-GB-OllieMultilingualNeural',
      type: 'tts',
      tts_engine: 'azure',
      display_name: 'Ollie',
      metadata_source: 'azure-catalogue (Voice Lab)',
      consent_status: 'not_recorded',
    }])
    await expect(selfConsent.claimOwnVoice(db, { voiceId: 'azure_en-GB-OllieMultilingualNeural', user: TOM }))
      .rejects.toMatchObject({ code: 'NOT_A_GATED_VOICE' })
    expect(db.writes).toHaveLength(0)
  })

  it('refuses a session with no verified address', async () => {
    const db = fakeDb([clone()])
    await expect(selfConsent.claimOwnVoice(db, { voiceId: 'cartesia_0b09cc76', user: { name: 'nobody' } }))
      .rejects.toMatchObject({ code: 'NO_VERIFIED_IDENTITY' })
  })
})

describe('the block itself is untouched — everyone else still hits the same 403', () => {
  it('refuses an unconsented clone, whoever is asking', () => {
    // The render gate takes no identity at all, by design: it is asked the same
    // question by a cron job at three in the morning as by a person at a
    // screen, and it gives the same answer. The tap changes the RECORD, never
    // the gate — so a second user auditioning Tom's unconsented clone gets
    // exactly the verdict Tom got.
    const v = gate.verdict({ voiceId: 'cartesia_0b09cc76', voice: clone() })
    expect(v.allowed).toBe(false)
    expect(v.code).toBe('NO_RECORDED_CONSENT')
  })

  it('and lets it through once, and only once, a yes is on the record', () => {
    const v = gate.verdict({
      voiceId: 'cartesia_0b09cc76',
      voice: clone({ consent_status: 'authorised', consent_person_contact: TOM.email }),
    })
    expect(v.allowed).toBe(true)
  })
})
