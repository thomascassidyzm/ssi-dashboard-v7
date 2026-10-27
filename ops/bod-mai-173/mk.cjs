// Builds the two edit-batches for job #173 (Aran's signed-off bod/mai review fc157f68, drafted by #153).
// items.json is the draft; live rows are read from Popty (ph-*.json) so each op carries an exact before-state.
const fs=require('fs');const dir=__dirname;
const items=require(dir+'/items.json').items;
const C={North:'cym_nv2_for_eng',South:'cym_sv2_for_eng'};
// Aran's own wording on two North items (he typed "siwr"; the course spells it siŵr).
const OWN={'North S1531L01B01':'mae arna i ofn fod o ddim yn wir','North S1531L01U01':'dw i’n siŵr fod o ddim yn wir'};
const ops={North:[],South:[]};
for(const x of items){const [s,id]=x.id.split(' ');const c=C[s];
 const live=require(dir+`/ph-${c}.json`).find(p=>p.id===`${c}:${id}`);
 if(!live) throw new Error('missing '+x.id);
 const t=OWN[x.id]||x.proposed;
 ops[s].push({op:'phrase.update',phrase_id:live.id,set:{target_text:t},expect:{known_text:live.known_text,target_text:live.target_text}});}
for(const s of ['North','South'])fs.writeFileSync(`${dir}/${s.toLowerCase()}-batch.json`,JSON.stringify({ops:ops[s]},null,1));
console.log(ops.North.length,ops.South.length);
