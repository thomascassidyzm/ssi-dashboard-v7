// A-134 මමා step (a): CALIBRATE the token array before trusting it.
//
// Two separate questions, kept apart on purpose:
//   Q1 "is the token there" — does word_boundaries contain a token carrying මමා?
//      Azure emits a WordBoundary event per unit it actually places on the audio
//      timeline, so presence is positive evidence the string was synthesised.
//   Q2 "is the reported DURATION meaningful" — 13ms for a 3-glyph word on the
//      first sample is not credible, so before I lean on any duration I measure
//      what durations this voice reports for KNOWN-GOOD Sinhala in this course.
const {q}=require('./db.cjs');
const fs=require('fs');
const M='මමා';

(async()=>{
  const scope=require('./scope.json');

  // ---- Q1: token presence, per clip -------------------------------------
  const per=[];
  for(const o of scope){
    const wb=o.audio.word_boundaries||[];
    const hits=[];
    wb.forEach((t,i)=>{
      if((t.text||'').includes(M)) hits.push({
        i, tok:t.text, off:t.offset, dur:t.duration,
        gapToNext: wb[i+1] ? wb[i+1].offset - t.offset : (o.audio.duration_ms - t.offset),
      });
    });
    const textCount=(o.audio.text.match(new RegExp(M,'g'))||[]).length;
    per.push({
      id:o.id, holders:o.holders,
      lego: o.legos[0] ? o.legos[0].lego_id : null,
      phrase: o.phrases[0] ? o.phrases[0].id : null,
      seed: (o.legos[0]||o.phrases[0]||{}).seed_number,
      dur:o.audio.duration_ms, ntok:wb.length,
      textCount, tokCount:hits.length, hits,
      spoken: hits.length>0,
      text:o.audio.text,
      cardKnown: (o.legos[0]||o.phrases[0]||{}).known_text,
    });
  }
  const spoken=per.filter(p=>p.spoken), textOnly=per.filter(p=>!p.spoken);
  console.log('=== Q1 TOKEN PRESENCE ===');
  console.log('reachable clips:',per.length);
  console.log('  M present in token array (SPOKEN):',spoken.length);
  console.log('  M in text but ABSENT from token array (text-only artefact):',textOnly.length);
  if(textOnly.length) console.log('  text-only ids:',textOnly.map(p=>p.id).join(','));
  console.log('  total M tokens voiced across the set:',spoken.reduce((a,b)=>a+b.tokCount,0));

  // ---- Q2: is `duration` on a token meaningful for this voice? ----------
  // Control: clips in THIS course, THIS voice, sin language, with a token array,
  // that do NOT carry any of the known corruption strings. Page it (ordered
  // full-table reads on course_audio time out at 8s).
  const ctl=await q(`select duration_ms, word_boundaries from course_audio
     where course_code='eng_for_sin' and language='sin' and voice_id='azure_si-LK-SameeraNeural'
       and word_boundaries is not null
       and text not like '%'||$1||'%'
     limit 4000`,[M]);
  console.log('\n=== Q2 DURATION SEMANTICS (control n='+ctl.length+') ===');
  // Fraction of the clip covered by the sum of reported token durations.
  const cov=[];
  const byGlyph=new Map();   // grapheme-count -> [durations] for real Sinhala words
  const segG=new Intl.Segmenter('si',{granularity:'grapheme'});
  const gcount=s=>[...segG.segment(s)].length;
  const isWord=s=>/[඀-෿]/.test(s);
  for(const c of ctl){
    const wb=c.word_boundaries||[];
    if(!wb.length||!c.duration_ms) continue;
    const sum=wb.reduce((a,t)=>a+(t.duration||0),0);
    cov.push(sum/c.duration_ms);
    for(const t of wb){
      if(!isWord(t.text||'')) continue;
      const g=gcount(t.text.replace(/[^඀-෿‍]/g,''));
      if(!byGlyph.has(g)) byGlyph.set(g,[]);
      byGlyph.get(g).push(t.duration||0);
    }
  }
  const med=a=>{const s=[...a].sort((x,y)=>x-y);return s[Math.floor(s.length/2)]};
  console.log('sum(token durations)/clip duration: median',med(cov).toFixed(3),
              ' min',Math.min(...cov).toFixed(3),' max',Math.max(...cov).toFixed(3));
  console.log('\nreported duration by Sinhala grapheme count (control words):');
  const rows=[...byGlyph.entries()].filter(([g])=>g>=1&&g<=8).sort((a,b)=>a[0]-b[0]);
  for(const [g,ds] of rows){
    console.log(`  ${g} graphemes: n=${ds.length} median=${med(ds)}ms  p10=${[...ds].sort((a,b)=>a-b)[Math.floor(ds.length*0.1)]}  frac<50ms=${(ds.filter(d=>d<50).length/ds.length).toFixed(3)}`);
  }
  // What does the M token look like against the 3-grapheme control? මමා = ම+මා = 2 graphemes.
  const mg=gcount(M);
  console.log('\nමමා grapheme count:',mg);
  const ctlSame=byGlyph.get(mg)||[];
  const mdurs=spoken.flatMap(p=>p.hits.map(h=>h.dur));
  const mgaps=spoken.flatMap(p=>p.hits.map(h=>h.gapToNext));
  console.log(`control ${mg}-grapheme words: n=${ctlSame.length} median=${med(ctlSame)}ms frac<50ms=${(ctlSame.filter(d=>d<50).length/ctlSame.length).toFixed(3)}`);
  console.log(`M tokens:                     n=${mdurs.length} median=${med(mdurs)}ms frac<50ms=${(mdurs.filter(d=>d<50).length/mdurs.length).toFixed(3)}`);
  console.log(`M token gapToNext:            median=${med(mgaps)}ms  min=${Math.min(...mgaps)}  max=${Math.max(...mgaps)}`);

  fs.writeFileSync(__dirname+'/calib2.json',JSON.stringify({per,coverageMedian:med(cov)},null,1));
})().catch(e=>{console.error('ERR',e.message);process.exit(1)});
