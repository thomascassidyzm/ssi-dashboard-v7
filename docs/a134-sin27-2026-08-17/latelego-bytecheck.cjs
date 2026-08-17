// Byte-identity of what the LEARNER gets vs what passed the gates. Uses the S3 SDK, not the
// aws CLI (absent on this box — an earlier probe using it silently compared against empty output).
require('dotenv').config({path:require('path').resolve(__dirname,'../../.env'),quiet:true})
const fs=require('fs'),path=require('path'),crypto=require('crypto');const {Client}=require('pg')
const {S3Client,GetObjectCommand,HeadObjectCommand}=require('@aws-sdk/client-s3')
const COURSE='eng_for_sin'
const url=fs.readFileSync(path.resolve(__dirname,'../../.env.psql'),'utf8').match(/DATABASE_URL=(.+)/)[1].trim()
const applied=require('./apply-log2.json'), renderLog=require('./render-log2.json')
;(async()=>{
 const bucket=process.env.S3_AUDIO_BUCKET||process.env.S3_BUCKET
 const s3=new S3Client({region:process.env.AWS_REGION||'eu-west-1'})
 const db=new Client({connectionString:url,ssl:{rejectUnauthorized:false}});await db.connect()
 let fail=0
 for(const j of renderLog){
  const a=applied.find(x=>x.norm===j.norm); if(!a)continue
  const [row]=(await db.query(`select s3_key,duration_ms,file_size_bytes from course_audio where id=$1`,[a.new_clip])).rows
  const obj=await s3.send(new GetObjectCommand({Bucket:bucket,Key:row.s3_key}))
  const s3buf=Buffer.concat(await obj.Body.toArray())
  const s3md5=crypto.createHash('md5').update(s3buf).digest('hex')
  if(j.reuse){ console.log(`  clip${String(j.id).padEnd(2)} REUSED ${a.new_clip.slice(0,8)}  S3 alive ${s3buf.length}B md5 ${s3md5.slice(0,12)} (no local take to compare — gated on these very bytes)`); continue }
  const loc=fs.readFileSync(path.join(__dirname,'ship',`clip${j.id}.mp3`))
  const locmd5=crypto.createHash('md5').update(loc).digest('hex')
  const ok=locmd5===s3md5 && loc.length===s3buf.length
  if(!ok)fail++
  console.log(`  clip${String(j.id).padEnd(2)} ${ok?'MATCH':'MISMATCH'} ${loc.length}B==${s3buf.length}B  md5 ${locmd5.slice(0,12)} ${ok?'==':'!='} ${s3md5.slice(0,12)}`)
 }
 console.log(fail?`\n*** ${fail} byte mismatches ***`:'\nEVERY shipped clip: bytes in S3 are md5-identical to the take that passed the seven gates')
 await db.end()
})().catch(e=>{console.error('FATAL',e.message);process.exit(1)})
