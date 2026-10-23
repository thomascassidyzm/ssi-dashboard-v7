'use strict';
// #954 census (read-only via Popty): every row whose Welsh has "(b|f)yddwn ni('n| yn)" + whatever; prints Welsh | English.
const fs=require('fs');
const BASE='http://localhost:3470';
const RX=/\b[bf]yddwn\s+ni\b/i;
(async()=>{const rows=[];for(const c of ['cym_nv2_for_eng','cym_sv2_for_eng']){
 const d=await (await fetch(`${BASE}/api/production/${c}/seeds?status=all`,{headers:{'x-agent-id':'aran-watson-954'}})).json();
 for(const s of d.seeds){
  if(RX.test(s.target_text))rows.push({c,kind:'seed',id:s.seed_number,w:s.target_text,e:s.known_text});
  for(const l of s.legos){
   if(RX.test(l.target_text))rows.push({c,kind:'lego',id:l.lego_id,w:l.target_text,e:l.known_text,comps:l.components});
   for(const p of l.basket_phrases||[])if(RX.test(p.target_text))rows.push({c,kind:'phrase',id:p.id,w:p.target_text,e:p.known_text});
  }}}
 fs.writeFileSync(__dirname+'/census.json',JSON.stringify(rows,null,1));
 for(const r of rows)console.log(r.c.slice(0,7),r.kind,String(r.id).split(':').pop(),'|',r.w,'|',r.e);
})();
