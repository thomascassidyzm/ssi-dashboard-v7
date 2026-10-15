const {all,seedCtx}=require(process.env.CS_SCRATCH+'/all.json'); const fs=require('fs'); const D=process.argv[2];
const K=12, per=Math.ceil(all.length/K); let shards=[],cur=[];
for(let i=0;i<all.length;i++){ cur.push(all[i]); const next=all[i+1]; if(cur.length>=per && (!next||next.minSeed!==all[i].minSeed)){shards.push(cur);cur=[]} }
if(cur.length) shards.push(cur);
shards.forEach((s,k)=>{ const id=String(k+1).padStart(2,'0'); const seeds=new Set(); s.forEach(e=>e.occ.forEach(o=>seeds.add(o.sn)));
  const ctx=[...seeds].sort((a,b)=>a-b).map(sn=>`S${String(sn).padStart(4,'0')} | ${seedCtx[sn]?.en} | ${seedCtx[sn]?.hi}`).join('\n');
  fs.writeFileSync(`${D}/in/shard-${id}.jsonl`, s.map(e=>JSON.stringify({n:e.n,t:e.t,occ:e.occ.map(o=>[o.kind,o.id.replace('hin_for_eng:',''),o.sn,o.en]),stored:e.stored})).join('\n')+'\n');
  fs.writeFileSync(`${D}/in/seed-context-${id}.txt`, ctx+'\n');
  console.log(id, s.length, 'texts', 'n', s[0].n,'-',s[s.length-1].n, 'seeds', s[0].minSeed,'-',s[s.length-1].minSeed, 'stored', s.filter(e=>e.stored).length, 'bytes', fs.statSync(`${D}/in/shard-${id}.jsonl`).size);
});
