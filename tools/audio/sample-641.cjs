#!/usr/bin/env node
/** Spot-listen sample for job #641: from a render ledger pick N evenly-spread NEW clips per voice, download them via the learner proxy and stitch
 *  one mp3 (0.9s gap) plus a text list. node tools/audio/sample-641.cjs <ledger.jsonl> <outdir> [n=10] [label]
 *  Each entry also states the old voice it replaces. Read-only: touches no row. */
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process')
require('dotenv').config({ path: path.join(__dirname, '../../.env.psql') })
const { Client } = require('pg')
const [ledger, outdir, n = '10', label = ''] = process.argv.slice(2)
;(async () => {
  fs.mkdirSync(outdir, { recursive: true })
  const lines = fs.readFileSync(ledger, 'utf8').trim().split('\n').map(JSON.parse).filter(l => l.kind === 'rendered' || l.kind === 'swap')
  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }); await pg.connect()
  const { rows } = await pg.query(`select ca.id::text, ca.voice_id, ca.audio_revision, coalesce(v.display_name, ca.voice_id) name, ca.duration_ms from course_audio ca left join voices v on v.voice_id = 'cartesia_' || regexp_replace(ca.voice_id,'^cartesia_','') where ca.id = any($1::uuid[])`, [lines.map(l => l.newId)])
  const by = new Map(rows.map(r => [r.id, r])); const groups = {}
  for (const l of lines) { const r = by.get(l.newId); if (!r || !(r.duration_ms > 600)) continue; (groups[r.name] ||= []).push({ ...l, ...r }) }
  const md = [`# ${label || path.basename(ledger)} — new-voice samples`, '']; const parts = []
  fs.writeFileSync(`${outdir}/gap.wav`, execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', '0.9', '-f', 'wav', '-']))
  for (const [name, arr] of Object.entries(groups)) {
    const step = Math.max(1, Math.floor(arr.length / Number(n))); const pick = arr.filter((_, i) => i % step === 0).slice(0, Number(n))
    md.push(`## ${name} (${arr.length} rendered)`, '')
    let i = 0
    for (const p of pick) {
      const ref = p.audio_revision > 1 ? `${p.id}.v${p.audio_revision}` : p.id
      const res = await fetch(`https://saysomethingin.app/api/audio/${ref}`, { headers: { 'User-Agent': 'job-641' } }); if (!res.ok) { console.error("HTTP", res.status, ref); md.push(`- (clip ${p.id} HTTP ${res.status})`); continue }
      const f = `${outdir}/${name}-${++i}.mp3`; fs.writeFileSync(f, Buffer.from(await res.arrayBuffer())); const w = f.replace(/\.mp3$/, '.wav'); execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', f, '-ar', '44100', '-ac', '1', w]); parts.push(w, `${outdir}/gap.wav`)
      md.push(`${i}. ${p.text}  _(replaces ${p.oldVoice})_`)
    }
    md.push('')
  }
  const list = `${outdir}/list.txt`; fs.writeFileSync(list, parts.map(f => `file '${f}'`).join('\n'))
  const mp3 = `${outdir}/samples.mp3`
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-ar', '44100', '-ac', '1', '-b:a', '96k', mp3])
  fs.writeFileSync(`${outdir}/samples.md`, md.join('\n')); console.log(mp3); await pg.end()
})().catch(e => { console.error(e); process.exit(1) })
