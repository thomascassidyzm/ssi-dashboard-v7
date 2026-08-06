#!/usr/bin/env node
/**
 * Generate welcome audio for ara_lb (Lebanese) + ara_sy (Syrian) targets across all
 * known langs that have those slots in their welcome template.
 *
 * Mirrors the approach of generate-welcomes.cjs but filters to only these 2 targets,
 * so we don't sweep up unrelated older missing entries.
 *
 * Output: same per-lang directory + manifest as generate-welcomes.cjs, plus appends
 * to the same _progress.json so a future generate-welcomes.cjs --resume sees them done.
 *
 * Usage:
 *   --plan      Show what would be generated
 *   --execute   Generate audio files
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') })

const fs = require('fs')
const path = require('path')
const { v4: uuidv4 } = require('uuid')

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
const DATA_DIR = path.join(__dirname, 'data')
const WELCOMES_DIR = path.join(DATA_DIR, 'translations/welcomes')
const OUT_BASE = path.join(__dirname, 'generated/welcomes/production')
const PROGRESS_FILE = path.join(OUT_BASE, '_progress.json')
const CONCURRENCY = 8
const TARGETS = ['ara_lb', 'ara_sy']

const LANG_CODE_MAP = {
  ara: 'ar', bul: 'bg', cmn: 'zh', hrv: 'hr', ces: 'cs', dan: 'da', nld: 'nl',
  fil: 'fil', fin: 'fi', fra: 'fr', deu: 'de', ell: 'el', hin: 'hi', ind: 'id',
  ita: 'it', jpn: 'ja', kor: 'ko', msa: 'ms', pol: 'pl', por: 'pt', ron: 'ro',
  rus: 'ru', slk: 'sk', spa: 'es', swe: 'sv', tam: 'ta', tur: 'tr', ukr: 'uk'
}

let _fetch = null
async function getFetch() { if (!_fetch) _fetch = (await import('node-fetch')).default; return _fetch }

async function generateWithRetry(voiceId, text, langCode, maxRetries = 3) {
  const fetch = await getFetch()
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const body = { text, model_id: 'eleven_v3', voice_settings: { voice_stability: 0.4 } }
    if (langCode) body.language_code = langCode
    try {
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: { 'Accept': 'audio/mpeg', 'Content-Type': 'application/json', 'xi-api-key': ELEVENLABS_API_KEY },
        body: JSON.stringify(body)
      })
      if (res.status === 429) {
        const wait = Math.min(2000 * Math.pow(2, attempt), 30000)
        await new Promise(r => setTimeout(r, wait))
        continue
      }
      if (!res.ok) {
        const err = await res.text()
        if (attempt < maxRetries) { await new Promise(r => setTimeout(r, 1000 * attempt)); continue }
        return { success: false, error: err.slice(0, 200), status: res.status }
      }
      return { success: true, buffer: Buffer.from(await res.arrayBuffer()) }
    } catch (e) {
      if (attempt < maxRetries) { await new Promise(r => setTimeout(r, 2000 * attempt)); continue }
      return { success: false, error: e.message, status: 0 }
    }
  }
  return { success: false, error: 'retries exhausted', status: 429 }
}

function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'))
  return { completed: {} }
}
function saveProgress(p) { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2)) }

function expand(template, inKnown, slot) {
  return template
    .replace(/\{in_target\}/g, slot.in_target || '')
    .replace(/\{a_target_speaker\}/g, slot.a_target_speaker || '')
    .replace(/\{target_speakers\}/g, slot.target_speakers || '')
    .replace(/\{in_known\}/g, inKnown || '')
}

async function runPool(tasks, concurrency) {
  let idx = 0
  async function worker() { while (idx < tasks.length) { const i = idx++; await tasks[i]() } }
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker))
}

async function main() {
  const isPlan = process.argv.includes('--plan')
  const isExecute = process.argv.includes('--execute')
  if (!isPlan && !isExecute) {
    console.log('Usage: --plan | --execute')
    process.exit(0)
  }

  const voices = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'voices.json'), 'utf8'))
  const selections = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'voice-selections.json'), 'utf8'))
  const knownLangs = Object.keys(selections).filter(k => !k.startsWith('_'))

  const progress = loadProgress()
  const allJobs = []

  for (const knownLang of knownLangs) {
    const wp = path.join(WELCOMES_DIR, `${knownLang}.json`)
    if (!fs.existsSync(wp)) continue
    const sel = selections[knownLang]
    if (!sel) continue
    const voice = voices.voices[knownLang]?.voices?.[sel.index]
    if (!voice) continue
    const welcome = JSON.parse(fs.readFileSync(wp, 'utf8'))

    for (const targetLang of TARGETS) {
      const slot = welcome.targets?.[targetLang]
      if (!slot) continue
      const key = `${knownLang}:${targetLang}`
      if (progress.completed[key]) continue
      const text = expand(welcome.template, welcome.in_known, slot)
      allJobs.push({
        knownLang, targetLang, text,
        voice_id: voice.voice_id, voice_name: voice.name,
        lang_code: LANG_CODE_MAP[knownLang] || null,
        langDir: path.join(OUT_BASE, knownLang),
        key
      })
    }
  }

  const totalChars = allJobs.reduce((s, j) => s + j.text.length, 0)
  console.log(`\n=== ara_lb + ara_sy welcome generation ===`)
  console.log(`Jobs: ${allJobs.length}  Total chars: ${totalChars}`)
  console.log(`By known lang:`)
  const byLang = {}
  for (const j of allJobs) {
    byLang[j.knownLang] = byLang[j.knownLang] || { count: 0, chars: 0 }
    byLang[j.knownLang].count++
    byLang[j.knownLang].chars += j.text.length
  }
  for (const [k, v] of Object.entries(byLang)) {
    console.log(`  ${k}: ${v.count} jobs, ${v.chars} chars`)
  }

  if (isPlan) {
    console.log(`\nDry-run. Re-run with --execute.`)
    return
  }

  if (!ELEVENLABS_API_KEY) { console.error('Missing ELEVENLABS_API_KEY'); process.exit(1) }

  // Per-lang manifests
  const manifests = {}
  for (const j of allJobs) {
    if (!manifests[j.knownLang]) {
      const mp = path.join(OUT_BASE, j.knownLang, '_manifest.json')
      manifests[j.knownLang] = fs.existsSync(mp) ? JSON.parse(fs.readFileSync(mp, 'utf8')) : {
        known_language: j.knownLang,
        voice: { voice_id: j.voice_id, name: j.voice_name },
        settings: { model: 'eleven_v3', voice_stability: 0.4, language_code: j.lang_code },
        welcomes: []
      }
      fs.mkdirSync(j.langDir, { recursive: true })
    }
  }

  let completed = 0, success = 0, failed = []
  const startTime = Date.now()

  const tasks = allJobs.map(job => async () => {
    const result = await generateWithRetry(job.voice_id, job.text, job.lang_code)
    completed++
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
    const label = `${job.knownLang}→${job.targetLang}`
    if (result.success) {
      const uuid = uuidv4().toUpperCase()
      const filename = `${uuid}.mp3`
      fs.writeFileSync(path.join(job.langDir, filename), result.buffer)
      const kb = (result.buffer.length / 1024).toFixed(1)
      console.log(`[${completed}/${allJobs.length} ${elapsed}s] ${label} OK (${kb}kb)`)
      success++
      manifests[job.knownLang].welcomes.push({
        uuid, target_language: job.targetLang, text: job.text, file: filename, size_kb: parseFloat(kb)
      })
      progress.completed[job.key] = { uuid, file: filename }
    } else {
      console.log(`[${completed}/${allJobs.length} ${elapsed}s] ${label} FAILED (${result.status}): ${(result.error || '').slice(0, 80)}`)
      failed.push({ key: job.key, error: result.error })
    }
  })

  await runPool(tasks, CONCURRENCY)

  // Save progress + manifests
  saveProgress(progress)
  for (const lang of Object.keys(manifests)) {
    const mp = path.join(OUT_BASE, lang, '_manifest.json')
    manifests[lang].generated_at = new Date().toISOString()
    fs.writeFileSync(mp, JSON.stringify(manifests[lang], null, 2))
  }

  console.log(`\n=== DONE === ok=${success} failed=${failed.length}`)
  if (failed.length) {
    for (const f of failed) console.log(`  ${f.key}: ${(f.error || '').slice(0, 80)}`)
  }
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
