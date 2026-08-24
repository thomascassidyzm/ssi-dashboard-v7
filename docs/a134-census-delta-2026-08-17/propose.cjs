const {q}=require('./db.cjs');
const fs=require('fs');
(async()=>{
  const P=await q(`select id,seed_number,known_text,target_text,known_audio_id from course_practice_phrases where course_code='eng_for_sin'`);
  const L=await q(`select id,seed_number,lego_index,known_text,target_text,known_audio_id from course_legos where course_code='eng_for_sin'`);
  const S=await q(`select seed_number,known_text,target_text,known_audio_id from course_seeds where course_code='eng_for_sin'`);
  const byId=Object.fromEntries(P.map(r=>[r.id,r]));
  const g=id=>byId['eng_for_sin:'+id];
  // ---- programmatic source strings (NEVER hand-typed) ----
  const MAMA   = g('S0233L01U03') ? null : null;
  const src = {};
  src.MAMA  = g('S0216L01B02').known_text.split(' ')[0];              // මම  (from "I saw a few friends")
  src.MAAWA_LAWAA = g('S0226L01U01').known_text.split(' ').slice(2,4).join(' '); // මාව ලවා
  src.MINIHEK = P.find(r=>r.id==='eng_for_sin:S0231L01B01'||/මහලු /.test(r.known_text)&&r.seed_number===231)?.known_text;
  src.OYAA  = g('S0121L03U07').known_text.split(' ')[0];               // ඔයා
  src.KIYALAA = g('S0121L03U07').known_text.split(' ').find(t=>t.includes('කිය'));
  src.APE   = L.find(r=>r.seed_number===454&&r.lego_index===1).known_text.split(' ')[0];  // අපේ
  src.LAMAYI= L.find(r=>r.seed_number===580&&r.lego_index===2).known_text.trim();          // ළමයි
  src.DAKINA= null;
  console.log('SOURCE STRINGS (from DB):');
  for(const k of Object.keys(src)) if(src[k]!==null) console.log('  '+k+' = '+JSON.stringify(src[k]));
  // minihek: pull exactly
  const mh = P.filter(r=>r.known_text&&r.known_text.split(' ').includes('මිනිහෙක්'));
  src.MINIHEK = mh[0].known_text.split(' ').find(t=>t==='මිනිහෙක්');
  console.log('  MINIHEK = '+JSON.stringify(src.MINIHEK)+'  (from '+mh[0].id+')');
  // dakina from lego s140
  const dl = L.find(r=>r.seed_number===140 && /දකින/.test(r.known_text));
  console.log('  s140 lego = '+JSON.stringify(dl.known_text));
  fs.writeFileSync(__dirname+'/src.json', JSON.stringify(src,null,1));
})();
