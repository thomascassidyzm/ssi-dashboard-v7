const fs=require('fs');const D='/home/tomcassidy/SSi/ssi-dashboard-v7-clean/.a74-scratch/late-lego'
const seeds=JSON.parse(fs.readFileSync(D+'/seeds.json'))
const legos=JSON.parse(fs.readFileSync(D+'/legos.json'))
const phrases=JSON.parse(fs.readFileSync(D+'/phrases.json'))
const A=[[243,'ඒකෙන්',469],[275,'ඉස්සර',480],[271,'අපේ',454],[208,'ඇහුවේ',365],[257,'ලෙයිකයි',346],[500,'අතර',559],[262,'කවුද',283],[230,'කැමැති',239]]
for(const [sn,t,teach] of A){
 const s=seeds.find(x=>x.seed_number===sn)
 console.log(`\n${'='.repeat(70)}\nseed ${sn}  token "${t}"  teach@${teach}`)
 console.log(`  KNOWN: ${s.known_text}`)
 console.log(`  ENG:   ${s.target_text}`)
 // where is it taught?
 const tl=legos.filter(l=>(JSON.stringify([l.known_text,l.components])||'').includes(t))
 console.log(`  taught in legos: ${tl.slice(0,3).map(l=>'s'+l.seed_number+' '+JSON.stringify(l.known_text)+'->'+JSON.stringify(l.target_text)).join(' | ')}`)
 // this seed's own legos & final use phrase
 console.log(`  this seed's legos: ${legos.filter(l=>l.seed_number===sn).map(l=>JSON.stringify(l.known_text)+'->'+JSON.stringify(l.target_text)).join(' | ')}`)
 const own=phrases.filter(p=>p.seed_number===sn&&(p.known_text||'').includes(t))
 console.log(`  this seed's phrases containing it: ${own.length?own.map(p=>p.phrase_role+' '+JSON.stringify(p.known_text)+'->'+JSON.stringify(p.target_text)).join(' | '):'NONE'}`)
}
// For 'our' (ape) and 'who' (kawuda) and 'like' (leyikayi): what earlier-taught words cover the concept?
console.log(`\n${'#'.repeat(70)}\nCONCEPT SEARCH: earliest lego whose ENGLISH matches the concept`)
for(const [concept,re] of [['our',/\bour\b/i],['who',/\bwho\b/i],['like (verb)',/^likes?$|\blike\b/i],['before/ago',/\bbefore\b|\bago\b|\bused to\b/i],['between/among',/\bbetween\b|\bamong\b/i],['asked',/\basked\b/i],['from it/by that',/\bfrom (it|that)\b|\bby that\b/i]]){
 const hits=legos.filter(l=>re.test(l.target_text||'')).slice(0,6)
 console.log(`\n  ${concept}: ${hits.length?hits.map(l=>'s'+l.seed_number+' '+JSON.stringify(l.known_text)+'->'+JSON.stringify(l.target_text)).join('\n      '):'no lego'}`)
}
