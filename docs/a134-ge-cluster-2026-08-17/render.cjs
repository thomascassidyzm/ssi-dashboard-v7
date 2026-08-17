// A-134 bare-ගෙ cluster — render the 24 repaired phrase KNOWN clips.
//
// Nothing reaches S3 or the database here. This renders on the compressor-free chain
// (667a6e09, cherry-picked onto this branch's base — masterAudio calls
// normalizeAudioClean), gates locally, and keeps EVERY take, pass or fail, in spares/.
// Passing takes land in ship/. MAKE-BEFORE-BREAK: link.cjs only runs after this.
process.env.PHASE8_NO_LISTEN='1'
require('dotenv').config({path:require('path').resolve(__dirname,'../../.env')})
const fs=require('fs'),path=require('path')
const ttsService=require('../../services/tts-service.cjs')
const phase8=require('../../services/phases/phase8-audio-v13.cjs')
const {runGates}=require('./gates.cjs')
const SHIP=path.join(__dirname,'ship'), SPARE=path.join(__dirname,'spares')
const MAX_ATTEMPTS=3, SPARES_PER_ROW=1   // one insurance take beyond the shipped one
const VOICE={voiceId:'si-LK-SameeraNeural',speed:1}
async function renderOnce(text,attempt){
  const {audioBuffer,wordBoundaries}=await ttsService.generateWithRetry(text,'azure',{
    subscriptionKey:process.env.AZURE_SPEECH_KEY, region:process.env.AZURE_SPEECH_REGION,
    voiceName:VOICE.voiceId, speed:VOICE.speed, regenerationAttempt:attempt})
  const {buffer,durationMs}=await phase8.masterAudio(audioBuffer,text)
  return {buffer,durationMs,wordBoundaries}
}
async function main(){
  fs.mkdirSync(SHIP,{recursive:true}); fs.mkdirSync(SPARE,{recursive:true})
  const coll=require('./collision-check.json')
  const rows=require('./proposal.json').map(r=>({...r,collides:coll.find(c=>c.id===r.id).existing_clip}))
  const log=[]
  for(const row of rows){
    const short=row.id.split(':')[1]
    if(row.collides){ log.push({id:row.id,mode:'reuse',reuse_id:row.collides.id,text:row.new}); console.log(`${short}: reuse ${row.collides.id}`); continue }
    let shipped=null, attempts=[]
    for(let a=1;a<=MAX_ATTEMPTS;a++){
      const {buffer,durationMs,wordBoundaries}=await renderOnce(row.new,a-1)
      const f=path.join(SPARE,`${short}-attempt${a}.mp3`); fs.writeFileSync(f,buffer)
      const g=runGates(row,row.new,wordBoundaries,durationMs,f)
      attempts.push({attempt:a,file:f,bytes:buffer.length,ms:durationMs,word_boundaries:wordBoundaries,...g})
      console.log(`${short} a${a}: ms=${durationMs} z=${g.z} tail=${g.tail?.toFixed(1)}dB tok=${g.tokens} bareGe=${g.gate5d_no_bare_ge} fail=${JSON.stringify(g.fail)}`)
      if(!g.fail.length){shipped=attempts[attempts.length-1];break}
    }
    // one further take kept as an insurance spare even when attempt 1 passed
    if(shipped&&attempts.length<MAX_ATTEMPTS){
      for(let s=0;s<SPARES_PER_ROW;s++){
        const a=attempts.length+1
        const {buffer,durationMs,wordBoundaries}=await renderOnce(row.new,a-1)
        const f=path.join(SPARE,`${short}-spare${s+1}.mp3`); fs.writeFileSync(f,buffer)
        const g=runGates(row,row.new,wordBoundaries,durationMs,f)
        console.log(`${short} spare${s+1}: ms=${durationMs} z=${g.z} fail=${JSON.stringify(g.fail)}`)
        attempts.push({spare:s+1,file:f,bytes:buffer.length,ms:durationMs,word_boundaries:wordBoundaries,...g})
      }
    }
    if(shipped){
      const shipFile=path.join(SHIP,`${short}.mp3`); fs.copyFileSync(shipped.file,shipFile)
      log.push({id:row.id,lego_id:row.lego_id,seed:row.seed,mode:'render',text:row.new,eng:row.eng,
        old_text:row.old,old_clip:row.current_audio,was_silent:row.was_silent,confidence:row.confidence,
        file:shipFile,bytes:shipped.bytes,ms:shipped.ms,z:shipped.z,tail:shipped.tail,
        tokens:shipped.tokens,attempt:shipped.attempt,total_takes:attempts.length,
        word_boundaries:shipped.word_boundaries,fail:shipped.fail})
    } else {
      console.error(`${short}: NO PASSING TAKE after ${MAX_ATTEMPTS}`)
      log.push({id:row.id,mode:'render',text:row.new,file:null,shipped:false,
        all_attempts:attempts.map(a=>({attempt:a.attempt,ms:a.ms,z:a.z,tail:a.tail,fail:a.fail}))})
    }
  }
  fs.writeFileSync(path.join(__dirname,'ship-log.json'),JSON.stringify(log,null,1))
  const ok=log.filter(r=>r.file||r.mode==='reuse').length
  console.log(`\n${ok}/${rows.length} ready.`)
  if(ok!==rows.length) process.exit(1)
}
main().catch(e=>{console.error('ABORT:',e.stack||e.message);process.exit(1)})
