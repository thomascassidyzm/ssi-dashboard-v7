// A-134 late-lego — render the 14 distinct clips the 18-row plan needs.
// Recipe identical to #850 (scripts/a134-seed3/render.cjs): Azure known voice read from
// courses.voice_config, compressor-free mastering chain (d8ddb8e4), PHASE8_NO_LISTEN=1.
// gates.cjs + rate-model.json copied unchanged from #850 so numbers stay comparable.
// SHARED CLIPS: four seed/phrase pairs normalize to one text_normalized, so one clip serves
// both. We render the SEED's spelling (the one with the trailing '.'), which is what the
// existing shared clip already stores — keeps the arrangement identical to today's.
process.env.PHASE8_NO_LISTEN='1'
require('dotenv').config({path:require('path').resolve(__dirname,'../../.env'),quiet:true})
const fs=require('fs'),path=require('path');const {Client}=require('pg')
const ttsService=require('../../services/tts-service.cjs')
const phase8=require('../../services/phases/phase8-audio-v13.cjs')
const {runGates}=require('./gates.cjs')
const COURSE='eng_for_sin'
const SHIP=path.join(__dirname,'ship'),SPARE=path.join(__dirname,'spares')
const ATTEMPTS=3,SPARES_WANTED=2
const state=require('./plan-state.json')
// group the 18 rows into distinct render jobs by normalized key; render the seed spelling
const byNorm=new Map()
for(const r of state){
 const g=byNorm.get(r.norm)||{norm:r.norm,rows:[],text:null}
 g.rows.push(r)
 if(r.kind==='seed'||g.text===null) g.text = (r.kind==='seed') ? r.new_text : (g.text??r.new_text)
 byNorm.set(r.norm,g)
}
let JOBS=[...byNorm.values()].map((g,i)=>({id:i+1,text:g.text,norm:g.norm,
  reuse:g.rows.find(r=>r.reuse)?.reuse||null,
  rows:g.rows.map(r=>r.kind==='seed'?'seed'+r.seed:'s'+r.seed+'L'+r.lego_index+'p'+r.position)}))
// A group whose row already owns a verified clip is REUSED, never re-rendered: inserting a
// duplicate would violate unique_course_audio_per_voice. Gated separately on the real S3 bytes.
const REUSED=JOBS.filter(j=>j.reuse); JOBS=JOBS.filter(j=>!j.reuse)
// Idempotent: a group already rendered in a previous run (matched on TEXT, not on index, because
// adding rows renumbers the indices) keeps its existing take instead of paying for another.
let PRIOR=[]; try{PRIOR=require('./render-log2.json')}catch(e){}
const done=new Map(PRIOR.filter(p=>p.shipped).map(p=>[p.text,p]))
const dbUrl=()=>fs.readFileSync(path.resolve(__dirname,'../../.env.psql'),'utf8').match(/DATABASE_URL=(.+)/)[1].trim()
async function voiceCfg(){
  const db=new Client({connectionString:dbUrl(),ssl:{rejectUnauthorized:false}});await db.connect()
  const r=await db.query(`select voice_config from courses where course_code=$1`,[COURSE]);await db.end()
  const vc=r.rows[0].voice_config;return vc.voices.known||vc.voices.presentation
}
async function renderOnce(text,v,attempt){
  const {audioBuffer,wordBoundaries}=await ttsService.generateWithRetry(text,'azure',{
    subscriptionKey:process.env.AZURE_SPEECH_KEY,region:process.env.AZURE_SPEECH_REGION,
    voiceName:v.voiceId,speed:v.settings?.speed??1,regenerationAttempt:attempt})
  const {buffer,durationMs}=await phase8.masterAudio(audioBuffer,text)
  return {buffer,durationMs,wordBoundaries}
}
;(async()=>{
 fs.mkdirSync(SHIP,{recursive:true});fs.mkdirSync(SPARE,{recursive:true})
 const v=await voiceCfg();console.log('VOICE (voice_config.voices.known):',JSON.stringify(v))
 if(v.provider!=='azure')throw new Error('expected azure, got '+v.provider)
 console.log(`${state.length} rows -> ${JOBS.length} renderable clips + ${REUSED.length} reused`)
 const log=[]
 for(const j of REUSED){ log.push({...j,shipped:null,spares:[],attempts:[]}); console.log(`clip${j.id} (${j.rows.join('+')}): REUSED existing clip ${j.reuse}, not rendered`) }
 for(const j of JOBS){
  if(done.has(j.text)){ const p=done.get(j.text); log.push({...j,shipped:p.shipped,spares:p.spares,attempts:p.attempts})
   console.log(`clip${j.id} (${j.rows.join('+')}): already rendered in a prior run, keeping take (${p.shipped.ms}ms)`); continue }
  let shipped=null;const attempts=[],spares=[]
  for(let a=1;a<=ATTEMPTS+SPARES_WANTED;a++){
    const {buffer,durationMs,wordBoundaries}=await renderOnce(j.text,v,a-1)
    const f=path.join(SPARE,`clip${j.id}-attempt${a}.mp3`);fs.writeFileSync(f,buffer)
    const g=runGates(j.text,wordBoundaries,durationMs,f)
    const e={clip:j.id,attempt:a,file:f,bytes:buffer.length,ms:durationMs,...g,
             word_boundary_tokens:(wordBoundaries||[]).map(x=>x.text)}
    attempts.push(e)
    console.log(`clip${j.id} att${a}: ${g.fail.length?'FAIL '+g.fail.join('; '):'PASS'} | ${durationMs}ms z=${g.z.toFixed(2)} tail=${g.tail?.toFixed(1)}dB tokens=${g.tokens}`)
    if(!g.fail.length){ if(!shipped){shipped=e;fs.copyFileSync(f,path.join(SHIP,`clip${j.id}.mp3`))} else spares.push(e) }
    if(shipped&&spares.length>=SPARES_WANTED)break
  }
  log.push({...j,shipped,spares,attempts})
  console.log(`  => clip${j.id} (${j.rows.join('+')}): ${shipped?'SHIPPING TAKE OK':'NO PASSING TAKE'}, ${spares.length} spare(s)\n`)
 }
 fs.writeFileSync(path.join(__dirname,'render-log2.json'),JSON.stringify(log,null,1))
 const need=log.filter(l=>!l.reuse)
 const ok=need.filter(l=>l.shipped).length
 console.log(`summary: ${ok}/${need.length} rendered clips have a shipping take; ${REUSED.length} reused; ${log.reduce((a,l)=>a+l.spares.length,0)} spares`)
 if(ok!==need.length)process.exit(2)
})().catch(e=>{console.error('FATAL',e.message);process.exit(1)})
