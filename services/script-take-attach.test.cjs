/**
 * Attaching a filed take to its item (no DB, no audio, no spend).
 * Run: npx vitest run services/script-take-attach
 *
 * The claim: a take recorded in the course-order mode becomes the audio OF its
 * item, through the same three tables and nine columns TTS links through — and
 * a take that carries no item identity is left alone rather than guessed at.
 */

import { describe, it, expect, vi } from 'vitest'

const { planAttach, attachScriptTake, textColumnForRole } = require('./script-take-attach.cjs')

const QUIET = { log: () => {}, warn: () => {}, error: () => {} }

/**
 * Minimal supabase double: from(table).select().eq().eq() resolves to rows,
 * and .update().eq().eq() records the write.
 */
function fakeSupabase({ rowsByTable = {}, failUpdate = null } = {}) {
  const updates = []
  const from = (table) => ({
    select: () => {
      const q = {
        _eqs: {},
        eq(col, val) { this._eqs[col] = val; return this },
        then(resolve) {
          const wantedText = Object.entries(this._eqs).find(([c]) => c.endsWith('_text'))?.[1]
          const rows = (rowsByTable[table] || []).filter(r =>
            wantedText === undefined || r.target_text === wantedText || r.known_text === wantedText)
          return Promise.resolve({ data: rows, error: null }).then(resolve)
        },
      }
      return q
    },
    update: (patch) => ({
      _eqs: {},
      eq(col, val) { this._eqs[col] = val; return this },
      then(resolve) {
        if (failUpdate && failUpdate(table)) {
          return Promise.resolve({ error: { message: 'update refused' } }).then(resolve)
        }
        updates.push({ table, patch, where: { ...this._eqs } })
        return Promise.resolve({ error: null }).then(resolve)
      },
    }),
  })
  return { from, updates }
}

describe('planAttach', () => {
  const good = { itemKind: 'phrase', itemId: 'p1', role: 'target2', text: 'wos mechatst?' }

  it('plans an attach for a course-order take', () => {
    expect(planAttach({ metadata: good, courseAudioId: 'ca1' })).toMatchObject({
      attach: true, kind: 'phrase', itemId: 'p1', column: 'target2_audio_id',
      table: 'course_practice_phrases', idColumn: 'id',
    })
  })

  it('addresses a LEGO by its lego_id, the way the link pass does', () => {
    const plan = planAttach({ metadata: { ...good, itemKind: 'lego', itemId: 'S0001L01' }, courseAudioId: 'ca1' })
    expect(plan).toMatchObject({ table: 'course_legos', idColumn: 'lego_id' })
  })

  it('picks the column for the slot', () => {
    for (const [role, column] of [['known', 'known_audio_id'], ['target1', 'target1_audio_id'], ['target2', 'target2_audio_id']]) {
      expect(planAttach({ metadata: { ...good, role }, courseAudioId: 'ca1' }).column).toBe(column)
    }
  })

  it('leaves a take with no item identity alone — that is the coverage script, not a fault', () => {
    const { itemKind, itemId, ...noIdentity } = good
    expect(planAttach({ metadata: noIdentity, courseAudioId: 'ca1' }))
      .toEqual({ attach: false, reason: 'no_item_identity' })
    expect(planAttach({ metadata: { ...good, itemId: null }, courseAudioId: 'ca1' }))
      .toEqual({ attach: false, reason: 'no_item_id' })
  })

  it('refuses an unfiled take, an unknown kind, a missing slot and empty text', () => {
    expect(planAttach({ metadata: good, courseAudioId: null }).reason).toBe('not_filed')
    expect(planAttach({ metadata: { ...good, itemKind: 'pod' }, courseAudioId: 'ca1' }).reason).toBe('unknown_item_kind')
    expect(planAttach({ metadata: { ...good, role: 'nobody' }, courseAudioId: 'ca1' }).reason).toBe('no_role')
    expect(planAttach({ metadata: { ...good, text: '   ' }, courseAudioId: 'ca1' }).reason).toBe('no_text')
  })

  it('the known slot speaks known_text, every target slot speaks target_text', () => {
    expect(textColumnForRole('known')).toBe('known_text')
    expect(textColumnForRole('target1')).toBe('target_text')
    expect(textColumnForRole('target2')).toBe('target_text')
  })
})

describe('attachScriptTake', () => {
  const metadata = { itemKind: 'phrase', itemId: 'p1', role: 'target2', text: 'i wüü lernen' }

  it('points the item at the clip', async () => {
    const sb = fakeSupabase({ rowsByTable: { course_practice_phrases: [{ id: 'p1', target_text: 'i wüü lernen' }] } })
    const plan = planAttach({ metadata, courseAudioId: 'ca1' })
    const out = await attachScriptTake({ supabase: sb, courseCode: 'deu_at_for_eng', plan, courseAudioId: 'ca1', logger: QUIET })
    expect(out.attached).toBe(true)
    expect(sb.updates).toContainEqual({
      table: 'course_practice_phrases',
      patch: { target2_audio_id: 'ca1' },
      where: { course_code: 'deu_at_for_eng', id: 'p1' },
    })
  })

  it('reaches every item that says the same thing — one clip, all matching items', async () => {
    const sb = fakeSupabase({
      rowsByTable: {
        course_seeds: [{ id: 's7', target_text: 'i wüü lernen' }],
        course_practice_phrases: [{ id: 'p1', target_text: 'i wüü lernen' }],
        course_legos: [{ lego_id: 'S0001L01', target_text: 'something else' }],
      },
    })
    const plan = planAttach({ metadata, courseAudioId: 'ca1' })
    const out = await attachScriptTake({ supabase: sb, courseCode: 'deu_at_for_eng', plan, courseAudioId: 'ca1', logger: QUIET })
    expect(out.linked).toBe(2)
    expect(sb.updates.map(u => u.table).sort()).toEqual(['course_practice_phrases', 'course_seeds'])
    // The LEGO says something else, so it is untouched.
    expect(sb.updates.some(u => u.table === 'course_legos')).toBe(false)
  })

  it('attaches the named item exactly once, even when it is its own text match', async () => {
    const sb = fakeSupabase({ rowsByTable: { course_practice_phrases: [{ id: 'p1', target_text: 'i wüü lernen' }] } })
    const plan = planAttach({ metadata, courseAudioId: 'ca1' })
    const out = await attachScriptTake({ supabase: sb, courseCode: 'deu_at_for_eng', plan, courseAudioId: 'ca1', logger: QUIET })
    expect(out.linked).toBe(1)
    expect(sb.updates).toHaveLength(1)
  })

  it('still attaches the named item when no row text matches — identity beats text', async () => {
    const sb = fakeSupabase({ rowsByTable: {} })
    const plan = planAttach({ metadata, courseAudioId: 'ca1' })
    const out = await attachScriptTake({ supabase: sb, courseCode: 'deu_at_for_eng', plan, courseAudioId: 'ca1', logger: QUIET })
    expect(out.attached).toBe(true)
    expect(sb.updates).toHaveLength(1)
  })

  it('does nothing at all when there is no plan', async () => {
    const sb = fakeSupabase({})
    const out = await attachScriptTake({
      supabase: sb, courseCode: 'c', plan: { attach: false, reason: 'no_item_identity' },
      courseAudioId: 'ca1', logger: QUIET,
    })
    expect(out).toEqual({ attached: false, linked: 0, reason: 'no_item_identity' })
    expect(sb.updates).toHaveLength(0)
  })

  it('reports a refused write instead of throwing — the take is already safe', async () => {
    const sb = fakeSupabase({
      rowsByTable: { course_practice_phrases: [{ id: 'p1', target_text: 'i wüü lernen' }] },
      failUpdate: () => true,
    })
    const plan = planAttach({ metadata, courseAudioId: 'ca1' })
    const out = await attachScriptTake({ supabase: sb, courseCode: 'c', plan, courseAudioId: 'ca1', logger: QUIET })
    expect(out.attached).toBe(false)
    expect(out.reason).toBe('update_failed')
    expect(out.failures).toHaveLength(1)
  })

  it('survives a database that throws, and says the clip is filed but unattached', async () => {
    const exploding = { from: () => { throw new Error('connection lost') } }
    const plan = planAttach({ metadata, courseAudioId: 'ca1' })
    const out = await attachScriptTake({ supabase: exploding, courseCode: 'c', plan, courseAudioId: 'ca1', logger: QUIET })
    expect(out).toMatchObject({ attached: false, linked: 0, reason: 'attach_failed', message: 'connection lost' })
  })
})
