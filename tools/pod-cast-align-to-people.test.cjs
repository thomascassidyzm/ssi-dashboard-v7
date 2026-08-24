/**
 * The two properties this tool must not lose:
 *   1. it casts from the NAMED cast of record — a label it cannot find a person
 *      for comes back null, so run() can refuse rather than guess a voice;
 *   2. it restates only gender and the two track voices — anything else already
 *      on the speakers entry (variants, later additions) survives the rewrite.
 */
import { describe, it, expect } from 'vitest'
const { canonicalSpeaker, castFor, alignedEntry, distinctVoices } = require('./pod-cast-align-to-people.cjs')

const ARAN = { name: 'Aran', email: 'aran@hey.com', gender: 'm', voiceId: 'human_aran_cym_n' }
const CATRIN = { name: 'Catrin', email: 'catrinlliar@gmail.com', gender: 'f', voiceId: 'human_catrinlliar_cym_n' }

describe('canonicalSpeaker', () => {
  it('strips the time-of-day parenthetical the scripts carry', () => {
    expect(canonicalSpeaker('Friend (7 pm)')).toBe('Friend')
    expect(canonicalSpeaker('Neighbour  (08:00) ')).toBe('Neighbour')
  })
})

describe('castFor', () => {
  const podCast = { Friend: ARAN, Sarah: CATRIN }
  it('finds the reader by the raw label', () => expect(castFor(podCast, 'Sarah')).toBe(CATRIN))
  it('finds the reader by the canonical label', () => expect(castFor(podCast, 'Friend (7 pm)')).toBe(ARAN))
  it('returns null for an uncast label rather than a default', () => {
    expect(castFor(podCast, 'Pharmacist')).toBeNull()
  })
})

describe('alignedEntry', () => {
  const before = {
    gender: 'f',
    variants: ['Barista (3 pm)', 'Barista'],
    target: { name: 'Male voice 1', provider: 'human', voice_id: 'HUMAN_M1' },
    known: { name: 'Male voice 1', provider: 'human', voice_id: 'HUMAN_M1' },
  }
  it('puts both tracks on the cast reader', () => {
    const after = alignedEntry(before, CATRIN)
    expect(after.target).toEqual({ name: 'Catrin', provider: 'human', voice_id: 'human_catrinlliar_cym_n' })
    expect(after.known).toEqual(after.target)
  })
  it('takes gender from the cast of record, not the stale entry', () => {
    expect(alignedEntry({ gender: 'n' }, ARAN).gender).toBe('m')
  })
  it('keeps every other key on the entry', () => {
    expect(alignedEntry(before, CATRIN).variants).toEqual(['Barista (3 pm)', 'Barista'])
  })
})

describe('distinctVoices', () => {
  it('counts voices, not characters — the whole point of the two-hander rule', () => {
    const speakers = {
      Sarah: alignedEntry({}, CATRIN),
      Anna: alignedEntry({}, CATRIN),
      James: alignedEntry({}, ARAN),
    }
    const voices = distinctVoices(speakers, 'target')
    expect([...voices.keys()]).toEqual(['human|human_catrinlliar_cym_n', 'human|human_aran_cym_n'])
    expect(voices.get('human|human_catrinlliar_cym_n')).toEqual(['Sarah', 'Anna'])
  })
  it('reads the legacy top-level shape on the target track only', () => {
    const speakers = { Old: { provider: 'xai', voice_id: 'legacy1' } }
    expect([...distinctVoices(speakers, 'target').keys()]).toEqual(['xai|legacy1'])
    expect([...distinctVoices(speakers, 'known').keys()]).toEqual(['none'])
  })
})
