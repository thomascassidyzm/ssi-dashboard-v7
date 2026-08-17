// Which SLOT did මමා sit in? The sin template is
//   "{target_lang_name}ෙන්. '{known}'. '{seed}' ඉතින්. :"
// so the two quoted groups are, in order, the HEADWORD and the EXAMPLE SENTENCE.
// Parse the STORED text back into slots to classify the defect.
const plan=require('./plan.json');
const M='මමා';
const RE=/^(.*?)ෙන්\. '(.*)'\. '(.*)' ඉතින්\. :$/s;
let head=0,ex=0,both=0,unparsed=0;
const rows=[];
for(const p of plan){
  const m=p.oldText.match(RE);
  if(!m){unparsed++;rows.push({lego:p.lego,slot:'UNPARSED',old:p.oldText});continue}
  const [,lang,known,seed]=m;
  const inH=known.includes(M), inS=seed.includes(M);
  const slot = inH&&inS?'BOTH':inH?'HEADWORD':inS?'EXAMPLE':'NEITHER(lang?)';
  if(slot==='BOTH')both++; else if(slot==='HEADWORD')head++; else if(slot==='EXAMPLE')ex++;
  rows.push({lego:p.lego,seed:p.seed,slot,oldHead:known,oldEx:seed,cardKnown:p.cardKnown,newText:p.newText});
}
console.log('HEADWORD slot:',head);
console.log('EXAMPLE slot:',ex);
console.log('BOTH slots:',both);
console.log('unparsed:',unparsed);
require('fs').writeFileSync(__dirname+'/slots.json',JSON.stringify(rows,null,1));
console.log('\n--- HEADWORD-slot cases (the card text itself was once corrupt; now repaired) ---');
for(const r of rows.filter(r=>r.slot==='HEADWORD'||r.slot==='BOTH'))
  console.log(` ${r.lego} s${r.seed} [${r.slot}] stale headword=${JSON.stringify(r.oldHead)} -> card now=${JSON.stringify(r.cardKnown)}`);
if(unparsed) { console.log('\n--- unparsed ---'); rows.filter(r=>r.slot==='UNPARSED').forEach(r=>console.log(' ',r.lego,JSON.stringify(r.old))); }
