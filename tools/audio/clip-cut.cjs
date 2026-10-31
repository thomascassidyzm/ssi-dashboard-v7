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
    try { out = await cutClip(card, deps) } catch (e) { out = { ok: false, code: 'ERROR', error: e.message } }
    if (out.ok) {
      const whole = path.join(dir, 'whole.mp3')
      fs.writeFileSync(whole, await deps.clipBytes(card.sourceAudioId))
      out.pieces.forEach((p, i) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', whole,
        '-ss', (p.startMs / 1000).toFixed(3), '-to', ((p.endMs + OVERRUN_MS) / 1000).toFixed(3), '-c:a', 'libmp3lame', '-q:a', '3',
        path.join(dir, `piece-${i + 1}.mp3`)]))
    }
    results.push({ n, label: card.label || null, card, out })
    console.log(`${n} ${card.label || card.sourceAudioId}: ${out.ok ? (out.verified ? 'VERIFIED' : 'NOT VERIFIED') : out.code} ${out.ok ? out.pieces.map((p) => `[${p.startMs}-${p.endMs} "${p.heard}" ${p.sim}]`).join(' ') : out.error}`)
  }
  fs.writeFileSync(path.join(outDir, 'result.json'), JSON.stringify(results, null, 2))
}

main().catch((e) => { console.error(e); process.exit(1) })
