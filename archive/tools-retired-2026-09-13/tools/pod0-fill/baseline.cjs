require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const { createClient } = require('@supabase/supabase-js')
const { execFileSync } = require('child_process')
const fs = require('fs'), os = require('os'), path = require('path')
const { medianF0 } = require('./pitch.cjs')
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const BUCKET = process.env.S3_BUCKET, REGION = process.env.AWS_REGION || 'eu-west-1'
const url = k => `https://${BUCKET}.s3.${REGION}.amazonaws.com/${k}`

function fetchTo(key, dest) {
  execFileSync('curl', ['-s','-f','-o',dest,url(key)], { timeout: 60000 })
  return fs.statSync(dest).size
}

;(async()=>{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(),'pod0base-'))
  for (const voice of ['xai_bedd6226','xai_gfzdpspr5fdp']) {
    // known-good baseline: pre-existing English clips of this voice, rendered BEFORE today
    const { data, error } = await sb.from('course_audio')
      .select('id, text, s3_key, duration_ms, created_at')
      .eq('voice_id', voice).eq('language','eng').lt('created_at','2026-08-13T00:00:00Z')
      .not('s3_key','is',null).limit(45)
    if (error) throw new Error(error.message)
    const f0s = []
    for (const r of data) {
      const dest = path.join(tmp, r.id + '.mp3')
      try {
        const size = fetchTo(r.s3_key, dest)
        if (size < 2000) { console.log(`  [skip tiny ${size}b] ${r.id}`); continue }
        const p = medianF0(dest)
        if (p.f0) f0s.push(p.f0)
        console.log(`  ${voice} ${String(p.f0).padStart(4)}Hz (${p.frames} frames) "${(r.text||'').slice(0,40)}"`)
      } catch (e) { console.log(`  [fail] ${r.id}: ${e.message.slice(0,60)}`) }
    }
    f0s.sort((a,b)=>a-b)
    console.log(`>>> ${voice}: n=${f0s.length} min=${f0s[0]} median=${f0s[f0s.length>>1]} max=${f0s[f0s.length-1]}\n`)
  }
  fs.rmSync(tmp,{recursive:true,force:true})
})().catch(e=>{console.error('FAIL',e.message);process.exit(1)})
