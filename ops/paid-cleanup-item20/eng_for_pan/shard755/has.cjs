// usage: node has.cjs <course> <LEGO> "en" ... : taught-check + does this English already exist in the course?
const path=require('path');const L=require('/home/tomcassidy/.cs-worktrees/ssi-dashboard-v7-clean/755-item20-plan-shard-urd-pan/ops/paid-cleanup-item20/tools/lib.cjs');
const [course,lego,...c]=process.argv.slice(2);const seeds=L.loadLive(course);
const sn=Number(lego.slice(1,5)),li=Number(lego.slice(6,8));const vocab=new Set();let st='';const T=new Map();let lt='';
const z=t=>L.normalizeForZUT(t,false);
for(const s of seeds){T.set(z(s.target_text),'seed'+s.seed_number);for(const l of s.legos){T.set(z(l.target_text),l.lego_id);if(l.lego_id===lego)lt=l.target_text;for(const p of l.basket_phrases)T.set(z(p.target_text),L.short(p.id)+' '+p.known_text);
 if(s.seed_number<sn||(s.seed_number===sn&&l.lego_index<=li))L.accumulate([l],vocab,false);} if(s.seed_number===sn)st=s.target_text;}
const q=console.log;console.log=()=>{};
for(const e of c){const v=L.checkVocabViolations([{target:e}],vocab,course,{seedNumber:sn,extraTexts:[st]});
 q((v.length?'UNTAUGHT '+v.map(x=>x.unknown).join(','):'ok')+(L.containsLego(course,sn,lt,e)?'':' NO-LEGO')+(T.has(z(e))?' EXISTS '+T.get(z(e)):'')+'  | '+e);}
