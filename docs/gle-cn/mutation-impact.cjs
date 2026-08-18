// How often would the word-containment validator reject a legitimate Irish phrase
// because Irish initial mutation changed the lego word's surface form?
const items=require('/home/tomcassidy/SSi/ssi-dashboard-v7-clean/.a108-gle/base-items.json');
const norm=s=>(s||'').toLowerCase().replace(/[.,?!;:"'’]/g,'').split(/\s+/).filter(Boolean);
const LEN={b:'bh',c:'ch',d:'dh',f:'fh',g:'gh',m:'mh',p:'ph',s:'sh',t:'th'};
const ECL={b:'mb',c:'gc',d:'nd',f:'bhf',g:'ng',p:'bp',t:'dt'};
function variants(w){
  const v=new Set([w]); const c=w[0];
  if(LEN[c]) v.add(c+'h'+w.slice(1));
  if(ECL[c]) v.add(ECL[c]+w.slice(1));
  if('aeiouáéíóú'.includes(c)){ v.add('n'+w); v.add('n-'+w); v.add('h'+w); v.add('t-'+w); }
  if(c==='s') v.add('t'+w);
  return v;
}
// group phrases under their lego
const legos=new Map();
items.filter(x=>x.kind==='lego').forEach(l=>legos.set(l.seed+'|'+l.idx,l));
let checked=0, exact=0, mutatedOnly=0, missing=0; const eg=[];
for(const p of items){
  if(p.kind!=='phrase') continue;
  const l=legos.get(p.seed+'|'+p.idx); if(!l) continue;
  const lw=norm(l.ga), pw=new Set(norm(p.ga)); if(!lw.length) continue;
  checked++;
  const allExact=lw.every(w=>pw.has(w));
  if(allExact){exact++;continue;}
  const allWithMut=lw.every(w=>[...variants(w)].some(v=>pw.has(v)));
  if(allWithMut){ mutatedOnly++; if(eg.length<8) eg.push({seed:p.seed,lego:l.ga,en:p.en,ga:p.ga}); }
  else missing++;
}
console.log('lego-linked phrases checked:', checked);
console.log('  contain every lego word verbatim (validator PASSES):', exact, (100*exact/checked).toFixed(1)+'%');
console.log('  pass ONLY once mutation is allowed (validator REJECTS a valid phrase):', mutatedOnly, (100*mutatedOnly/checked).toFixed(1)+'%');
console.log('  lego word genuinely absent (rejection is correct):', missing, (100*missing/checked).toFixed(1)+'%');
console.log('\nexamples the validator would wrongly reject:');
eg.forEach(e=>console.log(`  s${e.seed} lego "${e.lego}" | ${e.en} => ${e.ga}`));
