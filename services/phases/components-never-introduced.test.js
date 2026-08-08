// COMPONENTS ARE NEVER INTRODUCED — Tom's ruling, 2026-08-06:
//
//   "All the components are now being introduced in the new M-LEGO
//    introductions. Components do NOT get introduced."
//
// Only LEGOs get introductions. phase8 used to author an "as in" presentation
// text for every component row, TTS it, and bind it to
// course_practice_phrases.presentation_audio_id — a per-component
// introduction, which the ruling forbids. Every one of those paths is now a
// refusal or a hard zero.
//
// These are source-level assertions: phase8-audio-v13.cjs starts an Express
// server and opens a Supabase client on require, so it cannot be imported into
// a unit test. Reading the source is what the existing audio-link-reconcile
// tests do for the same reason, and it pins the property that matters — no
// query in this service asks for component rows in order to narrate them.
//
// Run: npx vitest run services/phases/components-never-introduced.test.js
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const here = path.dirname(fileURLToPath(import.meta.url))
const phase8 = fs.readFileSync(path.join(here, 'phase8-audio-v13.cjs'), 'utf8')

describe('phase8 cannot author a component introduction', () => {
  it('carries the ruling as a named constant, so refusals cite it', () => {
    expect(phase8).toContain('const COMPONENTS_NEVER_INTRODUCED')
    expect(phase8).toContain('Components are never introduced (Tom, 2026-08-06)')
    expect(phase8).toContain('function refuseComponentPresentation')
  })

  it('refuses a presentation item that reaches TTS with a phrase_id', () => {
    // Presentation audio belongs to a LEGO or to a component row and nothing
    // else, so `role === presentation` + phrase_id + no lego_id IS a component
    // introduction. This is the money-path guard: it fires before spend.
    expect(phase8).toMatch(
      /n\.role === 'presentation' && n\.phrase_id && !n\.lego_id/
    )
    expect(phase8).toMatch(/refuseComponentPresentation\('generate'\)/)
  })

  it('never binds a presentation clip to a component row', () => {
    // linkComponentPresentationAudio is a stub. If it grows a body that
    // updates presentation_audio_id again, this fails.
    const fn = phase8.slice(phase8.indexOf('async function linkComponentPresentationAudio'))
    const body = fn.slice(0, fn.indexOf('\n}\n') + 3)
    expect(body).toContain('return { linked: 0 }')
    expect(body).not.toContain('presentation_audio_id')
  })

  it('holds no release on a component lacking a presentation clip', () => {
    // The old gate counted introduce:true components with a null
    // presentation_audio_id as "missing", making the violation a prerequisite.
    expect(phase8).toContain('const missingComponentPresentations = 0')
  })

  it('queues no component intro slots for authoring', () => {
    expect(phase8).toContain('const componentIntroSlots = 0')
  })

  it('does not treat `introduce` as a licence to introduce', () => {
    // The flag distinguishes visual-only stubs from the rest; it was never the
    // gate for introducing. No surviving query may select component rows by
    // introduce=true in order to narrate them.
    expect(phase8).not.toMatch(/\.eq\('phrase_role', 'component'\)[\s\S]{0,200}?\.eq\('introduce', true\)/)
  })
})
