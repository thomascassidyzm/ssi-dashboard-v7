#!/usr/bin/env node
/**
 * The end-to-end validation of services/recording-speech-gate.cjs against the
 * four takes it was built from: Catrin's cym_n_for_eng:pod-0 session of
 * 2026-08-23 14:44-14:48 UTC. One genuine read and three recordings of an
 * empty room, all four of which passed every level-based gate on the upload
 * path at the time.
 *
 * The unit tests (services/recording-speech-gate.test.cjs) pin the arithmetic.
 * THIS runs the real decode against the real bytes, which is the only thing
 * that proves the VAD confirmation stage actually separates them — so re-run it
 * after any threshold change.
 *
 *   node tools/recording/validate-speech-gate-catrin-four.cjs
 *
 * Downloads ~2.8 MB from S3 to a temp directory and cleans up after itself.
 * Expected result, measured 2026-08-23: take 1 passes on duration alone with
 * no decode; takes 2, 3 and 4 are refused as speech_span_far_exceeds_script.
 */
const fs = require('fs')
const os = require('os')
const path = require('path')
const https = require('https')

const G = require('../../services/recording-speech-gate.cjs')

/** Script texts verbatim from recording_provenance.quality_notes.text. */
const TAKES = [
  { n: 1, uuid: 'EA7C2D31-6D64-4856-BB81-690F7C5EBEE7', durationMs: 3250,
    text: 'Bore da. Sut wyt ti?', expect: true, label: 'genuine read' },
  { n: 2, uuid: '9F2F77F2-7FCD-4C85-AB4B-C462E1D3DBE3', durationMs: 96798,
    text: 'Ydw,… mae gen i ddiwrnod prysur… heddiw. Gobeithio… cei di ddiwrnod da. Wela i di wedyn.',
    expect: false, label: 'empty room' },
  { n: 3, uuid: '8D1F0B06-27F4-44A6-9712-2557D1CA26F2', durationMs: 46651,
    text: "Esgusodwch fi,… ydy'r sedd yma… wedi'i chymryd?", expect: false, label: 'empty room (the sheep)' },
  { n: 4, uuid: 'C18BD31B-8AED-4681-9C42-75595C829304', durationMs: 31455,
    text: "Nac ydy, mae hi'n rhydd. Croeso i chi eistedd.", expect: false, label: 'empty room' },
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'speech-gate-validate-'))
  let allOk = true
  try {
    for (const t of TAKES) {
      const file = path.join(dir, `take${t.n}.mp3`)
      await download(url(t.uuid), file)
      const r = await G.checkTakeHasSpeech({
        filePath: file, expectedText: t.text, language: 'cym', durationMs: t.durationMs,
      })
      const ok = r.pass === t.expect
      if (!ok) allOk = false
      console.log(`take ${t.n} (${t.label}) -> pass=${r.pass} reason=${r.reason} ${ok ? '✅' : '❌ EXPECTED ' + t.expect}`)
      console.log('   ', JSON.stringify(r.detail))
      if (r.message) console.log('    recordist sees:', r.message)
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
  console.log(allOk ? '\nAll four separated ✅' : '\nSEPARATION FAILED ❌')
  process.exit(allOk ? 0 : 1)
})().catch((e) => { console.error(e); process.exit(2) })
