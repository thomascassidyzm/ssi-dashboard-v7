const fs=require('fs'), path=require('path')
const dir=__dirname
const files=fs.readdirSync(dir).filter(f=>/^verify-.*\.json$/.test(f) && f!=='verify-all.json')
let all=[]
for(const f of files){ const j=JSON.parse(fs.readFileSync(path.join(dir,f))); all.push(...j.results) }
const green=all.filter(r=>r.ok), review=all.filter(r=>r.review), fail=all.filter(r=>!r.ok&&!r.review)
const tally={}
for(const r of all) for(const [k,v] of Object.entries(r.checks)){ const key=k+': '+String(v).split(' ')[0]; tally[key]=(tally[key]||0)+1 }
const voices={}; all.forEach(r=>voices[r.voice_id]=(voices[r.voice_id]||0)+1)
console.log('courses verified   :', files.length)
console.log('clips verified     :', all.length)
console.log('all-green          :', green.length)
console.log('needs human listen :', review.length)
console.log('hard fail          :', fail.length)
console.log('\nvoice distribution :', voices)
console.log('\ncheck tally:'); Object.entries(tally).sort().forEach(([k,v])=>console.log('  '+k.padEnd(28), v))
if(review.length){ console.log('\nREVIEW ITEMS:'); review.forEach(r=>console.log(`  ${r.sentence_id} ${r.voice_id} f0=${r.f0} | ${Object.entries(r.checks).filter(([,v])=>!String(v).startsWith('OK')).map(([k,v])=>k+'='+v).join('; ')} | "${(r.text||'').slice(0,60)}"`)) }
if(fail.length){ console.log('\nHARD FAILURES:'); fail.forEach(r=>console.log(`  ${r.sentence_id} ${r.voice_id} | ${Object.entries(r.checks).filter(([,v])=>!String(v).startsWith('OK')).map(([k,v])=>k+'='+v).join('; ')} | want="${(r.text||'').slice(0,60)}" got="${(r.asr||'').slice(0,60)}"`)) }
fs.writeFileSync(dir+'/AGGREGATE.json', JSON.stringify({clips:all.length,green:green.length,review:review.length,fail:fail.length,voices,tally,review_items:review,failures:fail},null,2))
