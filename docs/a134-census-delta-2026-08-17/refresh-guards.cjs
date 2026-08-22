// Re-read every target row's CURRENT text immediately before applying, and:
//   * drop rows a sibling worker has already brought to my target text
//   * re-point the optimistic-lock guard at what is actually there now
//   * re-run the collision pre-check, because clips are being inserted into this course
//     by other live workers (243 in the last 2 hours) and a clear pre-check goes stale.
const {q}=require('./db.cjs'); const fs=require('fs');
const SHIP='/home/tomcassidy/SSi/ssi-dashboard-v7-clean/.worktrees/a134-delta/docs/a134-census-delta-2026-08-17/ship-log.json';
const VOICE='azure_si-LK-SameeraNeural';
(async()=>{
 const ship=JSON.parse(fs.readFileSync(SHIP,'utf8'));
 const out=[], skipped=[], reuse=[];
 for(const w of ship){
   const rows=[];
   for(const r of w.rows){
     let cur;
     if(r.layer==='phrase') cur=(await q(`select known_text k from course_practice_phrases where id=$1`,[r.id]))[0].k;
     else if(r.layer==='lego') cur=(await q(`select known_text k from course_legos where id=$1`,[r.id]))[0].k;
     else cur=(await q(`select known_text k from course_seeds where course_code='eng_for_sin' and seed_number=398`))[0].k;
     if(cur===r.new){ skipped.push({id:r.id,reason:'already at my target text (sibling worker got there first)'}); continue; }
     if(cur!==r.old){ console.log(`  guard refreshed ${String(r.id).replace('eng_for_sin:','')}: "${r.old}" -> "${cur}"`); r.old_at_analysis=r.old; r.old=cur; }
     rows.push(r);
   }
   if(!rows.length){ continue; }
   // fresh collision check
   const n=(await q('select normalize_text($1) t',[w.text]))[0].t;
   const hit=(await q(`select id::text id, text, duration_ms from course_audio
      where course_code='eng_for_sin' and text_normalized=$1 and language=canonical_language('sin')
        and role='known' and voice_id=canonical_voice_id($2)`,[n,VOICE]))[0];
   if(hit){ reuse.push({slug:w.slug,reuse_id:hit.id,ms:hit.duration_ms}); out.push({...w,rows,reuse_existing:hit}); }
   else out.push({...w,rows});
 }
 fs.writeFileSync(SHIP.replace('ship-log.json','ship-log-refreshed.json'),JSON.stringify(out,null,1));
 console.log(`\nrows dropped (already correct): ${skipped.length}`); skipped.forEach(s=>console.log('   '+s.id+' — '+s.reason));
 console.log(`clips to REUSE instead of insert: ${reuse.length}`); reuse.forEach(r=>console.log('   '+r.slug+' -> '+r.reuse_id));
 console.log(`clip groups to apply: ${out.length}`);
})();
