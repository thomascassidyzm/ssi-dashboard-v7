/**
 * GET /cast must never collapse a cast on load (Tom, 2026-09-12: asked to
 * retire the one-man-one-woman casting rule so a cast is any number of named
 * voices — "Yes. Retire").
 *
 * From 2026-07-17 to 2026-09-12 the pods router collapsed any cast holding
 * more distinct voices than voice_config.podCastVoices (absent = 2) to one
 * voice per gender and WROTE the result back to courses.voice_config. This
 * test pins the retirement at the source level: the router no longer imports
 * the collapse solver, and the collapse wiring is gone from the read path.
 * A source assertion rather than an HTTP mount because the router's DB is an
 * injected Supabase client with a fluent chain; the property under test is
 * "the call site does not exist", which the source states exactly.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const src = readFileSync(join(__dirname, '..', 'pods-router.cjs'), 'utf8')

describe('pods-router: no load-time cast collapse', () => {
  it('does not call collapseTwoVoiceCast anywhere', () => {
    expect(src).not.toMatch(/collapseTwoVoiceCast\s*\(/)
  })
  it('never writes voice_config on GET /cast because of a voice count', () => {
    // The retired block updated courses.voice_config from inside the GET
    // handler; the only voice_config write left is PUT /cast's merge.
    const getCast = src.slice(src.indexOf("router.get('/cast'"), src.indexOf('async function handlePropose'))
    expect(getCast.length).toBeGreaterThan(0)
    expect(getCast).not.toMatch(/\.update\(\s*\{\s*voice_config/)
  })
  it('records podCastVoices as the distinct-voice count, never a default of 2', () => {
    expect(src).toMatch(/merged\.podCastVoices\s*=\s*\n?\s*new Set\(/)
    expect(src).not.toMatch(/\.size\s*\|\|\s*\n?\s*DEFAULT_POD_VOICES/)
  })
})
