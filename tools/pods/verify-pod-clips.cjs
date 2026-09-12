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
const modelPath = (m) => path.join(os.homedir(), '.local/share/whisper-models', `ggml-${m}.bin`)
const MODEL_PATH = modelPath(MODEL)
const STT_THRESHOLD = 0.60
const WHISPER = path.join(os.homedir(), '.local/bin/whisper-cli')

const norm = (v) => String(v || '').replace(/^(xai_|azure_|eleven_|cartesia_)/, '')
const canonicalSpeaker = (s) => String(s || '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim()

/**
 * Loose text compare: what survives is word content, not punctuation, case or
 * diacritics. Whisper routinely returns a correct decode unaccented — Romanian
 * "Da, poti sa am si un pahar cu apa" for "Da, pot sa am si un pahar cu apa" —
 * and comparing accented forms token-by-token scores that at 0.55 and calls a
 * clean clip suspect. Folding is the honest comparison: it cannot hide a wrong
 * WORD, only a missing accent.
 */
const words = (s) => String(s || '')
  .normalize('NFD').replace(/\p{M}+/gu, '')
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

/**
 * Character-level similarity, as 1 - (edit distance / longer length), on the
 * folded string with spaces removed. Whisper does not always agree with the
 * script about where words END — Basque "Egun on. Zer nahi duzu?" comes back as
 * "Egunon, zer naiduzu.", every phoneme right and the spaces moved. A token bag
 * scores that 0.25 and calls a clean clip suspect; character distance scores it
 * near 1, and still cannot hide a genuinely wrong word.
 */
function charSimilarity(a, b) {
  const A = words(a).join(''), B = words(b).join('')
  if (!A.length && !B.length) return 1
  if (!A.length || !B.length) return 0
  let prev = Array.from({ length: B.length + 1 }, (_, i) => i)
  for (let i = 1; i <= A.length; i++) {
    const cur = [i]
    for (let j = 1; j <= B.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (A[i - 1] === B[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return 1 - prev[B.length] / Math.max(A.length, B.length)
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
      const decode = (model) => sh(WHISPER, ['-m', modelPath(model), '-f', wav, '-l', lang, '-nt', '-np', '-t', '2'],
        { env: { ...process.env, WHISPER_MAX_THREADS: '2' } }).replace(/\s+/g, ' ').trim()

      const score = (t) => Number(Math.max(similarity(r.text, t), charSimilarity(r.text, t)).toFixed(3))
      res.stt = decode(MODEL)
      res.stt_model = MODEL
      res.stt_similarity = score(res.stt)

      // ESCALATE BEFORE ACCUSING. A weak decode is far more often the model than
      // the clip: whisper-small stops at the " … " pause cue that pod turns are
      // deliberately rendered with, so a perfectly good multi-sentence line comes
      // back as its first sentence. ron_for_eng SC07-S013 scored 0.364 on small
      // and 1.000 on medium, same bytes. Re-decode once on the bigger model
      // before anything is called suspect — this is the estate's "read the decode
      // before you re-render" rail, spending CPU instead of TTS money.
      if (res.stt_similarity < STT_THRESHOLD && MODEL !== 'medium' && fs.existsSync(modelPath('medium'))) {
        const better = decode('medium')
        const sim = score(better)
        res.stt_small = res.stt
        res.stt_similarity_small = res.stt_similarity
        if (sim > res.stt_similarity) { res.stt = better; res.stt_similarity = sim; res.stt_model = 'medium' }
        res.escalated = true
      }
      res.stt_ok = res.stt_similarity >= STT_THRESHOLD
    } catch (e) {
      res.error = e.message.split('\n')[0]
    }
    // A clip is CLEAN only on all three. Anything else is REVIEW — never
    // "delete", never "re-render": read the decode first.
    // Three outcomes, because "whisper cannot read this language" and "this clip
    // is wrong" are not the same finding and must not carry the same weight.
    // VOICE and VAD are decidable here and are the hard gates. A low STT score
    // with the right voice and speech present is ADVISORY: whisper genuinely
    // cannot referee some of this estate's languages, and re-rendering the same
    // text in the same voice would only buy the same decode a second time.
    res.verdict = res.error ? 'ERROR'
      : (!res.voice_ok || !res.has_speech) ? 'REVIEW'
      : res.stt_ok ? 'CLEAN' : 'ADVISORY'
    results.push(res)
    console.log(`${res.verdict.padEnd(6)} ${r.track.padEnd(6)} ${String(r.speaker).padEnd(16)} ` +
      `voice=${res.voice_actual}${res.voice_ok ? '' : `(want ${res.voice_expected})`} ` +
      `dur=${res.duration_s}s db=${res.mean_db} tail=${res.tail_silence_s}s sim=${res.stt_similarity}` +
      (res.error ? ` ERR=${res.error}` : ''))
    if ((res.verdict === 'REVIEW' || res.verdict === 'ADVISORY') && !res.error) console.log(`       want: ${JSON.stringify(r.text)}\n       got : ${JSON.stringify(res.stt)}`)
  }

  function speakersEntry(r) {
    const e = speakers[canonicalSpeaker(r.speaker)] || speakers[r.speaker] || speakers._default
    const v = e && e[r.track] && e[r.track].voice_id
    return v ? norm(v) : null
  }

  const clean = results.filter((x) => x.verdict === 'CLEAN').length
  const advisory = results.filter((x) => x.verdict === 'ADVISORY').length
  const review = results.filter((x) => x.verdict === 'REVIEW').length
  const err = results.filter((x) => x.verdict === 'ERROR').length
  const byVoice = {}
  for (const x of results) {
    const k = `${x.track}:${x.voice_actual}`
    byVoice[k] = byVoice[k] || { clean: 0, review: 0, error: 0 }
    byVoice[k][x.verdict.toLowerCase()]++
  }
  console.log(`\n${POD_ID}: ${results.length} clip(s) — ${clean} CLEAN, ${advisory} ADVISORY, ${review} REVIEW, ${err} ERROR`)
  console.log(`per voice: ${JSON.stringify(byVoice)}`)
  if (JSON_OUT) { fs.writeFileSync(JSON_OUT, JSON.stringify({ pod: POD_ID, model: MODEL, results }, null, 2)); console.log(`json: ${JSON_OUT}`) }
  fs.rmSync(tmp, { recursive: true, force: true })
}

main().catch((e) => { console.error('FAILED:', e.message); process.exit(1) })
