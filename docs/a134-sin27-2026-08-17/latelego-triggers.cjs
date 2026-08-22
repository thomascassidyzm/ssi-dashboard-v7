const {Client}=require('pg');const fs=require('fs'),path=require('path')
const url=fs.readFileSync(path.resolve(__dirname,'../../.env.psql'),'utf8').match(/DATABASE_URL=(.+)/)[1].trim()
;(async()=>{const db=new Client({connectionString:url,ssl:{rejectUnauthorized:false}});await db.connect()
const q=async(s,p)=>(await db.query(s,p)).rows
for(const f of ['null_phrase_audio_on_text_change','link_audio_to_content','normalize_text','touch_course_content_stamp'])
 {console.log(`===== ${f} =====`);console.log((await q(`select prosrc from pg_proc where proname=$1`,[f])).map(r=>r.prosrc).join('\n---\n')||'ABSENT')}
console.log('===== trigger timing on course_practice_phrases =====')
for(const r of await q(`select t.tgname,p.proname,
  case t.tgtype & 2 when 2 then 'BEFORE' else 'AFTER' end tim,
  case when t.tgtype & 4 >0 then 'INSERT ' else '' end || case when t.tgtype & 8 >0 then 'DELETE ' else '' end || case when t.tgtype & 16 >0 then 'UPDATE' else '' end ev
  from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_proc p on p.oid=t.tgfoid
  where c.relname='course_practice_phrases' and not t.tgisinternal order by t.tgname`))
 console.log(`  ${r.tim} ${r.ev.padEnd(16)} ${r.tgname} -> ${r.proname}`)
await db.end()})().catch(e=>{console.error(e.message);process.exit(1)})
