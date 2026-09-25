/**
 * /regenerate-single must re-roll a known clip IN ITS OWN VOICE on a course with
 * two gendered known voices (eng_for_hin: Kriti f / Rehan m, Kai 2026-09-23).
 * It used to read only voices.known — Kriti — so a check-after re-roll of a
 * Rehan clip silently changed the speaker (job #283). The handler closes over a
 * live Supabase client, so this pins the wiring at source level.
 */
import { describe, it, expect } from 'vitest'
const fs = require('fs')
const path = require('path')

const src = fs.readFileSync(path.join(__dirname, 'phase8-audio-v13.cjs'), 'utf8')
const handler = src.slice(src.indexOf("app.post('/regenerate-single/:courseCode/:audioUuid'"), src.indexOf("app.post('/regenerate-presentation/:courseCode/:legoId'"))

describe('/regenerate-single — gendered known voice', () => {
  it('resolves the known voice from the clip text before falling back to the role entry', () => {
    const resolve = handler.indexOf('knownVoiceEntryForClip(await knownGenderContextFor(courseCode')
    const fallback = handler.indexOf('(genderedKnown && genderedKnown.voice) || voiceConfig.voices?.[role]')
    expect(resolve).toBeGreaterThan(-1)
    expect(fallback).toBeGreaterThan(resolve)
  })
})
