const C=require('./corpus.json');
const rows=[...C.legos.map(r=>({...r,_t:'card'})),...C.phrases.map(r=>({...r,_t:'phrase'})),...C.seeds.map(r=>({...r,_t:'seed'}))];
const pairs=[['මම','මට'],['ඔයා','ඔයාට'],['ඔහු','ඔහුට'],['ඇය','ඇයට'],['අපි','අපිට'],['ඒ අය','ඒ අයට']];
// classify each adjacent-NOM site by what FOLLOWS ඕනේ
const buckets={};
const bare=[];
for(const [nom] of pairs){
  const rN=new RegExp(nom+'(?:\\s*\\.\\.\\.)?\\s+ඕනේ(\\s*\\S*)');
  for(const r of rows){const m=(r.known_text||'').match(rN); if(!m)continue;
    const nxt=(m[1]||'').trim();
    let cls;
    if(/^ක(රනවා|ළා|ළේ|ළාද|ළ|රේ|රන්නේ|රනවාද)/.test(nxt)) cls='ඕනේ කරනවා/කළා (transitive verb)';
    else if(/^නම්/.test(nxt)) cls='ඕනේ නම් (conditional)';
    else if(/^(නෑ|නැ)/.test(nxt)) cls='ඕනේ නෑ (negated, bare)';
    else cls='BARE ඕනේ';
    buckets[cls]=(buckets[cls]||0)+1;
    if(cls==='BARE ඕනේ'||cls==='ඕනේ නෑ (negated, bare)') bare.push([r,nom,cls]);
  }
}
console.log('adjacent-NOMINATIVE sites by construction:');
for(const [k,v] of Object.entries(buckets).sort((a,b)=>b[1]-a[1])) console.log('  '+String(v).padStart(4),k);
console.log('\n=> TRUE bare-ඕනේ nominative sites (the disputed pattern):',bare.length);
const bt={};for(const [r] of bare)bt[r._t]=(bt[r._t]||0)+1;
console.log('   by row type:',JSON.stringify(bt));
console.log('\n   the bare-nominative CARDS:');
for(const [r,,c] of bare.filter(x=>x[0]._t==='card')) console.log('    ',r.lego_id,JSON.stringify(r.known_text),'=>',JSON.stringify(r.target_text),' ['+c+']');
console.log('\n   sample bare-nominative PHRASES:');
for(const [r] of bare.filter(x=>x[0]._t==='phrase').slice(0,10)) console.log('     s'+r.seed_number,JSON.stringify(r.known_text),'=>',JSON.stringify(r.target_text));
