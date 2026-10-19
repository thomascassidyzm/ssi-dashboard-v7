// Flatten the seven shard outputs into one edit list, report rows edited twice.
const fs=require('fs');const W=__dirname;
let all=[];for(const k of ['P1','P2','P3','P4','P5','S1','S2'])all.push(...JSON.parse(fs.readFileSync(`${W}/out/${k}.json`)).map(x=>({...x,shard:k})));
// Four LEGO-level findings were filed under their seed id; send each to the LEGO it names.
const A=require('./fa.cjs');const ix=A.buildIndex(require('./live-2026-10-19.json'));
for(const x of all){if(x.verdict==='lego-change'&&/^S\d{4}$/.test(x.row)){const m=(x.note.match(new RegExp(x.row+'L\\d\\d'))||[])[0]||[...ix.legos.values()].find(l=>l.lego_id.startsWith(x.row)&&A.normalise(l.known_text)===A.normalise(x.en_new))?.lego_id;if(m){x.row_original=x.row;x.row=m}else console.log('UNMAPPED',x.id,x.row)}}
const edits=[];const by={};
const push=(e)=>{(by[e.row]=by[e.row]||[]).push(e);edits.push(e)};
for(const x of all){
  if(x.verdict!=='no-change'&&(x.fi_new||x.en_new))push({row:x.row,en:x.en_new,fi:x.fi_new,lego:x.lego,from:x.id});
  for(const c of x.cascade||[]){if(!c.fi_new&&!c.en_new&&/delete/i.test(c.gate||''))push({row:c.row,delete:true,from:x.id+'~'});else if(c.fi_new||c.en_new)push({row:c.row,en:c.en_new,fi:c.fi_new,from:x.id+'~'})}
}
// A row both rewritten alone (a phrase finding) and inside a seed/LEGO cascade: the
// cascade version goes into the world (it assumes the seed/LEGO change is accepted);
// the standalone version is kept on the item as the fallback if that change is refused.
const isCasc=e=>e.from.endsWith('~')||/seed-change|lego-change/.test((all.find(x=>x.id===e.from)||{}).verdict||'');
for(const [r,es] of Object.entries(by)){if(es.length<2)continue;const win=es.find(isCasc)||es[0];for(const e of es)if(e!==win){e.superseded_by=win.from}}
const conflicts=Object.entries(by).filter(([r,es])=>es.length>1);
fs.writeFileSync(`${W}/all-proposals.json`,JSON.stringify(all,null,1));
fs.writeFileSync(`${W}/edits.json`,JSON.stringify(edits.filter(e=>!e.superseded_by),null,1));
fs.writeFileSync(`${W}/superseded.json`,JSON.stringify(edits.filter(e=>e.superseded_by),null,1));
console.log('proposals',all.length,'edits',edits.length,'rows edited twice',conflicts.length);
for(const [r,es] of conflicts.filter(([r,es])=>new Set(es.map(e=>e.delete?'DEL':(e.en+'|'+e.fi))).size>1)){const same=new Set(es.map(e=>e.delete?'DEL':(e.en+'|'+e.fi))).size===1;console.log(same?'same':'DIFF',r,es.map(e=>`${e.from}: ${e.delete?'DELETE':e.en+' | '+e.fi}`).join('  ##  '))}
