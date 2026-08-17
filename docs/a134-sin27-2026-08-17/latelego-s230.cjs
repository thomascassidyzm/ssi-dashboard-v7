const fs=require('fs');const D='/home/tomcassidy/SSi/ssi-dashboard-v7-clean/.a74-scratch/late-lego'
const seeds=JSON.parse(fs.readFileSync(D+'/seeds.json'))
const legos=JSON.parse(fs.readFileSync(D+'/legos.json'))
const phrases=JSON.parse(fs.readFileSync(D+'/phrases.json'))
const EDGE=/^[.,?!"'‘’“”()\[\]:;෴…\-–—]+|[.,?!"'‘’“”()\[\]:;෴…\-–—]+$/g
function tok(s){return String(s||'').normalize('NFC').split(/\s+/).map(w=>w.replace(EDGE,'')).filter(Boolean)}
function legoStrings(l){const out=[l.known_text];let c=l.components
 if(typeof c==='string'){try{c=JSON.parse(c)}catch(e){c=null}}
 const walk=v=>{if(!v)return;if(typeof v==='string')out.push(v);else if(Array.isArray(v))v.forEach(walk);else if(typeof v==='object')Object.values(v).forEach(walk)}
 walk(c);return out.filter(x=>typeof x==='string')}
const taught=new Map()
for(const l of legos)for(const t of new Set(legoStrings(l).flatMap(tok)))if(!taught.has(t)||taught.get(t)>l.seed_number)taught.set(t,l.seed_number)
const A='කැමැති',B='කැමති'
console.log(`codepoints A(seed): ${[...A].map(c=>'U+'+c.codePointAt(0).toString(16).toUpperCase().padStart(4,'0')).join(' ')}`)
console.log(`codepoints B(lego): ${[...B].map(c=>'U+'+c.codePointAt(0).toString(16).toUpperCase().padStart(4,'0')).join(' ')}`)
console.log(`NFC-equal? ${A.normalize('NFC')===B.normalize('NFC')}   NFD-equal? ${A.normalize('NFD')===B.normalize('NFD')}`)
console.log(`\nlego debut  ${A} -> ${taught.get(A)}`)
console.log(`lego debut  ${B} -> ${taught.get(B)}`)
for(const v of [A,B]){
 console.log(`\n=== "${v}" ===`)
 console.log(` seeds: ${seeds.filter(s=>tok(s.known_text).includes(v)).map(s=>s.seed_number).join(',')||'none'}`)
 console.log(` legos: ${legos.filter(l=>legoStrings(l).flatMap(tok).includes(v)).slice(0,8).map(l=>'s'+l.seed_number+' '+JSON.stringify(l.known_text)+'->'+JSON.stringify(l.target_text)).join('\n        ')||'none'}`)
 const p=phrases.filter(x=>tok(x.known_text).includes(v))
 console.log(` phrases: ${p.length}  (earliest seed ${p.length?Math.min(...p.map(x=>x.seed_number)):'-'})`)
}
const s=seeds.find(x=>x.seed_number===230)
const OLD=s.known_text, NEW=OLD.replace(A,B)
console.log(`\nseed 230 OLD: ${JSON.stringify(OLD)}`)
console.log(`seed 230 NEW: ${JSON.stringify(NEW)}`)
console.log(`its own lego: ${JSON.stringify(legos.find(l=>l.lego_id==='S0230L01').known_text)}`)
const br=t=>tok(t).map(x=>({x,d:taught.has(x)?taught.get(x):null})).filter(y=>y.d===null||y.d>230)
console.log(`breaches OLD: ${br(OLD).map(y=>y.x+'@'+(y.d??'NEVER')).join(' ')||'0'}`)
console.log(`breaches NEW: ${br(NEW).map(y=>y.x+'@'+(y.d??'NEVER')).join(' ')||'0'}`)
console.log(`\nseed 230 phrases:`)
for(const p of phrases.filter(p=>p.seed_number===230))console.log(`  L${p.lego_index}p${p.position} ${p.phrase_role}: ${p.known_text} || ${p.target_text}`)
