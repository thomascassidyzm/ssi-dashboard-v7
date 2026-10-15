import { describe, it, expect } from 'vitest'
import { showsTeamSection, teamCards, projectRows, focusProject } from './team-stats.js'

const p = (key, recorded, total, lastActive = null, other = false, takes7d = 0) =>
  ({ key, label: key, recorded, total, other, activity: { lastActive, takes7d, takes: takes7d, takesToday: 0 } })

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

  it('a card lists EVERY project of the reader, untouched ones as 0 of N (Aran, job #393)', () => {
    // Dan as the server sends him on 2026-10-14: Pod 1 started, the rest cast but untouched.
    const dan = {
      voiceId: 'human_dan_cym_s', name: 'Dan',
      projects: [
        p('pod.pod-1', 62, 81, '2026-10-10T10:00:00Z', false, 4),
        p('seed.cym_s_for_eng', 0, 328),
        p('seed.cym_sv2_for_eng', 0, 640),
        p('lego.cym_sv2_for_eng', 0, 1291),
        p('phrase.cym_sv2_for_eng.1', 0, 3000),
        p('phrase.cym_sv2_for_eng.2', 0, 2000),
        p('other.cym_s_for_eng', null, null, '2026-10-01T10:00:00Z', true, 0),
      ],
    }
    const [card] = teamCards([dan], 'human_aran_cym_n', Date.parse('2026-10-14T12:00:00Z'))
    expect(card.rows.map((r) => r.key)).toEqual(dan.projects.map((x) => x.key))
    expect(card.rows[0]).toMatchObject({ recorded: 62, total: 81, takes7d: 4, when: '4d ago', done: false })
    expect(card.rows[3]).toMatchObject({ recorded: 0, total: 1291, takes7d: 0, when: 'not started' })
    expect(card.rows[6]).toMatchObject({ other: true, total: null, takes: 0 })
  })

  it('earlier lines go last, whatever order the server sent', () => {
    const rows = projectRows([p('other.x', null, null, '2026-10-13', true), p('pod.pod-1', 5, 5)])
    expect(rows.map((r) => r.key)).toEqual(['pod.pod-1', 'other.x'])
    expect(rows[0].done).toBe(true)
  })

  it('a trial script or a one-line project never heads a card while real work exists (Aran, 2026-10-14)', () => {
    const t = (key, label, recorded, total, lastActive = null) => ({ ...p(key, recorded, total, lastActive), label })
    // Catrin: the trial script was touched two minutes after the real one.
    expect(focusProject([t('trial', 'North Welsh: Health scripts (test)', 9, 9, '2026-10-06T16:05:00Z'),
      t('health', 'North Welsh: Health scripts', 217, 217, '2026-10-06T16:03:00Z'),
      t('pod', 'North Welsh: Pod 1', 89, 89, '2026-09-11T13:23:00Z')]).key).toBe('health')
    // Eleri: nothing started — Pod 1, not the one guess-game line queued before it.
    expect(focusProject([t('guess', 'South Welsh: guess-game line', 0, 1), t('pod', 'South Welsh: Pod 1', 0, 151),
      t('seed', 'South Welsh: old sentences', 0, 206)]).key).toBe('pod')
    // Kai: the one line is all there is, so it still heads his card.
    expect(focusProject([t('guess', 'North Welsh: guess-game line', 0, 1)]).key).toBe('guess')
    // On the card's full list (job #393) the guess-game line is still a row, after the real work.
    expect(projectRows([t('guess', 'South Welsh: guess-game line', 0, 1), t('pod', 'South Welsh: Pod 1', 0, 151),
      t('seed', 'South Welsh: old sentences', 0, 206)]).map((r) => r.key)).toEqual(['pod', 'seed', 'guess'])
  })
})

import { loadTeamSnapshot, saveTeamSnapshot, clearTeamSnapshot, TEAM_SNAPSHOT_MAX_AGE_MS } from './team-stats.js'
import { describe as d2, it as i2, expect as e2 } from 'vitest'
const memStore = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) } }
d2('team card snapshot on the device (job #416)', () => {
  i2('draws back what was saved, until it is a week old or cleared', () => {
    const s = memStore()
    e2(loadTeamSnapshot(s)).toBeNull()
    saveTeamSnapshot([{ voiceId: 'v', name: 'Dan' }], s, 1000)
    e2(loadTeamSnapshot(s, 2000)).toEqual([{ voiceId: 'v', name: 'Dan' }])
    e2(loadTeamSnapshot(s, 1000 + TEAM_SNAPSHOT_MAX_AGE_MS + 1)).toBeNull()
    clearTeamSnapshot(s)
    e2(loadTeamSnapshot(s, 2000)).toBeNull()
  })
})
