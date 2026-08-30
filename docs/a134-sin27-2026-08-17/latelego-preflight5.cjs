const {Client}=require('pg');const fs=require('fs'),path=require('path')
const url=fs.readFileSync(path.resolve(__dirname,'../../.env.psql'),'utf8').match(/DATABASE_URL=(.+)/)[1].trim()
const COURSE='eng_for_sin'
const NEW={246:'ඔයාව උදව් කරන්නයි මම ඇයට ඕනේ කළා, ඒත් ඇය ගොඩක් බිස්ස.',426:'ඒ අයට ඔකොව්කො ආදරේ කරන්නයි ඕනේ, ඒත් ඒ අය දුකෙන් ඉන්නවා.',431:'ඒ අය තාම සූදානම් නෑ, ඒත් ඉක්මනින් සූදානම් වෙනවා.',456:'ඔහු ඒ තැනේ ඉන්නා, ඒත් ගොඩ ඉඩ නෑ.',464:'මම ඇයට එක සැරයක් මගේ කාමර අංකේ කිව්වා, ඒත් ඇයට අමතකවෙලා.'}
;(async()=>{const db=new Client({connectionString:url,ssl:{rejectUnauthorized:false}});await db.connect()
const q=async(s,p)=>(await db.query(s,p)).rows
console.log('=== authoritative: normalize_text() from the DB itself ===')
for(const [n,t] of Object.entries(NEW)){
 const [{norm}]=await q(`select normalize_text($1::text) as norm`,[t])
 const [{c}]=await q(`select count(*) c from course_audio where course_code=$1 and language='sin' and role='known' and voice_id='azure_si-LK-SameeraNeural' and text_normalized=$2`,[COURSE,norm])
 const [{cany}]=await q(`select count(*) cany from course_audio where course_code=$1 and text_normalized=$2`,[COURSE,norm])
 console.log(`  ${n}: collisions on the unique key = ${c}   (any role/voice: ${cany})  norm=${JSON.stringify(norm)}`)}
await db.end()})().catch(e=>{console.error(e.message);process.exit(1)})
