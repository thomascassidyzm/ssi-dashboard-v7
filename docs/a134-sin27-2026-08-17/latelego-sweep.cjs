const fs=require('fs');const D='/home/tomcassidy/SSi/ssi-dashboard-v7-clean/.a74-scratch/late-lego'
const seeds=JSON.parse(fs.readFileSync(D+'/seeds.json'))
const legos=JSON.parse(fs.readFileSync(D+'/legos.json'))
const phrases=JSON.parse(fs.readFileSync(D+'/phrases.json'))
// Unicode-aware known-side tokenizer (per #850): NFC, split whitespace, strip edge punctuation, KEEP ZWJ U+200D
const EDGE=/^[.,?!"'‘’“”()\[\]:;෴…\-–—]+|[.,?!"'‘’“”()\[\]:;෴…\-–—]+$/g
function tok(s){return String(s||'').normalize('NFC').split(/\s+/).map(w=>w.replace(EDGE,'')).filter(Boolean)}
function legoStrings(l){
  const out=[l.known_text]
  let c=l.components
  if(typeof c==='string'){try{c=JSON.parse(c)}catch(e){c=null}}
  const walk=v=>{if(!v)return;if(typeof v==='string')out.push(v);else if(Array.isArray(v))v.forEach(walk);else if(typeof v==='object')Object.values(v).forEach(walk)}
  walk(c);return out.filter(x=>typeof x==='string')
}
// LEGO debut: earliest seed_number where token appears (exact token) in any lego string
const legoDebutExact=new Map(), legoDebutSub=[] // sub: list of {seed, strings}
for(const l of legos){
  const s=l.seed_number
  const strs=legoStrings(l)
  legoDebutSub.push({seed:s,blob:strs.join(' ').normalize('NFC')})
  for(const t of new Set(strs.flatMap(tok))){
    if(!legoDebutExact.has(t)||legoDebutExact.get(t)>s)legoDebutExact.set(t,s)
  }
}
legoDebutSub.sort((a,b)=>a.seed-b.seed)
function legoDebutContain(t){for(const r of legoDebutSub){if(r.blob.includes(t))return r.seed}return null}
// phrase debut (a drill is arguably also exposure) - earliest seed a token appears in a phrase known_text
const phraseDebut=new Map()
for(const p of phrases){const s=p.seed_number;for(const t of new Set(tok(p.known_text))){if(!phraseDebut.has(t)||phraseDebut.get(t)>s)phraseDebut.set(t,s)}}
// seed first use
const seedUses=new Map() // token -> [seed numbers]
for(const sd of seeds){for(const t of new Set(tok(sd.known_text))){if(!seedUses.has(t))seedUses.set(t,[]);seedUses.get(t).push(sd.seed_number)}}
const rows=[]
for(const [t,uses] of seedUses){
  const first=uses[0]
  const dE=legoDebutExact.has(t)?legoDebutExact.get(t):null
  const dC=legoDebutContain(t)
  const dP=phraseDebut.has(t)?phraseDebut.get(t):null
  // effective teach point: earliest of exact-lego-debut and containment-lego-debut (generous)
  const teach=[dE,dC].filter(x=>x!==null).length?Math.min(...[dE,dC].filter(x=>x!==null)):null
  const early=uses.filter(s=>teach===null||s<teach)
  if(early.length) rows.push({token:t,uses,firstUse:first,legoDebutExact:dE,legoDebutContain:dC,phraseDebut:dP,teach,earlySeeds:early,earlyCount:early.length})
}
rows.sort((a,b)=>(b.teach===null?0:b.teach-b.firstUse)-(a.teach===null?0:a.teach-a.firstUse))
fs.writeFileSync(D+'/sweep-all.json',JSON.stringify(rows,null,1))
console.log('tokens used in seeds:',seedUses.size,' flagged (used before generous teach point):',rows.length)
// calibration: habayi
const H='හැබැයි'
console.log('\nCALIBRATION habayi:',JSON.stringify(rows.find(r=>r.token===H)||seedUses.get(H)))
// Restrict to seeds 201-668 and to tokens where teach point exists and gap is large
const late=rows.filter(r=>r.teach!==null&&r.earlySeeds.some(s=>s>=201))
console.log('\n== tokens with a real (existing) teach point, used earlier, at least one early use in 201-668:',late.length)
for(const r of late.slice(0,60))console.log(`${r.token}  teach@${r.teach} (exact ${r.legoDebutExact} / contain ${r.legoDebutContain}) phraseDebut ${r.phraseDebut}  early: ${r.earlySeeds.join(',')}  gap ${r.teach-r.firstUse}`)
