// tile.cjs — inventory-aware helpers. Usage:
//   node tile.cjs syl "<irish>"            -> syllable estimate + cap
//   node tile.cjs t <seed> "<irish>" ...   -> can this target tile from taught chunks?
//   node tile.cjs chunks <seed> [grep]     -> list taught chunks available before <seed>
const path=require('path');const ROOT=path.resolve(__dirname,'../../..');
const {sb}=require('../q.cjs');
const {extractVocab,normalizeForContainment}=require(path.join(ROOT,'services/course-builder/lib/text-normalization.cjs'));
const {checkLegoSyllables}=require(path.join(ROOT,'services/course-builder/lib/language-config.cjs'));
const COURSE='gle_cn_for_eng';
async function vocab(n){const set=new Set();
 const {data:seeds}=await sb.from('course_seeds').select('target_text').eq('course_code',COURSE).lt('seed_number',n).not('target_text','is',null);
 for(const s of seeds||[]) extractVocab(s.target_text,false).forEach(v=>set.add(v));
 let all=[];for(let f=0;;f+=1000){const {data}=await sb.from('course_legos').select('target_text,type,components').eq('course_code',COURSE).lt('seed_number',n).order('seed_number').range(f,f+999);all.push(...data);if(data.length<1000)break;}
 for(const l of all){extractVocab(l.target_text,false).forEach(v=>set.add(v)); if(l.type==='M'&&l.components) for(const c of l.components) extractVocab(c.target,false).forEach(v=>set.add(v));}
 return set;}
function tile(target,set,extra=[]){
 const chunks=new Map();
 for(const c of [...set,...extra]){const w=normalizeForContainment(c).split(' ').filter(Boolean);if(!w.length)continue;
  if(!chunks.has(w[0]))chunks.set(w[0],[]);chunks.get(w[0]).push(w);}
 const pw=normalizeForContainment(target).split(' ').filter(Boolean);const n=pw.length;
 const dp=new Array(n+1).fill(false);dp[0]=true;const from=new Array(n+1).fill(null);
 for(let i=0;i<n;i++){if(!dp[i])continue;for(const ch of chunks.get(pw[i])||[]){
   if(i+ch.length<=n&&ch.every((w,k)=>w===pw[i+k])){if(!dp[i+ch.length]){dp[i+ch.length]=true;from[i+ch.length]=[i,ch.join(' ')];}}}}
 if(!dp[n]){let best=n;while(best>0&&!dp[best])best--;return{ok:false,upto:pw.slice(0,best).join(' '),rest:pw.slice(best).join(' ')};}
 const parts=[];let i=n;while(i>0){parts.unshift(from[i][1]);i=from[i][0];}
 return{ok:true,parts};}
(async()=>{
 const cmd=process.argv[2];
 if(cmd==='syl'){for(const s of process.argv.slice(3)){const r=checkLegoSyllables(s,COURSE);console.log(`${r.ok?'OK ':'TOO LONG '}${r.syllables}/${r.max}  ${s}`);}return;}
 const n=+process.argv[3];const set=await vocab(n);
 if(cmd==='chunks'){const g=process.argv[4];const a=[...set].filter(c=>c.split(' ').length<=8&&(!g||c.includes(g))).sort();a.forEach(c=>console.log(c));console.error(a.length+' chunks (<=8 words)');return;}
 if(cmd==='t'){for(const s of process.argv.slice(4)){const r=tile(s,set);console.log(r.ok?`OK   [${r.parts.join('][')}]`:`FAIL "${s}"  -> stuck at: ${r.rest}`);}return;}
})().catch(e=>console.error(e));
