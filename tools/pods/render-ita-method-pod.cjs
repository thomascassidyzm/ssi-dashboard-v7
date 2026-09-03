#!/usr/bin/env node
/**
 * render-ita-method-pod.cjs — both tracks of the Italian Method Pod.
 *
 * The Senedd renderer (tools/pods/senedd/render-senedd-english.cjs) generalised
 * to TWO tracks, because unlike Steve's pod no human records any of this:
 * Tom's ruling, 2026-09-03, "we don't record Italian, that's TTS always". So
 * Italian goes on target/target_audio_id and English on known/known_audio_id,
 * both through phase 8's own generatePodAudio in-process (PHASE8_NO_LISTEN=1),
 * same reuse-by-identity, same mastering, same veracity sampling as
 * services/pod-bulk-migrate.cjs — scoped to one pod rather than driven through
 * POST /generate-pods, whose bulk gate approves a whole COURSE's pod cast.
 *
 * NO APPROVAL GATE ANYWHERE. Deliberate. The text-approval policy exists
 * because a human booth session is expensive to redo; a TTS clip costs pennies
 * to re-render, so a line found wrong later is fixed in text and re-rendered.
 *
 * The one thing that must never happen: a cast entry with provider 'human'.
 * That would be a claim on somebody's time this pod has no business making,
 * and it throws.
 *
 *   node tools/pods/render-ita-method-pod.cjs --dry-run
 *   node tools/pods/render-ita-method-pod.cjs --chapter=1
 *   node tools/pods/render-ita-method-pod.cjs
 */
'use strict'

process.env.PHASE8_NO_LISTEN = '1'
const path = require('path')
const fs = require('fs')
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true })
const { createClient } = require('@supabase/supabase-js')

const POD_ID = 'ita_for_eng:method-pod'
const COURSE = 'ita_for_eng'

const argv = process.argv.slice(2)
const arg = (n) => { const hit = argv.find(a => a === `--${n}` || a.startsWith(`--${n}=`)); if (!hit) return null; const eq = hit.indexOf('='); return eq === -1 ? true : hit.slice(eq + 1) }
const DRY = !!arg('dry-run')
const CHAPTER = Number(arg('chapter')) > 0 ? Math.floor(Number(arg('chapter'))) : null
const LIMIT = Number(arg('limit')) > 0 ? Math.floor(Number(arg('limit'))) : null
// Four lanes, as the Senedd renderer uses: this box runs a phase-8 render and
// several sibling sessions, and the worker slice is capped at 8 CPUs.
const CONCURRENCY = Number(arg('concurrency')) > 0 ? Math.floor(Number(arg('concurrency'))) : 4

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const canonicalSpeaker = (s) => (s || '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim()

function castVoice(speakers, speaker, track) {
  const entry = (speakers || {})[canonicalSpeaker(speaker)] || (speakers || {})[speaker]
  if (!entry || !entry[track] || !entry[track].voice_id) throw new Error(`no ${track} voice cast for speaker ${JSON.stringify(speaker)}`)
  const v = entry[track]
  if (String(v.provider) === 'human') throw new Error(`${speaker} ${track} is cast to a human — this tool renders TTS only`)
  return { voice_id: v.voice_id, provider: v.provider || 'xai', gender: entry.gender || 'n', locale: v.locale || null }
}

async function main() {
  const { data: pod, error: podErr } = await supabase
    .from('listening_pods').select('id, course_code, speakers, visibility, required_role').eq('id', POD_ID).maybeSingle()
  if (podErr || !pod) throw new Error(`pod ${POD_ID} not found: ${podErr && podErr.message}`)
  if (pod.course_code !== COURSE) throw new Error(`pod belongs to ${pod.course_code}, refusing`)

  const { data: course, error: cErr } = await supabase
    .from('courses').select('known_lang, target_lang, voice_config').eq('course_code', COURSE).single()
  if (cErr) throw new Error(`course read failed: ${cErr.message}`)
  const ctx = { knownLang: course.known_lang, targetLang: course.target_lang, voiceConfig: course.voice_config || {} }

  const rows = []
  for (let from = 0; ; from += 1000) {
    let q = supabase.from('listening_pod_sentences')
      .select('id, scene_number, global_order, speaker, target_text, known_text, target_audio_id, known_audio_id')
      .eq('pod_id', POD_ID).order('global_order').range(from, from + 999)
    if (CHAPTER) q = q.eq('scene_number', CHAPTER)
    const { data, error } = await q
    if (error) throw new Error(`sentence read failed: ${error.message}`)
    rows.push(...(data || []))
    if (!data || data.length < 1000) break
  }

  const work = []
  for (const r of rows) {
    if (!r.target_audio_id && (r.target_text || '').trim()) {
      work.push({ id: r.id, order: r.global_order, chapter: r.scene_number, track: 'target', role: 'target1',
        link: 'target_audio_id', language: ctx.targetLang, text: r.target_text.trim(), voice: castVoice(pod.speakers, r.speaker, 'target'), speaker: r.speaker })
    }
    if (!r.known_audio_id && (r.known_text || '').trim()) {
      work.push({ id: r.id, order: r.global_order, chapter: r.scene_number, track: 'known', role: 'known',
        link: 'known_audio_id', language: ctx.knownLang, text: r.known_text.trim(), voice: castVoice(pod.speakers, r.speaker, 'known'), speaker: r.speaker })
    }
  }
  const queue = work.slice(0, LIMIT || undefined)

  console.log(`pod ${POD_ID} (${pod.visibility}, required_role=${pod.required_role || 'none'})`)
  console.log(`${rows.length} sentences${CHAPTER ? ` in chapter ${CHAPTER}` : ''}; ${rows.filter(r => r.target_audio_id).length} have Italian, ${rows.filter(r => r.known_audio_id).length} have English`)
  console.log(`${queue.length} clip(s) to render: ${queue.filter(w => w.track === 'target').length} Italian + ${queue.filter(w => w.track === 'known').length} English`)
  const voices = {}
  for (const w of queue) voices[`${w.speaker}/${w.track}`] = `${w.voice.provider}:${w.voice.voice_id}`
  console.log(`voices: ${JSON.stringify(voices, null, 1)}`)
  console.log(`characters: ${queue.reduce((a, w) => a + w.text.length, 0)}`)
  if (DRY) { writeLog('dryrun', queue.map(w => ({ ...w, audioId: null }))); console.log('DRY RUN — nothing rendered, nothing spent.'); return }
  if (!queue.length) return

  const { generatePodAudio } = require(path.join(__dirname, '..', '..', 'services', 'phases', 'phase8-audio-v13.cjs'))

  const done = []
  let generated = 0, reused = 0, failed = 0
  const lanes = Array.from({ length: CONCURRENCY }, (_, i) => queue.filter((_, j) => j % CONCURRENCY === i))
  await Promise.all(lanes.map(async (items) => {
    for (const item of items) {
      try {
        const result = await generatePodAudio({
          courseCode: COURSE, text: item.text, language: item.language, role: item.role,
          voice: item.voice, ctx, track: item.track, sentenceId: item.id,
        })
        const { error } = await supabase.from('listening_pod_sentences').update({ [item.link]: result.id }).eq('id', item.id)
        if (error) throw new Error(`link: ${error.message}`)
        if (result.reused) reused++; else generated++
        done.push({ ...item, audioId: result.id, reused: !!result.reused })
        if ((generated + reused) % 25 === 0) console.log(`  ${generated + reused + failed}/${queue.length} …`)
      } catch (err) {
        failed++
        done.push({ ...item, audioId: null, error: err.message })
        console.error(`  FAILED ${item.id} ${item.track}: ${err.message}`)
      }
    }
  }))
  console.log(`generated ${generated}, reused ${reused}, failed ${failed}`)
  writeLog(CHAPTER ? `applied-ch${CHAPTER}` : 'applied', done)
}

function writeLog(kind, rows) {
  const out = path.join(__dirname, '..', '..', 'docs', 'ita-method-pod-2026-09-04', `ita-method-pod-tts-${kind}-log.json`)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, JSON.stringify({ pod: POD_ID, at: new Date().toISOString(), rows }, null, 1))
  console.log(`log: ${out}`)
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
