// Content-path checks for the 2 phrase known_text repairs:
//   ZUT      — one known prompt maps to exactly one target form
//   CONSISTENCY — introduced-before-used, on BOTH sides, using my own
//                 Unicode-aware Sinhala tokenizer (the shipped one is inert)
// Every Sinhala string here is read from the DB, never typed.
const {q}=require('./db.cjs');
const {tokenize,knownBy,sameWord}=require('./sintok.cjs');
const CC='eng_for_sin';

// The two repairs. The NEW strings are built by TRANSFORMING the DB's own bytes
// (delete/replace on a token boundary, or splice of another row's substring) —
// never hand-typed. See buildRepairs() below.
(async()=>{
  const rows=await q(`select id,seed_number,known_text,target_text,phrase_role
     from course_practice_phrases where course_code=$1 and id = any($2::text[])`,
     [CC,['eng_for_sin:S0216L01B03','eng_for_sin:S0226L01U03']]);
  const by=Object.fromEntries(rows.map(r=>[r.id,r]));

  // --- build the new strings PROGRAMMATICALLY from DB bytes -----------------
  // (1) S0216L01B03: drop the spurious මමා. NOTHING ELSE.
  //     I first proposed also reordering to put the locative first, copying
  //     siblings U01/U05. My own self-review REFUTED that: course-wide the
  //     ගෙදරදී locative sits at the END in 6 rows and at the START in only 2,
  //     so the row's EXISTING order is better attested than my "improvement"
  //     was. The defect is මමා; reordering would have been unsupported
  //     overreach. Pure deletion on a token boundary, from the DB's own bytes.
  const r216=by['eng_for_sin:S0216L01B03'];
  const new216=r216.known_text.replace(/^මමා\s+/,'');
  // (2) S0226L01U03: replace the මමා token with the form the 3 sibling phrases
  //     at this same seed use, lifted from U01's bytes.
  const r226=by['eng_for_sin:S0226L01U03'];
  const u01=(await q(`select known_text from course_practice_phrases where course_code=$1 and id=$2`,[CC,'eng_for_sin:S0226L01U01']))[0].known_text;
  const objMatch=u01.match(/(\S+)\s+ලවා/);         // 'මාව' from 'මාව ලවා'
  const obj=objMatch[1];
  const new226=r226.known_text.replace(/මමා(?=\s+ලවා)/,obj);

  const repairs=[
    {id:r216.id, seed:r216.seed_number, role:r216.phrase_role, target:r216.target_text,
     old:r216.known_text, new:new216,
     rationale:'English has no first person, so මමා is spurious; deleted. Order left EXACTLY as found — my proposed reorder was refuted by my own self-review (locative-at-end 6 rows vs locative-at-start 2).',
     provenance:{method:'leading මමා token deleted from the row own DB bytes; no other change'}},
    {id:r226.id, seed:r226.seed_number, role:r226.phrase_role, target:r226.target_text,
     old:r226.known_text, new:new226,
     rationale:'මමා ලවා -> මාව ලවා, the form used by U01/U02/U04 at this same seed for "told me". The Latin "a" is a SEPARATE whole-seed class (8 rows, all at seed 226) and is deliberately left.',
     provenance:{obj:'captured from S0226L01U01.known_text'}},
  ];
  console.log('=== PROPOSED REPAIRS (strings built from DB bytes only) ===');
  for(const r of repairs){
    console.log(`\n${r.id}  [${r.role}]  seed ${r.seed}`);
    console.log('  target :',JSON.stringify(r.target));
    console.log('  old    :',JSON.stringify(r.old));
    console.log('  new    :',JSON.stringify(r.new));
    console.log('  still carries මමා:',r.new.includes('මමා'));
  }

  // --- ZUT: does the new known text collide with a different target? --------
  console.log('\n=== ZUT (one known prompt -> exactly one target form) ===');
  for(const r of repairs){
    const hits=await q(`select id,known_text,target_text from course_practice_phrases
       where course_code=$1 and known_text=$2 and id<>$3`,[CC,r.new,r.id]);
    const seedHits=await q(`select seed_number,known_text,target_text from course_seeds
       where course_code=$1 and known_text=$2`,[CC,r.new]);
    const legoHits=await q(`select lego_id,known_text,target_text from course_legos
       where course_code=$1 and known_text=$2`,[CC,r.new]);
    const all=[...hits,...seedHits,...legoHits];
    const conflict=all.filter(h=>String(h.target_text).trim().toLowerCase()!==String(r.target).trim().toLowerCase());
    console.log(` ${r.id}: exact known_text matches elsewhere = ${all.length}, of which DIFFERENT target = ${conflict.length}`);
    conflict.forEach(c=>console.log('    HARD ZUT HIT:',JSON.stringify(c)));
    // reverse direction: same target, different known (a soft near-conflict, reported not failed)
    const rev=await q(`select id,known_text from course_practice_phrases
       where course_code=$1 and lower(trim(target_text))=lower(trim($2)) and id<>$3`,[CC,r.target,r.id]);
    const revDiff=rev.filter(x=>x.known_text!==r.new);
    if(revDiff.length) { console.log(`    soft: same English, different Sinhala in ${revDiff.length} row(s) — REPORTED for judgement, not a failure`);
      revDiff.forEach(x=>console.log('      ',x.id,JSON.stringify(x.known_text))); }
  }

  // --- CONSISTENCY: introduced-before-used, both sides ---------------------
  console.log('\n=== CONSISTENCY (introduced-before-used, my tokenizer) ===');
  for(const r of repairs){
    // vocabulary available at or before this seed, known side
    const prior=await q(`select known_text from course_legos where course_code=$1 and seed_number<=$2`,[CC,r.seed]);
    const priorPh=await q(`select known_text from course_practice_phrases where course_code=$1 and seed_number<=$2 and id<>$3`,[CC,r.seed,r.id]);
    const vocab=[...new Set([...prior,...priorPh].flatMap(x=>tokenize(x.known_text).map(t=>t.text)))];
    const toks=tokenize(r.new);
    const unseen=toks.filter(t=>!knownBy(t.text,vocab));
    const latin=toks.filter(t=>t.isLatin||t.mixed);
    console.log(` ${r.id}: ${toks.length} tokens, vocab pool ${vocab.length} distinct`);
    console.log(`    not introduced by seed ${r.seed}: ${unseen.length} ${JSON.stringify(unseen.map(t=>t.text))}`);
    console.log(`    Latin/mixed tokens (corruption on a Sinhala known side): ${latin.length} ${JSON.stringify(latin.map(t=>t.text))}`);
    // did the repair REMOVE any token that was fine, or ADD any new one?
    const oldT=tokenize(r.old).map(t=>t.text), newT=toks.map(t=>t.text);
    console.log(`    removed: ${JSON.stringify(oldT.filter(t=>!newT.includes(t)))}`);
    console.log(`    added  : ${JSON.stringify(newT.filter(t=>!oldT.includes(t)))}`);
  }
  require('fs').writeFileSync(__dirname+'/repairs-final.json',JSON.stringify(repairs,null,1));
})().catch(e=>{console.error('ERR',e.message);process.exit(1)});
