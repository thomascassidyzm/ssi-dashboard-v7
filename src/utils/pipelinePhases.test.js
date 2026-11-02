import { describe, it, expect } from 'vitest'
import { nextIncompletePhase } from './pipelinePhases.js'

describe('nextIncompletePhase', () => {
  it('picks the lowest-numbered pending or partial phase', () => {
    const phases = [
      { number: 3, status: 'pending' },
      { number: 1, status: 'complete' },
      { number: 2, status: 'partial' },
    ]
    expect(nextIncompletePhase(phases)).toBe(phases[2])
  })

  it('ignores running, failed and complete phases', () => {
    expect(nextIncompletePhase([
      { number: 1, status: 'running' },
      { number: 2, status: 'failed' },
      { number: 3, status: 'complete' },
    ])).toBeUndefined()
  })

  it('tolerates empty and missing input and never reorders the caller’s array', () => {
    expect(nextIncompletePhase([])).toBeUndefined()
    expect(nextIncompletePhase(undefined)).toBeUndefined()
    const phases = [{ number: 2, status: 'pending' }, { number: 1, status: 'pending' }]
    nextIncompletePhase(phases)
    expect(phases.map(p => p.number)).toEqual([2, 1])
  })
})
