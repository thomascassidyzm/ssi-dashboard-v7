// ZUT via the builder's own normalisers (validation.cjs checkPhraseZUT semantics), run
// offline over the whole corpus rather than one submission.
const C=require('./corpus.json');
const P=require('./proposals.json');
const nk = s => (s || '').toLowerCase().trim().replace(/[.?!,，。？！、]+$/, '');
const nt = s => (s || '').replace(/[\s。，？！、.?!,]/g, '');
function collisions(rows){
  const m=new Map();
  for(const r of rows){ if(!r.known_text||!r.target_text) continue;
    const k=nk(r.known_text); if(!m.has(k))m.set(k,new Map());
    const t=nt(r.target_text); if(!m.get(k).has(t))m.get(k).set(t,[]);
    m.get(k).get(t).push(r); }
  const out=[];
  for(const [k,tm] of m) if(tm.size>1) out.push([k,tm]);
  return out;
}
const base=[...C.legos,...C.phrases];
const before=collisions(base);
// apply proposals
const patched=base.map(r=>{
  const hit=P.find(p=>(p.kind==='card'&&r.lego_id===p.id)||(p.kind==='phrase'&&r.known_text===p.old_known&&r.seed_number===p.seed));
  if(!hit) return r;
  if(hit.id==='S0080L01') return r; // withdrawn
  return {...r,known_text:hit.new_known,target_text:hit.english};
});
const after=collisions(patched);
const key=c=>c[0];
const bset=new Set(before.map(key)), aset=new Set(after.map(key));
console.log('ZUT collisions course-wide BEFORE:',before.length,'  AFTER:',after.length);
const introduced=after.filter(c=>!bset.has(key(c)));
const resolved=before.filter(c=>!aset.has(key(c)));
console.log('\nNEWLY INTRODUCED by my proposals:',introduced.length);
for(const [k,tm] of introduced){console.log('  ✗ '+JSON.stringify(k));for(const [t,rs] of tm)console.log('       => '+JSON.stringify(t)+'  ['+rs.map(r=>r.lego_id||('s'+r.seed_number+'/'+r.phrase_role)).join(', ')+']');}
console.log('\nRESOLVED by my proposals:',resolved.length);
for(const [k,tm] of resolved){console.log('  ✓ '+JSON.stringify(k));for(const [t,rs] of tm)console.log('       => '+JSON.stringify(t)+'  ['+rs.map(r=>r.lego_id||('s'+r.seed_number+'/'+r.phrase_role)).join(', ')+']');}
