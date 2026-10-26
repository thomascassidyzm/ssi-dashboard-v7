const fs=require('fs');
const RX=/\b(sir|madam|ma'am|syr|madam|mrs|mr|miss|ms|esgusod\w*|excuse me)\b/i;
for (const c of ['cym_nv2_for_eng','cym_sv2_for_eng']){
  const d=JSON.parse(fs.readFileSync(c+'.json'));
  const out=[];
  for(const s of d.seeds){
    if(RX.test(s.known_text+' '+s.target_text)) out.push(['seed',s.seed_number,s.seed_id,s.known_text,s.target_text,[s.target1_audio_id,s.target2_audio_id].filter(Boolean).length]);
    for(const l of s.legos){
      if(RX.test(l.known_text+' '+l.target_text+' '+JSON.stringify(l.components||''))) out.push(['lego',s.seed_number,l.lego_id+(l.is_new?' NEW':' ref')+' '+l.type,l.known_text,l.target_text,[l.target1_audio_id,l.target2_audio_id].filter(Boolean).length, JSON.stringify(l.components)]);
      for(const p of l.basket_phrases||[]) if(RX.test(p.known_text+' '+p.target_text)) out.push(['phr',s.seed_number,p.id.split(':')[1]+' '+p.phrase_role,p.known_text,p.target_text,[p.target1_audio_id,p.target2_audio_id].filter(Boolean).length]);
    }
  }
  console.log('##',c,out.length); for(const o of out) console.log(o.join(' | '));
}
