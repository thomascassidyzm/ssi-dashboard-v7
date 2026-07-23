#!/usr/bin/env node
/**
 * rescue-wrong-language-clips.cjs — re-render pod clips whose RECORDING is in
 * the wrong language (English phonology baked into a target-language take).
 *
 * WHY (Tom 2026-07-23, ita_for_eng): "come stai plays come = English, stai =
 * Italian". The app binds audio by id correctly end-to-end; the defect is in
 * the CONTENT — the 2026-06-10 whole-turn xAI takes pre-date the phonology
 * gate (render-take-g.cjs, 2026-07-10 pilot: "xAI: 'Come stai' → English
 * 'come' — the language param is necessary but not sufficient"), and the June
 * per-sentence slices were cut from those takes, inheriting the wrong
 * phonology. Take G renders are gated; turn takes and sentence slices never
 * were. This tool closes that gap for a FLAGGED list of clips.
 *
 * Method (per flagged clip, resolved to its turn + slot):
 *   1. DELETE the bad course_audio row FIRST — this both frees the dedup key
 *      (so the render below mints a fresh row) and, crucially, mints a NEW id:
 *      devices have the bad bytes cached BY ID (IndexedDB + SW CacheFirst,
 *      1-year headers), so refreshing bytes under the old id would never heal
 *      them. A new id + the content_stamp trigger (fires on both tables) makes
 *      every device refetch metadata and stream the new clip.
 *   2. Re-render via p8.generatePodAudio (same voice cast, language-steered),
 *      then PHONOLOGY-GATE the result: whisper auto-detect on the mastered
 *      mp3; if the detected language is the course's known language (or
 *      English) instead of the target, force re-roll (same fresh row, new
 *      bytes) up to GATE_ATTEMPTS times. Verdicts logged per clip.
 *   3. Relink listening_pod_sentences (sentence_audio_ids[k] / target_audio_id).
 *
 * Flags file: JSON array of course_audio ids (the sweep output). Clips that
 * can't be mapped to a pod slot are skipped with a log line.
 *
 *   node tools/rescue-wrong-language-clips.cjs <course> --flags /path/ids.json [--dry]
 *
 * TTS costs money — run only under an approved plan. Idempotent per run:
 * a re-run with the same flags file skips ids that no longer exist.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFile } = require('child_process')
const { createClient } = require('@supabase/supabase-js')
const p8 = require('../services/phases/phase8-audio-v13.cjs')
const audioProcessor = require('../services/audio-processor.cjs')

const COURSE = process.argv[2]
const flagsIdx = process.argv.indexOf('--flags')
const FLAGS_PATH = flagsIdx !== -1 ? process.argv[flagsIdx + 1] : null
const dry = process.argv.includes('--dry')
if (!COURSE || !FLAGS_PATH) {
  console.error('usage: rescue-wrong-language-clips.cjs <course> --flags <ids.json> [--dry]')
  process.exit(1)
}

const supabase = createClient(
  (process.env.SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_KEY || '').trim(),
  { auth: { persistSession: false, autoRefreshToken: false } },
)

const GATE_ATTEMPTS = 4
const WHISPER = process.env.WHISPER || '/opt/homebrew/bin/whisper-cli'
const WHISPER_MODEL = process.env.WHISPER_MODEL
  || path.join(os.homedir(), 'SSi', 'whisper-models', 'ggml-small.bin')
const PHONO_GATE = fs.existsSync(WHISPER) && fs.existsSync(WHISPER_MODEL)
const S3_BASE = 'https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/'

/** whisper-cli reads mp3 directly (whisper-cpp ≥1.8). Null = unchecked. */
function detectClipLang(mp3) {
  return new Promise((res) => {
    execFile(WHISPER, ['-m', WHISPER_MODEL, '-l', 'auto', '-nt', '-t', '4', '-f', mp3],
      { encoding: 'utf8', maxBuffer: 1 << 22 }, (e, _o, stderr) => {
        const m = /auto-detected language: (\w+)/.exec(stderr || '')
        res(m ? m[1] : null)
      })
  })
}

async function download(url, dest) {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`GET ${url} → ${r.status}`)
  fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()))
}

// Same sentence walk as render-sentence-takes.cjs — the split that produced
// sentence_audio_ids, so slot k maps to the same text.
const SENTENCE_PUNCT = /[.!?…。！？؟]/
const SENTENCE_SPLIT = /(?<=[。！？])\s*(?=\S)|(?<=[.!?…؟])\s+(?=\S)/
function atomGroups(targetText, atoms) {
  const text = targetText || ''
  const lower = text.toLowerCase()
  const groups = [[]]
  let cursor = 0
  for (let i = 0; i < atoms.length; i++) {
    const idx = lower.indexOf(atoms[i].target_surface.toLowerCase(), cursor)
    if (i > 0 && idx !== -1 && SENTENCE_PUNCT.test(text.slice(cursor, idx))) groups.push([])
    groups[groups.length - 1].push(atoms[i])
    if (idx !== -1) cursor = idx + atoms[i].target_surface.length
  }
  return groups.filter((g) => g.length)
}
function sentenceTextsFromGroups(turnText, groups) {
  const lower = turnText.toLowerCase()
  const spans = []
  let cursor = 0
  for (const g of groups) {
    const first = lower.indexOf(g[0].target_surface.toLowerCase(), cursor)
    if (first === -1) return null
    let end = first
    for (const a of g) {
      const idx = lower.indexOf(a.target_surface.toLowerCase(), end)
      if (idx === -1) return null
      end = idx + a.target_surface.length
    }
    const tail = turnText.slice(end)
    const stop = tail.search(/(?<=[.!?…。！？؟])/)
    spans.push({ start: first, end: stop === -1 ? turnText.length : end + stop })
    cursor = spans[spans.length - 1].end
  }
  return spans.map((s) => turnText.slice(s.start, s.end).trim()).filter(Boolean)
}
function sentenceTexts(row) {
  const atoms = (row.atom_map_fine || []).filter((a) => a.kind !== 'note' && a.target_surface)
  return atoms.length
    ? sentenceTextsFromGroups(row.target_text || '', atomGroups(row.target_text, atoms))
    : (row.target_text || '').split(SENTENCE_SPLIT).map((x) => x.trim()).filter(Boolean)
}

;(async () => {
  const flaggedIds = new Set(JSON.parse(fs.readFileSync(FLAGS_PATH, 'utf8')))
  console.log(`${flaggedIds.size} flagged clip ids loaded`)

  const { data: pod, error: podErr } = await supabase
    .from('listening_pods').select('speakers').eq('id', `${COURSE}:pod-0`).single()
  if (podErr || !pod?.speakers) { console.error(`ERR: no speakers cast on ${COURSE}:pod-0`); process.exit(1) }

  const targetLang = COURSE.split('_')[0]
  const knownBase = (COURSE.split('_for_')[1] || 'eng').slice(0, 2)
  // whisper reports 2-letter codes; ita→it etc.
  const targetBase = ({ ita: 'it', spa: 'es', fra: 'fr', deu: 'de', por: 'pt', nld: 'nl', hrv: 'hr', gle: 'ga', isl: 'is', cym: 'cy', eng: 'en' })[targetLang] || targetLang.slice(0, 2)
  const SUSPECT = new Set(['en', knownBase].filter((l) => l && l !== targetBase))
  console.log(PHONO_GATE
    ? `phonology gate ON (suspect: ${[...SUSPECT].join('/')}; target: ${targetBase})`
    : 'phonology gate OFF — whisper-cli/model missing; renders land UNCHECKED')

  const { data: rows, error } = await supabase
    .from('listening_pod_sentences')
    .select('id, global_order, speaker, target_text, atom_map_fine, target_audio_id, sentence_audio_ids')
    .eq('pod_id', `${COURSE}:pod-0`).order('global_order')
  if (error) { console.error(error.message); process.exit(1) }

  // Map flagged id → every (row, slot) that links it.
  const jobs = []
  for (const r of rows || []) {
    if (r.target_audio_id && flaggedIds.has(r.target_audio_id)) {
      jobs.push({ row: r, slot: 'take', badId: r.target_audio_id, text: r.target_text })
    }
    const sids = r.sentence_audio_ids || []
    if (sids.some((id) => id && flaggedIds.has(id))) {
      const texts = sentenceTexts(r)
      if (!texts || texts.length !== sids.length) {
        console.log(`S${r.global_order}: ✗ sentence split (${texts ? texts.length : '?'}) doesn't match linked clips (${sids.length}) — SKIPPED, needs eyes`)
        continue
      }
      sids.forEach((id, k) => {
        if (id && flaggedIds.has(id)) jobs.push({ row: r, slot: k, badId: id, text: texts[k] })
      })
    }
  }
  const mapped = new Set(jobs.map((j) => j.badId))
  for (const id of flaggedIds) {
    if (!mapped.has(id)) console.log(`unmapped flagged id (not linked by any pod row — already replaced?): ${id}`)
  }
  console.log(`${jobs.length} clip jobs across ${new Set(jobs.map((j) => j.row.id)).size} turns`)
  if (dry) {
    for (const j of jobs) console.log(`[DRY] S${j.row.global_order} ${j.slot === 'take' ? 'TAKE' : `sentence[${j.slot}]`} "${j.text}" (bad ${j.badId})`)
    process.exit(0)
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rescue-wl-'))
  let fixed = 0, gateFailed = 0, failed = 0
  for (const j of jobs) {
    const voice = p8.resolvePodSpeakerVoice(pod.speakers, j.row.speaker, 'target')
    if (!voice) { console.log(`S${j.row.global_order}: ✗ no target voice for "${j.row.speaker}"`); failed++; continue }
    let restoreOnFail = null
    try {
      // 1. old row dies → id retires, dedup key frees, content_stamp moves.
      //    NOTE the FK from listening_pod_sentences.target_audio_id is ON
      //    DELETE SET NULL — the relink below restores it. Deleting before
      //    rendering is required (the dedup key must free so a NEW id is
      //    minted), but if the render then fails the old id is already dead:
      //    the catch below restores the old row from its surviving S3 object
      //    so a failed job never leaves a dangling link (learned 2026-07-23,
      //    first run: ffmpeg missing → 2 rows deleted, 0 rendered).
      const { data: oldRow, error: oldErr } = await supabase
        .from('course_audio').select('*').eq('id', j.badId).single()
      if (oldErr) throw new Error(`read ${j.badId}: ${oldErr.message}`)
      const { error: delErr } = await supabase.from('course_audio').delete().eq('id', j.badId)
      if (delErr) throw new Error(`delete ${j.badId}: ${delErr.message}`)
      restoreOnFail = oldRow

      // 2. render + gate. First call mints a fresh row (dedup finds nothing);
      //    re-rolls force fresh bytes into that same fresh row.
      let newId = null, verdict = 'unchecked', detected = null
      for (let attempt = 1; attempt <= GATE_ATTEMPTS; attempt++) {
        const res = await p8.generatePodAudio({
          courseCode: COURSE, text: j.text, language: targetLang, role: 'target1',
          voice, track: 'target', sentenceId: j.row.id, force: attempt > 1,
        })
        newId = res.id
        restoreOnFail = null // a fresh row exists — never resurrect the old one past here
        const { data: rowNow } = await supabase.from('course_audio').select('s3_key').eq('id', newId).single()
        const mp3 = path.join(tmpDir, `${newId}-${attempt}.mp3`)
        await download(S3_BASE + rowNow.s3_key, mp3)
        // Tail-click gate: a mouth-click/pop baked into the raw render after
        // the speech decays (2026-07-23 first run shipped one on 'Come stai?'
        // — −9dBFS burst 70ms before EOF). The mastering boundary fade can't
        // reach it; a re-roll is the only clean fix.
        const tail = await audioProcessor.detectTailClick(mp3).catch(() => ({ click: false }))
        if (tail.click) {
          verdict = 'tail-click-fail'
          console.log(`S${j.row.global_order} ${j.slot}: attempt ${attempt} tail click (${tail.peakDb}dB rel peak) → re-roll`)
          continue
        }
        if (!PHONO_GATE) { verdict = 'unchecked'; break }
        detected = await detectClipLang(mp3)
        if (detected == null) { verdict = 'unchecked'; break }
        if (!SUSPECT.has(detected)) { verdict = 'pass'; break }
        verdict = 'phonology-fail'
        console.log(`S${j.row.global_order} ${j.slot}: attempt ${attempt} detected '${detected}' → re-roll`)
      }

      // 3. relink.
      if (j.slot === 'take') {
        const { error: upErr } = await supabase.from('listening_pod_sentences')
          .update({ target_audio_id: newId }).eq('id', j.row.id)
        if (upErr) throw new Error(`relink take: ${upErr.message}`)
      } else {
        const sids = [...j.row.sentence_audio_ids]
        sids[j.slot] = newId
        const { error: upErr } = await supabase.from('listening_pod_sentences')
          .update({ sentence_audio_ids: sids }).eq('id', j.row.id)
        if (upErr) throw new Error(`relink sentence[${j.slot}]: ${upErr.message}`)
        j.row.sentence_audio_ids = sids // later jobs on the same row build on this
      }
      if (verdict === 'phonology-fail' || verdict === 'tail-click-fail') {
        gateFailed++
        console.log(`S${j.row.global_order} ${j.slot}: GATE FAIL after ${GATE_ATTEMPTS} takes (last '${detected}') — linked anyway (best effort), FLAG FOR EARS: "${j.text}" → ${newId}`)
      } else {
        fixed++
        console.log(`S${j.row.global_order} ${j.slot === 'take' ? 'TAKE' : `sentence[${j.slot}]`}: ${verdict} "${j.text}" → ${newId}`)
      }
    } catch (e) {
      failed++
      console.log(`S${j.row.global_order} ${j.slot}: ✗ ${e.message.slice(0, 160)}`)
      if (restoreOnFail) {
        const restoreRow = { ...restoreOnFail }
        delete restoreRow.text_stripped // GENERATED ALWAYS — insert rejects an explicit value
        const { error: resErr } = await supabase.from('course_audio').insert(restoreRow)
        console.log(resErr
          ? `S${j.row.global_order} ${j.slot}: RESTORE FAILED for ${j.badId} — DANGLING LINK, fix by hand: ${resErr.message}`
          : `S${j.row.global_order} ${j.slot}: old row ${j.badId} restored (S3 object untouched)`)
        // target_audio_id was FK-nulled by the delete; put the link back too.
        if (!resErr && j.slot === 'take') {
          await supabase.from('listening_pod_sentences').update({ target_audio_id: j.badId }).eq('id', j.row.id)
        }
      }
    }
  }
  console.log(`\n${fixed} fixed, ${gateFailed} gate-failed (linked, need ears), ${failed} errored, of ${jobs.length} jobs.`)
  process.exit(failed ? 2 : 0)
})().catch((e) => { console.error('ERR:', e.message); process.exit(1) })
