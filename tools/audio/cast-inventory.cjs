#!/usr/bin/env node
/**
 * CAST INVENTORY — for every course, per role, the voice phase8 /generate would
 * render a NEW line in, whether the cast gate lets it, and by which leg (Tom
 * 2026-10-10, r-2026-10-10-new-phrase-audio-may-render-only: (a) Tom's Cartesia
 * cast, or (b) a course whose voices in the language are all Azure, in those voices).
 *
 * Read-only: one read of courses, the cast and the voice config resolution
 * phase8 itself uses (voiceConfigService.resolveVoiceConfig, presentation-author),
 * and the gate's own verdict (services/shared/voice-cast-gate.cjs castVerdict),
 * so this answer and the door's cannot disagree. Renders nothing, writes nothing.
 *
 *   node tools/audio/cast-inventory.cjs [--courses a,b,c] [--json]
 */
const path = require('path')
require('dotenv').config({ path: process.env.DOTENV_PATH || path.join(__dirname, '../../.env') })
const { createClient } = require('@supabase/supabase-js')
const voiceConfigService = require('../../services/voice-config-service.cjs')
const presentationAuthor = require('../../services/phases/presentation-author.cjs')
const { castVerdict } = require('../../services/shared/voice-cast-gate.cjs')
const { tryCanonicalVoiceId, tryCanonicalLanguage } = require('../../services/shared/clip-identity.cjs')

const ROLES = ['known', 'target1', 'target2', 'presentation']

function arg(name) { const i = process.argv.indexOf(`--${name}`); return i < 0 ? null : (process.argv[i + 1] || true) }

function roleVoice(voices, role) {
  const v = voices[role]
  if (!v) return null
  const raw = typeof v === 'string' ? v : v.voiceId
  return raw ? tryCanonicalVoiceId(raw, typeof v === 'string' ? undefined : v.provider) : null
}

async function inventory({ only = null } = {}) {
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
  let q = db.from('courses').select('course_code, known_lang, target_lang, voice_config').order('course_code')
  if (only) q = q.in('course_code', only)
  const { data: courses, error } = await q
  if (error) throw new Error(`courses: ${error.message}`)
  const out = []
  for (const course of courses) {
    const courseCode = course.course_code
    const resolved = await voiceConfigService.resolveVoiceConfig({ voiceConfig: course.voice_config, course, courseCode })
    const voices = (resolved && (resolved.voices || resolved)) || {}
    for (const role of ROLES) {
      const language = tryCanonicalLanguage(role === 'known' || role === 'presentation' ? course.known_lang : course.target_lang)
      let voiceId = null
      if (role === 'presentation') { try { voiceId = presentationAuthor.resolvePresentationVoiceId({ ...course, voice_config: resolved }) } catch { voiceId = null } }
      else voiceId = roleVoice(voices, role)
      if (!voiceId) { out.push({ courseCode, role, language, voiceId: null, allowed: false, reason: 'no-voice-configured' }); continue }
      const v = await castVerdict(language, voiceId, { courseCode, role })
      out.push({ courseCode, role, language, voiceId, allowed: v.allowed, reason: v.reason, via: v.via || null })
    }
  }
  return out
}

if (require.main === module) {
  const only = arg('courses') ? String(arg('courses')).split(',') : null
  inventory({ only }).then(rows => {
    if (arg('json')) { console.log(JSON.stringify(rows, null, 1)); return }
    for (const r of rows) console.log([r.courseCode, r.role, r.language, r.allowed ? 'RENDERS' : 'SKIPPED', r.reason || r.via || '', r.voiceId || ''].join('\t'))
  }).catch(e => { console.error(`cast-inventory: ${e.message}`); process.exit(1) })
}

module.exports = { inventory }
