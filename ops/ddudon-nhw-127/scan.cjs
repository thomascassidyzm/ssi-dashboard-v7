// Aran job #127 (2026-10-26): find reporting verb (+pronoun) followed directly by a preterite, no linking word.
// Reads JSON saved from Popty GET /api/production/<course>/seeds?status=all (curl, x-agent-id aran-watson-127) as ~/.tmpbig/ddudon-<course>.json. Read-only, no DB.
// Usage: (cd ~/.tmpbig && node scan.cjs out.json). Draft review page: /d/e4d72479.
const fs=require("fs");
const RV='(?:dd?udodd|dd?udest|dd?udon|dd?udes|dd?udoch|dd?wedodd|dd?wedest|dd?wedes|dd?wedon|dd?wedoch)';
const PRON="(?:nhw|o|hi|e|fe|i|ti|chi|ni|fo|fi)";
const re=new RegExp(`(^|[^\\p{L}])(${RV})((?:\\s+${PRON})?)\\s+([\\p{L}’']+)`,'giu');
const out=[];
for(const c of ['cym_nv2_for_eng','cym_sv2_for_eng']){
 const d=JSON.parse(fs.readFileSync(`ddudon-${c}.json`));
 const rows=[];
 for(const s of d.seeds){
  rows.push({c,kind:'seed',id:String(s.seed_number),seed:s.seed_number,t:s.target_text,k:s.known_text,a:[s.target1_audio_id,s.target2_audio_id].filter(Boolean).length});
  for(const l of s.legos){ if(l.is_new) rows.push({c,kind:'lego',id:l.lego_id,seed:s.seed_number,t:l.target_text,k:l.known_text,a:[l.target1_audio_id,l.target2_audio_id].filter(Boolean).length,comps:l.components});
   for(const p of l.basket_phrases||[]) rows.push({c,kind:'phrase',id:p.id,seed:s.seed_number,t:p.target_text,k:p.known_text,a:[p.target1_audio_id,p.target2_audio_id].filter(Boolean).length,lego:l.lego_id});}
 }
 const seen=new Set();
 for(const r of rows){ if(!r.t)continue; re.lastIndex=0; let m; const hits=[];
  while((m=re.exec(r.t))) hits.push({rv:m[2],pron:m[3].trim(),next:m[4].toLowerCase()});
  if(!hits.length)continue; const key=r.c+r.kind+r.id; if(seen.has(key))continue; seen.add(key); out.push({...r,hits});}
}
fs.writeFileSync(process.argv[2],JSON.stringify(out,null,1));
const nx={}; for(const r of out) for(const h of r.hits) nx[h.next]=(nx[h.next]||0)+1;
console.log(out.length, Object.entries(nx).sort((a,b)=>b[1]-a[1]).map(x=>x.join(':')).join(' '));
