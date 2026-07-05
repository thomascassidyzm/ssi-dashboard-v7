#!/usr/bin/env node
/**
 * slice-take-g.cjs — detect the gaps in each Take G render and write the
 * per-unit ms spans into atom_map_fine (target_start_ms / target_end_ms,
 * relative to the group's takeg_audio_ids clip).
 *
 * This is the slicing model: ONE gapped take per sentence, chunks at every
 * fusion rung = ms slices of it — no per-chunk files. Each unit's span ends a
 * third of the way into the following gap and starts a third of the way
 * before it ends (capped at 150ms), so slices keep a little breath while the
 * remaining two-thirds of the gap absorbs any playback-stop overshoot —
 * midpoint cuts left too little margin and bled the next word's onset.
 *
 * CODE GATE per group: ffmpeg silencedetect runs permissive (-30dB, 180ms),
 * then the (units−1) LONGEST silences are taken as the seams; a group FAILS
 * (spans left null, reported) unless at least that many gaps exist and every
 * chosen gap is ≥ MIN_GAP_MS — the agent-discernment contract is "the seams
 * are where the render actually breathed", never a guessed cut.
 *
 *   node tools/slice-take-g.cjs <course> [orders] [--dry]
 *
 * Idempotent; re-run after any re-render. No TTS, no cost.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
process.env.PHASE8_NO_LISTEN = process.env.PHASE8_NO_LISTEN || '1'
const { createClient } = require('@supabase/supabase-js')
const { GetObjectCommand } = require('@aws-sdk/client-s3')
const { execFile } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')
const p8 = require('../services/phases/phase8-audio-v13.cjs')

const COURSE = process.argv[2]
const ORDERS = (process.argv[3] || '').split(',').map(Number).filter(Boolean)
const dry = process.argv.includes('--dry')
const force = process.argv.includes('--force')
if (!COURSE) { console.error('usage: slice-take-g.cjs <course> [orders] [--dry|--force]'); process.exit(1) }
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const NOISE = process.env.SLICE_NOISE || '-30dB'
const MIN_SIL_S = Number(process.env.SLICE_MIN_SIL || 0.18)
const MIN_GAP_MS = Number(process.env.SLICE_MIN_GAP_MS || 200)
// Detection ladder (2026-07-05): xAI voices DO pause at punctuation seams —
// but often only ~100-180ms, under the strict floor. Running only strict made
// them look like refusers ("0 gaps") and burned re-render rolls for nothing.
// Each group now tries strict → sensitive → last-resort before failing; env
// overrides above pin a single tier when wanted.
const TIERS = process.env.SLICE_NOISE
  ? [{ noise: NOISE, minSil: MIN_SIL_S, minGap: MIN_GAP_MS }]
  : [
      { noise: '-30dB', minSil: 0.18, minGap: 200 },
      { noise: '-25dB', minSil: 0.10, minGap: 110 },
      { noise: '-22dB', minSil: 0.07, minGap: 85 },
    ]
const SENTENCE_PUNCT = /[.!?…。！？]/

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
function glueGroups(rawGroups) {
  const groups = []
  let carry = []
  rawGroups.forEach((g, i) => {
    // Only TURN-INITIAL one-unit groups (leading "Ciao!" interjections) glue
    // forward; a mid-turn one-unit group is a real sentence ("Impresioniran
    // sam.") and must stand alone — gluing it swallowed its known take.
    if (groups.length === 0 && g.length === 1 && i < rawGroups.length - 1) { carry.push(...g); return }
    groups.push([...carry, ...g])
    carry = []
  })
  if (carry.length) groups.push(carry)
  return groups
}

async function download(s3Key, dest) {
  const res = await p8.s3.send(new GetObjectCommand({ Bucket: p8.S3_BUCKET, Key: s3Key }))
  await fs.promises.writeFile(dest, Buffer.from(await res.Body.transformToByteArray()))
}

const alnum = (s) => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}\p{M}]/gu, '')

// pad into a gap: a third of it each side, capped — the rest stays as margin
const PAD_MS = Number(process.env.SLICE_PAD_MS || 150)
const pad = (gapMs) => Math.max(0, Math.min(PAD_MS, Math.round(gapMs / 3)))

/** Per-unit padded spans from word/gap edges. edges[i] = {end of speech i,
 *  start of speech i+1}; spans need not tile — windows span first-start to
 *  last-end and keep the interior gaps. */
function paddedSpans(speech, durMs) {
  return speech.map((sp, i) => {
    const prevGap = i === 0 ? null : { from: speech[i - 1].end, to: sp.start }
    const nextGap = i === speech.length - 1 ? null : { from: sp.end, to: speech[i + 1].start }
    return {
      start: prevGap ? Math.round(sp.start - pad(sp.start - prevGap.from)) : 0,
      end: nextGap ? Math.round(sp.end + pad(nextGap.to - sp.end)) : Math.round(durMs),
    }
  })
}

/**
 * Per-unit spans from Azure word-boundary events (exact — no audio
 * inspection): consume boundary words until each unit's surface is
 * reconstructed (alnum-normalised). Gate: every unit must reconstruct
 * exactly and all words must be consumed. Returns null when the boundaries
 * don't tile the group (caller falls back to silence detection).
 */
function spansFromWordBoundaries(wb, group, durMs) {
  const words = (wb || []).filter((w) => alnum(w.text))
  if (!words.length) return null
  const speech = []
  let wi = 0
  for (const a of group) {
    const want = alnum(a.target_surface)
    let got = ''
    const start = wi
    while (wi < words.length && got.length < want.length) { got += alnum(words[wi].text); wi++ }
    if (got !== want) return null
    speech.push({ start: words[start].offset, end: words[wi - 1].offset + (words[wi - 1].duration || 0) })
  }
  if (wi !== words.length) return null
  return paddedSpans(speech, durMs)
}

function ffSilences(file, noise = NOISE, minSil = MIN_SIL_S) {
  return new Promise((res, rej) => {
    execFile('ffmpeg', ['-i', file, '-af', `silencedetect=noise=${noise}:d=${minSil}`, '-f', 'null', '-'],
      { maxBuffer: 1 << 22 }, (err, _o, stderr) => {
        // ffmpeg exits 0 here; a real failure surfaces as no parseable output
        if (err && !/silencedetect/.test(stderr || '')) return rej(err)
        const sil = []
        const re = /silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)/g
        let m
        while ((m = re.exec(stderr))) sil.push({ start: +m[1] * 1000, end: +m[2] * 1000 })
        const dur = /Duration: (\d+):(\d+):([\d.]+)/.exec(stderr)
        const durationMs = dur ? ((+dur[1] * 3600 + +dur[2] * 60 + +dur[3]) * 1000) : null
        res({ sil, durationMs })
      })
  })
}

;(async () => {
  let q = supabase.from('listening_pod_sentences')
    .select('id, global_order, target_text, atom_map_fine, takeg_audio_ids')
    .eq('pod_id', `${COURSE}:pod-0`).not('takeg_audio_ids', 'is', null).order('global_order')
  if (ORDERS.length) q = q.in('global_order', ORDERS)
  const { data: sents, error } = await q
  if (error) { console.error(error.message); process.exit(1) }

  const clipIds = [...new Set((sents || []).flatMap((s) => s.takeg_audio_ids || []).filter(Boolean))]
  const { data: clips } = await supabase.from('course_audio').select('id, s3_key, duration_ms, word_boundaries').in('id', clipIds)
  const clipById = new Map((clips || []).map((c) => [c.id, c]))
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'takeg-'))

  let okGroups = 0, failGroups = 0, turnsWritten = 0
  async function processTurn(s) {
    const atoms = (s.atom_map_fine || []).filter((a) => a.kind !== 'note')
    if (!atoms.length) return
    const groups = glueGroups(atomGroups(s.target_text, atoms))
    // flat offsets so group-local unit indices land on the right map entries
    const offsets = []
    let off = 0
    for (const g of groups) { offsets.push(off); off += g.length }

    const map = s.atom_map_fine.slice() // includes any kind='note' entries untouched
    // flat(no-note) index → map index
    const mapIdx = []
    s.atom_map_fine.forEach((a, i) => { if (a.kind !== 'note') mapIdx.push(i) })

    let touched = false
    for (let gi = 0; gi < groups.length; gi++) {
      const g = groups[gi]
      const clipId = (s.takeg_audio_ids || [])[gi]
      if (g.length < 2 || !clipId) continue
      // groups already sliced stay sliced (strict pass wins) unless --force
      if (!force && g.every((a) => a.target_start_ms != null && a.target_end_ms != null)) { okGroups++; continue }
      const clip = clipById.get(clipId)
      if (!clip || !clip.s3_key) { console.log(`S${s.global_order} g${gi}: ✗ clip row/s3_key missing`); failGroups++; continue }

      // exact path: Azure word boundaries stored on the clip → no audio needed
      if (clip.word_boundaries && clip.duration_ms) {
        const wbSpans = spansFromWordBoundaries(clip.word_boundaries, g, clip.duration_ms)
        if (wbSpans) {
          for (let ui = 0; ui < g.length; ui++) {
            const mi = mapIdx[offsets[gi] + ui]
            map[mi] = { ...map[mi], target_start_ms: wbSpans[ui].start, target_end_ms: wbSpans[ui].end }
          }
          okGroups++; touched = true
          if (dry) console.log(`S${s.global_order} g${gi}: ✓ ${g.length} units (word-boundaries) — ${wbSpans.map((x) => `${x.start}-${x.end}`).join(' | ')}`)
          continue
        }
        console.log(`S${s.global_order} g${gi}: word boundaries don't tile — falling back to silence detect`)
      }

      const f = path.join(tmp, `${clipId}.mp3`)
      try {
        if (!fs.existsSync(f)) await download(clip.s3_key, f)
      } catch (e) { console.log(`S${s.global_order} g${gi}: ✗ download — ${e.message.slice(0, 80)}`); failGroups++; continue }

      const need = g.length - 1
      // Walk the detection ladder: prefer the strict tier's confident gaps,
      // fall to the sensitive tiers for voices that pause briefly (xAI).
      let seams = null
      let dur = clip.duration_ms
      let lastInterior = 0
      for (const tier of TIERS) {
        let sil, durationMs
        try { ({ sil, durationMs } = await ffSilences(f, tier.noise, tier.minSil)) } catch (e) { console.log(`S${s.global_order} g${gi}: ✗ ffmpeg — ${e.message.slice(0, 80)}`); break }
        dur = clip.duration_ms || durationMs
        // interior silences only (a lead-in or tail hush is not a seam)
        const interior = sil.filter((x) => x.start > 150 && (!dur || x.end < dur - 150))
        lastInterior = interior.length
        if (interior.length < need) continue
        const chosen = interior
          .map((x) => ({ ...x, len: x.end - x.start }))
          .sort((a, b) => b.len - a.len).slice(0, need)
          .sort((a, b) => a.start - b.start)
        if (chosen.some((x) => x.len < tier.minGap)) continue
        seams = chosen
        break
      }
      if (!seams) {
        console.log(`S${s.global_order} g${gi}: ✗ ${lastInterior} trustworthy gaps < ${need} seams at every tier (units ${g.length})`)
        failGroups++; continue
      }
      // speech stretches between seams → padded per-unit spans
      const speech = []
      for (let ui = 0; ui < g.length; ui++) {
        speech.push({
          start: ui === 0 ? 0 : seams[ui - 1].end,
          end: ui === g.length - 1 ? Math.round(dur) : seams[ui].start,
        })
      }
      const spans = paddedSpans(speech, dur)
      for (let ui = 0; ui < g.length; ui++) {
        const mi = mapIdx[offsets[gi] + ui]
        map[mi] = { ...map[mi], target_start_ms: spans[ui].start, target_end_ms: spans[ui].end }
      }
      okGroups++; touched = true
      if (dry) console.log(`S${s.global_order} g${gi}: ✓ ${g.length} units — ${spans.map((x) => `${x.start}-${x.end}`).join(' | ')}`)
    }
    if (touched && !dry) {
      const { error: werr } = await supabase.from('listening_pod_sentences').update({ atom_map_fine: map }).eq('id', s.id)
      if (werr) { console.log(`S${s.global_order}: WRITE FAIL ${werr.message}`); return }
      turnsWritten++
    }
  }

  const CONC = Number(process.env.SLICE_CONC || 8)
  let next = 0
  const worker = async () => { while (next < (sents || []).length) await processTurn(sents[next++]) }
  await Promise.all(Array.from({ length: Math.min(CONC, (sents || []).length) }, worker))
  await fs.promises.rm(tmp, { recursive: true, force: true })
  console.log(`\n${dry ? '[DRY] ' : ''}${COURSE}: ${okGroups} groups sliced, ${failGroups} failed the gate; ${turnsWritten} turns written.`)
  process.exit(failGroups ? 2 : 0)
})().catch((e) => { console.error('ERR:', e.message); process.exit(1) })
