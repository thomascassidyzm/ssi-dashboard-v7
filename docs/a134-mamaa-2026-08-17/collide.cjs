// Collision pre-check against UNIQUE (course_code, text_normalized, language, role, voice_id).
// text_normalized is filled by a BEFORE INSERT trigger from the DB's own
// normalize_text(), so the ONLY safe way to predict a collision is to ask the
// DATABASE to normalise my candidate texts — never a JS lookalike.
const {q}=require('./db.cjs');
const fs=require('fs');

const HOLD=['S0155L01','S0181L01'];   // held for other live workers

(async()=>{
  const plan=require('./plan.json');
  const ship=plan.filter(p=>!HOLD.includes(p.lego));
  console.log('candidates to ship:',ship.length,'(held back:',HOLD.join(', ')+')');

  // 1. normalise every candidate text through the database.
  const texts=ship.map(s=>s.newText);
  const norm=await q(`select t.i, t.txt, normalize_text(t.txt) as tn
                      from unnest($1::text[]) with ordinality as t(txt,i)`,[texts]);
  const tnById=new Map(norm.map(r=>[Number(r.i)-1,r.tn]));
  ship.forEach((s,i)=>{ s.textNormalized=tnById.get(i) });

  // 2. internal collisions — two of MY candidates normalising identically.
  const groups=new Map();
  ship.forEach(s=>{ if(!groups.has(s.textNormalized)) groups.set(s.textNormalized,[]); groups.get(s.textNormalized).push(s.lego) });
  const internal=[...groups.entries()].filter(([,v])=>v.length>1);
  console.log('\nINTERNAL collisions (my candidates colliding with each other):',internal.length);
  internal.forEach(([tn,legos])=>console.log('  ',JSON.stringify(legos),'->',JSON.stringify(tn)));

  // 3. external collisions — an EXISTING row already holds that identity.
  //    The identity is (course_code, text_normalized, language, role, voice_id).
  const tns=[...new Set(ship.map(s=>s.textNormalized))];
  const existing=await q(`select id, text, text_normalized, duration_ms, word_boundaries, s3_key
     from course_audio
     where course_code='eng_for_sin' and language='sin' and role='presentation'
       and voice_id='azure_si-LK-SameeraNeural' and text_normalized = any($1::text[])`,[tns]);
  console.log('\nEXTERNAL collisions (existing rows already holding my identity):',existing.length);
  const exByTn=new Map(existing.map(r=>[r.text_normalized,r]));
  for(const s of ship){
    const e=exByTn.get(s.textNormalized);
    s.collidesWith = e ? {id:e.id, dur:e.duration_ms, text:e.text, hasWb:!!e.word_boundaries} : null;
  }
  const coll=ship.filter(s=>s.collidesWith);
  coll.forEach(s=>console.log(`   ${s.lego}: existing ${s.collidesWith.id} dur=${s.collidesWith.dur} wb=${s.collidesWith.hasWb}`));

  fs.writeFileSync(__dirname+'/ship-plan.json',JSON.stringify(ship,null,1));
  console.log('\nto RENDER (no existing clip):',ship.filter(s=>!s.collidesWith).length);
  console.log('to REUSE  (healthy existing clip, gate-check first):',coll.length);
})().catch(e=>{console.error('ERR',e.message);process.exit(1)});
