/**
 * TOM'S ITALIAN CLONE vs LORENZO — a one-off audition, not a cast.
 *
 * Tom recorded three Italian lines into the booth at 00:37-00:38 UTC on
 * 2026-09-04 and said: "ok I've had a go at those three lines, you should be
 * able to build my italian Cartesia clone from them". This script does exactly
 * that and nothing more:
 *
 *   1. pulls the three mastered takes from the public stage bucket,
 *   2. joins them into one ~22s sample (Cartesia's instant clone wants 10-60s),
 *   3. creates the clone via services/voicelab/cartesia.cjs createClone(),
 *   4. renders the same three lines, same order, identical parameters, on the
 *      new clone and on Lorenzo (ee16f140-…), six clips in all,
 *   5. uploads the six to the public bucket and prints their URLs.
 *
 * IT CASTS NOTHING. The clone is born `awaiting_authorisation`, which is where
 * it stays: the estate's standing ruling (Tom, 2026-09-04) is that target-side
 * audio must be native, and this A/B is Tom testing that ruling against his own
 * ear — not a change to it. No pod, course or speaker is touched.
 *
 * THE SAMPLE IS MASTERED, NOT RAW. There are no recording_provenance rows for
 * these three audio uuids, so the mastered mp3s are what exists. The estate's
 * clone-source doctrine prefers raw; a raw re-record could clone better.
 *
 * Dry run by default. --apply spends (one clone + ~200 characters of TTS).
 *
 * THIRD ARM, 2026-09-04 (job #442). Tom then uploaded a second Italian sample
 * through the Voice Lab — one take, raw rather than mastered, better accent —
 * and it became the voice `tom_ita_002`. `--arm2-only` renders the same three
 * lines on that voice with the identical parameters below, and does nothing
 * else: no clone is created, no take is fetched, and the six clips that
 * already exist are neither re-rendered nor touched. It casts nothing either.
 */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const crypto = require('crypto')
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') })
const { createClient } = require('@supabase/supabase-js')

const APPLY = process.argv.includes('--apply')
/** Render the third arm only, reusing the six clips that already exist. */
const ARM2_ONLY = process.argv.includes('--arm2-only')
const OUT = process.env.CS_SCRATCH || path.join(__dirname, '..', '..', 'scripts')

/** Tom's three lines, in recording order — verbatim, not to be edited. */
const LINES = [
  { text: 'Allora me la prendo. Perché è la stessa chiesa.', key: 'mastered/814B666B-31D5-4461-B67B-D90FEDA8FF0F.mp3' },
  { text: 'Un tedesco su un tedesco, una studentessa su una studentessa, e uno di noi due su se stesso con un pesce gallese.', key: 'mastered/81FBB742-C3A3-46CC-B044-6BB60C45F920.mp3' },
  { text: 'Allora — aspetta. Come lo sappiamo?', key: 'mastered/8231F184-82D2-491E-939A-C529C0FD5B3D.mp3' },
]

const LORENZO = 'ee16f140-f6dc-490e-a1ed-c1d537ea0086'
/** tom_ita_002 — Tom's raw single-take upload, cloned in the Voice Lab 2026-09-04 00:52 UTC. */
const TOM_ITA_002 = '5ab58db1-f66d-408e-955f-5f0c1f7445e4'
const BUCKET_URL = 'https://ssi-audio-stage.s3.eu-west-1.amazonaws.com'
/** Matched to the estate's Cartesia pod-render path (services/tts-service.cjs). */
const RENDER = { model: 'sonic-3.6', speed: 1.0, sampleRate: 24000, bitRate: 128000, locale: 'it', apiVersion: '2026-08-14' }

async function fetchTake (key) {
  const res = await fetch(`${BUCKET_URL}/${key}`)
  if (!res.ok) throw new Error(`take fetch ${key}: ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

/** Re-encode through ffmpeg so the join is one clean stream, not three glued files. */
function joinSample (parts, dir) {
  const list = path.join(dir, 'concat.txt')
  const files = parts.map((buf, i) => {
    const p = path.join(dir, `take${i}.mp3`)
    fs.writeFileSync(p, buf)
    return p
  })
  fs.writeFileSync(list, files.map(f => `file '${f}'`).join('\n'))
  const out = path.join(dir, 'tom-ita-sample.mp3')
  execFileSync('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c:a', 'libmp3lame', '-b:a', '128k', '-ar', '44100', out], { stdio: 'pipe' })
  return out
}

async function render (text, voiceId) {
  const res = await fetch('https://api.cartesia.ai/tts/bytes', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.CARTESIA_API_KEY}`,
      'Cartesia-Version': RENDER.apiVersion,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model_id: RENDER.model,
      transcript: text,
      voice: { mode: 'id', id: voiceId },
      generation_config: { speed: RENDER.speed },
      output_format: { container: 'mp3', sample_rate: RENDER.sampleRate, bit_rate: RENDER.bitRate },
      locale: RENDER.locale,
    }),
    signal: AbortSignal.timeout(120000),
  })
  if (!res.ok) throw new Error(`Cartesia TTS ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 2000) throw new Error(`suspiciously short render (${buf.length} bytes) for "${text.slice(0, 30)}"`)
  return buf
}

async function main () {
  if (ARM2_ONLY) return arm2Only()

  const dir = fs.mkdtempSync(path.join(OUT, 'ita-clone-'))
  console.log(`scratch: ${dir}`)

  const parts = []
  for (const l of LINES) parts.push(await fetchTake(l.key))
  const samplePath = joinSample(parts, dir)
  const sample = fs.readFileSync(samplePath)
  console.log(`sample joined: ${samplePath} (${sample.length} bytes)`)

  if (!APPLY) {
    console.log('DRY RUN — sample built, nothing cloned, nothing rendered, nothing uploaded.')
    console.log(`would clone on Cartesia (it), then render ${LINES.length} lines × 2 voices with`, RENDER)
    return
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  const { createClone } = require(path.join(__dirname, '..', '..', 'services', 'voicelab', 'cartesia.cjs'))
  const result = await createClone(supabase, {
    clip: sample,
    filename: 'tom-italian-sample-2026-09-04.mp3',
    name: 'Tom — Italian clone sample 2026-09-04',
    language: 'it',
    gender: 'm',
    description: 'Audition-only instant clone of Tom Cassidy speaking Italian, for a Lorenzo A/B. Not cast anywhere.',
    registeredBy: 'popty-agent (Italian clone vs Lorenzo A/B job, 2026-09-04)',
    person: 'Tom Cassidy',
    consentNote: 'Tom cloning his own voice, at his own request, from three Italian lines he recorded in his own booth on 2026-09-04, for a side-by-side audition against Lorenzo. Audition only — not cast to any course, pod or speaker.',
    source: 'zzz_test2_for_eng:pod-0 booth takes, 2026-09-04 00:37-00:38 UTC (mastered)',
  })
  const cloneId = result.cartesia.id
  console.log(`CLONE: ${cloneId} (${result.voice.voice_id}, ${result.voice.display_name}) — ${result.voice.consent_status || 'awaiting_authorisation'}`)

  const s3 = require(path.join(__dirname, '..', '..', 'services', 's3-service.cjs'))
  const out = { clone_voice_id: cloneId, render: RENDER, lines: [] }
  for (const l of LINES) {
    const row = { text: l.text, clone: null, lorenzo: null }
    for (const [arm, voice] of [['clone', cloneId], ['lorenzo', LORENZO]]) {
      const buf = await render(l.text, voice)
      const uuid = crypto.randomUUID()
      await s3.uploadAudio(uuid, buf)
      row[arm] = `${BUCKET_URL}/mastered/${uuid}.mp3`
      console.log(`  ${arm}: ${row[arm]} (${buf.length} bytes)`)
    }
    out.lines.push(row)
  }
  const logPath = path.join(__dirname, '..', '..', 'docs', 'voicelab', 'tom-ita-clone-vs-lorenzo-2026-09-04-applied-log.json')
  fs.mkdirSync(path.dirname(logPath), { recursive: true })
  fs.writeFileSync(logPath, JSON.stringify(out, null, 1))
  console.log(`log: ${logPath}`)
}

/**
 * The third arm on its own: three renders on tom_ita_002, same parameters,
 * uploaded to the same public bucket. The other two arms are already rendered
 * and their URLs live in docs/voicelab/tom-italian-clone-vs-lorenzo-2026-09-04.md.
 */
async function arm2Only () {
  if (!APPLY) {
    console.log('DRY RUN (--arm2-only) — nothing rendered, nothing uploaded.')
    console.log(`would render ${LINES.length} lines on tom_ita_002 (${TOM_ITA_002}) with`, RENDER)
    for (const l of LINES) console.log(`  - ${l.text}`)
    return
  }
  const s3 = require(path.join(__dirname, '..', '..', 'services', 's3-service.cjs'))
  const out = { voice: 'tom_ita_002', voice_id: TOM_ITA_002, render: RENDER, lines: [] }
  for (const l of LINES) {
    const buf = await render(l.text, TOM_ITA_002)
    const uuid = crypto.randomUUID()
    await s3.uploadAudio(uuid, buf)
    const url = `${BUCKET_URL}/mastered/${uuid}.mp3`
    out.lines.push({ text: l.text, tom_ita_002: url, bytes: buf.length })
    console.log(`  tom_ita_002: ${url} (${buf.length} bytes)`)
  }
  const logPath = path.join(__dirname, '..', '..', 'docs', 'voicelab', 'tom-ita-002-arm-2026-09-04-applied-log.json')
  fs.mkdirSync(path.dirname(logPath), { recursive: true })
  fs.writeFileSync(logPath, JSON.stringify(out, null, 1))
  console.log(`log: ${logPath}`)
}

main().catch(e => { console.error(e.message); process.exit(1) })
