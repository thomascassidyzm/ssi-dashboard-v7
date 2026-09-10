// The Pod 1 row on cym_n_for_eng read "154 human takes by Aran and Catrin and
// human_aran_cym_n_2". The third name is Aran's second voice id, not a person.
// The fixtures are the real ids and the real alias map from courses.voice_config.
import { describe, it, expect } from 'vitest'
import { voiceNamesFromCoverage, recordistNames } from './recordistNames.js'

const VOICES = [
  { voiceId: 'human_aran_cym_n', name: 'Aran', aliases: ['human_aran_cym_n_2', 'human_aranv3_cym_n'] },
  { voiceId: 'human_catrinlliar_cym_n', name: 'Catrin', aliases: ['human_catrinv2_cym_n'] },
]

describe('recordist names — an alias is the same person', () => {
  it('names Aran and Catrin once each across three clip voice ids', () => {
    const names = voiceNamesFromCoverage(VOICES)
    expect(recordistNames(['human_aran_cym_n', 'human_catrinlliar_cym_n', 'human_aran_cym_n_2'], names))
      .toEqual(['Aran', 'Catrin'])
  })

  it('still works off a payload with no aliases field (older server)', () => {
    const names = voiceNamesFromCoverage(VOICES.map(({ voiceId, name }) => ({ voiceId, name })))
    expect(recordistNames(['human_aran_cym_n'], names)).toEqual(['Aran'])
  })

  it('never hides a take it cannot name — the raw id survives', () => {
    const names = voiceNamesFromCoverage(VOICES)
    expect(recordistNames(['human_aran_cym_n', 'human_steve_eng'], names)).toEqual(['Aran', 'human_steve_eng'])
  })
})
