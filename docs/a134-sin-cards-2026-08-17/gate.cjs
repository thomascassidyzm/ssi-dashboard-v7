// DISCLOSED: uses the Unicode-aware tokenizeKnown from fix/known-side-tokenizer-unicode-2026-08-17
// (worktree .worktrees/a135). The tokenizer shipped on main is ASCII-only and returns [] for Sinhala.
const {tokenizeKnown}=require('/home/tomcassidy/SSi/ssi-dashboard-v7-clean/.worktrees/a135/services/course-builder/lib/validation.cjs');
const C=require('./corpus.json');
const contract=require('/home/tomcassidy/SSi/ssi-dashboard-v7-clean/docs/pair-contracts/eng_for_sin.contract.cjs');
const FREE=new Set(contract.freeClass.map(w=>tokenizeKnown(w)[0]).filter(Boolean));
// earliest seed at which each Sinhala token appears anywhere on the known side
const first=new Map();
const note=(txt,sn)=>{for(const t of tokenizeKnown(txt||'')){const p=first.get(t);if(p===undefined||sn<p)first.set(t,sn);}};
for(const a of [C.legos,C.phrases,C.seeds]) for(const r of a) note(r.known_text,r.seed_number);
const PROPOSALS=require('./proposals.json');
let bad=0;
for(const p of PROPOSALS){
  const toks=tokenizeKnown(p.new_known);
  const viol=toks.filter(t=>!FREE.has(t)&&(first.get(t)===undefined||first.get(t)>p.seed));
  const status=viol.length?'✗ VIOLATION':'✓ ok';
  console.log(status.padEnd(12),p.id.padEnd(12),'s'+String(p.seed).padEnd(4),JSON.stringify(p.new_known));
  for(const t of viol){const f=first.get(t);console.log('                 └─ "'+t+'" '+(f===undefined?'NEVER appears in course':'first appears at seed '+f+' (> '+p.seed+')'));}
  if(viol.length)bad++;
  // also report earliest-attestation of every token, for the record
  console.log('                 tokens: '+toks.map(t=>t+'@s'+(first.get(t)===undefined?'NONE':first.get(t))).join('  '));
}
console.log('\n'+PROPOSALS.length+' proposals, '+bad+' with introduced-before-used violations');
