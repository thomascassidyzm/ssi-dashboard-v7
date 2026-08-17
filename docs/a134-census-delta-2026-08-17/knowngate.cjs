// UNICODE-AWARE KNOWN-SIDE GATE for Sinhala.
// DISCLOSURE: the shipped tokenizeKnown() splits on an ASCII-only class, so Sinhala
// tokenizes to zero tokens and always returns 0 violations. This is a replacement.
// Method: Intl.Segmenter({granularity:'grapheme'}) builds grapheme clusters so that
//   dependent vowel signs (U+0DCA-U+0DDF) and the ZWJ inside conjuncts are NEVER split
//   from their base consonant. Words are then whitespace/punctuation delimited, and each
//   word is re-assembled from whole grapheme clusters only.
// STEMMING: Sinhala is agglutinative (වෙනවා/වෙන්න/වෙන්නට are one verb). Two passes are run:
//   (1) EXACT token match  — ERRS TOWARD OVER-REPORTING (an inflection of a taught verb
//       is scored unseen), so a violation here is a lead, not a verdict.
//   (2) PREFIX-STEM match  — a token counts as introduced if any earlier token shares a
//       prefix of >= 4 grapheme clusters. ERRS TOWARD UNDER-REPORTING (a genuinely new
//       word that merely starts like a taught one is scored seen).
// A token flagged by BOTH passes is a real candidate violation.
const {q}=require('./db.cjs');
const SEG=new Intl.Segmenter('si',{granularity:'grapheme'});
const gr=s=>[...SEG.segment(s)].map(x=>x.segment);
const PUNCT=/[.,?!;:()"'…]/g;
const words=s=>(s||'').replace(PUNCT,' ').split(/\s+/).filter(Boolean);
const stem=(t,n=4)=>gr(t).slice(0,n).join('');
module.exports={gr,words,stem};
if(require.main===module)(async()=>{
 const props=require('./proposals.json');
 const P=await q(`select seed_number,known_text from course_practice_phrases where course_code='eng_for_sin'`);
 const L=await q(`select seed_number,known_text from course_legos where course_code='eng_for_sin'`);
 const S=await q(`select seed_number,known_text from course_seeds where course_code='eng_for_sin' and known_text is not null`);
 const corpus=[...P,...L,...S];
 const changed=new Set(props.map(p=>p.old));
 // earliest seed at which each token / stem is seen, EXCLUDING the rows we are changing
 const firstTok={}, firstStem={};
 for(const r of corpus){
   if(changed.has(r.known_text)) continue;
   for(const w of words(r.known_text)){
     if(firstTok[w]===undefined||r.seed_number<firstTok[w]) firstTok[w]=r.seed_number;
     const st=stem(w); if(firstStem[st]===undefined||r.seed_number<firstStem[st]) firstStem[st]=r.seed_number;
   }
 }
 let both=0,exactOnly=0;
 console.log('token'.padEnd(18)+'seed  exact-first  stem-first   verdict');
 for(const p of props){
   for(const w of words(p.new)){
     const fe=firstTok[w], fs=firstStem[stem(w)];
     const eBad = fe===undefined || fe>p.seed;
     const sBad = fs===undefined || fs>p.seed;
     if(eBad&&sBad){both++; console.log(`${w.padEnd(18)}s${String(p.seed).padEnd(5)}${String(fe??'never').padEnd(13)}${String(fs??'never').padEnd(12)}CANDIDATE VIOLATION  (${String(p.id).slice(12)||p.id})`);}
     else if(eBad){exactOnly++; console.log(`${w.padEnd(18)}s${String(p.seed).padEnd(5)}${String(fe??'never').padEnd(13)}${String(fs??'never').padEnd(12)}inflection-only (stem taught by s${fs})`);}
   }
 }
 console.log(`\nCANDIDATE VIOLATIONS (failed BOTH passes): ${both}`);
 console.log(`exact-pass-only flags (agglutination artefacts): ${exactOnly}`);
})();
