import { describe, it, expect } from 'vitest'
import { PHRASE_PACKS, tutorialPhrases } from './tutorialScript'
import { legoChunkCount, resolvePhraseChunks } from './phraseChunks'

// The tutorial teaches through the studio's OWN slow-read machinery, and all of
// that machinery is driven off the chunk map. If a pack's slow reads stopped
// resolving to three LEGO chunks, the lesson would silently degrade into an
// ordinary reading session: no gap markers, no live pips, no refusal panel, no
// pieces on the review card, nothing to recombine — and nothing would throw.
describe('tutorial practice script', () => {
  for (const pack of PHRASE_PACKS) {
    describe(pack.id, () => {
      const rows = tutorialPhrases(pack.id)

      it('is two natural reads then two slow ones', () => {
        expect(rows.map(r => r.cadence)).toEqual(['natural', 'natural', 'slow', 'slow'])
      })

      it('gives every slow read exactly three LEGO chunks', () => {
        for (const row of rows.filter(r => r.cadence === 'slow')) {
          expect(legoChunkCount(row)).toBe(3)
          expect(resolvePhraseChunks(row).source).toBe('recordingChunks')
        }
      })

      it('carries no course identity a take could ever be filed against', () => {
        for (const row of rows) {
          expect(row.seedNumber).toBeNull()
          expect(row.legoId).toBe('')
          expect(row.coversLegos).toEqual([])
          expect(row.role).toBe('tutorial')
        }
      })

      // The recombination plan swaps pieces BETWEEN the two slow reads by slot.
      // A plan pointing at a read or a slot that does not exist would only show
      // up as a dead button in front of a recordist.
      it('has a recombination plan that only names pieces that exist', () => {
        expect(pack.recombine.length).toBeGreaterThan(0)
        for (const r of pack.recombine) {
          expect(r.pieces).toHaveLength(3)
          for (const [readIndex, chunkIndex] of r.pieces) {
            expect(pack.slow[readIndex]).toBeDefined()
            expect(pack.slow[readIndex].chunks[chunkIndex]).toBeDefined()
          }
        }
      })
    })
  }
})
