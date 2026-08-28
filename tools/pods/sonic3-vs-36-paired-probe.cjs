#!/usr/bin/env node
/**
 * sonic3-vs-36-paired-probe.cjs — the old model against the new one, on the
 * SAME Pod 1 lines, measured where the difference actually lives.
 *
 * The claim on commit d6695bac2 is -31.5 LUFS (sonic-3) against -21.7 (sonic-3.6)
 * on a short line straight off the API. Confirming it "across the real 91" cannot
 * be done on the clips a learner hears: masterAudio normalises every clip to
 * -16 LUFS, so the delivered before/after can only show that both hit target. The
 * gap exists in the RAW bytes, and the old raw bytes were never stored — only the
 * mastered result was. So the only honest way to pair the two models on real
 * course lines is to render the same text on both, now, and measure both raws.
 *
 * NOTHING THIS RENDERS IS PUBLISHED. No S3 write, no DB write. It spends a small
 * number of Cartesia credits to turn a one-line anecdote into a paired
 * measurement on real lines, and throws the audio away.
 *
 * Usage: node tools/pods/sonic3-vs-36-paired-probe.cjs [--n=12]
 */
'use strict'

process.env.PHASE8_NO_LISTEN = '1'

const path = require('path')
const fs = require('fs')
const os = require('os')
const REPO = path.join(__dirname, '..', '..')
require('dotenv').config({ path: path.join(REPO, '.env') })

const { createClient } = require('@supabase/supabase-js')
const ttsService = require(path.join(REPO, 'services/tts-service.cjs'))
const { measureLoudness } = require('./pod1-sonic36-rerender.cjs')

const COURSE = 'spa_for_eng'
const TOM_CARTESIA = '8fef4d59-0a7e-4ad2-a261-6a3bb50734d2'
const N = parseInt((process.argv.find((a) => a.startsWith('--n=')) || '--n=12').split('=')[1], 10)
const OUT = path.join(REPO, 'docs/pods/pod1-sonic36-rerender-2026-08-27/sonic3-vs-36-paired-probe.json')

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

async function rawLufs (tmp, text, modelId, tag) {
  const { audioBuffer } = await ttsService.generateWithRetry(text, 'cartesia', {
    voiceId: TOM_CARTESIA, speed: 1.0, courseCode: COURSE,
    apiKey: process.env.CARTESIA_API_KEY, locale: 'en-GB', language: 'en-GB',
    modelId,
  })
  const f = path.join(tmp, `${tag}.mp3`)
  fs.writeFileSync(f, audioBuffer)
  const m = measureLoudness(f)
  fs.rmSync(f, { force: true })
  return { ...m, bytes: audioBuffer.length }
}

async function main () {
  const { data: pod } = await sb.from('listening_pods').select('id').eq('course_code', COURSE).eq('slug', 'pod-1').single()
  const { data: sentences } = await sb.from('listening_pod_sentences')
    .select('id,known_text,known_audio_id,scene_number,sentence_number')
    .eq('pod_id', pod.id).order('scene_number').order('sentence_number')
  const { data: rows } = await sb.from('course_audio').select('id,voice_id')
    .in('id', sentences.map((s) => s.known_audio_id).filter(Boolean))
  const tom = new Set(rows.filter((r) => String(r.voice_id).includes(TOM_CARTESIA)).map((r) => r.id))
  const all = sentences.filter((s) => tom.has(s.known_audio_id))

  // Spread evenly across the pod, so the sample is not all short openers: the
  // short line is where the two models are furthest apart, and picking only
  // short lines would flatter the result.
  const step = Math.max(1, Math.floor(all.length / N))
  const sample = []
  for (let i = 0; i < all.length && sample.length < N; i += step) sample.push(all[i])

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'paired-'))
  const out = []
  for (const [i, s] of sample.entries()) {
    const text = s.known_text
    try {
      const three = await rawLufs(tmp, text, 'sonic-3', `${i}-3`)
      const threeSix = await rawLufs(tmp, text, 'sonic-3.6', `${i}-36`)
      out.push({ slot: s.id, chars: text.length, text, 'sonic-3': three, 'sonic-3.6': threeSix })
      console.log(`${s.id.split(':').pop().padEnd(12)} ${String(text.length).padStart(3)}ch  sonic-3 ${String(three.lufs).padStart(6)} LUFS / peak ${String(three.peak_dbfs).padStart(5)}   →   sonic-3.6 ${String(threeSix.lufs).padStart(6)} LUFS / peak ${String(threeSix.peak_dbfs).padStart(5)}`)
    } catch (e) {
      console.warn(`  ✗ ${s.id}: ${e.message}`)
      out.push({ slot: s.id, text, error: e.message.slice(0, 200) })
    }
  }
  fs.rmSync(tmp, { recursive: true, force: true })

  const ok = out.filter((r) => r['sonic-3'] && r['sonic-3.6'])
  const med = (xs) => { const a = [...xs].sort((x, y) => x - y); return a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2 }
  const summary = {
    n: ok.length,
    'sonic-3': { median_lufs: med(ok.map((r) => r['sonic-3'].lufs)), min: Math.min(...ok.map((r) => r['sonic-3'].lufs)), max: Math.max(...ok.map((r) => r['sonic-3'].lufs)), median_peak: med(ok.map((r) => r['sonic-3'].peak_dbfs)) },
    'sonic-3.6': { median_lufs: med(ok.map((r) => r['sonic-3.6'].lufs)), min: Math.min(...ok.map((r) => r['sonic-3.6'].lufs)), max: Math.max(...ok.map((r) => r['sonic-3.6'].lufs)), median_peak: med(ok.map((r) => r['sonic-3.6'].peak_dbfs)) },
    median_gain_db: med(ok.map((r) => r['sonic-3.6'].lufs - r['sonic-3'].lufs)),
    louder_on_36: ok.filter((r) => r['sonic-3.6'].lufs > r['sonic-3'].lufs).length,
  }
  console.log('\n' + JSON.stringify(summary, null, 2))
  fs.writeFileSync(OUT, JSON.stringify({ generated: new Date().toISOString(), note: 'raw bytes off the API, nothing published', summary, rows: out }, null, 2))
  console.log(`\nwritten: ${OUT}`)
}

if (require.main === module) main().catch((e) => { console.error('FATAL', e.message); process.exit(1) })
