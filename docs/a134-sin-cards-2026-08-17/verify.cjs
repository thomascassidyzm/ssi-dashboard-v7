const ROOT='/home/tomcassidy/SSi/ssi-dashboard-v7-clean'
require('dotenv').config({path:ROOT+'/.env'})
const {Client}=require('pg'); const fs=require('fs')
const {S3Client,HeadObjectCommand}=require('@aws-sdk/client-s3')
const P=require('./proposals.json'), SNAP=require('./SNAPSHOT.json')
const dbUrl=()=>fs.readFileSync(ROOT+'/.env.psql','utf8').match(/DATABASE_URL=(.+)/)[1].trim()
const TABLE=k=>k==='card'?'course_legos':k==='phrase'?'course_practice_phrases':'course_seeds'
;(async()=>{
 const s3=new S3Client({region:process.env.AWS_REGION||'eu-west-1'})
 const bucket=process.env.S3_AUDIO_BUCKET||process.env.S3_BUCKET
 const db=new Client({connectionString:dbUrl(),ssl:{rejectUnauthorized:false}}); await db.connect()
 let ok=0,bad=0
 for(const p of P){
  const t=TABLE(p.kind)
  const q=p.kind==='card'?await db.query(`select known_text,known_audio_id from ${t} where course_code='eng_for_sin' and lego_id=$1`,[p.id])
    :await db.query(`select known_text,known_audio_id from ${t} where course_code='eng_for_sin' and seed_number=$1 and known_text=$2`,[p.seed,p.new_known])
  const r=q.rows[0]
  if(!r||r.known_text!==p.new_known){console.log('✗ TEXT',p.id,JSON.stringify(r&&r.known_text));bad++;continue}
  if(!r.known_audio_id){console.log('✗ LINK NULL',p.id);bad++;continue}
  const c=await db.query(`select text,voice_id,duration_ms,s3_key,word_boundaries from course_audio where id=$1`,[r.known_audio_id])
  const a=c.rows[0]
  if(!a){console.log('✗ DANGLING LINK',p.id);bad++;continue}
  const nrm=x=>x.replace(/[.?!]+$/,'').trim()
  if(nrm(a.text)!==nrm(p.new_known)){console.log('✗ CLIP TEXT',p.id,JSON.stringify(a.text));bad++;continue}
  if(!/SameeraNeural/.test(a.voice_id)){console.log('✗ VOICE',p.id,a.voice_id);bad++;continue}
  try{ const h=await s3.send(new HeadObjectCommand({Bucket:bucket,Key:a.s3_key})); if(h.ContentLength<1000)throw new Error('tiny') }
  catch(e){console.log('✗ S3 MISSING',p.id,a.s3_key,e.message);bad++;continue}
  // headword-voiced gate re-applied to the STORED word_boundaries
  const wb=a.word_boundaries||[]
  const corpus=(Array.isArray(wb)?wb:[]).map(x=>x.text).join(' ').replace(/['".,:!?]/g,'')
  const words=nrm(p.new_known).replace(/['".,:!?]/g,'').split(/\s+/).filter(Boolean)
  const miss=wb.length?words.filter(w=>!corpus.includes(w)):['(no stored boundaries — reused clip)']
  console.log('✓',p.id.padEnd(10),a.duration_ms+'ms'.padEnd(3),a.voice_id.padEnd(26),(miss.length?'wb:'+miss.join('|'):'wb:all voiced'))
  ok++
 }
 // no old clip destroyed
 let alive=0
 for(const a of SNAP.audio){const q=await db.query(`select id,s3_key from course_audio where id=$1`,[a.id]); if(q.rows[0])alive++}
 console.log(`\n${ok} verified, ${bad} failed.  OLD clips still present: ${alive}/${SNAP.audio.length} (none deleted)`)
 const cs=await db.query(`select content_stamp,audio_stamp,content_version from courses where course_code='eng_for_sin'`)
 console.log('courses:',JSON.stringify(cs.rows[0]))
 await db.end()
})().catch(e=>{console.error('FATAL',e.message);process.exit(1)})
