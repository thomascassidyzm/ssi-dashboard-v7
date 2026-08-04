const fs=require('fs');
const rows=fs.readFileSync('scripts/deepening/tail-audit-results.jsonl','utf8').split('\n').filter(l=>l.trim()).map(l=>JSON.parse(l));
const byV={};
for(const r of rows){ if(r.error) continue; const k=r.voice_id||'?'; byV[k]=byV[k]||{t:0,d:0,kinds:{}}; byV[k].t++; if(r.click){ byV[k].d++; byV[k].kinds[r.kind]=(byV[k].kinds[r.kind]||0)+1; } }
for(const [k,v] of Object.entries(byV).sort((a,b)=>b[1].d-a[1].d)){
  console.log(`  ${k}: ${v.d}/${v.t} (${(100*v.d/v.t).toFixed(1)}%) kinds=${JSON.stringify(v.kinds)}`);
}
