// A-134 late-lego — post-apply verification, as a LEARNER receives it, not just as a DB row.
require('dotenv').config({path:require('path').resolve(__dirname,'../../.env'),quiet:true})
const fs=require('fs'),path=require('path'),crypto=require('crypto'),cp=require('child_process')
const {Client}=require('pg')
const {S3Client,HeadObjectCommand,GetObjectCommand}=require('@aws-sdk/client-s3')
const COURSE='eng_for_sin', H='හැබැයි'
const url=fs.readFileSync(path.resolve(__dirname,'../../.env.psql'),'utf8').match(/DATABASE_URL=(.+)/)[1].trim()
const applied=require('./apply-log2.json')
const renderLog=require('./render-log2.json')
const lbl=r=>r.kind==='seed'?`seed ${r.seed}`:`s${r.seed}L${r.lego_index}p${r.position}`
;(async()=>{
 const bucket=process.env.S3_AUDIO_BUCKET||process.env.S3_BUCKET
 const s3=new S3Client({region:process.env.AWS_REGION||'eu-west-1'})
 const db=new Client({connectionString:url,ssl:{rejectUnauthorized:false}});await db.connect()
 const q=async(s,p)=>(await db.query(s,p)).rows
 let fail=0
 console.log('=== 1. every row: new text stored, linked clip SPEAKS that text ===')
 for(const r of applied){
  const [row]= r.kind==='seed'
   ? await q(`select known_text,known_audio_id,version from course_seeds where course_code=$1 and seed_number=$2`,[COURSE,r.seed])
   : await q(`select known_text,known_audio_id,version from course_practice_phrases where course_code=$1 and seed_number=$2 and lego_index=$3 and position=$4`,[COURSE,r.seed,r.lego_index,r.position])
  const [a]=await q(`select id,text,text_normalized,duration_ms,s3_key,word_boundaries from course_audio where id=$1`,[row.known_audio_id])
  const [{n1}]=await q(`select normalize_text($1::text) n1`,[row.known_text])
  let wb=a&&a.word_boundaries; if(typeof wb==='string'){try{wb=JSON.parse(wb)}catch(e){wb=null}}
  const toks=(wb||[]).map(x=>x.text).join(' ')
  const words=row.known_text.replace(/[.,]/g,'').split(/\s+/).filter(Boolean)
  const missing=words.filter(w=>!toks.includes(w))
  const ok = row.known_text===r.new_text && row.known_audio_id===r.new_clip && a && a.text_normalized===n1 && !missing.length && !row.known_text.includes(H)
  if(!ok)fail++
  console.log(`  ${ok?'PASS':'FAIL'} ${lbl(r).padEnd(14)} clip=${row.known_audio_id.slice(0,8)} normMatch=${a&&a.text_normalized===n1} tokensVoiced=${words.length-missing.length}/${words.length} habayiGone=${!row.known_text.includes(H)} v${row.version}`)
  if(missing.length)console.log(`      MISSING FROM AUDIO: ${JSON.stringify(missing)}`)
 }
 console.log('\n=== 2. S3 objects alive, and bytes served == bytes gated ===')
 for(const j of renderLog){
  const a=applied.find(x=>x.norm===j.norm); if(!a)continue
  const [row]=await q(`select s3_key,duration_ms from course_audio where id=$1`,[a.new_clip])
  const h=await s3.send(new HeadObjectCommand({Bucket:bucket,Key:row.s3_key}))
  // NOTE: an earlier version of this check shelled out to `aws s3 cp`. There is NO aws CLI on
  // this box, so it compared against empty output and reported 15 false MISMATCHes (md5
  // d41d8cd9... is the hash of the empty string). Use the SDK. See latelego-bytecheck.cjs.
  let md5ok='n/a (reused clip — gated on these very bytes)'
  if(!j.reuse){
   const local=crypto.createHash('md5').update(fs.readFileSync(path.join(__dirname,'ship',`clip${j.id}.mp3`))).digest('hex')
   const obj=await s3.send(new GetObjectCommand({Bucket:bucket,Key:row.s3_key}))
   const r2=crypto.createHash('md5').update(Buffer.concat(await obj.Body.toArray())).digest('hex')
   md5ok=(local===r2)?`MATCH ${local.slice(0,12)}`:`MISMATCH local ${local} vs s3 ${r2}`
   if(local!==r2)fail++
  }
  console.log(`  clip${String(j.id).padEnd(2)} ${row.s3_key.slice(9,21)} S3=${h.ContentLength}B ${row.duration_ms}ms  bytes: ${md5ok}`)
 }
 console.log('\n=== 3. habayi is now absent from EVERY row before seed 469 ===')
 for(const [t,tbl] of [['seeds','course_seeds'],['phrases','course_practice_phrases'],['legos','course_legos']]){
  const col = tbl==='course_legos' ? `(known_text||' '||coalesce(components::text,''))` : 'known_text'
  const rows=await q(`select seed_number from ${tbl} where course_code=$1 and ${col} like '%'||$2||'%' and seed_number<469 order by seed_number`,[COURSE,H])
  if(rows.length)fail++
  console.log(`  ${t.padEnd(8)} pre-469 rows still containing habayi: ${rows.length} ${rows.length?'!! '+rows.map(r=>r.seed_number).join(','):'(clean)'}`)
 }
 const after=await q(`select count(*) n from course_practice_phrases where course_code=$1 and known_text like '%'||$2||'%' and seed_number>=469`,[COURSE,H])
 console.log(`  at/after 469 (intentionally untouched): ${after[0].n} phrase rows`)
 console.log('\n=== 4. cache invalidation + old clips preserved ===')
 const [c]=await q(`select content_stamp,audio_stamp,content_version from courses where course_code=$1`,[COURSE])
 console.log(`  content_stamp=${c.content_stamp}  audio_stamp=${c.audio_stamp}  content_version=${c.content_version}`)
 const olds=[...new Set(applied.map(r=>r.cur_clip))]
 const alive=await q(`select count(*) n from course_audio where id = any($1::uuid[])`,[olds])
 console.log(`  old clips still present (NOT deleted): ${alive[0].n}/${olds.length}`)
 const orphanLinks=await q(`select count(*) n from course_seeds where course_code=$1 and known_audio_id = any($2::uuid[])`,[COURSE,olds])
 const orphanLinks2=await q(`select count(*) n from course_practice_phrases where course_code=$1 and known_audio_id = any($2::uuid[])`,[COURSE,olds])
 console.log(`  rows still pointing at an old clip: ${+orphanLinks[0].n + +orphanLinks2[0].n} (expect 0)`)
 console.log(`\n${fail?'*** '+fail+' FAILURES ***':'ALL POST-APPLY CHECKS PASS'}`)
 await db.end()
})().catch(e=>{console.error('FATAL',e.message);process.exit(1)})
