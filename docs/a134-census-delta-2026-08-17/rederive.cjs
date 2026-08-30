const {q}=require('./db.cjs');
const DEV=/[ऀ-ॿ]/, TEL=/[ఀ-౿]/, LAT=/[A-Za-z]/;
// Sinhala dependent vowel signs & virama: U+0DCA .. U+0DDF (+ U+0DF2,U+0DF3)
const DEPV=/[්-ෟෲෳ]/;
(async()=>{
  const rows = await q(`select id,seed_number,known_text,target_text,known_audio_id
    from course_practice_phrases where course_code='eng_for_sin' order by seed_number, id`);
  const hits=[];
  for (const r of rows){
    const kt=r.known_text||''; const cls=[];
    if (kt.includes('මමා')) cls.push('mamaa');          // මමා
    if (DEV.test(kt)) cls.push('devanagari');
    if (TEL.test(kt)) cls.push('telugu');
    if (LAT.test(kt)) cls.push('latin');
    for (const t of kt.split(/\s+/)) if (t && DEPV.test(t[0])) { cls.push('opens-with-vowel-sign:'+t); }
    if (kt.includes('අපිේ')) cls.push('apie');      // අපිේ
    // bare ge: token that is exactly ගෙ
    for (const t of kt.split(/\s+/)) if (t==='ගෙ') cls.push('bare-ge');
    if (cls.length) hits.push({...r, classes:[...new Set(cls)]});
  }
  console.log('total flagged', hits.length);
  const bareGe = hits.filter(h=>h.classes.includes('bare-ge'));
  console.log('bare-ge rows (owned by #887):', bareGe.length, [...new Set(bareGe.map(h=>h.seed_number))].join(','));
  const mine = hits.filter(h=>!h.classes.includes('bare-ge'));
  console.log('MINE:', mine.length);
  require('fs').writeFileSync(__dirname+'/rederived.json', JSON.stringify(mine,null,1));
  for(const m of mine) console.log(m.id, m.seed_number, JSON.stringify(m.classes), '|', m.known_text, '=', m.target_text);
})();
