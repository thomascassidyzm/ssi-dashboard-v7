// A-134 cards — MAKE-BEFORE-BREAK apply. Per row: upload new bytes to their permanent key,
// then in ONE transaction insert the course_audio row, patch the text, and set known_audio_id
// LAST (a text UPDATE fires the null-audio trigger, so the link is written after the text).
// No old clip is deleted, ever. Drift-checked against the pre-write snapshot.
const ROOT='/home/tomcassidy/SSi/ssi-dashboard-v7-clean'
require('dotenv').config({path:ROOT+'/.env'})
const fs=require('fs'),path=require('path'),crypto=require('crypto')
const {Client}=require('pg')
const {S3Client,PutObjectCommand,HeadObjectCommand}=require('@aws-sdk/client-s3')
const APPLY=process.argv.includes('--apply')
const COURSE='eng_for_sin',VOICE='azure_si-LK-SameeraNeural',LANG='sin',ORIGIN='tts'
const REND=require('./rendered.json'), SNAP=require('./SNAPSHOT.json')
const REUSE={S0369L02:'ebb638e0',S0370L02:'9add3459',S0453L02:'992d2ef0',S0245L02:'6d622578'}
// card-level extra field changes (components arrays that carried the corruption)
const COMPONENTS={
 S0369L02:[{known:'අශ්වයො',target:'horses'},{known:'කිහිපයක්',target:'several'}],
 S0370L02:[{known:'මම',target:'I'},{known:'දැක්කේ නෑ',target:"didn't see"}],
 S0453L02:[{known:'ඒ අය',target:'they'},{known:'ඒ අයව දැක්කා',target:'saw them'}],
 S0245L02:[{known:'කෙටි',target:'short'},{known:'කාලේ',target:'time'}],
}
const dbUrl=()=>fs.readFileSync(ROOT+'/.env.psql','utf8').match(/DATABASE_URL=(.+)/)[1].trim()
const P=require('./proposals.json')
const TABLE=k=>k==='card'?'course_legos':k==='phrase'?'course_practice_phrases':'course_seeds'
;(async()=>{
  const bucket=process.env.S3_AUDIO_BUCKET||process.env.S3_BUCKET
  const s3=new S3Client({region:process.env.AWS_REGION||'eu-west-1'})
  const db=new Client({connectionString:dbUrl(),ssl:{rejectUnauthorized:false}})
  await db.connect(); const log=[]
  try{
    for(const p of P){
      const tbl=TABLE(p.kind)
      // resolve the clip id to link
      let clipId=null, rendered=REND.find(r=>r.id===p.id&&!r.failed)
      if(!rendered){ // reuse path — resolve the full uuid from the DB by text
        const q=await db.query(`select id from course_audio where course_code=$1 and role='known' and text=$2 and voice_id=$3`,[COURSE,p.new_known,VOICE])
        if(!q.rows[0]) throw new Error(`${p.id}: no rendered take and no reusable clip for ${p.new_known}`)
        clipId=q.rows[0].id
      }
      // locate the row + drift check
      const where = p.kind==='card' ? {sql:`lego_id=$2`,val:p.id}
        : p.kind==='seed' ? {sql:`seed_number=$2`,val:p.seed}
        : {sql:`seed_number=$2 and known_text=$3`,val:p.seed}
      const sel = p.kind==='phrase'
        ? await db.query(`select id,known_text,known_audio_id from ${tbl} where course_code=$1 and seed_number=$2 and known_text=$3`,[COURSE,p.seed,p.old_known])
        : await db.query(`select id,known_text,known_audio_id from ${tbl} where course_code=$1 and ${where.sql}`,[COURSE,where.val])
      if(sel.rows.length!==1) throw new Error(`${p.id}: expected 1 row, got ${sel.rows.length} — drift, aborting`)
      const row=sel.rows[0]
      if(row.known_text!==p.old_known) throw new Error(`${p.id}: known_text has moved (is ${JSON.stringify(row.known_text)}, expected ${JSON.stringify(p.old_known)}) — drift, aborting`)

      const plan={id:p.id,kind:p.kind,table:tbl,row_id:row.id,old_known:p.old_known,new_known:p.new_known,
                  old_clip:row.known_audio_id,mode:rendered?'insert':'reuse'}
      if(!APPLY){ if(rendered) plan.will_render_ms=rendered.durationMs; else plan.reuse_clip=clipId
        log.push(plan); console.log('DRY  ',p.id.padEnd(10),plan.mode.padEnd(7),JSON.stringify(p.new_known)); continue }

      // A clip is UNIQUE on (course_code,text_normalized,language,role,voice_id): three of these
      // rows normalise to one string, so they must SHARE one clip rather than insert duplicates.
      if(rendered){
        const nrm=p.new_known.replace(/[.?!]+$/,'').replace(/\s+/g,' ').trim()
        const dup=await db.query(`select id from course_audio where course_code=$1 and role='known' and language=$2 and voice_id=$3 and text_normalized=$4`,[COURSE,LANG,VOICE,nrm])
        if(dup.rows[0]){ clipId=dup.rows[0].id; rendered=null; plan.mode='share-existing'; plan.shared_clip=clipId }
      }
      if(rendered){ // 1. bytes to their permanent key FIRST
        clipId=crypto.randomUUID()
        const key=`mastered/${clipId.toUpperCase()}.mp3`
        await s3.send(new PutObjectCommand({Bucket:bucket,Key:key,Body:fs.readFileSync(rendered.file),ContentType:'audio/mpeg'}))
        const head=await s3.send(new HeadObjectCommand({Bucket:bucket,Key:key}))
        if(head.ContentLength!==fs.statSync(rendered.file).size) throw new Error(`${p.id}: uploaded size mismatch`)
        plan.new_clip=clipId; plan.s3_key=key; plan.ms=rendered.durationMs
        await db.query('BEGIN')
        try{
          await db.query(`insert into course_audio (id,course_code,${p.kind==='card'?'lego_id,':''}role,voice_id,text,duration_ms,s3_key,language,origin,word_boundaries)
            values ($1,$2,${p.kind==='card'?'$10,':''}'known',$3,$4,$5,$6,$7,$8,$9)`,
            p.kind==='card'?[clipId,COURSE,VOICE,p.new_known,rendered.durationMs,key,LANG,ORIGIN,JSON.stringify(rendered.wordBoundaries),p.id]
                           :[clipId,COURSE,VOICE,p.new_known,rendered.durationMs,key,LANG,ORIGIN,JSON.stringify(rendered.wordBoundaries)])
          await patch(db,tbl,row.id,p)
          await db.query(`update ${tbl} set known_audio_id=$1 where id=$2`,[clipId,row.id])
          await db.query('COMMIT')
        }catch(e){await db.query('ROLLBACK');throw e}
      } else {
        plan.new_clip=clipId
        await db.query('BEGIN')
        try{ await patch(db,tbl,row.id,p)
          await db.query(`update ${tbl} set known_audio_id=$1 where id=$2`,[clipId,row.id])
          await db.query('COMMIT')
        }catch(e){await db.query('ROLLBACK');throw e}
      }
      log.push({...plan,applied:true}); console.log('APPLIED',p.id.padEnd(10),plan.mode.padEnd(7),'->',clipId.slice(0,8))
    }
  } finally {
    const out=path.join(__dirname,APPLY?'applied-log.json':'dryrun-log.json')
    fs.writeFileSync(out,JSON.stringify(log,null,1))
    console.log(`\n${APPLY?'APPLIED':'DRY RUN'} — ${log.length}/${P.length} rows, log at ${out}`)
    await db.end()
  }
})().catch(e=>{console.error('ABORT:',e.message);process.exit(1)})

async function patch(db,tbl,rowId,p){
  if(p.kind==='card'){
    const comp=COMPONENTS[p.id]
    if(comp) await db.query(`update ${tbl} set known_text=$1, components=$2 where id=$3`,[p.new_known,JSON.stringify(comp),rowId])
    else await db.query(`update ${tbl} set known_text=$1 where id=$2`,[p.new_known,rowId])
  } else {
    await db.query(`update ${tbl} set known_text=$1 where id=$2`,[p.new_known,rowId])
  }
}
