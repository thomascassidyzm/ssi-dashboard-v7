#!/usr/bin/env node
/**
 * pod-cast-sample-render.cjs — render a CASTING SAMPLE for an ear, and nothing else.
 *
 * The pod sample-first gate (services/pod-voice-approvals.cjs) answers "is this
 * cast approved?" by generating pod clips and LINKING them. That is the right
 * tool when you are sampling the cast that is live. It is the wrong tool when
 * the question is "should the cast be something else?" — a side-by-side of two
 * candidate casts must not touch a single row of the course.
 *
 * So this tool writes NOTHING to the database. Per line, per candidate cast:
 * synthesise → master → PUT to S3 under `mastered/<UUID>.mp3`. That prefix and
 * only that prefix is public-read on ssi-audio-stage (bucket policy checked
 * 2026-08-11), which is why the key shape matches production audio even though
 * no `course_audio` row will ever point at it. The clips are orphans on
 * purpose: an orphan costs a few KB, whereas a `course_audio` row for a voice
 * nobody chose is a landmine for the next dedup lookup.
 *
 * Reuse is impossible for the same reason and that is deliberate. Handing the
 * existing rows to findExistingAudio would return clips rendered at the OLD
 * language handle — a comparison that silently replays the thing being tested.
 *
 * Config comes from a JSON brief:
 *   {
 *     "course_code": "spa_for_eng",
 *     "lines": [ { "id": "L1", "speaker": "Neighbour", "gender": "m",
 *                  "known": "Good morning, Sarah!", "target": "¡Buenos días, Sarah!" } ],
 *     "casts": [ { "key": "azure-elvira-alvaro", "label": "...",
 *                  "m": { "provider": "azure", "voice_id": "es-ES-AlvaroNeural", "name": "Alvaro", "locale": "es-ES" },
 *                  "f": { ... },
 *                  "genders": ["m","f"] } ]
 *   }
 * `genders` narrows a cast to only the lines it should answer (a female-only
 * alternative renders three clips, not seven).
 *
 * TTS COSTS MONEY. Run only under an approved plan; --dry prints the plan.
 *
 *   PHASE8_NO_LISTEN=1 node tools/pod-cast-sample-render.cjs <brief.json> [--dry]
 */
process.env.PHASE8_NO_LISTEN = '1'
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { PutObjectCommand } = require('@aws-sdk/client-s3')
const ttsService = require('../services/tts-service.cjs')
const p8 = require('../services/phases/phase8-audio-v13.cjs')

const PUBLIC_BASE = 'https://ssi-audio-stage.s3.eu-west-1.amazonaws.com'

/**
 * The TTS config for one candidate voice. Mirrors phase-8's buildPodTTSConfig:
 * xAI takes the locale VERBATIM as its language (that is the whole experiment —
 * `es` is xAI's Latin American default, `es-ES` is the untested handle), Azure
 * takes the voice name and gets its locale from the voice id itself.
 */
function ttsConfigFor(voice, courseCode) {
  const base = { voiceId: voice.voice_id, speed: 1.0, courseCode }
  if (voice.provider === 'xai') {
    base.apiKey = process.env.XAI_API_KEY
    if (!voice.locale) throw new Error(`xAI voice ${voice.voice_id} has no locale — an implicit handle is the bug being tested`)
    base.language = voice.locale
  } else if (voice.provider === 'elevenlabs') {
    base.apiKey = process.env.ELEVENLABS_API_KEY
  } else {
    base.subscriptionKey = process.env.AZURE_SPEECH_KEY
    base.region = process.env.AZURE_SPEECH_REGION || 'westeurope'
    base.voiceName = voice.voice_id
  }
  return base
}

/** Which voice of a cast reads a line. `n` (unmarked) falls to the male seat, as pod-sync does. */
function seatFor(cast, gender) {
  return cast[gender === 'f' ? 'f' : 'm']
}

/** Expand a brief into one work item per (cast, line) the cast is asked to read. Pure. */
function planWork(brief) {
  const work = []
  for (const cast of brief.casts) {
    const wanted = cast.genders || ['m', 'f', 'n']
    for (const line of brief.lines) {
      const g = line.gender || 'n'
      if (!wanted.includes(g)) continue
      const voice = seatFor(cast, g)
      if (!voice) continue
      work.push({ cast_key: cast.key, cast_label: cast.label, line_id: line.id, speaker: line.speaker, gender: g, known: line.known, target: line.target, voice })
    }
  }
  return work
}

async function main() {
  const briefPath = process.argv[2]
  const dry = process.argv.includes('--dry')
  if (!briefPath) { console.error('usage: pod-cast-sample-render.cjs <brief.json> [--dry]'); process.exit(1) }

  const brief = JSON.parse(fs.readFileSync(briefPath, 'utf8'))
  const work = planWork(brief)
  const chars = work.reduce((n, w) => n + w.target.length, 0)

  console.log(`[cast-sample] ${brief.course_code}: ${work.length} clip(s) across ${brief.casts.length} cast(s), ${chars} chars`)
  for (const cast of brief.casts) {
    const n = work.filter(w => w.cast_key === cast.key).length
    console.log(`  ${cast.key}: ${n} clip(s) — ${cast.label}`)
  }
  if (dry) { console.log('[cast-sample] DRY RUN — nothing synthesised, nothing uploaded'); return }

  const results = []
  for (const w of work) {
    const tag = `${w.cast_key}/${w.line_id}`
    try {
      const { audioBuffer } = await ttsService.generateWithRetry(w.target, w.voice.provider, ttsConfigFor(w.voice, brief.course_code))
      const { buffer, durationMs } = await p8.masterAudio(audioBuffer, w.target)
      const audioId = crypto.randomUUID().toUpperCase()
      const s3Key = `mastered/${audioId}.mp3`
      await p8.s3.send(new PutObjectCommand({
        Bucket: p8.S3_BUCKET, Key: s3Key, Body: buffer, ContentType: 'audio/mpeg',
      }))
      const url = `${PUBLIC_BASE}/${s3Key}`
      results.push({ ...w, ok: true, s3_key: s3Key, url, duration_ms: durationMs, bytes: buffer.length })
      console.log(`  ✓ ${tag} ${w.voice.name} (${w.voice.provider}@${w.voice.locale || 'n/a'}) ${durationMs}ms ${url}`)
    } catch (err) {
      results.push({ ...w, ok: false, error: err.message })
      console.error(`  ✗ ${tag} ${w.voice.name}: ${err.message}`)
    }
  }

  const logPath = briefPath.replace(/\.json$/, '') + '-render-log.json'
  fs.writeFileSync(logPath, JSON.stringify({
    course_code: brief.course_code,
    rendered_at: new Date().toISOString(),
    db_writes: 'none — S3 objects only, no course_audio rows, no pod links',
    clips: results,
  }, null, 2))
  const ok = results.filter(r => r.ok).length
  console.log(`[cast-sample] ${ok}/${results.length} rendered; log → ${path.relative(process.cwd(), logPath)}`)
  if (ok !== results.length) process.exitCode = 1
}

module.exports = { planWork, seatFor, ttsConfigFor }

if (require.main === module) main().catch(e => { console.error(e); process.exit(1) })
