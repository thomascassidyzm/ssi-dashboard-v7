require('dotenv').config({path:__dirname+'/../.env'})
const fs=require('fs');const {Client}=require('pg')
const {normalizeForContainment}=require('../../../services/course-builder/lib/text-normalization.cjs')
const url=fs.readFileSync(__dirname+'/../.env.psql','utf8').match(/DATABASE_URL=(.+)/)[1].trim()
const words=t=>normalizeForContainment(t||'').split(' ').filter(Boolean)
const seg=new Intl.Segmenter('si',{granularity:'grapheme'})
const G=s=>[...seg.segment(s)].map(g=>g.segment)
const findings=require('./reconsider19.json')
;(async()=>{
const db=new Client({connectionString:url,ssl:{rejectUnauthorized:false}});await db.connect()
await db.query("set statement_timeout='180s'")
const legos=(await db.query("select seed_number,known_text,target_text from course_legos where course_code='eng_for_sin' order by seed_number")).rows
const taught=[]
for(const l of legos) for(const w of words(l.known_text)) taught.push({form:w,seed:l.seed_number,eng:l.target_text})
const out=[]
for(const f of findings){
  const fg=G(f.form)
  const cands=[]
  for(const t of taught){
    if(t.seed>f.seed||t.form===f.form) continue
    const tg=G(t.form); let i=0
    while(i<fg.length&&i<tg.length&&fg[i]===tg[i]) i++
    if(i>=2 && i>=0.5*Math.min(fg.length,tg.length))
      cands.push({taught:t.form,seed:t.seed,eng:t.eng,shared:i,added_suffix:fg.slice(i).join(''),taught_suffix:tg.slice(i).join('')})
  }
  cands.sort((a,b)=>b.shared-a.shared||a.seed-b.seed)
  const uniq=[];const s=new Set()
  for(const c of cands){if(!s.has(c.taught)){s.add(c.taught);uniq.push(c)}}
  out.push({...f,best:uniq[0]||null,alts:uniq.slice(1,3)})
}
fs.writeFileSync(__dirname+'/adjudicated2.json',JSON.stringify(out,null,1))
const v=out.filter(o=>o.best),n=out.filter(o=>!o.best)
console.log(`STEM MATCH FOUND (candidate inflectional variant of an already-taught word): ${v.length}`)
for(const o of v) console.log(`  seed${String(o.seed).padStart(3)} "${o.form}" (tool: taught_at=${o.taught_at_seed??'NEVER'})\n        stem "${o.best.taught}" taught seed${o.best.seed} [${o.best.eng}] + suffix "${o.best.added_suffix}"`)
console.log(`\nNO STEM MATCH — need individual judgement: ${n.length}`)
for(const o of n) console.log(`  seed${String(o.seed).padStart(3)} "${o.form}" taught_at=${o.taught_at_seed??'NEVER'}  row=${o.row}\n        text: ${o.new_text}`)
await db.end()})()
