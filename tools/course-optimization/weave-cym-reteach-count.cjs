// Job #22: count the post-block re-teach list for a woven Welsh sandbox. Input: $CS_SCRATCH/<nv2|sv2>_ordered.json
// (course_legos joined to course_running_order, ordered by position). Usage: node weave-cym-reteach-count.cjs sv2 275,280,...
// Re-teach count. A LEGO counts when ALL of:
//  (a) its seed is an OLD seed (id < 1000) that plays AFTER the HC block in the running order, is not
//      dropped, and is not one of the keep-both seeds;
//  (b) it is currently is_new = true;
//  (c) the FIRST LEGO in running order with the same English (normalizeForZUT) sits in an HC seed
//      (id >= 1000), and its Welsh is identical (normalizeForStorage) or a soft-mutation variant
//      (welsh-mutation.cjs, with the particle fix).
// Reported separately, NOT counted: same Welsh under different English; and earlier sources that are
// old seeds (re-teaches the live course already had before HC).
const fs=require('fs');const S=process.env.CS_SCRATCH;
const W='/home/tomcassidy/.cs-worktrees/ssi-dashboard-v7-clean/22-welsh-south-sandbox-replicate/services/course-builder/lib/';
const {normalizeForZUT:Z,normalizeForStorage:N}=require(W+'text-normalization.cjs');const {isSoftMutationVariant:M}=require(W+'welsh-mutation.cjs');
const [c,keepCsv]=process.argv.slice(2);const code=`cym_${c}_for_eng`;const keep=new Set(keepCsv.split(',').map(Number));
const L=JSON.parse(fs.readFileSync(`${S}/${c}_ordered.json`));const blockEnd=Math.max(...L.filter(l=>l.n>=1000).map(l=>l.p));
const firstK=new Map(),firstT=new Map();const hit=[],sub=[],pre=[];
for(const l of L){const k=Z(l.k),t=N(l.t);
  if(l.n<1000&&l.p>blockEnd&&!keep.has(l.n)&&l.is_new){const e=firstK.get(k),et=firstT.get(t);
    if(e&&(N(e.t)===t||M(code,e.t,l.t))) (e.n>=1000?hit:pre).push(l);
    else if(et&&et.n>=1000) sub.push(l);}
  if(!firstK.has(k))firstK.set(k,l); if(!firstT.has(t))firstT.set(t,l);}
const seeds=a=>new Set(a.map(l=>l.n)).size;
console.log(`${code}: COUNTED ${hit.length} LEGOs in ${seeds(hit)} seeds | same-Welsh-other-English ${sub.length} in ${seeds(sub)} | pre-existing old-course re-teach ${pre.length} in ${seeds(pre)}`);
