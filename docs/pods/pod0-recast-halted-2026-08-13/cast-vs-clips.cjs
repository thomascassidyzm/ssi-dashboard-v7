// For each current pod-0, compare the CAST voice each English slot should have
// against the ACTUAL voice of the clip linked into that slot.
const { Client } = require('pg');
require('dotenv').config({ path: '.env.psql' });
const { resolveCurrentPod0 } = require('../../services/pod-voice-approvals.cjs');
const canon = (s)=>String(s||'').replace(/\s*\([^)]*\)\s*/g,' ').replace(/\s+/g,' ').trim();
function resolve(m, speaker, track){ m=m||{}; const e=m[canon(speaker)]||m[speaker]||m._default; if(!e) return null;
  if(e[track]&&e[track].voice_id) return e[track].voice_id;
  if(track==='target'&&e.voice_id) return e.voice_id; return null; }
const norm = (v)=>String(v||'').replace(/^(xai_|azure_|human_)/,'');
(async()=>{
  const c=new Client({connectionString:process.env.DATABASE_URL}); await c.connect();
  const pods=(await c.query("SELECT id, course_code, slug, speakers FROM listening_pods WHERE slug LIKE 'pod-0%'")).rows;
  const n=(await c.query("SELECT pod_id,count(*)::int n FROM listening_pod_sentences GROUP BY 1")).rows;
  const nb=new Map(n.map(r=>[r.pod_id,r.n]));
  const by=new Map(); for(const p of pods){p.sentence_count=nb.get(p.id)||0; if(!by.has(p.course_code))by.set(p.course_code,[]); by.get(p.course_code).push(p);}
  const isEng=x=>x==='eng'||x.startsWith('eng_');
  const tr=code=>{const m=code.match(/^(.+)_for_(.+)$/); if(!m)return null; return isEng(m[1])?'target':(isEng(m[2])?'known':null);};
  const cur=[...by.values()].map(resolveCurrentPod0).filter(p=>p&&tr(p.course_code));
  const ids=cur.map(p=>p.id);
  const sents=(await c.query("SELECT pod_id,speaker,target_audio_id,known_audio_id FROM listening_pod_sentences WHERE pod_id=ANY($1)",[ids])).rows;
  const aud=(await c.query("SELECT id,voice_id FROM course_audio WHERE id=ANY($1)",
    [sents.flatMap(s=>[s.target_audio_id,s.known_audio_id]).filter(Boolean)])).rows;
  const av=new Map(aud.map(r=>[r.id,r.voice_id]));
  const pm=new Map(cur.map(p=>[p.id,p]));
  let match=0,mismatch=0,emptyN=0; const perCourse=new Map(); const mismatchVoices=new Map();
  for(const s of sents){
    const p=pm.get(s.pod_id); const t=tr(p.course_code);
    const aid=t==='target'?s.target_audio_id:s.known_audio_id;
    const want=resolve(p.speakers,s.speaker,t);
    const row=perCourse.get(p.course_code)||{course:p.course_code,pod:p.slug,match:0,mismatch:0,empty:0};
    if(!aid){emptyN++;row.empty++;}
    else { const got=norm(av.get(aid));
      if(got===norm(want)){match++;row.match++;}
      else {mismatch++;row.mismatch++; mismatchVoices.set(got,(mismatchVoices.get(got)||0)+1);} }
    perCourse.set(p.course_code,row);
  }
  console.log('ENGLISH pod-0 slots on the resolved current pod-0 of each course');
  console.log('  linked & voice MATCHES the cast   :',match);
  console.log('  linked but voice DIFFERS from cast:',mismatch);
  console.log('  empty (no clip linked)            :',emptyN);
  console.log('  total                             :',match+mismatch+emptyN);
  console.log('\nOff-cast voices actually linked into English slots:');
  for(const [k,v] of [...mismatchVoices].sort((a,b)=>b[1]-a[1])) console.log(String(v).padStart(6), k||'(null)');
  const rows=[...perCourse.values()].sort((a,b)=>b.mismatch-a.mismatch);
  console.log('\nWorst 15 courses by off-cast English clips:');
  console.log('course'.padEnd(18),'pod'.padEnd(18),'match'.padStart(6),'offcast'.padStart(8),'empty'.padStart(6));
  for(const r of rows.slice(0,15)) console.log(r.course.padEnd(18),r.pod.padEnd(18),String(r.match).padStart(6),String(r.mismatch).padStart(8),String(r.empty).padStart(6));
  console.log('\ncourses fully on-cast (0 off-cast):',rows.filter(r=>r.mismatch===0).length,'of',rows.length);
  require('fs').writeFileSync('scripts/pod0-recast-2026-08-13/cast-vs-clips.json',JSON.stringify(rows,null,2));
  await c.end();
})();
