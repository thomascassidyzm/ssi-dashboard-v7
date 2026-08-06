// Verify a completed --targets regen batch on the DEPLOYED bytes.
// For a random sample of promoted clips: fetch via the convention URL Popty
// derives (mastered/<ID>.mp3, independent of s3_key), whisper it, and confirm
// the final word is there. Also confirms every holder link points at the new id.
//   node tools/verify-regen-batch.cjs <applied-log.json> [sampleSize]
require('dotenv').config()
process.env.PHASE8_NO_LISTEN = '1'
const fs = require('fs')
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3')
const { createClient } = require('@supabase/supabase-js')
const veracity = require('../services/audio-veracity.cjs')
const s3 = new S3Client({ region: process.env.AWS_REGION || 'eu-west-1', credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY } })
const BUCKET = process.env.S3_BUCKET || 'ssi-audio-stage'
const sb = createClient(process.env.SUPABASE_URL.trim(), process.env.SUPABASE_SERVICE_KEY.trim())
const norm = s => String(s||'').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g,'').replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim()
const heardIn = (w, hs) => !w || hs.some(h => h === w || (w.length >= 4 && (h.startsWith(w.slice(0, Math.max(4, w.length-2))) || w.startsWith(h.slice(0, Math.max(4, h.length-2))))))

;(async () => {
  const log = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
  const replaced = log.log.filter(l => l.action === 'replaced')
  const N = Number(process.argv[3] || 60)
  // Deterministic spread across the batch rather than the first N.
  const step = Math.max(1, Math.floor(replaced.length / N))
  const sample = replaced.filter((_, i) => i % step === 0).slice(0, N)
  console.log(`${replaced.length} promoted; verifying a spread of ${sample.length} on the deployed bytes\n`)

  let ok = 0, chopped = 0, linkBad = 0, err = 0
  for (const r of sample) {
    try {
      const conventionKey = `mastered/${r.newId.toUpperCase()}.mp3`
      if (conventionKey !== r.newKey) { linkBad++; console.log(`LINK  ${r.clip}: convention URL != s3_key`); continue }
      // every holder must point at the new id
      let links = true
      for (const h of r.holders || []) {
        const [tc, rowId] = h.split('#'); const [table, col] = tc.split('.')
        const { data } = await sb.from(table).select(col).eq('id', rowId).single()
        if (!data || data[col] !== r.newId) { links = false; break }
      }
      if (!links) { linkBad++; console.log(`LINK  ${r.clip}: a holder still points elsewhere`); continue }

      // Language comes from the row, never guessed: whisper told the wrong
      // language mis-decodes and would report a healthy clip as chopped.
      const { data: arow } = await sb.from('course_audio').select('language, text').eq('id', r.newId).single()
      if (!arow) { err++; console.log(`ERR   ${r.clip}: new row missing`); continue }

      const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: conventionKey }))
      const c = []; for await (const x of res.Body) c.push(x)
      const v = await veracity.checkAudioVeracity(Buffer.concat(c), arow.text, arow.language)
      if (v.checked !== true) { console.log(`?     ${r.clip}: unchecked (${v.reason})`); err++; continue }
      const heard = norm(v.decode).split(' ').filter(Boolean)
      const want = norm(arow.text).split(' ').filter(Boolean)
      const last = want[want.length-1]
      if (heardIn(last, heard)) { ok++ } else { chopped++; console.log(`CHOP  ${r.clip}: want "${last}" — heard "${heard.slice(-4).join(' ')}"`) }
    } catch (e) { err++; console.log(`ERR   ${r.clip}: ${e.message}`) }
  }
  console.log(`\nverified whole: ${ok}/${sample.length}   still chopped: ${chopped}   link problems: ${linkBad}   unchecked/error: ${err}`)
  fs.writeFileSync('/tmp/verify-batch-result.json', JSON.stringify({ sampled: sample.length, ok, chopped, linkBad, err }, null, 2))
})().catch(e => { console.error(e); process.exit(1) })
