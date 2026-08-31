/**
 * VOICELAB · SPEAKERS — cloning from the recordings the estate ALREADY HOLDS.
 *
 * Tom, 2026-08-31: "We do NOT need to ask anyone to record a fresh sample
 * first. We already hold clean studio audio of the people we want to clone, and
 * cloning FROM OUR OWN EXISTING RECORDINGS is the main route, not a fallback."
 *
 * So the flow this module serves is: pick a speaker → see their clips, with
 * BOTH numbers (how many, and how much audio) → tick a clean subset → clone
 * from it. Recording on the page and uploading a file both survive; they are
 * for people the estate holds no audio of.
 *
 * ── THE TRAP THIS MODULE IS BUILT AROUND ────────────────────────────────────
 * `course_audio.origin = 'human'` IS A LABEL SOMEBODY WROTE, NOT A FACT.
 *
 * Proved here on 2026-08-27, and it cost two dead clone attempts. The first was
 * built from a clip whose text was English but whose audio had Welsh in it. The
 * second was built from `instruction` clips that carry origin='human' and are
 * actually TTS output — Tom identified it by ear. The write-up puts it plainly:
 * "that column records an intention, not a fact, and it cannot distinguish a
 * real recording from a good clone. Anyone relying on it — including me, two
 * attempts ago — will be wrong."
 * (docs/tts-bakeoff/aran-welcome-source-candidates-2026-08-27.md)
 *
 * Therefore this module NEVER claims who a speaker is. It reports the voice id,
 * the label, the counts and the text, and it hands back a playable URL for
 * every clip so the operator LISTENS BEFORE CLONING. The listening step is the
 * verification; nothing computed can replace it, and a level meter has no
 * business vetoing audio.
 *
 * ── WHAT IT WILL NEVER DO ───────────────────────────────────────────────────
 * It reads course_audio and copies BYTES. It never writes, moves, deletes,
 * re-encodes in place or re-points a course_audio row — Welsh recordings above
 * all, which are permanently excluded from every render queue by Tom's ruling
 * of 2026-08-13 (services/shared/human-voice-courses.cjs). Reading Aran's clips
 * as a clone SOURCE is fine and is the point; touching the originals is not.
 * It also renders nothing and spends nothing: building a source is a download
 * and an ffmpeg concat on this box.
 */

const { execFile } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const store = require('./store.cjs')

const S3_BUCKET = process.env.S3_BUCKET || 'ssi-audio-stage'
const AWS_REGION = process.env.AWS_REGION || 'eu-west-1'

/**
 * How much audio one clone source may carry, and how many clips may go into it.
 *
 * TASTE DEFAULTS, 2026-08-31, and both are ceilings rather than targets. The
 * length cap is Cartesia's own useful ceiling for an instant clone plus a
 * little headroom; past it, more audio buys nothing and the upload gets slower.
 * The clip cap stops a stray "select all" turning a 3,000-clip archive into one
 * upload. Neither cap costs anything to hit — building a source spends no money
 * at all — so they exist to keep the RESULT good, not to keep a bill down.
 */
const MAX_SOURCE_SECONDS = Number(process.env.VOICELAB_CLONE_SOURCE_MAX_SECONDS || 90)
const MAX_SOURCE_CLIPS = Number(process.env.VOICELAB_CLONE_SOURCE_MAX_CLIPS || 12)
/** Under this, Cartesia's instant clone has too little to work with. */
const MIN_SOURCE_SECONDS = Number(process.env.VOICELAB_CLONE_SOURCE_MIN_SECONDS || 10)

/**
 * WHAT CARTESIA ACTUALLY WANTS, verified against their live documentation on
 * 2026-08-31 and cross-checked against this estate's own evidence. This is the
 * text the screen shows the operator, held here so there is ONE copy of it.
 *
 *   MINIMUM 10s   — "You can create an instant voice clone with as little as
 *                   10 seconds of audio." Ten is the FLOOR, not the ceiling; an
 *                   older note in this estate (phase2-clone-source-from-clone,
 *                   2026-08-27) quotes it as a 10-second CAP and is wrong.
 *   BEST 20–60s   — up to sixty is recommended, and matters more for a less
 *                   common accent.
 *   ONE CLIP      — the endpoint takes exactly one file. There is no way to
 *                   hand it several, so several clips means one joined file.
 *   PAUSES HURT   — "pauses in the recording will be mimicked by the cloned
 *                   voice", so trim dead air rather than leaving it in.
 *
 * ── ONE CONTINUOUS PASSAGE BEATS A STITCH, AND IT IS NOT CLOSE ──────────────
 * Cartesia's documentation does not address the question directly, so this is a
 * read rather than a quote — but every documented behaviour points one way. The
 * guidance talks throughout about "your recording" as a single performance, and
 * the pause warning means the clip's whole rhythm is read as one continuous
 * prosodic take. Splice six separately-recorded instruction lines together and
 * the joins carry jump-cuts in tone, pacing and room sound that the clone can
 * learn as the speaker's own rhythm. The estate's own good result agrees: the
 * clone Tom judged good was NINETEEN SECONDS cut from the middle of one
 * continuous 44-second take at natural pauses, and nothing else done to it.
 *
 * So the picker sorts LONGEST FIRST and the screen says this out loud. Joining
 * clips is supported because for some speakers it is the only audio there is —
 * it is a fallback, not the recommendation.
 */
const SAMPLE_GUIDANCE = Object.freeze({
  minSeconds: 10,
  bestFrom: 20,
  bestTo: 60,
  headline: 'One continuous take, 20–60 seconds, is what clones best. Ten seconds is the floor.',
  detail: 'Cartesia takes exactly one file, so several clips have to be joined — and a join is a compromise: it carries jump-cuts in tone and room sound that the clone can learn. Prefer ONE long clip. Pauses are mimicked, so avoid clips with long silences.',
  verifiedAgainst: 'Cartesia documentation, read 2026-08-31, plus this estate\'s own 19-second Aran clone of 2026-08-27 which Tom judged good.',
})

function clipUrl (s3Key) {
  return `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${s3Key}`
}

/**
 * Every speaker the estate holds recordings of, biggest archive first.
 *
 * Reads the `human_clip_speakers` view (20260831), which does the DISTINCT-on-
 * s3_key collapse so a file shared by seventeen courses is counted once. A
 * missing view degrades to an empty list with a plain reason, never a broken
 * screen — the same posture registry.cjs takes with voice_guide_in_use.
 */
async function listSpeakers (db, { language = null, minSeconds = 5 } = {}) {
  let q = db.from('human_clip_speakers').select('*')
  if (language) q = q.eq('language', language)
  const { data, error } = await q
  if (error) {
    return {
      speakers: [],
      unavailable: `The speaker index is not available: ${error.message}. Apply database/migrations/20260831_human_clip_speakers_view.sql.`,
    }
  }
  const speakers = (data || [])
    .map((r) => ({
      voiceId: r.voice_id,
      language: r.language,
      clips: Number(r.clips || 0),
      totalMs: Number(r.total_ms || 0),
      totalSeconds: Math.round(Number(r.total_ms || 0) / 1000),
      shortestMs: Number(r.shortest_ms || 0),
      longestMs: Number(r.longest_ms || 0),
      roles: r.roles || [],
      courses: Number(r.courses || 0),
      // Said out loud on every row, because the whole design rests on it.
      identity: 'unverified — origin=human is a label, not proof. Listen before cloning.',
    }))
    .filter((s) => s.totalSeconds >= minSeconds)
    .sort((a, b) => b.totalMs - a.totalMs)
  return { speakers }
}

/**
 * One speaker's clips, longest first, with a playable URL and the text.
 *
 * LONGEST FIRST is deliberate and it is the selection advice made structural: a
 * clone source wants continuous speech, so the clips worth hearing are at the
 * top rather than buried under two hundred four-second drill lines.
 *
 * SPENDS NOTHING — one SELECT. The URLs point at the estate's own public
 * mastered bucket, so the browser plays the ORIGINAL file and nothing is copied
 * anywhere to audition it.
 */
async function listClips (db, { voiceId, language = null, limit = 60 } = {}) {
  if (!voiceId) throw Object.assign(new Error('voiceId is required'), { status: 400 })
  let q = db
    .from('course_audio')
    .select('id, s3_key, duration_ms, text, role, course_code, language, created_at')
    .eq('voice_id', voiceId)
    .eq('origin', 'human')
    .not('s3_key', 'is', null)
    .order('duration_ms', { ascending: false })
    .limit(Math.min(Number(limit) || 60, 300) * 4)   // over-read: siblings collapse below
  if (language) q = q.eq('language', language)
  const { data, error } = await q
  if (error) throw Object.assign(new Error(`course_audio read failed: ${error.message}`), { status: 502 })

  // One FILE, one row. The same recording is filed against every course that
  // plays it, and showing it once per course would offer the operator the same
  // eighteen seconds of audio seventeen times over.
  const byKey = new Map()
  for (const r of data || []) {
    if (!r.s3_key || r.s3_key.startsWith('pending/')) continue
    const seen = byKey.get(r.s3_key)
    if (seen) { if (!seen.courses.includes(r.course_code)) seen.courses.push(r.course_code); continue }
    byKey.set(r.s3_key, {
      s3Key: r.s3_key,
      url: clipUrl(r.s3_key),
      durationMs: Number(r.duration_ms || 0),
      seconds: Math.round(Number(r.duration_ms || 0) / 100) / 10,
      text: r.text || '',
      role: r.role || null,
      language: r.language || null,
      courses: [r.course_code].filter(Boolean),
      createdAt: r.created_at || null,
    })
  }
  const clips = [...byKey.values()]
    .sort((a, b) => b.durationMs - a.durationMs)
    .slice(0, Math.min(Number(limit) || 60, 300))
  return {
    voiceId,
    language,
    clips,
    totalSeconds: Math.round(clips.reduce((n, c) => n + c.durationMs, 0) / 1000),
  }
}

/**
 * Which of a selection may go into a clone source, and why the rest may not.
 * Pure, so the caps are testable without a network.
 *
 * Returns { take, skipped, seconds } — `take` in the order given, truncated at
 * whichever cap bites first, and every dropped clip carries its own reason so
 * the screen can say "clip 9 onwards: over the 90s ceiling" rather than
 * silently using less audio than the operator ticked.
 */
function planSource (clips, { maxSeconds = MAX_SOURCE_SECONDS, maxClips = MAX_SOURCE_CLIPS } = {}) {
  const take = []
  const skipped = []
  let ms = 0
  for (const c of clips || []) {
    if (!c || !c.s3Key) { skipped.push({ clip: c, why: 'no audio file' }); continue }
    if (take.length >= maxClips) { skipped.push({ clip: c, why: `over the ${maxClips}-clip ceiling` }); continue }
    if (ms + (c.durationMs || 0) > maxSeconds * 1000) { skipped.push({ clip: c, why: `over the ${maxSeconds}s ceiling` }); continue }
    take.push(c)
    ms += c.durationMs || 0
  }
  return { take, skipped, seconds: Math.round(ms / 100) / 10 }
}

/**
 * Fetch the chosen clips and join them into ONE audio file to clone from.
 *
 * COPIES BYTES, TOUCHES NOTHING. Each original is downloaded over plain HTTPS
 * from the public mastered bucket into a scratch directory that is deleted at
 * the end. No course_audio row is read for anything but its key, and none is
 * written, moved, re-encoded or re-pointed.
 *
 * ── ONE CLIP IS COPIED; SEVERAL ARE JOINED ──────────────────────────────────
 * Cartesia's instant clone takes exactly ONE file. A single chosen clip is
 * therefore sent through UNTOUCHED — no decode, no re-encode, no ffmpeg at all
 * — which is both the fastest path and the highest-fidelity one.
 *
 * The estate's instruction and encouragement recordings are individually short,
 * so cloning from several of them means joining them. That join is a straight
 * concatenation at a common sample rate with no processing — no normalisation,
 * no noise reduction, no trimming — because Cartesia asks for "the volume,
 * pacing, and audio quality you want back", and the estate's mastered clips
 * already are that.
 *
 * A short silence is inserted between clips rather than butting them together:
 * two unrelated sentences spliced at the waveform give an audible click, and a
 * click is exactly the kind of artefact a clone learns.
 */
async function buildSource (clips, { gapMs = 250, tmpRoot = null, fetchImpl = fetch, run = execFileAsync } = {}) {
  const plan = planSource(clips)
  if (!plan.take.length) throw Object.assign(new Error('No clips were selected to clone from.'), { status: 400 })

  // ── ONE CLIP GOES STRAIGHT THROUGH, UNTOUCHED ─────────────────────────────
  //
  // Faster AND better, which is rare enough to state. Cartesia takes exactly one
  // file, so a single-clip source needs no join — and a join is the only reason
  // to decode and re-encode at all. Passing the estate's own mastered mp3
  // through means:
  //
  //   * NO TRANSCODE. mp3 → wav → upload loses a generation for nothing.
  //     Cartesia's advice is to send "the audio at the volume, pacing and audio
  //     quality you want back", and a mastered course clip already is that. It
  //     is also exactly what was done to the clone Tom judged good on
  //     2026-08-27: nineteen seconds cut out and "nothing else done to it".
  //   * NO ffmpeg PROCESS, so nothing to go wrong in front of an audience.
  //   * AN EIGHTFOLD SMALLER UPLOAD. A 44-second clip is ~530 kB as mp3 and
  //     ~3.9 MB as 44.1 kHz mono WAV. On a live demo that difference is the gap
  //     between a pause and a wait.
  //
  // Several clips still go through ffmpeg below, because then there genuinely
  // is a join to make.
  if (plan.take.length === 1) {
    const c = plan.take[0]
    const res = await fetchImpl(c.url, { signal: AbortSignal.timeout(60000) })
    if (!res.ok) throw Object.assign(new Error(`Could not read ${c.s3Key} (${res.status}) — the recording is not where the database says it is.`), { status: 502 })
    const buffer = Buffer.from(await res.arrayBuffer())
    const seconds = Math.round((c.durationMs || 0) / 100) / 10
    return {
      buffer,
      filename: `clone-source${path.extname(c.s3Key) || '.mp3'}`,
      seconds,
      passthrough: true,
      used: [{ s3Key: c.s3Key, seconds: c.seconds, role: c.role, text: (c.text || '').slice(0, 80) }],
      skipped: plan.skipped.map((sk) => ({ s3Key: sk.clip && sk.clip.s3Key, why: sk.why })),
      provenance: `1 clip already in the estate (${Math.round(seconds)}s), untouched`,
      short: seconds && seconds < MIN_SOURCE_SECONDS ? `${Math.round(seconds)}s is under the ${MIN_SOURCE_SECONDS}s an instant clone wants. It will clone, but thinner.` : null,
      stitched: null,
    }
  }

  const dir = fs.mkdtempSync(path.join(tmpRoot || os.tmpdir(), 'vl-clone-src-'))
  try {
    const parts = []
    for (let i = 0; i < plan.take.length; i++) {
      const c = plan.take[i]
      const res = await fetchImpl(c.url, { signal: AbortSignal.timeout(60000) })
      if (!res.ok) throw Object.assign(new Error(`Could not read ${c.s3Key} (${res.status}) — the recording is not where the database says it is.`), { status: 502 })
      const file = path.join(dir, `p${String(i).padStart(3, '0')}.mp3`)
      fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()))
      parts.push(file)
    }

    const out = path.join(dir, 'source.wav')
    // ── ONE FILTER GRAPH, ONE SILENCE INPUT PER JOIN ────────────────────────
    // Not the concat DEMUXER: the inputs are mastered mp3s of possibly
    // different sample rates and the demuxer splices without resampling, which
    // produces a file that plays at the wrong speed halfway through.
    //
    // And a separate lavfi silence INPUT per gap rather than one reused filter
    // output: an ffmpeg filter output can be consumed exactly once, so a single
    // [gap] node works for two clips and fails on three with "has output 0
    // unconnected". Measured live 2026-08-31 on a one-clip clone, which is the
    // other end of the same bug.
    const gapSeconds = (gapMs > 0 ? gapMs : 0) / 1000
    const gaps = gapSeconds > 0 ? Math.max(0, parts.length - 1) : 0
    const args = ['-y']
    for (const p of parts) args.push('-i', p)
    for (let g = 0; g < gaps; g++) {
      args.push('-f', 'lavfi', '-t', gapSeconds.toFixed(3), '-i', 'anullsrc=r=44100:cl=mono')
    }
    const total = parts.length + gaps
    const fmt = []
    for (let i = 0; i < total; i++) {
      fmt.push(`[${i}:a]aformat=sample_fmts=s16:sample_rates=44100:channel_layouts=mono[a${i}]`)
    }
    // Interleave: clip, gap, clip, gap, … clip. The gap inputs live after every
    // clip input, so gap g sits between clip g and clip g+1.
    const seq = []
    for (let i = 0; i < parts.length; i++) {
      seq.push(`[a${i}]`)
      if (i < gaps) seq.push(`[a${parts.length + i}]`)
    }
    args.push(
      '-filter_complex', `${fmt.join(';')};${seq.join('')}concat=n=${total}:v=0:a=1[out]`,
      '-map', '[out]', '-ac', '1', '-ar', '44100', out,
    )
    await run('ffmpeg', args)

    const buf = fs.readFileSync(out)
    const seconds = await probeSeconds(out, run)
    return {
      buffer: buf,
      filename: 'clone-source.wav',
      seconds,
      used: plan.take.map((c) => ({ s3Key: c.s3Key, seconds: c.seconds, role: c.role, text: (c.text || '').slice(0, 80) })),
      skipped: plan.skipped.map((s) => ({ s3Key: s.clip && s.clip.s3Key, why: s.why })),
      // The one line that goes into voices.consent_source, written here because
      // this is the only place that knows what actually went in.
      provenance: `${plan.take.length} clip(s) already in the estate (${Math.round(seconds)}s), from course_audio`,
      /**
       * Honest, and it is not a defect: a source under the floor still clones,
       * it just clones worse. Reported so the screen can say so rather than
       * quietly producing a thin voice.
       */
      short: seconds < MIN_SOURCE_SECONDS ? `${Math.round(seconds)}s is under the ${MIN_SOURCE_SECONDS}s an instant clone wants. It will clone, but thinner.` : null,
      /**
       * Said whenever more than one clip went in. Not an error — sometimes a
       * stitch is the only audio there is — but the operator should know the
       * result is a compromise before they judge the clone by it.
       */
      stitched: plan.take.length > 1
        ? `${plan.take.length} separate recordings were joined. One continuous take clones better: the joins carry changes in tone and room sound that the clone can learn.`
        : null,
    }
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }) } catch { /* scratch */ }
  }
}

function execFileAsync (cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { maxBuffer: 32 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) return reject(Object.assign(new Error(`${cmd} failed: ${String(stderr || err.message).slice(-400)}`), { status: 500 }))
      resolve({ stdout, stderr })
    })
  })
}

async function probeSeconds (file, run = execFileAsync) {
  try {
    const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file])
    return Math.round(Number(String(stdout).trim()) * 10) / 10
  } catch { return 0 }
}

module.exports = {
  listSpeakers, listClips, planSource, buildSource, clipUrl, probeSeconds, SAMPLE_GUIDANCE,
  MAX_SOURCE_SECONDS, MAX_SOURCE_CLIPS, MIN_SOURCE_SECONDS, S3_BUCKET, AWS_REGION,
}
