import { describe, it, expect } from 'vitest'
import { planPicks, commitPicks } from './stagedPicks'

describe('staged pod-voice picks', () => {
  it('clears before it picks, each in the panel reading order', () => {
    const plan = planPicks({
      m: { action: 'pick', voice: { voice_id: 'a' }, label: 'male' },
      f: { action: 'clear', label: 'female' },
    })
    expect(plan.map((s) => `${s.action}:${s.gender}`)).toEqual(['clear:f', 'pick:m'])
  })

  it('reports a refused slot by name and still runs the rest', async () => {
    const calls = []
    const { landed, failed } = await commitPicks(
      planPicks({
        f: { action: 'pick', voice: { voice_id: 'giulia' }, label: 'female' },
        m: { action: 'pick', voice: { voice_id: 'enzo' }, label: 'male' },
      }),
      {
        savePick: async ({ gender, voice }) => {
          calls.push(gender)
          if (gender === 'f') throw new Error('ita f has been picked elsewhere since this screen loaded')
          return { ok: true, voice }
        },
        clearPick: async () => { throw new Error('not expected') },
      },
    )
    expect(calls).toEqual(['f', 'm'])
    expect(landed.map((l) => l.gender)).toEqual(['m'])
    expect(failed).toHaveLength(1)
    expect(failed[0].error).toMatch(/picked elsewhere/)
  })
})
