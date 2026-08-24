const {Client}=require('pg');const fs=require('fs'),path=require('path')
const url=fs.readFileSync(path.resolve(__dirname,'../../.env.psql'),'utf8').match(/DATABASE_URL=(.+)/)[1].trim()
const COURSE='eng_for_sin', H='හැබැයි'
;(async()=>{const db=new Client({connectionString:url,ssl:{rejectUnauthorized:false}});await db.connect()
const q=async(s,p)=>(await db.query(s,p)).rows
console.log('=== course_practice_phrases columns ===')
console.log((await q(`select column_name from information_schema.columns where table_name='course_practice_phrases' order by ordinal_position`)).map(r=>r.column_name).join(', '))
console.log('\n=== all pre-469 phrase rows containing habayi, with audio state ===')
const rows=await q(`select id,seed_number,lego_index,position,phrase_role,known_text,target_text,status,known_audio_id
 from course_practice_phrases where course_code=$1 and known_text like '%'||$2||'%' and seed_number<469
 order by seed_number,lego_index,position`,[COURSE,H])
let withAudio=0
for(const r of rows){
 const [a]=r.known_audio_id?await q(`select id,text,duration_ms,s3_key,voice_id,role from course_audio where id=$1`,[r.known_audio_id]):[null]
 if(a)withAudio++
 console.log(`  s${r.seed_number} L${r.lego_index}p${r.position} ${r.phrase_role} [${r.status}] clip=${r.known_audio_id||'NONE'}`)
 console.log(`     ${r.known_text}   -> ${r.target_text}`)
 if(a)console.log(`     clip: ${a.duration_ms}ms role=${a.role} ${a.voice_id} textMatches=${a.text===r.known_text}`)
}
console.log(`\n${rows.length} pre-469 rows, ${withAudio} carry a clip`)
const per={};for(const r of rows)per[r.seed_number]=(per[r.seed_number]||0)+1
console.log('per seed:',JSON.stringify(per))
console.log(`rows at/after 469 (left alone): ${(await q(`select count(*) n from course_practice_phrases where course_code=$1 and known_text like '%'||$2||'%' and seed_number>=469`,[COURSE,H]))[0].n}`)
fs.writeFileSync(path.join(__dirname,'phrase-rows.json'),JSON.stringify(rows,null,1))
await db.end()})().catch(e=>{console.error(e.message);process.exit(1)})
