#!/usr/bin/env node
/**
 * Edit an existing recording from the command line (job #410): the same engine as POST /api/production/:courseCode/clip-cut
 * (services/shared/clip-cut.cjs), DRY RUN ONLY — it cuts and verifies, and writes nothing to Popty or the database. To file
 * a cut, post it to the route (dryRun:false) or press Apply on the Pod Lab button.
 *
 *   node tools/audio/clip-cut.cjs <spec.json> <outDir>
 *
 * spec.json: [{ "courseCode", "sourceAudioId", "pieces": [..texts..], "glosses"?, "cutsMs"?, "label"? }, ...]
 * outDir gets result.json (every answer) and, per card, whole.mp3 + piece-N.mp3 cut from the source's served bytes at the
 * answer's spans (with the player's 30 ms stop overrun), so a listener hears what the player would play. Serial: one card
 * at a time, one ffmpeg at a time (the box is shared).
 */
'use strict'

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { cutClip, OVERRUN_MS } = require('../../services/shared/clip-cut.cjs')
const { liveCutIo } = require('../../services/shared/clip-cut-io.cjs')

/** ffprobe: codec, nominal bitrate (kbps, rounded up to a LAME CBR step), sample rate, channels. */
const LAME_STEPS = [32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]
function probeAudio(f) {
  const j = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=codec_name,bit_rate,sample_rate,channels:format=bit_rate,format_name', '-of', 'json', f], { encoding: 'utf8' }))
  const st = j.streams[0] || {}
  const bps = Number(st.bit_rate || j.format.bit_rate || 0)
  const kbps = LAME_STEPS.find((k) => k * 1000 >= bps - 500) || 320
  return { codec: st.codec_name, format: j.format.format_name, kbps, sampleRate: Number(st.sample_rate), channels: Number(st.channels) || 1 }
}

async function main() {
  const [specPath, outDir] = process.argv.slice(2)
  if (!specPath || !outDir) { console.error('usage: clip-cut.cjs <spec.json> <outDir>'); process.exit(2) }
  const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'))
  fs.mkdirSync(outDir, { recursive: true })
  const io = liveCutIo()
  const cache = new Map()
  const deps = { ...io, clipBytes: async (id) => { if (!cache.has(id)) cache.set(id, await io.clipBytes(id)); return cache.get(id) } }
  const results = []
  for (const [n, card] of spec.entries()) {
    const dir = path.join(outDir, String(n).padStart(2, '0'))
    fs.mkdirSync(dir, { recursive: true })
    let out
    // a piece the plan found already in the library (right voice) needs no cut of its own (clip-cut-lego-plan.cjs)
    const libraryPieces = (card.plan || []).map((p, i) => (p.library && p.library.audioId ? i : -1)).filter((i) => i >= 0)
    try { out = await cutClip({ ...card, libraryPieces }, deps) } catch (e) { out = { ok: false, code: 'ERROR', error: e.message } }
    if (out.ok) {
      const whole = path.join(dir, 'whole.mp3')
      fs.writeFileSync(whole, await deps.clipBytes(card.sourceAudioId))
      // SOURCE QUALITY (job #419): the whole is the served bytes untouched; a piece is one re-encode of its span at the
      // source's own bitrate and sample rate, never lower (#410's -q:a 3 came out ~100 kbps). A stream copy would snap to
      // 26 ms MP3 frames — a sliver of the next word — so the span is cut sample-exact and encoded once at source rate.
      const src = probeAudio(whole)
      out.source = src
      if (!out.whole) out.pieces.forEach((p, i) => {
        const f = path.join(dir, `piece-${i + 1}.mp3`)
        execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', whole,
          '-ss', (p.startMs / 1000).toFixed(3), '-to', ((p.endMs + OVERRUN_MS) / 1000).toFixed(3),
          '-c:a', 'libmp3lame', '-b:a', `${src.kbps}k`, '-ar', String(src.sampleRate), '-ac', String(src.channels), '-f', 'mp3', f])
        const got = probeAudio(f)
        p.file = { codec: got.codec, kbps: got.kbps, sampleRate: got.sampleRate }
        if (got.codec !== 'mp3' || got.kbps < src.kbps) throw new Error(`piece ${i + 1} came out ${got.codec} ${got.kbps} kbps, below the source's ${src.kbps}`)
      })
    }
    results.push({ n, label: card.label || null, card, out })
    console.log(`${n} ${card.label || card.sourceAudioId}: ${out.ok ? (out.whole ? 'WHOLE' : out.verified ? 'VERIFIED' : 'NOT VERIFIED') : out.code} ${out.ok ? out.pieces.map((p) => `[${p.startMs}-${p.endMs} "${p.text}" heard "${p.heard}" ${p.verified ? 'ok' : p.why || ''}]`).join(' ') : out.error}`)
  }
  fs.writeFileSync(path.join(outDir, 'result.json'), JSON.stringify(results, null, 2))
}

main().catch((e) => { console.error(e); process.exit(1) })
