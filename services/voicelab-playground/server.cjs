/**
 * VOICELAB PLAYGROUND — type a sentence, pick a voice, hear it, read the verdict.
 *
 * The bench at /admin/configs/voice answers structured questions (audition from the
 * store, compare blind, declare, drift). This answers the unstructured one Tom asked
 * on 2026-08-06: "where is the voice lab for me to play with?" — one box, any sentence,
 * any voice, one clip, the six gates next to it.
 *
 * It REUSES rather than restates:
 *   - services/tts-service.cjs          the generation path (xAI and Azure)
 *   - phase8's masterAudio              the SAME mastering the course pipeline applies
 *   - services/audio-intelligence/gate-stack.cjs   the six-gate verdict, as landed
 *   - tools/pod-voices-xai.json         the xAI voice catalogue
 *   - course_audio                      which voices this estate actually uses today
 *
 * SPEND: one clip per request, never a batch. Text is capped, the running spend is
 * displayed, and a daily ceiling refuses rather than quietly costing money. At xAI's
 * $15/1M characters a 200-character sentence is $0.003.
 *
 * Nothing here writes to course_audio, binds a slot, or deletes anything. Clips live
 * on this box under CLIP_DIR and are served straight back.
 */

require('dotenv').config({ quiet: true })

const http = require('http')
const fs = require('fs')
const os = require('os')
const path = require('path')
const crypto = require('crypto')

// The gate stack shells out to whisper for phonology and words. Point it at the binary
// this box has before anything requires it, so an unset env is not read as "unchecked".
process.env.WHISPER = process.env.WHISPER || path.join(os.homedir(), '.local/bin/whisper-cli')
process.env.WHISPER_MODEL = process.env.WHISPER_MODEL || path.join(os.homedir(), '.local/share/whisper-models/ggml-small.bin')

// phase8 is an express service as well as a library; this is its own documented gate for
// requiring it purely for the named helpers, and it must be set BEFORE the require.
process.env.PHASE8_NO_LISTEN = '1'

const { generate, detectSpokenLanguage } = require('../tts-service.cjs')
// The gate stack judges MASTERED bytes — raw TTS lands 6-12 LUFS under the band, so
// gating the raw render would fail loudness on every clip and say nothing. This is the
// very function the course pipeline calls before it uploads.
const { masterAudio } = require('../phases/phase8-audio-v13.cjs')
const gateStack = require('../audio-intelligence/gate-stack.cjs')
const xaiCatalogue = require('../../tools/pod-voices-xai.json')

const PORT = Number(process.env.VOICELAB_PORT || 4790)
const CLIP_DIR = process.env.VOICELAB_CLIP_DIR || path.join(__dirname, '../../scripts/voicelab-playground-clips')
const LEDGER = path.join(CLIP_DIR, 'ledger.jsonl')
const MAX_CHARS = 300
const DAILY_CHAR_CEILING = Number(process.env.VOICELAB_DAILY_CHARS || 60000) // ≈ $0.90/day at xAI rates
const XAI_USD_PER_MILLION_CHARS = 15

fs.mkdirSync(CLIP_DIR, { recursive: true })

// ── Tom's clone ────────────────────────────────────────────────────────────────────
// VOICELAB 01 (docs/audio/voicelab-01-tom-clone-multilingual-2026-08-06.md) probed this
// clone in German, French and Spanish: clean on plain target-language rendering.
const TOM_CLONE = { id: 'gfzdpspr5fdp', name: "Tom's clone", provider: 'xai', gender: 'm', clone: true }

// ── Languages ──────────────────────────────────────────────────────────────────────
// Keyed by the estate's canonical ISO 639-3; `steer` is what the providers are handed.
const LANGUAGES = [
  { code: 'deu', name: 'German', steer: 'de', catalogue: 'de', azureLocale: 'de-DE' },
  { code: 'fra', name: 'French', steer: 'fr', catalogue: 'fr', azureLocale: 'fr-FR' },
  { code: 'spa', name: 'Spanish', steer: 'es', catalogue: 'es', azureLocale: 'es-ES' },
  { code: 'ita', name: 'Italian', steer: 'it', catalogue: 'it', azureLocale: 'it-IT' },
  { code: 'nld', name: 'Dutch', steer: 'nl', catalogue: 'nl', azureLocale: 'nl-NL' },
  { code: 'por', name: 'Portuguese', steer: 'pt', catalogue: 'pt', azureLocale: 'pt-PT' },
  { code: 'pol', name: 'Polish', steer: 'pl', catalogue: 'pl', azureLocale: 'pl-PL' },
  { code: 'tur', name: 'Turkish', steer: 'tr', catalogue: 'tr', azureLocale: 'tr-TR' },
  { code: 'rus', name: 'Russian', steer: 'ru', catalogue: 'ru', azureLocale: 'ru-RU' },
  { code: 'jpn', name: 'Japanese', steer: 'ja', catalogue: 'ja', azureLocale: 'ja-JP' },
  { code: 'kor', name: 'Korean', steer: 'ko', catalogue: 'ko', azureLocale: 'ko-KR' },
  { code: 'cmn', name: 'Mandarin', steer: 'zh', catalogue: 'zh-CN', azureLocale: 'zh-CN' },
  { code: 'ara', name: 'Arabic', steer: 'ar', catalogue: 'ar', azureLocale: 'ar-EG' },
  { code: 'hin', name: 'Hindi', steer: 'hi', catalogue: 'hi', azureLocale: 'hi-IN' },
  { code: 'vie', name: 'Vietnamese', steer: 'vi', catalogue: 'vi', azureLocale: 'vi-VN' },
  { code: 'eng', name: 'English', steer: 'en', catalogue: 'en', azureLocale: 'en-GB' },
]

/**
 * The voice menu for one language: Tom's clone first, then xAI's catalogue for that
 * language, then xAI's multilingual voices, then the Azure voices this estate has
 * actually used for the language (read from course_audio, so the list is evidence
 * rather than invention).
 */
function voicesFor (lang, production) {
  const seen = new Set()
  const out = []
  const push = (v) => {
    const key = `${v.provider}:${v.id}`
    if (seen.has(key)) return
    seen.add(key)
    out.push(v)
  }

  push({ ...TOM_CLONE, group: 'Clone' })

  for (const v of xaiCatalogue[lang.catalogue] || []) {
    push({ id: v.voice_id, name: v.name, provider: 'xai', gender: v.gender, group: `xAI · ${lang.name}` })
  }
  for (const v of xaiCatalogue.multilingual || []) {
    push({ id: v.voice_id, name: v.name, provider: 'xai', gender: v.gender, group: 'xAI · multilingual' })
  }
  for (const v of production[lang.code] || []) {
    push({ ...v, group: 'In the estate today' })
  }
  return out
}

// ── What the estate actually uses, read once at boot ────────────────────────────────
// A voice id in course_audio is stored canonically (`xai_ara`) or bare (`ara`); the
// provider prefix is the evidence of which provider to call. Anything unrecognised is
// left out rather than guessed at.
let PRODUCTION_VOICES = {}
let productionNote = 'not read'

async function loadProductionVoices () {
  const envPath = path.join(__dirname, '../../.env.psql')
  if (!fs.existsSync(envPath)) { productionNote = 'no .env.psql on this box — estate voice list omitted'; return }
  const url = (fs.readFileSync(envPath, 'utf8').match(/DATABASE_URL\s*=\s*(.+)/) || [])[1]
  if (!url) { productionNote = '.env.psql has no DATABASE_URL — estate voice list omitted'; return }

  const psql = path.join(os.homedir(), '.local/pg17/bin/psql')
  if (!fs.existsSync(psql)) { productionNote = 'no psql on this box — estate voice list omitted'; return }

  // The connection string carries the password, and an argv is world-readable in `ps`.
  // Hand psql the parts through libpq's environment variables instead, so the secret
  // never appears in a process listing on this box.
  let env
  try {
    const u = new URL(url.trim().replace(/^["']|["']$/g, ''))
    env = {
      ...process.env,
      PGHOST: u.hostname,
      PGPORT: u.port || '5432',
      PGUSER: decodeURIComponent(u.username),
      PGPASSWORD: decodeURIComponent(u.password),
      PGDATABASE: u.pathname.replace(/^\//, '') || 'postgres',
    }
  } catch (e) { productionNote = `.env.psql DATABASE_URL is not parseable — estate voice list omitted`; return }

  // execFile, not execFileSync: a synchronous child would block the event loop and hold
  // the listen callback for the whole query, which is the opposite of listen-first.
  const execFile = require('util').promisify(require('child_process').execFile)
  const codes = LANGUAGES.map((l) => `'${l.code}'`).join(',')
  const sql = `select language, voice_id, count(*) from course_audio where language in (${codes}) group by 1,2 having count(*) > 200 order by 1, 3 desc`
  let rows
  try {
    rows = (await execFile(psql, ['-At', '-F', '|', '-c', sql], { encoding: 'utf8', timeout: 30000, env })).stdout
  } catch (e) {
    productionNote = `course_audio query failed (${String(e.message).split('\n')[0]}) — estate voice list omitted`
    return
  }

  const map = {}
  for (const line of rows.trim().split('\n').filter(Boolean)) {
    const [language, rawVoice, count] = line.split('|')
    const v = describeStoredVoice(rawVoice, Number(count))
    if (!v) continue
    ;(map[language] = map[language] || []).push(v)
  }
  PRODUCTION_VOICES = map
  productionNote = `read from course_audio: ${Object.values(map).reduce((n, a) => n + a.length, 0)} voices across ${Object.keys(map).length} languages`
}

/** Turn a stored voice_id into something renderable, or null if it is not renderable. */
function describeStoredVoice (raw, count) {
  const id = String(raw || '')
  if (/^(legacy_import|human|human_recording)$/.test(id)) return null
  if (id.startsWith('elevenlabs_')) return null // no ElevenLabs key wired here; say nothing rather than fail at render
  if (id.startsWith('narakeet_')) return null

  const azure = id.startsWith('azure_') ? id.slice(6) : (/Neural$/.test(id) ? id : null)
  if (azure) return { id: azure, name: azure.replace(/Neural$/, '').split('-').slice(2).join('-') || azure, provider: 'azure', clips: count }

  const xai = id.startsWith('xai_') ? id.slice(4) : id
  if (xai === TOM_CLONE.id) return null // already at the top of the list
  return { id: xai, name: xai, provider: 'xai', clips: count }
}

// ── Spend ledger ───────────────────────────────────────────────────────────────────
function todayKey () { return new Date().toISOString().slice(0, 10) }

function readLedger () {
  if (!fs.existsSync(LEDGER)) return []
  return fs.readFileSync(LEDGER, 'utf8').trim().split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
}

function spentToday (ledger) {
  const day = todayKey()
  return ledger.filter((r) => String(r.at || '').slice(0, 10) === day).reduce((n, r) => n + (r.chars || 0), 0)
}

/** One record per clip, written beside its mp3, so history survives a restart. */
function recordPath (id) { return path.join(CLIP_DIR, `${id}.json`) }
function writeRecord (rec) { fs.writeFileSync(recordPath(rec.id), JSON.stringify(rec)) }
function readRecord (id) {
  try { return JSON.parse(fs.readFileSync(recordPath(id), 'utf8')) } catch { return null }
}

// ── Render one clip, then judge it ─────────────────────────────────────────────────
// Rendering and mastering take about two seconds; the two whisper passes the gate stack
// runs (phonology, then words) take the best part of a minute on this box. So the clip
// comes back the moment it is playable and the verdict arrives after — Tom listens with
// his ear while the machine is still making up its mind, which is the right order anyway.
async function renderAndMaster ({ text, language, voiceId, provider }) {
  const lang = LANGUAGES.find((l) => l.code === language)
  if (!lang) throw Object.assign(new Error(`unknown language ${language}`), { status: 400 })

  const config = provider === 'azure'
    ? {
        subscriptionKey: process.env.AZURE_SPEECH_KEY,
        region: process.env.AZURE_SPEECH_REGION || 'westeurope',
        voiceName: voiceId,
        speed: 1.0,
      }
    : { apiKey: process.env.XAI_API_KEY, voiceId, language: lang.steer, codec: 'mp3' }

  const t0 = Date.now()
  const { audioBuffer } = await generate(text, provider, config)
  const renderMs = Date.now() - t0

  // Master exactly as the course pipeline does, so what Tom hears and what the gates
  // judge are the same bytes a learner would get.
  const tm = Date.now()
  const { buffer: mastered, durationMs } = await masterAudio(audioBuffer, text)
  const masterMs = Date.now() - tm

  const id = crypto.randomBytes(6).toString('hex')
  const file = path.join(CLIP_DIR, `${id}.mp3`)
  fs.writeFileSync(file, mastered)

  const rec = {
    id,
    at: new Date().toISOString(),
    text,
    language: lang.code,
    languageName: lang.name,
    steeredLanguage: lang.steer,
    voiceId,
    voiceName: voiceId,
    provider,
    bytes: mastered.length,
    durationMs,
    chars: text.length,
    costUsd: provider === 'xai' ? +(text.length / 1e6 * XAI_USD_PER_MILLION_CHARS).toFixed(5) : null,
    renderMs,
    masterMs,
    gateMs: null,
    url: `/clip/${id}.mp3`,
    verdict: null,
    summary: 'gating…',
  }
  writeRecord(rec)
  return { rec, mastered, lang }
}

/**
 * The gate stack, exactly as landed. `role: 'admission'` is the honest label: the
 * question being asked is "would this clip be allowed into the store".
 */
async function judge (rec, mastered) {
  const t1 = Date.now()
  try {
    const verdict = await gateStack.evaluate(
      { audio: mastered, text: rec.text, language: rec.language, voiceId: rec.voiceId, provider: rec.provider },
      { role: 'admission', detectSpokenLanguage }
    )
    const done = { ...readRecord(rec.id) || rec, gateMs: Date.now() - t1, verdict, summary: gateStack.summarise(verdict) }
    writeRecord(done)
    console.log(`[voicelab] ${done.language}/${done.provider}/${done.voiceId} ${done.chars}ch → ${verdict.outcome} · ${done.summary}`)
  } catch (e) {
    // A gate stack that crashed is not a pass, and the screen must say so rather than
    // spinning forever.
    const failed = { ...readRecord(rec.id) || rec, gateMs: Date.now() - t1, verdict: null, gateError: e.message, summary: `gates could not run — ${e.message}` }
    writeRecord(failed)
    console.error(`[voicelab] gate stack failed on ${rec.id}: ${e.message}`)
  }
}

// ── HTTP ───────────────────────────────────────────────────────────────────────────
function json (res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(payload)
}

function readBody (req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (c) => {
      raw += c
      if (raw.length > 64 * 1024) { reject(new Error('body too large')); req.destroy() }
    })
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}) } catch (e) { reject(e) } })
    req.on('error', reject)
  })
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)

  try {
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      const html = fs.readFileSync(path.join(__dirname, 'index.html'))
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
      return res.end(html)
    }

    if (req.method === 'GET' && url.pathname === '/api/voices') {
      const ledger = readLedger()
      return json(res, 200, {
        languages: LANGUAGES.map((l) => ({ code: l.code, name: l.name, steer: l.steer, voices: voicesFor(l, PRODUCTION_VOICES) })),
        maxChars: MAX_CHARS,
        spend: { charsToday: spentToday(ledger), ceiling: DAILY_CHAR_CEILING, usdToday: +(spentToday(ledger) / 1e6 * XAI_USD_PER_MILLION_CHARS).toFixed(4) },
        productionNote,
        gates: gateStack.GATES,
      })
    }

    if (req.method === 'GET' && url.pathname === '/api/history') {
      const ids = fs.readdirSync(CLIP_DIR).filter((f) => /^[a-f0-9]{12}\.json$/.test(f)).map((f) => f.slice(0, 12))
      const clips = ids.map(readRecord).filter(Boolean).sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 25)
      return json(res, 200, { clips })
    }

    // The verdict for one clip, or null while the whisper passes are still running.
    if (req.method === 'GET' && /^\/api\/verdict\/[a-f0-9]{12}$/.test(url.pathname)) {
      const rec = readRecord(url.pathname.split('/').pop())
      if (!rec) return json(res, 404, { error: 'unknown clip' })
      return json(res, 200, { clip: rec })
    }

    if (req.method === 'GET' && url.pathname.startsWith('/clip/')) {
      const name = path.basename(url.pathname)
      if (!/^[a-f0-9]{12}\.mp3$/.test(name)) return json(res, 404, { error: 'not found' })
      const file = path.join(CLIP_DIR, name)
      if (!fs.existsSync(file)) return json(res, 404, { error: 'clip gone' })
      const stat = fs.statSync(file)
      res.writeHead(200, { 'content-type': 'audio/mpeg', 'content-length': stat.size, 'accept-ranges': 'none', 'cache-control': 'public, max-age=86400' })
      return fs.createReadStream(file).pipe(res)
    }

    if (req.method === 'POST' && url.pathname === '/api/generate') {
      const body = await readBody(req)
      const text = String(body.text || '').trim()
      const voiceId = String(body.voiceId || '').trim()
      const provider = String(body.provider || 'xai').trim()
      const language = String(body.language || '').trim()

      if (!text) return json(res, 400, { error: 'Type a sentence first.' })
      if (text.length > MAX_CHARS) return json(res, 400, { error: `That is ${text.length} characters; the cap is ${MAX_CHARS}. This is a playground, not a batch renderer.` })
      if (!voiceId) return json(res, 400, { error: 'Pick a voice.' })
      if (!['xai', 'azure'].includes(provider)) return json(res, 400, { error: `Unknown provider ${provider}.` })

      const ledger = readLedger()
      const spent = spentToday(ledger)
      if (spent + text.length > DAILY_CHAR_CEILING) {
        return json(res, 429, { error: `Daily character ceiling reached (${spent}/${DAILY_CHAR_CEILING} today). Raise VOICELAB_DAILY_CHARS if that is deliberate — it exists so a stuck finger cannot spend money.` })
      }

      const { rec, mastered } = await renderAndMaster({ text, language, voiceId, provider })
      rec.voiceName = String(body.voiceName || '').trim().slice(0, 60) || voiceId
      writeRecord(rec)
      // The spend is recorded the moment the money is spent, not when the gates finish.
      fs.appendFileSync(LEDGER, JSON.stringify({ id: rec.id, at: rec.at, chars: rec.chars, provider: rec.provider, voiceId: rec.voiceId, language: rec.language }) + '\n')
      judge(rec, mastered) // deliberately not awaited — the client polls /api/verdict/:id
      return json(res, 200, { clip: rec, spend: { charsToday: spent + text.length, ceiling: DAILY_CHAR_CEILING } })
    }

    if (req.method === 'GET' && url.pathname === '/healthz') {
      return json(res, 200, { ok: true, port: PORT, clipDir: CLIP_DIR, productionNote })
    }

    return json(res, 404, { error: 'not found' })
  } catch (err) {
    console.error('[voicelab] error', err)
    return json(res, err.status || 500, { error: err.message || String(err) })
  }
})

// Listen first, read the estate second: the census query is a nicety and must never be
// what stands between a restart and a working page. Until it lands, the menu is the
// clone plus the xAI catalogue, and `productionNote` says so on screen.
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[voicelab] playground on http://0.0.0.0:${PORT}`)
  console.log(`[voicelab] clips → ${CLIP_DIR}`)
})

productionNote = 'reading course_audio…'
loadProductionVoices()
  .catch((e) => { productionNote = `estate voice list omitted — ${e.message}` })
  .finally(() => console.log(`[voicelab] ${productionNote}`))
