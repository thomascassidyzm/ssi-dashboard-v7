#!/usr/bin/env node
/**
 * A-136 ear check — pull before/after pairs for Tom.
 *
 * The swap is make-before-break, so every superseded Noor object is still on S3
 * at the key recorded in `course_audio_revisions`. That makes the A/B free: the
 * clicking take and its replacement, same line, same slot, side by side.
 *
 * Picks the clips whose Noor take carried the LOUDEST measured tick, because
 * those are the ones where the defect is audible rather than theoretical — the
 * point of the check is whether the click is gone, not whether Femke is pleasant.
 *
 * Writes to command-surface/public/evidence/<slug>/ with ASCII-only filenames
 * (the evidence server 404s anything else) and an index.html to link.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
process.env.PHASE8_NO_LISTEN = '1'

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { GetObjectCommand } = require('@aws-sdk/client-s3')
const p8 = require('../../services/phases/phase8-audio-v13.cjs')

const PSQL = path.join(process.env.HOME, '.local/pg17/bin/psql')
const DB = process.env.DATABASE_URL
const SLUG = 'a136-nld-noor-drop-2026-08-17'
const OUT = path.join(process.env.HOME, 'command-surface/public/evidence', SLUG)
const N = parseInt(process.argv[2] || '6', 10)

function q (sql) {
  return JSON.parse(execFileSync(PSQL, [DB, '-At', '-c',
    `select coalesce(json_agg(t), '[]'::json) from (${sql}) t`], { maxBuffer: 1 << 28 }).toString())
}
async function pull (key, dest) {
  const r = await p8.s3.send(new GetObjectCommand({ Bucket: p8.S3_BUCKET, Key: key }))
  fs.writeFileSync(dest, Buffer.concat(await r.Body.toArray()))
}
const ascii = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)

;(async () => {
  const log = JSON.parse(fs.readFileSync(path.join(__dirname, '../../docs/a108/a136-nld-noor-drop-apply.json'), 'utf8'))
  const sample = JSON.parse(fs.readFileSync(path.join(__dirname, '../../docs/a108/a136-nld-noor-drop-sample.json'), 'utf8'))
  const all = [...sample.records, ...log.records].filter(r => r.applied)

  const rows = q(`select r.audio_id, r.previous_s3_key, r.new_s3_key, a.text
                  from course_audio_revisions r join course_audio a on a.id = r.audio_id
                  where r.source = 'a136-nld-noor-drop'`)
  const byId = new Map(rows.map(r => [r.audio_id, r]))

  fs.mkdirSync(OUT, { recursive: true })
  const picked = all.filter(r => byId.has(r.id)).slice(0, N)
  const items = []
  for (const r of picked) {
    const row = byId.get(r.id)
    const base = ascii(row.text) || r.id.slice(0, 8)
    const before = `${base}-A-noor-superseded.mp3`
    const after = `${base}-B-femke-live.mp3`
    await pull(row.previous_s3_key, path.join(OUT, before))
    await pull(row.new_s3_key, path.join(OUT, after))
    items.push({ text: row.text, before, after })
    console.log(`${base}\n   A ${row.previous_s3_key}\n   B ${row.new_s3_key}`)
  }

  const html = `<!doctype html><meta charset="utf-8"><title>A-136 — Noor out, Femke in</title>
<style>body{font:16px/1.5 system-ui;margin:2rem;max-width:44rem}h1{font-size:1.3rem}
li{margin:1.4rem 0;list-style:none}b{font-weight:600}audio{width:100%;margin:.3rem 0}
small{color:#666}</style>
<h1>A-136 — Noor out, Femke in</h1>
<p>Same line twice. <b>A</b> is the Noor take that was serving until today — the voice that
clicked on 5 of 5 diagnostic lines. <b>B</b> is the Femke replacement that is live now.</p>
<p><small>A is superseded, not deleted. If B is wrong anywhere, say so and it goes back.</small></p>
<ol>${items.map(i => `<li><b>${i.text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</b>
<div><small>A — Noor, superseded</small><audio controls preload="none" src="${i.before}"></audio></div>
<div><small>B — Femke, live now</small><audio controls preload="none" src="${i.after}"></audio></div></li>`).join('\n')}</ol>
<p><b>The question, one word: is the click gone — yes or no?</b></p>`
  fs.writeFileSync(path.join(OUT, 'index.html'), html)
  console.log(`\n-> ${OUT}/index.html`)
})().catch(e => { console.error(e.stack || e.message); process.exit(1) })
