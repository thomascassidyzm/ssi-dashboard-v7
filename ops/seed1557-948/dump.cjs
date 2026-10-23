'use strict';
// #948: read-only dump (via Popty) of seed 1557 in both courses.
const fs=require('fs');
(async()=>{for(const c of ['cym_nv2_for_eng','cym_sv2_for_eng']){
const d=await (await fetch(`http://localhost:3470/api/production/${c}/seeds?status=all`,{headers:{'x-agent-id':'aran-watson-948'}})).json();
const s=d.seeds.find(x=>x.seed_number==1557);
fs.writeFileSync(`${__dirname}/${c}.seed1557.json`,JSON.stringify(s,null,1));
console.log('==',c,s.known_text,'|',s.target_text);
for(const l of s.legos){console.log('LEGO',l.lego_id,JSON.stringify(l.known_text),'|',l.target_text,'comps',JSON.stringify(l.components));
for(const p of l.basket_phrases||[])console.log('  ',p.id.split(':')[1],p.known_text,'|',p.target_text,'||',(p.decomposition||[]).map(g=>g.known+'='+g.legoId).join(' / '));}
}})();
