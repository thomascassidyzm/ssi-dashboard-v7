require('dotenv').config({path:__dirname+'/../.env'});
const fs=require('fs');const {Client}=require('pg');
const url=fs.readFileSync(__dirname+'/../.env.psql','utf8').match(/DATABASE_URL=(.+)/)[1].trim();
const I=3143,S=45.4,SD=221;
(async()=>{const db=new Client({connectionString:url,ssl:{rejectUnauthorized:false}});await db.connect();
await db.query("set statement_timeout='120s'");
const q=await db.query(`select text,duration_ms from course_audio
  where course_code='eng_for_sin' and role='presentation' and duration_ms is not null`);
const ell=[],noell=[];
for(const r of q.rows){
  const z=(r.duration_ms-(I+S*r.text.length))/SD;
  if(!isFinite(z))continue;
  (r.text.includes('...')?ell:noell).push(z);
}
const stat=a=>{const m=a.reduce((x,y)=>x+y,0)/a.length;const sd=Math.sqrt(a.reduce((x,y)=>x+(y-m)**2,0)/a.length);
  const s=[...a].sort((x,y)=>x-y);return {n:a.length,mean:+m.toFixed(2),sd:+sd.toFixed(2),median:+s[s.length>>1].toFixed(2),over3:a.filter(v=>Math.abs(v)>3).length};};
console.log('presentation clips WITHOUT ellipsis:',JSON.stringify(stat(noell)));
console.log('presentation clips WITH "..." :',JSON.stringify(stat(ell)));
const pct=a=>a.length?(100*a.filter(v=>Math.abs(v)>3).length/a.length).toFixed(1):'-';
console.log('share exceeding |z|>3  — without:',pct(noell)+'%','| with ellipsis:',pct(ell)+'%');
await db.end()})()
