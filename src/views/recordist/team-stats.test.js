import { describe, it, expect } from 'vitest'
import { showsTeamSection, teamCards, focusProject } from './team-stats.js'

const p = (key, recorded, total, lastActive = null, other = false) => ({ key, recorded, total, other, activity: { lastActive } })

describe('team stats on a God admin booth (job #379)', () => {
  it('exists on Aran\'s and Kai\'s booths only — an ordinary reader\'s booth draws nothing', () => {
    expect(showsTeamSection('human_aran_cym_n')).toBe(true)
    expect(showsTeamSection('human_catrinlliar_cym_n')).toBe(false)
    expect(showsTeamSection('human_dan_cym_s')).toBe(false)
    expect(showsTeamSection(undefined)).toBe(false)
  })

  it('shows the other readers, not this booth\'s own artist in any voice, nor test voices', () => {
    const artists = [
      { voiceId: 'human_aran_cym_n', name: 'Aran', projects: [] },
      { voiceId: 'human_aran_eng', name: 'Aran', projects: [] },
      { voiceId: 'human_dan_cym_s', name: 'Dan', projects: [] },
      { voiceId: 'human_e2e_booth_zzz', name: 'E2E', isTest: true, projects: [] },
      { voiceId: 'human_recording', name: 'human_recording', noQueue: true, projects: [] },
    ]
    expect(teamCards(artists, 'human_aran_cym_n').map((a) => a.voiceId)).toEqual(['human_dan_cym_s'])
  })

  it('a card leads with the project worked on most recently, else the first unfinished', () => {
    expect(focusProject([p('old', 0, 0, '2026-10-01', true), p('pod', 62, 80, '2026-10-08'), p('seed', 0, 206)]).key).toBe('pod')
    expect(focusProject([p('done', 5, 5), p('seed', 0, 206)]).key).toBe('seed')
    expect(focusProject([])).toBe(null)
  })
})
