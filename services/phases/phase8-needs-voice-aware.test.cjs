/**
 * A NULL slot whose only existing clip is in a retired voice must be classified
 * "need TTS", never "linkable" (job #181·I, 2026-09-25). Before this, the needs
 * pass asked a voice-blind question for target1/target2 while the relink RPC
 * enforced the voice-match rule, so such a slot was offered, refused and never
 * rendered — eng_for_hin carried 2,152 of them across every /generate run.
 *
 * Drives the SHIPPED getAudioNeeds() against the in-memory PostgREST double
 * (services/phases/__fixtures__/phase8-sandbox.cjs). No DB, no S3, no TTS.
 */
import { describe, it, expect } from 'vitest'
const { loadPhase8, fixtureTables, COURSE, BAD_S3_KEY } = require('./__fixtures__/phase8-sandbox.cjs')

const CHARLOTTE = 'cartesia_71a7ad14-091c-4e8e-a314-022ece01c121'
function courseWithTarget1(voiceId) {
  return { ...COURSE, voice_config: { voices: { target1: { voiceId, provider: 'cartesia', name: 'x' } } } }
}
function run({ clipVoice, wantVoice }) {
  const tables = fixtureTables({ linked: false, audioRowPresent: true })
  tables.course_audio[0].voice_id = clipVoice
  const course = courseWithTarget1(wantVoice)
  tables.courses = [course]
  const { phase8 } = loadPhase8({ tables, s3Objects: new Set([BAD_S3_KEY]) })
  return phase8.getAudioNeeds(COURSE.course_code, 999, course, false, null)
}

describe('getAudioNeeds is voice-aware for every configured role, like the relink gate', () => {
  it('a NULL target1 slot whose only clip is in a retired voice needs TTS (was: linkable, then refused, never rendered)', async () => {
    const r = await run({ clipVoice: 'azure_zz-ZZ-TestNeural', wantVoice: CHARLOTTE })
    expect(r.toGenerate.map(i => `${i.text}|${i.role}`)).toContain('kotva|target1')
    expect(r.toLink).toBe(0)
  })
  it('the same slot with a clip already in the configured voice is linkable, not re-rendered', async () => {
    const r = await run({ clipVoice: CHARLOTTE, wantVoice: CHARLOTTE })
    expect(r.toGenerate.map(i => `${i.text}|${i.role}`)).not.toContain('kotva|target1')
    expect(r.toLink).toBe(1)
  })
})
