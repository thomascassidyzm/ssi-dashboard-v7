// Review items from the merged proposals + the whole-set world check.
const fs=require('fs');
const all=require('./all-proposals.json');const items=Object.fromEntries(require('./items.json').map(i=>[i.id,i]));
const w=require('./world.json');const sup=require('./superseded.json');const fixes=require('./merge-fixes.json');
const base=f=>f.replace(/[~+].*$/,'');
const flags={};for(const r of w.results)if(!r.ok){const k=base(r.from);(flags[k]=flags[k]||[]).push(`${r.row}: ${r.problems.join('; ')}`)}
// world-check results that are known-benign (component rows; English inflection read by eye; pre-existing non-contiguous LEGO)
const benign=s=>/C\d\d:/.test(s)||/drops LEGO English "to seem"/.test(s)||/S0340L02B02 no longer holds/.test(s)||/S0340L02: LEGO row/.test(s);
const OPEN={
 F158:'OPEN: "syy" is taught by no LEGO. The seed sentence can only carry it if a LEGO teaches it, e.g. a new LEGO "that isn\'t the reason why | se ei oo se syy, miksi". Adding a LEGO is a structural edit (lego.insert, needs Tom\'s go on a released course).',
 F352:'OPEN: once S0410L02 stops being "still | silti" (F260), "silti" is taught nowhere before seed 593. Seed 593, S0593L02U01 and U02 need a LEGO "still | silti" in seed 593 (lego.insert, needs Tom\'s go), or F260 is refused.',
 F322:'OPEN: the new gloss "late | myöhä" clashes (ZUT) with S0556L03 "late | myöhään". It needs a different English, e.g. "it\'s late | on myöhä" (which would also change every row of S0558L01).',
 F260:'NOTE: this takes "silti" out of seed 410, and with it the only LEGO that teaches it. See F352 (seed 593 needs a "silti" LEGO).',
};
const compRecut={F201:['S0201L01C01 tulisi','S0201L01C02 tapahtumaan'],F035:['S0243L01C02 asiaa'],F415:['S0502L03C01 oikean','S0502L03C02 sijaan'],F309:['S0526L02C03 arvaa']};
const out=[];
for(const p of all){
  const i=items[p.id];
  const src=`seed ${i.seed} | ${i.en} | ${i.fi} | ${i.cls}: ${i.reason}`;
  let proposed;
  if(p.verdict==='no-change')proposed=`KEEP AS IS. ${p.note}`;
  else if(p.verdict==='rehome')proposed=`${p.en_new} | ${p.fi_new}   (moves under ${p.lego})`;
  else proposed=`${p.en_new} | ${p.fi_new}`;
  // a knock-on fix made at merge replaces the item's own proposal for its own row
  const own=fixes.find(x=>x.row===p.row&&base(x.from)===p.id);
  if(own)proposed=`${own.en} | ${own.fi}`;
  const notes=[`${p.row} · ${p.verdict}`+(p.introduces&&p.introduces.length?` · INTRODUCES: ${p.introduces.join(', ')}`:'')];
  notes.push(p.note);
  const casc=(p.cascade||[]).filter(c=>c.row!==p.row);
  if(casc.length)notes.push(`ALSO CHANGES (${casc.length}): `+casc.map(c=>c.fi_new||c.en_new?`${c.row}: ${c.en_new} | ${c.fi_new}`:`${c.row}: DELETE (${c.note})`).join(' ;; '));
  const f=fixes.filter(x=>(x.from===p.id||base(x.from)===p.id)&&x.row!==p.row);if(f.length)notes.push('KNOCK-ON ROWS ADDED AT MERGE: '+f.map(x=>`${x.row}: ${x.en} | ${x.fi} (${x.why})`).join(' ;; '));
  if(own)notes.push(`MERGE: the worker proposed "${p.en_new} | ${p.fi_new}"; replaced because ${own.why}.`);
  if(/seed-change/.test(p.verdict)&&p.en_new&&p.en_new.toLowerCase().replace(/[^a-z ]/g,'')!==i.en.toLowerCase().replace(/[^a-z ]/g,''))notes.push(`THE SEED'S ENGLISH CHANGES: "${i.en}" becomes "${p.en_new}".`);
  if(compRecut[p.id])notes.push('COMPONENT ROWS TO RE-CUT WITH THE LEGO: '+compRecut[p.id].join(', '));
  const s=sup.filter(e=>base(e.from)===p.id);
  // this item's own row is ALSO rewritten inside a seed/LEGO change's cascade: say which wins
  const edAll=require('./edits.json');
  const s2=s.filter(e=>e.row===p.row);
  if(s2.length)notes.push(s2.map(e=>{const win=edAll.find(x=>x.row===e.row);if(win.en===e.en&&win.fi===e.fi)return `OVERLAP: ${base(e.superseded_by)} rewrites this row the same way as part of its seed/LEGO change.`;return `OVERLAP: ${base(e.superseded_by)} (a seed/LEGO change) also rewrites this row, as "${win.en} | ${win.fi}". If you accept ${base(e.superseded_by)}, its version wins. The rewrite above is for when ${base(e.superseded_by)} is refused (checked against the course as it is).`}).join(' ;; '));
  const fl=(flags[p.id]||[]).filter(x=>!benign(x));
  if(OPEN[p.id])notes.push(OPEN[p.id]);
  else if(fl.length)notes.push('CHECK: '+fl.join(' ;; '));
  let conf=p.confidence; if(OPEN[p.id]&&p.id!=='F260')conf='low';
  out.push({id:p.id,seed:i.seed,level:i.level==='phrase'&&!/seed|lego/.test(p.verdict)?'phrase':'seed/lego',conf,source:src,proposed,note:notes.join('\n')});
}
const rank={high:0,medium:1,low:2};
out.sort((a,b)=>(a.level==='phrase'?0:1)-(b.level==='phrase'?0:1)||rank[a.conf]-rank[b.conf]||a.seed-b.seed);
fs.writeFileSync('review-items.json',JSON.stringify(out,null,1));
const c={};for(const o of out){const k=o.level+'/'+o.conf;c[k]=(c[k]||0)+1}console.log(out.length,c);
