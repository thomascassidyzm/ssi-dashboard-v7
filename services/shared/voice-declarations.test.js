/**
 * The corridor and the capability gate — the two rules that make "one voice per side"
 * and "clones used multilingually wherever the clone is capable" structural rather than
 * hopeful. Both are pure, so both are tested here without a database.
 *
 * Run: npx vitest run services/shared/voice-declarations.test.js
 */

import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'

const require_ = createRequire(import.meta.url)
const vd = require_('./voice-declarations.cjs')

const DECLARATIONS = {
  courses: {
    deu_for_eng: { known: 'eve', target1: 'ara', target2: 'leo' },
    fra_for_eng: { known: 'eve', target1: 'eve', target2: 'eve' },
    deu_at_for_eng: { known: 'en-GB-SoniaNeural', target1: 'de-AT-IngridNeural' },
  },
}

describe('declarations are read in canonical spelling', () => {
  it('answers with the canonical id whichever spelling was declared', () => {
    expect(vd.declaredVoice(DECLARATIONS, 'deu_for_eng', 'target1')).toBe('xai_ara')
    expect(vd.declaredVoice({ courses: { x: { target1: 'xai_ara' } } }, 'x', 'target1')).toBe('xai_ara')
  })

  it('returns null for a side nobody has declared', () => {
    expect(vd.declaredVoice(DECLARATIONS, 'spa_for_eng', 'target1')).toBe(null)
  })
})

describe('the corridor — the renderer cannot be handed another voice', () => {
  it('accepts the declared voice in either spelling', () => {
    expect(vd.assertRenderVoice(DECLARATIONS, 'deu_for_eng', 'target1', 'ara')).toBe('xai_ara')
    expect(vd.assertRenderVoice(DECLARATIONS, 'deu_for_eng', 'target1', 'xai_ara')).toBe('xai_ara')
  })

  it('THROWS on a different voice — the eleven stray eve rows on the German side', () => {
    expect(() => vd.assertRenderVoice(DECLARATIONS, 'deu_for_eng', 'target1', 'eve'))
      .toThrow(/declared as xai_ara; this render asked for xai_eve/)
  })

  it('says there is no automatic fallback rather than leaving it implied', () => {
    expect(() => vd.assertRenderVoice(DECLARATIONS, 'deu_for_eng', 'target1', 'azure_de-DE-KatjaNeural'))
      .toThrow(/no automatic fallback/)
  })

  it('THROWS on an undeclared side rather than rendering something plausible', () => {
    expect(() => vd.assertRenderVoice(DECLARATIONS, 'spa_for_eng', 'target1', 'ara'))
      .toThrow(/has not declared a voice/)
  })
})

describe('the capability gate', () => {
  const capability = {
    xai_gfzdpspr5fdp: {
      deu: { verdict: 'holds' },
      fra: { verdict: 'does-not-hold' },
    },
  }

  it('does not gate a stock provider voice', () => {
    expect(vd.canDeclare(capability, 'ara', 'deu').allowed).toBe(true)
    expect(vd.canDeclare(capability, 'de-AT-IngridNeural', 'deu').allowed).toBe(true)
  })

  it('allows a clone where VOICELAB says it holds', () => {
    expect(vd.canDeclare(capability, 'gfzdpspr5fdp', 'deu').allowed).toBe(true)
  })

  it('refuses a clone where VOICELAB says it does not hold', () => {
    const r = vd.canDeclare(capability, 'gfzdpspr5fdp', 'fra')
    expect(r.allowed).toBe(false)
    expect(r.requiresExperiment).toBe(false)
  })

  it('refuses an UNTESTED pair and names the experiment — the hope-to-process step', () => {
    const r = vd.canDeclare(capability, 'gfzdpspr5fdp', 'spa')
    expect(r.allowed).toBe(false)
    expect(r.requiresExperiment).toBe(true)
    expect(r.reason).toMatch(/Experiment 0/)
  })

  it('reads the verdict through canonical spelling of both voice and language', () => {
    expect(vd.canDeclare(capability, 'xai_gfzdpspr5fdp', 'de-DE').allowed).toBe(true)
    expect(vd.canDeclare(capability, 'gfzdpspr5fdp', 'de').allowed).toBe(true)
  })
})

describe('clone detection — inference, and labelled as such', () => {
  it('reads the five xAI multilingual names as stock', () => {
    for (const v of ['ara', 'eve', 'leo', 'rex', 'sal']) expect(vd.isClone(v)).toBe(false)
  })
  it('reads provider-prefixed ids as stock', () => {
    expect(vd.isClone('de-AT-IngridNeural')).toBe(false)
    expect(vd.isClone('elevenlabs_FVdzAUsp8apoOdc0907A')).toBe(false)
    expect(vd.isClone('narakeet_fritzi')).toBe(false)
  })
  it('reads a bare alphanumeric token as a clone', () => {
    expect(vd.isClone('gfzdpspr5fdp')).toBe(true)
    expect(vd.isClone('3a7889066fa2')).toBe(true)
  })
})

describe('validateDeclarations reports every problem at once', () => {
  it('passes the three declared courses when the languages are stock voices', () => {
    const r = vd.validateDeclarations(DECLARATIONS, {}, (course, role) => (role === 'known' ? 'eng' : 'deu'))
    expect(r.valid).toBe(true)
  })

  it('collects an error per untested clone rather than stopping at the first', () => {
    const decl = { courses: { a: { target1: 'gfzdpspr5fdp' }, b: { target1: 'gfzdpspr5fdp' } } }
    const r = vd.validateDeclarations(decl, {}, () => 'spa')
    expect(r.valid).toBe(false)
    expect(r.errors).toHaveLength(2)
  })

  it('warns rather than errors when the side language is unknown', () => {
    const r = vd.validateDeclarations({ courses: { a: { target1: 'gfzdpspr5fdp' } } }, {}, () => null)
    expect(r.valid).toBe(true)
    expect(r.warnings[0]).toMatch(/capability not checked/)
  })
})
