require('dotenv').config({path:'.env.psql'});
const {Client}=require('pg');
const L=require('./langnames.cjs');
const {hits}=require('./match.cjs');
(async()=>{
const c=new Client({connectionString:process.env.DATABASE_URL});await c.connect();
const courses=Object.fromEntries((await c.query("select course_code,target_lang,known_lang from courses")).rows.map(r=>[r.course_code,r]));
const {rows}=await c.query("select course_code,seed_number,known_text,target_text from course_seeds order by course_code,seed_number");
const extra=[],missing=[];
for(const r of rows){
  const co=courses[r.course_code]; if(!co||co.target_lang==='zzz') continue;
  const nk=new Set(),nt=new Set();
  for(const [code,p] of Object.entries(L)){
    if(hits(p.eng,r.known_text)||(co.known_lang!=='eng'&&hits(p.tgt,r.known_text))) nk.add(code);
    if(hits(p.tgt,r.target_text)) nt.add(code);
  }
  const ex=[...nt].filter(x=>!nk.has(x)&&x!==co.target_lang&&x!==co.known_lang);
  if(ex.length) extra.push({...r,ex});
  // own-name expected: known side names the course's own language but target doesn't
  if(nk.has(co.target_lang)&&!nt.has(co.target_lang)) missing.push({...r,nt:[...nt]});
}
require('fs').writeFileSync('/tmp/lnc4.json',JSON.stringify({extra,missing}));
console.error('extra',extra.length,'missing-own',missing.length);
await c.end();
})().catch(e=>{console.error(e);process.exit(1)});
