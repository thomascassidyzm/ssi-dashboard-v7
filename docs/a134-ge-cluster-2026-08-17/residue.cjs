// Attack 2 refuted my scan: 454 course_audio rows in eng_for_sin still hold a bare ගෙ
// in their TEXT. Is any of it REACHABLE by a learner? A course_audio row is only heard
// if something points at it. Check every pointer.
require('dotenv').config({path:require('path').resolve(__dirname,'../../.env')})
const fs=require('fs'),path=require('path'),{Client}=require('pg')
const url=fs.readFileSync(path.resolve(__dirname,'../../.env.psql'),'utf8').match(/DATABASE_URL=(.+)/)[1].trim()
;(async()=>{
const db=new Client({connectionString:url,ssl:{rejectUnauthorized:false}});await db.connect()
await db.query("set statement_timeout='60s'")
const RE=`text ~ '(^| )ගෙ( |$)'`
console.log('by role:')
console.table((await db.query(`select role,count(*)::int c from course_audio where course_code='eng_for_sin' and ${RE} group by 1 order by c desc`)).rows)
const ptr=[
 ['course_legos.known_audio_id','course_legos','known_audio_id'],
 ['course_legos.presentation_audio_id','course_legos','presentation_audio_id'],
 ['course_practice_phrases.known_audio_id','course_practice_phrases','known_audio_id'],
 ['course_practice_phrases.presentation_audio_id','course_practice_phrases','presentation_audio_id'],
 ['course_seeds.known_audio_id','course_seeds','known_audio_id'],
]
let reachable=0; const detail=[]
for(const [label,t,c] of ptr){
  const q=await db.query(`select count(*)::int n from ${t} x join course_audio a on a.id::text=x.${c}::text
    where x.course_code='eng_for_sin' and a.course_code='eng_for_sin' and a.${RE}`)
  reachable+=q.rows[0].n; detail.push([label,q.rows[0].n]); console.log(`  ${label.padEnd(48)} ${q.rows[0].n}`)
}
const total=(await db.query(`select count(*)::int c from course_audio where course_code='eng_for_sin' and ${RE}`)).rows[0].c
console.log(`\ntotal course_audio rows with bare ගෙ: ${total}`)
console.log(`of those, reachable through ANY content pointer: ${reachable}`)
console.log(`unreachable (superseded takes / orphans, inert): ${total-reachable}`)
if(reachable){
  const ex=(await db.query(`select l.lego_id, a.text from course_legos l join course_audio a on a.id::text=l.presentation_audio_id::text
    where l.course_code='eng_for_sin' and a.${RE} limit 8`)).rows
  console.log('\nexamples of the reachable ones (presentation — the SIBLING worker\'s scope, NOT mine):')
  for(const e of ex) console.log(' ',e.lego_id,JSON.stringify(e.text.slice(0,70)))
}
// how many of the 454 are the clips I just superseded?
const mine=require('./link-applied-log.json').map(a=>a.old_clip).filter(Boolean)
const m=(await db.query(`select count(*)::int c from course_audio where id=any($1::uuid[]) and ${RE}`,[mine])).rows[0].c
console.log(`\nof the ${total}, ${m} are the 21 clips THIS job just superseded (kept on purpose, make-before-break, now unreferenced)`)
fs.writeFileSync(path.join(__dirname,'residue.json'),JSON.stringify({total,reachable,inert:total-reachable,by_pointer:detail,superseded_by_this_job:m},null,1))
await db.end()})()
