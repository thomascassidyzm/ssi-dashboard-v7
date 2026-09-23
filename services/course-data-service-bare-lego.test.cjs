/**
 * The bare-LEGO ban at the LOWEST writer (2026-08-26).
 *
 * On 2026-08-06 (ad9b41b0) every course-builder route learned to drop a practice
 * phrase whose target IS its LEGO's target — a row the learner never hears,
 * because intro and debut both render the bare LEGO straight from course_legos.
 * course-data-service.savePracticePhrase was missed, and it is the writer the
 * phase3 basket pipeline uses, so the ban held on one road and not on the other.
 *
 * These tests pin the guard at that writer: bare in, nothing written, null out —
 * and, just as importantly, that a real practice phrase still writes normally
 * and that a failed LEGO lookup makes the guard ABSTAIN rather than block.
 *
 * Run: npx vitest run services/course-data-service-bare-lego
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'

// The service builds its own supabase client at module load and the client is a
// CJS require inside a CJS module, which vi.mock does not reach. So the seam we
// stub is the one underneath everything: fetch. PostgREST is HTTP, so matching on
// the table in the URL path gives full control over both reads and writes without
// touching the service's own wiring.
const upserted = []
let legoRow = { target_text: 'quiero' }
let legoLookupThrows = false
let legoSelectCalls = 0

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://stub.local'
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'stub-key'
process.env.USE_DATABASE_WRITES = 'true'

const json = (body) => new Response(JSON.stringify(body), {
  status: 200,
  headers: { 'Content-Type': 'application/json' },
})

vi.stubGlobal('fetch', async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input.url
  const method = (init.method || 'GET').toUpperCase()

  if (url.includes('/course_legos')) {
    legoSelectCalls++
    if (legoLookupThrows) throw new TypeError('fetch failed')
    return json(legoRow ? [legoRow] : [])
  }

  if (url.includes('/course_practice_phrases')) {
    if (method === 'POST') {
      const row = JSON.parse(init.body)
      const one = Array.isArray(row) ? row[0] : row
      upserted.push(one)
      return json([one])
    }
    return json([])          // the decomposition decorator's own reads
  }

  return json([])
})

// Dynamic import, not require: a bare require() would load the real module
// graph outside vitest's mock registry and the stub above would never apply.
let savePracticePhrase

beforeAll(async () => {
  ({ savePracticePhrase } = await import('./course-data-service.cjs'))
})

beforeEach(() => {
  upserted.length = 0
  legoRow = { target_text: 'quiero' }
  legoLookupThrows = false
  legoSelectCalls = 0
})

describe('savePracticePhrase — bare-LEGO guard', () => {
  it('refuses a phrase that IS the LEGO, and writes nothing', async () => {
    const result = await savePracticePhrase('spa_for_eng', 1, 1, {
      knownText: 'I want', targetText: 'quiero', position: 1,
    }, { primaryLegoTarget: 'quiero' })

    expect(result).toBeNull()
    expect(upserted).toHaveLength(0)
  })

  it('refuses regardless of case and terminal punctuation', async () => {
    const result = await savePracticePhrase('spa_for_eng', 1, 1, {
      knownText: 'I want', targetText: 'Quiero.', position: 1,
    }, { primaryLegoTarget: 'quiero' })

    expect(result).toBeNull()
    expect(upserted).toHaveLength(0)
  })

  it('writes a real practice phrase that uses the LEGO in a phrase', async () => {
    const result = await savePracticePhrase('spa_for_eng', 1, 1, {
      knownText: 'I want to speak', targetText: 'quiero hablar', position: 2,
    }, { primaryLegoTarget: 'quiero' })

    expect(result).not.toBeNull()
    expect(upserted).toHaveLength(1)
    expect(upserted[0].target_text).toBe('quiero hablar')
  })

  it('is not fooled by a phrase that merely CONTAINS the LEGO', async () => {
    await savePracticePhrase('spa_for_eng', 1, 1, {
      knownText: 'I want it', targetText: 'lo quiero', position: 3,
    }, { primaryLegoTarget: 'quiero' })

    expect(upserted).toHaveLength(1)
  })

  it('looks the LEGO up when the caller does not supply it', async () => {
    legoRow = { target_text: 'estoy intentando' }
    const result = await savePracticePhrase('spa_for_eng', 2, 2, {
      knownText: "I'm trying to", targetText: 'Estoy intentando', position: 1,
    })

    expect(result).toBeNull()
    expect(upserted).toHaveLength(0)
    expect(legoSelectCalls).toBe(1)
  })

  it('caches the lookup: a whole basket costs one read, not one per phrase', async () => {
    legoRow = { target_text: 'estoy intentando' }
    await savePracticePhrase('spa_for_eng', 3, 1, { knownText: 'a', targetText: 'estoy intentando hablar', position: 1 })
    await savePracticePhrase('spa_for_eng', 3, 1, { knownText: 'b', targetText: 'estoy intentando ir', position: 2 })
    await savePracticePhrase('spa_for_eng', 3, 1, { knownText: 'c', targetText: 'estoy intentando', position: 3 })

    expect(legoSelectCalls).toBe(1)
    expect(upserted).toHaveLength(2)          // the third was the bare LEGO
  })

  it('ABSTAINS when the LEGO cannot be read — a DB hiccup must not block real writes', async () => {
    legoLookupThrows = true
    const result = await savePracticePhrase('spa_for_eng', 9, 1, {
      knownText: 'whatever', targetText: 'lo que sea', position: 1,
    })

    expect(result).not.toBeNull()
    expect(upserted).toHaveLength(1)
  })

  it('has no early-seed exception: even S1L1 gets no bare row', async () => {
    // The floor RAMP relaxes how MANY phrases seed 1 needs, never what may be
    // written as one. LEGO 1 of a course still meets its bare form at debut.
    const result = await savePracticePhrase('spa_for_eng', 1, 1, {
      knownText: 'I want', targetText: 'quiero', position: 1,
    }, { primaryLegoTarget: 'quiero' })

    expect(result).toBeNull()
  })
})
