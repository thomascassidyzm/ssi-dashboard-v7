// A-134 මමා: independent re-derivation of the REACHABLE set.
// Covers ALL 13 audio-holder columns in the estate, not the 5 that job #874's
// pull.cjs checked. A learner resolves audio by course_audio.id, so "reachable"
// means: some holder column in a live content table points at this row.
const {q}=require('./db.cjs');
const fs=require('fs');

// (table, column, cast) — presentation_audio_id on course_legos is TEXT, the rest uuid.
const HOLDERS=[
  ['course_legos','known_audio_id','uuid'],
  ['course_legos','presentation_audio_id','text'],
  ['course_legos','target1_audio_id','uuid'],
  ['course_legos','target2_audio_id','uuid'],
  ['course_practice_phrases','known_audio_id','uuid'],
  ['course_practice_phrases','presentation_audio_id','uuid'],
  ['course_practice_phrases','target1_audio_id','uuid'],
  ['course_practice_phrases','target2_audio_id','uuid'],
  ['course_seeds','known_audio_id','uuid'],
  ['course_seeds','target1_audio_id','uuid'],
  ['course_seeds','target2_audio_id','uuid'],
  ['lego_introductions','audio_uuid','uuid'],
  ['lego_introductions','presentation_audio_id','uuid'],
];

(async()=>{
  const M='මමා';
  // 1. the raw text-match population, no join. Cheap, bounded by course.
  const all=await q(`select id from course_audio where course_code='eng_for_sin' and text like $1`,['%'+M+'%']);
  console.log('course_audio rows in eng_for_sin whose stored text contains M:',all.length);

  // 2. per-holder-column reachability. Two cheap queries per column beats one
  //    correlated monster (that pattern already timed out at 120s on this plate).
  const hits=new Map();
  for(const [t,c,cast] of HOLDERS){
    const cmp = cast==='text' ? `h.${c} = m.id::text` : `h.${c} = m.id`;
    const rows=await q(`
      select m.id, h.${c}::text as ref
      from course_audio m join ${t} h on ${cmp}
      where m.course_code='eng_for_sin' and m.text like $1`,['%'+M+'%']);
    if(rows.length) console.log(`  ${t}.${c}: ${rows.length}`);
    for(const r of rows){
      if(!hits.has(r.id)) hits.set(r.id,[]);
      hits.get(r.id).push(`${t}.${c}`);
    }
  }
  console.log('DISTINCT reachable course_audio rows:',hits.size);
  console.log('UNLINKED (leave alone):',all.length-hits.size);

  // 3. hydrate the reachable set with everything needed downstream.
  const ids=[...hits.keys()];
  const det=await q(`select id,text,text_stripped,duration_ms,role,voice_id,language,origin,
                            word_boundaries,s3_key,created_at,text_normalized
                     from course_audio where id = any($1::uuid[])`,[ids]);
  const byId=new Map(det.map(r=>[r.id,r]));

  // 4. attach the holder rows (lego / phrase context) for each.
  const legos=await q(`select lego_id,seed_number,known_text,target_text,presentation_audio_id,
                              known_audio_id::text kaid,target1_audio_id::text t1,target2_audio_id::text t2
                       from course_legos where course_code='eng_for_sin'
                         and (presentation_audio_id = any($1::text[])
                           or known_audio_id = any($1::uuid[])
                           or target1_audio_id = any($1::uuid[])
                           or target2_audio_id = any($1::uuid[]))`,[ids]);
  const phrases=await q(`select id,lego_id,seed_number,known_text,target_text,
                                known_audio_id::text kaid,presentation_audio_id::text paid,
                                target1_audio_id::text t1,target2_audio_id::text t2
                         from course_practice_phrases where course_code='eng_for_sin'
                           and (known_audio_id = any($1::uuid[]) or presentation_audio_id = any($1::uuid[])
                             or target1_audio_id = any($1::uuid[]) or target2_audio_id = any($1::uuid[]))`,[ids]);

  const out=ids.map(id=>{
    const a=byId.get(id);
    const holders=hits.get(id);
    const lg=legos.filter(l=>l.presentation_audio_id===id||l.kaid===id||l.t1===id||l.t2===id);
    const ph=phrases.filter(p=>p.kaid===id||p.paid===id||p.t1===id||p.t2===id);
    return {id, holders, audio:a, legos:lg, phrases:ph};
  });
  fs.writeFileSync(__dirname+'/scope.json',JSON.stringify(out,null,1));
  console.log('word_boundaries NULL among reachable:',out.filter(o=>!o.audio.word_boundaries).length);
  console.log('distinct legos touched:',new Set(out.flatMap(o=>o.legos.map(l=>l.lego_id))).size);
  console.log('distinct phrases touched:',new Set(out.flatMap(o=>o.phrases.map(p=>p.id))).size);
  // does any lego in the course still carry M in its own text?
  const cardsWithM=await q(`select lego_id,seed_number,'known' side,known_text t from course_legos
      where course_code='eng_for_sin' and known_text like $1
    union all select lego_id,seed_number,'target',target_text from course_legos
      where course_code='eng_for_sin' and target_text like $1`,['%'+M+'%']);
  console.log('course_legos rows whose OWN text still contains M:',cardsWithM.length,JSON.stringify(cardsWithM));
  const phWithM=await q(`select id,lego_id,seed_number,'known' side,known_text t from course_practice_phrases
      where course_code='eng_for_sin' and known_text like $1
    union all select id::text,lego_id,seed_number,'target',target_text from course_practice_phrases
      where course_code='eng_for_sin' and target_text like $1`,['%'+M+'%']);
  console.log('course_practice_phrases rows whose OWN text still contains M:',phWithM.length,JSON.stringify(phWithM));
  const sdWithM=await q(`select seed_number,'known' side,known_text t from course_seeds
      where course_code='eng_for_sin' and known_text like $1
    union all select seed_number,'target',target_text from course_seeds
      where course_code='eng_for_sin' and target_text like $1`,['%'+M+'%']);
  console.log('course_seeds rows whose OWN text still contains M:',sdWithM.length,JSON.stringify(sdWithM));
})().catch(e=>{console.error('ERR',e.message);process.exit(1)});
