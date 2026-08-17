const {Client}=require('pg');const fs=require('fs'),path=require('path')
const url=fs.readFileSync(path.resolve(__dirname,'../../.env.psql'),'utf8').match(/DATABASE_URL=(.+)/)[1].trim()
const COURSE='eng_for_sin';const state=require('./plan-state.json')
;(async()=>{const db=new Client({connectionString:url,ssl:{rejectUnauthorized:false}});await db.connect()
const q=async(s,p)=>(await db.query(s,p)).rows
console.log('=== trigger timing ===')
for(const t of ['course_practice_phrases','course_seeds','course_audio'])
 for(const r of await q(`select t.tgname,p.proname,
   case when t.tgtype & 2 =2 then 'BEFORE' else 'AFTER' end tim,
   (case when t.tgtype & 4 >0 then 'INS ' else '' end||case when t.tgtype & 16 >0 then 'UPD' else '' end) ev
   from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_proc p on p.oid=t.tgfoid
   where c.relname=$1 and not t.tgisinternal order by t.tgname`,[t]))
  console.log(`  [${t}] ${r.tim} ${r.ev.padEnd(8)} ${r.tgname} -> ${r.proname}`)
console.log('\n=== audio_id_for_text source (what the phrase trigger resolves through) ===')
console.log((await q(`select prosrc from pg_proc where proname='audio_id_for_text'`)).map(r=>r.prosrc).join('\n')||'ABSENT')
console.log('\n=== AUTOLINK BLAST RADIUS: any row with NULL known_audio_id whose text normalizes to one of my 14 new texts? ===')
const norms=[...new Set(state.map(r=>r.norm))]
for(const n of norms){
 const a=await q(`select seed_number from course_seeds where course_code=$1 and known_audio_id is null and normalize_text(known_text)=$2`,[COURSE,n])
 const b=await q(`select seed_number,lego_index,position from course_practice_phrases where course_code=$1 and known_audio_id is null and normalize_text(known_text)=$2`,[COURSE,n])
 const c=await q(`select lego_id from course_legos where course_code=$1 and known_audio_id is null and normalize_text(known_text)=$2`,[COURSE,n])
 const tot=a.length+b.length+c.length
 if(tot)console.log(`  !! ${n} -> would autolink ${tot} unintended row(s): seeds[${a.map(x=>x.seed_number)}] phrases[${b.map(x=>x.seed_number+'L'+x.lego_index+'p'+x.position)}] legos[${c.map(x=>x.lego_id)}]`)
}
console.log('  (nothing above = no unintended autolink)')
console.log('\n=== whitespace sanity on the 18 new strings ===')
for(const r of state){const bad=/\s\s|^\s|\s$/.test(r.new_text)
 if(bad)console.log(`  !! ${r.kind} ${r.seed}: suspicious whitespace ${JSON.stringify(r.new_text)}`)}
console.log('  (nothing above = all clean)')
console.log('\n=== does normalize_text(new_text) round-trip to the norm I stored? ===')
let ok=0;for(const r of state){const [{n}]=await q(`select normalize_text($1::text) n`,[r.new_text]);if(n===r.norm)ok++;else console.log(`  !! mismatch ${r.seed}`)}
console.log(`  ${ok}/${state.length} match`)
await db.end()})().catch(e=>{console.error(e.message);process.exit(1)})
