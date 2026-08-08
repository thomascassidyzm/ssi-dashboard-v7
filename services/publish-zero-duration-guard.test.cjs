/**
 * Publish guard: zero-duration block in POST /api/production/:courseCode/publish-manifest.
 *
 * The guard lives inside a large express route, so rather than duplicating its logic
 * (which would test a copy, not the guard) this extracts the actual block from
 * production-api.cjs on disk and evaluates it against crafted manifests. If someone
 * edits or deletes the guard, this test sees the edit.
 *
 * Regression: the loop only walks manifest.slices[0].samples, but the welcome sits at
 * top-level `introduction` — so a zero-duration welcome shipped unchallenged.
 */
import { describe, it, expect } from 'vitest'

const fs = require('fs')
const path = require('path')

const API_SRC = path.join(__dirname, 'production-api.cjs')

/** Pull the guard block out of the real source and return it as a callable. */
function loadGuard() {
  const src = fs.readFileSync(API_SRC, 'utf8')
  const start = src.indexOf('const zeroDurationSamples = []')
  expect(start, 'guard block not found in production-api.cjs').toBeGreaterThan(-1)
  const end = src.indexOf('if (zeroDurationSamples.length > 0) {', start)
  expect(end, 'guard terminator not found').toBeGreaterThan(start)
  const block = src.slice(start, end)
  // The block reads only `manifest` and writes only `zeroDurationSamples`.
  return new Function('manifest', `${block}\nreturn zeroDurationSamples`)
}

// Mirrors PLACEHOLDER_INTRO in services/phases/generate-legacy-manifest.cjs,
// asserted against the real constant below.
const PLACEHOLDER_INTRO = { id: '00000000-0000-0000-0000-000000000001', cadence: 'natural', role: 'presentation', duration: 45.0 }

const goodSamples = { 'bore da': [{ id: 'aaaaaaaa-0000-0000-0000-000000000001', duration: 1.23 }] }

describe('publish zero-duration guard', () => {
  const guard = loadGuard()

  it('FIRES on a zero-duration welcome (the bug being fixed)', () => {
    const flagged = guard({ introduction: { id: 'ffffffff-0000-0000-0000-00000000000a', duration: 0 }, slices: [{ samples: goodSamples }] })
    expect(flagged).toHaveLength(1)
    expect(flagged[0]).toEqual({ id: 'ffffffff-0000-0000-0000-00000000000a', text: 'introduction (welcome)' })
  })

  it('FIRES when the welcome has no duration field at all', () => {
    const flagged = guard({ introduction: { id: 'ffffffff-0000-0000-0000-00000000000b' }, slices: [{ samples: goodSamples }] })
    expect(flagged.map(f => f.text)).toEqual(['introduction (welcome)'])
  })

  it('PASSES a normal course with a real welcome duration', () => {
    const flagged = guard({ introduction: { id: 'ffffffff-0000-0000-0000-00000000000c', duration: 38.4 }, slices: [{ samples: goodSamples }] })
    expect(flagged).toEqual([])
  })

  it('PASSES a course with no welcome — PLACEHOLDER_INTRO (duration 45.0), no false positive', () => {
    const flagged = guard({ introduction: PLACEHOLDER_INTRO, slices: [{ samples: goodSamples }] })
    expect(flagged).toEqual([])
  })

  it('PLACEHOLDER_INTRO in the manifest generator really carries duration 45.0', () => {
    const genSrc = fs.readFileSync(path.join(__dirname, 'phases', 'generate-legacy-manifest.cjs'), 'utf8')
    const block = genSrc.slice(genSrc.indexOf('const PLACEHOLDER_INTRO = {'))
    const real = new Function(`${block.slice(0, block.indexOf('}') + 1)}\nreturn PLACEHOLDER_INTRO`)()
    expect(real).toEqual(PLACEHOLDER_INTRO)
    expect(guard({ introduction: real, slices: [{ samples: goodSamples }] })).toEqual([])
  })

  it('still catches zero-duration slice samples (pre-existing behaviour intact)', () => {
    const flagged = guard({
      introduction: { id: 'ffffffff-0000-0000-0000-00000000000d', duration: 12 },
      slices: [{ samples: { 'nos da': [{ id: 'aaaaaaaa-0000-0000-0000-000000000002', duration: 0 }] } }]
    })
    expect(flagged.map(f => f.id)).toEqual(['aaaaaaaa-0000-0000-0000-000000000002'])
  })

  it('does not throw on a manifest with no introduction key', () => {
    expect(guard({ slices: [{ samples: goodSamples }] })).toEqual([])
  })
})
