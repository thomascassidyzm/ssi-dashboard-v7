#!/usr/bin/env node
/**
 * verify-spliced-sentences.cjs — prove, through the LEARNER path, that the
 * per-sentence clips splice-sentence-clips.cjs wrote are the right audio in
 * the right order saying the right words.
 *
 * Read-only. Downloads clips, measures them, writes nothing to the course.
 *
 * WHY THIS IS NOT OPTIONAL. The splicer's own gates run on the pieces it holds
 * in a scratch directory before upload. They cannot see whether the right
 * bytes reached S3, whether the ids landed in the right ARRAY POSITION, or
 * whether the app will pair a clip with the text the learner reads. Those are
 * different failure modes and each of them is silent. So this checks the
 * finished article, from the outside, over the same URL a phone uses.
 *
 * THE FIVE CHECKS, each aimed at a specific way this could be wrong:
 *
 *  1. SERVES        every id returns HTTP 200 with real bytes from
 *                   saysomethingin.app/api/audio/<id>. Catches an upload that
 *                   silently didn't land.
 *  2. TEXT          course_audio.text for clip i equals sentence i of the
 *                   row's own target_text, exactly. This is the check that
 *                   catches an OFF-BY-ONE or a reversed array, and it matters
 *                   more than it looks: the app takes each card's displayed
 *                   text from the clip's stored text (`textById` in
 *                   podSentenceSplit.ts), so a mis-ordered array shows the
 *                   learner sentence 2's words while playing sentence 1.
 *  3. APP PARITY    splitRowUnits' real behaviour, reproduced: the number of
 *                   units the app will build equals the number of clips, and
 *                   each unit's text is that clip's text. Also reports the
 *                   app's LATIN regex part count, which for CJK legitimately
 *                   disagrees (the app falls back to the clip text there) —
 *                   reported, not failed, because that is by design.
 *  4. SPEECH        whisper transcribes each clip and it is compared to the
 *                   sentence it claims to be, as a character error rate. This
 *                   is the only check that actually listens. It is reported
 *                   with a threshold but treated as ADVISORY per clip: whisper
 *                   is unreliable on short clips and on several of these
 *                   languages (see docs and the veracity-gate limits), so a
 *                   single high CER is a thing to look at, while a whole
 *                   course reading high is a real signal.
 *  5. SEAMS         the first and last 30 ms of every clip, measured with the
 *                   atrim filter, must be quiet — re-measured on the bytes the
 *                   learner actually receives rather than on the local piece.
 *
 * Additionally the piece durations are summed against the whole-turn clip:
 * they should exceed it by roughly 100 ms per internal seam (the 50 ms of pause
 * kept either side of each cut), which is a cheap end-to-end sanity check that
 * the pieces really came from this turn.
 *
 *   node tools/pods/verify-spliced-sentences.cjs <course> [--sample=10] [--seed=1] [--all]
 *
 * Writes docs/pods/<course>-sentence-splice-verify-<date>.json and exits
 * non-zero if any HARD check (serves / text / parity / seams) fails.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql') })
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFile } = require('child_process')
const { promisify } = require('util')
const { Client } = require('pg')

const execFileP = promisify(execFile)
const REPO = path.resolve(__dirname, '../..')

const COURSE = process.argv[2]
const arg = (n, d) => {
  const h = process.argv.find((a) => a.startsWith(`--${n}=`))
  return h ? h.slice(n.length + 3) : d
}
const SAMPLE = Number(arg('sample', 10))
const SEED = Number(arg('seed', 1))
const ALL = process.argv.includes('--all')
// --no-stt: skip the transcription leg. The other four checks are exact and
// fast, so they can run over EVERY split row in a course; whisper is
// semaphore-capped at 3 slots estate-wide and runs at SCHED_IDLE, so the STT
// leg is the only reason to sample rather than sweep. Run --all --no-stt for
// coverage, then a small sampled run WITH stt for the listening evidence.
const NO_STT = process.argv.includes('--no-stt')
if (!COURSE) {
  console.error('usage: verify-spliced-sentences.cjs <course> [--sample=10] [--seed=1] [--all]')
  process.exit(2)
}

const WHISPER = process.env.WHISPER || path.join(os.homedir(), '.local/bin/whisper-cli')
const WHISPER_MODEL = process.env.WHISPER_MODEL
  || path.join(os.homedir(), '.local/share/whisper-models/ggml-small.bin')

// Same split the splicer used, and the same one the app's clip-text oracle
// makes irrelevant for CJK. Kept in step with splice-sentence-clips.cjs.
const SENTENCE_SPLIT = /(?<=[。！？])\s*(?=\S)|(?<=[.!?…؟])\s+(?=\S)/
const APP_LATIN_BOUNDARY = /(?<=[.!?…])\s+/
const splitOn = (t, re) => String(t || '').split(re).map((s) => s.trim()).filter(Boolean)

const SEAM_WINDOW = 0.030
const SEAM_DB = -35

// Deterministic sampling, so a re-run checks the same turns.
const mulberry32 = (a) => () => {
  a |= 0; a = a + 0x6D2B79F5 | 0
  let t = Math.imul(a ^ a >>> 15, 1 | a)
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
  return ((t ^ t >>> 14) >>> 0) / 4294967296
}

async function peakDb (file, start, dur) {
  const { stderr } = await execFileP('ffmpeg',
    ['-hide_banner', '-v', 'info', '-i', file,
      '-af', `atrim=start=${start.toFixed(4)}:end=${(start + dur).toFixed(4)},volumedetect`,
      '-f', 'null', '-'])
  const ns = [...stderr.matchAll(/n_samples:\s*(\d+)/g)]
  const vs = [...stderr.matchAll(/max_volume:\s*(-?[0-9.]+) dB/g)]
  if (!ns.length || Number(ns[ns.length - 1][1]) === 0) throw new Error('no samples')
  if (!vs.length) throw new Error('no max_volume')
  return parseFloat(vs[vs.length - 1][1])
}

async function durOf (file) {
  const { stdout } = await execFileP('ffprobe',
    ['-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', file])
  return parseFloat(stdout.trim())
}

/** Levenshtein-based character error rate, normalised the way the estate's
 *  other veracity checks do: lowercased, punctuation and whitespace stripped. */
function cer (expected, got) {
  const norm = (s) => String(s || '').toLowerCase()
    .replace(/[.,!?;:¡¿…"'`´‘’“”\-—–()[\]{}。、！？，；：]/g, '')
    .replace(/\s+/g, '')
  const a = norm(expected)
  const b = norm(got)
  if (!a.length) return b.length ? 1 : 0
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 0; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
  }
  return d[a.length][b.length] / a.length
}

async function transcribe (mp3, lang) {
  const wav = mp3.replace(/\.mp3$/, '.wav')
  await execFileP('ffmpeg', ['-y', '-v', 'error', '-i', mp3, '-ar', '16000', '-ac', '1', wav])
  try {
    const { stdout } = await execFileP(WHISPER,
      ['-m', WHISPER_MODEL, '-f', wav, '-l', lang, '-nt', '-np', '--no-timestamps'],
      { maxBuffer: 8 << 20 })
    return stdout.trim().replace(/\s+/g, ' ')
  } finally { try { fs.unlinkSync(wav) } catch (_) {} }
}

/** Reproduces podSentenceSplit.splitRowUnits for the target side. */
function appUnits (row, textById) {
  const clips = (row.sentence_audio_ids || []).filter(Boolean)
  if (clips.length < 2) return [{ index: 0, targetText: row.target_text, targetAudioId: row.target_audio_id, isSplit: false }]
  if (!clips.every((id) => textById.has(id))) {
    // Stale-slice guard: a missing clip collapses the whole row to whole-turn.
    return [{ index: 0, targetText: row.target_text, targetAudioId: row.target_audio_id, isSplit: false }]
  }
  const tSents = splitOn(row.target_text, APP_LATIN_BOUNDARY)
  return clips.map((clip, i) => ({
    index: i,
    targetText: textById.get(clip) || tSents[i] || tSents[tSents.length - 1] || row.target_text,
    targetAudioId: clip,
    isSplit: true,
  }))
}

;(async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL })
  await db.connect()
  const POD = `${COURSE}:pod-1`

  const { rows: cr } = await db.query('select voice_config from courses where course_code=$1', [COURSE])
  const vc = ((cr[0] || {}).voice_config || {}).voices || {}
  const lang = (vc.target1 || {}).language || COURSE.split('_')[0]
  // whisper wants an ISO-639-1-ish code; take the first two letters of the
  // course's own target language and let whisper reject what it can't do.
  const whisperLang = { deu: 'de', fra: 'fr', spa: 'es', por: 'pt', ron: 'ro', swe: 'sv',
    nld: 'nl', isl: 'is', hrv: 'hr', eus: 'eu', gle: 'ga', ara: 'ar', hin: 'hi',
    jpn: 'ja', kor: 'ko', zho: 'zh', ita: 'it' }[String(lang).slice(0, 3)] || 'auto'

  const { rows } = await db.query(
    `select id, global_order, target_text, known_text, target_audio_id, sentence_audio_ids
       from listening_pod_sentences
      where pod_id=$1 and sentence_audio_ids is not null
        and array_length(sentence_audio_ids,1) >= 2
      order by global_order`, [POD])

  const rng = mulberry32(SEED)
  const shuffled = [...rows]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  const sample = ALL ? rows : shuffled.slice(0, SAMPLE)

  const scratch = fs.mkdtempSync(path.join(process.env.CS_SCRATCH || os.tmpdir(), 'splice-verify-'))
  const results = []
  const fail = { serves: 0, text: 0, parity: 0, seams: 0 }
  let cerHigh = 0, cerN = 0, cerSum = 0

  for (const row of sample) {
    const clips = row.sentence_audio_ids.filter(Boolean)
    const expected = splitOn(row.target_text, SENTENCE_SPLIT)
    const { rows: ca } = await db.query(
      'select id, text, duration_ms, voice_id from course_audio where id = any($1)', [clips])
    const byId = new Map(ca.map((r) => [r.id, r]))
    const textById = new Map(ca.map((r) => [r.id, r.text]))

    const rec = {
      id: row.id, order: row.global_order, target_text: row.target_text,
      n_clips: clips.length, n_expected: expected.length,
      app_latin_parts: splitOn(row.target_text, APP_LATIN_BOUNDARY).length,
      pieces: [], problems: [],
    }

    if (clips.length !== expected.length) {
      rec.problems.push(`clip count ${clips.length} != sentence count ${expected.length}`)
      fail.parity++
    }

    // App parity — what the learner's player will actually build.
    const units = appUnits(row, textById)
    rec.app_units = units.length
    rec.app_is_split = units[0].isSplit
    if (!units[0].isSplit) {
      rec.problems.push('app would COLLAPSE this row to whole-turn (a clip id is missing from course_audio)')
      fail.parity++
    } else if (units.length !== clips.length) {
      rec.problems.push(`app builds ${units.length} units for ${clips.length} clips`)
      fail.parity++
    }

    let sumDur = 0
    for (let i = 0; i < clips.length; i++) {
      const id = clips[i]
      const p = { index: i, id, expected: expected[i] || null }
      const row_ca = byId.get(id)
      if (!row_ca) {
        p.problem = 'no course_audio row'
        rec.problems.push(`s${i}: no course_audio row`); fail.serves++
        rec.pieces.push(p); continue
      }
      p.stored_text = row_ca.text
      p.voice_id = row_ca.voice_id

      // 2. TEXT — clip i must be sentence i.
      if (expected[i] !== undefined && row_ca.text !== expected[i]) {
        p.problem = `stored text != sentence ${i}`
        rec.problems.push(`s${i}: stored "${row_ca.text}" != expected "${expected[i]}"`)
        fail.text++
      }
      // 3. APP PARITY per unit.
      if (units[i] && units[i].targetText !== row_ca.text) {
        rec.problems.push(`s${i}: app would display "${units[i].targetText}"`)
        fail.parity++
      }

      // 1. SERVES — through the learner URL.
      const mp3 = path.join(scratch, `${id}.mp3`)
      try {
        const { stdout } = await execFileP('curl',
          ['-sL', '--max-time', '60', '-o', mp3, '-w', '%{http_code}',
            `https://saysomethingin.app/api/audio/${id}`])
        p.http = Number(stdout.trim())
        p.bytes = fs.existsSync(mp3) ? fs.statSync(mp3).size : 0
        if (p.http !== 200 || p.bytes < 500) {
          p.problem = `serve failed http=${p.http} bytes=${p.bytes}`
          rec.problems.push(`s${i}: ${p.problem}`); fail.serves++
          rec.pieces.push(p); continue
        }
      } catch (e) {
        p.problem = `download error ${e.message.slice(0, 80)}`
        rec.problems.push(`s${i}: ${p.problem}`); fail.serves++
        rec.pieces.push(p); continue
      }

      // 5. SEAMS — on the bytes the learner receives.
      try {
        const d = await durOf(mp3)
        p.dur = Number(d.toFixed(3))
        sumDur += d
        p.head_db = await peakDb(mp3, 0, SEAM_WINDOW)
        p.tail_db = await peakDb(mp3, Math.max(0, d - SEAM_WINDOW), SEAM_WINDOW)
        // Only INTERNAL seams are this tool's doing.
        const gated = []
        if (i > 0) gated.push(p.head_db)
        if (i < clips.length - 1) gated.push(p.tail_db)
        if (gated.some((v) => v > SEAM_DB)) {
          p.problem = `seam not silent (${gated.join(', ')} dB)`
          rec.problems.push(`s${i}: ${p.problem}`); fail.seams++
        }
      } catch (e) {
        p.problem = `seam unmeasurable: ${e.message}`
        rec.problems.push(`s${i}: ${p.problem}`); fail.seams++
      }

      // 4. SPEECH — advisory, and only MULTI-WORD clips carry any weight.
      //
      // Measured on the German pilot: every single-word clip "failed" at CER
      // 1.0 and not one of them was wrong. "Sieben." transcribes as "7.",
      // "Dreißig." as "30", "Samstag." as "Zamztak." — whisper's numeral and
      // spelling conventions, not the audio. A 1.1s "Danke." even came back
      // as 謝謝 despite the language being forced: whisper's language ID is
      // unreliable at that length, which is a known limit across this estate.
      //
      // Over the same run, every clip of two words or more matched at CER
      // 0.000-0.048. So word count is the line between a measurement and a
      // guess, and the headline number is computed over multi-word clips only.
      // Single-word results are still recorded — just never counted or flagged.
      try {
        if (NO_STT) throw { skip: true }
        p.stt = await transcribe(mp3, whisperLang)
        p.cer = Number(cer(expected[i] || row_ca.text, p.stt).toFixed(3))
        p.stt_words = String(expected[i] || row_ca.text).trim().split(/\s+/).length
        p.stt_counted = p.stt_words >= 2
        if (p.stt_counted) {
          cerN++; cerSum += p.cer
          if (p.cer > 0.35) { p.stt_flag = true; cerHigh++ }
        }
      } catch (e) {
        if (!e.skip) p.stt_error = String(e.message || e).slice(0, 100)
      }
      try { fs.unlinkSync(mp3) } catch (_) {}
      rec.pieces.push(p)
    }

    // Duration sanity against the whole-turn clip.
    if (row.target_audio_id) {
      const { rows: w } = await db.query('select duration_ms from course_audio where id=$1', [row.target_audio_id])
      if (w[0] && w[0].duration_ms) {
        rec.whole_dur = w[0].duration_ms / 1000
        rec.pieces_sum_dur = Number(sumDur.toFixed(3))
        rec.overhang = Number((sumDur - rec.whole_dur).toFixed(3))
        // ~100ms per internal seam is expected (50ms kept either side).
        const expectedOverhang = 0.1 * (clips.length - 1)
        rec.overhang_ok = Math.abs(rec.overhang - expectedOverhang) < 0.25
      }
    }
    results.push(rec)
    const bad = rec.problems.length
    console.log(`S${row.global_order}: ${clips.length} pieces ${bad ? `✗ ${bad} problem(s)` : '✓'}`
      + (rec.pieces.some((x) => x.stt_flag) ? '  [stt flag]' : ''))
  }

  try { fs.rmSync(scratch, { recursive: true, force: true }) } catch (_) {}
  await db.end()

  const hard = fail.serves + fail.text + fail.parity + fail.seams
  const at = new Date().toISOString()
  const out = {
    course: COURSE, pod: POD, at, whisper_lang: whisperLang,
    split_rows_in_pod: rows.length, sampled: sample.length,
    hard_failures: fail,
    stt: {
      multiword_clips: cerN,
      mean_cer_multiword: cerN ? Number((cerSum / cerN).toFixed(3)) : null,
      flagged_over_0_35: cerHigh,
      note: 'Single-word clips are transcribed but NOT counted — whisper renders '
        + '"Sieben." as "7." and mis-IDs the language on ~1s audio. Multi-word '
        + 'clips are the measurement.',
    },
    results,
  }
  const p = path.join(REPO, 'docs', 'pods', `${COURSE}-sentence-splice-verify-${at.slice(0, 10)}.json`)
  fs.writeFileSync(p, JSON.stringify(out, null, 2))

  console.log(`\n${COURSE}: ${sample.length}/${rows.length} split rows checked. `
    + `HARD failures serves=${fail.serves} text=${fail.text} parity=${fail.parity} seams=${fail.seams}. `
    + `STT mean CER ${out.stt.mean_cer_multiword} over ${cerN} multi-word clips, ${cerHigh} flagged.`)
  console.log(`   ${p}`)
  process.exit(hard ? 3 : 0)
})().catch((e) => { console.error('ERR:', e.message); process.exit(1) })
