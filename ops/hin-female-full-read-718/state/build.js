const d=require('./seeds.json'), exp=require('./exp.json');
const E=new Map(exp.map(r=>[r.original_text,r]));
const T=new Map(); // text -> entry
const seedCtx={};
const add=(kind,id,sn,k,t,a1,a2)=>{ if(!t) return; let e=T.get(t); if(!e){e={t,occ:[],minSeed:sn};T.set(t,e)} e.minSeed=Math.min(e.minSeed,sn); e.occ.push({kind,id,sn,en:k,a1,a2}); };
let phraseIds=new Set();
for(const s of d.seeds){ seedCtx[s.seed_number]={en:s.known_text,hi:s.target_text};
  add('seed',s.seed_id,s.seed_number,s.known_text,s.target_text,s.target1_audio_id,s.target2_audio_id);
  for(const l of s.legos){ add('lego',l.lego_id,s.seed_number,l.known_text,l.target_text,l.target1_audio_id,l.target2_audio_id);
    for(const p of l.basket_phrases){ if(phraseIds.has(p.id)) continue; phraseIds.add(p.id); add(p.phrase_role||'phrase',p.id,p.seed_number??s.seed_number,p.known_text,p.target_text,p.target1_audio_id,p.target2_audio_id);} } }
const all=[...T.values()].sort((a,b)=>a.minSeed-b.minSeed||a.t.localeCompare(b.t));
let n=0; for(const e of all){ e.n=++n; const x=E.get(e.t); e.stored=x?{f:x.expanded_f,m:x.expanded_m}:null; }
console.log('distinct texts',all.length,'rows',all.reduce((a,e)=>a+e.occ.length,0),'phrases',phraseIds.size, 'with stored',all.filter(e=>e.stored).length);
const orphan=exp.filter(r=>!T.has(r.original_text)); console.log('stored expansions whose text is in no row:',orphan.length); orphan.forEach(o=>console.log('  ',o.original_text,'=>',o.expanded_f||o.expanded_m));
require('fs').writeFileSync('all.json',JSON.stringify({all,seedCtx}));
// kind counts
const kc={}; for(const e of all) for(const o of e.occ) kc[o.kind]=(kc[o.kind]||0)+1; console.log(kc);
