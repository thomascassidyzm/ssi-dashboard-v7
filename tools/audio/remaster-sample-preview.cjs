#!/usr/bin/env node
/**
 * remaster-sample-preview.cjs — re-master a SAMPLE of already-rendered clips
 * through the fixed chain, to a local preview directory, and report the
 * before/after numbers. Nothing live is touched.
 *
 * COMMISSIONED 2026-08-24 with measure-loudness-by-voice.cjs, for Tom's
 * "volume similarity" tweak. Sample-first is doctrine here, not politeness:
 * the precedent is docs/audio/deu-24-sample-first-pilot-2026-08-06.md, and the
 * counter-example is the 2026-08-03 French purge that deleted 31,310 rows before
 * re-rendering and left ~2,000 course slots silent for two days.
 *
 * ── WHAT IT REFUSES TO DO ───────────────────────────────────────────────────
 * It NEVER writes to the database, NEVER writes to S3, NEVER deletes anything
 * and NEVER calls a TTS provider. It re-masters bytes that already exist, which
 * costs nothing, and it writes them to a directory you name. Whether the live
 * estate is ever re-mastered is Tom's decision and this tool cannot make it —
 * deliberately, because make-before-break means the replacement is heard and
 * verified before anything is swapped.
 *
 * ── THE TWO VARIANTS, AND WHY THERE ARE TWO ─────────────────────────────────
 * `--variant=loudness` (default) is the pipeline fix: closed-loop convergence on
 * integrated LUFS. It fixes the measured 0.5-2.5 dB single-pass shortfall.
 *
 * `--variant=phone` ALSO applies a high-shelf tilt above 500 Hz. It exists
 * because the 2026-08-24 measurement found that integrated LUFS cannot see the
 * defect Tom actually heard: Enzo loses 9.1 dB when everything below 500 Hz is
 * removed, where every other voice in the pod loses about 5 dB, so on a phone
 * speaker — which reproduces almost nothing below 500 Hz — he is 3.9-4.9 dB
 * quieter while full-band LUFS says 0.3-1.4 dB. The tilt is a PROPOSAL for Tom's
 * ear, not a decision: it changes a voice's timbre, and timbre is a taste call.
 * Nothing in the render pipeline applies it.
 *
 * USAGE
 *   node tools/audio/remaster-sample-preview.cjs \
 *     --measurement=$CS_SCRATCH/ita-pod1-loudness.json \
 *     --scenes=1,15,16,17,18,19,20,21 --slot=target \
 *     --out=$CS_SCRATCH/remaster --target=-15.5 --variant=loudness
 */
'use strict'

const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')
const audioProcessor = require('../../services/audio-processor.cjs')
const { measure } = require('../../services/audio-intelligence/tiers/loudness.cjs')
const { canonicalVoice, median } = require('./measure-loudness-by-voice.cjs')

/**
 * A phone speaker reproduces very little below ~500 Hz. Measuring loudness after
 * removing that band is a crude but honest model of what a phone actually emits,
 * and it is the only measurement that agreed with Tom's ear.
 */
const PHONE_BAND_FILTER = 'highpass=f=500:poles=2,highpass=f=500:poles=2'

/**
 * The proposed tilt: lift the band a phone can actually reproduce, leave the
 * bass where it is rather than cutting it, so headphone listening keeps the
 * voice's body. `gainDb` is the shelf height above 500 Hz.
 */
const tiltFilter = (gainDb) => `highshelf=f=500:g=${Number(gainDb).toFixed(2)}`

/** Integrated LUFS of a file, optionally through a pre-filter. Null if unreadable. */
function lufsOf (file, preFilter = 'anull') {
  const r = spawnSync('ffmpeg', [
    '-hide_banner', '-nostats', '-i', file,
    '-af', `${preFilter},ebur128=peak=true:framelog=quiet`, '-f', 'null', '-',
  ], { maxBuffer: 1e8 })
  const out = `${r.stdout || ''}${r.stderr || ''}`
  const all = out.match(/I:\s*(-?\d+(?:\.\d+)?)\s*LUFS/g)
  if (!all || !all.length) return null
  return Number(all[all.length - 1].match(/(-?\d+(?:\.\d+)?)/)[1])
}

const r2 = (x) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : null)

/**
 * Pick the sample out of a measurement JSON. Pure, so the selection is testable
 * and so a report can state exactly what it covered.
 */
function selectSample (clips, { scenes, slot, voices, limit }) {
  const sceneSet = scenes && scenes.length ? new Set(scenes.map(Number)) : null
  const voiceSet = voices && voices.length ? new Set(voices.map(canonicalVoice)) : null
  let out = clips.filter((c) =>
    (!sceneSet || sceneSet.has(Number(c.scene))) &&
    (!slot || c.slot === slot) &&
    (!voiceSet || voiceSet.has(canonicalVoice(c.voiceId))))
  out = out.sort((a, b) => (a.globalOrder || 0) - (b.globalOrder || 0))
  return limit ? out.slice(0, limit) : out
}

/** Group before/after LUFS by voice and give the pairwise gaps for each. */
function gapReport (rows, key) {
  const byVoice = new Map()
  for (const r of rows) {
    const v = canonicalVoice(r.voiceId)
    if (!byVoice.has(v)) byVoice.set(v, [])
    if (Number.isFinite(r[key])) byVoice.get(v).push(r[key])
  }
  const meds = [...byVoice.entries()].map(([voice, xs]) => ({ voice, n: xs.length, median: r2(median(xs)) }))
  const gaps = []
  for (let i = 0; i < meds.length; i++) {
    for (let j = i + 1; j < meds.length; j++) {
      gaps.push({ a: meds[i].voice, b: meds[j].voice, gapDb: r2(meds[i].median - meds[j].median) })
    }
  }
  return { voices: meds.sort((x, y) => (y.median ?? -999) - (x.median ?? -999)), gaps }
}

async function main () {
  const arg = (n, d) => {
    const a = process.argv.find((x) => x.startsWith(`--${n}=`))
    return a ? a.split('=').slice(1).join('=') : d
  }
  const measurementFile = arg('measurement')
  const outDir = arg('out')
  const target = Number(arg('target', '-15.5'))
  const variant = arg('variant', 'loudness')
  const scenes = (arg('scenes', '') || '').split(',').filter(Boolean)
  const voices = (arg('voices', '') || '').split(',').filter(Boolean)
  const slot = arg('slot', 'target')
  const limit = parseInt(arg('limit', '0'), 10) || null
  const tiltMap = JSON.parse(arg('tilt', '{}'))
  if (!measurementFile || !outDir) {
    console.error('FAILED: --measurement=<json from measure-loudness-by-voice> and --out=<dir> are required')
    process.exit(1)
  }
  fs.mkdirSync(outDir, { recursive: true })
  const m = JSON.parse(fs.readFileSync(measurementFile, 'utf8'))
  const sample = selectSample(m.clips, { scenes, slot, voices, limit })
  console.error(`[remaster] ${sample.length} clips, variant=${variant}, target ${target} LUFS -> ${outDir}`)

  const rows = []
  for (const [i, c] of sample.entries()) {
    const voice = canonicalVoice(c.voiceId)
    const stem = `${String(c.scene).padStart(2, '0')}-${String(c.globalOrder).padStart(3, '0')}-${voice}-${c.id.slice(0, 8)}`
    const beforePath = path.join(outDir, `${stem}.before.mp3`)
    const afterPath = path.join(outDir, `${stem}.after.mp3`)

    const res = await fetch(c.url)
    if (!res.ok) { console.error(`[remaster] SKIP ${c.id} — HTTP ${res.status}`); continue }
    fs.writeFileSync(beforePath, Buffer.from(await res.arrayBuffer()))

    // The tilt, when asked for, is applied BEFORE convergence so that the loop
    // measures and corrects the signal that will actually ship.
    let sourcePath = beforePath
    const tiltDb = variant === 'phone' ? Number(tiltMap[voice] || 0) : 0
    if (tiltDb) {
      sourcePath = path.join(outDir, `${stem}.tilted.wav`)
      const t = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', beforePath,
        '-af', tiltFilter(tiltDb), sourcePath], { maxBuffer: 1e8 })
      if (t.status !== 0) { console.error(`[remaster] SKIP ${c.id} — tilt failed`); continue }
    }

    const conv = await audioProcessor.normalizeAudioConverging(sourcePath, afterPath, target, {
      toleranceDb: 0.5, maxPasses: 3,
    })
    if (tiltDb) fs.unlinkSync(sourcePath)

    rows.push({
      id: c.id, scene: c.scene, globalOrder: c.globalOrder, speaker: c.speaker,
      voiceId: c.voiceId, voice, text: c.text, liveUrl: c.url,
      beforePath, afterPath, tiltDb,
      beforeLufs: r2(c.lufs),
      afterLufs: r2(conv.outputLUFS),
      beforePhoneLufs: r2(lufsOf(beforePath, PHONE_BAND_FILTER)),
      afterPhoneLufs: r2(lufsOf(afterPath, PHONE_BAND_FILTER)),
      passes: conv.passes, converged: conv.converged, gainDb: conv.gainDb, reason: conv.reason,
    })
    if ((i + 1) % 5 === 0) console.error(`[remaster] ${i + 1}/${sample.length}`)
  }

  const before = gapReport(rows, 'beforeLufs')
  const after = gapReport(rows, 'afterLufs')
  const beforePhone = gapReport(rows, 'beforePhoneLufs')
  const afterPhone = gapReport(rows, 'afterPhoneLufs')
  const summary = {
    variant, target, outDir, clips: rows.length,
    converged: rows.filter((r) => r.converged).length,
    fullBand: { before, after },
    phoneBand: { before: beforePhone, after: afterPhone },
    rows,
  }
  fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2))

  console.table(rows.map((r) => ({
    scene: r.scene, voice: r.voice, before: r.beforeLufs, after: r.afterLufs,
    phoneBefore: r.beforePhoneLufs, phoneAfter: r.afterPhoneLufs,
    passes: r.passes, ok: r.converged,
  })))
  console.log('\nFULL-BAND medians before:'); console.table(before.voices)
  console.log('FULL-BAND medians after:'); console.table(after.voices)
  console.log('FULL-BAND gaps before:'); console.table(before.gaps)
  console.log('FULL-BAND gaps after:'); console.table(after.gaps)
  console.log('PHONE-BAND gaps before:'); console.table(beforePhone.gaps)
  console.log('PHONE-BAND gaps after:'); console.table(afterPhone.gaps)
  console.error(`[remaster] wrote ${path.join(outDir, 'summary.json')}`)
}

module.exports = { selectSample, gapReport, lufsOf, tiltFilter, PHONE_BAND_FILTER }

if (require.main === module) {
  main().catch((e) => { console.error(`FAILED: ${e.message}`); process.exit(1) })
}
