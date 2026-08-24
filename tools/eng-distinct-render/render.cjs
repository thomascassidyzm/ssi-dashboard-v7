#!/usr/bin/env node
/**
 * Render the approved English distinct-text pack: ONE clip per (distinct English text ×
 * cast voice), shared afterwards by every course that uses that line. Tom approved
 * 2026-08-13 — 670 units at clone + Olivia, ~$0.81, per
 * docs/audio/english-distinct-text-recount-2026-08-13.md.
 *
 * MAKE BEFORE BREAK (CLAUDE.md §approval gates). This script only ever CREATES: it renders,
 * verifies and inserts new course_audio rows. It never edits or deletes an existing row and
 * never touches a slot link — relinking is a separate, later step that runs only against
 * clips this script has already proved alive. Nothing old is superseded until then.
 *
 * The render path is the estate's own, not a reimplementation: ttsService.generateWithRetry →
 * phase8.masterAudio → veracity.renderChecked (the pre-publish gate, re-renders a defective
 * clip and quarantines a persistent one) → S3 PutObject → course_audio insert. Same order and
 * same gate as services/phases/phase8-audio-v13.cjs:2230-2320.
 *
 * GUARDS, because this path does not pass the /generate-pods approval route:
 *   - voice must be one of the two Tom approved (clone gfzdpspr5fdp, Olivia bedd6226);
 *   - owner course must not be human-voiced (cym_*) — belt and braces over tts-service's
 *     own assertNotHumanVoiceCourse chokepoint;
 *   - a unit whose (text_stripped, voice) already exists on-cast anywhere is REFUSED, not
 *     re-rendered: the reuse credit is the whole point of the recount.
 *
 * Resumable: every unit's outcome is appended to render-log.jsonl and a re-run skips
 * anything already logged done. Checkpointed because a first real run is a shakedown.
 *
 *   node tools/eng-distinct-render/render.cjs --limit 3     # shakedown
 *   node tools/eng-distinct-render/render.cjs               # the rest
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const { PutObjectCommand } = require('@aws-sdk/client-s3')
const { v4: uuidv4 } = require('uuid')
// Required for masterAudio/s3 only — PHASE8_NO_LISTEN keeps the require from
// starting phase8's own service on 3465 (which is already running).
process.env.PHASE8_NO_LISTEN = '1'
const ttsService = require('../../services/tts-service.cjs')
const veracity = require('../../services/audio-veracity.cjs')
const { isHumanVoiceCourse } = require('../../services/shared/human-voice-courses.cjs')
const phase8 = require('../../services/phases/phase8-audio-v13.cjs')

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const { masterAudio, s3, S3_BUCKET } = phase8
const APPROVED = new Set(['gfzdpspr5fdp', 'bedd6226'])
const CACHE_CONTROL = 'public, max-age=31536000, immutable'
const LOG = path.join(__dirname, 'render-log.jsonl')

const argLimit = (() => { const i = process.argv.indexOf('--limit'); return i > -1 ? Number(process.argv[i + 1]) : Infinity })()
const CONC = Number(process.env.RENDER_CONCURRENCY || 4)

const plan = JSON.parse(fs.readFileSync(path.join(__dirname, 'render-plan.json')))
const done = new Set()
if (fs.existsSync(LOG)) for (const l of fs.readFileSync(LOG, 'utf8').split('\n').filter(Boolean)) {
  const r = JSON.parse(l); if (r.ok) done.add(r.norm + ' ' + r.voice)
}
const queue = plan.filter(p => !done.has(p.norm + ' ' + p.voice)).slice(0, argLimit)
console.log(`plan ${plan.length}, already done ${done.size}, this run ${queue.length}, concurrency ${CONC}`)

const stats = veracity.newStats()
const append = o => fs.appendFileSync(LOG, JSON.stringify(o) + '\n')

/**
 * Bulk on-cast pre-check, run ONCE before any render. Per-unit it has to go through
 * PostgREST on an unindexed text_stripped predicate and every call hits the statement
 * timeout; batched `text_stripped = ANY($1)` over the direct connection answers in one
 * scan. Same predicate as the recount's reuse credit, so a unit that would have been
 * credited can never be re-rendered by mistake.
 */
const { q } = require('./db.cjs')
async function loadOnCast(units) {
  const norms = [...new Set(units.map(u => u.norm))]
  const found = new Map()
  for (let i = 0; i < norms.length; i += 400) {
    const rs = await q(
      `SELECT text_stripped, regexp_replace(voice_id,'^(xai_|azure_)','') AS vb,
              (array_agg(id ORDER BY id))[1] AS id, (array_agg(s3_key ORDER BY id))[1] AS s3_key
       FROM course_audio
       WHERE language='eng' AND text_stripped = ANY($1)
         AND regexp_replace(voice_id,'^(xai_|azure_)','') = ANY($2)
         AND s3_key IS NOT NULL AND s3_key <> '' AND s3_key NOT LIKE 'pending/%'
       GROUP BY 1,2`, [norms.slice(i, i + 400), [...APPROVED]])
    for (const r of rs) found.set(r.text_stripped + ' ' + r.vb, r)
  }
  return found
}
let onCast = new Map()

async function renderOne(p, i) {
  const tag = `[${i + 1}/${queue.length}] ${p.voice === 'bedd6226' ? 'Olivia' : 'clone '} ${JSON.stringify(p.text.slice(0, 48))}`
  if (!APPROVED.has(p.voice)) throw new Error(`voice ${p.voice} is not in the approved cast`)
  if (isHumanVoiceCourse(p.owner_course)) throw new Error(`owner ${p.owner_course} is human-voiced — refused`)

  const existing = onCast.get(p.norm + ' ' + p.voice)
  if (existing) {
    append({ norm: p.norm, voice: p.voice, ok: true, skipped: 'already on-cast', audio_id: existing.id, s3_key: existing.s3_key })
    console.log(`${tag} SKIP already on-cast ${existing.id}`)
    return
  }

  const render = async () => {
    const { audioBuffer } = await ttsService.generateWithRetry(p.text, 'xai', {
      apiKey: process.env.XAI_API_KEY,
      voiceId: p.voice,
      language: 'en',
      courseCode: p.owner_course,
    })
    const { buffer, durationMs } = await masterAudio(audioBuffer, p.text)
    return { buffer, durationMs }
  }

  const gated = await veracity.renderChecked({
    render, expectedText: p.text, language: 'eng', stats,
    logger: console,
    meta: { courseCode: p.owner_course, role: p.role, voiceId: p.voice, originalText: p.text },
  })
  if (!gated.published) throw new Error(`veracity gate quarantined after ${gated.attempts}: ${gated.verdict?.reason}`)

  const audioId = uuidv4().toUpperCase()
  const s3Key = `mastered/${audioId}.mp3`
  await s3.send(new PutObjectCommand({
    Bucket: S3_BUCKET, Key: s3Key, Body: gated.buffer,
    ContentType: 'audio/mpeg', CacheControl: CACHE_CONTROL,
  }))

  const { data, error } = await sb.from('course_audio').insert({
    course_code: p.owner_course,
    text: p.text,
    language: 'eng',
    role: p.role,
    voice_id: 'xai_' + p.voice,
    origin: 'tts',
    s3_key: s3Key,
    duration_ms: gated.durationMs,
    ...veracity.verdictColumns(gated.verdict, { checker: 'eng-distinct-render', attempts: gated.attempts }),
  }).select('id, s3_key, voice_id, text_stripped, duration_ms').single()
  if (error) throw new Error(`insert: ${error.message}`)

  append({
    norm: p.norm, voice: p.voice, ok: true, audio_id: data.id, s3_key: data.s3_key,
    text: p.text, owner_course: p.owner_course, role: p.role,
    duration_ms: data.duration_ms, bytes: gated.buffer.length,
    text_stripped: data.text_stripped, attempts: gated.attempts,
    cer: gated.verdict?.cer ?? null, checked: gated.verdict?.checked ?? null,
  })
  console.log(`${tag} -> ${data.id} ${gated.buffer.length}b ${data.duration_ms}ms`)
}

;(async () => {
  onCast = await loadOnCast(queue)
  // Count only exact (norm, voice) pairs — onCast also holds the SAME line on the OTHER
  // cast voice, which is not a hit for this unit and must not be reported as one.
  const hits = queue.filter(p => onCast.has(p.norm + ' ' + p.voice)).length
  console.log(`on-cast pre-check: ${hits} of ${queue.length} queued units already exist and will be SKIPPED, not re-rendered`)
  let fails = 0, n = 0
  const workers = Array.from({ length: CONC }, async () => {
    for (;;) {
      const i = n++
      if (i >= queue.length) return
      try { await renderOne(queue[i], i) }
      catch (e) {
        fails++
        append({ norm: queue[i].norm, voice: queue[i].voice, ok: false, error: String(e.message).slice(0, 400) })
        console.error(`[${i + 1}] FAIL ${String(e.message).slice(0, 200)}`)
      }
    }
  })
  await Promise.all(workers)
  console.log(`\ndone. failures=${fails}`)
  console.log('veracity:', veracity.formatStats ? veracity.formatStats(stats) : JSON.stringify(stats))
})().catch(e => { console.error(e); process.exit(1) })
