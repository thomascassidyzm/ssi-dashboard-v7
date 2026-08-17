// A-134 මමා: build the fix plan for the 71 lego-presentation clips.
// Recompose each from the card's CURRENT text using the course's own composer
// output (recomposed.json), then screen the result for every corruption string
// known on this plate. Nothing is authored here.
const fs=require('fs');
const scope=require('./scope.json');
const recomposed=require('./recomposed.json');
const calib=require('./calib2.json').per;

// Corruption strings established on this plate, plus the two the brief named.
// NOTE: 'ඉංග්‍රීසිෙන්' comes from the COURSE-WIDE presentation TEMPLATE
// ({target_lang_name}ෙන්), so it is present in all 1300 presentation texts and is
// a separate, out-of-scope class. It is screened SEPARATELY, never as a blocker.
const CORRUPT=['මමා','මමතා','ෙවෙනස','ඥග','දිහා','නනිකු','මමට','මමේ','මමගේ'];
const TEMPLATE_ARTEFACT='ඉංග්‍රීසිෙන්';

const byId=new Map(calib.map(c=>[c.id,c]));
const out=[];
for(const o of scope){
  const c=byId.get(o.id);
  if(!o.legos.length) continue;                    // the 2 phrase clips handled separately
  const lego=o.legos[0];
  const rc=recomposed[lego.lego_id];
  const oldText=o.audio.text;
  const newText=rc?rc.text:null;
  const residue=newText?CORRUPT.filter(s=>newText.includes(s)):[];
  out.push({
    id:o.id, lego:lego.lego_id, seed:lego.seed_number,
    cardKnown:lego.known_text, cardTarget:lego.target_text,
    oldText, oldDur:o.audio.duration_ms,
    newText, contextSource:rc?rc.contextSource:null, contextText:rc?rc.contextText:null,
    residue,
    templateArtefact: newText?newText.includes(TEMPLATE_ARTEFACT):null,
    changed: newText!==oldText,
    voice:o.audio.voice_id, role:o.audio.role,
  });
}
fs.writeFileSync(__dirname+'/plan.json',JSON.stringify(out,null,1));

console.log('lego-presentation clips in scope:',out.length);
console.log('  recomposition available:',out.filter(o=>o.newText).length);
console.log('  recomposed text DIFFERS from stored (i.e. stored was stale):',out.filter(o=>o.changed).length);
console.log('  recomposed text IDENTICAL to stored (recomposition alone will NOT fix):',out.filter(o=>!o.changed).length);
console.log('  recomposed text still carries corruption:',out.filter(o=>o.residue.length).length);
const rc={}; for(const o of out) rc[o.contextSource]=(rc[o.contextSource]||0)+1;
console.log('  context sources:',JSON.stringify(rc));
console.log('\n--- clips whose recomposition still carries corruption ---');
for(const o of out.filter(o=>o.residue.length))
  console.log(' ',o.lego,'seed',o.seed,'residue',JSON.stringify(o.residue),'from',o.contextSource,'::',JSON.stringify(o.newText));
console.log('\n--- clips where recomposition is a NO-OP (still says මමා) ---');
for(const o of out.filter(o=>!o.changed))
  console.log(' ',o.lego,'seed',o.seed,'card_known',JSON.stringify(o.cardKnown),'::',JSON.stringify(o.newText));
console.log('\ntemplate artefact present in recomposed:',out.filter(o=>o.templateArtefact).length,'/',out.filter(o=>o.newText).length,'(course-wide, out of scope)');
