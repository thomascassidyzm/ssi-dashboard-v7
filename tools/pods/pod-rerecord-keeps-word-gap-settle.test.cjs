// Regression guard: merge 3f31763a1 (job #229) silently dropped job #216's word-gap settling
// from pod-rerecord's cut() (rmsFrames + settleWordGapCut + pieceWindows' no-pad arg).
import { test, expect } from 'vitest'
import fs from 'fs'
const src = fs.readFileSync(new URL('./pod-rerecord.cjs', import.meta.url), 'utf8')

test('pod-rerecord cut() still settles word-gap cuts on the quietest 10 ms frame', () => {
  expect(src).toMatch(/settleWordGapCut\(/)
  expect(src).toMatch(/rmsFrames/)
})
