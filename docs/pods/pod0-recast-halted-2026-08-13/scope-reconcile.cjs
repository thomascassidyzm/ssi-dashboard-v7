const { Client } = require('pg');
require('dotenv').config({ path: '.env.psql' });
const { resolveCurrentPod0 } = require('../../services/pod-voice-approvals.cjs');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const pods = (await c.query("SELECT id, course_code, slug FROM listening_pods WHERE slug LIKE 'pod-0%'")).rows;
  const counts = (await c.query("SELECT pod_id, count(*)::int n FROM listening_pod_sentences GROUP BY 1")).rows;
  const nBy = new Map(counts.map(r=>[r.pod_id, r.n]));
  const byCourse = new Map();
  for (const p of pods) { p.sentence_count = nBy.get(p.id)||0; if(!byCourse.has(p.course_code)) byCourse.set(p.course_code,[]); byCourse.get(p.course_code).push(p); }
  const current = [];
  for (const [course, list] of byCourse) { const r = resolveCurrentPod0(list); if (r) current.push(r); }
  const isEng = (x)=> x==='eng'||x.startsWith('eng_');
  const engTrackOf = (code) => { const m=code.match(/^(.+)_for_(.+)$/); if(!m) return null; return isEng(m[1])?'target':(isEng(m[2])?'known':null); };
  const withEng = current.filter(p=>engTrackOf(p.course_code));
  console.log('courses with a pod-0 family pod :', byCourse.size);
  console.log('resolved current pod-0 pods     :', current.length);
  console.log('of those, having an English track:', withEng.length);
  console.log('  (courses with NO English track:', current.length-withEng.length, '->', current.filter(p=>!engTrackOf(p.course_code)).map(p=>p.course_code).join(', '),')');

  const ids = withEng.map(p=>p.id);
  const sents = (await c.query("SELECT pod_id, speaker, target_audio_id, known_audio_id, target_text, known_text FROM listening_pod_sentences WHERE pod_id = ANY($1)",[ids])).rows;
  const trackBy = new Map(withEng.map(p=>[p.id, engTrackOf(p.course_code)]));
  let slots=0, empty=0, linked=0; const texts=new Set(), missTexts=new Set();
  for (const s of sents) {
    const t = trackBy.get(s.pod_id);
    const aid = t==='target'?s.target_audio_id:s.known_audio_id;
    const txt = (t==='target'?s.target_text:s.known_text)||'';
    slots++; if(aid) linked++; else { empty++; if(txt.trim()) missTexts.add(txt.trim()); }
    if(txt.trim()) texts.add(txt.trim());
  }
  console.log('\n--- CURRENT pod-0 per course, ENGLISH track ---');
  console.log('English slots      :', slots);
  console.log('  linked (alive)   :', linked);
  console.log('  empty            :', empty);
  console.log('distinct texts     :', texts.size);
  console.log('distinct texts w/ >=1 empty slot:', missTexts.size);

  // actual voices of the LINKED English clips
  const q = await c.query(`
    SELECT ca.voice_id, count(*)::int n
    FROM listening_pod_sentences s
    JOIN listening_pods p ON p.id = s.pod_id
    JOIN course_audio ca ON ca.id = CASE WHEN $2::text[] @> ARRAY[p.course_code] THEN s.target_audio_id ELSE s.known_audio_id END
    WHERE s.pod_id = ANY($1) GROUP BY 1 ORDER BY 2 DESC`,
    [ids, withEng.filter(p=>engTrackOf(p.course_code)==='target').map(p=>p.course_code)]);
  console.log('\n--- ACTUAL voice of the linked English clips (course_audio) ---');
  for (const r of q.rows) console.log(String(r.n).padStart(6), r.voice_id);
  await c.end();
})();
