const fs=require('fs');
const RX=/\b(sir|madam|syr)\b/i;
const norm=s=>s.toLowerCase().replace(/[?,.!]/g,'').replace(/\s+/g,' ').trim();
const out={};
const problems=[];
for (const [c,f] of [['cym_nv2_for_eng','drafts-n.tsv'],['cym_sv2_for_eng','drafts-s.tsv']]){
  const d=JSON.parse(fs.readFileSync(c+'.json'));
  const drafts=new Map();
  for(const line of fs.readFileSync(f,'utf8').split('\n')){ if(!line||line.startsWith('#')) continue; const [id,k,t,note]=line.split('\t'); if(drafts.has(id)) problems.push(c+' dup draft '+id); drafts.set(id,{k,t,note}); }
  const rows=[]; const seen=new Set();
  const legoTarget={}; const basket={};
  for(const s of d.seeds){
    if(RX.test(s.known_text+' '+s.target_text)) rows.push({kind:'seed',id:'seed:'+s.seed_number,cur:[s.known_text,s.target_text],t:[s.target1_audio_id,s.target2_audio_id].filter(Boolean).length,ka:!!s.known_audio_id,seed:s.seed_number});
    for(const l of s.legos){
      if(l.is_new) basket[l.lego_id]=(l.basket_phrases||[]);
      if(RX.test(l.known_text+' '+l.target_text+JSON.stringify(l.components||''))) rows.push({kind:'lego',id:'lego:'+l.lego_id,cur:[l.known_text,l.target_text],isNew:l.is_new,type:l.type,comp:l.components,t:[l.target1_audio_id,l.target2_audio_id].filter(Boolean).length,ka:!!l.known_audio_id,seed:s.seed_number});
      for(const p of l.basket_phrases||[]) if(RX.test(p.known_text+' '+p.target_text)) rows.push({kind:'phrase',id:p.id.split(':')[1],full:p.id,role:p.phrase_role,lego:l.lego_id,cur:[p.known_text,p.target_text],t:[p.target1_audio_id,p.target2_audio_id].filter(Boolean).length,ka:!!p.known_audio_id,seed:s.seed_number});
    }
  }
  for(const r of rows){ seen.add(r.id); r.draft=drafts.get(r.id); if(!r.draft) problems.push(c+' NO DRAFT '+r.id+' '+r.cur.join(' | ')); }
  for(const id of drafts.keys()) if(!seen.has(id) && !id.startsWith('new')) problems.push(c+' draft for unknown/non-census id '+id);
  // new LEGO targets
  const L={}; for(const [id,v] of drafts) if(/^(new)?lego:/.test(id)&&v.k!=='DEL') L[id.split(':')[1]]=v.t;
  for(const [id,v] of drafts){
    if(v.k==='DEL'||/^(new)?lego:/.test(id)) continue;
    if(/\bsir\b|\bmadam\b|\bsyr\b/i.test(v.k+' '+v.t)) problems.push(c+' still sir '+id);
    if(/esgusodwch/.test(v.t)){ if(!/\bchi\b|’ch\b/.test(v.t)) problems.push(c+' esgusodwch without chi '+id+' '+v.t);
      if(/\b(ti|wyt|chdi|dy|ddudest|ddwedest)\b|’th\b|\bti’n/.test(v.t)) problems.push(c+' ti-form in esgusodwch line '+id+' '+v.t);}
    if(/excuse me/.test(v.k)!==/esgusodwch fi/.test(v.t)) problems.push(c+' excuse/esgusodwch mismatch '+id);
    const lego=id.match(/^(S\d{4}L\d\d)/); 
    if(lego && !/C\d\d$/.test(id)){ const lt=L[lego[1]]|| (lego[1]==='S1639Lnew'?L['S1639Lnew']:null);
      if(lt && !norm(v.t).includes(norm(lt).replace(/^.*\(reference\)/,''))) problems.push(c+' phrase does not contain its LEGO '+id+' :: '+v.t+' :: LEGO '+lt);}
    // question mark heuristic
    const qs=v.k.split(/(?<=[?.!])\s+/); 
  }
  // duplicates within basket (new text vs other new text or untouched phrases)
  const byLego={};
  for(const [id,v] of drafts){ const m=id.match(/^(?:new:)?(S\d{4}L(?:\d\d|new))/); if(!m||v.k==='DEL'||id.startsWith('lego')) continue; (byLego[m[1]]=byLego[m[1]]||[]).push([id,norm(v.t)]); }
  for(const [lg,arr] of Object.entries(byLego)){ const others=(basket[lg]||[]).filter(p=>!drafts.has(p.id.split(':')[1])).map(p=>[p.id.split(':')[1],norm(p.target_text)]); const all=arr.concat(others); const m=new Map(); for(const [i,t] of all){ if(m.has(t)) problems.push(c+' DUPLICATE in '+lg+': '+m.get(t)+' & '+i+' = '+t); m.set(t,i);} }
  out[c]={rows,drafts:[...drafts].map(([id,v])=>({id,...v}))};
}
fs.writeFileSync('built.json',JSON.stringify(out));
console.log(problems.join('\n')||'no problems');
for(const c in out) console.log(c,'census rows',out[c].rows.length,'drafts',out[c].drafts.length);
