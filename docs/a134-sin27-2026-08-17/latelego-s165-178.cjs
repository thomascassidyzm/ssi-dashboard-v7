const {Client}=require('pg');const fs=require('fs'),path=require('path')
const url=fs.readFileSync(path.resolve(__dirname,'../../.env.psql'),'utf8').match(/DATABASE_URL=(.+)/)[1].trim()
const COURSE='eng_for_sin',H='හැබැයි'
const EDGE=/^[.,?!"'‘’“”()\[\]:;෴…\-–—]+|[.,?!"'‘’“”()\[\]:;෴…\-–—]+$/g
const tok=s=>String(s||'').normalize('NFC').split(/\s+/).map(w=>w.replace(EDGE,'')).filter(Boolean)
;(async()=>{const db=new Client({connectionString:url,ssl:{rejectUnauthorized:false}});await db.connect()
const q=async(s,p)=>(await db.query(s,p)).rows
const legos=await q(`select seed_number,lego_id,known_text,components,target_text from course_legos where course_code=$1`,[COURSE])
const taught=new Map()
for(const l of legos){const strs=[l.known_text];let c=l.components
 if(typeof c==='string'){try{c=JSON.parse(c)}catch(e){c=null}}
 const walk=v=>{if(!v)return;if(typeof v==='string')strs.push(v);else if(Array.isArray(v))v.forEach(walk);else if(typeof v==='object')Object.values(v).forEach(walk)}
 walk(c);for(const t of new Set(strs.filter(x=>typeof x==='string').flatMap(tok)))if(!taught.has(t)||taught.get(t)>l.seed_number)taught.set(t,l.seed_number)}
const NEW={165:'ඒත් ඒ ඇත්ත කියලා මට විශ්වාස නෑ.',178:'ඔයාව දකින්න ඕනේ වුණා, ඒත් මම ළඟ ටයිම් නොතිබුණා.'}
for(const n of [165,178]){
 const [s]=await q(`select seed_number,known_text,target_text,known_audio_id,version,status from course_seeds where course_code=$1 and seed_number=$2`,[COURSE,n])
 const [a]=await q(`select id,text,duration_ms,s3_key,voice_id from course_audio where id=$1`,[s.known_audio_id])
 console.log(`\n${'='.repeat(66)}\nseed ${n} v${s.version} [${s.status}] clip=${s.known_audio_id}`)
 console.log(`  KNOWN: ${s.known_text}\n  ENG:   ${s.target_text}`)
 console.log(`  clip text matches seed text: ${a.text===s.known_text}  (${a.duration_ms}ms)`)
 console.log(`  legos:`);for(const l of legos.filter(l=>l.seed_number===n))console.log(`    ${l.lego_id} ${JSON.stringify(l.known_text)} -> ${JSON.stringify(l.target_text)}`)
 const ph=await q(`select lego_index,position,phrase_role,known_text,target_text,known_audio_id from course_practice_phrases where course_code=$1 and seed_number=$2 order by lego_index,position`,[COURSE,n])
 console.log(`  phrases containing habayi: ${ph.filter(p=>p.known_text.includes(H)).length} of ${ph.length}`)
 for(const p of ph.filter(p=>p.known_text.includes(H)))console.log(`    !! L${p.lego_index}p${p.position} ${p.known_text}`)
 const br=t=>tok(t).map(x=>({x,d:taught.has(x)?taught.get(x):null})).filter(y=>y.d===null||y.d>n)
 console.log(`  breaches OLD: ${br(s.known_text).map(y=>y.x+'@'+(y.d??'NEVER')).join(' ')||'0'}`)
 console.log(`  breaches NEW: ${br(NEW[n]).map(y=>y.x+'@'+(y.d??'NEVER')).join(' ')||'0'}`)
 console.log(`  NEW: ${NEW[n]}`)
 const [{norm}]=await q(`select normalize_text($1::text) norm`,[NEW[n]])
 const [{c}]=await q(`select count(*) c from course_audio where course_code=$1 and text_normalized=$2`,[COURSE,norm])
 console.log(`  existing clip for new text: ${c}`)
 // any other row sharing this seed's clip?
 const sh=[...(await q(`select seed_number from course_seeds where course_code=$1 and known_audio_id=$2 and seed_number<>$3`,[COURSE,s.known_audio_id,n])).map(x=>'seed'+x.seed_number),
   ...(await q(`select seed_number,lego_index,position from course_practice_phrases where course_code=$1 and known_audio_id=$2`,[COURSE,s.known_audio_id])).map(x=>'s'+x.seed_number+'L'+x.lego_index+'p'+x.position)]
 console.log(`  clip shared with: ${sh.join(', ')||'nothing'}`)
}
console.log(`\n=== what marker does seed 178's own lego use for the concessive slot? ===`)
for(const l of legos.filter(l=>l.seed_number===178))console.log(`  ${l.lego_id} ${JSON.stringify(l.known_text)} -> ${JSON.stringify(l.target_text)}  components=${JSON.stringify(l.components)}`)
console.log(`\n=== 'onee wunath' elsewhere? ===`)
for(const r of await q(`select seed_number,lego_id,known_text,target_text from course_legos where course_code=$1 and known_text like '%වුණත්%' order by seed_number limit 6`,[COURSE]))console.log(`  s${r.seed_number} ${JSON.stringify(r.known_text)} -> ${JSON.stringify(r.target_text)}`)
await db.end()})().catch(e=>{console.error(e.message);process.exit(1)})
