// Check my 73 against the DO-NOT-TOUCH list other live workers hold.
const plan=require('./plan.json');
const scope=require('./scope.json');
const GE_SEEDS=[60,154,155,156,158];        // bare-ගෙ PHRASE cluster (sibling worker)
const HELD_SEEDS=[181,207,261,71];          // held seeds
const HELD_CARDS=['S0108L02','S0116L02','S0163L01','S0245L02','S0275L01','S0369L02','S0370L02','S0372L03','S0453L02'];

const hits={geSeed:[],heldSeed:[],heldCard:[]};
for(const p of plan){
  if(GE_SEEDS.includes(p.seed)) hits.geSeed.push(p.lego);
  if(HELD_SEEDS.includes(p.seed)) hits.heldSeed.push(p.lego);
  if(HELD_CARDS.includes(p.lego)) hits.heldCard.push(p.lego);
}
// the 2 phrase clips too
const ph=scope.filter(o=>o.phrases.length).flatMap(o=>o.phrases);
console.log('=== overlap with held work ===');
console.log('legos on bare-ගෙ cluster seeds',JSON.stringify(GE_SEEDS)+':',JSON.stringify(hits.geSeed));
console.log('legos on held seeds',JSON.stringify(HELD_SEEDS)+':',JSON.stringify(hits.heldSeed));
console.log('legos that ARE held cards:',JSON.stringify(hits.heldCard));
console.log('phrase rows in scope:',JSON.stringify(ph.map(p=>({id:p.id,seed:p.seed_number}))));
console.log('phrase rows on held/ගෙ seeds:',JSON.stringify(ph.filter(p=>GE_SEEDS.concat(HELD_SEEDS).includes(p.seed_number)).map(p=>p.id)));
