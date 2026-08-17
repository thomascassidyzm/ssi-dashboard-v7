// A-134 late-lego — apply the 18-row eng_for_sin repair. DRY RUN unless --apply.
//
// SCOPE was expanded after refuter #870 ruled DO-NOT-SHIP on a seed-only edit: 5 seed prompts
// + all 12 pre-469 HABAYI drill phrases + seed 230's hapax spelling = 18 rows, 14 clips.
//
// MAKE-BEFORE-BREAK (docs/architecture/AUDIO_PIPELINE_ARCHITECTURE.md §6b):
//   1. render + gate everything            — render-log2.json, 7 gates, done before this runs
//   2. verify each new clip alive+correct  — gates on the real bytes; postverify re-checks live
//   3. upload, insert, repoint             — HERE. All 14 clips inserted and ALL 18 links moved
//      inside ONE transaction, so the course is never half-swapped.
//   4. delete old clips                    — NOT DONE. Old rows are the only evidence of what
//      learners heard, and deleting generated assets needs its own approval.
//
// TRIGGERS, read live from pg_trigger/pg_proc rather than assumed:
//  * course_seeds has NO nulling trigger. A seed text edit leaves known_audio_id on the OLD clip,
//    still speaking HABAYI — silent divergence. The seed repoint MUST be explicit.
//  * course_practice_phrases DOES carry trg_null_phrase_audio_on_text_change, so a phrase text
//    edit nulls its own link. We set known_text and known_audio_id in the SAME statement and
//    re-assert the link afterwards, then postverify, so a nulled link cannot survive the txn.
//  * text_normalized is filled by trg_course_audio_normalize; the insert does not set it.
//  * SHARED CLIPS: four seed/phrase pairs share one text_normalized. One clip, two links each.
require('dotenv').config({path:require('path').resolve(__dirname,'../../.env'),quiet:true})
const fs=require('fs'),path=require('path'),crypto=require('crypto');const {Client}=require('pg')
const {S3Client,PutObjectCommand,HeadObjectCommand}=require('@aws-sdk/client-s3')
const APPLY=process.argv.includes('--apply')
const COURSE='eng_for_sin', VOICE='azure_si-LK-SameeraNeural'
const url=fs.readFileSync(path.resolve(__dirname,'../../.env.psql'),'utf8').match(/DATABASE_URL=(.+)/)[1].trim()
const renderLog=require('./render-log2.json')
const state=require('./plan-state.json')
const lbl=r=>r.kind==='seed'?`seed ${r.seed}`:`s${r.seed}L${r.lego_index}p${r.position}`
;(async()=>{
 const bucket=process.env.S3_AUDIO_BUCKET||process.env.S3_BUCKET
 const s3=new S3Client({region:process.env.AWS_REGION||'eu-west-1'})
 const db=new Client({connectionString:url,ssl:{rejectUnauthorized:false}});await db.connect()
 const log=[]
 try{
  // ---- 0. every clip must have a passing take, and match the text we plan to store ----
  for(const j of renderLog){
    if(j.reuse) continue   // reused clip: already live, gated on the real S3 bytes (gate-existing.cjs)
    if(!j.shipped) throw new Error(`clip${j.id}: no passing take — refusing to apply anything`)
    fs.accessSync(path.join(__dirname,'ship',`clip${j.id}.mp3`))
  }
  // ---- 1. DRIFT GUARD on all 18 rows, before a single byte is uploaded ----
  for(const r of state){
   const [cur]= r.kind==='seed'
    ? (await db.query(`select known_text,known_audio_id from course_seeds where course_code=$1 and seed_number=$2`,[COURSE,r.seed])).rows
    : (await db.query(`select known_text,known_audio_id from course_practice_phrases where course_code=$1 and seed_number=$2 and lego_index=$3 and position=$4`,[COURSE,r.seed,r.lego_index,r.position])).rows
   if(!cur) throw new Error(`${lbl(r)}: row not found`)
   if(cur.known_text!==r.old_text) throw new Error(`${lbl(r)}: known_text DRIFTED -> ${JSON.stringify(cur.known_text)}`)
   if(cur.known_audio_id!==r.cur_clip) throw new Error(`${lbl(r)}: known_audio_id DRIFTED -> ${cur.known_audio_id}`)
  }
  console.log(`drift guard: all ${state.length} rows unchanged since preflight`)
  // ---- 2. mint ids, upload bytes (outside the txn: S3 is not transactional) ----
  const clipFor=new Map()   // norm -> {id,key,ms,bytes,tokens}
  for(const j of renderLog){
    if(j.reuse){ clipFor.set(j.norm,{id:j.reuse,reused:true}); console.log(`clip${j.id}: REUSING existing verified clip ${j.reuse} (no upload, no insert)`); continue }
    const id=crypto.randomUUID(), key=`mastered/${id.toUpperCase()}.mp3`
    const buf=fs.readFileSync(path.join(__dirname,'ship',`clip${j.id}.mp3`))
    clipFor.set(j.norm,{id,key,ms:j.shipped.ms,bytes:buf.length,tokens:j.shipped.word_boundary_tokens,text:j.text,buf})
    if(!APPLY) continue
    await s3.send(new PutObjectCommand({Bucket:bucket,Key:key,Body:buf,ContentType:'audio/mpeg'}))
    const h=await s3.send(new HeadObjectCommand({Bucket:bucket,Key:key}))
    if(h.ContentLength!==buf.length) throw new Error(`clip${j.id}: uploaded ${h.ContentLength}B != ${buf.length}B`)
    console.log(`uploaded clip${j.id} -> ${key} (${buf.length}B)`)
  }
  if(!APPLY){
   for(const r of state){const c=clipFor.get(r.norm)
    log.push({...r,new_clip:c.id,s3_key:c.key||null,reused:!!c.reused,applied:false})
    console.log(`DRY ${lbl(r).padEnd(14)} text swap + link ${r.cur_clip} -> ${c.id}${c.reused?' (REUSE, verified on real S3 bytes)':''}`)}
   const shared={};for(const r of state)(shared[r.norm]=shared[r.norm]||[]).push(lbl(r))
   console.log('\nshared clips:');for(const [n,v] of Object.entries(shared))if(v.length>1)console.log(`  ${v.join(' + ')}`)
   return
  }
  // ---- 3. ONE transaction: insert 14 clips, move all 18 links ----
  await db.query('BEGIN')
  for(const [norm,c] of clipFor){
    if(c.reused) continue
    await db.query(`insert into course_audio (id,course_code,role,voice_id,text,duration_ms,s3_key,language,origin,word_boundaries,file_size_bytes)
      values ($1,$2,'known',$3,$4,$5,$6,'sin','tts',$7,$8)`,
      [c.id,COURSE,VOICE,c.text,c.ms,c.key,JSON.stringify(c.tokens.map(t=>({text:t}))),c.bytes])
  }
  console.log(`inserted ${[...clipFor.values()].filter(c=>!c.reused).length} course_audio rows (${[...clipFor.values()].filter(c=>c.reused).length} reused)`)
  for(const r of state){
   const c=clipFor.get(r.norm)
   const upd = r.kind==='seed'
    ? await db.query(`update course_seeds set known_text=$1, known_audio_id=$2
        where course_code=$3 and seed_number=$4 and known_text=$5 and known_audio_id=$6`,
        [r.new_text,c.id,COURSE,r.seed,r.old_text,r.cur_clip])
    : await db.query(`update course_practice_phrases set known_text=$1, known_audio_id=$2
        where course_code=$3 and seed_number=$4 and lego_index=$5 and position=$6 and known_text=$7 and known_audio_id=$8`,
        [r.new_text,c.id,COURSE,r.seed,r.lego_index,r.position,r.old_text,r.cur_clip])
   if(upd.rowCount!==1){ await db.query('ROLLBACK'); throw new Error(`${lbl(r)}: update matched ${upd.rowCount} rows — ROLLED BACK, nothing applied`) }
   log.push({...r,new_clip:c.id,s3_key:c.key||null,reused:!!c.reused,applied:true})
  }
  // ---- 4. the phrase trigger nulls known_audio_id on a text change. Re-assert, in-txn. ----
  for(const r of state.filter(x=>x.kind==='phrase')){
   const c=clipFor.get(r.norm)
   const [chk]=(await db.query(`select known_audio_id from course_practice_phrases where course_code=$1 and seed_number=$2 and lego_index=$3 and position=$4`,[COURSE,r.seed,r.lego_index,r.position])).rows
   if(chk.known_audio_id!==c.id){
     const f=await db.query(`update course_practice_phrases set known_audio_id=$1 where course_code=$2 and seed_number=$3 and lego_index=$4 and position=$5`,[c.id,COURSE,r.seed,r.lego_index,r.position])
     console.log(`  re-asserted link on ${lbl(r)} (trigger had set it to ${chk.known_audio_id}), ${f.rowCount} row`)
   }
  }
  // ---- 5. in-txn assertion: every one of the 18 rows now reads new text AND the new clip ----
  for(const r of state){
   const c=clipFor.get(r.norm)
   const [v]= r.kind==='seed'
    ? (await db.query(`select known_text,known_audio_id from course_seeds where course_code=$1 and seed_number=$2`,[COURSE,r.seed])).rows
    : (await db.query(`select known_text,known_audio_id from course_practice_phrases where course_code=$1 and seed_number=$2 and lego_index=$3 and position=$4`,[COURSE,r.seed,r.lego_index,r.position])).rows
   if(v.known_text!==r.new_text||v.known_audio_id!==c.id){
     await db.query('ROLLBACK'); throw new Error(`${lbl(r)}: post-update assertion FAILED (text ok=${v.known_text===r.new_text}, link ok=${v.known_audio_id===c.id}) — ROLLED BACK`)
   }
  }
  await db.query('COMMIT')
  console.log(`\nCOMMITTED — ${state.length} rows on ${clipFor.size} new clips`)
 } finally {
  const out=path.join(__dirname,APPLY?'apply-log2.json':'dryrun-log2.json')
  fs.writeFileSync(out,JSON.stringify(log.map(({buf,...x})=>x),null,1))
  console.log(`${APPLY?'APPLIED':'DRY RUN'} — ${log.length}/${state.length} rows, log ${out}`)
  await db.end()
 }
})().catch(e=>{console.error('ABORT:',e.message);process.exit(1)})
