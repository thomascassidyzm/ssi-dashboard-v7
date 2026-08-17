const P=require('./phrases.json'),L=require('./alllegos.json')
const all=[...P.map(p=>({t:p.known_text,s:p.seed_number})),...L.map(l=>({t:l.known_text,s:l.seed_number}))]
function c(re,label,maxseed){const m=all.filter(x=>x.s<=(maxseed||9999)&&new RegExp(re).test(x.t||''));console.log(`${label.padEnd(34)} ${String(m.length).padStart(5)}  e.g. ${m.slice(0,2).map(x=>'s'+x.s+':'+x.t).join(' | ')}`)}
console.log('--- ලියන්නෙ vs ලියන්න ---'); c('ලියන්නෙ','ලියන්නෙ'); c('ලියන්න(?!ෙ)','ලියන්න (plain)')
console.log('--- ඉගෙනගන්නෙ vs ඉගෙනගන්න ---'); c('ඉගෙනගන්නෙ','ඉගෙනගන්නෙ'); c('ඉගෙනගන්න(?![ෙේ])','ඉගෙනගන්න (plain)')
console.log('--- අපට vs අපිට ---'); c('(^| )අපට( |$)','අපට'); c('(^| )අපිට( |$)','අපිට')
console.log('--- tonight ---'); c('මේ රෑ','මේ රෑ'); c('අද රෑ','අද රෑ')
console.log('--- learning nominal ---'); c('ඉගෙන ගැනීම','ඉගෙන ගැනීම'); c('ඉගෙනගන්න එක','ඉගෙනගන්න එක'); c('ඉගෙනීම','ඉගෙනීම')
console.log('--- wait ---'); c('බලාගෙන ඉන්න','බලාගෙන ඉන්න')
console.log('--- meet us ---'); c('අපිට මුණ ගැහෙන්න','අපිට මුණ ගැහෙන්න'); c('අපිව','අපිව')
console.log('--- mind ---'); c('කමක් නෑද','කමක් නෑද'); c('කමක් නැද්ද','කමක් නැද්ද')
console.log('--- N එක ගැන (nominalised + about) ---'); c('න් *එක ගැන','* එක ගැන'); c('යන එක','යන එක')
