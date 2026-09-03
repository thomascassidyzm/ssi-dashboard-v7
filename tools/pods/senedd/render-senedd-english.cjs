#!/usr/bin/env node
/**
 * render-senedd-english.cjs — the ENGLISH half of Steve's Senedd/S4C pod.
 *
 * Tom, 2026-09-03: "the English lines will be TTS, because it is fast and
 * cheap." Aran records the WELSH ONLY, so this renders the known track and
 * nothing else — the target column is never read, never written, and no Welsh
 * text ever reaches a TTS provider.
 *
 * It is phase 8's own generatePodAudio, called in-process (PHASE8_NO_LISTEN=1)
 * exactly as services/pod-bulk-migrate.cjs calls it: same reuse-by-identity,
 * same mastering, same veracity sampling, same known_audio_id link. Scoped to
 * one pod and one track rather than driven through POST /generate-pods, because
 * that endpoint's bulk gate approves a COURSE's whole pod cast, and approving
 * cym_n_for_eng for bulk TTS would be a standing licence to synthesise Welsh
 * that this job has no business writing.
 *
 *   node tools/pods/senedd/render-senedd-english.cjs --dry-run
 *   node tools/pods/senedd/render-senedd-english.cjs --limit=5
 *   node tools/pods/senedd/render-senedd-english.cjs
 */
'use strict'

process.env.PHASE8_NO_LISTEN = '1'
const path = require('path')
const fs = require('fs')
require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '.env') })
const { createClient } = require('@supabase/supabase-js')

const POD_ID = 'cym_n_for_eng:senedd-s4c-steve'
const COURSE = 'cym_n_for_eng'
const TRACK = 'known'

const argv = process.argv.slice(2)
const arg = (n) => { const hit = argv.find(a => a === `--${n}` || a.startsWith(`--${n}=`)); if (!hit) return null; const eq = hit.indexOf('='); return eq === -1 ? true : hit.slice(eq + 1) }
const DRY = !!arg('dry-run')
const LIMIT = Number(arg('limit')) > 0 ? Math.floor(Number(arg('limit'))) : null
const CONCURRENCY = Number(arg('concurrency')) > 0 ? Math.floor(Number(arg('concurrency'))) : 4

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

async function main() {
  const { data: pod, error: podErr } = await supabase
    .from('listening_pods').select('id, course_code, speakers, visibility, required_role').eq('id', POD_ID).maybeSingle()
  if (podErr || !pod) throw new Error(`pod ${POD_ID} not found: ${podErr && podErr.message}`)
  if (pod.course_code !== COURSE) throw new Error(`pod belongs to ${pod.course_code}, refusing`)

  const { data: course, error: cErr } = await supabase
    .from('courses').select('known_lang, target_lang, voice_config').eq('course_code', COURSE).single()
  if (cErr) throw new Error(`course read failed: ${cErr.message}`)
  const ctx = {
    knownLang: course.known_lang,
    targetLang: course.target_lang,
    // Fallback only — every speaker in this pod is cast explicitly
    // (tools/pods/senedd/set-senedd-cast.sql). CARTESIA, not xAI: the estate's
    // standard English pod clone gfzdpspr5fdp is an xAI voice and xAI is being
    // wound down, so this pod is not born on it (Tom, 2026-09-03).
    knownVoice: { voice_id: 'cartesia_8fef4d59-0a7e-4ad2-a261-6a3bb50734d2', provider: 'cartesia', gender: 'm', locale: 'en-GB' },
    voiceConfig: course.voice_config || {},
  }

  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('listening_pod_sentences')
      .select('id, global_order, speaker, known_text, known_audio_id')
      .eq('pod_id', POD_ID).order('global_order').range(from, from + 999)
    if (error) throw new Error(`sentence read failed: ${error.message}`)
    rows.push(...(data || []))
    if (!data || data.length < 1000) break
  }

  const work = rows
    .filter(r => !r.known_audio_id && (r.known_text || '').trim())
    .slice(0, LIMIT || undefined)
    .map(r => {
      const cast = pod.speakers && (pod.speakers[r.speaker] || pod.speakers._default)
      const voice = cast && cast.known && cast.known.voice_id
        ? { voice_id: cast.known.voice_id, provider: cast.known.provider || 'cartesia', gender: cast.gender || 'n', locale: cast.known.locale || null }
        : ctx.knownVoice
      // The one thing that must never happen here.
      if (String(voice.provider) === 'human') throw new Error(`${r.id}: known track is cast to a human — this tool renders TTS only`)
      return { id: r.id, order: r.global_order, speaker: r.speaker, text: r.known_text.trim(), voice }
    })

  console.log(`pod ${POD_ID} (${pod.visibility}, required_role=${pod.required_role || 'none'})`)
  console.log(`${rows.length} sentences, ${rows.filter(r => r.known_audio_id).length} already have English audio`)
  console.log(`${work.length} English clip(s) to render on ${JSON.stringify(work[0] && work[0].voice)}`)
  console.log(`WELSH TRACK IS NOT TOUCHED — Aran records it.`)
  console.log(`English-only floor turns (empty target_text) render their known side like any other row.`)
  if (DRY) {
    writeLog('dryrun', work.map(w => ({ ...w, audioId: null })))
    console.log('DRY RUN — nothing rendered.')
    return
  }
  if (!work.length) return

  const { generatePodAudio } = require(path.join(__dirname, '..', '..', '..', 'services', 'phases', 'phase8-audio-v13.cjs'))

  const done = []
  let generated = 0, reused = 0, failed = 0
  const lanes = Array.from({ length: CONCURRENCY }, (_, i) => work.filter((_, j) => j % CONCURRENCY === i))
  await Promise.all(lanes.map(async (items) => {
    for (const item of items) {
      try {
        const result = await generatePodAudio({
          courseCode: COURSE, text: item.text, language: ctx.knownLang, role: 'known',
          voice: item.voice, ctx, track: TRACK, sentenceId: item.id,
        })
        const { error } = await supabase
          .from('listening_pod_sentences').update({ known_audio_id: result.id }).eq('id', item.id)
        if (error) throw new Error(`link: ${error.message}`)
        if (result.reused) reused++; else generated++
        done.push({ ...item, audioId: result.id, reused: !!result.reused })
        if ((generated + reused) % 25 === 0) console.log(`  ${generated + reused}/${work.length} …`)
      } catch (err) {
        failed++
        done.push({ ...item, audioId: null, error: err.message })
        console.error(`  FAILED ${item.id}: ${err.message}`)
      }
    }
  }))
  console.log(`generated ${generated}, reused ${reused}, failed ${failed}`)
  writeLog('applied', done)
}

function writeLog(kind, rows) {
  const out = path.join(__dirname, '..', '..', '..', 'docs', 'senedd-s4c-2026-09-03',
    `senedd-s4c-steve-english-tts-${kind}-log.json`)
  fs.writeFileSync(out, JSON.stringify({ pod: POD_ID, track: TRACK, at: new Date().toISOString(), rows }, null, 1))
  console.log(`log: ${out}`)
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
