'use strict';
// #954 read-only: which census rows carry an English (known) clip, and what the clip is.
const BASE='http://localhost:3470';
const RX=/\b[bf]yddwn\s+ni\b/i;
(async()=>{for(const c of ['cym_nv2_for_eng','cym_sv2_for_eng']){
 const d=await (await fetch(`${BASE}/api/production/${c}/seeds?status=all`,{headers:{'x-agent-id':'aran-watson-954'}})).json();
 const show=(k,id,o)=>console.log(c.slice(0,7),k,id,'| known_audio_id=',o.known_audio_id,'| dec=',JSON.stringify((o.decomposition||[]).map(g=>g.known+'='+g.legoId)));
 const s0=d.seeds[0];if(c.startsWith('cym_nv2'))console.log(Object.keys(s0).join(','));
 for(const s of d.seeds){
  if(RX.test(s.target_text))show('seed',s.seed_number,s);
  for(const l of s.legos){ if(RX.test(l.target_text))show('lego',l.lego_id,l);
   for(const p of l.basket_phrases||[])if(RX.test(p.target_text))show('phrase',String(p.id).split(':').pop(),p);}}}})();
