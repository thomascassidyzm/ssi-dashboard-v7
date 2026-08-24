const fs=require('fs');const D='/home/tomcassidy/SSi/ssi-dashboard-v7-clean/.a74-scratch/late-lego'
const seeds=JSON.parse(fs.readFileSync(D+'/seeds.json'))
const phrases=JSON.parse(fs.readFileSync(D+'/phrases.json'))
const E='ඒත්',H='හැබැයි'
console.log('=== seeds using etha ===')
for(const s of seeds.filter(s=>(s.known_text||'').includes(E)))console.log(` ${s.seed_number}: ${s.known_text}  || ${s.target_text}`)
const mid=phrases.filter(p=>{const t=(p.known_text||'').normalize('NFC');return t.includes(E)&&!t.trim().startsWith(E)})
console.log(`\n=== etha MID-sentence in phrases: ${mid.length} of 69 ===`)
for(const p of mid.slice(0,20))console.log(` s${p.seed_number} L${p.lego_index}p${p.position} ${p.phrase_role}: ${p.known_text}  || ${p.target_text}`)
console.log('\n=== all habayi phrase rows (23) ===')
for(const p of phrases.filter(p=>(p.known_text||'').includes(H)))console.log(` s${p.seed_number} L${p.lego_index}p${p.position} ${p.phrase_role} [${p.status}]: ${p.known_text}  || ${p.target_text}`)
console.log('\n=== seeds 165,178,469,483,503 (out of my range / at-or-after teach) ===')
for(const n of [165,178,469,483,503]){const s=seeds.find(x=>x.seed_number===n);console.log(` ${n}: ${s.known_text} || ${s.target_text}`)}
