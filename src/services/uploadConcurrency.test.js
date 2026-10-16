import { describe, it, expect } from 'vitest'
import { createUploadConcurrency, parseAdvertised, isTransientStatus, inFlightKeys, STEP_UP_AFTER, HARD_MAX } from './uploadConcurrency.js'

describe('the booth upload pace', () => {
  it('starts at one and stays there until the server has advertised more', () => {
    const p = createUploadConcurrency()
    for (let i = 0; i < 10; i++) p.success(100)
    expect(p.limit).toBe(1)
    p.advertise('2')
    expect(p.limit).toBe(1)                      // advertising alone never raises it
    for (let i = 0; i < STEP_UP_AFTER - 1; i++) p.success(100)
    expect(p.limit).toBe(1)
    p.success(100)
    expect(p.limit).toBe(2)
  })

  it('never passes the hard ceiling, whatever the server says', () => {
    const p = createUploadConcurrency()
    p.advertise('50')
    for (let i = 0; i < 30; i++) p.success(1)
    expect(p.limit).toBe(HARD_MAX)
    expect(parseAdvertised('0')).toBe(1)
    expect(parseAdvertised('x')).toBe(null)
    expect(parseAdvertised(null)).toBe(null)
  })

  it('trouble drops to one and the climb starts again from zero', () => {
    const p = createUploadConcurrency()
    p.advertise('2')
    for (let i = 0; i < STEP_UP_AFTER; i++) p.success(1)
    expect(p.limit).toBe(2)
    p.trouble()
    expect(p.limit).toBe(1)
    expect(p.cleanStreak).toBe(0)
  })

  it('the server lowering its ceiling lowers the limit at once', () => {
    const p = createUploadConcurrency()
    p.advertise('2')
    for (let i = 0; i < STEP_UP_AFTER; i++) p.success(1)
    p.advertise('1')
    expect(p.limit).toBe(1)
  })

  it('408 and 429 are the server\'s trouble; 4xx otherwise is a verdict on the take', () => {
    for (const s of [408, 429, 500, 502, 503, 504, undefined]) expect(isTransientStatus(s)).toBe(true)
    for (const s of [400, 403, 404, 409, 422, 423]) expect(isTransientStatus(s)).toBe(false)
  })

  it('a take holds its line and its words', () => {
    expect(inFlightKeys({ lineId: 'L1', text: 'Bore da!' })).toEqual(['line:L1', 'text:bore da'])
    expect(inFlightKeys({ lineId: 'L1', text: '' })).toEqual(['line:L1'])
  })
})
