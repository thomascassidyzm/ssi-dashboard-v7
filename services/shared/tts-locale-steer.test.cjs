/**
 * THE AUSTRIAN STEER, AND THE THREE THINGS IT MUST NOT DISTURB.
 *
 * Written 2026-09-10 when Kai ruled Cartesia in for the Austrian German course
 * and asked for the de-AT steer. Before this module every course-audio render
 * computed its steer as toBcp47(courses.target_lang), and target_lang for
 * deu_at_for_eng is the BASE tag 'deu' — so the render asked for 'de'. The
 * first case below is red on that code and green on this.
 *
 * The other cases are the blast radius, asserted rather than assumed: a dialect
 * NAME has no BCP-47 region and must not grow an invented one; an already-
 * BCP-47 value off course_audio.language must keep its old answer; and the
 * known side must be byte-identical, because widening the change to it buys
 * nothing and risks the 150 courses that were never the point.
 */
import { describe, it, expect } from 'vitest'

const { toBcp47 } = require('../voice-discovery-service.cjs')
const { ttsLocaleForRole } = require('./tts-locale-steer.cjs')

/** deu_at_for_eng as the live row actually reads it (checked 2026-09-10). */
const AUSTRIAN = {
  course_code: 'deu_at_for_eng',
  known_lang: 'eng',
  target_lang: 'deu',       // the BASE tag — this is the whole trap
  voice_pool_key: 'deu_at',
  dialect: 'standard',
  known_dialect: null,
}

/** cym_n_for_eng: a dialect stated as a NAME, with no region subtag to spell. */
const NORTHERN_WELSH = {
  course_code: 'cym_n_for_eng',
  known_lang: 'eng',
  target_lang: 'cym',
  voice_pool_key: null,
  dialect: 'north',
  known_dialect: null,
}

describe('ttsLocaleForRole — the target-side steer', () => {
  it('sends de-AT for the Austrian course, not plain de', () => {
    expect(ttsLocaleForRole(AUSTRIAN, 'target1', 'deu')).toBe('de-AT')
    expect(ttsLocaleForRole(AUSTRIAN, 'target2', 'deu')).toBe('de-AT')
  })

  it('leaves the known side exactly where it was', () => {
    for (const role of ['known', 'presentation', 'instruction', 'encouragement']) {
      expect(ttsLocaleForRole(AUSTRIAN, role, 'eng')).toBe(toBcp47('eng'))
    }
  })

  it('does not invent a region for a dialect stated as a name', () => {
    expect(ttsLocaleForRole(NORTHERN_WELSH, 'target1', 'cym')).toBe('cym')
  })
})

describe('toBcp47 — regional cast keys', () => {
  it('spells a two-letter region subtag as BCP-47', () => {
    expect(toBcp47('deu_at')).toBe('de-AT')
    expect(toBcp47('deu_ch')).toBe('de-CH')
    expect(toBcp47('spa_mx')).toBe('es-MX')
    expect(toBcp47('fra_ca')).toBe('fr-CA')
  })

  it('answers a bare base language exactly as before', () => {
    expect(toBcp47('deu')).toBe('de')
    expect(toBcp47('eng')).toBe('en')
    expect(toBcp47('zho')).toBe('zh')
    expect(toBcp47('por_br')).toBe('pt-BR')
    expect(toBcp47('ara_eg')).toBe('ar-EG')
  })

  it('keeps the hyphenated, already-BCP-47 values off course_audio.language', () => {
    // These arrive from the language COLUMN, which carries 137 spellings.
    // Region-stripping them is long-standing behaviour and is not in scope.
    expect(toBcp47('en-GB')).toBe('en')
    expect(toBcp47('de-AT')).toBe('de')
  })

  it('falls through to the base for a dialect name', () => {
    expect(toBcp47('cym_north')).toBe('cym')  // no ISO-639-1 mapping for cym; unchanged
    expect(toBcp47('gle_munster')).toBe('gle')
  })
})
