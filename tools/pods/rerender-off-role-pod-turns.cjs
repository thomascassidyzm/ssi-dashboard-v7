#!/usr/bin/env node
/**
 * rerender-off-role-pod-turns.cjs — render the replacement FIRST, verify it,
 * then move the link. The make-before-break re-render for a LIVE pod whose cast
 * moved a role from one voice to the other.
 *
 * WHY THIS EXISTS (2026-08-24, the ita_for_eng pod-1 two-voice proof-of-concept).
 * `pod1-two-voice-cast.cjs` cast `Staff` and `Interlocutor` — two roles created
 * by that morning's speaker reattribution — onto each course's SECOND voice. The
 * clips those lines already had were rendered when the lines were still labelled
 * `Learner`, so they speak in the LEARNER's voice. Nothing detects that:
 *
 *   - `checkPodCast` judges a clip against the pod's voice SET, and both voices
 *     are in the set. A role that swaps sides leaves clips that are on-cast and
 *     mis-voiced, and the gate goes green. Measured on ita_for_eng:pod-1,
 *     2026-08-24: gate PASS, offCastClips 0, and eleven turns in the wrong voice.
 *   - `/generate-pods` builds its queue from `!s.target_audio_id` — a slot that
 *     already points at a clip is never a candidate, so pressing generate spends
 *     nothing and changes nothing (see the audio-regen probe, /d/422807a4).
 *   - `unlink-off-cast-pod-clips.cjs` would NULL the link so generate refills it.
 *     That is right on a HELD staging pod and WRONG here: this pod is live, and
 *     nulling takes eleven lines off the air until a render lands.
 *   - `revoice-clips.cjs` takes its destination voice from `courses.voice_config`.
 *     For ita_for_eng that says target1=ara — the very voice we are moving OFF.
 *     For a pod, the cast is the authority, never voice_config.
 *
 * So this tool: read the destination voice from `listening_pods.speakers` for the
 * row's OWN speaker, render, verify on the served bytes, and only then move the
 * pointer. Nothing is ever deleted — the old clip stays in `course_audio` and
 * stays reachable, which is the rollback.
 *
 * SCOPE — WHOLE-TURN COLUMNS ONLY (`target_audio_id`, `known_audio_id`).
 * The split arrays (`sentence_audio_ids`, `sentence_known_audio_ids`,
 * `takeg_audio_ids`) carry a different defect with a different cause — the
 * positional inheritance documented in
 * `docs/pods/ita-pod1-scene15-two-female-voices-rootcause-2026-08-24.md` and the
 * 636-clip pre-existing drift in `docs/pods/pod1-two-voice-cast-2026-08-24.md`.
 * A split segment cannot be re-rendered by synthesising the row's text; it has to
 * be re-cut, which is `splice-sentence-clips.cjs`'s job. Those slots are MEASURED
 * and REPORTED here and deliberately not touched.
 *
 * WHAT COUNTS AS OFF-ROLE. The clip's real `voice_id` is not the voice the pod's
 * cast gives that row's own canonical speaker, on that row's track. Provider
 * prefixes come off first — `xai_ara` and `ara` are ONE voice, and treating them
 * as two is the single bug that would make this tool re-render the world.
 *
 * SAFETY.
 *   - DRY RUN BY DEFAULT. `--apply` renders and writes.
 *   - Refuses a pod whose cast does not resolve to exactly two voices per track,
 *     and refuses to render a voice the pod's own cast does not name.
 *   - Renders through `generatePodAudio` — the same function `/generate-pods`
 *     calls, so the pause cue, mastering, S3 key convention, canonical voice
 *     spelling and `course_audio` identity are IDENTICAL to the normal path.
 *     No parallel render path is hand-rolled here.
 *   - VERIFIES BEFORE SWAPPING: served bytes fetched from S3, ffprobe duration,
 *     ffmpeg volumedetect for speech, the stored `voice_id` re-read from the DB,
 *     and a whisper decode. Voice, speech and truncation are BLOCKING. The STT
 *     score is ADVISORY — the estate's ASR gate is known to refuse correct audio
 *     (`docs/pods/isl-pod1-a230-2026-08-24.md`), so a low decode is a prompt to
 *     listen, never a veto. A clip that fails a blocking check does not get
 *     swapped and its row is left exactly as it was.
 *   - Truncation is judged against what the DESTINATION voice does, calibrated at
 *     runtime from that voice's existing clips in this course — never against the
 *     duration the old voice produced (revoice-clips.cjs learned that the hard
 *     way: xAI runs 1.4-1.8x shorter than Azure for the same text).
 *   - The swap is ONE transaction with a per-row before-state assertion inside
 *     the UPDATE predicate. Any drift rolls the whole thing back.
 *   - NO DELETES. Ever. Not of a link, not of a course_audio row, not of an S3
 *     object. Cleanup of the superseded clips is a separate, later decision.
 *
 *   node tools/pods/rerender-off-role-pod-turns.cjs --pod=ita_for_eng:pod-1
 *   node tools/pods/rerender-off-role-pod-turns.cjs --pod=ita_for_eng:pod-1 --apply
 */
'use strict'

const path = require('path')
const REPO = path.join(__dirname, '..', '..')
require('dotenv').config({ path: path.join(REPO, '.env.psql') })
require('dotenv').config({ path: path.join(REPO, '.env') })

const fs = require('fs')
const os = require('os')
const { execFileSync, spawnSync } = require('child_process')
const { Client } = require('pg')
const { canonicalSpeakerName } = require(path.join(REPO, 'tools', 'pod-voice-colour-n.cjs'))

const APPLY = process.argv.includes('--apply')
const arg = (n, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${n}=`))
  return a ? a.split('=').slice(1).join('=') : d
}
const POD_ID = arg('pod')
const DATE = arg('date', '2026-08-24')
const MODEL = arg('model', 'small')
const OUT_DIR = arg('out', path.join(REPO, 'docs', 'pods'))

// The --pod guard lives in the CLI entry point, not at module load: requiring
// this file for its pure helpers must never exit the process
// (cf. the "requiring a Popty CLI runs it" trap).

const BUCKET = process.env.S3_AUDIO_BUCKET || process.env.S3_BUCKET || 'ssi-audio-stage'
const REGION = process.env.AWS_REGION || 'eu-west-1'
const WHISPER = process.env.WHISPER || path.join(os.homedir(), '.local/bin/whisper-cli')
const modelPath = (m) => path.join(os.homedir(), '.local/share/whisper-models', `ggml-${m}.bin`)

/** Blocking thresholds. Deliberately loose — this refuses BROKEN audio, not audio it dislikes. */
const SPEECH_MEAN_DB_FLOOR = -50   // quieter than this across the whole clip = no speech
const MIN_DURATION_MS = 400
const TRUNCATION_RATIO = 0.6       // vs what the destination voice predicts for this text
const DEFAULT_MS_PER_CHAR = 55
const STT_ADVISORY_FLOOR = 0.60

/** `xai_ara` and `ara` are one voice recorded two ways. */
const bareVoice = (v) => String(v || '').trim().toLowerCase().replace(/^(xai_|azure_|eleven_)/, '')

/** The two whole-turn slots. The split arrays are measured but never written. */
const TURN_SLOTS = [
  { track: 'target', link: 'target_audio_id', textField: 'target_text', role: 'target1' },
  { track: 'known', link: 'known_audio_id', textField: 'known_text', role: 'known' },
]
const SPLIT_SLOTS = [
  { track: 'target', col: 'sentence_audio_ids' },
  { track: 'known', col: 'sentence_known_audio_ids' },
  { track: 'target', col: 'takeg_audio_ids' },
]

/**
 * THE LOAD-BEARING MEASUREMENT, pure so it can be tested without a DB or a
 * render: which slots hold a clip whose voice is not the one this pod's cast
 * gives that row's OWN speaker on that row's track.
 *
 * Kept separate from `checkPodCast` on purpose. That gate asks "is this clip's
 * voice in the pod's voice SET", which both voices always are; this asks "is it
 * the RIGHT ONE OF THE TWO for this speaker". The first cannot see a role that
 * swapped sides. The second is the whole point of this tool.
 *
 * @returns {{turns:Array, splits:Array, castVoices:{target:string[],known:string[]}}}
 */
function computeOffRole ({ rows, speakers, clips }) {
  const cast = speakers || {}
  const castVoices = { target: new Set(), known: new Set() }
  for (const entry of Object.values(cast)) {
    for (const track of ['target', 'known']) {
      const v = entry && entry[track] && entry[track].voice_id
      if (v) castVoices[track].add(bareVoice(v))
    }
  }
  const voiceFor = (speaker, track) => {
    const e = cast[canonicalSpeakerName(speaker)] || cast[speaker] || cast._default
    return e && e[track] && e[track].voice_id ? e[track] : null
  }

  const turns = []
  const splits = []
  for (const r of rows || []) {
    const name = canonicalSpeakerName(r.speaker)
    for (const s of TURN_SLOTS) {
      const id = r[s.link]
      if (!id || !clips[id]) continue
      const want = voiceFor(r.speaker, s.track)
      if (!want) continue
      const wantBare = bareVoice(want.voice_id)
      const gotBare = bareVoice(clips[id].voice_id)
      if (gotBare === wantBare) continue
      turns.push({
        row_id: r.id, scene: r.scene_number, sentence: r.sentence_number, speaker: name,
        track: s.track, link: s.link, role: s.role, text: r[s.textField],
        old_clip_id: id, old_voice: gotBare, want_voice: wantBare, want_voice_entry: want,
      })
    }
    for (const s of SPLIT_SLOTS) {
      const arr = r[s.col] || []
      arr.forEach((id, i) => {
        if (!id || !clips[id]) return
        const want = voiceFor(r.speaker, s.track)
        if (!want) return
        if (bareVoice(clips[id].voice_id) === bareVoice(want.voice_id)) return
        splits.push({
          row_id: r.id, scene: r.scene_number, sentence: r.sentence_number, speaker: name,
          col: s.col, index: i, clip_id: id,
          voice: bareVoice(clips[id].voice_id), want_voice: bareVoice(want.voice_id),
        })
      })
    }
  }
  return { turns, splits, castVoices: { target: [...castVoices.target], known: [...castVoices.known] } }
}

function sh (cmd, args, opts = {}) {
  return execFileSync(cmd, args, {
    encoding: 'utf8', maxBuffer: 1 << 26, stdio: ['ignore', 'pipe', 'pipe'], ...opts,
  })
}
/** ffmpeg writes its measurements to stderr; capture both streams. */
function shBoth (cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 26 })
  return `${r.stdout || ''}\n${r.stderr || ''}`
}

/** Word-content similarity, accent- and punctuation-blind. Same rule as verify-pod-clips.cjs. */
const words = (s) => String(s || '')
  .normalize('NFD').replace(/\p{M}+/gu, '')
  .toLowerCase()
  .replace(/[^\p{L}\p{N}\s]/gu, ' ')
  .split(/\s+/).filter(Boolean)

function similarity (a, b) {
  const A = words(a), B = words(b)
  if (!A.length && !B.length) return 1
  if (!A.length || !B.length) return 0
  const pool = [...B]
  let hit = 0
  for (const w of A) {
    const i = pool.indexOf(w)
    if (i >= 0) { pool.splice(i, 1); hit++ }
  }
  return (2 * hit) / (A.length + B.length)
}

const ISO3_TO_ISO1 = {
  ita: 'it', eng: 'en', fra: 'fr', spa: 'es', deu: 'de', por: 'pt', nld: 'nl', swe: 'sv',
  ron: 'ro', hrv: 'hr', eus: 'eu', ara: 'ar', jpn: 'ja', kor: 'ko', zho: 'zh', gle: 'ga',
  isl: 'is', hin: 'hi', cym: 'cy', pol: 'pl', tur: 'tr', ell: 'el', dan: 'da', nor: 'no',
  fin: 'fi', ces: 'cs', hun: 'hu', ukr: 'uk', heb: 'he', fas: 'fa', tha: 'th', cat: 'ca',
}
const whisperLang = (l) => ISO3_TO_ISO1[String(l || '').toLowerCase()] || String(l || 'en').slice(0, 2)

// ---------------------------------------------------------------------------
// Verification of ONE freshly rendered clip, on the bytes S3 actually serves.
// ---------------------------------------------------------------------------
function verifyClip ({ clip, wantVoice, wantText, language, tmp, msPerChar }) {
  const res = {
    clip_id: clip.id,
    voice_actual: bareVoice(clip.voice_id),
    voice_expected: wantVoice,
    voice_ok: bareVoice(clip.voice_id) === wantVoice,
    blocking_failures: [],
  }
  if (!res.voice_ok) res.blocking_failures.push(`stored voice ${res.voice_actual} is not the cast voice ${wantVoice}`)

  const mp3 = path.join(tmp, `${clip.id}.mp3`)
  const wav = path.join(tmp, `${clip.id}.wav`)
  try {
    sh('curl', ['-fsS', '--max-time', '60', '-o', mp3,
      `https://${BUCKET}.s3.${REGION}.amazonaws.com/${clip.s3_key}`])
    res.served_bytes = fs.statSync(mp3).size
  } catch (e) {
    res.blocking_failures.push(`served bytes unreachable at ${clip.s3_key}: ${String(e.message).split('\n')[0]}`)
    return res
  }
  if (!res.served_bytes) { res.blocking_failures.push('served object is zero bytes'); return res }

  try {
    sh('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', mp3, '-ar', '16000', '-ac', '1', wav])
    res.duration_ms = Math.round(parseFloat(sh('ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', wav]).trim()) * 1000)
  } catch (e) {
    res.blocking_failures.push(`undecodable: ${String(e.message).split('\n')[0]}`)
    return res
  }

  if (!(res.duration_ms >= MIN_DURATION_MS)) {
    res.blocking_failures.push(`duration ${res.duration_ms}ms is below the ${MIN_DURATION_MS}ms floor`)
  }

  const vol = shBoth('ffmpeg', ['-hide_banner', '-nostats', '-i', wav, '-af', 'volumedetect', '-f', 'null', '-'])
  const mean = /mean_volume:\s*(-?[\d.]+) dB/.exec(vol)
  res.mean_db = mean ? parseFloat(mean[1]) : null
  if (res.mean_db === null || res.mean_db < SPEECH_MEAN_DB_FLOOR) {
    res.blocking_failures.push(`no speech detected (mean ${res.mean_db} dB)`)
  }

  // Truncation, judged against what THIS voice does for text of this length.
  const predicted = Math.round((msPerChar || DEFAULT_MS_PER_CHAR) * String(wantText).length)
  res.predicted_ms = predicted
  res.duration_ratio = predicted ? Number((res.duration_ms / predicted).toFixed(2)) : null
  if (res.duration_ratio !== null && res.duration_ratio < TRUNCATION_RATIO) {
    res.blocking_failures.push(
      `truncated: ${res.duration_ms}ms is ${res.duration_ratio}x the ${predicted}ms this voice predicts for ${String(wantText).length} chars`)
  }

  // STT — ADVISORY. Reported, never blocking.
  try {
    const decode = sh(WHISPER, ['-m', modelPath(MODEL), '-f', wav, '-l', whisperLang(language), '-nt', '-np', '-t', '2'],
      { env: { ...process.env, WHISPER_MAX_THREADS: '2' } }).replace(/\s+/g, ' ').trim()
    res.stt_text = decode
    res.stt_similarity = Number(similarity(decode, wantText).toFixed(2))
    res.stt_verdict = res.stt_similarity >= STT_ADVISORY_FLOOR ? 'ok' : 'review'
  } catch (e) {
    res.stt_text = null
    res.stt_verdict = 'undecodable'
  }

  res.ok = res.blocking_failures.length === 0
  return res
}

// ---------------------------------------------------------------------------

async function main () {
  const db = new Client({ connectionString: process.env.DATABASE_URL })
  await db.connect()

  const pod = (await db.query(
    'select id, course_code, visibility, speakers from listening_pods where id = $1', [POD_ID])).rows[0]
  if (!pod) { console.error(`FAILED: pod ${POD_ID} not found`); process.exit(1) }

  const rows = (await db.query(
    `select id, scene_number, sentence_number, global_order, speaker, known_text, target_text,
            target_audio_id, known_audio_id, sentence_audio_ids, sentence_known_audio_ids, takeg_audio_ids
       from listening_pod_sentences where pod_id = $1
      order by global_order, scene_number, sentence_number`, [POD_ID])).rows

  // --- gather every clip referenced, so voices can be judged ----------------
  const ids = new Set()
  for (const r of rows) {
    for (const s of TURN_SLOTS) if (r[s.link]) ids.add(r[s.link])
    for (const s of SPLIT_SLOTS) for (const id of (r[s.col] || [])) if (id) ids.add(id)
  }
  const clips = {}
  const all = [...ids]
  for (let i = 0; i < all.length; i += 500) {
    const q = await db.query('select id, text, voice_id, s3_key, duration_ms from course_audio where id = any($1)',
      [all.slice(i, i + 500)])
    for (const c of q.rows) clips[c.id] = c
  }

  // --- the measurement, and the two-voice precondition ----------------------
  const measured = computeOffRole({ rows, speakers: pod.speakers, clips })
  const { turns: scope, splits: splitDrift, castVoices } = measured
  for (const track of ['target', 'known']) {
    if (castVoices[track].length !== 2) {
      console.error(`FAILED: ${POD_ID} resolves to ${castVoices[track].length} ${track} voice(s) ` +
        `[${castVoices[track].join(', ')}], not 2 — refusing to render against a cast this tool does not understand`)
      process.exit(1)
    }
  }

  console.log(`${POD_ID}  (${pod.course_code}, visibility=${pod.visibility})`)
  console.log(`  cast: target [${castVoices.target.join(', ')}]  known [${castVoices.known.join(', ')}]`)
  console.log(`  ${rows.length} rows, ${Object.keys(clips).length} distinct clips referenced`)
  console.log(`  OFF-ROLE whole-turn slots (this tool's scope): ${scope.length} ` +
    `across ${new Set(scope.map(s => s.row_id)).size} turn(s)`)
  for (const s of scope) {
    console.log(`    s${s.scene}/${s.sentence} ${s.speaker} ${s.link}: ${s.old_voice} -> ${s.want_voice}  ${JSON.stringify(String(s.text).slice(0, 60))}`)
  }
  console.log(`  OFF-ROLE split-array clips (REPORTED ONLY, re-cut work, not re-render work): ${splitDrift.length}`)
  const bySpeaker = {}
  for (const d of splitDrift) bySpeaker[`${d.speaker} ${d.col}`] = (bySpeaker[`${d.speaker} ${d.col}`] || 0) + 1
  for (const [k, n] of Object.entries(bySpeaker)) console.log(`    ${String(n).padStart(3)}  ${k}`)

  const logBase = path.join(OUT_DIR, `${POD_ID.replace(/:/g, '-')}-off-role-rerender-${DATE}`)
  const writeLog = (suffix, payload) => {
    fs.mkdirSync(OUT_DIR, { recursive: true })
    const f = `${logBase}-${suffix}-log.json`
    fs.writeFileSync(f, JSON.stringify(payload, null, 2))
    console.log(`\nlog: ${path.relative(REPO, f)}`)
    return f
  }

  if (!scope.length) {
    writeLog(APPLY ? 'applied' : 'dryrun', { pod: POD_ID, at: new Date().toISOString(), scope: [], splitDrift })
    console.log('\nNothing off-role on the whole-turn slots. Nothing to render.')
    await db.end()
    return
  }

  if (!APPLY) {
    console.log(`\nDRY RUN — would render ${scope.length} clip(s), verify each, then swap ${scope.length} link(s).`)
    console.log('Nothing rendered, nothing written. Re-run with --apply.')
    writeLog('dryrun', { pod: POD_ID, at: new Date().toISOString(), apply: false, scope, splitDrift })
    await db.end()
    return
  }

  // =========================================================================
  // STEP 1 — GENERATE. Through the same function /generate-pods calls.
  // =========================================================================
  process.env.PHASE8_NO_LISTEN = process.env.PHASE8_NO_LISTEN || '1'  // never squat :3465
  const p8 = require(path.join(REPO, 'services', 'phases', 'phase8-audio-v13.cjs'))
  const course = (await db.query(
    'select known_lang, target_lang, voice_config from courses where course_code = $1', [pod.course_code])).rows[0]
  const ctx = {
    knownLang: course.known_lang,
    targetLang: course.target_lang,
    knownVoice: null,
    voiceConfig: course.voice_config || {},
  }

  // Truncation baseline: what each destination voice does per character, in this
  // course, measured from clips it has already produced.
  const msPerChar = new Map()
  for (const v of new Set(scope.map(s => s.want_voice))) {
    const q = await db.query(
      `select duration_ms, length(text) len from course_audio
        where course_code = $1 and replace(replace(voice_id,'xai_',''),'azure_','') = $2
          and duration_ms is not null and length(text) > 4 limit 2000`, [pod.course_code, v])
    const rates = q.rows.map(r => r.duration_ms / r.len).sort((a, b) => a - b)
    msPerChar.set(v, rates.length ? rates[Math.floor(rates.length / 2)] : DEFAULT_MS_PER_CHAR)
  }
  console.log('\nSTEP 1 — GENERATE')
  for (const [v, r] of msPerChar) console.log(`  baseline ${v}: ${r.toFixed(1)} ms/char (median of existing clips)`)

  for (const s of scope) {
    const lang = s.track === 'target' ? course.target_lang : course.known_lang
    try {
      const out = await p8.generatePodAudio({
        courseCode: pod.course_code,
        text: s.text,
        language: lang,
        role: s.role,
        voice: {
          voice_id: s.want_voice_entry.voice_id,
          provider: s.want_voice_entry.provider || 'xai',
          gender: s.want_voice_entry.gender || 'n',
          locale: s.want_voice_entry.locale || null,
        },
        ctx,
        track: s.track,
        sentenceId: s.row_id,
      })
      s.new_clip_id = out.id
      s.reused = Boolean(out.reused)
      console.log(`  ${s.reused ? 'reused ' : 'rendered'} s${s.scene}/${s.sentence} ${s.track} -> ${out.id}`)
    } catch (e) {
      s.generate_error = String(e.message).split('\n')[0]
      console.log(`  FAILED  s${s.scene}/${s.sentence} ${s.track}: ${s.generate_error}`)
    }
  }

  // =========================================================================
  // STEP 2 — VERIFY, on the bytes S3 actually serves. Nothing has moved yet.
  // =========================================================================
  console.log('\nSTEP 2 — VERIFY (served bytes; nothing swapped yet)')
  const tmp = fs.mkdtempSync(path.join(process.env.CS_SCRATCH || os.tmpdir(), 'rerender-verify-'))
  const newIds = scope.filter(s => s.new_clip_id).map(s => s.new_clip_id)
  const fresh = {}
  if (newIds.length) {
    const q = await db.query('select id, text, voice_id, s3_key, duration_ms from course_audio where id = any($1)', [newIds])
    for (const c of q.rows) fresh[c.id] = c
  }
  for (const s of scope) {
    if (!s.new_clip_id) { s.verify = { ok: false, blocking_failures: ['no clip was generated'] }; continue }
    const clip = fresh[s.new_clip_id]
    if (!clip) { s.verify = { ok: false, blocking_failures: ['generated id has no course_audio row'] }; continue }
    s.verify = verifyClip({
      clip,
      wantVoice: s.want_voice,
      wantText: s.text,
      language: s.track === 'target' ? course.target_lang : course.known_lang,
      tmp,
      msPerChar: msPerChar.get(s.want_voice),
    })
    const v = s.verify
    console.log(`  ${v.ok ? 'PASS' : 'FAIL'} s${s.scene}/${s.sentence} ${s.track} voice=${v.voice_actual} ` +
      `${v.duration_ms}ms (${v.duration_ratio}x) ${v.mean_db}dB stt=${v.stt_verdict}/${v.stt_similarity} ` +
      (v.ok ? '' : `:: ${v.blocking_failures.join('; ')}`))
    if (v.stt_verdict === 'review') console.log(`       stt heard ${JSON.stringify(String(v.stt_text).slice(0, 90))}`)
  }

  const ready = scope.filter(s => s.verify && s.verify.ok)
  const held = scope.filter(s => !(s.verify && s.verify.ok))
  console.log(`\n  ${ready.length} verified ready to swap, ${held.length} held back (link left untouched).`)

  // =========================================================================
  // STEP 3 — SWAP. One transaction, per-row before-state assertion.
  // =========================================================================
  console.log('\nSTEP 3 — SWAP LINKS (atomic; before-state asserted per row)')
  if (!ready.length) {
    console.log('  nothing verified — no links moved.')
  } else {
    await db.query('begin')
    try {
      for (const s of ready) {
        const r = await db.query(
          `update listening_pod_sentences set ${s.link} = $1 where id = $2 and ${s.link} = $3`,
          [s.new_clip_id, s.row_id, s.old_clip_id])
        if (r.rowCount !== 1) {
          throw new Error(`drift on row ${s.row_id} ${s.link}: expected to find ${s.old_clip_id}, matched ${r.rowCount} row(s)`)
        }
        s.swapped = true
      }
      await db.query('commit')
      console.log(`  committed: ${ready.length} link(s) moved.`)
    } catch (e) {
      await db.query('rollback')
      for (const s of ready) s.swapped = false
      console.error(`  ROLLED BACK — nothing written: ${e.message}`)
      process.exitCode = 1
    }
  }

  // =========================================================================
  // STEP 4 — NO DELETES. The superseded clips are the rollback.
  // =========================================================================
  console.log('\nSTEP 4 — CLEANUP: not this tool\'s job. Every superseded clip is left alive in')
  console.log('  course_audio and in S3, which is what makes step 3 reversible from the log.')

  writeLog('applied', {
    pod: POD_ID,
    course: pod.course_code,
    at: new Date().toISOString(),
    apply: true,
    cast: castVoices,
    ms_per_char_baseline: Object.fromEntries(msPerChar),
    scope,
    splitDrift,
    summary: {
      off_role_turn_slots: scope.length,
      generated: scope.filter(s => s.new_clip_id && !s.reused).length,
      reused: scope.filter(s => s.reused).length,
      verified_ok: ready.length,
      held_back: held.length,
      swapped: scope.filter(s => s.swapped).length,
      deleted: 0,
      split_drift_reported: splitDrift.length,
    },
  })
  await db.end()
}

if (require.main === module) {
  if (!POD_ID) {
    console.error('FAILED: --pod=<pod_id> is required')
    process.exit(1)
  }
  main().catch((e) => { console.error(e); process.exit(1) })
}

module.exports = { bareVoice, similarity, verifyClip, computeOffRole, TURN_SLOTS, SPLIT_SLOTS }
