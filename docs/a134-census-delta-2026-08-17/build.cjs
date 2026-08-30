const {q}=require('./db.cjs'); const fs=require('fs');
const VS_I='ි', VS_AA='ා', VS_E='ෙ';
(async()=>{
 const P=await q(`select id,seed_number,known_text,target_text,known_audio_id from course_practice_phrases where course_code='eng_for_sin'`);
 const L=await q(`select id,seed_number,lego_index,known_text,target_text,known_audio_id from course_legos where course_code='eng_for_sin'`);
 const S=await q(`select seed_number,known_text,target_text,known_audio_id from course_seeds where course_code='eng_for_sin'`);
 const g=id=>P.find(r=>r.id==='eng_for_sin:'+id);
 const MAMA=g('S0216L01B02').known_text.split(' ')[0];
 const MAAWA_LAWAA=g('S0226L01U01').known_text.split(' ').slice(2,4).join(' ');
 const MINIHEK=P.find(r=>(r.known_text||'').split(' ').includes('මිනිහෙක්')).known_text.split(' ').find(t=>t.includes('ෙක්'));
 const MINIHA=L.find(r=>r.seed_number===226&&r.lego_index===1).known_text.trim();
 const OYAA=g('S0121L03U07').known_text.split(' ')[0];
 const APE=L.find(r=>r.seed_number===454&&r.lego_index===1).known_text.split(' ')[0];
 const LAMAYI=L.find(r=>r.seed_number===580&&r.lego_index===2).known_text.trim();
 const stripFirstVS=(tok)=>tok.slice(0,1)+tok.slice(1).replace(VS_I,'');   // ද+ි+... -> ද+...
 const props=[];
 const P_=(id,fn,note,conf,grp)=>{const r=g(id); const nt=fn(r.known_text);
   props.push({layer:'phrase',id:r.id,seed:r.seed_number,group:grp,old:r.known_text,new:nt,target:r.target_text,audio:r.known_audio_id,note,conf});};

 // GROUP 1
 P_('S0216L01B03', t=>t.split(' ').slice(1).join(' '),
   'DELETE මමා: authored English "a few friends at home" has NO first person; siblings B01/B02/U01 show the bare NP. Overturns brief adjudication (→මම would add an untranslated subject).','high','G1');
 P_('S0226L01U03', t=>{const p=t.split(' '); return [MINIHA, MAAWA_LAWAA.split(' ')[0], ...p.slice(3)].join(' ');},
   'Latin "a" dropped — Sinhala has no article and the seed card noun covers it; ordering-clean (මිනිහෙක් is not introduced until s230). මමා → මාව ලවා (79 phrases). "මම ලවා" occurs 0x in corpus — overturns brief adjudication.','high','G1');
 P_('S0233L01U02', t=>t.split(' ').map(x=>/[ऀ-ॿ]/.test(x)?MAMA:x).join(' '),
   'Devanagari → මම; exact sibling S0233L01U03 has මම in the same slot.','high','G1');
 P_('S0241L01B02', t=>t.split(' ').map(x=>/[ऀ-ॿ]/.test(x)?MAMA:x).join(' '),
   'Devanagari → මම; sibling U05 identical but for tense.','high','G1');
 P_('S0420L03U01', t=>t.split(' ').map(x=>x.startsWith(VS_I)?x.slice(1):x).join(' '),
   'orphan leading ි stripped → කියලා (806 phrases).','high','G1');
 // GROUP 3
 P_('S0121L03U08', t=>[OYAA,...t.split(' ').slice(1)].join(' '),
   'sibling U07 is the same sentence frame with ඔයා in slot 0; seed 121 itself opens ඔයා. Visual-order recovery of ෙමෙක yields no word.','high','G3');
 P_('S0061L03B03', t=>t.split(' ').filter(x=>x!==VS_E).join(' '),
   'orphan ෙ token deleted; sibling U02 renders English "that" with no Sinhala counterpart in the same frame.','medium','G3');
 // GROUP 4 (contested)
 P_('S0151L01U05', t=>t.split(' ').map(x=>x.startsWith('ද'+VS_I)?stripFirstVS(x):x).join(' '),
   'OVERTURN clearance: දිකින has no Sinhala root; දකින is a taught lego (s140) with 73 phrases. Same inserted-vowel-sign mechanism as s420.','medium-high','G4');
 // EXTRA (my re-derivation, not in the 18)
 P_('S0118L02U08', t=>[MAMA,...t.split(' ').slice(1)].join(' '),
   'EXTRA (census missed): Latin "මMA" → මම; 7 siblings at S0118L02 open with මම.','high','EXTRA');
 // GROUP 2: 10 phrases + card + seed
 const APIE_LAMAAWILA = L.find(r=>r.seed_number===398&&r.lego_index===1).known_text;
 const NEW_OUR_CHILDREN = APE+' '+LAMAYI;
 for(const r of P.filter(x=>(x.known_text||'').includes(APIE_LAMAAWILA))){
   props.push({layer:'phrase',id:r.id,seed:r.seed_number,group:'G2',old:r.known_text,
     new:r.known_text.replace(APIE_LAMAAWILA,NEW_OUR_CHILDREN),target:r.target_text,audio:r.known_audio_id,
     note:'cluster repair',conf:'medium-high'});
 }
 const card=L.find(r=>r.seed_number===398&&r.lego_index===1);
 props.push({layer:'lego',id:card.id,seed:398,group:'G2',old:card.known_text,new:NEW_OUR_CHILDREN,target:card.target_text,audio:card.known_audio_id,note:'card',conf:'medium-high'});
 const seed=S.find(r=>r.seed_number===398);
 props.push({layer:'seed',id:'seed398',seed:398,group:'G2',old:seed.known_text,new:seed.known_text.replace(APIE_LAMAAWILA,NEW_OUR_CHILDREN),target:seed.target_text,audio:seed.known_audio_id,note:'seed',conf:'medium-high'});
 fs.writeFileSync(__dirname+'/proposals.json',JSON.stringify(props,null,1));
 console.log('proposals:',props.length);
 for(const p of props) console.log(`[${p.group}] ${p.layer} ${String(p.id).replace('eng_for_sin:','')}\n   OLD: ${p.old}\n   NEW: ${p.new}\n   ENG: ${p.target}`);
})();
