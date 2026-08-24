#!/usr/bin/env node
/**
 * relink-off-cast-explainer-clips.cjs — point an off-cast explainer link at an
 * EXISTING in-cast clip that says exactly the same thing. Relink, never null,
 * never render.
 *
 * WHY THIS EXISTS (2026-08-24, piece 3 of the Pod 1 split-array closeout).
 * unlink-off-cast-pod-clips.cjs NULLs an off-cast link so /generate-pods refills
 * it. That is the right move on a HELD staging pod, where no learner can hear the
 * gap and a render is coming. It is the wrong move on a LIVE pod: nulling takes a
 * line off the air, and re-rendering costs money. Across the live pod-1 fleet 34
 * explainer links sit on voices nobody cast — old composite assets
 * ('comp:ga-IE-ColmNeural+en-GB-SoniaNeural') left behind when the fleet moved to
 * a single narrator. For most of them the correctly-voiced clip ALREADY EXISTS in
 * course_audio, rendered and paid for, simply never linked (audio_autolink only
 * fills NULLs, so a row that already had a pointer kept the old one).
 *
 * So: find the twin, prove it plays, move the pointer. No TTS, no deletion, and
 * an untwinned row is left exactly as it is and reported as an honest gap for Tom
 * to price a render against.
 *
 * WHAT COUNTS AS A TWIN (deliberately strict — a live learner hears this):
 *   SAME WORDS. course_audio.text_normalized matches the CURRENT clip's text on
 *     either of the two conventions that column holds (services/shared/
 *     text-normalize.cjs: audioKeyCandidates). Identity is the estate's own key,
 *     not a similarity score — a clip that says something *nearly* the same is
 *     not a relink, it is a content change, and it is left unresolved.
 *   SAME ROLE. role='pod_explainer'. A seed clip and a use-phrase clip can share
 *     one asset, but a dialogue line is not an explainer and never substitutes.
 *   IN-CAST, SINGLE VOICE. The replacement's voice must be one of the pod's
 *     KNOWN-side cast voices — explainer narration is known-side work
 *     (services/voice-engine/pods-registration.cjs: known/explainer both belong
 *     to the explainer cast entry). A composite is never a replacement.
 *   ALIVE. Make-before-break: the S3 object is fetched and ffprobed, and must
 *     carry real speech, BEFORE the link moves. These pods are live.
 *
 * WHAT COUNTS AS OFF-CAST. voice_id is not in the pod's cast (listening_pods
 * .speakers, known and target sides unioned — Tom's definition). Provider
 * prefixes are stripped first: 'xai_yis75yfp' and 'yis75yfp' are ONE voice, and
 * treating them as two is the single bug that would make this tool wreck things.
 * A composite id 'comp:A+B' is decomposed and is off-cast unless EVERY component
 * is cast, so a legitimately-composited in-cast explainer is never disturbed.
 *
 * SAFETY.
 *   - DRY RUN BY DEFAULT. --apply to write.
 *   - Per-row before-state assertion inside the UPDATE predicate; any drift
 *     aborts the whole transaction and nothing is written.
 *   - Every prior explainer_audio_id is snapshotted into the per-course log, so
 *     every write is reversible from the log alone.
 *   - Only the LINK COLUMN is ever written. No text column is touched (editing
 *     target_text mutates audio links via trigger), and no course_audio row is
 *     ever deleted.
 *   - Ambiguity is not resolved by guessing: if twins disagree about which cast
 *     voice should speak the line, the row is left alone and reported.
 *
 *   node tools/pods/relink-off-cast-explainer-clips.cjs
 *   node tools/pods/relink-off-cast-explainer-clips.cjs --pod=gle_for_eng:pod-1
 *   node tools/pods/relink-off-cast-explainer-clips.cjs --apply
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
const { audioKeyCandidates } = require(path.join(REPO, 'services', 'shared', 'text-normalize.cjs'))

const APPLY = process.argv.includes('--apply')
const arg = (n, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${n}=`))
  return a ? a.split('=').slice(1).join('=') : d
}
const POD_FILTER = arg('pod')
/**
 * Scope. The default is the LIVE POD-1 FLEET, which is what this incident is
 * about. The wider live estate has a much larger off-cast explainer population
 * (661 links on 2026-08-24, mostly pod-0 narrators who are simply absent from
 * their pod's speakers map) — a different finding with a different cause, and
 * not something to sweep in passing. --slug widens it deliberately.
 */
const SLUG_PREFIX = arg('slug', 'pod-1')
const DATE = arg('date', '2026-08-24')
const BUCKET = process.env.S3_AUDIO_BUCKET || process.env.S3_BUCKET || 'ssi-audio-stage'
const REGION = process.env.AWS_REGION || 'eu-west-1'

/** 'xai_yis75yfp' and 'yis75yfp' are the same voice recorded two ways. */
const norm = (v) => String(v || '').replace(/^(xai_|azure_|eleven_)/, '')

/**
 * The voices a clip actually speaks in. A composite asset carries every voice it
 * was stitched from in its id ('comp:xai_rex+azure_en-GB-SoniaNeural'), and it is
 * only on-cast if ALL of them are cast. 'comp:leo' — a single-voice composite —
 * decomposes to ['leo'] and is judged on that one voice.
 */
function voicesOf(voiceId) {
  const raw = String(voiceId || '')
  const body = raw.startsWith('comp:') ? raw.slice('comp:'.length) : raw
  return body.split('+').map((v) => norm(v.trim())).filter(Boolean)
}

const isComposite = (voiceId) => String(voiceId || '').startsWith('comp:')

/** Every voice the pod casts, on either side — Tom's "that pod's own cast". */
function castVoices(speakers) {
  const out = new Set()
  for (const entry of Object.values(speakers || {})) {
    if (!entry || typeof entry !== 'object') continue
    for (const side of ['known', 'target']) {
      const v = entry[side] && entry[side].voice_id
      if (v) out.add(norm(v))
    }
    if (entry.voiceId) out.add(norm(entry.voiceId))   // __explainer__-shaped entry
  }
  return out
}

/** The known-side voices only — the ones allowed to narrate an explainer. */
function knownCastVoices(speakers) {
  const out = new Set()
  for (const entry of Object.values(speakers || {})) {
    const v = entry && entry.known && entry.known.voice_id
    if (v) out.add(norm(v))
  }
  return out
}

/** Off-cast = at least one of the clip's voices is not in the pod's cast. */
function isOffCast(voiceId, cast) {
  const vs = voicesOf(voiceId)
  if (!vs.length) return true
  return vs.some((v) => !cast.has(v))
}

/**
 * Pick the replacement, or explain why there isn't one.
 *
 * Candidates arrive already filtered to same-text, role='pod_explainer', not the
 * current clip. Here we keep only single-voice in-cast narrators, and refuse to
 * choose when two DIFFERENT cast voices both offer the line — that is a casting
 * question (which narrator?), not a repair, and guessing it would put a voice on
 * air that nobody picked. `preferVoice` is the pod's own incumbent explainer
 * voice where it has one, which settles the common case without a guess.
 */
function chooseReplacement(candidates, { knownCast, preferVoice, courseCode }) {
  const usable = (candidates || []).filter(
    (x) => !isComposite(x.voice_id) && knownCast.has(norm(x.voice_id))
  )
  if (!usable.length) return { clip: null, reason: 'no in-cast clip with identical text exists' }

  let pool = usable
  if (preferVoice && usable.some((x) => norm(x.voice_id) === preferVoice)) {
    pool = usable.filter((x) => norm(x.voice_id) === preferVoice)
  }
  const voices = [...new Set(pool.map((x) => norm(x.voice_id)))]
  if (voices.length > 1) {
    return { clip: null, reason: `ambiguous: identical text exists on ${voices.length} cast voices (${voices.join(', ')}) and nothing says which should narrate` }
  }
  // Same course first, then the newest render of that voice.
  const rank = (x) => [x.course_code === courseCode ? 0 : 1, -new Date(x.created_at).getTime()]
  pool = [...pool].sort((a, b) => {
    const ra = rank(a), rb = rank(b)
    return ra[0] - rb[0] || ra[1] - rb[1] || (a.id < b.id ? -1 : 1)
  })
  return { clip: pool[0], reason: null, alternatives: pool.slice(1).map((x) => x.id) }
}

const sh = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
/**
 * stdout AND stderr. ffmpeg writes volumedetect's measurement to STDERR and
 * exits 0, so an execFileSync that returns only stdout reads every clip as
 * "no level measured" — which failed 18 perfectly good twins on the first
 * dry run of this tool.
 */
const shBoth = (cmd, args) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8' })
  return `${r.stdout || ''}${r.stderr || ''}`
}

/**
 * MAKE-BEFORE-BREAK. Prove the replacement plays before any live row points at
 * it: the S3 object must fetch, ffprobe must read a duration, and the audio must
 * carry speech rather than silence. A clip that fails here is not a replacement.
 */
function verifyClipPlays(clip, tmpDir) {
  const res = { clip_id: clip.id, s3_key: clip.s3_key, alive: false }
  if (!clip.s3_key) { res.error = 'no s3_key'; return res }
  const mp3 = path.join(tmpDir, `${clip.id}.mp3`)
  try {
    sh('curl', ['-fsS', '--max-time', '60', '-o', mp3,
      `https://${BUCKET}.s3.${REGION}.amazonaws.com/${clip.s3_key}`])
    res.bytes = fs.statSync(mp3).size
    const dur = parseFloat(sh('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
      '-of', 'default=nw=1:nk=1', mp3]).trim())
    res.duration_s = Number.isFinite(dur) ? Number(dur.toFixed(2)) : null
    const vol = shBoth('ffmpeg', ['-hide_banner', '-nostats', '-i', mp3, '-af', 'volumedetect', '-f', 'null', '-'])
    const mean = /mean_volume:\s*(-?[\d.]+) dB/.exec(vol)
    res.mean_db = mean ? parseFloat(mean[1]) : null
    res.alive = !!(res.bytes > 1024 && res.duration_s && res.duration_s > 0.3 &&
      res.mean_db !== null && res.mean_db > -50)
    if (!res.alive) res.error = `bytes=${res.bytes} duration=${res.duration_s} mean_db=${res.mean_db}`
  } catch (e) {
    res.error = e.message
  }
  return res
}

const logPath = (courseCode, kind) =>
  path.join(REPO, 'docs', 'pods', `explainer-relink-${courseCode}-${DATE}-${kind}-log.json`)

async function main() {
  const tmp = fs.mkdtempSync(path.join(process.env.CS_SCRATCH || os.tmpdir(), 'relink-explainer-'))
  const c = new Client({ connectionString: process.env.DATABASE_URL })
  await c.connect()
  try {
    const { rows: pods } = await c.query(
      `select id, course_code, speakers::jsonb speakers from listening_pods
        where visibility = 'live' and ($1::text is null or id = $1)
          and ($2::text is null or slug like $2 || '%')`,
      [POD_FILTER || null, POD_FILTER ? null : SLUG_PREFIX]
    )
    if (!pods.length) throw new Error(`no live pod matched ${POD_FILTER || '(all)'}`)

    const perCourse = new Map()
    const skipped = []
    let offCastTotal = 0, relinkable = 0, unresolved = 0

    for (const pod of pods) {
      const cast = castVoices(pod.speakers)
      const knownCast = knownCastVoices(pod.speakers)
      // A pod with no cast at all (zzz_test_for_eng:pod-0) cannot say which of
      // its clips are off-cast, so it is SKIPPED loudly rather than swept: with
      // an empty cast every clip reads as off-cast, which is the one reading
      // that must never drive a write. Skipping one pod beats halting the fleet.
      if (!cast.size) {
        skipped.push(pod.id)
        console.log(`\n${pod.id}: SKIPPED — no cast voices in listening_pods.speakers, so off-cast cannot be judged`)
        continue
      }

      const { rows } = await c.query(
        `select s.id, s.global_order, s.speaker, s.explainer_text,
                ca.id clip_id, ca.voice_id, ca.text, ca.s3_key
           from listening_pod_sentences s
           join course_audio ca on ca.id = s.explainer_audio_id
          where s.pod_id = $1`,
        [pod.id]
      )
      const offCast = rows.filter((r) => isOffCast(r.voice_id, cast))
      if (!offCast.length) continue

      // The pod's incumbent narrator: the voice its ON-cast explainers already
      // use. Where it exists it settles any which-voice question without a guess.
      const tally = new Map()
      for (const r of rows) {
        if (isOffCast(r.voice_id, cast) || isComposite(r.voice_id)) continue
        const v = norm(r.voice_id)
        if (knownCast.has(v)) tally.set(v, (tally.get(v) || 0) + 1)
      }
      const preferVoice = [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null

      offCastTotal += offCast.length
      console.log(`\n${pod.id}: ${rows.length} linked explainers, ${offCast.length} OFF-CAST (cast: ${[...cast].join(', ')}${preferVoice ? `; incumbent narrator: ${preferVoice}` : ''})`)

      for (const r of offCast) {
        const { rows: cands } = await c.query(
          `select id, voice_id, course_code, language, role, s3_key, created_at
             from course_audio
            where text_normalized = any($1) and role = 'pod_explainer' and id <> $2`,
          [audioKeyCandidates(r.text), r.clip_id]
        )
        const pick = chooseReplacement(cands, { knownCast, preferVoice, courseCode: pod.course_code })

        const entry = {
          pod_id: pod.id,
          sentence_id: r.id,
          global_order: r.global_order,
          speaker: r.speaker,
          explainer_text: r.explainer_text,
          prior_explainer_audio_id: r.clip_id,      // ← the whole undo, per row
          prior_voice_id: r.voice_id,
          prior_s3_key: r.s3_key,
          clip_text: r.text,
        }

        if (!pick.clip) {
          entry.action = 'unresolved'
          entry.reason = pick.reason
          entry.same_text_candidates = cands.map((x) => `${x.id} ${x.voice_id} ${x.course_code}`)
          unresolved++
          console.log(`  · go=${r.global_order} ${r.voice_id} → UNRESOLVED (${pick.reason})`)
        } else {
          const alive = verifyClipPlays(pick.clip, tmp)
          entry.replacement_audio_id = pick.clip.id
          entry.replacement_voice_id = pick.clip.voice_id
          entry.replacement_s3_key = pick.clip.s3_key
          entry.replacement_course_code = pick.clip.course_code
          entry.replacement_alternatives = pick.alternatives || []
          entry.verification = alive
          if (!alive.alive) {
            entry.action = 'unresolved'
            entry.reason = `replacement ${pick.clip.id} did not verify: ${alive.error}`
            unresolved++
            console.log(`  · go=${r.global_order} ${r.voice_id} → UNRESOLVED (replacement fails make-before-break: ${alive.error})`)
          } else {
            entry.action = APPLY ? 'relinked' : 'would-relink'
            relinkable++
            console.log(`  ✓ go=${r.global_order} ${r.voice_id} → ${pick.clip.voice_id} ${pick.clip.id} (${alive.duration_s}s, ${alive.mean_db}dB)`)
          }
        }
        if (!perCourse.has(pod.course_code)) perCourse.set(pod.course_code, [])
        perCourse.get(pod.course_code).push(entry)
      }
    }

    console.log(`\n${offCastTotal} off-cast explainer links; ${relinkable} have a verified in-cast twin; ${unresolved} unresolved.`)
    if (skipped.length) console.log(`SKIPPED (no cast, not audited): ${skipped.join(', ')}`)

    if (APPLY) {
      await c.query('BEGIN')
      for (const [, entries] of perCourse) {
        for (const e of entries) {
          if (e.action !== 'relinked') continue
          // The predicate re-asserts the exact link we read, so a concurrent
          // writer that already moved this row loses the race, not the row.
          const res = await c.query(
            `update listening_pod_sentences
                set explainer_audio_id = $3
              where id = $1 and pod_id = $2 and explainer_audio_id = $4
              returning id`,
            [e.sentence_id, e.pod_id, e.replacement_audio_id, e.prior_explainer_audio_id]
          )
          if (res.rowCount !== 1) {
            throw new Error(`DRIFT: sentence ${e.sentence_id} no longer links clip ${e.prior_explainer_audio_id} — aborting whole run, nothing written`)
          }
        }
      }
      await c.query('COMMIT')
    }

    for (const [courseCode, entries] of perCourse) {
      const p = logPath(courseCode, APPLY ? 'applied' : 'dryrun')
      fs.writeFileSync(p, JSON.stringify(entries, null, 2))
      console.log(`${APPLY ? 'APPLIED' : 'DRY RUN'}: wrote ${entries.length} rows to ${p}`)
    }
    if (!APPLY) console.log('\nDRY RUN. Nothing written to the database. Pass --apply to move the links.')
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {})
    console.error('FAILED:', e.message)
    process.exitCode = 1
  } finally {
    await c.end()
  }
}

module.exports = { norm, voicesOf, isComposite, castVoices, knownCastVoices, isOffCast, chooseReplacement }

if (require.main === module) main()
