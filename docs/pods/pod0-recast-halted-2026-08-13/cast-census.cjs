const { Client } = require('pg');
require('dotenv').config({ path: '.env.psql' });
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const { rows } = await c.query("SELECT id, course_code, slug, speakers, (SELECT count(*) FROM listening_pod_sentences s WHERE s.pod_id=p.id) AS sents FROM listening_pods p WHERE slug LIKE 'pod-0%' ORDER BY course_code, slug");
  const engTrackOf = (code) => {
    // course code is <target>_for_<known>
    const m = code.match(/^(.+)_for_(.+)$/);
    if (!m) return null;
    const [, target, known] = m;
    const isEng = (x) => x === 'eng' || x.startsWith('eng_');
    if (isEng(target) && isEng(known)) return 'both';
    if (isEng(target)) return 'target';
    if (isEng(known)) return 'known';
    return null; // no english track at all
  };
  const tally = new Map();
  const perCourse = [];
  for (const r of rows) {
    const track = engTrackOf(r.course_code);
    const sp = r.speakers || {};
    const voices = new Map();
    for (const [name, e] of Object.entries(sp)) {
      if (!e || typeof e !== 'object') continue;
      const tracks = track === 'both' ? ['target','known'] : track ? [track] : [];
      for (const t of tracks) {
        let v = e[t];
        if (!v && t === 'target' && e.voice_id) v = { provider: e.provider || 'xai', voice_id: e.voice_id, locale: e.locale };
        const key = v && v.voice_id ? `${v.provider||'azure'}:${v.voice_id}${v.locale?'@'+v.locale:''}` : '(none)';
        voices.set(key, (voices.get(key)||0)+1);
        tally.set(key, (tally.get(key)||0)+1);
      }
    }
    perCourse.push({ id: r.id, course: r.course_code, slug: r.slug, sents: +r.sents, engTrack: track, voices: Object.fromEntries([...voices].sort()) });
  }
  console.log('=== ENGLISH-TRACK VOICE TALLY (speaker-entries across all pod-0-family pods) ===');
  for (const [k,v] of [...tally].sort((a,b)=>b[1]-a[1])) console.log(String(v).padStart(5), k);
  console.log('\n=== COURSES WITH NO ENGLISH TRACK ===');
  console.log(perCourse.filter(p=>!p.engTrack).map(p=>p.course+'/'+p.slug).join(', ') || '(none)');
  require('fs').writeFileSync('/tmp/cast-census.json', JSON.stringify(perCourse,null,2));
  console.log('\nwrote /tmp/cast-census.json ; pods:', perCourse.length);
  await c.end();
})();
