// compact plan text -> plans/S####.json
// lines: "S34" starts seed; "L01 u B02 known | target"; "L01 i b known | target" (b/u); "L01 d B02 B03"; "L01 gap why"; "# note"
const fs=require('fs');const src=fs.readFileSync(process.argv[2],'utf8');
const dir=process.argv[3];let cur=null;const out={};
for(let line of src.split('\n')){line=line.trim();if(!line||line.startsWith('#'))continue;
 let m;
 if((m=line.match(/^S(\d+)$/))){cur=out[+m[1]]||{seed:+m[1],legos:{},notes:'cs #708·AI item 4: glued in-English/tag rows and unflagged junk in touched baskets rewritten from taught chunks'};out[cur.seed]=cur;continue}
 m=line.match(/^(L\d\d)\s+(u|i|d|gap)\s+(.*)$/);if(!m)throw new Error('bad: '+line);
 const [,l,op,rest]=m;const e=cur.legos[l]=cur.legos[l]||{};
 if(op==='d'){e.delete=(e.delete||[]).concat(rest.split(/\s+/));continue}
 if(op==='gap'){e.accept_gap=rest;continue}
 const mm=rest.match(/^(\S+)\s+(.*?)\s*\|\s*(.*)$/);if(!mm)throw new Error('bad: '+line);
 if(op==='u'){(e.update=e.update||{})[mm[1]]=[mm[2],mm[3]]}
 else{(e.insert=e.insert||[]).push([mm[1]==='b'?'build':'use',mm[2],mm[3]])}
}
for(const s of Object.values(out)){const f=`${dir}/S${String(s.seed).padStart(4,'0')}.json`;fs.writeFileSync(f,JSON.stringify(s,null,1));}
console.log('wrote',Object.keys(out).join(','));
