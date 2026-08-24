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
const cnt=w=>({seeds:seeds.filter(s=>tok(s.known_text).includes(w)).map(s=>s.seed_number),
 legos:legos.filter(l=>legoStrings(l).flatMap(tok).includes(w)).map(l=>l.seed_number),
 phrases:phrases.filter(p=>tok(p.known_text).includes(w)).length,
 debut:taught.get(w)??null})
for(const w of ['කෙනෙකු','කෙනෙක්','මිනිහෙක්','තරුණ','කැමැති','කැමති'])
 {const c=cnt(w);console.log(`${w.padEnd(10)} legoDebut=${c.debut??'NEVER'}  legos=[${c.legos.slice(0,5)}] seeds=[${c.seeds}] phraseRows=${c.phrases}`)}
const s=seeds.find(x=>x.seed_number===230)
const V1=s.known_text.replace('කැමැති','කැමති')
const V2=V1.replace('කෙනෙකු','කෙනෙක්')
const br=(t,n)=>tok(t).map(x=>({x,d:taught.has(x)?taught.get(x):null})).filter(y=>y.d===null||y.d>n)
for(const [lbl,t] of [['LIVE   ',s.known_text],['V1 spel',V1],['V2 both',V2]])
 console.log(`${lbl}: breaches=${br(t,230).length} ${br(t,230).map(y=>y.x+'@'+(y.d??'NEVER')).join(' ')}  ${JSON.stringify(t)}`)
console.log(`\nseed 230 english: ${JSON.stringify(s.target_text)}`)
console.log(`nearest own phrase: ${JSON.stringify(phrases.find(p=>p.seed_number===230&&p.position===11).known_text)} || ${JSON.stringify(phrases.find(p=>p.seed_number===230&&p.position===11).target_text)}`)
