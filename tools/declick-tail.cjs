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
// TAIL_REPAIR_MODE defaults to 'flag' (2026-08-05) so no automatic render path
// mutates audio. THIS tool is the deliberate escape hatch: dry by default, run by
// a human against an explicit id list, guarded by the whisper + amputation checks.
// Opt it back in before audio-processor is loaded (the constant is read at module
// load), or `--apply` would silently hold every clip and repair nothing.
process.env.TAIL_REPAIR_MODE = process.env.TAIL_REPAIR_MODE || 'repair'
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
  let repaired = 0, clean = 0, failed = 0, held = 0
  for (const id of ids) {
    try {
      const { data: row, error } = await supabase
        .from('course_audio').select('*').eq('id', id).eq('course_code', COURSE).single()
      if (error) throw new Error(`read: ${error.message}`)

      const src = path.join(tmpDir, `${id}.mp3`)
      await download(S3_BASE + row.s3_key, src)
      // Shared detect + iterative repair + whisper amputation guard — the
      // same implementation as the phase8 generation gate (see
      // audioProcessor.repairTailDefect for the full semantics).
      const workDir = fs.mkdtempSync(path.join(tmpDir, `${id}-`))
      const tail = await audioProcessor.repairTailDefect(src, workDir, {
        text: row.text, language: row.language,
      })
      if (!tail.defect) { console.log(`${id}: no tail click — untouched ("${row.text}")`); clean++; continue }
      console.log(`${id}: tail ${tail.defect.kind} ${tail.defect.peakDb}dB rel peak, trim at ${tail.defect.trimSec}s ("${row.text}")`)
      if (tail.action === 'held') {
        console.log(`${id}: HELD — trim would cut speech (kept: "${tail.verify.kept}" / cut: "${tail.verify.cut}")`)
        held++
        continue
      }
      if (tail.residualSpeechFlag) console.log(`${id}: soft trailing speech retained after ${tail.passes} pass(es)`)
      if (!apply) continue

      const fixed = tail.outPath
      const meta = await audioProcessor.getAudioMetadata(fixed)

      // Capture ALL links BEFORE the delete — audio-id FKs are ON DELETE SET
      // NULL, so reading afterwards would miss them. Known-side and take-slot
      // columns included (2026-07-24: the clone tail-burst sweep repairs
      // known clips, which the original target-only relink missed).
      const { data: podRows, error: podErr } = await supabase
        .from('listening_pod_sentences')
        .select('id, target_audio_id, known_audio_id, explainer_audio_id, note_audio_id, sentence_audio_ids, sentence_known_audio_ids, takeg_audio_ids')
        .like('pod_id', `${COURSE}:%`)
      if (podErr) throw new Error(`pod rows: ${podErr.message}`)
      const CORE_TABLES = {
        course_practice_phrases: ['known_audio_id', 'target1_audio_id', 'target2_audio_id', 'presentation_audio_id'],
        course_seeds: ['known_audio_id', 'target1_audio_id', 'target2_audio_id'],
        course_legos: ['known_audio_id', 'target1_audio_id', 'target2_audio_id', 'presentation_audio_id'],
      }
      const coreLinks = []
      for (const [table, cols] of Object.entries(CORE_TABLES)) {
        for (const col of cols) {
          const { data: rows, error: coreErr } = await supabase
            .from(table).select('id').eq('course_code', COURSE).eq(col, id)
          if (coreErr) throw new Error(`${table}.${col}: ${coreErr.message}`)
          for (const r of rows || []) coreLinks.push({ table, col, rowId: r.id })
        }
      }

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

        // Relink every row that pointed at the old id (captured pre-delete).
        for (const p of podRows || []) {
          const patch = {}
          for (const col of ['target_audio_id', 'known_audio_id', 'explainer_audio_id', 'note_audio_id']) {
            if (p[col] === id) patch[col] = inserted.id
          }
          for (const col of ['sentence_audio_ids', 'sentence_known_audio_ids', 'takeg_audio_ids']) {
            if ((p[col] || []).includes(id)) patch[col] = p[col].map((x) => (x === id ? inserted.id : x))
          }
          if (Object.keys(patch).length) {
            const { error: upErr } = await supabase
              .from('listening_pod_sentences').update(patch).eq('id', p.id)
            if (upErr) throw new Error(`relink ${p.id}: ${upErr.message}`)
            console.log(`${id}: relinked ${p.id} → ${inserted.id}`)
          }
        }
        for (const c of coreLinks) {
          const { error: upErr } = await supabase
            .from(c.table).update({ [c.col]: inserted.id }).eq('id', c.rowId)
          if (upErr) throw new Error(`relink ${c.table}.${c.col} ${c.rowId}: ${upErr.message}`)
          console.log(`${id}: relinked ${c.table}.${c.col} ${c.rowId} → ${inserted.id}`)
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
          // Every link was FK-nulled by the delete; put them all back from
          // the pre-delete capture (scalar pod columns, array slots, core
          // table columns — the old target-only restore left the rest null).
          if (!resErr) {
            for (const p of podRows || []) {
              const patch = {}
              for (const col of ['target_audio_id', 'known_audio_id', 'explainer_audio_id', 'note_audio_id']) {
                if (p[col] === id) patch[col] = id
              }
              for (const col of ['sentence_audio_ids', 'sentence_known_audio_ids', 'takeg_audio_ids']) {
                if ((p[col] || []).includes(id)) patch[col] = p[col]
              }
              if (Object.keys(patch).length) {
                await supabase.from('listening_pod_sentences').update(patch).eq('id', p.id)
              }
            }
            for (const c of coreLinks) {
              await supabase.from(c.table).update({ [c.col]: id }).eq('id', c.rowId)
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
  console.log(`\n${apply ? '' : '[DRY] '}${repaired} repaired, ${clean} already clean, ${held} held (would cut speech), ${failed} failed, of ${ids.length} ids.`)
  process.exit(failed ? 2 : 0)
})().catch((e) => { console.error('ERR:', e.message); process.exit(1) })
