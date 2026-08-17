// Collision pre-check through the DATABASE's own normalize_text(), because the unique
// constraint on course_audio is (course_code, text_normalized, language, role, voice_id)
// and it is enforced on the database's normalisation, not on any JS equivalent. Where a
// repaired phrase composes text an existing healthy clip already speaks, we REUSE that
// clip rather than inventing a difference. This has bitten twice already on this plate.
require('dotenv').config({path:require('path').resolve(__dirname,'../../.env')})
const fs=require('fs'),path=require('path'),{Client}=require('pg')
const COURSE='eng_for_sin', VOICE='azure_si-LK-SameeraNeural', LANG='sin', ROLE='known'
const url=fs.readFileSync(path.resolve(__dirname,'../../.env.psql'),'utf8').match(/DATABASE_URL=(.+)/)[1].trim()
;(async()=>{
const db=new Client({connectionString:url,ssl:{rejectUnauthorized:false}});await db.connect()
await db.query("set statement_timeout='60s'")
const prop=require('./proposal.json'), out=[]
const seen=new Map()
for(const r of prop){
  const n=(await db.query('select normalize_text($1) t',[r.new])).rows[0].t
  const q=await db.query(
    `select id::text id, text, duration_ms, s3_key from course_audio
      where course_code=$1 and text_normalized=$2 and language=$3 and role=$4 and voice_id=$5`,
    [COURSE,n,LANG,ROLE,VOICE])
  const intra = seen.get(n)
  if(!intra) seen.set(n, r.id)
  out.push({id:r.id, text:r.new, normalized:n, existing_clip:q.rows[0]||null, duplicates_repair:intra||null})
  console.log(`${r.id.split(':')[1].padEnd(12)} ${q.rows[0]?`REUSE existing ${q.rows[0].id} (${q.rows[0].duration_ms}ms)`:'clear — render'}${intra?`  ALSO duplicates repair ${intra}`:''}`)
}
fs.writeFileSync(path.join(__dirname,'collision-check.json'),JSON.stringify(out,null,1))
const reuse=out.filter(o=>o.existing_clip).length
console.log(`\n${reuse} reuse, ${out.length-reuse} to render, ${out.filter(o=>o.duplicates_repair).length} intra-batch duplicates`)
await db.end()})()
