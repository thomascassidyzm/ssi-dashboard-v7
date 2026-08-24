/**
 * Unit tests for the take-G entry repair (2026-08-24).
 *
 * The row: eus_for_eng pod-1 scene 4 sentence 2. Its `takeg_audio_ids` was
 * reported as holding its two glued takes back to front. It does not — entry 1
 * IS the first group. What entry 2 holds is a 2026-07-07 render that leaked the
 * tail of group 1 into the front of group 2, and the cursor walk in
 * `checkPodClips` reports that as "out of order" because the overlap sends the
 * cursor backwards.
 *
 * The distinction is the whole point of this file, so it is pinned twice:
 * SWAPPING THE TWO ENTRIES LEAVES THE GATE RED, and nulling the offending entry
 * IN PLACE — same array length, same group alignment — turns it green.
 *
 * Pure unit tests. Nothing here opens a database.
 */

import { describe, it, expect } from 'vitest'

const { planTakegEntries } = require('./repair-incoherent-takeg-entries.cjs')
const { checkPodClips } = require('./pod-cast-gate.cjs')

const VOICE = 'eu-ES-AinhoaNeural'
const SPEAKERS = {
  Sarah: { target: { voice_id: VOICE }, known: { voice_id: 'bedd6226' } },
  Anna: { target: { voice_id: 'eu-ES-AnderNeural' }, known: { voice_id: 'gfzdpspr5fdp' } },
}

const ROW_TEXT = 'Kaixo! Barkatu, baina orain ezin dut hitz egin. Orain etxera joan behar dut. Bihar hitz egin dezakegu?'

const ROW = {
  id: 'eus_for_eng:pod-1:SC04-S002',
  scene_number: 4,
  sentence_number: 2,
  speaker: 'Sarah',
  target_text: ROW_TEXT,
  known_text: 'Hello! I\'m sorry but I can\'t talk at the moment. I need to go home now. Can we talk tomorrow?',
  target_audio_id: 'whole-t',
  known_audio_id: 'whole-k',
  takeg_audio_ids: ['g1', 'g2', null],
}

const CLIPS = {
  'whole-t': { text: ROW_TEXT, voice_id: VOICE },
  'whole-k': { text: ROW.known_text, voice_id: 'bedd6226' },
  g1: { text: 'Kaixo! Barkatu, baina orain ezin dut hitz egin.', voice_id: VOICE },
  g2: { text: 'orain ezin dut hitz egin. Orain, etxera joan behar dut.', voice_id: VOICE },
}

const takegIssues = (row, clips = CLIPS) =>
  checkPodClips({ rows: [row], speakers: SPEAKERS, clips }).clipIssues.filter(i => i.slot === 'takeg_audio_ids')

describe('the eus s4/2 row', () => {
  it('is flagged by the gate as it stands', () => {
    const issues = takegIssues(ROW)
    expect(issues).toHaveLength(1)
    expect(issues[0].audio_id).toBe('g2')
  })

  it('IS NOT back to front — swapping the two entries leaves the gate red', () => {
    const swapped = { ...ROW, takeg_audio_ids: ['g2', 'g1', null] }
    expect(takegIssues(swapped).length).toBeGreaterThan(0)
  })

  it('goes green when the offending entry is nulled in place', () => {
    const { plan } = planTakegEntries({ rows: [ROW], clips: CLIPS, speakers: SPEAKERS })
    expect(plan).toHaveLength(1)
    expect(plan[0].after).toEqual(['g1', null, null])
    expect(takegIssues({ ...ROW, takeg_audio_ids: plan[0].after })).toHaveLength(0)
  })

  it('keeps the array length, so later groups stay aligned to their own take', () => {
    const { plan } = planTakegEntries({ rows: [ROW], clips: CLIPS, speakers: SPEAKERS })
    expect(plan[0].after).toHaveLength(ROW.takeg_audio_ids.length)
    expect(plan[0].before).toEqual(['g1', 'g2', null])
  })

  it('names the cleared entry and its text in the plan, so the log can restore it', () => {
    const { plan } = planTakegEntries({ rows: [ROW], clips: CLIPS, speakers: SPEAKERS })
    expect(plan[0].entries).toEqual([
      { index: 1, audio_id: 'g2', text: CLIPS.g2.text, cleared: true },
    ])
  })
})

describe('planTakegEntries', () => {
  it('leaves a correctly tiled row alone', () => {
    const good = {
      ...ROW,
      id: 'x:SC01-S004',
      takeg_audio_ids: ['h1', 'h2', null],
    }
    const clips = {
      ...CLIPS,
      h1: { text: 'Kaixo! Barkatu, baina orain ezin dut hitz egin.', voice_id: VOICE },
      h2: { text: 'Orain, etxera joan behar dut.', voice_id: VOICE },
    }
    expect(planTakegEntries({ rows: [good], clips, speakers: SPEAKERS }).plan).toHaveLength(0)
  })

  it('clears an entry whose clip is another row\'s conversation entirely', () => {
    const clips = { ...CLIPS, g2: { text: 'Ardo kopa bat, nahi dut.', voice_id: VOICE } }
    const { plan } = planTakegEntries({ rows: [ROW], clips, speakers: SPEAKERS })
    expect(plan[0].after).toEqual(['g1', null, null])
  })

  it('skips a row whose own whole-turn clip is wrong — nulling would fall back to that', () => {
    const clips = { ...CLIPS, 'whole-t': { text: 'Beste zerbait guztiz.', voice_id: VOICE } }
    const { plan, badRows } = planTakegEntries({ rows: [ROW], clips, speakers: SPEAKERS })
    expect(plan).toHaveLength(0)
    expect(badRows).toEqual([ROW.id])
  })

  it('skips a row whose whole-turn clip is voiced by the wrong character', () => {
    const clips = { ...CLIPS, 'whole-t': { text: ROW_TEXT, voice_id: 'eu-ES-AnderNeural' } }
    expect(planTakegEntries({ rows: [ROW], clips, speakers: SPEAKERS }).plan).toHaveLength(0)
  })

  it('ignores rows with an empty or absent takeg array', () => {
    const rows = [
      { ...ROW, id: 'a', takeg_audio_ids: null },
      { ...ROW, id: 'b', takeg_audio_ids: [null, null] },
    ]
    expect(planTakegEntries({ rows, clips: CLIPS, speakers: SPEAKERS }).plan).toHaveLength(0)
  })
})
