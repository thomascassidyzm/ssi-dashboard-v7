const {Client}=require('pg');const fs=require('fs'),path=require('path')
const url=fs.readFileSync(path.resolve(__dirname,'../../.env.psql'),'utf8').match(/DATABASE_URL=(.+)/)[1].trim()
const COURSE='eng_for_sin'
;(async()=>{const db=new Client({connectionString:url,ssl:{rejectUnauthorized:false}});await db.connect()
const q=async(s,p)=>(await db.query(s,p)).rows
const NEW178='ඔයාව දකින්න ඕනේ වුණත්, මට වෙලාවක් තිබුණේ නෑ.'
const NEW165='ඒත් ඒ ඇත්ත කියලා මට විශ්වාස නෑ.'
for(const [n,t] of [[165,NEW165],[178,NEW178]]){
 const [{norm}]=await q(`select normalize_text($1::text) norm`,[t])
 const hits=await q(`select id,text,duration_ms,s3_key,voice_id,role,origin,word_boundaries,file_size_bytes from course_audio where course_code=$1 and text_normalized=$2 and role='known'`,[COURSE,norm])
 console.log(`\nseed ${n} new text: ${t}`)
 console.log(`  normalized: ${norm}`)
 console.log(`  existing known clips for that key: ${hits.length}`)
 for(const h of hits){
  console.log(`    ${h.id} ${h.duration_ms}ms ${h.voice_id} origin=${h.origin} s3=${h.s3_key} bytes=${h.file_size_bytes}`)
  console.log(`      stored text: ${JSON.stringify(h.text)}`)
  let wb=h.word_boundaries; if(typeof wb==='string'){try{wb=JSON.parse(wb)}catch(e){wb=null}}
  console.log(`      word_boundaries tokens (${(wb||[]).length}): ${(wb||[]).map(x=>x.text).join(' ')}`)
  const rows=[...(await q(`select seed_number from course_seeds where course_code=$1 and known_audio_id=$2`,[COURSE,h.id])).map(x=>'seed'+x.seed_number),
    ...(await q(`select seed_number,lego_index,position from course_practice_phrases where course_code=$1 and known_audio_id=$2`,[COURSE,h.id])).map(x=>'s'+x.seed_number+'L'+x.lego_index+'p'+x.position)]
  console.log(`      currently linked from: ${rows.join(', ')||'nothing'}`)
 }
}
console.log('\n=== seed 178 L2p6 row, for the record ===')
console.log(JSON.stringify((await q(`select known_text,target_text,status,known_audio_id from course_practice_phrases where course_code=$1 and seed_number=178 and lego_index=2 and position=6`,[COURSE]))[0],null,1))
console.log('\n=== seed 178 target_text vs L2p6 target_text ===')
const [s]=await q(`select target_text from course_seeds where course_code=$1 and seed_number=178`,[COURSE])
const [p]=await q(`select target_text from course_practice_phrases where course_code=$1 and seed_number=178 and lego_index=2 and position=6`,[COURSE])
console.log(` seed:  ${JSON.stringify(s.target_text)}\n phrase:${JSON.stringify(p.target_text)}\n byte-identical: ${s.target_text===p.target_text}`)
await db.end()})().catch(e=>{console.error(e.message);process.exit(1)})
