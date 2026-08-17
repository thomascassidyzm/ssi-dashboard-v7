require('dotenv').config({path:require('path').resolve(__dirname,'../../.env'),quiet:true})
const fs=require('fs'),path=require('path');const {Client}=require('pg')
const {S3Client,GetObjectCommand,HeadObjectCommand}=require('@aws-sdk/client-s3')
const {runGates}=require('./gates.cjs')
const url=fs.readFileSync(path.resolve(__dirname,'../../.env.psql'),'utf8').match(/DATABASE_URL=(.+)/)[1].trim()
const DIR=path.join(__dirname,'existing');fs.mkdirSync(DIR,{recursive:true})
const IDS={178:'c349d360-f4fc-42e5-9315-7e58d1a329d5'}
;(async()=>{
 const bucket=process.env.S3_AUDIO_BUCKET||process.env.S3_BUCKET
 console.log('bucket:',bucket,'region:',process.env.AWS_REGION||'eu-west-1')
 const s3=new S3Client({region:process.env.AWS_REGION||'eu-west-1'})
 const db=new Client({connectionString:url,ssl:{rejectUnauthorized:false}});await db.connect()
 const out=[]
 for(const [seed,id] of Object.entries(IDS)){
   const r=await db.query(`select * from course_audio where id=$1`,[id]);const x=r.rows[0]
   const head=await s3.send(new HeadObjectCommand({Bucket:bucket,Key:x.s3_key}))
   const obj=await s3.send(new GetObjectCommand({Bucket:bucket,Key:x.s3_key}))
   const buf=Buffer.concat(await obj.Body.toArray())
   const f=path.join(DIR,`seed${seed}-existing.mp3`);fs.writeFileSync(f,buf)
   const wb=typeof x.word_boundaries==='string'?JSON.parse(x.word_boundaries):x.word_boundaries
   const g=runGates(x.text,wb,x.duration_ms,f)
   console.log(`\nseed ${seed} clip ${id}`)
   console.log(`  S3 ALIVE: ${head.ContentLength}B  (db file_size_bytes=${x.file_size_bytes})`)
   console.log(`  gates: ${g.fail.length?'FAIL '+g.fail.join('; '):'PASS all 7'}`)
   console.log(`  ms=${x.duration_ms} ffprobe=${g.ffprobe_ms} z=${g.z.toFixed(2)} tail=${g.tail?.toFixed(1)}dB tokens=${g.tokens} headword=${g.gate3_headword_voiced} fulltext=${g.gate7_full_text_voiced}`)
   out.push({seed,id,bytes:head.ContentLength,...g})
 }
 fs.writeFileSync(path.join(__dirname,'existing-gate-log.json'),JSON.stringify(out,null,1))
 await db.end()
})().catch(e=>{console.error('FATAL',e.message);process.exit(1)})
