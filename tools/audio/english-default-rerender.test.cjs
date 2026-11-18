import { describe, it, expect } from 'vitest'
import m from './english-default-rerender.cjs'

describe('english-default-rerender', () => {
  const pairs = m.parseQueue('english_text_key,courses\nhello there,fra_for_eng;ita_for_eng\nbye,spa_for_eng\n')
  it('orders premium courses first', () => {
    expect(m.order(pairs).map(p => p.course)).toEqual(['ita_for_eng', 'spa_for_eng', 'fra_for_eng'])
  })
  it('stops at the cap, records answers, never retries a refusal, ends the day on DAILY_TOTAL_CAP', async () => {
    const calls = [], rec = []
    const post = async b => { calls.push(b); return calls.length === 2 ? { status: 402, body: { code: 'DAILY_TOTAL_CAP' } } : { status: 200, body: { ok: true, source: 'rendered', charsSpent: b.text.length, audioId: 'x' } } }
    const r = await m.run({ pairs, done: new Set(), cap: 1000, dryRun: false, post, record: x => rec.push(x) })
    expect(calls.length).toBe(2)
    expect(calls.every(c => c.role === 'known' && !('voiceId' in c))).toBe(true)
    expect(r.ended).toBe('DAILY_TOTAL_CAP')
    expect(rec.map(x => x.result)).toEqual(['rendered', 'refused'])
  })
  it('skips ledgered pairs and respects the char cap', async () => {
    const calls = []
    const post = async b => { calls.push(b); return { status: 200, body: { ok: true, source: 'library', charsSpent: 0 } } }
    const done = new Set([m.pairKey(pairs[0])])
    const r = await m.run({ pairs, done, cap: 3, dryRun: true, post, record() {} })
    expect(calls.map(c => c.courseCode)).toEqual(['spa_for_eng', 'fra_for_eng'].slice(0, calls.length))
    expect(r.linked).toBe(calls.length)
  })
})
