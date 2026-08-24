// Independent re-verification of the untaught-word rule, straight from the DB.
require('dotenv').config({path:'.env.psql'});
const {Client}=require('pg');
const norm=t=>(t||'').toLowerCase().replace(/[.,!?;:¿¡«»""]/g,'').replace(/\s+/g,' ').trim();
(async()=>{
const c=new Client({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}});await c.connect();
const legos=(await c.query("select seed_number,lego_index,type,known_text,target_text,components from course_legos where course_code='vec_for_eng' order by seed_number,lego_index")).rows;
const phrases=(await c.query("select seed_number,lego_index,position,phrase_role,known_text,target_text from course_practice_phrases where course_code='vec_for_eng' order by seed_number,lego_index,position")).rows;
const vocab=new Set(); let checked=0,bad=0;
const tile=(t)=>{const chunks=[...vocab].map(v=>norm(v).split(' ').filter(Boolean));
 const w=norm(t).split(' ').filter(Boolean); const dp=new Array(w.length+1).fill(false); dp[0]=true;
 for(let i=0;i<w.length;i++){if(!dp[i])continue;for(const ch of chunks){if(i+ch.length>w.length)continue;if(ch.every((x,j)=>x===w[i+j]))dp[i+ch.length]=true;}}
 if(dp[w.length])return null; let last=0;for(let i=0;i<=w.length;i++)if(dp[i])last=i; return w.slice(last).join(' ');};
for(const g of legos){
  const avail=[g.target_text,...(g.components||[]).map(x=>x.target)];
  avail.forEach(v=>vocab.add(v));
  for(const p of phrases.filter(p=>p.seed_number===g.seed_number&&p.lego_index===g.lego_index)){
    if(p.phrase_role==='component')continue;
    checked++; const u=tile(p.target_text);
    if(u){bad++;console.log(`UNTAUGHT S${p.seed_number}L${p.lego_index} [${p.phrase_role}] "${p.target_text}" -> "${u}"`);}
  }
}
console.log(`\nuntaught-word check: ${checked} phrases checked, ${bad} violations`);
const seedsBad=[];
for(const s of [...new Set(legos.map(l=>l.seed_number))]){
  // rebuild vocab up to end of this seed then test the seed target
}
await c.end();})().catch(e=>{console.error(e.message);process.exit(1)});
