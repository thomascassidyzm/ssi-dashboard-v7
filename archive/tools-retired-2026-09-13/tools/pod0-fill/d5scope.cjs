require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const { createClient } = require('@supabase/supabase-js')
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const scope = require('./scope.json')
;(async()=>{
  const ids = scope.map(s=>s.sentence_id)
  const rows=[]
  for(let i=0;i<ids.length;i+=200){
    const {data,error}=await sb.from('listening_pod_sentences').select('id, target_text_draft').in('id', ids.slice(i,i+200))
    if(error) throw new Error(error.message); rows.push(...data)
  }
  const draft = new Map(rows.map(r=>[r.id, r.target_text_draft]))
  const targetSide = scope.filter(s=>s.side==='target')
  const knownSide  = scope.filter(s=>s.side==='known')
  console.log('TARGET-side slots (English is the voiced text; draft flag APPLIES):', targetSide.length)
  console.log('  of which target_text_draft=true:', targetSide.filter(s=>draft.get(s.sentence_id)===true).length)
  console.log('KNOWN-side slots (English is known_text; target draft flag does NOT apply):', knownSide.length)
  console.log('  (their target_text_draft=true count, informational):', knownSide.filter(s=>draft.get(s.sentence_id)===true).length)
  const badCourses={}
  targetSide.filter(s=>draft.get(s.sentence_id)===true).forEach(s=>badCourses[s.course_code]=(badCourses[s.course_code]||0)+1)
  console.log('  draft target-side by course:', badCourses)
})().catch(e=>{console.error('FAIL',e.message);process.exit(1)})
