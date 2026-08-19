// Self-calibrating: learn each course's own language-name token from the clean
// "reference" seeds, then check the language-name cluster carries it.
require('dotenv').config({path:'.env.psql'});
const {Client}=require('pg');
const REF=[1,4,9,13,14,15,22,33];           // language-name seeds used as ground truth
const CHK=[64,160,283,285,286,297];         // the cluster the defect lives in
const tok=s=>(s||'').toLowerCase().normalize('NFC').split(/[^\p{L}\p{M}]+/u).filter(Boolean);
const ngr=s=>{const o=new Set();const t=(s||'').replace(/[^\p{Script=Han}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}]/gu,'');for(let n=2;n<=4;n++)for(let i=0;i+n<=t.length;i++)o.add(t.slice(i,i+n));return o};
(async()=>{
const c=new Client({connectionString:process.env.DATABASE_URL});await c.connect();
const {rows}=await c.query("select course_code,seed_number,known_text,target_text from course_seeds where seed_number = any($1) order by course_code,seed_number",[[...REF,...CHK]]);
const bg={};
for(const r of (await c.query("select course_code,target_text from course_seeds where seed_number between 100 and 260")).rows){
  const set=new Set([...tok(r.target_text).map(t=>'W:'+t), ...[...ngr(r.target_text)].map(t=>'N:'+t)]);
  const b=bg[r.course_code]=bg[r.course_code]||{n:0,c:new Map()}; b.n++;
  for(const t of set) b.c.set(t,(b.c.get(t)||0)+1);
}
const by={}; for(const r of rows) (by[r.course_code]=by[r.course_code]||{})[r.seed_number]=r;
for(const [cc,seeds] of Object.entries(by)){
  const ref=REF.map(n=>seeds[n]).filter(Boolean);
  if(ref.length<4) continue;
  // candidate markers: appearing in >=75% of reference seeds
  const count=new Map();
  for(const r of ref){
    const set=new Set([...tok(r.target_text).map(t=>'W:'+t), ...[...ngr(r.target_text)].map(t=>'N:'+t)]);
    for(const t of set) count.set(t,(count.get(t)||0)+1);
  }
  const b=bg[cc]||{n:1,c:new Map()};
  // a marker must be near-universal in the reference seeds AND rare elsewhere in
  // the course - that is what makes it the language name rather than a function word
  const marks=[...count].filter(([t,n])=>n>=Math.ceil(ref.length*0.75)&&(b.c.get(t)||0)/b.n<0.03).map(([t])=>t);
  if(!marks.length){console.log('NO-MARKER',cc);continue}
  for(const n of CHK){
    const r=seeds[n]; if(!r) continue;
    const have=new Set([...tok(r.target_text).map(t=>'W:'+t), ...[...ngr(r.target_text)].map(t=>'N:'+t)]);
    if(!marks.some(m=>have.has(m))) console.log('CLUSTER-ANOMALY',cc,n,'| K:',r.known_text,'|| T:',r.target_text);
  }
}
await c.end();
})().catch(e=>{console.error(e);process.exit(1)});
