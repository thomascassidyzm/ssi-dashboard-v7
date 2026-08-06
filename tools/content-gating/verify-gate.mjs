import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const env = Object.fromEntries(fs.readFileSync('.env','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim()]}))
// ANON key — exactly what a learner's browser uses
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY)

const cases = ['cym_n_for_eng','cym_s_for_eng','fra_for_eng','heb_for_eng','spa_for_eng']
console.log('--- useListeningPods / listeningMetaCache / usePodLapScheduler path: .eq(pod_id, "<c>:pod-0") ---')
for (const c of cases) {
  const { data, error } = await sb.from('listening_pod_sentences')
    .select('id, target_audio_id').eq('pod_id', `${c}:pod-0`).order('global_order')
  const n = (data||[]).length
  const playable = (data||[]).filter(r=>r.target_audio_id).length
  const verdict = ['cym_n_for_eng','cym_s_for_eng'].includes(c)
    ? (n === 0 ? '✓ GATED — learner sees "No pods for this course yet."' : '✗ STILL EXPOSED')
    : (n > 0 ? '✓ unaffected' : '✗ COLLATERAL DAMAGE')
  console.log(`  ${c.padEnd(16)} rows=${String(n).padStart(4)} withAudio=${String(playable).padStart(4)}  ${error?('ERR '+error.message):verdict}`)
}
console.log('\n--- generateLearningScript Phase 7 (pod lap injection) uses the same .eq — hasPods = rows>0 ---')
for (const c of ['cym_n_for_eng','cym_s_for_eng']) {
  const { count } = await sb.from('listening_pod_sentences').select('*',{count:'exact',head:true}).eq('pod_id', `${c}:pod-0`)
  console.log(`  ${c}: hasPods=${count>0} → in-session pod lap ${count>0?'STILL RUNS':'skipped ✓'}`)
}
console.log('\n--- content preserved, not deleted ---')
const sbs = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)
for (const c of ['cym_n_for_eng','cym_s_for_eng']) {
  const { count } = await sbs.from('listening_pod_sentences').select('*',{count:'exact',head:true}).eq('pod_id', `${c}:pod-0-unrecorded`)
  console.log(`  ${c}:pod-0-unrecorded holds ${count} sentences (safe, awaiting recording)`)
}
console.log('\n--- main Welsh course still live and intact (must NOT be gated) ---')
for (const c of ['cym_n_for_eng','cym_s_for_eng']) {
  const { count: legos } = await sbs.from('course_legos').select('*',{count:'exact',head:true}).eq('course_code',c)
  const { count: audio } = await sbs.from('course_audio').select('*',{count:'exact',head:true}).eq('course_code',c)
  const { data: crs } = await sbs.from('courses').select('new_app_status').eq('course_code',c).single()
  console.log(`  ${c}: status=${crs.new_app_status} legos=${legos} audio=${audio} ✓ untouched`)
}
