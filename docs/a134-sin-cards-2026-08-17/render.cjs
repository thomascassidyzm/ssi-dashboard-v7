// A-134 / plate cards — render the KNOWN-side Sinhala clips for the repaired rows.
// Compressor-free chain: 667a6e09 is cherry-picked onto fix/sin-27-seed-rebuild-2026-08-17,
// and masterAudio() below is the live phase8 function (calls normalizeAudioClean).
// PHASE8_NO_LISTEN=1. Nothing touches S3 or the DB here — render + gate + spares only.
process.env.PHASE8_NO_LISTEN = '1'
const ROOT='/home/tomcassidy/SSi/ssi-dashboard-v7-clean'
require('dotenv').config({ path: ROOT+'/.env' })
const fs=require('fs'), path=require('path'), cp=require('child_process')
const ttsService=require(ROOT+'/services/tts-service.cjs')
const phase8=require(ROOT+'/services/phases/phase8-audio-v13.cjs')
const NEED=require('./need.json')
const VOICE={voiceId:'si-LK-SameeraNeural',speed:1}
const MAX=3
const norm=s=>String(s||'').replace(/['".,:!?…]/g,'').replace(/\s+/g,' ').trim()

function tailFloorDb(file){
  const pcm=cp.execSync(`ffmpeg -v quiet -i "${file}" -ac 1 -ar 44100 -f s16le -`,{maxBuffer:1<<28,shell:'/bin/bash'})
  const n=pcm.length>>1; const s=new Int16Array(n)
  for(let i=0;i<n;i++)s[i]=pcm.readInt16LE(i*2)
  let peak=1; for(let i=0;i<n;i++)peak=Math.max(peak,Math.abs(s[i]))
  const sr=44100,win=Math.round(sr*0.002)
  const from=Math.max(0,n-Math.round(sr*0.400)), to=Math.max(0,n-Math.round(sr*0.150))
  const vals=[]
  for(let i=from;i+win<=to;i+=win){let p=1;for(let k=i;k<i+win;k++)p=Math.max(p,Math.abs(s[k]));vals.push(20*Math.log10(p/peak))}
  vals.sort((a,b)=>a-b); return vals.length?vals[vals.length>>1]:0
}
// GATES applicable to SHORT known-side chunks. (gates-12.cjs's rate model — 3143ms intercept —
// is fitted to LONG presentation clips and does not transfer to 1-3s chunks, so it is not used;
// gate 2 does the work duration cannot: for a 4-char headword the duration test is blind at z=0.)
function gates(text,file,durationMs,wb){
  const corpus=norm((wb||[]).map(t=>t.text).join(' '))
  const words=norm(text).split(' ').filter(Boolean)
  const missing=words.filter(w=>!corpus.includes(w))
  const g=[]
  g.push(['1 alive', durationMs>200 && fs.statSync(file).size>1000])
  g.push(['2 headword-voiced-per-token-array', missing.length===0, missing.join('|')])
  g.push(['3 no-filler-regression (ඒ ගෙ)', !/ඒ\s*ගෙ/.test(corpus)])
  g.push(['4 token array non-empty', (wb||[]).length>0])
  g.push(['5 tail floor <= -35dB', tailFloorDb(file)<=-35, tailFloorDb(file).toFixed(1)+'dB'])
  g.push(['6 duration sane', durationMs>200 && durationMs<15000, durationMs+'ms'])
  g.push(['7 no stray latin/digits voiced', !/[a-z0-9]/i.test(corpus)])
  return {pass:g.every(x=>x[1]), g}
}
;(async()=>{
  const out=[]
  for(const p of NEED){
    let shipped=null
    for(let a=1;a<=MAX&&!shipped;a++){
      const {audioBuffer,wordBoundaries}=await ttsService.generateWithRetry(p.new_known,'azure',{
        subscriptionKey:process.env.AZURE_SPEECH_KEY, region:process.env.AZURE_SPEECH_REGION,
        voiceName:VOICE.voiceId, speed:VOICE.speed, regenerationAttempt:a })
      const {buffer,durationMs}=await phase8.masterAudio(audioBuffer,p.new_known)
      const f=path.join(__dirname,'spares',`${p.id}.a${a}.mp3`)
      fs.writeFileSync(f,buffer)
      const r=gates(p.new_known,f,durationMs,wordBoundaries)
      console.log(`${r.pass?'PASS':'FAIL'} ${p.id} a${a} ${durationMs}ms  ${r.g.filter(x=>!x[1]).map(x=>x[0]+(x[2]?'('+x[2]+')':'')).join(', ')||'all 7 gates'}`)
      if(r.pass){ const s=path.join(__dirname,'ship',`${p.id}.mp3`); fs.writeFileSync(s,buffer)
        shipped={...p,file:s,durationMs,wordBoundaries,attempt:a,tail:tailFloorDb(s)} }
    }
    if(!shipped) console.log('  !! NO SHIPPING TAKE for '+p.id)
    out.push(shipped||{...p,failed:true})
  }
  fs.writeFileSync(__dirname+'/rendered.json',JSON.stringify(out,null,1))
  console.log('\nshipping takes: '+out.filter(o=>!o.failed).length+' / '+NEED.length)
})().catch(e=>{console.error('FATAL',e.message);process.exit(1)})
