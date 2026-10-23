'use strict';
// #951 census: every row in cym_nv2/sv2 mentioning bwcio/trwbwl family. Read-only via Popty.
const BASE='http://localhost:3470';
const RX=/(bwci|fwci|mwci|nhrwbwl|trwbwl|drwbwl|bwcies|trwbl)/i;
(async()=>{for(const c of ['cym_nv2_for_eng','cym_sv2_for_eng']){
 const d=await (await fetch(`${BASE}/api/production/${c}/seeds?status=all`,{headers:{'x-agent-id':'aran-watson-951'}})).json();
 for(const s of d.seeds){
  if(RX.test(s.target_text))console.log(c,'SEED',s.seed_number,'|',s.target_text,'|',s.known_text);
  for(const l of s.legos){
   if(RX.test(l.target_text)&&l.is_new)console.log(c,'LEGO',l.lego_id,'|',l.target_text,'|',JSON.stringify(l.components||[]));
   for(const p of l.basket_phrases||[])if(RX.test(p.target_text))console.log(c,'PHR',p.id,'|',p.target_text,'|',p.known_text||'');
  }}}})();
