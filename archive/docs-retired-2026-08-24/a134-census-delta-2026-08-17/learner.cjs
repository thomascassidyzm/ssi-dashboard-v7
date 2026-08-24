const {q}=require('./db.cjs'); const fs=require('fs'), cp=require('child_process'), crypto=require('crypto');
const clips=require('./verify-clips.json');
const applied=require('../../docs/a134-census-delta-2026-08-17/link-applied-log.json');
const presApplied=require('../../docs/a134-census-delta-2026-08-17/link-pres-applied-log.json');
const md5By={}; applied.forEach(a=>{if(a.md5)md5By[a.new_clip_id]=a.md5}); presApplied.forEach(a=>{if(a.md5)md5By[a.new_clip_id]=a.md5});
const targets=[...clips.map(c=>({id:c.clip,label:String(c.id).replace('eng_for_sin:',''),text:c.text})),
  ...presApplied.map(p=>({id:p.new_clip_id,label:'PRES-'+p.lego,text:p.text}))];
(async()=>{
 let pass=0, fail=[];
 for(const t of targets){
  const row=(await q(`select duration_ms from course_audio where id=$1`,[t.id]))[0];
  const url=`https://ssi-learning-app.vercel.app/api/audio/${t.id}`;
  const tmp=`/tmp/lv-${t.id}.mp3`;
  const code=cp.execSync(`curl -s -o ${tmp} -w '%{http_code}' '${url}'`,{shell:'/bin/bash'}).toString().trim();
  let dur=null, md5=null, bytes=0;
  try{ dur=Math.round(parseFloat(cp.execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 ${tmp}`,{shell:'/bin/bash'}).toString().trim())*1000);
       const b=fs.readFileSync(tmp); bytes=b.length; md5=crypto.createHash('md5').update(b).digest('hex'); }catch(e){}
  const expMd5=md5By[t.id];
  const okCode=code==='200', okDur=dur!==null&&Math.abs(dur-row.duration_ms)<=60, okMd5=expMd5?md5===expMd5:null;
  const good=okCode&&okDur&&(okMd5!==false);
  if(good)pass++; else fail.push({...t,code,dur,db:row.duration_ms,md5,expMd5});
  console.log(`${good?'OK  ':'FAIL'} ${t.label.padEnd(16)} ${code} served=${dur}ms db=${row.duration_ms}ms ${bytes}B md5${okMd5===null?'(n/a)':okMd5?'=match':'=MISMATCH'}`);
  fs.unlinkSync(tmp);
 }
 console.log(`\nlearner-path pass: ${pass}/${targets.length}`);
 if(fail.length) console.log(JSON.stringify(fail,null,1));
})();
