const {q}=require('./db.cjs'); const props=require('./proposals.json'); const fs=require('fs');
(async()=>{
 console.log('=== 1. every target row: repaired text + a live link?');
 let ok=0,bad=0; const clips=[];
 for(const p of props){
  let r;
  if(p.layer==='phrase') r=(await q(`select known_text k, known_audio_id::text a, target1_audio_id::text t1, target2_audio_id::text t2 from course_practice_phrases where id=$1`,[p.id]))[0];
  else if(p.layer==='lego') r=(await q(`select known_text k, known_audio_id::text a, presentation_audio_id::text pres from course_legos where id=$1`,[p.id]))[0];
  else r=(await q(`select known_text k, known_audio_id::text a from course_seeds where course_code='eng_for_sin' and seed_number=398`))[0];
  const good = r.k===p.new && r.a;
  if(good){ok++; clips.push({id:p.id,layer:p.layer,clip:r.a,text:p.new});}
  else {bad++; console.log('  BAD',p.id,JSON.stringify(r));}
  if(p.layer==='phrase'&&(!r.t1||!r.t2)) console.log('  NOTE target link null on',p.id,r.t1,r.t2);
 }
 console.log(`  repaired+linked: ${ok}/${props.length}, bad ${bad}`);

 console.log('\n=== 2. does the LINKED clip actually speak the repaired text?');
 let spoke=0;
 for(const c of clips){
   const a=(await q(`select text, duration_ms, word_boundaries from course_audio where id=$1`,[c.clip]))[0];
   const norm=s=>s.replace(/[.?,!]/g,'').replace(/\s+/g,' ').trim();
   const spokenTokens=(a.word_boundaries||[]).map(w=>w.text).join(' ');
   const allWordsVoiced=norm(c.text).split(' ').every(w=>norm(spokenTokens).includes(w));
   if(norm(a.text)===norm(c.text) && allWordsVoiced) spoke++;
   else console.log('  MISMATCH',c.id,'clip says',JSON.stringify(a.text),'wb:',JSON.stringify(spokenTokens));
 }
 console.log(`  clip text == row text AND every word voiced: ${spoke}/${clips.length}`);

 console.log('\n=== 3. course-wide: are my defect classes gone from LEARNER-REACHABLE rows?');
 const P=await q(`select id,seed_number,known_text from course_practice_phrases where course_code='eng_for_sin'`);
 const L=await q(`select seed_number,lego_index,known_text from course_legos where course_code='eng_for_sin'`);
 const S=await q(`select seed_number,known_text from course_seeds where course_code='eng_for_sin' and known_text is not null`);
 const DEV=/[ऀ-ॿ]/,TEL=/[ఀ-౿]/,LAT=/[A-Za-z]/,DEPV=/[්-ෟෲෳ]/;
 const scan=(rows,w)=>rows.filter(r=>{const k=r.known_text||'';
   return DEV.test(k)||TEL.test(k)||LAT.test(k)||k.includes('මමා')||k.includes('අපිේ')||k.includes('ළමාවිල')||k.includes('දිකින')
     ||k.split(' ').some(t=>t&&DEPV.test(t[0]));}).map(r=>({w,...r}));
 const rem=[...scan(P,'phrase'),...scan(L,'lego'),...scan(S,'seed')];
 console.log(`  remaining defective rows course-wide: ${rem.length}`);
 rem.forEach(r=>console.log(`   [${r.w}] s${r.seed_number} ${r.id||('L'+r.lego_index)} :: ${r.known_text}`));
 fs.writeFileSync(__dirname+'/verify-clips.json',JSON.stringify(clips,null,1));
})();
