import { expect, it } from 'vitest'
import { creditLoadedBatch } from './booth-home.js'

it('does not credit a refused take after another line is recorded', () => {
  const scope = { track: 'seed.cym_nv2_for_eng', batch: 1 }
  const lines = [{ id: 'A', recorded: true }, { id: 'B', recorded: false }]
  const update = credit => creditLoadedBatch(credit, {
    scope, served: scope, lines, isRecorded: l => l.recorded,
  })
  let credit = update({}) // A queued optimistically by commit().
  lines[0].recorded = false // Server refuses A; isRecorded(A) becomes false.
  credit = update(credit)
  lines[1].recorded = true // B is read; A still needs a take.
  credit = update(credit)
  expect(credit[`${scope.track}#1`]).toEqual(['B'])
})
