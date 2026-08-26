// Deterministic sample (LCG seeded from argv) so the calibration is reproducible.
const h=require(process.env.CS_SCRATCH+"/hits.json");
const which=process.argv[2], n=parseInt(process.argv[3]||"60",10), seed=parseInt(process.argv[4]||"7",10);
const pool=which==="clean"?h.filter(r=>r.band==="CLEAN"):h.filter(r=>r.band!=="CLEAN");
let s=seed; const rnd=()=>(s=(s*48271)%2147483647)/2147483647;
const idx=new Set(); while(idx.size<n) idx.add(Math.floor(rnd()*pool.length));
[...idx].forEach((i,k)=>{const r=pool[i];
console.log(`${k+1}. [${r.band} ${r.score}] ${r.id.split(":")[1]}  s${r.seed}\n   K: ${r.known}\n   T: ${r.target}` + (which==="clean"?"":`\n   -> ${r.detail.join(" | ")}`));});
