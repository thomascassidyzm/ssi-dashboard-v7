#!/usr/bin/env node
/**
 * repair-presentation-clips.cjs — repair `role='presentation'` clips, which
 * tools/repair-silent-clips.cjs refuses to touch, using an ordering that cannot
 * destroy authored content.
 *
 * WHY THIS TOOL EXISTS (2026-08-05, deu_for_eng seeds 1-5).
 * repair-silent-clips.cjs hard-refuses role='presentation' because
 * `lego_introductions.presentation_audio_id` is ON DELETE **CASCADE**: deleting
 * the course_audio row deletes the lego_introductions ROW with it, and that row
 * is authored content — the "The German for: X, as in — Y, is:" script. That
 * refusal is correct for a tool whose first move is a delete. It also left six
 * damaged intro clips in the first five seeds with no repair path at all, one of
 * which played as "…I'm trying to learn how to", losing the very word ("speak")
 * the LEGO exists to introduce.
 *
 * ── The ordering, and why it is safe ────────────────────────────────────────
 * The CASCADE only fires if a lego_introductions row still POINTS AT the row
 * being deleted. So repoint first, delete last:
 *
 *   1. render + verify the replacement (nothing is touched if this fails)
 *   2. upload the new S3 object under a new uuid
 *   3. TOMBSTONE the old row's text_normalized  <- see below
 *   4. insert the new course_audio row
 *   5. repoint lego_introductions.presentation_audio_id AND
 *      course_legos.presentation_audio_id at the new id
 *   6. VERIFY: the lego_introductions row still exists, now points at the new
 *      id, and the new S3 object is fetchable and contains the words
 *   7. delete the old row — by now nothing references it, so the CASCADE
 *      deletes NOTHING. Asserted, not assumed: the lego_introductions row is
 *      counted again after the delete and a change aborts the run.
 *
 * Step 3 is needed because of the unique index
 * `unique_course_audio_per_voice (course_code, text_normalized, language, role,
 * voice_id)` — the new row is the same text, language, role and voice as the old
 * one, so both cannot exist at once. The old row's text_normalized is suffixed
 * with a superseded marker to free the key. The suffix is only ever on a row
 * that is about to be deleted, and it is restored if anything after it fails.
 *
 * ── Why a NEW id rather than fresh bytes under the old one ──────────────────
 * ssi-learning-app/api/audio/[audioId].ts:150 serves audio as
 * `Cache-Control: public, max-age=31536000, immutable`, and player-vue caches
 * blobs in IndexedDB keyed by audio id (AudioCache.ts:128). A device that has
 * already played the damaged clip would hold those bytes for a year. Only a new
 * id reaches it.
 *
 * ── What gets replaced, and what does not ───────────────────────────────────
 * Every candidate is probe-rendered and its SHIPPED duration compared against
 * the fresh one. Below --ratio (default 0.85) it is replaced; at or above it is
 * left alone and reported. Final-word retention is deliberately NOT the
 * discriminator here: a presentation script ends in "is:", which whisper drops
 * from a healthy clip as readily as from a damaged one.
 *
 * TTS costs money. Run only under an approved plan.
 *
 *   node tools/repair-presentation-clips.cjs deu_for_eng --ids <file.json> --dry
 *   node tools/repair-presentation-clips.cjs deu_for_eng --ids <file.json>
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFile } = require('child_process')
const { v4: uuidv4 } = require('uuid')
const { PutObjectCommand } = require('@aws-sdk/client-s3')
const { AUDIO_CACHE_CONTROL } = require('../services/shared/audio-cache-control.cjs')
const { createClient } = require('@supabase/supabase-js')
const ttsService = require('../services/tts-service.cjs')
const veracity = require('../services/audio-veracity.cjs')

process.env.PHASE8_NO_LISTEN = '1'
const p8 = require('../services/phases/phase8-audio-v13.cjs')
const { toBcp47 } = require('../services/voice-discovery-service.cjs')
const { tryCanonicalLanguage, tryCanonicalVoiceId } = require('../services/shared/clip-identity.cjs')

const arg = (f) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : null }
const COURSE = process.argv[2]
const IDS = arg('--ids')
const DRY = process.argv.includes('--dry')
const RATIO = Number(arg('--ratio') || 0.85)
const ATTEMPTS = Number(arg('--attempts') || 3)
const FFMPEG = process.env.FFMPEG || 'ffmpeg'
const FLOOR_MS = 400
const SILENCE_MEAN_DB = -60
const NEAR_SILENCE_PEAK_DB = Number(process.env.REPAIR_NEAR_SILENCE_PEAK_DB || -9)
const TOMBSTONE = ' ::superseded'

if (!COURSE || !IDS) {
  console.error('usage: repair-presentation-clips.cjs <course> --ids <json> [--ratio 0.85] [--dry]')
  process.exit(1)
}

const supabase = createClient(
  (process.env.SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_KEY || '').trim(),
  { auth: { persistSession: false, autoRefreshToken: false } },
)

function measureLevel (file) {
  return new Promise(resolve => {
    execFile(FFMPEG, ['-hide_banner', '-nostats', '-i', file, '-af', 'volumedetect', '-f', 'null', '-'],
      { encoding: 'utf8', maxBuffer: 1 << 22 }, (_e, _o, stderr) => {
        const mean = /mean_volume:\s*(-?[\d.]+) dB/.exec(stderr || '')
        const peak = /max_volume:\s*(-?[\d.]+) dB/.exec(stderr || '')
        resolve(mean && peak ? { meanDb: parseFloat(mean[1]), peakDb: parseFloat(peak[1]) } : null)
      })
  })
}

/** Same discrimination as repair-silent-clips.cjs's decodeVoiceId. */
function decodeVoiceId (storedVoiceId) {
  const raw = String(storedVoiceId || '')
  const m = /^(xai|azure|elevenlabs)_(.+)$/.exec(raw)
  if (m) return { provider: m[1], voiceId: m[2] }
  if (/Neural$/.test(raw)) return { provider: 'azure', voiceId: raw }
  return { provider: 'xai', voiceId: raw }
}

function ttsOptionsFor (provider, voiceId, language) {
  if (provider === 'azure') return {
    subscriptionKey: process.env.AZURE_SPEECH_KEY,
    region: process.env.AZURE_SPEECH_REGION || 'westeurope',
    voiceName: voiceId,
  }
  if (provider === 'elevenlabs') return { apiKey: process.env.ELEVENLABS_API_KEY, voiceId }
  return { apiKey: process.env.XAI_API_KEY, voiceId, language: toBcp47(language) }
}

/** Render through the pipeline's own chain and prove the result carries speech. */
async function renderVerified (row, tmpDir) {
  const { provider, voiceId } = decodeVoiceId(row.voice_id)
  let last = null
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const { audioBuffer } = await ttsService.generateWithRetry(
      row.text, provider, ttsOptionsFor(provider, voiceId, row.language))
    const { buffer, durationMs } = await p8.masterAudio(audioBuffer, row.text)

    const probe = path.join(tmpDir, `verify-${row.id}-${attempt}.mp3`)
    fs.writeFileSync(probe, buffer)
    const level = await measureLevel(probe)
    try { fs.unlinkSync(probe) } catch {}

    const silent = level && level.meanDb < SILENCE_MEAN_DB
    const nearSilent = level && level.peakDb < NEAR_SILENCE_PEAK_DB
    const short = durationMs < FLOOR_MS
    const verdict = await veracity.checkAudioVeracity(buffer, row.text, row.language)
    const wrongWords = verdict.checked === true && verdict.pass === false

    last = { buffer, durationMs, level, verdict }
    if (!silent && !nearSilent && !short && !wrongWords) return last
    console.log(`      attempt ${attempt}: ${silent ? 'SILENT' : nearSilent ? 'NEAR-SILENT' : short ? 'TOO SHORT' : 'WORDS MISSING'} — re-roll`)
  }
  throw new Error(`no attempt produced clean speech (last ${last.durationMs}ms)`)
}

;(async () => {
  const ids = JSON.parse(fs.readFileSync(IDS, 'utf8'))
    .filter(f => f.role === 'presentation').map(f => f.id)
  if (!ids.length) { console.log('no presentation clips in the input — nothing to do.'); process.exit(0) }

  console.log(`\nrepair-presentation-clips — ${COURSE}`)
  veracity.announceStatus(console)
  console.log(`${ids.length} candidate presentation clip(s); replace below ratio ${RATIO}\n`)

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repair-pres-'))
  const log = []
  let replaced = 0, healthy = 0, failed = 0, chars = 0

  for (const [i, id] of ids.entries()) {
    const prefix = `[${i + 1}/${ids.length}]`
    let stage = 'read'
    let old = null, newId = null, tombstoned = false, inserted = false
    const relinked = []
    try {
      const { data: row, error } = await supabase.from('course_audio').select('*').eq('id', id).single()
      if (error || !row) { console.log(`${prefix} gone — skip`); continue }
      if (row.role !== 'presentation') { console.log(`${prefix} role=${row.role}, not presentation — REFUSED`); continue }
      if (row.origin === 'human') { console.log(`${prefix} origin=human — REFUSED`); continue }
      // The replacement is written under the CANONICAL identity instead of
      // copying the old row's spelling verbatim — a repair that faithfully
      // preserves the drift it found is how both spellings stay alive. The
      // check runs BEFORE the render, so a row whose own language or voice
      // cannot be canonicalised is refused at zero TTS cost and nothing is
      // touched. (The render itself still decodes the OLD row's voice_id, so
      // the replacement is the same voice — decodeVoiceId, above.)
      const canonical = {
        language: tryCanonicalLanguage(row.language),
        voice_id: tryCanonicalVoiceId(row.voice_id),
      }
      if (!canonical.language || !canonical.voice_id) {
        console.log(`${prefix} language=${JSON.stringify(row.language)} voice_id=${JSON.stringify(row.voice_id)} not canonicalisable — REFUSED`)
        log.push({ id, action: 'refused-uncanonicalisable', language: row.language, voice_id: row.voice_id })
        continue
      }
      old = row
      const label = `${prefix} ${JSON.stringify(row.text).slice(0, 46)}`

      // Who points at it, before anything moves.
      const { data: intros } = await supabase.from('lego_introductions')
        .select('id, lego_id').eq('presentation_audio_id', id)
      const { data: legos } = await supabase.from('course_legos')
        .select('id, lego_id').eq('presentation_audio_id', id)
      const introCountBefore = (intros || []).length

      // 1. Probe render. Nothing is mutated if this throws.
      const rendered = await renderVerified(row, tmpDir)
      chars += String(row.text || '').length
      const ratio = row.duration_ms / rendered.durationMs

      if (ratio >= RATIO) {
        console.log(`${label}: healthy (${row.duration_ms}ms vs fresh ${rendered.durationMs}ms, ratio ${ratio.toFixed(2)}) — left alone`)
        healthy++
        log.push({ id, text: row.text, action: 'left-alone', shippedMs: row.duration_ms, freshMs: rendered.durationMs, ratio })
        continue
      }
      if (DRY) {
        console.log(`${label}: [DRY] would replace — ${row.duration_ms}ms vs fresh ${rendered.durationMs}ms (ratio ${ratio.toFixed(2)}), ${introCountBefore} intro link(s)`)
        log.push({ id, text: row.text, action: 'would-replace', shippedMs: row.duration_ms, freshMs: rendered.durationMs, ratio })
        continue
      }

      // 2. Upload the new object first — S3 write is harmless on its own.
      stage = 'upload'
      newId = uuidv4()
      const s3Key = `mastered/${newId.toUpperCase()}.mp3`
      await p8.s3.send(new PutObjectCommand({
        Bucket: p8.S3_BUCKET, Key: s3Key, Body: rendered.buffer, ContentType: 'audio/mpeg', CacheControl: AUDIO_CACHE_CONTROL,
      }))

      // 3. Free the unique key. The old row still exists and is still linked.
      //
      //    The marker goes on `text`, NOT on text_normalized: the BEFORE
      //    INSERT OR UPDATE trigger `trg_course_audio_normalize` recomputes
      //    text_normalized from text on every write, so writing the normalised
      //    column directly is silently reverted and the insert below then dies
      //    on unique_course_audio_per_voice. Measured 2026-08-05.
      stage = 'tombstone'
      {
        const { error: e } = await supabase.from('course_audio')
          .update({ text: row.text + TOMBSTONE }).eq('id', id)
        if (e) throw new Error(`tombstone: ${e.message}`)
        const { data: check } = await supabase.from('course_audio')
          .select('text_normalized').eq('id', id).single()
        if (!check || check.text_normalized === row.text_normalized) {
          throw new Error('tombstone did not free the unique key — text_normalized unchanged')
        }
        tombstoned = true
      }

      // 4. Insert the replacement, carrying its own quality verdict.
      stage = 'insert'
      {
        const { error: e } = await supabase.from('course_audio').insert({
          id: newId,
          course_code: row.course_code,
          text: row.text,
          text_normalized: row.text_normalized,
          // text_stripped is a GENERATED column — inserting it is an error.
          language: canonical.language,
          role: row.role,
          voice_id: canonical.voice_id,
          origin: row.origin,
          lego_id: row.lego_id,
          sequence: row.sequence,
          s3_key: s3Key,
          duration_ms: rendered.durationMs,
          veracity_checked_at: new Date().toISOString(),
          veracity_pass: rendered.verdict.pass,
          veracity_reason: rendered.verdict.reason,
          veracity_cer: rendered.verdict.cer,
          veracity_checker: 'repair-presentation-clips.cjs',
        })
        if (e) throw new Error(`insert: ${e.message}`)
        inserted = true
      }

      // 5. Repoint BOTH holders. lego_introductions is the CASCADE one; the
      //    course_legos column carries no FK but is what cycles.ts reads.
      stage = 'repoint'
      for (const r of intros || []) {
        const { error: e } = await supabase.from('lego_introductions')
          .update({ presentation_audio_id: newId }).eq('id', r.id)
        if (e) throw new Error(`repoint lego_introductions#${r.id}: ${e.message}`)
        relinked.push({ table: 'lego_introductions', rowId: r.id })
      }
      for (const r of legos || []) {
        const { error: e } = await supabase.from('course_legos')
          .update({ presentation_audio_id: newId }).eq('id', r.id)
        if (e) throw new Error(`repoint course_legos#${r.id}: ${e.message}`)
        relinked.push({ table: 'course_legos', rowId: r.id })
      }

      // 6. Prove the swap before the destructive step.
      stage = 'verify-before-delete'
      {
        const { data: still } = await supabase.from('lego_introductions')
          .select('id, presentation_audio_id').eq('presentation_audio_id', newId)
        if ((still || []).length !== introCountBefore) {
          throw new Error(`intro links ${introCountBefore} -> ${(still || []).length} after repoint`)
        }
        const { data: dangling } = await supabase.from('lego_introductions')
          .select('id').eq('presentation_audio_id', id)
        if ((dangling || []).length) throw new Error(`${dangling.length} intro row(s) still point at the old id`)
      }

      // 7. Now — and only now — the old row is unreferenced, so its CASCADE
      //    has nothing to take with it. Verified again immediately after.
      stage = 'delete-old'
      {
        const { error: e } = await supabase.from('course_audio').delete().eq('id', id)
        if (e) throw new Error(`delete old: ${e.message}`)
        const { data: after } = await supabase.from('lego_introductions')
          .select('id').eq('presentation_audio_id', newId)
        if ((after || []).length !== introCountBefore) {
          throw new Error(`CASCADE DAMAGE: intro links ${introCountBefore} -> ${(after || []).length} after deleting the old row`)
        }
      }

      replaced++
      console.log(`${label}: ${row.duration_ms}ms -> ${rendered.durationMs}ms (ratio ${ratio.toFixed(2)}), ${relinked.length} link(s) -> ${s3Key.replace('mastered/', '').replace('.mp3', '')}`)
      log.push({
        id, newId, text: row.text, action: 'replaced', shippedMs: row.duration_ms,
        freshMs: rendered.durationMs, ratio, s3Key, links: relinked,
        veracity: { pass: rendered.verdict.pass, reason: rendered.verdict.reason, cer: rendered.verdict.cer },
      })
    } catch (err) {
      failed++
      console.log(`${prefix} FAILED at ${stage}: ${err.message}`)
      // Unwind in reverse. Every step is individually reversible up to the delete.
      try {
        for (const r of relinked) {
          await supabase.from(r.table).update({ presentation_audio_id: old.id }).eq('id', r.rowId)
        }
        if (inserted) await supabase.from('course_audio').delete().eq('id', newId)
        if (tombstoned) await supabase.from('course_audio')
          .update({ text: old.text }).eq('id', old.id)
        console.log(`${prefix}   rolled back to the pre-run state`)
      } catch (rb) {
        console.log(`${prefix}   ⚠️  ROLLBACK INCOMPLETE: ${rb.message} — old id ${old && old.id}, new id ${newId}`)
      }
      log.push({ id, action: 'failed', stage, error: err.message })
    }
  }

  const out = `/tmp/repair-presentation-${COURSE}-${ids.length}.json`
  fs.writeFileSync(out, JSON.stringify(log, null, 2))
  console.log(`\n${replaced} replaced, ${healthy} left alone (probe says healthy), ${failed} failed, of ${ids.length}.`)
  console.log(`${chars.toLocaleString()} characters of TTS.`)
  console.log(`log -> ${out}\n`)
  process.exit(failed ? 1 : 0)
})()
