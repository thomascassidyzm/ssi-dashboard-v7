/**
 * The original is frozen once, and a restore appends.
 *
 * The load-bearing assertions, in the order they matter:
 *
 * 1. THE FROZEN ORIGINAL IS WRITTEN ON THE FIRST EDIT AND NEVER AGAIN. It is
 *    the only copy of what the line said before anyone touched it; a second
 *    edit that re-froze would overwrite that with an already-edited value and
 *    the way back would be gone with nothing on screen to say so.
 * 2. A RESTORE APPENDS, IT DOES NOT DELETE. Rolling back and forth twice must
 *    leave every intermediate value still readable — that is the whole reason
 *    the history exists rather than an undo buffer.
 * 3. THE LIVE LINE MOVES WITH THE HISTORY. canonical_pod_scenarios is what the
 *    generator reads; a save that recorded a version but left the live text
 *    behind would be a history of an edit that never happened.
 * 4. A BLUR WITH NO TYPING WRITES NOTHING. The editor saves on blur, so a
 *    no-op that minted a row would bury real edits under duplicates.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createFakeSupabase, createFakeRes } from './lib/fake-supabase.js'
import { hasOriginal, patchFor, versionList, editSummary, originalRowFrom, saveRowFrom, EDITABLE_FIELDS } from './lib/canonical-script-versions.js'

const state = vi.hoisted(() => ({ db: null, user: { email: 'aran@ssi.app' } }))

vi.mock('./lib/supabase.js', () => ({ getSupabase: () => state.db }))
vi.mock('./lib/auth.js', () => ({ verifySupabaseJWT: async () => state.user }))

const { default: handler } = await import('./canonical-script.js')

const VERSIONS = 'canonical_script_versions'
const LINES = 'canonical_pod_scenarios'

const ORIGINAL = 'So what do you want to say?'
const EDITED = 'So what would you like to say?'
const AGAIN = 'And what would you like to say?'

/** One editable line, plus a line in another pod that no query may pick up. */
function seed(versions = []) {
  return createFakeSupabase(
    {
      [LINES]: [
        { id: 'pod-0.5-s01-01', pod_slug: 'pod-0.5', scene_number: 1, sentence_number: 1, speaker: 'Aran', english_text: ORIGINAL, author_notes: null },
        { id: 'pod-1-s01-01', pod_slug: 'pod-1', scene_number: 1, sentence_number: 1, speaker: 'Cat', english_text: 'a line in another pod', author_notes: null },
      ],
      [VERSIONS]: versions,
    },
    {
      defaults: {
        [VERSIONS]: existing => ({
          id: existing.reduce((m, r) => Math.max(m, Number(r.id)), 0) + 1,
          saved_at: new Date().toISOString(),
        }),
      },
    }
  )
}

function req(overrides = {}) {
  return { method: 'GET', headers: { authorization: 'Bearer t' }, query: {}, body: {}, ...overrides }
}

async function call(overrides) {
  const res = createFakeRes()
  await handler(req(overrides), res)
  return res
}

const versionsOf = (id = 'pod-0.5-s01-01') => state.db.tables[VERSIONS].filter(r => r.scenario_id === id)
const liveText = (id = 'pod-0.5-s01-01') => state.db.tables[LINES].find(r => r.id === id).english_text

beforeEach(() => { state.db = seed(); state.user = { email: 'aran@ssi.app' } })

describe('saving a canonical line', () => {
  it('freezes the pre-edit text as the original, once and once only', async () => {
    const first = await call({ method: 'POST', query: { line: 'pod-0.5-s01-01' }, body: { english_text: EDITED } })
    expect(first.statusCode).toBe(200)
    expect(first.body.ok).toBe(true)

    let rows = versionsOf()
    expect(rows.map(r => r.kind)).toEqual(['original', 'save'])
    expect(rows[0].english_text).toBe(ORIGINAL)
    expect(rows[1].english_text).toBe(EDITED)

    await call({ method: 'POST', query: { line: 'pod-0.5-s01-01' }, body: { english_text: AGAIN } })

    rows = versionsOf()
    expect(rows.filter(r => r.kind === 'original')).toHaveLength(1)
    expect(rows.find(r => r.kind === 'original').english_text).toBe(ORIGINAL)
    expect(rows.map(r => r.kind)).toEqual(['original', 'save', 'save'])
  })

  it('moves the live line and attributes the edit to the signed-in email', async () => {
    await call({ method: 'POST', query: { line: 'pod-0.5-s01-01' }, body: { english_text: EDITED } })
    expect(liveText()).toBe(EDITED)
    expect(versionsOf().at(-1).saved_by).toBe('aran@ssi.app')
    expect(versionsOf().at(-1).pod_slug).toBe('pod-0.5')
  })

  it('writes nothing when the text has not changed', async () => {
    const res = await call({ method: 'POST', query: { line: 'pod-0.5-s01-01' }, body: { english_text: ORIGINAL } })
    expect(res.body).toMatchObject({ ok: true, unchanged: true })
    expect(versionsOf()).toHaveLength(0)
  })

  it('refuses to empty a line, and refuses a body with nothing editable in it', async () => {
    const empty = await call({ method: 'POST', query: { line: 'pod-0.5-s01-01' }, body: { english_text: '  ' } })
    expect(empty.statusCode).toBe(400)
    const nothing = await call({ method: 'POST', query: { line: 'pod-0.5-s01-01' }, body: { colour: 'blue' } })
    expect(nothing.statusCode).toBe(400)
    expect(versionsOf()).toHaveLength(0)
    expect(liveText()).toBe(ORIGINAL)
  })

  it('404s an unknown line rather than creating history for it', async () => {
    const res = await call({ method: 'POST', query: { line: 'no-such-line' }, body: { english_text: 'x' } })
    expect(res.statusCode).toBe(404)
    expect(state.db.tables[VERSIONS]).toHaveLength(0)
  })

  it('needs a Popty session', async () => {
    state.user = null
    const res = await call({ method: 'POST', query: { line: 'pod-0.5-s01-01' }, body: { english_text: EDITED } })
    expect(res.statusCode).toBe(403)
    expect(versionsOf()).toHaveLength(0)
  })
})

describe('restoring an older version', () => {
  it('appends a new save rather than deleting anything, and rolls the live text back', async () => {
    await call({ method: 'POST', query: { line: 'pod-0.5-s01-01' }, body: { english_text: EDITED } })
    await call({ method: 'POST', query: { line: 'pod-0.5-s01-01' }, body: { english_text: AGAIN } })
    const before = versionsOf().length
    const original = versionsOf().find(r => r.kind === 'original')

    const res = await call({
      method: 'POST',
      query: { line: 'pod-0.5-s01-01', restore: '1' },
      body: { versionId: original.id },
    })

    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({ ok: true, restored: true, fromVersionId: Number(original.id) })
    expect(liveText()).toBe(ORIGINAL)

    const after = versionsOf()
    expect(after).toHaveLength(before + 1)
    expect(after.at(-1).kind).toBe('save')
    expect(after.at(-1).english_text).toBe(ORIGINAL)
    // Every intermediate value is still there to compare against.
    expect(after.map(r => r.english_text)).toEqual([ORIGINAL, EDITED, AGAIN, ORIGINAL])
  })

  it('refuses a version belonging to another line', async () => {
    await call({ method: 'POST', query: { line: 'pod-0.5-s01-01' }, body: { english_text: EDITED } })
    await call({ method: 'POST', query: { line: 'pod-1-s01-01' }, body: { english_text: 'edited elsewhere' } })
    const foreign = state.db.tables[VERSIONS].find(r => r.scenario_id === 'pod-1-s01-01')

    const res = await call({
      method: 'POST',
      query: { line: 'pod-0.5-s01-01', restore: '1' },
      body: { versionId: foreign.id },
    })
    expect(res.statusCode).toBe(404)
    expect(liveText()).toBe(EDITED)
  })

  it('is a no-op when the version already says what the line says', async () => {
    await call({ method: 'POST', query: { line: 'pod-0.5-s01-01' }, body: { english_text: EDITED } })
    const newest = versionsOf().at(-1)
    const res = await call({
      method: 'POST',
      query: { line: 'pod-0.5-s01-01', restore: '1' },
      body: { versionId: newest.id },
    })
    expect(res.body).toMatchObject({ ok: true, unchanged: true })
    expect(versionsOf()).toHaveLength(2)
  })
})

describe('reading the history', () => {
  it('lists a line newest-first with the frozen original at the bottom', async () => {
    await call({ method: 'POST', query: { line: 'pod-0.5-s01-01' }, body: { english_text: EDITED } })
    await call({ method: 'POST', query: { line: 'pod-0.5-s01-01' }, body: { english_text: AGAIN } })

    const res = await call({ method: 'GET', query: { line: 'pod-0.5-s01-01' } })
    expect(res.statusCode).toBe(200)
    expect(res.body.line.englishText).toBe(AGAIN)
    expect(res.body.edits).toBe(2)
    expect(res.body.versions.map(v => v.englishText)).toEqual([AGAIN, EDITED, ORIGINAL])
    expect(res.body.versions.at(-1).kind).toBe('original')
    expect(res.body.versions[0].savedBy).toBe('aran@ssi.app')
  })

  it('reports every edited line in a script, and only that script', async () => {
    await call({ method: 'POST', query: { line: 'pod-0.5-s01-01' }, body: { english_text: EDITED } })
    await call({ method: 'POST', query: { line: 'pod-1-s01-01' }, body: { english_text: 'edited elsewhere' } })

    const res = await call({ method: 'GET', query: { slug: 'pod-0.5', history: '1' } })
    expect(res.statusCode).toBe(200)
    expect(res.body.editedLines).toBe(1)
    expect(res.body.lines).toEqual([
      { scenarioId: 'pod-0.5-s01-01', edits: 1, lastSavedAt: expect.any(String), lastSavedBy: 'aran@ssi.app' },
    ])
  })
})

describe('the rules, without a database', () => {
  it('hasOriginal is about the frozen row, not about there being any history', () => {
    expect(hasOriginal([])).toBe(false)
    expect(hasOriginal([{ kind: 'save' }])).toBe(false)
    expect(hasOriginal([{ kind: 'original' }, { kind: 'save' }])).toBe(true)
  })

  it('patchFor keeps only fields that were sent AND differ', () => {
    const line = { english_text: 'a', speaker: 'Aran', author_notes: null }
    expect(patchFor(line, { english_text: 'a' })).toEqual({})
    expect(patchFor(line, { english_text: 'b' })).toEqual({ english_text: 'b' })
    expect(patchFor(line, { english_text: 'b', speaker: 'Aran' })).toEqual({ english_text: 'b' })
    expect(patchFor(line, { author_notes: '' })).toEqual({})
    expect(patchFor(line, { author_notes: 'check the stress' })).toEqual({ author_notes: 'check the stress' })
    expect(patchFor(line, { english_text: 42 })).toEqual({})
  })

  it('editSummary counts saves, never the frozen original', () => {
    const rows = [
      { id: 1, scenario_id: 'x', kind: 'original', saved_at: 't1', saved_by: 'seed' },
      { id: 2, scenario_id: 'x', kind: 'save', saved_at: 't2', saved_by: 'aran@ssi.app' },
      { id: 3, scenario_id: 'y', kind: 'original', saved_at: 't3', saved_by: 'seed' },
    ]
    expect(editSummary(rows)).toEqual([
      { scenarioId: 'x', edits: 1, lastSavedAt: 't2', lastSavedBy: 'aran@ssi.app' },
    ])
  })

  it('versionList is newest first', () => {
    const rows = [
      { id: 1, kind: 'original', english_text: 'a', saved_at: 't1', saved_by: 's' },
      { id: 2, kind: 'save', english_text: 'b', saved_at: 't2', saved_by: 's' },
    ]
    expect(versionList(rows).map(v => v.versionId)).toEqual([2, 1])
  })

  // ── the target, editable since 2026-09-01 ───────────────────────────────────
  // The Welsh health overlay lands in this store as a DRAFT for Aran, and a
  // draft nobody can correct on the page is a page you can only look at. The
  // target rides the SAME freeze-then-append path as the English, so these
  // assertions are the English ones with the column swapped.
  it('target_text is an editable field', () => {
    expect(EDITABLE_FIELDS).toContain('target_text')
  })

  it('patchFor picks up a target-only edit and ignores a target no-op', () => {
    const line = { english_text: 'a', target_text: 'os dw i', speaker: null, author_notes: null }
    expect(patchFor(line, { target_text: 'os dw i' })).toEqual({})
    expect(patchFor(line, { target_text: 'os dan ni' })).toEqual({ target_text: 'os dan ni' })
    // Editing the target must not drag the English along for the ride.
    expect(patchFor(line, { english_text: 'a', target_text: 'os dan ni' })).toEqual({ target_text: 'os dan ni' })
  })

  it('the frozen original carries the pre-edit target, not just the English', () => {
    const line = { id: 'x', pod_slug: 'health-general-welsh', english_text: 'a', target_text: 'os dw i', target_lang: 'cym_n' }
    expect(originalRowFrom(line, 'tom')).toMatchObject({ target_text: 'os dw i', target_lang: 'cym_n' })
  })

  it('a save row carries the line in full — English AND target', () => {
    const line = { id: 'x', pod_slug: 'p', english_text: 'a', target_text: 'os dw i', target_lang: 'cym_n' }
    const row = saveRowFrom(line, { target_text: 'os dan ni' }, 'tom')
    expect(row).toMatchObject({ kind: 'save', english_text: 'a', target_text: 'os dan ni', target_lang: 'cym_n' })
  })

  it('versionList exposes the target so the page can diff it', () => {
    const rows = [{ id: 1, kind: 'original', english_text: 'a', target_text: 'os dw i', target_lang: 'cym_n', saved_at: 't', saved_by: 's' }]
    expect(versionList(rows)[0]).toMatchObject({ targetText: 'os dw i', targetLang: 'cym_n' })
  })
})
