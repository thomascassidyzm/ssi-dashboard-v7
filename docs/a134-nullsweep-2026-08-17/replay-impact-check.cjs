require('dotenv').config({path:__dirname+'/../.env'})
const fs=require('fs');const {Client}=require('pg')
const {normalizeForContainment}=require('../../../services/course-builder/lib/text-normalization.cjs')
const url=fs.readFileSync(__dirname+'/../.env.psql','utf8').match(/DATABASE_URL=(.+)/)[1].trim()
const words=t=>normalizeForContainment(t||'').split(' ').filter(Boolean)
;(async()=>{
const db=new Client({connectionString:url,ssl:{rejectUnauthorized:false}});await db.connect()
await db.query("set statement_timeout='180s'")
// snapshot: where each form is first TAUGHT (lego), ordered by seed
const legos=(await db.query("select seed_number,known_text from course_legos where course_code='eng_for_sin' order by seed_number")).rows
const taughtAt=new Map()
for(const l of legos) for(const w of words(l.known_text)) if(!taughtAt.has(w)) taughtAt.set(w,l.seed_number)

// today's applied edits, from the audit log (old_row holds the pre-edit values)
const aud=(await db.query(`select table_name, primary_key, old_row, changed_at from content_audit_log
  where changed_at > timestamptz '2026-08-17 09:00:00Z' and table_name in ('course_seeds','course_legos','course_practice_phrases')
  order by changed_at`)).rows
console.log('audit rows today:',aud.length)

const findings=[]
for(const a of aud){
  const old=typeof a.old_row==='string'?JSON.parse(a.old_row):a.old_row
  if(!old||old.course_code!=='eng_for_sin') continue
  let cur,seedNum
  if(a.table_name==='course_seeds'){
    cur=(await db.query("select seed_number,known_text from course_seeds where course_code='eng_for_sin' and seed_number=$1",[old.seed_number])).rows[0]
    seedNum=old.seed_number
  } else if(a.table_name==='course_legos'){
    cur=(await db.query("select seed_number,known_text from course_legos where course_code='eng_for_sin' and lego_id=$1",[old.lego_id])).rows[0]
    seedNum=cur&&cur.seed_number
  } else {
    cur=(await db.query("select seed_number,known_text from course_practice_phrases where id=$1",[old.id])).rows[0]
    seedNum=cur&&cur.seed_number
  }
  if(!cur||cur.known_text===old.known_text) continue
  const before=new Set(words(old.known_text))
  const added=words(cur.known_text).filter(w=>!before.has(w))
  for(const form of new Set(added)){
    const t=taughtAt.has(form)?taughtAt.get(form):null
    if(seedNum!=null&&(t==null||t>seedNum)){
      findings.push({table:a.table_name,seed:seedNum,form,taught_at_seed:t,
        row: a.table_name==='course_legos'?old.lego_id:(a.table_name==='course_practice_phrases'?old.id:'seed'+seedNum),
        new_text:cur.known_text})
    }
  }
}
// dedupe on (row, form)
const seen=new Set(),uniq=[]
for(const f of findings){const k=f.row+'|'+f.form;if(!seen.has(k)){seen.add(k);uniq.push(f)}}
console.log('RECONSIDER findings (uses-untaught-vocabulary):',uniq.length)
uniq.forEach(f=>console.log(`  ${f.table.replace('course_','')} ${f.row} seed${f.seed}  "${f.form}"  taught_at=${f.taught_at_seed??'NEVER'}`))
fs.writeFileSync(__dirname+'/reconsider19.json',JSON.stringify(uniq,null,1))
await db.end()})()
