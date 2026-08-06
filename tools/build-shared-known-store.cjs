/**
 * build-shared-known-store.cjs — make the English known-side explainer audio a
 * SHARED store (recorded once, reused across ALL pod courses) with a CLEAN,
 * detectable pause between "means" and the gloss, then add the bare gloss by
 * SLICING it from that fresh clip.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * THE PROBLEM
 *   Today every pod course (spa_for_eng/es, hrv_for_eng/hr, …) owns its OWN copy
 *   of the English known-side explainer clips:
 *     course_audio: role='pod_explainer', voice_id='comp:leo',
 *                   text="means, <gloss>", course_code=<the target course>.
 *   The gloss is ENGLISH and identical across languages — so "means, thank you"
 *   is duplicated once per course. pod_legos.<course>:<key>.explainer_audio_id
 *   points at that per-course row.
 *
 *   Worse, those existing clips use a COMMA pause that the speaker runs through —
 *   too short to silencedetect-slice the bare gloss reliably (measured: a long
 *   tail of clips have a <200ms gap, 8 have effectively none). So we do NOT reuse
 *   them.
 *
 * THE DESIGN (no schema change)
 *   A SHARED store keyed by course_code='pod_known_en', language='en',
 *   role='pod_explainer', voice_id='comp:leo':
 *     • shared MEANS-X row  text="means, <gloss>"  (canonical stored text — what
 *       pod_legos already matches), but the AUDIO is RE-RENDERED ONCE per unique
 *       gloss as "means… <gloss>" (ELLIPSIS) in xAI leo. The ellipsis gives a
 *       clean, consistent ~450ms pause (validated: 498/431/453ms on the sample
 *       glosses) that reads as one natural "means X" unit AND silencedetect-slices
 *       cleanly — unlike the comma. New S3 object.
 *     • shared BARE-X  row  text="· <gloss>"  (leading "· " marker so it never
 *       collides with the means-X row's text_normalized). AUDIO = the gloss
 *       SLICED out of the fresh means… clip: silencedetect the ellipsis pause,
 *       slice [pause_end .. end], finish at 192k/-16 LUFS via render-lib. New S3
 *       object. No second synthesis — the bare gloss is the SAME take as means-X.
 *   Then REPOINT every course's pod_legos.explainer_audio_id → the SHARED
 *   means-X row id (so all courses share one English store). The bare gloss is
 *   resolved by gloss text in the shared store (no new column).
 *
 * RENDER ECONOMY: ONE xAI leo call per UNIQUE gloss (753 today), not per course
 *   and not per (means+bare) — the bare gloss is sliced from the same take.
 *
 * IDEMPOTENT. Default (and --dry-run) does ZERO writes/renders and just prints
 *   the plan. --execute performs the renders/uploads/writes.
 *
 * Usage:
 *   node tools/build-shared-known-store.cjs --dry-run   # plan only (default)
 *   node tools/build-shared-known-store.cjs --execute   # real run (renders TTS)
 */

'use strict'

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const fs = require('fs')
const os = require('os')
const { v4: uuidv4 } = require('uuid')
const { execFileSync, spawnSync } = require('child_process')
const { createClient } = require('@supabase/supabase-js')
const { AUDIO_CACHE_CONTROL } = require('../services/shared/audio-cache-control.cjs')
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
const { normalizeForAudio } = require('../services/shared/text-normalize.cjs')
const { canonicalLanguage, canonicalVoiceId } = require('../services/shared/clip-identity.cjs')
const lib = require('../scripts/experiments/stage0-tuner/render-lib.cjs')

// ── flags ──────────────────────────────────────────────────────────────────
const EXECUTE = process.argv.includes('--execute')
const DRY_RUN = !EXECUTE  // default + --dry-run => no writes/renders

// ── shared-store identity ────────────────────────────────────────────────────
const SHARED_COURSE = 'pod_known_en'
// Canonical identity (services/shared/clip-identity.cjs), computed rather than
// spelt so it can never drift again. These used to be hard-coded 'en' and
// 'comp:leo' — ISO-639-1 and a bare composite tag — deliberately propagated to
// match the existing means-X rows. Matching prior drift is how drift spreads:
// the reader (api/pod-content.js) is what has to accept both spellings, not the
// writer. It does, temporarily, until the approved back-fill runs.
const SHARED_LANG = canonicalLanguage('en')          // 'eng'
const ROLE = 'pod_explainer'
const VOICE_ID = canonicalVoiceId('comp:leo')        // 'comp:xai_leo'
/**
 * TEMPORARY. Rows written before canonicalisation still carry the old spelling,
 * so every READ in this file has to accept both — a read that only matched the
 * new spelling would find no existing rows and re-render the entire store,
 * which is real TTS spend. Delete this list (and turn the `.in()`s back into
 * `.eq(VOICE_ID)` / `.eq(SHARED_LANG)`) once the approved back-fill has
 * rewritten the pre-canonical rows.
 */
const LEGACY_VOICE_IDS = ['comp:leo']
const VOICE_ID_READ = [VOICE_ID, ...LEGACY_VOICE_IDS]
const ORIGIN = 'tts'
const BARE_PREFIX = '· '       // leading marker that distinguishes bare-X from means-X

// ── render parameters (validated punctuation test) ───────────────────────────
const XAI_VOICE = 'leo'        // xAI English/known voice on _for_eng pods
const XAI_LANG = 'en'
// "means… <gloss>" — the ellipsis pause reads as a natural unit and slices clean.
const meansRenderText = (gloss) => `means… ${gloss}`
// Canonical STORED text on the means-X row (what pod_legos.known already matches).
const meansStoredText = (gloss) => `means, ${gloss}`

// ── substrate (audio bucket, NOT the LFS S3_BUCKET) ──────────────────────────
const S3_BUCKET = process.env.S3_AUDIO_BUCKET || 'ssi-audio-stage'
const AWS_REGION = process.env.AWS_REGION || 'eu-west-1'
const SR = 48000

const s3 = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})
const supabase = createClient(
  (process.env.SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_KEY || '').trim(),
  { auth: { persistSession: false, autoRefreshToken: false } },
)

function log(...a) { console.log(...a) }

// ── ffmpeg helpers (the bare-gloss slice) ────────────────────────────────────
function ff(args) {
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args])
}
function ffprobeDur(f) {
  return parseFloat(execFileSync('ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f],
    { encoding: 'utf8' }).trim())
}
function silenceRuns(f, noiseDb, minD) {
  const r = spawnSync('ffmpeg',
    ['-hide_banner', '-nostats', '-i', f, '-af', `silencedetect=noise=${noiseDb}dB:d=${minD}`, '-f', 'null', '-'],
    { encoding: 'utf8' })
  const txt = (r.stderr || '') + (r.stdout || '')
  const seams = []
  let cur = null
  for (const line of txt.split('\n')) {
    let m = line.match(/silence_start:\s*(-?[0-9.]+)/)
    if (m) { cur = parseFloat(m[1]); continue }
    m = line.match(/silence_end:\s*([0-9.]+)/)
    if (m && cur != null) { seams.push({ start: Math.max(0, cur), end: parseFloat(m[1]) }); cur = null }
  }
  return seams
}

/**
 * Find the ellipsis pause after "means…" — the boundary at which the bare gloss
 * begins. With the ellipsis render the gap is a clean ~450ms, so a single firm
 * threshold finds it: first internal pause (start>0.10) at -35dB/0.10. A small
 * looser fallback (windowed to where "means" ends) covers any short outlier.
 * Returns the pause run, or null (caller skips the bare-X and flags the gloss).
 */
function detectPause(f, dur) {
  const primary = silenceRuns(f, -35, 0.10).filter((s) => s.start > 0.10 && s.end < dur - 0.05)
  if (primary[0] && dur - primary[0].end > 0.08) return primary[0]
  for (const [noise, d] of [[-30, 0.08], [-30, 0.05], [-28, 0.05]]) {
    const w = silenceRuns(f, noise, d).filter((s) => s.start > 0.20 && s.start < 0.95 && s.end < dur - 0.05)
    if (w[0] && dur - w[0].end > 0.08) return w[0]
  }
  return null
}

/**
 * Render "means… <gloss>" once in xAI leo, finish to mp3, and slice the bare
 * gloss out of the SAME take. Returns { meansMp3, bareMp3, meansDurMs, bareDurMs,
 * pauseEnd } or throws (caller flags the gloss). One xAI call per gloss.
 */
async function renderAndSlice(tmpDir, glossKey, gloss) {
  const tag = (glossKey.replace(/[^a-z0-9]+/gi, '_').slice(0, 40)) || 'g'
  // 1. render "means… <gloss>" -> WAV (full natural speed, like the means clips)
  const rawWav = path.join(tmpDir, `means-${tag}.wav`)
  await lib.xaiToWav(tmpDir, `means-${tag}`, meansRenderText(gloss), XAI_VOICE, XAI_LANG, rawWav)
  // 2. finish the full means… clip (192k, -16 LUFS) — this is the shared means-X audio
  const meansMp3 = path.join(tmpDir, `MEANS-${tag}.mp3`)
  lib.finishToMp3File(tmpDir, `means-${tag}`, rawWav, meansMp3)
  const meansDur = ffprobeDur(meansMp3)
  // 3. find the ellipsis pause and slice the bare gloss from the SAME take
  const pause = detectPause(meansMp3, meansDur)
  if (!pause) throw new Error(`no ellipsis pause detected for "means… ${gloss}" (dur=${meansDur.toFixed(3)}s)`)
  const ss = Math.max(0, pause.end - 0.01)  // tiny lead so the onset isn't clipped
  const bareWav = path.join(tmpDir, `bare-${tag}.wav`)
  ff(['-ss', ss.toFixed(3), '-to', meansDur.toFixed(3), '-i', meansMp3,
      '-ac', '1', '-ar', String(SR), '-c:a', 'pcm_s16le', bareWav])
  const bareMp3 = path.join(tmpDir, `BARE-${tag}.mp3`)
  lib.finishToMp3File(tmpDir, `bare-${tag}`, bareWav, bareMp3)
  return {
    meansMp3,
    bareMp3,
    meansDurMs: Math.round(meansDur * 1000),
    bareDurMs: lib.verifyMp3(bareMp3).durMs,
    pauseEnd: pause.end,
  }
}

async function uploadMp3(file) {
  const id = uuidv4().toUpperCase()
  const key = `mastered/${id}.mp3`
  await s3.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, Body: fs.readFileSync(file), ContentType: 'audio/mpeg', CacheControl: AUDIO_CACHE_CONTROL }))
  return { id, key }
}

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  log(`build-shared-known-store ${DRY_RUN ? '(DRY RUN — no writes/renders)' : '(EXECUTE — rendering + writing)'}`)
  log(`  shared store: course_code=${SHARED_COURSE} language=${SHARED_LANG} role=${ROLE} voice=${VOICE_ID}`)
  log(`  render: xAI ${XAI_VOICE}/${XAI_LANG}  treatment="means… <gloss>" (ellipsis ≈450ms pause)`)
  log(`  audio bucket: s3://${S3_BUCKET} (${AWS_REGION})  bare marker="${BARE_PREFIX}"\n`)

  // 1. all pod_legos (the per-course inventory units we'll repoint).
  const { data: legos, error: lErr } = await supabase
    .from('pod_legos')
    .select('id, course_code, lego_key, target, known, explainer_audio_id')
  if (lErr) throw new Error(`pod_legos select: ${lErr.message}`)

  // 2. existing per-course means-X clips — only to confirm each lego HAS a gloss
  //    (we no longer reuse their s3_key; we re-render).
  const { data: caRows, error: cErr } = await supabase
    .from('course_audio')
    .select('id, text, text_normalized')
    .eq('role', ROLE)
    .in('voice_id', VOICE_ID_READ)
    .like('text', 'means, %')
  if (cErr) throw new Error(`course_audio select: ${cErr.message}`)
  const meansById = new Map(caRows.map((r) => [r.id, r]))

  // 3. existing shared-store rows (idempotency).
  const { data: sharedRows, error: sErr } = await supabase
    .from('course_audio')
    .select('id, text, text_normalized, s3_key')
    .eq('course_code', SHARED_COURSE)
    .eq('role', ROLE)
    .in('voice_id', VOICE_ID_READ)
  if (sErr) throw new Error(`shared course_audio select: ${sErr.message}`)
  const sharedByNorm = new Map()
  for (const r of sharedRows || []) sharedByNorm.set(r.text_normalized, r)

  // ── group pod_legos by unique English gloss ────────────────────────────────
  const glosses = new Map()  // glossNorm -> { known, legoIds:[], _meansNorm, _bareNorm, _meansExisting, _bareExisting }
  let legosUnresolved = 0
  for (const L of legos) {
    const means = L.explainer_audio_id ? meansById.get(L.explainer_audio_id) : null
    if (!means) { legosUnresolved++; continue }  // no current explainer to derive the gloss from
    const glossNorm = normalizeForAudio(L.known)
    if (!glosses.has(glossNorm)) glosses.set(glossNorm, { known: L.known, legoIds: [] })
    glosses.get(glossNorm).legoIds.push({ id: L.id, course: L.course_code, currentExp: L.explainer_audio_id })
  }

  const glossEntries = [...glosses.entries()].sort((a, b) => a[0].localeCompare(b[0]))

  let plannedMeansCreate = 0, plannedMeansExist = 0
  let plannedBareSlice = 0, plannedBareExist = 0
  let plannedRepoints = 0

  for (const [, G] of glossEntries) {
    G._meansNorm = normalizeForAudio(meansStoredText(G.known))
    G._bareNorm = normalizeForAudio(`${BARE_PREFIX}${G.known}`)
    G._meansExisting = sharedByNorm.get(G._meansNorm) || null
    G._bareExisting = sharedByNorm.get(G._bareNorm) || null
    if (G._meansExisting) plannedMeansExist++; else plannedMeansCreate++
    if (G._bareExisting) plannedBareExist++; else plannedBareSlice++
    for (const lg of G.legoIds) {
      // would repoint unless it already points at the existing shared means-X row
      if (!G._meansExisting || lg.currentExp !== G._meansExisting.id) plannedRepoints++
    }
  }

  // ── PRINT THE PLAN ─────────────────────────────────────────────────────────
  log('=== PLAN ===')
  log(`pod_legos rows scanned:            ${legos.length}` + (legosUnresolved ? `  (${legosUnresolved} with no current explainer — SKIPPED)` : ''))
  log(`unique English glosses:            ${glosses.size}`)
  log('')
  log(`shared means-X to RENDER (once):   ${plannedMeansCreate}   (already present: ${plannedMeansExist})`)
  log(`shared bare-X   to SLICE:          ${plannedBareSlice}     (already present: ${plannedBareExist})`)
  log(`xAI leo TTS calls (1 per gloss):   ${plannedMeansCreate}`)
  log(`pod_legos rows to REPOINT:         ${plannedRepoints}      (of ${legos.length - legosUnresolved} resolvable)`)
  log('')

  // 3 sample glosses with their planned rows.
  log('=== 3 SAMPLE GLOSSES (planned rows) ===')
  for (const [, G] of glossEntries.slice(0, 3)) {
    const courses = [...new Set(G.legoIds.map((l) => l.course))].join(', ')
    log(`\n  gloss: "${G.known}"   (${G.legoIds.length} pod_legos point here)`)
    log(`    RENDER          xAI ${XAI_VOICE}: "means… ${G.known}"  (ellipsis ≈450ms pause)`)
    log(`    shared means-X  text="${meansStoredText(G.known)}"  course_code=${SHARED_COURSE} language=${SHARED_LANG} voice=${VOICE_ID}`)
    log(`                    s3_key = NEW mastered/{uuid}.mp3 (the full means… take, 192k/-16LUFS)` + (G._meansExisting ? `  [already exists id=${G._meansExisting.id}]` : '  [NEW ROW]'))
    log(`    shared bare-X   text="${BARE_PREFIX}${G.known}"`)
    log(`                    s3_key = NEW mastered/{uuid}.mp3 (SLICED from the SAME take after the ellipsis pause)` + (G._bareExisting ? `  [already exists id=${G._bareExisting.id}]` : '  [NEW SLICE]'))
    log(`    repoint         ${G.legoIds.length} pod_legos (${courses}) .explainer_audio_id -> shared means-X id`)
  }

  // ── EXECUTE (only with --execute) ──────────────────────────────────────────
  if (DRY_RUN) {
    log('\n(DRY RUN — nothing rendered or written. Re-run with --execute to apply.)')
    log('Note: ~1% of glosses may have an undetectable pause on first render; the')
    log('tool flags those (means-X still written, bare-X skipped) so they can be')
    log('hand-handled rather than mis-sliced.')
    return
  }

  log('\n=== EXECUTING (renders TTS + writes) ===')
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shared-known-'))
  let createdMeans = 0, reusedMeans = 0, slicedBare = 0, reusedBare = 0, repointed = 0
  const flagged = []
  const meansIdByGloss = new Map()

  for (const [glossNorm, G] of glossEntries) {
    let meansId = G._meansExisting?.id || null
    let bareReady = !!G._bareExisting

    if (!meansId || !bareReady) {
      // render once + slice (only if we still need either row)
      let r
      try {
        r = await renderAndSlice(tmpDir, glossNorm, G.known)
      } catch (e) {
        // render/slice failed: if means-X is missing we still want it, but without
        // a slice we can't get the bare-X. Render means-X alone as a fallback.
        flagged.push({ gloss: G.known, reason: e.message })
        if (!meansId) {
          try {
            const tag = (glossNorm.replace(/[^a-z0-9]+/gi, '_').slice(0, 40)) || 'g'
            const rawWav = path.join(tmpDir, `meansonly-${tag}.wav`)
            await lib.xaiToWav(tmpDir, `meansonly-${tag}`, meansRenderText(G.known), XAI_VOICE, XAI_LANG, rawWav)
            const meansMp3 = path.join(tmpDir, `MEANSONLY-${tag}.mp3`)
            lib.finishToMp3File(tmpDir, `meansonly-${tag}`, rawWav, meansMp3)
            const up = await uploadMp3(meansMp3)
            const { data: ins, error } = await supabase.from('course_audio').upsert({
              id: up.id, course_code: SHARED_COURSE, text: meansStoredText(G.known), text_normalized: G._meansNorm,
              language: SHARED_LANG, role: ROLE, voice_id: VOICE_ID, origin: ORIGIN, s3_key: up.key,
              duration_ms: Math.round(ffprobeDur(meansMp3) * 1000),
            }, { onConflict: 'course_code,text_normalized,language,role,voice_id' }).select('id').single()
            if (error) throw new Error(`means-X upsert "${G.known}": ${error.message}`)
            meansId = ins.id; createdMeans++
          } catch (e2) {
            log(`  [means-X FAILED] "${G.known}": ${e2.message}`)
          }
        }
        meansIdByGloss.set(glossNorm, meansId)
        continue
      }

      // means-X row
      if (!meansId) {
        const up = await uploadMp3(r.meansMp3)
        const { data: ins, error } = await supabase.from('course_audio').upsert({
          id: up.id, course_code: SHARED_COURSE, text: meansStoredText(G.known), text_normalized: G._meansNorm,
          language: SHARED_LANG, role: ROLE, voice_id: VOICE_ID, origin: ORIGIN, s3_key: up.key,
          duration_ms: r.meansDurMs,
        }, { onConflict: 'course_code,text_normalized,language,role,voice_id' }).select('id').single()
        if (error) throw new Error(`means-X upsert "${G.known}": ${error.message}`)
        meansId = ins.id; createdMeans++
      } else { reusedMeans++ }

      // bare-X row
      if (!bareReady) {
        const up = await uploadMp3(r.bareMp3)
        const { error } = await supabase.from('course_audio').upsert({
          id: up.id, course_code: SHARED_COURSE, text: `${BARE_PREFIX}${G.known}`, text_normalized: G._bareNorm,
          language: SHARED_LANG, role: ROLE, voice_id: VOICE_ID, origin: ORIGIN, s3_key: up.key,
          duration_ms: r.bareDurMs,
        }, { onConflict: 'course_code,text_normalized,language,role,voice_id' })
        if (error) throw new Error(`bare-X upsert "${G.known}": ${error.message}`)
        slicedBare++
      } else { reusedBare++ }
    } else {
      reusedMeans++; reusedBare++
    }
    meansIdByGloss.set(glossNorm, meansId)
  }

  // repoint every pod_legos.explainer_audio_id -> shared means-X id.
  for (const [glossNorm, G] of glossEntries) {
    const meansId = meansIdByGloss.get(glossNorm)
    if (!meansId) continue
    for (const lg of G.legoIds) {
      if (lg.currentExp === meansId) continue
      const { error } = await supabase.from('pod_legos')
        .update({ explainer_audio_id: meansId, updated_at: new Date().toISOString() })
        .eq('id', lg.id)
      if (error) throw new Error(`pod_legos repoint ${lg.id}: ${error.message}`)
      repointed++
    }
  }

  log('\n=== DONE ===')
  log(`shared means-X rendered: ${createdMeans}  reused: ${reusedMeans}`)
  log(`shared bare-X   sliced:  ${slicedBare}  reused: ${reusedBare}`)
  log(`pod_legos repointed:     ${repointed}`)
  if (flagged.length) {
    log(`\nFLAGGED (no detectable pause — bare-X skipped, hand-handle): ${flagged.length}`)
    for (const f of flagged) log(`  "${f.gloss}" — ${f.reason}`)
  }
}

main().catch((e) => { console.error('FATAL:', e.message); process.exit(1) })
