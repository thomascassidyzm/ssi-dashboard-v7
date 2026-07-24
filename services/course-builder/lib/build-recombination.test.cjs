/**
 * Unit tests for the BUILD anti-template gate (template-stamp fix 2026-07-24).
 *
 * The stamp: compaction-degenerate builders emit bare-LEGO + trailing filler
 * tags (", sí" / ", bien" / ", again") or own-USE-stem + tag, which passed
 * every pre-existing gate because fillers are known vocab. The gate promotes
 * the audit classifier (scripts/build-audit/classify-builds.cjs) into the
 * submit path — keep the two in lockstep.
 *
 * Run: npx vitest run services/course-builder/lib/build-recombination
 */

import { describe, it, expect } from 'vitest'

const { classifyBuildPhrase, checkBuildRecombination } = require('./validation.cjs')

// Tester's real case: spa_for_eng seed 543, lego "ella tenía razón"
const LEGO = { idx: 1, known: 'she was right', target: 'ella tenía razón' }
const USE = [
  { known: 'she was right here', target: 'ella tenía razón aquí' },
  { known: 'she was right before', target: 'ella tenía razón antes' },
]
const PRIOR = new Set(['aquí', 'antes', 'yo creo que', 'pero', 'no sabía', 'sí', 'bien'])

describe('classifyBuildPhrase', () => {
  const useNorms = new Set(USE.map(p => p.target.toLowerCase()))

  it('first bare-LEGO row is the debut convention, not a defect', () => {
    expect(classifyBuildPhrase('ella tenía razón', LEGO.target, useNorms, true).cls).toBe('debut-row')
  })

  it('bare LEGO in a later row is a bare-repeat', () => {
    expect(classifyBuildPhrase('ella tenía razón', LEGO.target, useNorms, false).cls).toBe('bare-repeat')
  })

  it('LEGO + trailing short tag is a comma-tag stamp', () => {
    expect(classifyBuildPhrase('ella tenía razón, sí', LEGO.target, useNorms, false).cls).toBe('comma-tag')
    expect(classifyBuildPhrase('ella tenía razón, ¿no?', LEGO.target, useNorms, false).cls).toBe('comma-tag')
  })

  it('own USE stem + trailing tag is a use-stem+tag stamp', () => {
    expect(classifyBuildPhrase('ella tenía razón aquí, bien', LEGO.target, useNorms, false).cls).toBe('use-stem+tag')
  })

  it('genuine recombination passes', () => {
    expect(classifyBuildPhrase('yo creo que ella tenía razón', LEGO.target, useNorms, false).cls).toBe('ok')
  })

  it('a comma phrase whose stem is NOT the lego/USE passes (no false positive)', () => {
    expect(classifyBuildPhrase('pero ella tenía razón, yo creo que', LEGO.target, useNorms, false).cls).toBe('ok')
  })
})

describe('checkBuildRecombination', () => {
  it('rejects the tester\'s exact stamped basket', () => {
    const lego = {
      ...LEGO,
      build: [
        { known: 'she was right', target: 'ella tenía razón' },
        { known: 'she was right, yes', target: 'ella tenía razón, sí' },
        { known: 'she was right here, fine', target: 'ella tenía razón aquí, bien' },
      ],
      use: USE,
    }
    const r = checkBuildRecombination(lego, 'spa_for_eng', 543, PRIOR)
    expect(r.valid).toBe(false)
    expect(r.rejects.map(x => x.class).sort()).toEqual(['comma-tag', 'use-stem+tag'])
  })

  it('passes a genuinely recombining basket', () => {
    const lego = {
      ...LEGO,
      build: [
        { known: 'she was right', target: 'ella tenía razón' },
        { known: 'I think that she was right', target: 'yo creo que ella tenía razón' },
        { known: 'but she was right', target: 'pero ella tenía razón' },
      ],
      use: USE,
    }
    const r = checkBuildRecombination(lego, 'spa_for_eng', 543, PRIOR)
    expect(r.valid).toBe(true)
    expect(r.recombining).toBe(2)
  })

  it('fails when non-LEGO material never draws on prior chunks', () => {
    const lego = {
      ...LEGO,
      build: [
        { known: 'she was right', target: 'ella tenía razón' },
        { known: 'she was right', target: 'ella tenía razón' },
      ],
      use: USE,
    }
    const r = checkBuildRecombination(lego, 'spa_for_eng', 543, PRIOR)
    expect(r.valid).toBe(false)
    expect(r.rejects[0].class).toBe('bare-repeat')
  })

  it('early-seed ramp: seed 1 lego 1 has no recombination floor', () => {
    const lego = { idx: 1, target: 'quiero', build: [{ known: 'I want', target: 'quiero' }], use: [] }
    const r = checkBuildRecombination(lego, 'spa_for_eng', 1, new Set())
    expect(r.valid).toBe(true)
  })

  it('skips component rows that do not contain the lego', () => {
    const lego = {
      ...LEGO,
      build: [
        { known: 'she was right', target: 'ella tenía razón' },
        { known: 'right', target: 'razón' },
        { known: 'but she was right', target: 'pero ella tenía razón' },
        { known: 'she was right here', target: 'aquí ella tenía razón' },
      ],
      use: USE,
    }
    const r = checkBuildRecombination(lego, 'spa_for_eng', 543, PRIOR)
    expect(r.valid).toBe(true)
  })
})
