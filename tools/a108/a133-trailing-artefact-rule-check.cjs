// Trailing-artefact rule, CLUSTER form. Read-only over all 55 raw clips.
const fs=require('fs'),path=require('path')
const probe=require('./a133-tail-probe.cjs')
const {decode,envelope,events,endOfSpeech,SR}=probe
const SRC='/tmp/a133-phrase-test'
const LONG_MS=150          // what counts as the main speech body
const MAX_ARTEFACT_MS=120  // a trailing event longer than this is never dropped
const MIN_CLEAR_MS=200     // clearance the whole trailing cluster needs from the body

function correctedEos(evs){
  const long=evs.filter(e=>e.aboveMs>=LONG_MS)
  if(!long.length) return {eos:null,dropped:[]}
  const body=long[long.length-1]
  const after=evs.filter(e=>e.start>=body.end)
  if(!after.length) return {eos:body.end,dropped:[]}
  const allShort=after.every(e=>e.aboveMs<MAX_ARTEFACT_MS)
  const clearMs=(after[0].start-body.end)/SR*1000
  if(allShort&&clearMs>=MIN_CLEAR_MS) return {eos:body.end,dropped:after.filter(e=>e.kind==='speech'),firstArtefactMs:after[0].start/SR*1000}
  return {eos:null,dropped:[]}
}
let envFromNothing=null
const changed=[]
for(const dir of fs.readdirSync(SRC).sort()){
  const raw=path.join(SRC,dir,'raw.mp3'); if(!fs.existsSync(raw))continue
  const {s,n,peak}=decode(raw); const env=envelope(s,n,peak); const evs=events(env)
  const old=endOfSpeech(env)??n
  const r=correctedEos(evs)
  const neu=r.eos==null?old:r.eos
  if(Math.abs(neu-old)>SR*0.005){
    changed.push({dir,oldMs:Math.round(old/SR*1000),newMs:Math.round(neu/SR*1000),
      dropped:r.dropped.map(e=>`${Math.round(e.start/SR*1000)}ms/${e.aboveMs}ms/${e.peakDb.toFixed(1)}dB`),
      padEndMs:Math.round(Math.min(neu+SR*0.250,(r.firstArtefactMs?r.firstArtefactMs*SR/1000:Infinity)-SR*0.010)/SR*1000)})
  }
}
console.log(`end-of-speech changes on ${changed.length} of 55 clips\n`)
for(const c of changed) console.log(c.dir.padEnd(16),`eos ${c.oldMs} -> ${c.newMs}, file would end ${c.padEndMs}ms`,'dropped:',c.dropped.join(' | ')||'(impulses only)')
