const fs=require('fs');const D='/home/tomcassidy/SSi/ssi-dashboard-v7-clean/.a74-scratch/late-lego'
const seeds=JSON.parse(fs.readFileSync(D+'/seeds.json'))
const legos=JSON.parse(fs.readFileSync(D+'/legos.json'))
const phrases=JSON.parse(fs.readFileSync(D+'/phrases.json'))
const H='හැබැයි', E='ඒත්'
const TGT=[246,426,431,456,464]
console.log('=== habayi LEGO rows ===')
for(const l of legos)if((l.known_text||'').includes(H))console.log(' seed',l.seed_number,l.lego_id,JSON.stringify(l.known_text),'->',JSON.stringify(l.target_text),l.status)
console.log('=== etha LEGO rows (first 3) ===')
let n=0;for(const l of legos)if((l.known_text||'').includes(E)&&n<3){console.log(' seed',l.seed_number,l.lego_id,JSON.stringify(l.known_text),'->',JSON.stringify(l.target_text),l.status);n++}
const pH=phrases.filter(p=>(p.known_text||'').includes(H))
const pE=phrases.filter(p=>(p.known_text||'').includes(E))
console.log(`\nphrases with habayi: ${pH.length} (seeds ${Math.min(...pH.map(p=>p.seed_number))}..${Math.max(...pH.map(p=>p.seed_number))}), of which BEFORE seed 469: ${pH.filter(p=>p.seed_number<469).length}`)
console.log(`phrases with etha: ${pE.length} (from seed ${Math.min(...pE.map(p=>p.seed_number))})`)
console.log(`seeds with habayi: ${seeds.filter(s=>(s.known_text||'').includes(H)).map(s=>s.seed_number).join(',')}`)
console.log(`seeds with etha: ${seeds.filter(s=>(s.known_text||'').includes(E)).map(s=>s.seed_number).join(',')}`)
console.log('\n=== TARGET SEEDS ===')
for(const n of TGT){const s=seeds.find(x=>x.seed_number===n)
 console.log(`\n--- seed ${n} [${s.status}] v${s.version} clip ${s.known_audio_id}`)
 console.log('  KNOWN (sin):',JSON.stringify(s.known_text))
 console.log('  TARGET(eng):',JSON.stringify(s.target_text))
 console.log('  legos:');for(const l of legos.filter(l=>l.seed_number===n))console.log(`    ${l.lego_id} ${JSON.stringify(l.known_text)} -> ${JSON.stringify(l.target_text)}`)
 const ph=phrases.filter(p=>p.seed_number===n)
 console.log(`  phrases (${ph.length}):`);for(const p of ph)console.log(`    L${p.lego_index}p${p.position} ${p.phrase_role} ${JSON.stringify(p.known_text)} -> ${JSON.stringify(p.target_text)}`)
}
