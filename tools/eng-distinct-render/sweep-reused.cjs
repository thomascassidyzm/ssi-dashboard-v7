#!/usr/bin/env node
/**
 * Sweep the REUSED half of the pack — the 440 render units credited as already existing
 * on-cast — for liveness, exhaustively rather than by sample.
 *
 * The recount stated this as gap #3 in its own words: "Liveness is sampled, not exhaustive.
 * 40 of 440 covered units were HEADed... A full sweep of the 440 before relinking is cheap
 * and should be a precondition of the relink run, not an assumption." This is that sweep.
 * A credited clip that is not actually alive would relink a learner's slot onto nothing,
 * which is exactly the failure make-before-break exists to prevent.
 *
 * Read-only. Writes reused-liveness.json.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { q } = require('./db.cjs')

const BUCKET = process.env.S3_BUCKET, REGION = process.env.AWS_REGION || 'eu-west-1'
const url = k => `https://${BUCKET}.s3.${REGION}.amazonaws.com/${k}`
const APPROVED = ['gfzdpspr5fdp', 'bedd6226']
const CONC = 12

const units = JSON.parse(fs.readFileSync(path.join(__dirname, 'units.json')))
const reused = units.filter(u => u.existing)
console.log('reuse-credited units:', reused.length)

;(async () => {
  // Re-resolve each credited unit to a concrete row, preferring the LONGEST-lived
  // candidate with real bytes. The recount only kept one arbitrary id per unit.
  const norms = [...new Set(reused.map(u => u.norm))]
  const cand = new Map()
  for (let i = 0; i < norms.length; i += 400) {
    const rs = await q(
      `SELECT id, text, s3_key, duration_ms, course_code, text_stripped,
              regexp_replace(voice_id,'^(xai_|azure_)','') AS vb
       FROM course_audio
       WHERE language='eng' AND text_stripped = ANY($1)
         AND regexp_replace(voice_id,'^(xai_|azure_)','') = ANY($2)
         AND s3_key IS NOT NULL AND s3_key <> '' AND s3_key NOT LIKE 'pending/%'`,
      [norms.slice(i, i + 400), APPROVED])
    for (const r of rs) {
      const k = r.text_stripped + ' ' + r.vb
      if (!cand.has(k)) cand.set(k, [])
      cand.get(k).push(r)
    }
  }

  const head = u => {
    const out = execFileSync('curl', ['-sI', '-m', '30', u]).toString()
    return {
      status: Number((out.match(/HTTP\/[\d.]+ (\d{3})/) || [])[1] || 0),
      len: Number((out.match(/[Cc]ontent-[Ll]ength: (\d+)/) || [])[1] || 0),
    }
  }

  const out = []
  let n = 0
  await Promise.all(Array.from({ length: CONC }, async () => {
    for (;;) {
      const i = n++
      if (i >= reused.length) return
      const u = reused[i]
      const k = u.norm + ' ' + u.want
      const rows = (cand.get(k) || []).sort((a, b) => (b.duration_ms || 0) - (a.duration_ms || 0))
      const rec = { norm: u.norm, voice: u.want, candidates: rows.length, slots: u.slots }
      let picked = null
      for (const r of rows.slice(0, 4)) {           // first alive candidate wins
        const h = head(url(r.s3_key))
        if (h.status === 200 && h.len > 2048) { picked = { ...r, bytes: h.len }; break }
        rec.dead = (rec.dead || []).concat({ id: r.id, http: h.status, len: h.len })
      }
      if (picked) {
        rec.alive = true; rec.audio_id = picked.id; rec.s3_key = picked.s3_key
        rec.bytes = picked.bytes; rec.text = picked.text; rec.owner = picked.course_code
        rec.duration_ms = picked.duration_ms
      } else rec.alive = false
      out.push(rec)
      if (out.length % 50 === 0) console.log(`  ...${out.length}/${reused.length}`)
    }
  }))

  const alive = out.filter(r => r.alive)
  console.log('\nALIVE', alive.length, 'of', out.length)
  console.log('total bytes', alive.reduce((a, r) => a + r.bytes, 0).toLocaleString())
  const dead = out.filter(r => !r.alive)
  if (dead.length) console.log('DEAD UNITS (must not be relinked):', JSON.stringify(dead, null, 1))
  fs.writeFileSync(path.join(__dirname, 'reused-liveness.json'), JSON.stringify(out, null, 1))
})().catch(e => { console.error(e); process.exit(1) })
