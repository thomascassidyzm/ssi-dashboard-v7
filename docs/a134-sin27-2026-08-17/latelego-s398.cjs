// #870's two corrections: (a) 257/leyikayi DOES have earlier-taught 'like' words;
// (b) seed 398's 'apie' spelling may be an earlier 'our', shrinking 271's gap.
const {Client}=require('pg');const fs=require('fs'),path=require('path')
const url=fs.readFileSync(path.resolve(__dirname,'../../.env.psql'),'utf8').match(/DATABASE_URL=(.+)/)[1].trim()
const COURSE='eng_for_sin'
const cp=s=>[...s].map(c=>'U+'+c.codePointAt(0).toString(16).toUpperCase().padStart(4,'0')).join(' ')
;(async()=>{const db=new Client({connectionString:url,ssl:{rejectUnauthorized:false}});await db.connect()
const q=async(s,p)=>(await db.query(s,p)).rows
console.log('=== (b) the three candidate "our" spellings ===')
for(const w of ['අපේ','අපිේ','අපිගේ','අපි']){
 const L=await q(`select seed_number,known_text,target_text from course_legos where course_code=$1 and known_text like '%'||$2||'%' order by seed_number limit 4`,[COURSE,w])
 const S=await q(`select seed_number from course_seeds where course_code=$1 and known_text like '%'||$2||'%' order by seed_number limit 12`,[COURSE,w])
 const [{n}]=await q(`select count(*) n from course_practice_phrases where course_code=$1 and known_text like '%'||$2||'%'`,[COURSE,w])
 console.log(`\n  "${w}"  [${cp(w)}]`)
 console.log(`    legos: ${L.map(r=>'s'+r.seed_number+' '+JSON.stringify(r.known_text)+'->'+JSON.stringify(r.target_text)).join(' | ')||'none'}`)
 console.log(`    seeds: [${S.map(r=>r.seed_number)}]   phraseRows: ${n}`)
}
console.log('\n  NFC check: is "apie" a normalization variant of "ape"?')
console.log(`    NFC equal: ${'අපිේ'.normalize('NFC')==='අපේ'.normalize('NFC')}   NFD equal: ${'අපිේ'.normalize('NFD')==='අපේ'.normalize('NFD')}`)
console.log('\n=== (a) earlier-taught "like" words vs leyikayi ===')
for(const w of ['ලෙයිකයි','ආසයි','කැමති','ආසා']){
 const L=await q(`select seed_number,known_text,target_text from course_legos where course_code=$1 and known_text like '%'||$2||'%' order by seed_number limit 3`,[COURSE,w])
 const [{n}]=await q(`select count(*) n from course_practice_phrases where course_code=$1 and known_text like '%'||$2||'%'`,[COURSE,w])
 console.log(`  "${w}" earliest lego: ${L.map(r=>'s'+r.seed_number+' '+JSON.stringify(r.known_text)+'->'+JSON.stringify(r.target_text)).join(' | ')||'none'}   phraseRows=${n}`)
}
console.log('\n  seed 257 and its lego/phrases:')
for(const r of await q(`select seed_number,known_text,target_text from course_seeds where course_code=$1 and seed_number=257`,[COURSE]))console.log(`    seed: ${r.known_text} || ${r.target_text}`)
for(const r of await q(`select lego_id,known_text,target_text from course_legos where course_code=$1 and seed_number=257`,[COURSE]))console.log(`    lego ${r.lego_id}: ${r.known_text} || ${r.target_text}`)
await db.end()})().catch(e=>{console.error(e.message);process.exit(1)})
