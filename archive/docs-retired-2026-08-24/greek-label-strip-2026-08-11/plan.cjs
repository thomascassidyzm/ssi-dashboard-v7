const fs=require('fs');
const legos=require('./legos.json'), pres=require('./pres.json');
const legoById=new Map(legos.map(l=>[l.lego_id,l]));
const tagged=pres.filter(p=>/\(/.test(p.text||''));
const byKnown=new Map();
for(const l of legos){const k=(l.known_text||'').trim().toLowerCase(); if(!byKnown.has(k))byKnown.set(k,[]); byKnown.get(k).push(l);}
const byText=new Map();
for(const p of pres){const k=(p.text||'').trim(); if(!byText.has(k))byText.set(k,[]); byText.get(k).push(p);}
const plan=tagged.map(p=>{
  const l=legoById.get(p.lego_id);
  const after=`The Greek for: '${l.known_text}', is:`;
  const m=p.text.match(/for:\s*'(.*?)',\s*is:/);
  const stripOnly=m?m[1].replace(/\s*\([^)]*\)?/,'').trim():null;
  const grp=byKnown.get((l.known_text||'').trim().toLowerCase())||[];
  const twins=(byText.get(after)||[]).filter(c=>{const cl=legoById.get(c.lego_id);return cl&&(cl.target_text||'').trim()===(l.target_text||'').trim();});
  return {
    lego_id:p.lego_id, audio_id:p.id,
    before:p.text, after,
    mirror_correction: stripOnly!==null && stripOnly.toLowerCase()!==(l.known_text||'').toLowerCase(),
    strip_only_would_be: stripOnly,
    lego_known_text:l.known_text, lego_target_text:l.target_text,
    zut_group_size:grp.length,
    zut_distinct_targets:new Set(grp.map(x=>(x.target_text||'').trim())).size,
    identical_clean_clip_exists: twins.length>0,
    twin_audio_ids: twins.map(t=>t.id),
    snapshot:{ s3_key:p.s3_key, duration_ms:p.duration_ms, voice_id:p.voice_id, audio_revision:p.audio_revision,
      linked_from_lego: legos.filter(x=>x.presentation_audio_id===p.id).map(x=>x.lego_id) },
  };
});
fs.writeFileSync(process.argv[2],JSON.stringify({generated_for:'ell_for_eng',rows:plan.length,plan},null,1));
console.log('rows',plan.length,
 '| mirror corrections',plan.filter(r=>r.mirror_correction).length,
 '| zut divergent',plan.filter(r=>r.zut_distinct_targets>1).length,
 '| reusable twin',plan.filter(r=>r.identical_clean_clip_exists).length,
 '| linked via link-column',plan.filter(r=>r.snapshot.linked_from_lego.length).length);
