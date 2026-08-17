// SELF-REVIEW (an independent verifier was refused on the fan-out depth ceiling).
// Nine adversarial attacks, run against the LIVE database, not against my own logs.
require('dotenv').config({path:require('path').resolve(__dirname,'../../.env')})
const fs=require('fs'),path=require('path'),cp=require('child_process'),{Client}=require('pg')
const {S3Client,HeadObjectCommand}=require('@aws-sdk/client-s3')
const url=fs.readFileSync(path.resolve(__dirname,'../../.env.psql'),'utf8').match(/DATABASE_URL=(.+)/)[1].trim()
const GE=/(^| )ගෙ( |$)/
const V=[]; const say=(n,ok,msg)=>{V.push({attack:n,verdict:ok?'CONFIRMED':'REFUTED',msg});console.log(`[${ok?'CONFIRMED':'REFUTED  '}] ${n}: ${msg}`)}
;(async()=>{
const db=new Client({connectionString:url,ssl:{rejectUnauthorized:false}});await db.connect()
await db.query("set statement_timeout='60s'")
const applied=require('./link-applied-log.json')
const ids=applied.map(a=>a.id)

// 1. text/audio desync — byte compare
const rows=(await db.query(`select p.id,p.known_text,p.target_text,p.known_audio_id::text kaid,
  a.text atext,a.duration_ms,a.s3_key,a.role,a.language,a.voice_id,a.origin,a.word_boundaries
  from course_practice_phrases p left join course_audio a on a.id=p.known_audio_id where p.id=any($1)`,[ids])).rows
const desync=rows.filter(r=>Buffer.compare(Buffer.from(r.known_text,'utf8'),Buffer.from(r.atext||'','utf8'))!==0)
say(1,desync.length===0,`byte-compared known_text vs course_audio.text for all ${rows.length}: ${desync.length} desync`+(desync.length?' -> '+desync.map(d=>d.id).join(','):''))

// 2. re-derive the defect set across every table
const scan={}
for(const [t,c] of [['course_practice_phrases','known_text'],['course_legos','known_text'],['course_seeds','known_text'],['course_audio','text']]){
  const q=await db.query(`select count(*) c from ${t} where course_code='eng_for_sin' and ${c} ~ '(^| )ගෙ( |$)'`)
  scan[t]=+q.rows[0].c }
// and prove the regex still FINDS things (a regex that matches nothing proves nothing)
const control=(await db.query(`select count(*) c from course_practice_phrases where course_code='eng_for_sin' and known_text ~ 'ගෙදර'`)).rows[0].c
say(2,Object.values(scan).every(v=>v===0),`bare ගෙ: ${JSON.stringify(scan)}; control — the same table still matches ගෙදර in ${control} rows, so the scan is live`)

// 3. silent rows
const silentNow=(await db.query(`select id from course_practice_phrases where course_code='eng_for_sin' and seed_number in (60,154,155,156,158) and known_audio_id is null`)).rows
const wereVoiced=applied.filter(a=>a.old_clip), nowNull=rows.filter(r=>!r.kaid)
const three=['S0158L01U02','S0158L01U05','S0158L01U06'].map(s=>rows.find(r=>r.id.endsWith(s)))
say(3,silentNow.length===0&&nowNull.length===0&&three.every(t=>t&&t.kaid),
 `seeds 60/154/155/156/158 silent rows now: ${silentNow.length}; of the 24, null-linked: ${nowNull.length}; the 3 formerly-silent rows all linked: ${three.every(t=>t&&t.kaid)}; ${wereVoiced.length} rows were voiced before and ${rows.filter(r=>r.kaid).length}/24 are voiced now`)

// 4. make-before-break — every old clip still exists, in DB and on S3
const oldIds=applied.map(a=>a.old_clip).filter(Boolean)
const stillDb=(await db.query(`select id::text id,s3_key from course_audio where id=any($1::uuid[])`,[oldIds])).rows
const s3=new S3Client({region:process.env.AWS_REGION||'eu-west-1'})
const bucket=process.env.S3_AUDIO_BUCKET||process.env.S3_BUCKET
let s3ok=0,s3bad=[]
for(const r of stillDb){ try{await s3.send(new HeadObjectCommand({Bucket:bucket,Key:r.s3_key}));s3ok++}catch(e){s3bad.push(r.id)} }
say(4,stillDb.length===oldIds.length&&s3bad.length===0,
 `${oldIds.length} superseded clips: ${stillDb.length} still in course_audio, ${s3ok} still HEAD-200 on S3, ${s3bad.length} missing`)

// 5. learner path — ALL 24, not a sample of 8
const tmp=fs.mkdtempSync('/home/tomcassidy/SSi/ssi-dashboard-v7-clean/.a74-scratch/ref-')
let live=0, bad=[]
for(const r of rows){
  const f=path.join(tmp,r.id.split(':')[1]+'.mp3')
  const code=cp.execSync(`curl -s -o ${f} -w '%{http_code}' -L 'https://ssi-learning-app.vercel.app/api/audio/${r.kaid}'`,{shell:'/bin/bash'}).toString().trim()
  let dm=null; if(code==='200'){try{dm=Math.round(parseFloat(cp.execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 ${f}`,{shell:'/bin/bash'}).toString())*1000)}catch(e){}}
  if(code==='200'&&dm!==null&&Math.abs(dm-r.duration_ms)<=60) live++; else bad.push(`${r.id} http=${code} decoded=${dm} db=${r.duration_ms}`)
}
say(5,bad.length===0,`fetched ALL 24 via /api/audio/<id> (path segment): ${live}/24 HTTP 200 + decode within 60ms of duration_ms`+(bad.length?'; FAILURES: '+bad.join(' | '):''))

// 6. ZUT involving the 24, from live data
let all=[],off=0
for(;;){const r=(await db.query(`select id,known_text,target_text from course_practice_phrases where course_code='eng_for_sin' limit 3000 offset $1`,[off])).rows
 all=all.concat(r); if(r.length<3000)break; off+=3000}
const nk=s=>s.normalize('NFC').replace(/[?!.]+$/,'').replace(/\s+/g,' ').trim()
const ne=s=>s.toLowerCase().replace(/[?!.]+$/,'').replace(/\s+/g,' ').trim()
const m=new Map()
for(const r of all){const k=nk(r.known_text);if(!k)continue;if(!m.has(k))m.set(k,new Map());const g=m.get(k),e=ne(r.target_text);if(!g.has(e))g.set(e,[]);g.get(e).push(r.id)}
const idset=new Set(ids)
const involving=[...m.entries()].filter(([k,g])=>g.size>1&&[...g.values()].flat().some(i=>idset.has(i)))
say(6,involving.length===0,`live ZUT over ${all.length} phrases: ${[...m.values()].filter(g=>g.size>1).length} conflicts course-wide, ${involving.length} involving any of the 24`+(involving.length?' -> '+involving.map(x=>x[0]).join(' | '):''))

// 8. gate5d adversarial — try to force a false pass and a false fail
const {bareGeTokens}=require('./gates.cjs')
const wb=t=>t.split(' ').map(x=>({text:x}))
const cases=[
 ['ගෙදර alone',            wb('මට ගෙදර යන්න ඕනේ'),                 0],
 ['ගෙන alone',             wb('ඒක ගෙන යන්න'),                      0],
 ['bare ගෙ mid',           wb('රෙස්ටෝරන්ට් ගෙ ඕනේද'),               1],
 ['bare ගෙ first',         wb('ගෙ කතා කරමු'),                       1],
 ['bare ගෙ last',          wb('කතා කරමු ගෙ'),                       1],
 ['ගෙ with punctuation',   [{text:'ගෙ,'},{text:'කතා'}],             1],
 ['ගෙ padded with spaces', [{text:' ගෙ '},{text:'කතා'}],            1],
 ['two bare ගෙ',           wb('ඒ ගෙ ඉගෙනීම ගෙ කතා'),                2],
 ['ගෙ inside ඉගෙනීම',      wb('මට ඉගෙනීම ගැන කතා'),                 0],
 ['empty boundaries',      [],                                     0],
]
const gateFails=cases.filter(([n,inp,exp])=>bareGeTokens(inp).length!==exp)
say(8,gateFails.length===0,`gate5d against ${cases.length} adversarial inputs incl. ගෙදර/ගෙන/ඉගෙනීම and punctuation- and space-padded ගෙ: ${gateFails.length} wrong`+(gateFails.length?' -> '+gateFails.map(g=>g[0]).join(', '):''))

// 9. independent refit + score the 24
let clips=[],o2=0
for(;;){const r=(await db.query(`select duration_ms,text from course_audio where course_code='eng_for_sin' and role='known' and language='sin' and voice_id='azure_si-LK-SameeraNeural' and duration_ms is not null and text is not null limit 3000 offset $1`,[o2])).rows
 clips=clips.concat(r); if(r.length<3000)break; o2+=3000}
const n=clips.length;let sx=0,sy=0,sxx=0,sxy=0
for(const c of clips){const x=c.text.length,y=c.duration_ms;sx+=x;sy+=y;sxx+=x*x;sxy+=x*y}
const b=(n*sxy-sx*sy)/(n*sxx-sx*sx), a=(sy-b*sx)/n
let ss=0;for(const c of clips)ss+=(c.duration_ms-(a+b*c.text.length))**2
const sd=Math.sqrt(ss/(n-2))
const worst=rows.map(r=>({id:r.id,z:(r.duration_ms-(a+b*r.atext.length))/sd})).sort((p,q)=>Math.abs(q.z)-Math.abs(p.z))[0]
const repro=Math.abs(a-1398.2)<20&&Math.abs(b-45.57)<0.5&&Math.abs(sd-149.9)<15
say(9,repro&&Math.abs(worst.z)<3,`refit n=${n}: ms = ${a.toFixed(1)} + ${b.toFixed(2)}x, sd ${sd.toFixed(1)} (README claimed 1398.2 + 45.57x sd 149.9, n=13412 — reproduced: ${repro}); worst of the 24 is ${worst.id.split(':')[1]} at z=${worst.z.toFixed(2)}`)

fs.writeFileSync(path.join(__dirname,'refute.json'),JSON.stringify(V,null,1))
console.log(`\n${V.filter(v=>v.verdict==='CONFIRMED').length}/${V.length} attacks CONFIRMED the work; ${V.filter(v=>v.verdict==='REFUTED').length} REFUTED it`)
await db.end()})()
