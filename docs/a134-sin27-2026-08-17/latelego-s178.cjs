const {Client}=require('pg');const fs=require('fs'),path=require('path')
const url=fs.readFileSync(path.resolve(__dirname,'../../.env.psql'),'utf8').match(/DATABASE_URL=(.+)/)[1].trim()
const COURSE='eng_for_sin'
const EDGE=/^[.,?!"'‘’“”()\[\]:;෴…\-–—]+|[.,?!"'‘’“”()\[\]:;෴…\-–—]+$/g
const tok=s=>String(s||'').normalize('NFC').split(/\s+/).map(w=>w.replace(EDGE,'')).filter(Boolean)
;(async()=>{const db=new Client({connectionString:url,ssl:{rejectUnauthorized:false}});await db.connect()
const q=async(s,p)=>(await db.query(s,p)).rows
const legos=await q(`select seed_number,known_text,components from course_legos where course_code=$1`,[COURSE])
const taught=new Map()
for(const l of legos){const strs=[l.known_text];let c=l.components
 if(typeof c==='string'){try{c=JSON.parse(c)}catch(e){c=null}}
 const walk=v=>{if(!v)return;if(typeof v==='string')strs.push(v);else if(Array.isArray(v))v.forEach(walk);else if(typeof v==='object')Object.values(v).forEach(walk)}
 walk(c);for(const t of new Set(strs.filter(x=>typeof x==='string').flatMap(tok)))if(!taught.has(t)||taught.get(t)>l.seed_number)taught.set(t,l.seed_number)}
const br=(t,n)=>tok(t).map(x=>({x,d:taught.has(x)?taught.get(x):null})).filter(y=>y.d===null||y.d>n)
console.log('=== seed 178, ALL 21 phrases ===')
for(const p of await q(`select lego_index,position,phrase_role,known_text,target_text from course_practice_phrases where course_code=$1 and seed_number=178 order by lego_index,position`,[COURSE]))
 console.log(`  L${p.lego_index}p${p.position} ${p.phrase_role.padEnd(9)} ${p.known_text}\n${' '.repeat(22)}|| ${p.target_text}   [breaches ${br(p.known_text,178).length}]`)
console.log('\n=== candidate repairs for seed 178 (target_text: "I didn\'t have time, although I wanted to see you.") ===')
const C={
 'A minimal (habayi->etha only)':'ඔයාව දකින්න ඕනේ වුණා, ඒත් මම ළඟ ටයිම් නොතිබුණා.',
 'B rebuilt, lego order L01,L02':'මට වෙලාවක් තිබුණේ නෑ, ඔයාව දකින්න ඕනේ වුණත්.',
 'C rebuilt, concessive first':'ඔයාව දකින්න ඕනේ වුණත්, මට වෙලාවක් තිබුණේ නෑ.'}
for(const [k,v] of Object.entries(C)){const b=br(v,178)
 console.log(`  ${k.padEnd(32)} breaches=${b.length} ${b.map(y=>y.x+'@'+(y.d??'NEVER')).join(' ')}\n     ${v}`)}
console.log('\n=== is "wunath" (concessive) attested mid/clause-final in phrases? ===')
for(const r of await q(`select seed_number,lego_index,position,known_text,target_text from course_practice_phrases where course_code=$1 and known_text like '%වුණත්%' order by seed_number limit 12`,[COURSE]))
 console.log(`  s${r.seed_number}L${r.lego_index}p${r.position}: ${r.known_text} || ${r.target_text}`)
await db.end()})().catch(e=>{console.error(e.message);process.exit(1)})
