const {Client}=require('pg');const fs=require('fs'),path=require('path')
const url=fs.readFileSync(path.resolve(__dirname,'../../.env.psql'),'utf8').match(/DATABASE_URL=(.+)/)[1].trim()
const COURSE='eng_for_sin',VOICE='azure_si-LK-SameeraNeural'
const {rows}=require('./plan.cjs')
;(async()=>{const db=new Client({connectionString:url,ssl:{rejectUnauthorized:false}});await db.connect()
const q=async(s,p)=>(await db.query(s,p)).rows
const out=[]
console.log('=== drift guard + current clip + post-fix normalized key ===')
for(const r of rows){
 let cur
 if(r.kind==='seed') [cur]=await q(`select known_text,known_audio_id,version from course_seeds where course_code=$1 and seed_number=$2`,[COURSE,r.seed])
 else [cur]=await q(`select known_text,known_audio_id,version from course_practice_phrases where course_code=$1 and seed_number=$2 and lego_index=$3 and position=$4`,[COURSE,r.seed,r.lego_index,r.position])
 const drift = cur.known_text!==r.old_text
 const [{norm}]=await q(`select normalize_text($1::text) as norm`,[r.new_text])
 const [{c}]=await q(`select count(*) c from course_audio where course_code=$1 and language='sin' and role='known' and voice_id=$2 and text_normalized=$3`,[COURSE,VOICE,norm])
 out.push({...r,cur_clip:cur.known_audio_id,cur_version:cur.version,norm,existing_clips:+c,drift})
 console.log(`  ${(r.kind==='seed'?'seed '+r.seed:'s'+r.seed+'L'+r.lego_index+'p'+r.position).padEnd(14)} drift=${drift} clip=${cur.known_audio_id} existingClipForNewText=${c}`)
}
console.log('\n=== CLIP SHARING: which rows currently share a clip? ===')
const byClip={};for(const o of out){(byClip[o.cur_clip]=byClip[o.cur_clip]||[]).push(o.kind==='seed'?'seed'+o.seed:'s'+o.seed+'L'+o.lego_index+'p'+o.position)}
for(const [c,v] of Object.entries(byClip))if(v.length>1)console.log(`  ${c} <- ${v.join(' + ')}`)
console.log('\n=== NORMALIZED-KEY SHARING after the fix (rows that must share ONE new clip) ===')
const byNorm={};for(const o of out){(byNorm[o.norm]=byNorm[o.norm]||[]).push(o)}
let distinct=0
for(const [n,v] of Object.entries(byNorm)){distinct++
 if(v.length>1)console.log(`  SHARED (${v.length}): ${v.map(o=>o.kind==='seed'?'seed'+o.seed:'s'+o.seed+'L'+o.lego_index+'p'+o.position).join(' + ')}\n     -> ${n}`)}
console.log(`\n${rows.length} rows -> ${distinct} DISTINCT clips to render`)
console.log('\n=== is each current clip linked from anywhere ELSE in the course? (blast radius) ===')
for(const o of out){
 const s=await q(`select seed_number from course_seeds where course_code=$1 and known_audio_id=$2`,[COURSE,o.cur_clip])
 const p=await q(`select seed_number,lego_index,position from course_practice_phrases where course_code=$1 and known_audio_id=$2`,[COURSE,o.cur_clip])
 const l=await q(`select lego_id from course_legos where course_code=$1 and known_audio_id=$2`,[COURSE,o.cur_clip])
 const tot=s.length+p.length+l.length
 const mine=1
 if(tot>byClip[o.cur_clip].length)console.log(`  !! ${o.cur_clip} linked ${tot} times, plan covers ${byClip[o.cur_clip].length}: seeds[${s.map(x=>x.seed_number)}] phrases[${p.map(x=>x.seed_number+'L'+x.lego_index+'p'+x.position)}] legos[${l.map(x=>x.lego_id)}]`)
}
console.log('  (nothing printed above = every link to every old clip is inside the plan)')
fs.writeFileSync(path.join(__dirname,'plan-state.json'),JSON.stringify(out,null,1))
await db.end()})().catch(e=>{console.error('FATAL',e.message);process.exit(1)})
