// A-134 late-lego: preflight. Re-verify EVERYTHING #850 asserted, from the live DB, myself.
require('dotenv').config({path:require('path').resolve(__dirname,'../../.env.psql'),quiet:true})
const {Client}=require('pg');const fs=require('fs'),path=require('path')
const COURSE='eng_for_sin', SEEDS=[246,426,431,456,464]
const url=fs.readFileSync(path.resolve(__dirname,'../../.env.psql'),'utf8').match(/DATABASE_URL=(.+)/)[1].trim()
;(async()=>{
const db=new Client({connectionString:url,ssl:{rejectUnauthorized:false}});await db.connect()
const q=async(s,p)=>(await db.query(s,p)).rows
console.log('=== 1. TRIGGERS on the three content tables (re-verifying #850) ===')
for(const r of await q(`select c.relname tbl, t.tgname, p.proname from pg_trigger t
  join pg_class c on c.oid=t.tgrelid join pg_proc p on p.oid=t.tgfoid
  where c.relname in ('course_seeds','course_legos','course_practice_phrases') and not t.tgisinternal
  order by c.relname,t.tgname`)) console.log(`  [${r.tbl}] ${r.tgname} -> ${r.proname}`)
const nulls=await q(`select proname from pg_proc where proname ilike '%null%audio%'`)
console.log('  pg_proc null-audio functions:',nulls.map(r=>r.proname).join(', ')||'NONE')
console.log('\n=== 2. PRE-STATE of the five seeds ===')
const pre=[]
for(const n of SEEDS){
 const [s]=await q(`select seed_number,known_text,target_text,known_audio_id,version,status from course_seeds where course_code=$1 and seed_number=$2`,[COURSE,n])
 const [a]=s.known_audio_id?await q(`select id,text,duration_ms,s3_key,voice_id,language,role,file_size_bytes from course_audio where id=$1`,[s.known_audio_id]):[null]
 pre.push({...s,clip:a})
 console.log(`  seed ${n} v${s.version} [${s.status}] clip=${s.known_audio_id}`)
 console.log(`    known: ${JSON.stringify(s.known_text)}`)
 console.log(`    clip text MATCHES seed text: ${a? a.text===s.known_text : 'NO CLIP'}  (${a?a.duration_ms+'ms '+a.voice_id+' '+a.s3_key:''})`)
}
fs.writeFileSync(path.join(__dirname,'pre-state.json'),JSON.stringify(pre,null,1))
console.log('\n=== 3. voice_config ===')
const [c]=await q(`select voice_config,content_stamp,content_version from courses where course_code=$1`,[COURSE])
console.log('  voices keys:',Object.keys(c.voice_config.voices).join(','))
console.log('  known:',JSON.stringify(c.voice_config.voices.known))
console.log('  content_stamp:',c.content_stamp,' content_version:',c.content_version)
console.log('\n=== 4. EXPOSURE / migration ===')
const [en]=await q(`select count(*) n from course_enrollments where course_code=$1`,[COURSE])
console.log('  enrollments:',en.n)
const lp=await q(`select count(*) n from lego_progress lp where lp.lego_id like 'S____L__' and lp.lego_id ~ '^S(0246|0426|0431|0456|0464)L'`)
console.log('  lego_progress rows for these five seeds:',lp[0].n)
const [lpAll]=await q(`select count(*) n from lego_progress`)
console.log('  lego_progress rows (whole table):',lpAll.n)
for(const r of await q(`select user_id,highest_completed_seed,updated_at from course_enrollments where course_code=$1 order by highest_completed_seed desc nulls last`,[COURSE]))
 console.log(`    enrol hcs=${r.highest_completed_seed} updated=${r.updated_at}`)
console.log('\n=== 5. does a clip already exist for any PROPOSED text? (unique_course_audio_per_voice) ===')
const NEW={246:'ඔයාව උදව් කරන්නයි මම ඇයට ඕනේ කළා, ඒත් ඇය ගොඩක් බිස්ස.',
 426:'ඒ අයට ඔකොව්කො ආදරේ කරන්නයි ඕනේ, ඒත් ඒ අය දුකෙන් ඉන්නවා.',
 431:'ඒ අය තාම සූදානම් නෑ, ඒත් ඉක්මනින් සූදානම් වෙනවා.',
 456:'ඔහු ඒ තැනේ ඉන්නා, ඒත් ගොඩ ඉඩ නෑ.',
 464:'මම ඇයට එක සැරයක් මගේ කාමර අංකේ කිව්වා, ඒත් ඇයට අමතකවෙලා.'}
for(const [n,t] of Object.entries(NEW)){
 const hits=await q(`select id,role,voice_id,duration_ms,s3_key from course_audio where course_code=$1 and text=$2`,[COURSE,t])
 console.log(`  ${n}: ${hits.length} existing clip(s) for the exact proposed text ${hits.map(h=>h.id+'/'+h.role).join(',')}`)
}
console.log('\n=== 6. ZUT: would any proposed known_text collide with a DIFFERENT english? ===')
for(const [n,t] of Object.entries(NEW)){
 const bare=t.replace(/\.$/,'')
 const rows=[...await q(`select 'seed' src,seed_number::text k,target_text from course_seeds where course_code=$1 and known_text in ($2,$3) and seed_number<>$4`,[COURSE,t,bare,+n]),
  ...await q(`select 'lego' src,lego_id k,target_text from course_legos where course_code=$1 and known_text in ($2,$3)`,[COURSE,t,bare]),
  ...await q(`select 'phrase' src,(seed_number||'L'||lego_index||'p'||position) k,target_text from course_practice_phrases where course_code=$1 and known_text in ($2,$3)`,[COURSE,t,bare])]
 const [me]=await q(`select target_text from course_seeds where course_code=$1 and seed_number=$2`,[COURSE,+n])
 const norm=s=>String(s||'').trim().replace(/\.$/,'').toLowerCase()
 const bad=rows.filter(r=>norm(r.target_text)!==norm(me.target_text))
 console.log(`  ${n}: ${rows.length} same-known row(s); HARD COLLISIONS (different english): ${bad.length} ${bad.map(b=>b.src+' '+b.k+' -> '+JSON.stringify(b.target_text)).join('; ')}`)
}
await db.end()})().catch(e=>{console.error('FATAL',e.message);process.exit(1)})
