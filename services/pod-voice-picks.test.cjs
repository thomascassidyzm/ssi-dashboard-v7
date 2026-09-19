/**
 * THE PROVING TEST for the pod-voice PICK gate.
 * Run: npx vitest run services/pod-voice-picks
 *
 * Tom's ruling, 2026-09-19: he chooses every listening-pod voice himself and
 * pod TTS is held until he has. This file holds the two halves of that as a
 * decision the generate path makes, so the rule cannot rot silently:
 *
 *   a language with NO pick is REFUSED;
 *   a language WITH a pick is ALLOWED;
 *
 * plus the third case that stops the Voice Lab lane being a screen that lies —
 * a pick that exists while the pod is cast on a different voice is refused too,
 * because rendering there would put a voice he rejected in front of a learner.
 *
 * No DB, no TTS, no spend: evaluatePicks and requiredPicks are pure, and they
 * are exactly what phase8's POST /generate-pods/:courseCode calls.
 */

import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'

const picks = createRequire(import.meta.url)('./pod-voice-picks.cjs')

/** One pod cast the way tools/pod-sync.cjs writes listening_pods.speakers. */
const ITALIAN_POD = {
  id: 'ita_for_eng:pod-1',
  speakers: {
    Anna: {
      gender: 'f',
      target: { provider: 'xai', voice_id: 'eve', name: 'Eve', locale: 'it' },
      known: { provider: 'xai', voice_id: 'ara', name: 'Ara', locale: 'en' },
    },
    James: {
      gender: 'm',
      target: { provider: 'xai', voice_id: 'x7avnu1k', name: 'Enzo', locale: 'it' },
      known: { provider: 'xai', voice_id: 'rex', name: 'Rex', locale: 'en' },
    },
  },
}

const required = (roles = ['target']) => picks.requiredPicks([ITALIAN_POD], {
  targetLanguage: 'ita', knownLanguage: 'eng', roles,
})

describe('the pod-voice pick gate', () => {
  it('REFUSES a language with no pick on record', () => {
    const verdict = picks.evaluatePicks({}, required())
    expect(verdict.ok).toBe(false)
    expect(verdict.reason).toBe('no_pick')
    // Both genders the cast actually speaks are named, so the refusal is a
    // worklist rather than a shrug.
    expect(verdict.missing.map((m) => m.gender).sort()).toEqual(['f', 'm'])
    expect(verdict.message).toMatch(/ita/)
    expect(verdict.message).toMatch(/sample_limit/)
  })

  it('ALLOWS a language whose pod voices have been picked', () => {
    const stored = {
      ita: {
        f: { provider: 'xai', voice_id: 'eve', name: 'Eve', picked_by: 'tom', picked_at: '2026-09-19T10:00:00Z' },
        m: { provider: 'xai', voice_id: 'x7avnu1k', name: 'Enzo', picked_by: 'tom', picked_at: '2026-09-19T10:00:00Z' },
      },
    }
    const verdict = picks.evaluatePicks(stored, required())
    expect(verdict.ok).toBe(true)
    expect(verdict.reason).toBe('picked')
  })

  it('REFUSES when a pick exists but the pod is cast on a different voice', () => {
    const stored = {
      ita: {
        f: { provider: 'cartesia', voice_id: 'giulia', name: 'Giulia', picked_by: 'tom', picked_at: '2026-09-19T10:00:00Z' },
        m: { provider: 'xai', voice_id: 'x7avnu1k', name: 'Enzo', picked_by: 'tom', picked_at: '2026-09-19T10:00:00Z' },
      },
    }
    const verdict = picks.evaluatePicks(stored, required())
    expect(verdict.ok).toBe(false)
    expect(verdict.reason).toBe('pick_drift')
    expect(verdict.drifted).toHaveLength(1)
    expect(verdict.drifted[0].gender).toBe('f')
    expect(verdict.message).toMatch(/giulia/)
  })

  it('asks only for the genders the cast actually speaks', () => {
    const maleOnly = { id: 'x:pod-1', speakers: { Bob: ITALIAN_POD.speakers.James } }
    const need = picks.requiredPicks([maleOnly], { targetLanguage: 'ita', knownLanguage: 'eng', roles: ['target'] })
    expect(need.map((n) => n.gender)).toEqual(['m'])
  })

  it('never asks for a pick on a human-voiced language', () => {
    // Welsh, Breton and PDC are permanently excluded from every TTS render
    // queue (Tom, 2026-08-13). Their pods are a recording worklist, so a pick
    // is the wrong question and the gate must not invent one.
    const need = picks.requiredPicks([ITALIAN_POD], { targetLanguage: 'cym', knownLanguage: 'eng', roles: ['target'] })
    expect(need).toEqual([])
    expect(picks.evaluatePicks({}, need).ok).toBe(true)
  })

  it('carries the KNOWN track too — a pod speaks two languages', () => {
    const need = required(['target', 'known'])
    expect(need.filter((n) => n.track === 'known').map((n) => n.language)).toEqual(['eng', 'eng'])
    const stored = {
      ita: { f: { provider: 'xai', voice_id: 'eve' }, m: { provider: 'xai', voice_id: 'x7avnu1k' } },
      eng: { f: { provider: 'xai', voice_id: 'ara' }, m: { provider: 'xai', voice_id: 'rex' } },
    }
    expect(picks.evaluatePicks(stored, need).ok).toBe(true)
    expect(picks.evaluatePicks({ ita: stored.ita }, need).reason).toBe('no_pick')
  })

  it('hands a pick to the caster as a manual override, not as a second mechanism', () => {
    const stored = { ita: { f: { provider: 'cartesia', voice_id: 'giulia', name: 'Giulia', locale: 'it' } } }
    expect(picks.overridesFor(stored, { target: 'ita', known: 'eng' })).toEqual({
      target: { f: { provider: 'cartesia', voice_id: 'giulia', name: 'Giulia', locale: 'it' } },
      known: {},
    })
  })
})
