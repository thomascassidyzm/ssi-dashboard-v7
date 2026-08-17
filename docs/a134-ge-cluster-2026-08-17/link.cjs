// A-134 bare-ගෙ cluster — apply the 24 repairs: text + audio, make-before-break.
//
// ORDER MATTERS, and it is dictated by two triggers:
//   trg_null_phrase_audio_on_text_change  BEFORE UPDATE on course_practice_phrases
//        -> editing known_text NULLS known_audio_id. A text-only fix is never text-only.
//   audio_autolink                        AFTER INSERT on course_audio
//        -> a role='known' insert fills any phrase whose known_audio_id IS NULL and whose
//           normalize_text(known_text) equals the new clip's text_normalized.
//
// So per row, inside ONE transaction:
//   1. UPDATE known_text            (trigger nulls the link — the clip itself is untouched)
//   2. INSERT the new course_audio  (autolink fills the link back in)
//   3. read the link back; force it only if the trigger did not; assert the final value
// The S3 bytes go up BEFORE the transaction opens, so a clip is never referenced before
// it exists. THE OLD CLIP IS NEVER DELETED — it stays live on S3 and in course_audio,
// speaking text the course no longer teaches. Deletion is a separate, approved decision.
require('dotenv').config({path:require('path').resolve(__dirname,'../../.env')})
const fs=require('fs'),path=require('path'),crypto=require('crypto'),{Client}=require('pg')
const {S3Client,PutObjectCommand,HeadObjectCommand}=require('@aws-sdk/client-s3')
const APPLY=process.argv.includes('--apply')
const COURSE='eng_for_sin', VOICE='azure_si-LK-SameeraNeural', LANG='sin', ROLE='known', ORIGIN='tts'
const url=fs.readFileSync(path.resolve(__dirname,'../../.env.psql'),'utf8').match(/DATABASE_URL=(.+)/)[1].trim()
async function main(){
  const bucket=process.env.S3_AUDIO_BUCKET||process.env.S3_BUCKET
  const s3=new S3Client({region:process.env.AWS_REGION||'eu-west-1'})
  const db=new Client({connectionString:url,ssl:{rejectUnauthorized:false}});await db.connect()
  await db.query("set statement_timeout='60s'")
  const ship=require('./ship-log.json'), log=[]
  try{
    for(const row of ship){
      const short=row.id.split(':')[1]
      if(!row.file) throw new Error(`${short}: no shipping take — refusing to touch the row`)
      // drift check: the row must still say what we measured
      const cur=(await db.query(`select known_text, known_audio_id::text kaid from course_practice_phrases where id=$1`,[row.id])).rows[0]
      if(!cur) throw new Error(`${short}: row vanished`)
      if(cur.known_text!==row.old_text) throw new Error(`${short}: known_text drifted under us — expected ${JSON.stringify(row.old_text)}, found ${JSON.stringify(cur.known_text)}`)
      if((cur.kaid||null)!==(row.old_clip||null)) throw new Error(`${short}: known_audio_id drifted — expected ${row.old_clip}, found ${cur.kaid}`)
      const newId=crypto.randomUUID(), key=`mastered/${newId.toUpperCase()}.mp3`
      const bytes=fs.readFileSync(row.file)
      const plan={id:row.id,seed:row.seed,old_text:row.old_text,new_text:row.text,eng:row.eng,
        confidence:row.confidence,was_silent:row.was_silent,old_clip:row.old_clip,
        new_clip:newId,s3_key:key,ms:row.ms,bytes:bytes.length,z:row.z,tail:row.tail}
      if(!APPLY){log.push({...plan,applied:false});console.log('DRY ',short,'->',newId);continue}
      // 1. bytes first — purely additive
      await s3.send(new PutObjectCommand({Bucket:bucket,Key:key,Body:bytes,ContentType:'audio/mpeg'}))
      const head=await s3.send(new HeadObjectCommand({Bucket:bucket,Key:key}))
      if(head.ContentLength!==bytes.length) throw new Error(`${short}: uploaded ${head.ContentLength}B, expected ${bytes.length}B`)
      // 2. text + row + link, atomically
      await db.query('BEGIN')
      try{
        const u=await db.query(`update course_practice_phrases set known_text=$1 where id=$2 and known_text=$3`,[row.text,row.id,row.old_text])
        if(u.rowCount!==1) throw new Error(`${short}: text update matched ${u.rowCount} rows`)
        const nulled=(await db.query(`select known_audio_id::text v from course_practice_phrases where id=$1`,[row.id])).rows[0].v
        plan.link_nulled_by_trigger = nulled===null
        await db.query(
          `insert into course_audio (id,course_code,role,voice_id,text,duration_ms,s3_key,language,origin,word_boundaries)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [newId,COURSE,ROLE,VOICE,row.text,row.ms,key,LANG,ORIGIN,JSON.stringify(row.word_boundaries)])
        let after=(await db.query(`select known_audio_id::text v from course_practice_phrases where id=$1`,[row.id])).rows[0].v
        if(after===null){
          const f=await db.query(`update course_practice_phrases set known_audio_id=$1 where id=$2 and known_audio_id is null`,[newId,row.id])
          if(f.rowCount!==1) throw new Error(`${short}: forced repoint matched ${f.rowCount} rows`)
          plan.linked_by='explicit'
        } else if(after===newId){ plan.linked_by='autolink_trigger' }
        else throw new Error(`${short}: link went to ${after}, not ${newId}`)
        const fin=(await db.query(`select known_text,known_audio_id::text v from course_practice_phrases where id=$1`,[row.id])).rows[0]
        if(fin.v!==newId) throw new Error(`${short}: final link is ${fin.v}`)
        if(fin.known_text!==row.text) throw new Error(`${short}: final text is ${JSON.stringify(fin.known_text)}`)
        await db.query('COMMIT')
      }catch(e){await db.query('ROLLBACK');throw e}
      log.push({...plan,applied:true})
      console.log('APPLIED',short,'->',newId,`(${plan.linked_by})`)
    }
  } finally {
    const out=path.join(__dirname, APPLY?'link-applied-log.json':'link-dryrun-log.json')
    fs.writeFileSync(out,JSON.stringify(log,null,1))
    console.log(`\n${APPLY?'APPLIED':'DRY RUN'} — ${log.length}/24, log at ${path.basename(out)}`)
    await db.end()
  }
}
main().catch(e=>{console.error('ABORT:',e.message);process.exit(1)})
