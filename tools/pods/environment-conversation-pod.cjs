#!/usr/bin/env node
/**
 * environment-conversation-pod.cjs — the first topic conversation pod: Tom and Aran on
 * the environment, recorded 2026-09, Italian for English speakers (job #255, 2026-09-25).
 *
 * Tom's direction, 2026-09-25: "My clone for my voice, Aran's clone for his voice - that's
 * the English. Yes, let's then get it translated into Italian - with then the Italian POD
 * recorded using the same Italian voices we used for the Method POD." So the cast is the
 * Method Pod's, verbatim: known side = the two Cartesia clones, target side = Lorenzo for
 * Tom's turns and Luca for Aran's (Tom's ruling 2026-09-04, see render-ita-method-pod.cjs).
 *
 * Text: docs/pods/environment-conversation-2026-09-25.json — the checked transcript,
 * unpolished (Tom: "no polishing"), one row per sentence, with the Italian beside it.
 *
 * The slug is NOT a serving slug (serving-slug.cjs: pod-1, method-pod), so the
 * pod is in front of nobody. Visibility stays 'held'; putting it before learners is
 * Tom's call, and a separate one.
 *
 *   node tools/pods/environment-conversation-pod.cjs ingest   # create pod + rows (refuses if present)
 *   node tools/pods/environment-conversation-pod.cjs render [--dry-run] [--limit=N] [--concurrency=3]
 *   node tools/pods/environment-conversation-pod.cjs stitch --out=<dir>   # one file per language
 */
'use strict'

process.env.PHASE8_NO_LISTEN = '1'
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execFileSync } = require('child_process')
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true })
const { createClient } = require('@supabase/supabase-js')
const { servesLearners } = require('./serving-slug.cjs')

const COURSE = 'ita_for_eng'
const SLUG = 'environment-conversation'
const POD_ID = `${COURSE}:${SLUG}`
const TEXT = path.join(__dirname, '..', '..', 'docs', 'pods', 'environment-conversation-2026-09-25.json')

const CAST = {
  Tom: {
    gender: 'm', variants: ['Tom', 'TOM'],
    known: { name: 'Tom', locale: 'en-GB', provider: 'cartesia', voice_id: '8fef4d59-0a7e-4ad2-a261-6a3bb50734d2' },
    target: { name: 'Lorenzo', locale: 'it', provider: 'cartesia', voice_id: 'ee16f140-f6dc-490e-a1ed-c1d537ea0086' },
  },
  Aran: {
    gender: 'm', variants: ['Aran', 'ARAN'],
    known: { name: 'Aran', locale: 'en-GB', provider: 'cartesia', voice_id: '33890587-a29f-4416-ba61-2615c74f92fe' },
    target: { name: 'Luca', locale: 'it', provider: 'cartesia', voice_id: 'e019ed7e-6079-4467-bc7f-b599a5dccf6f' },
  },
}

const argv = process.argv.slice(2)
const cmd = argv[0]
const arg = (n) => { const hit = argv.find(a => a === `--${n}` || a.startsWith(`--${n}=`)); if (!hit) return null; const eq = hit.indexOf('='); return eq === -1 ? true : hit.slice(eq + 1) }
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

async function readRows() {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('listening_pod_sentences')
      .select('id, global_order, speaker, target_text, known_text, target_audio_id, known_audio_id')
      .eq('pod_id', POD_ID).order('global_order').range(from, from + 999)
    if (error) throw new Error(`sentence read failed: ${error.message}`)
    rows.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  return rows
}

async function ingest() {
  if (servesLearners({ slug: SLUG, podType: 'core' })) throw new Error(`${SLUG} is a serving slug — refusing`)
  const text = JSON.parse(fs.readFileSync(TEXT, 'utf8'))
  const { data: existing } = await supabase.from('listening_pods').select('id').eq('id', POD_ID).maybeSingle()
  if (existing) throw new Error(`${POD_ID} already exists — ingest never overwrites`)
  const { error: pErr } = await supabase.from('listening_pods').insert({
    id: POD_ID, course_code: COURSE, pod_type: 'core', slug: SLUG, pod_order: 3, visibility: 'held',
    title: 'Tom and Aran talk about the environment',
    speakers: CAST,
    metadata: {
      hosts: [{ name: 'Tom' }, { name: 'Aran' }],
      format: 'Two-host topic conversation, as recorded, unpolished',
      source: 'podcast-tom-aran/01-environment-checked.md',
      // Tom 2026-09-25: "Menai straits was what Aran said - but the claim in his head was wrong."
      // So the English keeps his words and only the Italian says mains water.
      note: 'Tom 2026-09-25: no polishing. Only Siri mishearings fixed. The English keeps Aran\'s "taking water from Menai Straits"; the Italian says mains water ("l\'acqua della rete idrica").',
      sections: [{ label: 'Chapter 1', title: "L'ambiente", number: 1, subtitle: 'the environment', sentence_count: text.rows.length }],
    },
  })
  if (pErr) throw new Error(`pod insert: ${pErr.message}`)
  const rows = text.rows.map(r => ({
    id: `${POD_ID}:SC01-S${String(r.n).padStart(3, '0')}`, pod_id: POD_ID,
    scene_number: 1, sentence_number: r.n, global_order: r.n, speaker: r.speaker,
    target_text: r.it, known_text: r.en, target_text_draft: false,
  }))
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await supabase.from('listening_pod_sentences').insert(rows.slice(i, i + 200))
    if (error) throw new Error(`rows insert at ${i}: ${error.message}`)
  }
  console.log(`created ${POD_ID} (held) with ${rows.length} rows`)
}

async function render() {
  const DRY = !!arg('dry-run')
  const LIMIT = Number(arg('limit')) > 0 ? Math.floor(Number(arg('limit'))) : null
  const CONCURRENCY = Number(arg('concurrency')) > 0 ? Math.floor(Number(arg('concurrency'))) : 3
  const { data: pod, error } = await supabase.from('listening_pods').select('course_code, speakers, visibility').eq('id', POD_ID).single()
  if (error) throw new Error(`pod read: ${error.message}`)
  for (const [name, want] of Object.entries(CAST)) for (const track of ['known', 'target']) {
    const got = pod.speakers[name] && pod.speakers[name][track]
    if (!got || got.voice_id !== want[track].voice_id || got.provider !== 'cartesia') throw new Error(`cast drift: ${name}.${track}`)
  }
  const { data: course } = await supabase.from('courses').select('known_lang, target_lang, voice_config').eq('course_code', COURSE).single()
  const ctx = { knownLang: course.known_lang, targetLang: course.target_lang, voiceConfig: course.voice_config || {} }
  const rows = await readRows()
  const work = []
  for (const r of rows) for (const track of ['target', 'known']) {
    const col = `${track}_audio_id`, txt = (r[`${track}_text`] || '').trim()
    if (r[col] || !txt) continue
    work.push({ id: r.id, order: r.global_order, speaker: r.speaker, track, column: col, text: txt,
      role: track === 'target' ? 'target1' : 'known', language: track === 'target' ? ctx.targetLang : ctx.knownLang,
      voice: CAST[r.speaker][track] })
  }
  work.sort((a, b) => a.order - b.order || (a.track === 'known' ? -1 : 1))
  const queue = LIMIT ? work.slice(0, LIMIT) : work
  console.log(`${rows.length} rows; to render ${queue.length} of ${work.length}`)
  if (DRY || !queue.length) return
  const { generatePodAudio } = require(path.join(__dirname, '..', '..', 'services', 'phases', 'phase8-audio-v13.cjs'))
  let ok = 0, failed = 0
  const lanes = Array.from({ length: CONCURRENCY }, (_, i) => queue.filter((_, j) => j % CONCURRENCY === i))
  await Promise.all(lanes.map(async items => {
    for (const w of items) {
      try {
        const res = await generatePodAudio({ courseCode: COURSE, text: w.text, language: w.language, role: w.role,
          voice: w.voice, ctx, track: w.track, sentenceId: w.id })
        const { error: e } = await supabase.from('listening_pod_sentences').update({ [w.column]: res.id }).eq('id', w.id)
        if (e) throw new Error(`link: ${e.message}`)
        if (++ok % 25 === 0) console.log(`  ${ok}/${queue.length}`)
      } catch (err) { failed++; console.error(`FAILED ${w.id} ${w.track}: ${err.message}`) }
    }
  }))
  console.log(`done: ${ok} rendered, ${failed} failed`)
  if (failed) process.exitCode = 1
}

// One listenable file per language: every clip in conversation order, a short gap
// inside a turn and a longer one at a change of speaker. Listening aid only.
async function stitch() {
  const out = arg('out'); if (!out) throw new Error('--out=<dir> required')
  const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3')
  const s3 = new S3Client({ region: (process.env.AWS_REGION || '').trim() })
  const bucket = (process.env.S3_AUDIO_BUCKET || process.env.S3_BUCKET || '').trim()
  const rows = await readRows()
  const tmp = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'envpod-'))
  const gap = (ms) => { const f = path.join(tmp, `gap${ms}.wav`); if (!fs.existsSync(f)) execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', String(ms / 1000), '-c:a', 'pcm_s16le', f]); return f }
  for (const [track, name] of [['known', 'english'], ['target', 'italian']]) {
    const missing = rows.filter(r => !r[`${track}_audio_id`]).length
    if (missing) throw new Error(`${name}: ${missing} rows unrendered`)
    const ids = rows.map(r => r[`${track}_audio_id`])
    const meta = new Map()
    for (let i = 0; i < ids.length; i += 200) {
      const { data, error } = await supabase.from('course_audio').select('id, s3_key').in('id', ids.slice(i, i + 200))
      if (error) throw new Error(error.message)
      for (const d of data) meta.set(d.id, d.s3_key)
    }
    const list = []
    for (let i = 0; i < rows.length; i++) {
      const key = meta.get(ids[i]); const f = path.join(tmp, `${track}-${i}.mp3`)
      const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
      fs.writeFileSync(f, Buffer.from(await obj.Body.transformToByteArray()))
      const wav = f.replace(/\.mp3$/, '.wav')
      execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', f, '-ar', '44100', '-ac', '1', '-c:a', 'pcm_s16le', wav])
      if (i) list.push(gap(rows[i].speaker === rows[i - 1].speaker ? 350 : 700))
      list.push(wav)
    }
    const listFile = path.join(tmp, `${track}.txt`)
    fs.writeFileSync(listFile, list.map(f => `file '${f}'`).join('\n'))
    fs.mkdirSync(out, { recursive: true })
    const dest = path.join(out, `environment-conversation-${name}.webm`)
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-ar', '48000', '-ac', '1', '-c:a', 'libopus', '-b:a', '64k', dest])
    console.log(`wrote ${dest}`)
  }
  fs.rmSync(tmp, { recursive: true, force: true })
}

const run = { ingest, render, stitch }[cmd]
if (!run) { console.error('usage: ingest | render | stitch --out=<dir>'); process.exit(2) }
run().catch(err => { console.error(err.message); process.exit(1) })
