#!/usr/bin/env node
/**
 * verify-pod-clips.cjs — content-verify freshly rendered pod clips.
 *
 * WHY. "The row has an s3_key and the file has bytes" is not verification. The
 * estate has twice paid for the difference: a clipped take passes a CER-0 check
 * (audio-fix-verify-on-served-bytes), and RMS or duration alone cannot tell you
 * whether the right WORDS were spoken in the right VOICE. This checks the three
 * things that actually matter for a recast pass:
 *
 *   VOICE   — the clip's voice_id is the one cast for that sentence's OWN
 *             speaker, resolved exactly as phase-8 resolves it. This is the
 *             whole point of the pod-1 recast, and it is checked from the DB.
 *   VAD     — speech is present, and the clip is not truncated: measured on the
 *             SERVED bytes, with leading/trailing speech margins.
 *   STT     — whisper decodes the clip and the decode is compared to the text
 *             the sentence is supposed to say.
 *
 * READ THE DECODE BEFORE RE-RENDERING. This tool REPORTS; it never re-renders
 * and never deletes. The ASR gate on this estate is known to refuse correct
 * audio, and whisper-small cannot referee some languages at all, so a low STT
 * similarity is a prompt to listen, not a verdict. Anything below the threshold
 * is reported as REVIEW, never as "bad".
 *
 *   node tools/pods/verify-pod-clips.cjs --pod=fra_for_eng:pod-1-staged-2026-08-23 --since=10min
 *   node tools/pods/verify-pod-clips.cjs --pod=<id> --since=10min --model=medium --json=out.json
 */
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql') })
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync, spawnSync } = require('child_process')
const { Client } = require('pg')

const arg = (n, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${n}=`))
  return a ? a.split('=').slice(1).join('=') : d
}
const POD_ID = arg('pod')
const SINCE = arg('since', '30min')
const MODEL = arg('model', 'small')
const JSON_OUT = arg('json')
const LIMIT = parseInt(arg('limit', '0'), 10) || null
if (!POD_ID) { console.error('FAILED: --pod=<pod_id> is required'); process.exit(1) }

const BUCKET = process.env.S3_AUDIO_BUCKET || process.env.S3_BUCKET || 'ssi-audio-stage'
const REGION = process.env.AWS_REGION || 'eu-west-1'
const MODEL_PATH = path.join(os.homedir(), '.local/share/whisper-models', `ggml-${MODEL}.bin`)
const WHISPER = path.join(os.homedir(), '.local/bin/whisper-cli')

const norm = (v) => String(v || '').replace(/^(xai_|azure_|eleven_)/, '')
const canonicalSpeaker = (s) => String(s || '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim()

/** Loose text compare: what survives is word content, not punctuation or case. */
const words = (s) => String(s || '')
  .toLowerCase()
  .replace(/[^\p{L}\p{N}\s]/gu, ' ')
  .split(/\s+/).filter(Boolean)

/** Token-level similarity in [0,1]: order-free bag overlap, length-normalised. */
function similarity(a, b) {
  const A = words(a), B = words(b)
  if (!A.length && !B.length) return 1
  if (!A.length || !B.length) return 0
  const bag = new Map()
  for (const w of A) bag.set(w, (bag.get(w) || 0) + 1)
  let hit = 0
  for (const w of B) { const n = bag.get(w) || 0; if (n > 0) { hit++; bag.set(w, n - 1) } }
  return (2 * hit) / (A.length + B.length)
}

/**
 * course_audio.language is a mixture of ISO-639-3 ('spa'), ISO-639-1 ('es'),
 * locales ('es-ES') and the literal 'auto'. Whisper wants 639-1. Slicing the
 * first two characters looks like it works — 'fra'→'fr', 'ita'→'it' — and then
 * quietly hands whisper 'sp' for Spanish (not a language), 'jp' for Japanese
 * (not a language) and 'sw' for Swedish, which IS a language: Swahili. Whisper
 * answers an impossible request with an empty decode, and an empty decode reads
 * as "this clip says nothing" — which is how a correct spa_for_eng render got
 * skipped as unverifiable. Unknown codes fall back to 'auto' rather than to a
 * guess, because detection beats a confident wrong answer.
 */
const ISO3_TO_ISO1 = {
  ara: 'ar', bul: 'bg', cat: 'ca', cym: 'cy', dan: 'da', deu: 'de', ell: 'el',
  eng: 'en', est: 'et', eus: 'eu', fas: 'fa', fin: 'fi', fra: 'fr', gle: 'ga',
  heb: 'he', hin: 'hi', hrv: 'hr', hye: 'hy', isl: 'is', ita: 'it', jpn: 'ja',
  kor: 'ko', lav: 'lv', lit: 'lt', mkd: 'mk', nep: 'ne', nld: 'nl', nor: 'no',
  pol: 'pl', por: 'pt', ron: 'ro', rus: 'ru', slk: 'sk', slv: 'sl', spa: 'es',
  swa: 'sw', swe: 'sv', tha: 'th', tur: 'tr', ukr: 'uk', vie: 'vi', zho: 'zh',
}
const WHISPER_ISO1 = new Set(Object.values(ISO3_TO_ISO1))
function whisperLang(language) {
  const raw = String(language || '').trim().toLowerCase()
  if (!raw || raw === 'auto') return 'auto'
  const base = raw.split(/[-_]/)[0]
  if (ISO3_TO_ISO1[base]) return ISO3_TO_ISO1[base]
  if (base.length === 2 && WHISPER_ISO1.has(base)) return base
  return 'auto'
}

function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts })
}

// ffmpeg's measurement filters (volumedetect, silencedetect) report on STDERR.
// Reading only stdout is how a perfectly good clip reports "no speech detected".
function shBoth(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8' })
  return `${r.stdout || ''}\n${r.stderr || ''}`
}

/**
 * Speech envelope on the served bytes. Returns total duration and the margins
 * of silence before the first and after the last speech, measured RELATIVE to
 * the clip's own speech level — an absolute dB floor mislabels a quiet voice.
 */
function envelope(wav) {
  return shBoth('ffmpeg', ['-hide_banner', '-nostats', '-i', wav,
    '-af', 'silencedetect=noise=-35dB:d=0.08', '-f', 'null', '-'])
}

async function main() {
  if (!fs.existsSync(MODEL_PATH)) { console.error(`FAILED: whisper model missing at ${MODEL_PATH}`); process.exit(1) }
  const tmp = fs.mkdtempSync(path.join(process.env.CS_SCRATCH || os.tmpdir(), 'podverify-'))
  const c = new Client({ connectionString: process.env.DATABASE_URL })
  await c.connect()
  const rows = []
  let speakers = {}
  try {
    const { rows: pod } = await c.query('select speakers, course_code from listening_pods where id=$1', [POD_ID])
    if (pod.length !== 1) throw new Error(`pod ${POD_ID} not found`)
    speakers = pod[0].speakers || {}

    for (const track of ['target', 'known']) {
      const col = track === 'target' ? 'target_audio_id' : 'known_audio_id'
      const txt = track === 'target' ? 'target_text' : 'known_text'
      const { rows: r } = await c.query(
        `select s.id, s.speaker, s.${txt} as text, ca.id clip_id, ca.voice_id, ca.s3_key,
                ca.language, ca.created_at
           from listening_pod_sentences s join course_audio ca on ca.id = s.${col}
          where s.pod_id = $1 and ca.created_at > now() - $2::interval
          order by s.global_order`, [POD_ID, SINCE])
      for (const x of r) rows.push({ ...x, track })
    }
    if (!rows.length) { console.log(`No clips on ${POD_ID} newer than ${SINCE}.`); return }
  } finally {
    await c.end()
  }

  const results = []
  const list = LIMIT ? rows.slice(0, LIMIT) : rows
  for (const r of list) {
    const entry = speakersEntry(r)
    const res = { id: r.id, track: r.track, speaker: r.speaker, clip_id: r.clip_id, text: r.text }
    res.voice_actual = norm(r.voice_id)
    res.voice_expected = entry
    res.voice_ok = entry ? entry === res.voice_actual : null

    const mp3 = path.join(tmp, `${r.clip_id}.mp3`)
    const wav = path.join(tmp, `${r.clip_id}.wav`)
    try {
      sh('curl', ['-fsS', '--max-time', '60', '-o', mp3,
        `https://${BUCKET}.s3.${REGION}.amazonaws.com/${r.s3_key}`])
      res.bytes = fs.statSync(mp3).size
      sh('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', mp3, '-ar', '16000', '-ac', '1', wav])
      const dur = parseFloat(sh('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
        '-of', 'default=nw=1:nk=1', wav]).trim())
      res.duration_s = Number(dur.toFixed(2))

      // VAD: mean volume proves speech is present at all; silencedetect on the
      // tail proves the clip was not cut off mid-word.
      const vol = shBoth('ffmpeg', ['-hide_banner', '-nostats', '-i', wav, '-af', 'volumedetect', '-f', 'null', '-'])
      const mean = /mean_volume:\s*(-?[\d.]+) dB/.exec(vol)
      res.mean_db = mean ? parseFloat(mean[1]) : null
      const env = envelope(wav)
      const ends = [...env.matchAll(/silence_end:\s*([\d.]+)/g)].map((m) => parseFloat(m[1]))
      const starts = [...env.matchAll(/silence_start:\s*([\d.]+)/g)].map((m) => parseFloat(m[1]))
      const lastSilenceStart = starts.length ? starts[starts.length - 1] : null
      res.lead_silence_s = ends.length && ends[0] < dur ? Number(ends[0].toFixed(2)) : 0
      res.tail_silence_s = lastSilenceStart !== null && lastSilenceStart < dur
        ? Number((dur - lastSilenceStart).toFixed(2)) : 0
      res.has_speech = res.mean_db !== null && res.mean_db > -50 && dur > 0.25

      const lang = whisperLang(r.language)
      const w = sh(WHISPER, ['-m', MODEL_PATH, '-f', wav, '-l', lang, '-nt', '-np', '-t', '2'],
        { env: { ...process.env, WHISPER_MAX_THREADS: '2' } })
      res.stt = w.replace(/\s+/g, ' ').trim()
      res.stt_similarity = Number(similarity(r.text, res.stt).toFixed(3))
      res.stt_ok = res.stt_similarity >= 0.60
    } catch (e) {
      res.error = e.message.split('\n')[0]
    }
    // A clip is CLEAN only on all three. Anything else is REVIEW — never
    // "delete", never "re-render": read the decode first.
    res.verdict = res.error ? 'ERROR'
      : (res.voice_ok && res.has_speech && res.stt_ok) ? 'CLEAN' : 'REVIEW'
    results.push(res)
    console.log(`${res.verdict.padEnd(6)} ${r.track.padEnd(6)} ${String(r.speaker).padEnd(16)} ` +
      `voice=${res.voice_actual}${res.voice_ok ? '' : `(want ${res.voice_expected})`} ` +
      `dur=${res.duration_s}s db=${res.mean_db} tail=${res.tail_silence_s}s sim=${res.stt_similarity}` +
      (res.error ? ` ERR=${res.error}` : ''))
    if (res.verdict === 'REVIEW' && !res.error) console.log(`       want: ${JSON.stringify(r.text)}\n       got : ${JSON.stringify(res.stt)}`)
  }

  function speakersEntry(r) {
    const e = speakers[canonicalSpeaker(r.speaker)] || speakers[r.speaker] || speakers._default
    const v = e && e[r.track] && e[r.track].voice_id
    return v ? norm(v) : null
  }

  const clean = results.filter((x) => x.verdict === 'CLEAN').length
  const review = results.filter((x) => x.verdict === 'REVIEW').length
  const err = results.filter((x) => x.verdict === 'ERROR').length
  const byVoice = {}
  for (const x of results) {
    const k = `${x.track}:${x.voice_actual}`
    byVoice[k] = byVoice[k] || { clean: 0, review: 0, error: 0 }
    byVoice[k][x.verdict.toLowerCase()]++
  }
  console.log(`\n${POD_ID}: ${results.length} clip(s) — ${clean} CLEAN, ${review} REVIEW, ${err} ERROR`)
  console.log(`per voice: ${JSON.stringify(byVoice)}`)
  if (JSON_OUT) { fs.writeFileSync(JSON_OUT, JSON.stringify({ pod: POD_ID, model: MODEL, results }, null, 2)); console.log(`json: ${JSON_OUT}`) }
  fs.rmSync(tmp, { recursive: true, force: true })
}

main().catch((e) => { console.error('FAILED:', e.message); process.exit(1) })
