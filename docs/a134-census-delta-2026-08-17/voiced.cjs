const {q}=require('./db.cjs');
const rows=require('./rederived.json');
const brief=require('/home/tomcassidy/SSi/ssi-dashboard-v7-clean/.worktrees/a134/.a74-scratch/census-delta.json');
(async()=>{
  const ids=rows.map(r=>r.known_audio_id).filter(Boolean);
  const clips=await q(`select id,text,voice_id,duration_ms,word_boundaries,s3_key,created_at,audio_revision,role,language
     from course_audio where id = any($1::uuid[])`, [ids]);
  const byId=Object.fromEntries(clips.map(c=>[c.id,c]));
  const briefIds=new Set(brief.map(b=>b.id));
  let voiced=0, missing=0, nowb=0;
  for(const r of rows){
    const c=r.known_audio_id?byId[r.known_audio_id]:null;
    const inBrief=briefIds.has(r.id);
    if(!c){ console.log('NO CLIP', r.id); missing++; continue; }
    const wb=c.word_boundaries;
    const toks = Array.isArray(wb) ? wb.map(w=>w.text??w.word??w.t) : (wb&&wb.words? wb.words.map(w=>w.text??w.word):null);
    if(!toks){ nowb++; console.log('NO WB', r.id, JSON.stringify(wb).slice(0,120)); continue; }
    // does the defective token appear in the spoken token stream?
    console.log([inBrief?'[18]':'[EXTRA]', r.id, 'dur='+c.duration_ms, 'ntok='+toks.length].join(' '));
    console.log('   DBtext : '+c.text);
    console.log('   phrase : '+r.known_text);
    console.log('   spoken : '+JSON.stringify(toks));
    if(c.text===r.known_text) voiced++;
  }
  console.log('\nclip text === phrase text:', voiced, '/', rows.length, 'missing', missing, 'no-wb', nowb);
})();
