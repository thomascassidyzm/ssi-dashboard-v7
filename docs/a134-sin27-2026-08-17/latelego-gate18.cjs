// Introduced-before-used gate on ALL 18 rows of the expanded plan (phrases included — the
// original proposal gated only the 5 seeds). Unicode-aware; the repo's own gate is inert for sin.
const {Client}=require('pg');const fs=require('fs'),path=require('path')
const url=fs.readFileSync(path.resolve(__dirname,'../../.env.psql'),'utf8').match(/DATABASE_URL=(.+)/)[1].trim()
const COURSE='eng_for_sin';const {rows}=require('./plan.cjs')
const EDGE=/^[.,?!"'‘’“”()\[\]:;෴…\-–—]+|[.,?!"'‘’“”()\[\]:;෴…\-–—]+$/g
const tok=s=>String(s||'').normalize('NFC').split(/\s+/).map(w=>w.replace(EDGE,'')).filter(Boolean)
;(async()=>{const db=new Client({connectionString:url,ssl:{rejectUnauthorized:false}});await db.connect()
const legos=(await db.query(`select seed_number,known_text,components from course_legos where course_code=$1`,[COURSE])).rows
const taught=new Map()
for(const l of legos){
 const strs=[l.known_text];let c=l.components
 if(typeof c==='string'){try{c=JSON.parse(c)}catch(e){c=null}}
 const walk=v=>{if(!v)return;if(typeof v==='string')strs.push(v);else if(Array.isArray(v))v.forEach(walk);else if(typeof v==='object')Object.values(v).forEach(walk)}
 walk(c)
 for(const t of new Set(strs.filter(x=>typeof x==='string').flatMap(tok)))
  if(!taught.has(t)||taught.get(t)>l.seed_number)taught.set(t,l.seed_number)
}
const br=(text,n)=>tok(text).map(x=>({x,d:taught.has(x)?taught.get(x):null})).filter(y=>y.d===null||y.d>n)
let bad=0
console.log('row'.padEnd(15),'before'.padEnd(7),'after')
for(const r of rows){
 const b=br(r.old_text,r.seed),a=br(r.new_text,r.seed)
 const lbl=r.kind==='seed'?'seed '+r.seed:'s'+r.seed+'L'+r.lego_index+'p'+r.position
 if(a.length)bad++
 console.log(`${lbl.padEnd(15)}${String(b.length).padEnd(7)}${a.length}   ${a.length?'RESIDUAL: '+a.map(y=>y.x+'@'+(y.d??'NEVER')).join(' '):''}`)
}
console.log(`\n${rows.length} rows; ${bad} still carry a residual flagged token after the fix`)
await db.end()})().catch(e=>{console.error('FATAL',e.message);process.exit(1)})
