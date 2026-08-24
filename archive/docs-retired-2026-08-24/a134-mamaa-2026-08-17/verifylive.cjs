// A-134 මමා — verify LIVE, exactly as a learner receives it.
// Fetch /api/audio/<id> as a PATH SEGMENT (not ?id=), assert HTTP 200, md5 the
// served body against the gated take on disk, and decode the served bytes to
// confirm the duration matches duration_ms. Then re-read the token array from the
// DB and assert zero මමා.
const {q}=require('./db.cjs');
const fs=require('fs'), crypto=require('crypto'), cp=require('child_process');
const applied=require('./link-applied.json').log.filter(r=>r.applied);
const BASE='https://ssi-learning-app.vercel.app/api/audio/';

const md5=b=>crypto.createHash('md5').update(b).digest('hex');
function probeMs(file){
  return Math.round(parseFloat(cp.execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${file}"`,{shell:'/bin/bash'}).toString().trim())*1000);
}
(async()=>{
  const out=[]; let ok=0, bad=0;
  for(const r of applied){
    const id=r.new_clip_id;
    const tmp=`/tmp/live-${id}.mp3`;
    let code='ERR', served=null;
    try{
      code=cp.execSync(`curl -s -o ${tmp} -w '%{http_code}' '${BASE}${id}'`,{shell:'/bin/bash'}).toString().trim();
      served=fs.readFileSync(tmp);
    }catch(e){}
    const local=r.kind==='presentation'
      ? fs.readFileSync(`${__dirname}/ship/${r.lego}.mp3`)
      : fs.readFileSync(`${__dirname}/ship/${r.id.replace(/[^A-Za-z0-9]/g,'_')}.mp3`);
    const rec={ id, kind:r.kind, who:r.lego||r.id, http:code,
      servedBytes: served?served.length:0, localBytes: local.length,
      md5Served: served?md5(served):null, md5Local: md5(local),
      md5Match: served? md5(served)===md5(local) : false,
      declaredMs: r.ms, servedMs: served?probeMs(tmp):null };
    rec.durationMatch = rec.servedMs!==null && Math.abs(rec.servedMs-rec.declaredMs)<=60;
    rec.pass = code==='200' && rec.md5Match && rec.durationMatch;
    if(rec.pass) ok++; else { bad++; console.log('FAIL',JSON.stringify(rec)); }
    out.push(rec);
    try{fs.unlinkSync(tmp)}catch(e){}
  }
  console.log(`\nLIVE FETCH: ${ok}/${applied.length} pass (HTTP 200 + md5 identical to gated take + decoded duration within 60ms)`);
  if(bad) console.log(`${bad} FAILED`);

  // ---- and the real question: does the DB now say the learner hears no මමා? ----
  const legoIds=applied.filter(r=>r.kind==='presentation').map(r=>r.lego);
  const phrIds=applied.filter(r=>r.kind==='phrase').map(r=>r.id);
  const nowLego=await q(`select l.lego_id, a.id::text aid, a.text, a.word_boundaries
     from course_legos l join course_audio a on a.id::text=l.presentation_audio_id
     where l.course_code='eng_for_sin' and l.lego_id = any($1::text[])`,[legoIds]);
  const nowPhr=await q(`select p.id, p.known_text, a.id::text aid, a.text, a.word_boundaries
     from course_practice_phrases p join course_audio a on a.id=p.known_audio_id
     where p.course_code='eng_for_sin' and p.id = any($1::text[])`,[phrIds]);
  const hasM=r=>(r.word_boundaries||[]).some(t=>(t.text||'').includes('මමා'));
  console.log(`\nDB re-read: ${nowLego.length}/${legoIds.length} lego links resolve to a clip`);
  console.log(`  clips whose TEXT still contains මමා : ${nowLego.filter(r=>r.text.includes('මමා')).length}`);
  console.log(`  clips whose TOKEN ARRAY voices මමා  : ${nowLego.filter(hasM).length}`);
  console.log(`DB re-read: ${nowPhr.length}/${phrIds.length} phrase links resolve to a clip`);
  console.log(`  phrase known_text still contains මමා: ${nowPhr.filter(r=>r.known_text.includes('මමා')).length}`);
  console.log(`  phrase clips voicing මමා            : ${nowPhr.filter(hasM).length}`);
  nowPhr.forEach(r=>console.log(`   ${r.id}: known_text=${JSON.stringify(r.known_text)} tokens=${JSON.stringify((r.word_boundaries||[]).map(t=>t.text))}`));

  // ---- and the whole-course position: how many reachable මමා clips remain? ----
  const M='මමා';
  const remain=await q(`select count(*)::int n from course_audio m
     join course_legos l on l.presentation_audio_id=m.id::text
     where m.course_code='eng_for_sin' and m.text like $1`,['%'+M+'%']);
  const remainP=await q(`select count(*)::int n from course_audio m
     join course_practice_phrases p on (p.known_audio_id=m.id or p.target1_audio_id=m.id or p.target2_audio_id=m.id or p.presentation_audio_id=m.id)
     where m.course_code='eng_for_sin' and m.text like $1`,['%'+M+'%']);
  console.log(`\nWHOLE COURSE, reachable clips still carrying මමා: ${remain[0].n} via legos + ${remainP[0].n} via phrases = ${remain[0].n+remainP[0].n}`);
  const total=await q(`select count(*)::int n from course_audio where course_code='eng_for_sin' and text like $1`,['%'+M+'%']);
  console.log(`(unlinked rows carrying මමා, deliberately untouched: ${total[0].n-(remain[0].n+remainP[0].n)})`);
  fs.writeFileSync(__dirname+'/live-verify.json',JSON.stringify(out,null,1));
})().catch(e=>{console.error('ERR',e.message);process.exit(1)});
