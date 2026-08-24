/**
 * Unit tests for the cost-aware component orientation (2026-08-23).
 *
 * The defect being fixed: the first estate pass oriented each component of the
 * exchange graph on SCRIPT GENDER alone, with no term for the voice the clips
 * already carry. In Croatian that scored the orientation backwards and queued
 * all 184 pod clips for a straight two-voice swap. Tom: "Can't be 184 clips for
 * Croatian."
 *
 * The rule under test: delivered clips kept WINS; script gender is a tiebreak.
 */

import { describe, it, expect } from 'vitest'

// Requiring the recast tool runs no main(): it is guarded by require.main.
const { orientComponent } = require('./pod1-percall-recast.cjs')

const F = 'hr-HR-GabrijelaNeural'
const M = 'hr-HR-SreckoNeural'

/** Two speakers on an exchange edge: Anna colour 0, James colour 1. */
const members = ['Anna', 'James']
const colourOf = (n) => (n === 'Anna' ? 0 : 1)
const scriptGenderOf = (n) => (n === 'Anna' ? 'f' : 'm')

const clip = (name, id, voice) => ({ name, track: 'target', audioId: id, voice, wantF: F, wantM: M })

describe('orientComponent', () => {
  it('keeps the colouring when delivered audio AGREES with script gender', () => {
    const d = orientComponent({
      members, colourOf, scriptGenderOf,
      clips: [clip('Anna', 'a1', F), clip('James', 'j1', M)],
    })
    expect(d.flip).toBe(false)
    expect(d.decidedBy).toBe('delivered-clips')
    expect(d.deliveredClipsKept.chosen).toBe(2)
  })

  it('FLIPS against script gender when the delivered audio says so', () => {
    // Anna is delivered in the male voice and James in the female voice — the
    // Croatian shape. Script gender alone would keep the colouring and re-render
    // both clips; delivered wins and both survive. A character voiced against
    // apparent gender is an accepted cost (Tom's ruling).
    const d = orientComponent({
      members, colourOf, scriptGenderOf,
      clips: [clip('Anna', 'a1', M), clip('James', 'j1', F)],
    })
    expect(d.flip).toBe(true)
    expect(d.decidedBy).toBe('delivered-clips')
    expect(d.deliveredClipsKept).toMatchObject({ asColoured: 0, flipped: 2, chosen: 2 })
  })

  it('follows the majority of delivered clips, not the majority of speakers', () => {
    // One speaker agrees with script gender, but the other carries far more
    // delivered clips pointing the other way.
    const d = orientComponent({
      members, colourOf, scriptGenderOf,
      clips: [
        clip('Anna', 'a1', F),
        clip('James', 'j1', F), clip('James', 'j2', F), clip('James', 'j3', F),
      ],
    })
    expect(d.flip).toBe(true)
    expect(d.deliveredClipsKept).toMatchObject({ asColoured: 1, flipped: 3 })
  })

  it('counts DISTINCT clips, so a clip reused across slots votes once', () => {
    // 'j1' serves three slots. If the objective counted line-links it would
    // score 3 and outvote Anna's two genuinely distinct clips.
    const d = orientComponent({
      members, colourOf, scriptGenderOf,
      clips: [
        clip('Anna', 'a1', F), clip('Anna', 'a2', F),
        clip('James', 'j1', F), clip('James', 'j1', F), clip('James', 'j1', F),
      ],
    })
    expect(d.flip).toBe(false)
    expect(d.deliveredClipsKept).toMatchObject({ asColoured: 2, flipped: 1 })
  })

  it('a clip serving two slots that disagree is NOT kept — one move is one re-render', () => {
    const shared = (name) => ({ name, track: 'target', audioId: 'shared', voice: F, wantF: F, wantM: M })
    const d = orientComponent({
      members, colourOf, scriptGenderOf,
      clips: [shared('Anna'), shared('James')],
    })
    // Either orientation puts one of the two speakers on the male voice, so the
    // shared clip always moves: both orientations keep zero clips.
    expect(d.deliveredClipsKept).toMatchObject({ asColoured: 0, flipped: 0 })
    // Nothing to save either way, so the tiebreak takes over and script gender
    // gets its say — which is exactly what it is for.
    expect(d.decidedBy).toBe('script-gender (delivered tied)')
    expect(d.flip).toBe(false)
  })

  it('falls back to script gender when there is NO delivered audio', () => {
    const d = orientComponent({ members, colourOf, scriptGenderOf, clips: [] })
    expect(d.flip).toBe(false)
    expect(d.decidedBy).toBe('script-gender (no delivered audio)')

    // ...and flips when the colouring puts the script-fixed genders backwards.
    const d2 = orientComponent({
      members, colourOf: (n) => (n === 'Anna' ? 1 : 0), scriptGenderOf, clips: [],
    })
    expect(d2.flip).toBe(true)
    expect(d2.decidedBy).toBe('script-gender (no delivered audio)')
  })

  it('uses script gender as the tiebreak when delivered scores are EQUAL', () => {
    // One clip each, each currently in the voice the other orientation wants:
    // both orientations keep exactly one clip, so script gender decides.
    const d = orientComponent({
      members, colourOf: (n) => (n === 'Anna' ? 1 : 0), scriptGenderOf,
      clips: [clip('Anna', 'a1', F), clip('James', 'j1', F)],
    })
    expect(d.deliveredClipsKept.asColoured).toBe(d.deliveredClipsKept.flipped)
    expect(d.flip).toBe(true)
    expect(d.decidedBy).toBe('script-gender (delivered tied)')
  })

  it('ignores clips belonging to other components', () => {
    const d = orientComponent({
      members, colourOf, scriptGenderOf,
      clips: [clip('Anna', 'a1', F), clip('James', 'j1', M), clip('Stranger', 's1', M)],
    })
    expect(d.clipsInComponent).toBe(2)
    expect(d.deliveredClipsKept.chosen).toBe(2)
  })

  it('never keeps a clip whose track has no assignable pair', () => {
    const d = orientComponent({
      members, colourOf, scriptGenderOf,
      clips: [{ name: 'Anna', track: 'known', audioId: 'k1', voice: F, wantF: null, wantM: null }],
    })
    expect(d.deliveredClipsKept).toMatchObject({ asColoured: 0, flipped: 0 })
  })
})
