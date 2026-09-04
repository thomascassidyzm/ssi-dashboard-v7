#!/usr/bin/env node
/**
 * render-ita-method-pod.cjs — finish the Italian Method Pod render.
 *
 * Tom's ruling, 2026-09-04, after listening to both options: the TARGET side is
 * NATIVE ITALIAN — Lorenzo for Tom's turns, Luca for Aran's. His words: "I think
 * I prefer the native Italian voices so that my own pronunciation is likely to
 * be more authentic over time". The general rule this settles, now estate canon:
 * TARGET-SIDE AUDIO MUST BE NATIVE; the known side may be any voice, clones
 * included, and here it stays as it is (Tom 8fef4d59…, Aran 33890587…).
 *
 * CARTESIA ONLY. xAI is off this estate and is never a fallback — every voice in
 * this pod's cast is cartesia, and phase 8's xAI→Azure safety net only fires for
 * provider 'xai', so it cannot be reached from here.
 *
 * Renders BOTH tracks, but only rows whose clip is missing: it never re-renders
 * and never unlinks. Visibility stays HELD — going live is a separate decision.
 *
 *   node tools/pods/render-ita-method-pod.cjs --dry-run
 *   node tools/pods/render-ita-method-pod.cjs --limit=1
 *   node tools/pods/render-ita-method-pod.cjs --concurrency=3
 */
'use strict'

process.env.PHASE8_NO_LISTEN = '1'
const path = require('path')
const fs = require('fs')
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') })
const { createClient } = require('@supabase/supabase-js')

const POD_ID = 'ita_for_eng:method-pod'
const COURSE = 'ita_for_eng'

// Tom's cast, verbatim. Asserted against the DB below — if the pod's stored
// speakers ever drift off this, the run stops rather than rendering a wrong voice.
const RULED_CAST = {
  Tom:  { target: 'ee16f140-f6dc-490e-a1ed-c1d537ea0086', known: '8fef4d59-0a7e-4ad2-a261-6a3bb50734d2' },
  Aran: { target: 'e019ed7e-6079-4467-bc7f-b599a5dccf6f', known: '33890587-a29f-4416-ba61-2615c74f92fe' },
}

const argv = process.argv.slice(2)
const arg = (n) => { const hit = argv.find(a => a === `--${n}` || a.startsWith(`--${n}=`)); if (!hit) return null; const eq = hit.indexOf('='); return eq === -1 ? true : hit.slice(eq + 1) }
const DRY = !!arg('dry-run')
const LIMIT = Number(arg('limit')) > 0 ? Math.floor(Number(arg('limit'))) : null
const CONCURRENCY = Number(arg('concurrency')) > 0 ? Math.floor(Number(arg('concurrency'))) : 3
const TAG = arg('tag') || new Date().toISOString().slice(0, 10)

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

async function main() {
  const { data: pod, error: podErr } = await supabase
    .from('listening_pods').select('id, course_code, speakers, visibility').eq('id', POD_ID).maybeSingle()
  if (podErr || !pod) throw new Error(`pod ${POD_ID} not found: ${podErr && podErr.message}`)
  if (pod.course_code !== COURSE) throw new Error(`pod belongs to ${pod.course_code}, refusing`)
  if (pod.visibility !== 'held') throw new Error(`pod visibility is '${pod.visibility}', expected 'held' — refusing`)

  // Cast gate: the stored cast must BE Tom's ruling, on both tracks.
  for (const [name, want] of Object.entries(RULED_CAST)) {
    const entry = (pod.speakers || {})[name]
    for (const track of ['target', 'known']) {
      const got = entry && entry[track] && entry[track].voice_id
      if (got !== want[track]) throw new Error(`cast drift: ${name}.${track} is ${got || 'unset'}, ruling says ${want[track]}`)
      if ((entry[track].provider || '') !== 'cartesia') throw new Error(`cast drift: ${name}.${track} provider is ${entry[track].provider}, must be cartesia`)
    }
  }

  const { data: course, error: cErr } = await supabase
    .from('courses').select('known_lang, target_lang, voice_config').eq('course_code', COURSE).single()
  if (cErr) throw new Error(`course read failed: ${cErr.message}`)
  const ctx = { knownLang: course.known_lang, targetLang: course.target_lang, voiceConfig: course.voice_config || {} }

  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('listening_pod_sentences')
      .select('id, global_order, speaker, target_text, known_text, target_audio_id, known_audio_id, target_text_draft')
      .eq('pod_id', POD_ID).order('global_order').range(from, from + 999)
    if (error) throw new Error(`sentence read failed: ${error.message}`)
    rows.push(...(data || []))
    if (!data || data.length < 1000) break
  }

  const drafts = rows.filter(r => r.target_text_draft && !r.target_audio_id)
  if (drafts.length) throw new Error(`${drafts.length} unrendered rows still carry target_text_draft — unread drafts are never rendered`)

  const { resolvePodSpeakerVoice } = require(path.join(__dirname, '..', '..', 'services', 'phases', 'phase8-audio-v13.cjs'))

  const work = []
  for (const r of rows) {
    if (!r.target_audio_id && (r.target_text || '').trim()) {
      work.push({ id: r.id, order: r.global_order, speaker: r.speaker, track: 'target', role: 'target1',
        text: r.target_text.trim(), language: ctx.targetLang, column: 'target_audio_id',
        voice: resolvePodSpeakerVoice(pod.speakers, r.speaker, 'target') })
    }
    if (!r.known_audio_id && (r.known_text || '').trim()) {
      work.push({ id: r.id, order: r.global_order, speaker: r.speaker, track: 'known', role: 'known',
        text: r.known_text.trim(), language: ctx.knownLang, column: 'known_audio_id',
        voice: resolvePodSpeakerVoice(pod.speakers, r.speaker, 'known') })
    }
  }
  for (const w of work) {
    if (!w.voice || !w.voice.voice_id) throw new Error(`${w.id} ${w.track}: no voice resolved for speaker '${w.speaker}'`)
    if (w.voice.provider !== 'cartesia') throw new Error(`${w.id} ${w.track}: provider ${w.voice.provider} — cartesia only`)
    if (w.voice.voice_id !== (RULED_CAST[w.speaker] || {})[w.track]) throw new Error(`${w.id} ${w.track}: voice ${w.voice.voice_id} is off the ruled cast`)
  }
  // Target first: it is the side Tom is waiting on.
  work.sort((a, b) => (a.track === b.track ? a.order - b.order : a.track === 'target' ? -1 : 1))
  const queue = LIMIT ? work.slice(0, LIMIT) : work

  console.log(`pod ${POD_ID} (${pod.visibility})`)
  console.log(`${rows.length} sentences | italian ${rows.filter(r => r.target_audio_id).length}/${rows.length} | english ${rows.filter(r => r.known_audio_id).length}/${rows.length}`)
  console.log(`to render: ${work.filter(w => w.track === 'target').length} italian + ${work.filter(w => w.track === 'known').length} english = ${work.length}`)
  console.log(`cast: Tom→Lorenzo/${RULED_CAST.Tom.target}, Aran→Luca/${RULED_CAST.Aran.target} (cartesia)`)
  if (LIMIT) console.log(`--limit=${LIMIT}: rendering ${queue.length}`)
  if (DRY) { writeLog('dryrun', queue.map(w => ({ ...w, audioId: null }))); console.log('DRY RUN — nothing rendered.'); return }
  if (!queue.length) { console.log('nothing to do'); return }

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
        const { error } = await supabase
          .from('listening_pod_sentences').update({ [item.column]: result.id }).eq('id', item.id)
        if (error) throw new Error(`link: ${error.message}`)
        if (result.reused) reused++; else generated++
        done.push({ ...item, audioId: result.id, reused: !!result.reused })
        if ((generated + reused) % 20 === 0) console.log(`  ${generated + reused}/${queue.length} …`)
      } catch (err) {
        failed++
        done.push({ ...item, audioId: null, error: err.message })
        console.error(`  FAILED ${item.id} ${item.track}: ${err.message}`)
      }
    }
  }))
  console.log(`generated ${generated}, reused ${reused}, failed ${failed}`)
  writeLog('applied', done)
  if (failed) process.exitCode = 2
}

function writeLog(kind, entries) {
  const dir = path.join(__dirname, '..', '..', 'docs', 'pods')
  const out = path.join(dir, `ita_for_eng-method-pod-render-${TAG}-${kind}-log.json`)
  fs.writeFileSync(out, JSON.stringify({ pod: POD_ID, at: new Date().toISOString(), count: entries.length, rows: entries }, null, 1))
  console.log(`log: ${out}`)
}

main().then(() => process.exit(process.exitCode || 0)).catch(e => { console.error(e); process.exit(1) })
