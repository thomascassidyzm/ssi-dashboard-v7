const fs=require('fs');const apply=process.argv[2]==='--apply';
const plan=require('./plan.json');
(async()=>{for(const c in plan){const course=`cym_${c}_for_eng`;const j=require('./'+c+'.json');
const m=new Map();for(const s of j.seeds){m.set('seed|'+s.seed_number,s);for(const l of s.legos||[]){m.set('lego|'+l.lego_id,l);for(const x of l.basket_phrases||[])m.set('phrase|'+x.id,x)}}
const ops=plan[c].map(r=>{const o=m.get(r.kind+'|'+r.key);
 const expect={known_text:r.old,target_text:r.welsh,known_audio_id:o.known_audio_id||null,target1_audio_id:o.target1_audio_id||null,target2_audio_id:o.target2_audio_id||null};
 const id=r.kind==='seed'?{op:'seed.update',seed_number:r.key}:r.kind==='lego'?{op:'lego.update',lego_id:r.key}:{op:'phrase.update',phrase_id:r.key};
 return {...id,set:{known_text:r.new},expect}});
const res=await fetch(`http://localhost:3470/api/production/${course}/edit-batch`,{method:'POST',headers:{'content-type':'application/json','x-agent-id':'aran-watson-873-dianc-escape'},body:JSON.stringify({ops,apply})});
const js=await res.json();fs.writeFileSync(`${c}.${apply?'applied':'dryrun'}.json`,JSON.stringify(js,null,1));
let lost=0;for(const r of js.results||[])for(const k of ['known_audio_id','target1_audio_id','target2_audio_id','presentation_audio_id'])if(r.before&&r.after&&k in r.before&&(r.before[k]||null)!==(r.after[k]||null))lost++;
console.log(c,res.status,'ok',js.ok,'applied',js.applied,'ops',ops.length,'results',(js.results||[]).length,'linksChanged',lost,'undo',js.undo_file||'',js.ok?'':JSON.stringify(js).slice(0,500));}})();
