require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const { execFileSync } = require('child_process')
const fs=require('fs'),os=require('os'),path=require('path')
const veracity = require('../../services/audio-veracity.cjs')
const BUCKET=process.env.S3_BUCKET, REGION=process.env.AWS_REGION||'eu-west-1'
const d=JSON.parse(fs.readFileSync(__dirname+'/verify-all.json','utf8'))
const bad=d.summary.failures
const seen=new Set(), uniq=[]
for(const f of bad){ if(seen.has(f.audio_id))continue; seen.add(f.audio_id); uniq.push(f) }
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'triage-'))
;(async()=>{
 console.log(uniq.length,'distinct audio rows behind',bad.length,'flagged slots\n')
 for(const f of uniq){
  const dest=path.join(tmp,f.audio_id+'.mp3')
  execFileSync('curl',['-s','-f','-o',dest,`https://${BUCKET}.s3.${REGION}.amazonaws.com/${f.s3_key}`])
  const v=await veracity.checkAudioVeracity(dest,f.text,'eng')
  const courses=bad.filter(x=>x.audio_id===f.audio_id).map(x=>x.course).join(',')
  console.log('AUDIO',f.audio_id,'|',f.seconds+'s |',courses)
  console.log('  EXPECT:',JSON.stringify(f.text))
  console.log('  DECODE:',JSON.stringify(v.decode))
  console.log('  ->',v.pass?'pass':'FAIL',v.reason,'cer',v.cer,'\n')
 }
 fs.rmSync(tmp,{recursive:true,force:true})
})().catch(e=>{console.error(e.stack);process.exit(1)})
