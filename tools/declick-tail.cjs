#!/usr/bin/env node
/**
 * declick-tail.cjs — repair a stored mastered clip whose tail carries an
 * isolated click/thump transient (mouth click baked into the raw TTS render,
 * landing AFTER the speech decays — the mastering boundary fade can't reach
 * it). Pure DSP repair, NO TTS spend: trim just before the click, re-fade the
 * new end (8ms), pad 100ms of silence, re-encode 48k mono CBR96 via the
 * ffmpeg→lame pipe (iOS-safe container, same specs as masterAudio output).
 *
 * WHY new id + new S3 key rather than overwriting: mastered/<uuid>.mp3
 * objects are write-once, and devices cache clip bytes BY course_audio id
 * (IndexedDB + SW CacheFirst, 1-year headers) — bytes refreshed under the
 * old id would never reach a device that already played the click. Same
 * doctrine as rescue-wrong-language-clips.cjs: delete old row (frees the
 * dedup key), insert the repaired copy (fresh id), relink pod rows, restore
 * the old row from its surviving S3 object if anything fails.
 *
 * Detection = audioProcessor.detectTailClick (see its rule + thresholds).
 * Found on ita_for_eng "Come stai?" 2026-07-23: −9dBFS burst 70ms before
 * EOF, speech already at −35dBFS.
 *
 *   node tools/declick-tail.cjs <course> --ids <id1,id2|/path/ids.json> [--apply]
 *
 * Dry by default: reports detection + planned trim, writes nothing.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const fs = require('fs')
const os = require('os')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
const audioProcessor = require('../services/audio-processor.cjs')

const COURSE = process.argv[2]
const idsIdx = process.argv.indexOf('--ids')
const IDS_ARG = idsIdx !== -1 ? process.argv[idsIdx + 1] : null
const apply = process.argv.includes('--apply')
if (!COURSE || !IDS_ARG) {
  console.error('usage: declick-tail.cjs <course> --ids <id1,id2|ids.json> [--apply]')
  process.exit(1)
}
const ids = IDS_ARG.endsWith('.json')
  ? JSON.parse(fs.readFileSync(IDS_ARG, 'utf8'))
  : IDS_ARG.split(',').map((s) => s.trim()).filter(Boolean)

const supabase = createClient(
  (process.env.SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_KEY || '').trim(),
  { auth: { persistSession: false, autoRefreshToken: false } },
)
const s3 = new S3Client({ region: process.env.AWS_REGION || 'eu-west-1' })
const S3_BUCKET = process.env.S3_BUCKET || 'ssi-audio-stage'
const S3_BASE = `https://${S3_BUCKET}.s3.eu-west-1.amazonaws.com/`

async function download(url, dest) {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`GET ${url} → ${r.status}`)
  fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()))
}

;(async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'declick-'))
  let repaired = 0, clean = 0, failed = 0
  for (const id of ids) {
    try {
      const { data: row, error } = await supabase
        .from('course_audio').select('*').eq('id', id).eq('course_code', COURSE).single()
      if (error) throw new Error(`read: ${error.message}`)

      const src = path.join(tmpDir, `${id}.mp3`)
      await download(S3_BASE + row.s3_key, src)
      const det = await audioProcessor.detectTailClick(src)
      if (!det.click) { console.log(`${id}: no tail click — untouched ("${row.text}")`); clean++; continue }
      console.log(`${id}: tail click ${det.peakDb}dB rel peak, trim at ${det.trimSec}s ("${row.text}")`)
      if (!apply) continue

      // Repair: cut before the click, fade the fresh end, restore a short
      // silent tail so the clip doesn't stop dead on the fade.
      const fixed = path.join(tmpDir, `${id}-fixed.mp3`)
      await audioProcessor.ffmpegFilterToLameMp3(src, fixed, {
        filterChain: `atrim=end=${det.trimSec},asetpts=PTS-STARTPTS,`
          + 'areverse,afade=t=in:st=0:d=0.008,areverse,apad=pad_dur=0.1',
      })
      const recheck = await audioProcessor.detectTailClick(fixed)
      if (recheck.click) throw new Error(`repair still clicks (${recheck.peakDb}dB) — not shipping it`)
      const meta = await audioProcessor.getAudioMetadata(fixed)

      // Capture pod links BEFORE the delete — the target_audio_id FK is ON
      // DELETE SET NULL, so reading afterwards would miss take-slot links.
      const { data: podRows, error: podErr } = await supabase
        .from('listening_pod_sentences')
        .select('id, target_audio_id, sentence_audio_ids')
        .eq('pod_id', `${COURSE}:pod-0`)
      if (podErr) throw new Error(`pod rows: ${podErr.message}`)

      // Old row dies first (dedup key course_code,text_normalized,language,
      // role,voice_id must free), repaired copy minted under a fresh id.
      const { error: delErr } = await supabase.from('course_audio').delete().eq('id', id)
      if (delErr) throw new Error(`delete: ${delErr.message}`)
      let restoreOnFail = row
      try {
        const newKey = `mastered/${require('crypto').randomUUID().toUpperCase()}.mp3`
        await s3.send(new PutObjectCommand({
          Bucket: S3_BUCKET, Key: newKey, Body: fs.readFileSync(fixed), ContentType: 'audio/mpeg',
        }))
        const copy = { ...row, s3_key: newKey, duration_ms: Math.round(meta.duration * 1000) }
        // id/created_at regenerate; text_stripped is GENERATED ALWAYS — the DB
        // rejects any explicit value for it.
        delete copy.id; delete copy.created_at; delete copy.text_stripped
        const { data: inserted, error: insErr } = await supabase
          .from('course_audio').insert(copy).select('id').single()
        if (insErr) throw new Error(`insert: ${insErr.message}`)
        restoreOnFail = null

        // Relink every pod row that pointed at the old id (captured pre-delete).
        for (const p of podRows || []) {
          const patch = {}
          if (p.target_audio_id === id) patch.target_audio_id = inserted.id
          if ((p.sentence_audio_ids || []).includes(id)) {
            patch.sentence_audio_ids = p.sentence_audio_ids.map((x) => (x === id ? inserted.id : x))
          }
          if (Object.keys(patch).length) {
            const { error: upErr } = await supabase
              .from('listening_pod_sentences').update(patch).eq('id', p.id)
            if (upErr) throw new Error(`relink ${p.id}: ${upErr.message}`)
            console.log(`${id}: relinked ${p.id} → ${inserted.id}`)
          }
        }
        console.log(`${id}: repaired → ${inserted.id} (${newKey}, ${copy.duration_ms}ms)`)
        repaired++
      } catch (e) {
        if (restoreOnFail) {
          const restoreRow = { ...restoreOnFail }
          delete restoreRow.text_stripped // GENERATED ALWAYS
          const { error: resErr } = await supabase.from('course_audio').insert(restoreRow)
          console.log(resErr
            ? `${id}: RESTORE FAILED — DANGLING LINK, fix by hand: ${resErr.message}`
            : `${id}: old row restored (S3 object untouched)`)
          // take-slot links were FK-nulled by the delete; put them back.
          if (!resErr) {
            for (const p of podRows || []) {
              if (p.target_audio_id === id) {
                await supabase.from('listening_pod_sentences')
                  .update({ target_audio_id: id }).eq('id', p.id)
              }
            }
          }
        }
        throw e
      }
    } catch (e) {
      failed++
      console.log(`${id}: ✗ ${e.message.slice(0, 200)}`)
    }
  }
  console.log(`\n${apply ? '' : '[DRY] '}${repaired} repaired, ${clean} already clean, ${failed} failed, of ${ids.length} ids.`)
  process.exit(failed ? 2 : 0)
})().catch((e) => { console.error('ERR:', e.message); process.exit(1) })
