require('dotenv').config({ path: '.env' })
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3')
const fs=require('fs'), {execFileSync}=require('child_process')
const s3=new S3Client({region:process.env.AWS_REGION||'eu-west-2'})
const keys=process.argv.slice(2)
;(async()=>{
for(const k of keys){
  const o=await s3.send(new GetObjectCommand({Bucket:process.env.S3_AUDIO_BUCKET||process.env.S3_BUCKET,Key:k}))
  const buf=Buffer.concat(await o.Body.toArray())
  const f=`${process.env.CS_SCRATCH}/${k.split('/').pop()}`
  fs.writeFileSync(f,buf)
  const dur=parseFloat(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',f]).toString())
  // RMS of last 400ms vs peak
  const out=execFileSync('ffprobe',['-v','error','-f','lavfi','-i',`amovie=${f},atrim=start=${Math.max(0,dur-0.4)},astats=metadata=1:reset=0`,'-show_entries','frame_tags=lavfi.astats.Overall.Peak_level','-of','csv=p=0'],{maxBuffer:1e8}).toString().trim().split('\n')
  const tailPeak=Math.max(...out.map(Number).filter(n=>isFinite(n)))
  console.log(k.split('/').pop(), 'dur', dur.toFixed(2), 'tail400ms peak dB', tailPeak.toFixed(1))
}
})().catch(e=>{console.error('ERR',e.message);process.exit(1)})
