const fs=require('fs');
const cues=JSON.parse(fs.readFileSync(process.env.CS_SCRATCH+'/cues.json','utf8'));

// Carriers: masculine form -> feminine form, valid ONLY when the clause subject is the speaker (मैं / 1sg).
const MAP={
 'चाहता':'चाहती','सकता':'सकती','रहा':'रही','था':'थी','जानता':'जानती','करता':'करती',
 'बोलता':'बोलती','रहता':'रहती','लेता':'लेती','देता':'देती','आता':'आती','जाता':'जाती',
 'होता':'होती','खेलता':'खेलती','पाता':'पाती','कहता':'कहती','रखता':'रखती','समझता':'समझती',
 'सीखता':'सीखती','सोचता':'सोचती','देखता':'देखती','लगता':'लगती',
 'गया':'गई','आया':'आई','मिला':'मिली','लगा':'लगी','पड़ा':'पड़ी','बचा':'बची','चुका':'चुकी',
 'थका':'थकी','खड़ा':'खड़ी','बैठा':'बैठी','उठा':'उठी','भीगा':'भीगी','चला':'चली','सका':'सकी',
 'पाया':'पाई','अकेला':'अकेली',
 'जाऊँगा':'जाऊँगी','चाहूँगा':'चाहूँगी','करूँगा':'करूँगी','पाऊँगा':'पाऊँगी',
 'दौड़ूँगा':'दौड़ूँगी','पूछूँगा':'पूछूँगी','होऊँगा':'होऊँगी','लाऊँगा':'लाऊँगी','बोलूँगा':'बोलूँगी'
};
// context-restricted carriers
const PAIR=[];
// applied to the feminine string after the main pass (कि-complement continuing the same subject)
const PAIR2=[['भाग्यशाली थी कि अफ़्रीका जा सका','भाग्यशाली थी कि अफ़्रीका जा सकी']];

const REL=new Set(['जो','जिसने','जिसे','जिससे','जिसके','जिन्हें','जिनके']);
const BOUND=new Set(['कि','जो','जिसने','जिसे','जिससे','जिसके','जिन्हें','जिनके','जब','अगर','तो',
 'लेकिन','और','क्योंकि','ताकि','हालाँकि','जैसे','चाहे','बजाय','इसलिए','इसीलिए','या','काश','फिर','बल्कि']);
const SUBJ1=new Set(['मैं']);
const SUBJOTH=new Set(['मैंने','आप','आपने','आपको','वह','वे','उसने','उन्होंने','उसे','उन्हें',
 'यह','ये','कोई','कौन','हम','हमने','हमें','मुझे','जो','जिसने','जिसे','जिन्हें','सब','सबने','सबको',
 'लोग','लोगों','किसने','चलो','कुत्ता','दर्द']);

const toks=t=>t.split(/(\s+|[।,.?!"'()])/);
function transform(text){
  const parts=toks(text);
  let subj=null, changed=[], any=false;
  const out=parts.slice();
  let unresolved=false;
  for(let i=0;i<parts.length;i++){
    const w=parts[i];
    if(!w.trim())continue;
    if(BOUND.has(w)||w===','||w==='?'||w==='।'){subj=null;continue;}
    if(SUBJ1.has(w)){subj='I';continue;}
    if(SUBJOTH.has(w)){subj='O';continue;}
    // 1sg morphology forces speaker subject
    if(/ूँगा$|ूँगी$/.test(w)&&subj===null)subj='I';
    if(w==='हूँ'&&subj===null)subj='I';
    if(MAP[w]){
      if(subj==='I'){out[i]=MAP[w];changed.push(w);any=true;}
      else if(subj===null) unresolved=true;
    }
  }
  let f=out.join('');
  // retro pass: हूँ later in clause means the clause was 1sg — handled by pre-scan below
  return {f,changed,any,unresolved};
}
// pre-scan: for each clause, if it contains हूँ / ूँगा and no other subject, mark मैं implicit
function transform2(text){
  // split into clauses keeping order
  const parts=toks(text);
  const clauses=[[]];
  for(const p of parts){
    if(BOUND.has(p.trim())||/^[।,?!]$/.test(p.trim())){clauses.push([p]);clauses.push([]);}
    else clauses[clauses.length-1].push(p);
  }
  let prev=null;const outp=[];const changed=[];let unres=false;let relNext=false;let softBoundary=true;
  for(const cl of clauses){
    const words=cl.filter(x=>x.trim());
    let subj=null;
    for(const w of words){ if(SUBJ1.has(w)){subj='I';break;} if(SUBJOTH.has(w)||REL.has(w)){subj='O';break;} }
    if(subj===null && relNext){subj='O';}
    if(subj===null){
      if(words.some(w=>w==='हूँ'||/(ूँगा|ूँगी|ऊँगा|ऊँगी|ूँ|ऊँ)$/.test(w))) subj='I';
      else if(softBoundary) subj=prev;
    }
    relNext = cl.some(w=>REL.has(w));
    softBoundary = cl.every(w=>!w.trim()||['और','फिर','लेकिन',',','या','बल्कि','तो','इसलिए','इसीलिए'].includes(w.trim()));
    if(subj) prev=subj;
    const o=cl.slice();
    let cur=subj, seenI=(subj==='I');
    for(let i=0;i<cl.length;i++){
      const w=cl[i];
      if(SUBJ1.has(w)){cur='I';seenI=true;continue;}
      if((SUBJOTH.has(w)||REL.has(w)) && !seenI){cur='O';continue;}
      if(w==='बड़ा'){
        const nxt=cl.slice(i+1).find(x=>x.trim());
        if(cur==='I'&&(nxt==='होना'||nxt==='होकर')){o[i]='बड़ी';changed.push('बड़ा '+nxt);}
        continue;
      }
      if(w==='वाला'){
        const nxt=cl.slice(i+1).find(x=>x.trim());
        if(cur==='I'&&nxt==='हूँ'){o[i]='वाली';changed.push('वाला हूँ');}
        continue;
      }
      if(MAP[w]){ if(cur==='I'){o[i]=MAP[w];changed.push(w);} else if(cur===null) unres=true; }
    }
    outp.push(o.join(''));
  }
  let f=outp.join('');
  let m=text;
  // 1st-person dative object predicated by an adjective: "मुझे अकेला छोड़ना" (speaker is the one left alone)
  if(f.includes('मुझे अकेला')){f=f.split('मुझे अकेला').join('मुझे अकेली');changed.push('मुझे अकेला');}
  if(changed.length){
    for(const [a,b] of [['थकी हुआ','थकी हुई'],['थोड़ा थकी','थोड़ी थकी']]){
      if(f.includes(a)){f=f.split(a).join(b);}
    }
  }
  for(const [a,b] of PAIR2){ if(f.includes(a)){f=f.split(a).join(b);changed.push(a);} }
  return {f,changed,unres};
}
// Fragment legos with no overt subject, ruled BY READING their parent seed (see report).
const FORCE_I=new Set(['बोलता','ज़्यादा अच्छा महसूस करने लगा था','नहीं सोच रहा था','चिंता नहीं करता',
 'कोशिश नहीं कर रहा','चाहता था','देना चाहता था','अफ़्रीका जा सका','था']);
const res=[];const unresolved=[];
for(const c of cues){
  const r=transform2(FORCE_I.has(c.t)?'मैं '+c.t:c.t);
  if(FORCE_I.has(c.t)) r.f=r.f.replace(/^मैं /,'');
  if(r.f!==c.t) res.push({o:c.o,m:c.t,f:r.f,c:[...new Set(r.changed)]});
  else if(r.unres) unresolved.push(c.t);
}
console.log('gendered cues:',res.length,'of',cues.length,'| unresolved-subject cues with a carrier:',unresolved.length);
fs.writeFileSync(process.env.CS_SCRATCH+'/gendered.json',JSON.stringify(res));
fs.writeFileSync(process.env.CS_SCRATCH+'/unresolved.txt',unresolved.join('\n'));
const byTok={};for(const r of res)for(const t of r.c)byTok[t]=(byTok[t]||0)+1;
console.log(Object.entries(byTok).sort((a,b)=>b[1]-a[1]).map(([k,v])=>k+':'+v).join(' '));
