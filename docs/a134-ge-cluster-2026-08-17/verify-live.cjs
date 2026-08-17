// Verify the 24 the way a LEARNER receives them: the DB row, then the served bytes from
// the learning app's public audio route (PATH SEGMENT, not ?id=), then a real decode.
require('dotenv').config({path:require('path').resolve(__dirname,'../../.env')})
const fs=require('fs'),path=require('path'),cp=require('child_process'),{Client}=require('pg')
const url=fs.readFileSync(path.resolve(__dirname,'../../.env.psql'),'utf8').match(/DATABASE_URL=(.+)/)[1].trim()
const BASE='https://ssi-learning-app.vercel.app/api/audio'
const {bareGeTokens}=require('./gates.cjs')
;(async()=>{
const db=new Client({connectionString:url,ssl:{rejectUnauthorized:false}});await db.connect()
await db.query("set statement_timeout='60s'")
const applied=require('./link-applied-log.json')
const tmp=fs.mkdtempSync('/tmp/gever-')
const out=[]; let ok=0
for(const r of applied){
  const short=r.id.split(':')[1]
  const row=(await db.query(`select p.known_text, p.known_audio_id::text kaid, p.target_text,
      a.text atext, a.duration_ms, a.s3_key, a.role, a.language, a.voice_id, a.origin, a.word_boundaries
    from course_practice_phrases p left join course_audio a on a.id=p.known_audio_id where p.id=$1`,[r.id])).rows[0]
  const res={id:r.id}
  res.text_is_repaired = row.known_text===r.new_text
  res.linked_to_new    = row.kaid===r.new_clip
  res.clip_text_matches= row.atext===r.new_text
  res.no_bare_ge_in_text = !/(^| )ගෙ( |$)/.test(row.known_text)
  res.no_bare_ge_voiced  = bareGeTokens(row.word_boundaries).length===0
  // served bytes
  const f=path.join(tmp,short+'.mp3')
  const code=cp.execSync(`curl -s -o ${f} -w '%{http_code}' -L '${BASE}/${row.kaid}'`,{shell:'/bin/bash'}).toString().trim()
  res.http=code; res.bytes=fs.existsSync(f)?fs.statSync(f).size:0
  if(code==='200'&&res.bytes>0){
    try{
      const d=cp.execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 ${f}`,{shell:'/bin/bash'}).toString().trim()
      res.decoded_ms=Math.round(parseFloat(d)*1000)
      res.duration_ms=row.duration_ms
      res.duration_match=Math.abs(res.decoded_ms-row.duration_ms)<=60
    }catch(e){res.decode_error=e.message}
  }
  res.all_ok = res.text_is_repaired&&res.linked_to_new&&res.clip_text_matches&&
               res.no_bare_ge_in_text&&res.no_bare_ge_voiced&&res.http==='200'&&res.duration_match===true
  if(res.all_ok) ok++
  out.push(res)
  console.log(`${short.padEnd(12)} http=${res.http} ${res.bytes}B decoded=${res.decoded_ms}ms vs ${res.duration_ms}ms  text=${res.text_is_repaired?'ok':'BAD'} link=${res.linked_to_new?'ok':'BAD'} bareGe=${res.no_bare_ge_in_text&&res.no_bare_ge_voiced?'none':'PRESENT'} ${res.all_ok?'PASS':'FAIL'}`)
}
// course-wide: is any bare ගෙ left anywhere a learner can reach?
const left=(await db.query(`select count(*) c from course_practice_phrases where course_code='eng_for_sin' and known_text ~ '(^| )ගෙ( |$)'`)).rows[0].c
const leftLego=(await db.query(`select count(*) c from course_legos where course_code='eng_for_sin' and known_text ~ '(^| )ගෙ( |$)'`)).rows[0].c
const leftAudio=(await db.query(`select count(*) c from course_audio a join course_practice_phrases p on p.known_audio_id=a.id
   where a.course_code='eng_for_sin' and a.text ~ '(^| )ගෙ( |$)'`)).rows[0].c
const silent=(await db.query(`select count(*) c from course_practice_phrases where course_code='eng_for_sin' and seed_number in (60,154,155,156,158) and known_audio_id is null`)).rows[0].c
const stamp=(await db.query(`select content_stamp,audio_stamp from courses where course_code='eng_for_sin'`)).rows[0]
console.log(`\n${ok}/24 fully verified live`)
console.log(`bare ගෙ left in phrases: ${left}   in legos: ${leftLego}   voiced via a linked clip: ${leftAudio}`)
console.log(`silent phrases left in seeds 60/154/155/156/158: ${silent}`)
console.log(`content_stamp: ${stamp.content_stamp}  audio_stamp: ${stamp.audio_stamp}`)
fs.writeFileSync(path.join(__dirname,'verify-live.json'),JSON.stringify({rows:out,ok,bare_ge_phrases_left:left,bare_ge_legos_left:leftLego,bare_ge_voiced_left:leftAudio,silent_left:silent,stamp},null,1))
await db.end()})()
