const fs=require('fs');
const B=JSON.parse(fs.readFileSync('built.json'));
const items=[]; let n=0;
const rec=r=> r? ((r.t||r.ka)? `RECORDED NOW: ${r.t?`Welsh ×${r.t}`:''}${r.t&&r.ka?' + ':''}${r.ka?'English':''} → spoken words change, so RE-RECORD needed` : 'Not recorded yet → no re-record') : 'New line → needs recording';
const NAME={cym_nv2_for_eng:'NORTH',cym_sv2_for_eng:'SOUTH'};
function add(id,src,prop,opts,note){ n++; items.push({id,source:`#${n} · ${src}`,proposed:prop,options:opts||['Leave it as it is'],...(note?{note}:{})}); }
const INTRO=`Here's a polite way to get someone's attention. This is the formal one, the one that goes with "chi". With friends you'd hear "esgusoda fi", but in this course we'll always use the formal one, so whenever you hear "excuse me", use "chi" for "you". The Welsh for: 'excuse me', is:`;
add('intro',`INTRODUCTION · new LEGO 'excuse me' = esgusodwch fi · both courses (North and South), seed 1639
NOW: no intro is stored for this point. The presenter only says the default line "The Welsh for: 'sir', is:".
SUGGESTED: the presenter's English intro below, then the Welsh clip "esgusodwch fi" plays. It ends in the course's usual "The Welsh for: '…', is:" line.`, INTRO, ['Leave it as it is'], 'Accept = use this intro. Own wording = rewrite it.');
add('placement',`WHERE IT'S INTRODUCED · both courses
NOW: 'sir' first appears at seed 1639 ("with you sir"). It cues the formal singular 'chi' through seeds 1639–1655, before 'you all' (chi gyd / chi i gyd) arrives at 1656. Formal 'chi' itself first appears much earlier, at seed 138, with no cue.
SUGGESTED: introduce 'esgusodwch fi' at seed 1639, the slot 'sir' had. It then replaces sir/madam everywhere in 1639–1655 and the 4 later South lines.`,
`Introduce "esgusodwch fi" at seed 1639 (first in that seed). New seed 1639: "excuse me, can I sit with you?" = North "esgusodwch fi, ga i eistedd efo chi?" / South "esgusodwch fi, ga i eistedd gyda chi?"`, ['Leave it as it is'], 'Accept = introduce it at 1639. Own wording = name a different seed.');
function lab(c,r){ return `${NAME[c]} ${c}`; }
for (const c of ['cym_nv2_for_eng','cym_sv2_for_eng']){
  const {rows,drafts}=B[c]; const rowBy=Object.fromEntries(rows.map(r=>[r.id,r]));
  const D=Object.fromEntries(drafts.map(d=>[d.id,d]));
  // NEW: lego + phrases
  const newLego = c==='cym_nv2_for_eng'?'lego:S1639L01':'newlego:S1639Lnew';
  const nl=D[newLego]; const r0=rowBy[newLego];
  add(`${c}:${newLego}`,`NEW LEGO · ${lab(c)} · seed 1639${c==='cym_nv2_for_eng'?' · replaces S1639L01 (sir = syr)':' · added before S1639L01'}
${r0?`NOW: ${r0.cur[1]} = ${r0.cur[0]}\n${rec(r0)}`:'NOW: no such LEGO'}
NOTE: ${nl.note}`, `Welsh: ${nl.t}\nEnglish: ${nl.k}`, ['Leave it as it is'], 'Accept = make this the new LEGO.');
  const newPhrases = drafts.filter(d=> c==='cym_nv2_for_eng'? /^S1639L01[BU]/.test(d.id) : d.id.startsWith('new:'));
  for(const d of newPhrases){ const r=rowBy[d.id];
    add(`${c}:${d.id}`,`NEW PHRASE for 'esgusodwch fi' · ${lab(c)} · ${d.id.replace('new:','')}
${r?`NOW (a 'sir' phrase in this slot): ${r.cur[1]} = ${r.cur[0]}\n${rec(r)}`:'NOW: new line\nNew line → needs recording'}`, `Welsh: ${d.t}\nEnglish: ${d.k}`, ['Remove this phrase'], 'Accept = use this phrase.'); }
  // REWRITES: seeds, legos, phrases
  for(const d of drafts){
    if(d.id===newLego || newPhrases.includes(d)) continue;
    const r=rowBy[d.id]; if(!r) { console.error('no row',c,d.id); continue; }
    const kind = r.kind==='seed'?`SEED ${r.seed}`: r.kind==='lego'?`LEGO ${d.id.slice(5)}${r.isNew?'':' (a reference to an earlier LEGO)'}`:`${r.role.toUpperCase()} PHRASE ${d.id} (LEGO ${r.lego})`;
    const shared = (r.kind==='lego'&&!r.isNew) || (r.kind==='phrase'&&r.role==='component');
    const recLine = d.k==='DEL' ? ((r.t||r.ka)?'Recorded now, but removing it needs no new recording':'Not recorded yet') : shared ? ((r.t||r.ka)?'Recorded now (as syr/madam) → uses the ONE new "esgusodwch fi" recording, no separate re-record':'Uses the one new "esgusodwch fi" recording') : rec(r);
    const head=`REWRITE · ${lab(c)} · ${kind}
NOW: ${r.cur[1]} = ${r.cur[0]}
${recLine}`;
    if(d.k==='DEL'){
      const plain=r.cur[0].replace(/,?\s*\b(sir|madam)\b,?/ig,' ').replace(/\s+/g,' ').trim()+' = '+r.cur[1].replace(/,?\s*\b(syr|madam)\b,?/ig,' ').replace(/\s+/g,' ').trim();
      const why = d.note || (r.kind==='phrase' ? `This phrase practises the 'madam' LEGO, which goes. There is no 'you' in it, so there's nothing for 'excuse me' to cue. Without madam it would read: ${plain}` : '');
      add(`${c}:${d.id}`, `${head}\nWHY: ${why}`, r.kind==='lego'?'REMOVE this LEGO':'REMOVE this phrase', [r.kind==='lego'?'Keep it':'Keep it, just without madam/sir'], 'Accept = remove it.');
    } else {
      add(`${c}:${d.id}`, head + (d.note?`\nNOTE: ${d.note}`:''), `Welsh: ${d.t}\nEnglish: ${d.k}`, r.kind==='phrase'?['Remove this phrase']:['Leave it as it is'], 'Accept = make this change.');
    }
  }
}
fs.writeFileSync('review.json',JSON.stringify({title:"esgusodwch fi replaces sir/madam: North + South drafts for sign-off",items}));
console.log(items.length); console.log(JSON.stringify(items.slice(0,3),null,1)); console.log(JSON.stringify(items.filter(i=>/S1642L03B03|S1654L04|S1640L01B04/.test(i.id)),null,1));
