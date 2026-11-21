// usage: node ctx.cjs <course> <fromIdx> <toIdx>  -- prints sheet lines with taught-LEGO known wording hints
const path=require('path');const fs=require('fs');
const T=(process.env.TOOLS||'/home/tomcassidy/.cs-worktrees/ssi-dashboard-v7-clean/755-item20-plan-shard-urd-pan/ops/paid-cleanup-item20/tools');const L=require(path.join(T,'lib.cjs'));
const [course,a,b]=process.argv.slice(2);
const sheet=JSON.parse(fs.readFileSync(path.join(L.ITEM_DIR,course,'sheet.json'),'utf8'));
const seeds=L.loadLive(course);
const order=[];for(const s of seeds)for(const l of s.legos)order.push(l);
const norm=t=>' '+String(t||'').toLowerCase().replace(/[^\p{L}\p{N}']+/gu,' ').trim()+' ';
const skip=new Set((process.env.SKIP||'').split(',').filter(Boolean).map(Number));
for(let i=Number(a);i<=Number(b)&&i<sheet.lines.length;i++){const ln=sheet.lines[i];
 if(skip.has(ln.seed))continue;
 console.log(`#${i} ${ln.lego} ${ln.slot}${ln.author?' AUTHOR':''} [${ln.lego_en} | ${ln.lego_known}]`);
 if(ln.en)console.log(`   en: ${ln.en}\n   hi: ${ln.hi}`);
 if(ln.known)console.log(`   KNOWN: ${ln.known} (${ln.gender})`);
 if(ln.en){const e=norm(ln.en);const hits=new Map();
  for(const l of order){ if(l.lego_id>ln.lego)break; const t=norm(l.target_text); if(t.trim()&&e.includes(t)&&t.trim()!==norm(ln.lego_en).trim()) hits.set(t.trim(),l.known_text);
   for(const c of l.components||[]){const ct=norm(c.target); if(ct.trim()&&e.includes(ct)&&!hits.has(ct.trim()))hits.set(ct.trim(),c.known);}}
  const arr=[...hits].sort((x,y)=>y[0].length-x[0].length).slice(0,9);
  console.log('   · '+arr.map(([t,k])=>`${t}=${k}`).join(' · '));}
}
