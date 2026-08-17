// SELF-REVIEW, named as such. Both external routes were refused:
//   - the sonnet verifier dispatch was refused on the fan-out DEPTH ceiling
//   - `claude --print` is "Not logged in" on this account
// So this is self-refutation, which is weaker than an independent opinion. It is
// however backed by real corpus counts, which a no-tools opinion could not give.
// Every point below is attacked, not defended.
const {q}=require('./db.cjs');
const {tokenize,graphemes}=require('./sintok.cjs');
const CC='eng_for_sin';
const r=require('./repairs-final.json');

(async()=>{
// ---- A. Does a subject-less English fragment license a Sinhala subject? -----
console.log('=== A. is deleting මමා right? ===');
// Find build phrases whose English has no first-person word, and count how many
// carry a first-person Sinhala token anyway. If that is common, my deletion is wrong.
const ph=await q(`select id,known_text,target_text,phrase_role from course_practice_phrases
   where course_code=$1 and target_text is not null`,[CC]);
const firstPersonEng=/\b(i|i'm|i've|i'll|me|my|mine|myself)\b/i;
const firstPersonSin=/(^|\s)(මම|මට|මාව|මගේ|මමා)(\s|$)/;
const noEngFp=ph.filter(p=>!firstPersonEng.test(p.target_text));
const withSinFp=noEngFp.filter(p=>firstPersonSin.test(p.known_text));
console.log(` phrases whose ENGLISH has no first person: ${noEngFp.length}`);
console.log(` ...of which the SINHALA carries a first-person pronoun anyway: ${withSinFp.length} (${(withSinFp.length/noEngFp.length*100).toFixed(1)}%)`);
withSinFp.slice(0,8).forEach(p=>console.log('    ',p.id.replace('eng_for_sin:',''),JSON.stringify(p.target_text),'=>',JSON.stringify(p.known_text)));
// and the converse: English WITH first person that has the Sinhala pronoun
const engFp=ph.filter(p=>firstPersonEng.test(p.target_text));
console.log(` phrases whose ENGLISH has first person: ${engFp.length}, of which Sinhala carries a first-person pronoun: ${engFp.filter(p=>firstPersonSin.test(p.known_text)).length}`);

// ---- B. locative word order — did I overfit to two rows? -------------------
console.log('\n=== B. word order for the ඒ ගෙදර- locative ===');
const loc=r[0].new.match(/ඒ\s+\S*ගෙදර\S*/)[0];
const locWord=loc.split(/\s+/)[1];
const all=[...ph.map(p=>({id:p.id,t:p.known_text})),
  ...(await q(`select seed_number::text id, known_text t from course_seeds where course_code=$1`,[CC])),
  ...(await q(`select lego_id id, known_text t from course_legos where course_code=$1`,[CC]))];
const withLoc=all.filter(x=>x.t&&x.t.includes(locWord));
console.log(` rows containing ${JSON.stringify(locWord)}: ${withLoc.length}`);
let locFirst=0,locLast=0,locMid=0;
for(const x of withLoc){
  const toks=tokenize(x.t).map(t=>t.text);
  const i=toks.findIndex(t=>t.includes(locWord));
  const isFirst = i<=1;                       // allows a preceding 'ඒ'
  const isLast  = i>=toks.length-1;
  if(isLast) locLast++; else if(isFirst) locFirst++; else locMid++;
}
console.log(` locative at/near START: ${locFirst}   MIDDLE: ${locMid}   at END: ${locLast}`);
withLoc.forEach(x=>console.log('    ',String(x.id).replace('eng_for_sin:',''),JSON.stringify(x.t)));

// ---- C. මාව vs මට for "me" as object, and does ලවා govern the case? --------
console.log('\n=== C. මාව vs මට for object "me" ===');
for(const form of ['මාව','මට']){
  const n=all.filter(x=>x.t&&new RegExp('(^|\\s)'+form+'(\\s|$)').test(x.t)).length;
  const withLawa=all.filter(x=>x.t&&new RegExp('(^|\\s)'+form+'\\s+ලවා(\\s|$)').test(x.t)).length;
  console.log(` ${form}: ${n} rows total, ${withLawa} of them immediately before ලවා`);
}
const toldMe=ph.filter(p=>/\btold me\b/i.test(p.target_text));
console.log(` English "told me" rows: ${toldMe.length}`);
toldMe.forEach(p=>console.log('    ',p.id.replace('eng_for_sin:',''),JSON.stringify(p.target_text),'=>',JSON.stringify(p.known_text)));

// ---- D. the Latin determiner class at seed 226 (scope of what I left) ------
console.log('\n=== D. the Latin-determiner class I deliberately left ===');
const latinRows=all.filter(x=>x.t&&/(^|\s)(the|a|an|that|this)(\s)/.test(x.t));
console.log(` rows whose SINHALA known side contains a bare Latin English determiner: ${latinRows.length}`);
const bySeed={}; latinRows.forEach(x=>{const m=String(x.id).match(/S(\d{4})/);const s=m?+m[1]:String(x.id);bySeed[s]=(bySeed[s]||0)+1});
console.log(' by seed:',JSON.stringify(bySeed));

// ---- E. ZUT, both directions, all three tables -----------------------------
console.log('\n=== E. ZUT both directions ===');
for(const rep of r){
  const fwd=await q(`select id,target_text from course_practice_phrases where course_code=$1 and known_text=$2 and id<>$3
    union all select seed_number::text,target_text from course_seeds where course_code=$1 and known_text=$2
    union all select lego_id,target_text from course_legos where course_code=$1 and known_text=$2`,[CC,rep.new,rep.id]);
  const bad=fwd.filter(x=>String(x.target_text).trim().toLowerCase()!==rep.target.trim().toLowerCase());
  console.log(` ${rep.id}: same Sinhala elsewhere=${fwd.length}, with a DIFFERENT English=${bad.length} ${JSON.stringify(bad)}`);
}

// ---- F. malformed Unicode in the new strings -------------------------------
console.log('\n=== F. orthography / Unicode wellformedness of the new strings ===');
// A Sinhala vowel sign must follow a consonant letter. Flag any vowel sign that
// follows another vowel sign or starts a cluster — that is the ෙවෙනස class.
const VOWEL_SIGN=/[ා-ෟෲෳ]/;
const CONSONANT=/[ක-ෆ]/;
for(const rep of r){
  const gs=graphemes(rep.new);
  const bad=[];
  gs.forEach((g,i)=>{
    const cps=[...g];
    // a grapheme that is ONLY a vowel sign (no base consonant) is malformed
    if(cps.every(c=>VOWEL_SIGN.test(c)||c==='‍')) bad.push({i,g,why:'vowel sign with no base consonant'});
    if(VOWEL_SIGN.test(cps[0])&&!CONSONANT.test(cps[0])) bad.push({i,g,why:'grapheme opens with a vowel sign'});
  });
  console.log(` ${rep.id}: ${gs.length} graphemes, malformed=${bad.length} ${JSON.stringify(bad)}`);
  // and does the string still carry ANY known corruption?
  const CORRUPT=['මමා','මමට','මමම','මමතා','ෙවෙනස','ඥග','දිහා','නනිකු'];
  console.log(`    residual corruption strings: ${JSON.stringify(CORRUPT.filter(c=>rep.new.includes(c)))}`);
  console.log(`    Devanagari present: ${/[ऀ-ॿ]/.test(rep.new)}`);
}
})().catch(e=>{console.error('ERR',e.message);process.exit(1)});
