#!/usr/bin/env node
/**
 * Italian clone probe — 2026-09-04. READ-ONLY against the DB, WRITE only to disk.
 *
 * Renders a handful of verbatim `method-pod-chapters` Italian lines on the two
 * men's own Cartesia clones, so Tom can answer one question with his ear:
 * can tom_001 and aran_english_003 speak Italian, and do they sound like two
 * different men. No mastering, no post-chain, no cherry-picking, first take of
 * everything. Nothing here touches course_audio, the pods, or the voices table.
 */
require('dotenv').config({ quiet: true })
require('dotenv').config({ path: '.env.psql', quiet: true })
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const OUT = process.env.PROBE_OUT || '/home/tomcassidy/command-surface/public/evidence/ita-method-pod-clone-probe-2026-09-04'
const API_VERSION = '2026-08-14'          // pinned API contract (date header)
const MODEL = process.env.CARTESIA_MODEL || 'sonic-3.6'  // as recorded on all four clone rows

const TOM_001 = 'cartesia_8fef4d59-0a7e-4ad2-a261-6a3bb50734d2'
const TOM_003 = 'cartesia_f56e05e2-d043-4b41-a7cb-faf528b99e01'
const ARAN_003 = 'cartesia_33890587-a29f-4416-ba61-2615c74f92fe'

/** [global_order, voice, filename-slug]. Speaker comes from the DB, not from here. */
const PLAN = [
  [1, TOM_001, '01-exchange-01-tom'],
  [2, ARAN_003, '01-exchange-02-aran'],
  [3, TOM_001, '01-exchange-03-tom'],
  [4, ARAN_003, '01-exchange-04-aran'],
  [5, TOM_001, '01-exchange-05-tom'],
  [6, ARAN_003, '01-exchange-06-aran'],
  [7, TOM_001, '01-exchange-07-tom'],
  [9, TOM_001, '02-long-tom-city'],
  [129, ARAN_003, '03-long-aran-transcripts'],
  [43, TOM_001, '04-short-tom-davvero'],
  [12, ARAN_003, '05-short-aran-nessuno'],
  [1, TOM_003, '06-tom003-opening'],
  [9, TOM_003, '07-tom003-long-city'],
]

async function synth (text, voiceId) {
  const body = {
    model_id: MODEL,
    transcript: text,
    voice: { mode: 'id', id: voiceId.replace(/^cartesia_/, '') },
    generation_config: { speed: 1.0 },
    output_format: { container: 'mp3', sample_rate: 24000, bit_rate: 128000 },
    language: 'it',
  }
  const t0 = Date.now()
  const res = await fetch('https://api.cartesia.ai/tts/bytes', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.CARTESIA_API_KEY}`,
      'Cartesia-Version': API_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const ms = Date.now() - t0
  if (!res.ok) return { ok: false, status: res.status, ms, error: (await res.text()).slice(0, 400), request: body }
  return { ok: true, status: res.status, ms, buf: Buffer.from(await res.arrayBuffer()), request: body }
}

async function main () {
  const only = process.env.PROBE_ONLY ? Number(process.env.PROBE_ONLY) : null
  fs.mkdirSync(OUT, { recursive: true })
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await c.connect()
  const orders = [...new Set(PLAN.map(p => p[0]))]
  const rows = (await c.query(
    `select global_order, speaker, english_text, target_text, target_lang
       from canonical_pod_scenarios where pod_slug='method-pod-chapters' and global_order = any($1)`,
    [orders])).rows
  await c.end()
  const byOrder = new Map(rows.map(r => [r.global_order, r]))

  const log = []
  const plan = only ? PLAN.slice(0, only) : PLAN
  for (const [order, voiceId, slug] of plan) {
    const row = byOrder.get(order)
    if (!row) throw new Error(`no row for global_order ${order}`)
    const r = await synth(row.target_text, voiceId)
    const file = path.join(OUT, `${slug}.mp3`)
    if (r.ok) fs.writeFileSync(file, r.buf)
    log.push({
      slug, global_order: order, speaker: row.speaker, voice_id: voiceId,
      target_text: row.target_text, english_text: row.english_text, target_lang: row.target_lang,
      http_status: r.status, ms: r.ms, bytes: r.ok ? r.buf.length : 0,
      file: r.ok ? file : null, error: r.error || null,
      request: { model_id: r.request.model_id, language: r.request.language, cartesia_version: API_VERSION, speed: 1.0, output_format: r.request.output_format },
    })
    console.log(`${r.ok ? 'OK ' : 'ERR'} ${slug} order=${order} ${row.speaker} ${r.status} ${r.ok ? r.buf.length + 'B' : r.error} ${r.ms}ms`)
  }
  const logPath = process.env.PROBE_LOG || path.join(process.cwd(), 'docs/probe-ita-clone-2026-09-04/render-log.json')
  fs.mkdirSync(path.dirname(logPath), { recursive: true })
  const prev = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, 'utf8')) : []
  fs.writeFileSync(logPath, JSON.stringify([...prev, { ts: new Date().toISOString(), clips: log }], null, 2))
  console.log('log →', logPath)
}
main().catch(e => { console.error(e); process.exit(1) })
