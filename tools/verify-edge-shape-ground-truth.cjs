#!/usr/bin/env node
/**
 * verify-edge-shape-ground-truth — re-runs the canonical tier-2 detector against every clip
 * Tom has ever labelled by ear, and fails loudly if the numbers moved.
 *
 * WHY THIS EXISTS AS A TOOL RATHER THAN A UNIT TEST. The unit test in
 * tools/audio-truncation-detector.test.js pins the thresholds and the maths against ffmpeg-
 * synthesised fixtures, which is what CI can run offline. It cannot tell you the detector
 * still catches the clips Tom actually heard, because that needs the real bytes off S3. This
 * does, and it is the check to run after ANY change to the tier-2 measurement or its
 * thresholds — including a refactor that "obviously" preserves behaviour.
 *
 * The bar is the one recorded in docs/audio-intelligence/edge-detector-tuning-2026-08-06.md:
 *   recall MUST stay 16/16. Recall is not negotiable; precision is triage cost.
 *   the 4 ear-confirmed CLEAN-but-flagged clips are expected to keep flagging — they were
 *   searched for exhaustively and cannot be excluded without dropping a true positive, so a
 *   run that suddenly excludes them means a threshold moved, not that the detector improved.
 *
 * NEVER WRITES. Downloads to a temp dir, measures, prints, exits non-zero on regression.
 */
const fs = require('fs'), os = require('os'), path = require('path')
const det = require('./audio-truncation-detector.cjs')

const GT = path.join(__dirname, '..', 'docs/audio-intelligence/ground-truth-2026-08-06.json')

async function fetchTo (url, dst) {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  fs.writeFileSync(dst, Buffer.from(await r.arrayBuffer()))
  return dst
}

async function main () {
  const gt = JSON.parse(fs.readFileSync(GT, 'utf8'))
  // UNLABELLED-CLEAN rows are not negatives — see the ground truth's own caveat — so they are
  // reported separately and never counted as false positives.
  const labelled = gt.clips.filter(c => c.tom_verdict !== 'UNLABELLED-CLEAN')
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gt-'))
  const rows = []
  let next = 0
  const worker = async () => {
    for (;;) {
      const i = next++
      if (i >= labelled.length) return
      const c = labelled[i]
      const f = path.join(tmp, c.audio_id + '.mp3')
      try {
        await fetchTo(c.url_as_heard, f)
        const r = det.check(f, { text: c.script, lang: c.language })
        rows.push({ ...c, flagged: r.damaged, m: r.measurements })
      } catch (e) {
        rows.push({ ...c, flagged: null, error: e.message })
      } finally { try { fs.unlinkSync(f) } catch {} }
    }
  }
  // Four at a time: this box runs other sweeps and the win here is IO, not cores.
  await Promise.all(Array.from({ length: 4 }, worker))

  const damaged = rows.filter(r => r.tom_verdict === 'DAMAGED')
  const cleanFlagged = rows.filter(r => r.tom_verdict === 'CLEAN-FLAGGED')
  const caught = damaged.filter(r => r.flagged === true)
  const errored = rows.filter(r => r.flagged === null)

  for (const r of rows.sort((a, b) => a.tom_verdict.localeCompare(b.tom_verdict))) {
    const mark = r.flagged === null ? 'ERROR ' : r.flagged ? 'FLAG  ' : 'pass  '
    console.log(`${mark} ${r.tom_verdict.padEnd(14)} ${r.audio_id.slice(0, 8)} ` +
      `${r.error ? r.error : `fall ${String(r.m.fallRate).padStart(6)} dB/ms  zero ${String(r.m.zeroPadPct).padStart(5)}%`}  ${r.script.slice(0, 46)}`)
  }

  console.log(`\nrecall            ${caught.length}/${damaged.length} ear-confirmed damaged`)
  console.log(`clean-but-flagged ${cleanFlagged.filter(r => r.flagged).length}/${cleanFlagged.length} (4/4 expected — see the tuning doc)`)
  console.log(`precision         ${(100 * caught.length / Math.max(1, caught.length + cleanFlagged.filter(r => r.flagged).length)).toFixed(0)}% on the listened set`)
  if (errored.length) console.log(`UNMEASURED        ${errored.length} — reported as a gap, not rounded up`)

  if (caught.length < damaged.length) {
    console.error(`\nREGRESSION: recall dropped to ${caught.length}/${damaged.length}. Recall is not negotiable.`)
    process.exit(1)
  }
  if (errored.length) { console.error('\nGAP: some clips could not be measured (above). Not a pass.'); process.exit(2) }
  console.log('\nOK — recall intact.')
}
main().catch(e => { console.error(e); process.exit(3) })
