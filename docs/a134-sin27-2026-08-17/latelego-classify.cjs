const fs=require('fs');const D='/home/tomcassidy/SSi/ssi-dashboard-v7-clean/.a74-scratch/late-lego'
const seeds=JSON.parse(fs.readFileSync(D+'/seeds.json'))
const legos=JSON.parse(fs.readFileSync(D+'/legos.json'))
const phrases=JSON.parse(fs.readFileSync(D+'/phrases.json'))
const rows=JSON.parse(fs.readFileSync(D+'/sweep-all.json'))
const EDGE=/^[.,?!"'‘’“”()\[\]:;෴…\-–—]+|[.,?!"'‘’“”()\[\]:;෴…\-–—]+$/g
function tok(s){return String(s||'').normalize('NFC').split(/\s+/).map(w=>w.replace(EDGE,'')).filter(Boolean)}
function legoStrings(l){const out=[l.known_text];let c=l.components
 if(typeof c==='string'){try{c=JSON.parse(c)}catch(e){c=null}}
 const walk=v=>{if(!v)return;if(typeof v==='string')out.push(v);else if(Array.isArray(v))v.forEach(walk);else if(typeof v==='object')Object.values(v).forEach(walk)}
 walk(c);return out.filter(x=>typeof x==='string')}
// taught-by-seed map: token -> earliest lego seed
const taught=new Map()
for(const l of legos)for(const t of new Set(legoStrings(l).flatMap(tok)))if(!taught.has(t)||taught.get(t)>l.seed_number)taught.set(t,l.seed_number)
const seedByNum=new Map(seeds.map(s=>[s.seed_number,s]))
// phrase exposure: token -> sorted seeds
const pexp=new Map()
for(const p of phrases)for(const t of new Set(tok(p.known_text))){if(!pexp.has(t))pexp.set(t,new Set());pexp.get(t).add(p.seed_number)}
function stemRel(t,bySeed){ // earlier-taught token sharing a >=4-char common prefix (Sinhala inflects suffixally)
  const hits=[]
  for(const [u,s] of taught){if(s>=bySeed)continue
    let i=0;while(i<Math.min(t.length,u.length)&&t[i]===u[i])i++
    if(i>=4&&(i>=t.length-3||i>=u.length-3))hits.push({tok:u,seed:s,shared:i})}
  hits.sort((a,b)=>b.shared-a.shared);return hits.slice(0,3)
}
const LATE=rows.filter(r=>r.teach!==null&&r.earlySeeds.some(s=>s>=201))
const out=[]
for(const r of LATE){
  for(const s of r.earlySeeds){
    if(s<201)continue
    const rel=stemRel(r.token,s)
    const pe=[...(pexp.get(r.token)||[])].filter(x=>x<s).sort((a,b)=>a-b)
    out.push({token:r.token,seed:s,teach:r.teach,gap:r.teach-s,
      priorPhraseSeeds:pe.slice(-3),priorPhraseCount:pe.length,
      stemRelatives:rel,
      cls: pe.length>0 ? 'C-phrase-exposed' : (rel.length? 'B-derivable' : 'A-unambiguous'),
      seedKnown:(seedByNum.get(s)||{}).known_text,seedTarget:(seedByNum.get(s)||{}).target_text})
  }
}
out.sort((a,b)=>a.cls.localeCompare(b.cls)||b.gap-a.gap)
fs.writeFileSync(D+'/classified.json',JSON.stringify(out,null,1))
for(const o of out)console.log(`[${o.cls}] seed ${o.seed}  "${o.token}" teach@${o.teach} gap ${o.gap}  priorPhrase:${o.priorPhraseCount?o.priorPhraseSeeds.join('/'):'NONE'}  stem:${o.stemRelatives.map(x=>x.tok+'@'+x.seed).join(' ')||'NONE'}`)
console.log('\ncounts',out.reduce((a,o)=>(a[o.cls]=(a[o.cls]||0)+1,a),{}))
