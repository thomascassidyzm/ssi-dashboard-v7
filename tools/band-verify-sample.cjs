#!/usr/bin/env node
/**
 * band-verify-sample — the sampled replacement for the per-clip veracity gate.
 *
 * ── Why this exists ─────────────────────────────────────────────────────────
 * Tom asked (2026-08-08) whether whisper verification can be switched off now
 * that rounds 1-200 of French and German have come out clean. The answer is
 * "not fully": whisper here is not validating translation, it is catching
 * SILENT and TRUNCATED clips — the exact failure that produced the 497 damaged
 * French clips. Rounds 1-200 coming out clean proves the voice and the
 * pipeline; it does not prove TTS will never drop a clip at 3am in round 640,
 * and with the gate off a bad clip is invisible until a learner hits it.
 *
 * So the per-render gate goes off (AUDIO_VERACITY_GATE=off on the band's
 * phase-8 instance, which announces itself loudly in the log) and this runs at
 * the END of each band instead. Cost falls from one whisper decode per clip to
 * one per thirty-odd; the failure mode stays visible.
 *
 * ── What it checks ──────────────────────────────────────────────────────────
 *   1. ~3% ASR sample of the clips this band actually RENDERED, taken by an
 *      even stride across the band rather than off the front, so a systematic
 *      failure that starts in the middle is still caught.
 *   2. The pace gate (tools/audio-pace-gate.cjs) over the whole band — free,
 *      deterministic, no ASR, and it is the direct test for "duration
 *      anomalous against its text length". Run separately; see the runner.
 *
 * Both are OUTPUT CHECKS over a finished band, never selectors. Nothing here
 * decides what to render.
 *
 * ── Reading the result ──────────────────────────────────────────────────────
 * checkAudioVeracity returns pass:true / pass:false / pass:null. `null` means
 * COULD NOT CHECK and is never a pass — this tool counts it separately and
 * says so, because an unchecked clip reported as clean is exactly the poison
 * the honesty rule exists to prevent.
 *
 * A band FAILS (exit 1) when the sampled failure rate exceeds --max-fail-rate
 * (default 2%), which is the "stop the run and report rather than grinding
 * through the night producing bad audio" instruction made mechanical.
 *
 *   node tools/band-verify-sample.cjs <applied-log.json> [--rate 0.03]
 *        [--max-sample 250] [--max-fail-rate 0.02] [--json out.json]
 *
 * Requires AUDIO_VERACITY_GATE unset/on — this process is the one that listens.
 */
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3')

const veracity = require(path.join(__dirname, '..', 'services', 'audio-veracity.cjs'))

const argv = process.argv.slice(2)
const flag = (n, d = null) => {
  const i = argv.indexOf('--' + n)
  return i === -1 || i === argv.length - 1 ? d : argv[i + 1]
}
const artifactPath = argv.find(a => !a.startsWith('--') && argv[argv.indexOf(a) - 1]?.startsWith('--') !== true)
  || argv[0]

const RATE = Number(flag('rate', 0.03))
const MAX_SAMPLE = Number(flag('max-sample', 250))
const MAX_FAIL_RATE = Number(flag('max-fail-rate', 0.02))
const JSON_OUT = flag('json', null)

if (!artifactPath || !fs.existsSync(artifactPath)) {
  console.error('usage: band-verify-sample.cjs <applied-log.json> [--rate 0.03] [--max-sample 250]')
  process.exit(2)
}

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'eu-west-2',
  credentials: process.env.AWS_ACCESS_KEY_ID ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  } : undefined,
})
const S3_BUCKET = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET

async function fetchObject (s3Key) {
  const r = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: s3Key }))
  const chunks = []
  for await (const chunk of r.Body) chunks.push(chunk)
  return Buffer.concat(chunks)
}

/** clipKey is `role|language|voiceId|text` — the language is field 2. */
function languageOf (entry) {
  if (entry.language) return entry.language
  const parts = String(entry.clipKey || '').split('|')
  return parts.length > 1 ? parts[1] : null
}

/**
 * Even stride across the band, not the first N. A run that starts failing at
 * clip 900 of 1,500 must be caught, and a head sample cannot see it.
 */
function strideSample (items, n) {
  if (n >= items.length) return items.slice()
  const step = items.length / n
  const out = []
  for (let i = 0; i < n; i++) out.push(items[Math.floor(i * step)])
  return out
}

async function main () {
  const art = JSON.parse(fs.readFileSync(artifactPath, 'utf8'))
  const entries = art.entries || []

  // Only clips THIS band actually rendered. Reused and already-satisfied clips
  // were not produced by this run, so a failure in one is a pre-existing defect
  // for the repair pass, not evidence about tonight's TTS.
  const rendered = entries.filter(e => {
    const a = String(e.action || e.outcome || '').toUpperCase()
    return a === 'RENDERED' && e.s3Key
  })

  const status = veracity.announceStatus ? veracity.announceStatus() : null
  if (status && (!status.enabled || !status.available)) {
    console.error('[band-verify] REFUSING TO REPORT A PASS: the veracity gate is ' +
      (!status.enabled ? 'switched off in this process' : `unavailable (${status.missing.join(', ')})`) +
      ' — this run could not listen to anything.')
    process.exit(3)
  }

  const want = Math.min(MAX_SAMPLE, Math.max(1, Math.ceil(rendered.length * RATE)))
  const sample = strideSample(rendered, want)

  console.log(`[band-verify] ${path.basename(artifactPath)}`)
  console.log(`[band-verify] ${entries.length} entries, ${rendered.length} rendered this band, sampling ${sample.length} (${(RATE * 100).toFixed(1)}%)`)

  const results = []
  let pass = 0, fail = 0, unchecked = 0
  const CONC = Number(process.env.AUDIO_VERACITY_CONCURRENCY || 4)

  let cursor = 0
  async function worker () {
    while (cursor < sample.length) {
      const e = sample[cursor++]
      let r
      try {
        const buf = await fetchObject(e.s3Key)
        r = await veracity.checkAudioVeracity(buf, e.text, languageOf(e))
      } catch (err) {
        r = { pass: null, checked: false, reason: 'fetch_error', detail: String(err.message).slice(0, 200) }
      }
      if (!r.checked) unchecked++
      else if (r.pass) pass++
      else fail++
      results.push({
        clipKey: e.clipKey, role: e.role, text: e.text, s3Key: e.s3Key,
        pass: r.pass, checked: r.checked, reason: r.reason, cer: r.cer ?? null,
        decode: r.checked && !r.pass ? r.decode : undefined,
      })
      if (results.length % 25 === 0) console.log(`[band-verify]   ${results.length}/${sample.length} — ${fail} failed, ${unchecked} unchecked`)
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONC, sample.length) }, worker))

  const checked = pass + fail
  const failRate = checked ? fail / checked : 0

  console.log('')
  console.log(`[band-verify] SAMPLED ${results.length}: ${pass} pass, ${fail} FAIL, ${unchecked} unchecked`)
  console.log(`[band-verify] failure rate ${(failRate * 100).toFixed(2)}% of ${checked} actually checked (threshold ${(MAX_FAIL_RATE * 100).toFixed(1)}%)`)
  if (unchecked) console.log(`[band-verify] NOTE: ${unchecked} clips could not be checked — that is not a pass.`)
  for (const r of results.filter(x => x.checked && !x.pass)) {
    console.log(`[band-verify]   FAIL ${r.role} cer=${r.cer} ${r.reason} :: "${r.text}" -> "${r.decode}"`)
  }

  const out = {
    artifact: artifactPath,
    generatedAt: new Date().toISOString(),
    renderedInBand: rendered.length,
    sampled: results.length,
    rate: RATE,
    pass, fail, unchecked, checked, failRate,
    threshold: MAX_FAIL_RATE,
    verdict: failRate > MAX_FAIL_RATE ? 'STOP' : 'CONTINUE',
    results,
  }
  if (JSON_OUT) { fs.writeFileSync(JSON_OUT, JSON.stringify(out, null, 1)); console.log(`[band-verify] wrote ${JSON_OUT}`) }

  if (failRate > MAX_FAIL_RATE) {
    console.log('[band-verify] VERDICT: STOP — sampled failure rate is above threshold; do not release further bands.')
    process.exit(1)
  }
  console.log('[band-verify] VERDICT: CONTINUE')
}

main().catch(e => { console.error('[band-verify] fatal:', e); process.exit(2) })
