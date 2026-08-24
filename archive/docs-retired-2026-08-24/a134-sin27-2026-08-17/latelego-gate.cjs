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
const PROP={
 246:{old:"ඔයාව උදව් කරන්නයි මම ඇයට ඕනේ කළා, හැබැයි ඇය ගොඩක් බිස්ස.",
      minimal:"ඔයාව උදව් කරන්නයි මම ඇයට ඕනේ කළා, ඒත් ඇය ගොඩක් බිස්ස.",
      fuller:"මම ඔයාව උදව් කරන්නයි ඇයට ඕනේ කළා, ඒත් ඇය ගොඩක් බිස්ස."},
 426:{old:"ඒ අයට ඔකොව්කො ආදරේ කරන්නයි ඕනේ, හැබැයි ඒ අය දුකෙන් ඉන්නවා.",
      minimal:"ඒ අයට ඔකොව්කො ආදරේ කරන්නයි ඕනේ, ඒත් ඒ අය දුකෙන් ඉන්නවා."},
 431:{old:"ඒ අය තාම සූදානම් නෑ, හැබැයි ඉක්මනින් සූදානම් වෙනවා.",
      minimal:"ඒ අය තාම සූදානම් නෑ, ඒත් ඉක්මනින් සූදානම් වෙනවා."},
 456:{old:"ඔහු ඒ තැනේ ඉන්නා, හැබැයි ගොඩ ඉඩ නෑ.",
      minimal:"ඔහු ඒ තැනේ ඉන්නා, ඒත් ගොඩ ඉඩ නෑ."},
 464:{old:"මම ඇයට එක සැරයක් මගේ කාමර අංකේ කිව්වා, හැබැයි ඇයට අමතකවෙලා.",
      minimal:"මම ඇයට එක සැරයක් මගේ කාමර අංකේ කිව්වා, ඒත් ඇයට අමතකවෙලා."}}
function breaches(text,seedNo){return tok(text).map(t=>({t,debut:taught.has(t)?taught.get(t):null}))
  .filter(x=>x.debut===null||x.debut>seedNo)}
for(const [n,v] of Object.entries(PROP)){const sn=+n
  console.log(`\n=== seed ${sn}`)
  for(const k of Object.keys(v)){const b=breaches(v[k],sn)
    console.log(`  ${k.padEnd(8)} breaches=${b.length}  ${b.map(x=>x.t+'@'+(x.debut===null?'NEVER':x.debut)).join(' ')}`)}
}
// live-DB byte check
console.log('\n=== live known_text byte-identical to my quoted OLD? ===')
for(const [n,v] of Object.entries(PROP)){const s=seeds.find(x=>x.seed_number===+n)
 console.log(` ${n}: ${s.known_text===v.old} (NFC-stable: ${s.known_text===s.known_text.normalize('NFC')})`)}
// existing clip for proposed text? (text_normalized style match)
console.log('\n=== does any phrase/seed already carry the proposed string? ===')
for(const [n,v] of Object.entries(PROP)){
 const s=v.fuller||v.minimal
 const bare=s.replace(/\.$/,'')
 const hits=[...phrases.filter(p=>p.known_text===s||p.known_text===bare).map(p=>`phrase s${p.seed_number}L${p.lego_index}p${p.position}`),
             ...seeds.filter(x=>x.known_text===s||x.known_text===bare).map(x=>`seed ${x.seed_number}`)]
 console.log(` ${n}: ${hits.length?hits.join(', '):'none — new render needed'}`)}
