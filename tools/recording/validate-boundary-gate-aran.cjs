#!/usr/bin/env node
/**
 * The end-to-end validation of checkTakeBoundaries (services/recording-speech-gate.cjs)
 * against the clips it was built from.
 *
 * Tom, 2026-08-23, having listened to Aran's Welsh-north Pod 1 recordings:
 *
 *   "Aran's are all junk. All clipped badly at either or both ends"
 *
 * The negative fixtures are Aran's own mastered takes, spread across both of
 * his voices (human_aran_cym_n, human_aran_cym_n_2) and both of his recording
 * days (2026-06-15 and 2026-08-10). The positive fixture is Catrin's take of
 * "Bore da. Sut wyt ti?", the read Tom called perfect — mastered 2026-08-23,
 * after the trim-margin fix, so it carries the 0.35 s the chain leaves.
 *
 * The unit tests (services/recording-speech-gate.test.cjs) pin the arithmetic
 * on built signals. THIS runs the real decode against the real bytes, which is
 * the only thing that proves the two populations actually separate — so re-run
 * it after any threshold change.
 *
 *   node tools/recording/validate-boundary-gate-aran.cjs
 *
 * Downloads ~1.5 MB from S3 to a temp directory and cleans up after itself.
 *
 * Expected result, measured 2026-08-23: the good take passes with 0.35 s of
 * lead and 0.41 s of tail; all sixteen Aran clips are refused, thirteen of them
 * flush against frame zero at the front.
 */
const fs = require('fs')
const os = require('os')
const path = require('path')
const https = require('https')

const G = require('../../services/recording-speech-gate.cjs')

/**
 * Every uuid below is the S3 object key (mastered/{UUID}.mp3), which for a
 * regenerated or repointed clip is NOT the course_audio row id — the good take
 * is course_audio db7fbc37-… served from mastered/EA7C2D31-….mp3. Keys, not row
 * ids, so this tool reads the same bytes a learner does.
 */
const GOOD = [
  { uuid: 'EA7C2D31-6D64-4856-BB81-690F7C5EBEE7', who: 'catrin', day: '2026-08-23',
    label: 'the read Tom called perfect' },
]

const CLIPPED = [
  // Measured lead/tail in comments, 2026-08-23. CAB438EF is the roomiest front
  // of the eighteen sampled and 8B5EBE6C the roomiest back — they are in the
  // list deliberately, because a threshold change shows up on those two first.
  { uuid: 'CAB438EF-0456-4594-A761-C0E47998431B', who: 'aran', day: '2026-06-15' },   // 0.08 / 0.018
  { uuid: '75E4BED0-DF7C-4943-AF81-17E716F225A9', who: 'aran', day: '2026-06-15' },   // 0.00 / 0.015
  { uuid: 'AAEEC3AD-298B-4298-9D81-9502D0C283A2', who: 'aran', day: '2026-08-10' },   // 0.00 / 0.022
  { uuid: '159B1BC1-0962-4634-AFD2-F850A55E0366', who: 'aran', day: '2026-08-10' },   // 0.00 / 0.020
  { uuid: '8B5EBE6C-24C5-400A-BBDC-3C7407246BA8', who: 'aran_2', day: '2026-06-15' }, // 0.03 / 0.264
  { uuid: 'B112F5A4-698A-4FEA-B2D1-620F22C89058', who: 'aran_2', day: '2026-06-15' }, // 0.00 / 0.036
]

const url = (uuid) => `https://ssi-audio-stage.s3.amazonaws.com/mastered/${uuid}.mp3`

function download (from, to) {
  return new Promise((resolve, reject) => {
    https.get(from, (res) => {
      if (res.statusCode !== 200) return reject(new Error(`${from} -> HTTP ${res.statusCode}`))
      const out = fs.createWriteStream(to)
      res.pipe(out)
      out.on('finish', () => out.close(resolve))
    }).on('error', reject)
  })
}

;(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'boundary-gate-validate-'))
  let allOk = true
  try {
    for (const t of [...GOOD.map(x => ({ ...x, expect: true })), ...CLIPPED.map(x => ({ ...x, expect: false }))]) {
      const file = path.join(dir, `${t.uuid}.mp3`)
      try {
        await download(url(t.uuid), file)
      } catch (e) {
        // A missing object is a gap in the fixture list, not a gate failure.
        // Say so rather than letting it read as a pass.
        console.log(`${t.uuid.slice(0, 8)} (${t.who} ${t.day}) -> FIXTURE UNAVAILABLE: ${e.message}`)
        allOk = false
        continue
      }
      const r = await G.checkTakeBoundaries({ filePath: file })
      const ok = r.pass === t.expect
      if (!ok) allOk = false
      console.log(`${t.uuid.slice(0, 8)} (${t.who} ${t.day}${t.label ? ', ' + t.label : ''}) -> pass=${r.pass} reason=${r.reason} ${ok ? '✅' : '❌ EXPECTED ' + t.expect}`)
      console.log(`    lead ${r.detail.leadMarginSec}s  tail ${r.detail.tailMarginSec}s  range ${r.detail.dynamicRangeDb}dB`)
      if (r.message) console.log('    recordist sees:', r.message)
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
  console.log(allOk ? '\nGood take kept, every clipped take refused ✅' : '\nSEPARATION FAILED ❌')
  process.exit(allOk ? 0 : 1)
})().catch((e) => { console.error(e); process.exit(2) })
