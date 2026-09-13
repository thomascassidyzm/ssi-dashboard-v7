require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const scope = require('./scope.json')

const canonicalSpeakerName = s => (s||'').replace(/\s*\([^)]*\)\s*/g,' ').replace(/\s+/g,' ').trim()
function resolve(podSpeakers, speaker, track) {
  const m = podSpeakers || {}
  const entry = m[canonicalSpeakerName(speaker)] || m[speaker] || m._default
  if (!entry) return null
  if (entry[track] && entry[track].voice_id) return { voice_id: entry[track].voice_id, provider: entry[track].provider||'azure', gender: entry.gender||'n', via:'per-track' }
  if (track==='target' && entry.voice_id) return { voice_id: entry.voice_id, provider: entry.provider||'xai', gender: entry.gender||'n', via:'legacy' }
  return null
}

;(async () => {
  const podIds = [...new Set(scope.map(s=>s.pod_id))]
  const { data: pods } = await supabase.from('listening_pods').select('id, course_code, slug, speakers').in('id', podIds)
  const podById = new Map(pods.map(p=>[p.id,p]))
  const codes = [...new Set(scope.map(s=>s.course_code))]
  const { data: courses } = await supabase.from('courses').select('course_code, voice_config').in('course_code', codes)
  const vcByCode = new Map(courses.map(c=>[c.course_code, c.voice_config||{}]))

  const tally = {}, unresolved = []
  for (const s of scope) {
    const pod = podById.get(s.pod_id)
    let v = resolve(pod.speakers, s.speaker, s.side)
    let src = 'pod.speakers'
    if (!v && s.side === 'known') {
      const kv = (vcByCode.get(s.course_code).voices||{}).known || {}
      if (kv.voiceId || kv.voice_id) { v = { voice_id: kv.voiceId||kv.voice_id, provider: kv.provider||'azure', gender: kv.gender||'f' }; src='ctx.knownVoice fallback' }
    }
    if (!v) { unresolved.push(s); continue }
    const key = `${v.provider}:${v.voice_id} (${v.gender}) [${src}]`
    tally[key] = (tally[key]||0)+1
  }
  console.log('VOICE TALLY over', scope.length, 'in-scope slots:')
  Object.entries(tally).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log(`  ${String(v).padStart(4)}  ${k}`))
  console.log('\nUNRESOLVED (no voice):', unresolved.length)
  const uc={}; unresolved.forEach(u=>{const k=`${u.course_code} / speaker=${JSON.stringify(u.speaker)} / ${u.side}`; uc[k]=(uc[k]||0)+1})
  Object.entries(uc).forEach(([k,v])=>console.log(`  ${String(v).padStart(4)}  ${k}`))
  console.log('\nBLANK TEXT slots:', scope.filter(x=>!(x.text||'').trim()).map(x=>({c:x.course_code,id:x.sentence_id,sp:x.speaker,side:x.side})))
})().catch(e=>{console.error('FAIL',e.message);process.exit(1)})
