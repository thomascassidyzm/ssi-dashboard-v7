import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const env = Object.fromEntries(fs.readFileSync('.env','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim()]}))
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)

// Replay pods-router.fetchPods + fetchAllSentences exactly (services/voice-engine/pods-router.cjs:120,131)
for (const course of ['cym_n_for_eng','cym_s_for_eng']) {
  const { data: pods } = await sb.from('listening_pods')
    .select('id, slug, title, pod_type, pod_order').eq('course_code', course).order('pod_order').order('slug')
  const podIds = pods.map(p=>p.id)
  let sents=[], from=0
  while(true){ const {data}=await sb.from('listening_pod_sentences').select('id, pod_id, target_audio_id').in('pod_id',podIds).order('pod_id').order('global_order').range(from,from+999)
    sents.push(...data); if(data.length<1000)break; from+=1000 }
  console.log(`\n=== ${course} — recording plan (Aran/Catrin) ===`)
  console.log('  pods visible to recorder:', pods.map(p=>p.slug).join(', '))
  console.log('  sentences in plan:', sents.length, '| still needing a target take:', sents.filter(s=>!s.target_audio_id).length)
  // pods-registration.cjs:164 gate — sentence.pod_id must equal the podId the router emits
  const mismatch = sents.filter(s => !podIds.includes(s.pod_id))
  console.log('  registration gate (sentence.pod_id === plan podId):', mismatch.length === 0 ? '✓ PASSES for all ' + sents.length : '✗ BLOCKED for ' + mismatch.length)
  console.log('  podId the recorder will upload with:', [...new Set(sents.map(s=>s.pod_id))].join(', '))
}
