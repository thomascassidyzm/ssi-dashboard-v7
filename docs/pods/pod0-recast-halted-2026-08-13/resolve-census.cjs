// Reproduce the generator's OWN per-sentence voice resolution (phase8 lines 6624-6633)
// and attribute each resolved voice to the LANGUAGE that track actually carries.
const { Client } = require('pg');
require('dotenv').config({ path: '.env.psql' });
const canonicalSpeakerName = (s) => String(s||'').replace(/\s*\([^)]*\)\s*/g,' ').replace(/\s+/g,' ').trim();
function resolve(podSpeakers, speaker, track) {
  const m = podSpeakers || {};
  const e = m[canonicalSpeakerName(speaker)] || m[speaker] || m._default;
  if (!e) return null;
  if (e[track] && e[track].voice_id) return { voice_id: e[track].voice_id, provider: e[track].provider || 'azure', locale: e[track].locale || null };
  if (track === 'target' && e.voice_id) return { voice_id: e.voice_id, provider: e.provider || 'xai' };
  return null;
}
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const pods = (await c.query("SELECT id, course_code, slug, speakers FROM listening_pods WHERE slug LIKE 'pod-0%'")).rows;
  const sents = (await c.query("SELECT pod_id, id, speaker, target_audio_id, known_audio_id, target_text, known_text FROM listening_pod_sentences WHERE pod_id IN (SELECT id FROM listening_pods WHERE slug LIKE 'pod-0%')")).rows;
  const vcs = (await c.query("SELECT course_code, voice_config FROM courses")).rows;
  const vcBy = new Map(vcs.map(r => [r.course_code, r.voice_config || {}]));
  const byPod = new Map(); for (const s of sents) { if(!byPod.has(s.pod_id)) byPod.set(s.pod_id,[]); byPod.get(s.pod_id).push(s); }
  const isEng = (x) => x === 'eng' || x.startsWith('eng_');
  const engTally = new Map(), nonEngTally = new Map(), fellThrough = [];
  let engSlots=0, engEmpty=0;
  const engTexts = new Set(), engMissingTexts = new Set();
  for (const p of pods) {
    const m = p.course_code.match(/^(.+)_for_(.+)$/); if (!m) continue;
    const [, tgt, kn] = m;
    const vc = vcBy.get(p.course_code) || {};
    const kvRaw = (vc.voices && vc.voices.known) || {};
    const ctxKnown = { voice_id: kvRaw.voiceId || kvRaw.voice_id || 'en-GB-SoniaNeural', provider: kvRaw.provider || 'azure' };
    for (const s of byPod.get(p.id) || []) {
      for (const track of ['target','known']) {
        const lang = track === 'target' ? tgt : kn;
        let v = resolve(p.speakers, s.speaker, track);
        let fell = false;
        if (!v && track === 'known') { v = ctxKnown; fell = true; }
        const key = v ? `${v.provider||'azure'}:${v.voice_id}` : '(unresolved)';
        const audioId = track === 'target' ? s.target_audio_id : s.known_audio_id;
        const text = track === 'target' ? s.target_text : s.known_text;
        if (isEng(lang)) {
          engTally.set(key, (engTally.get(key)||0)+1);
          engSlots++; if (!audioId) { engEmpty++; if(text) engMissingTexts.add(text.trim()); }
          if (text) engTexts.add(text.trim());
          if (fell) fellThrough.push(`${p.course_code} ${s.speaker} -> ${key}`);
        } else {
          nonEngTally.set(key, (nonEngTally.get(key)||0)+1);
        }
      }
    }
  }
  const show = (t, title) => { console.log('\n=== '+title+' ==='); for (const [k,v] of [...t].sort((a,b)=>b[1]-a[1]).slice(0,25)) console.log(String(v).padStart(6), k); };
  show(engTally, 'ENGLISH-track resolved voices (per sentence-slot)');
  show(nonEngTally, 'NON-ENGLISH-track resolved voices (top 25)');
  console.log('\nENGLISH slots total:', engSlots, ' empty(no audio linked):', engEmpty);
  console.log('distinct English texts:', engTexts.size, ' distinct English texts with a missing slot:', engMissingTexts.size);
  console.log('known-track fell through to ctx.knownVoice on English track:', fellThrough.length);
  await c.end();
})();
