const props=require('./proposals.json'); const fs=require('fs');
let s=`You are a linguistic referee for colloquial spoken Sinhala. Below are proposed repairs to the SINHALA prompt side of a language course. Every Sinhala string here was extracted programmatically from the course database — treat the bytes as authoritative.

For EACH numbered item answer in this exact form:
  <n>. VERDICT: GOOD | BAD | RISKY
      WHY: <one or two sentences>
      BETTER (only if BAD/RISKY): <the Sinhala you would use instead, and say if it needs a word the course may not have taught>

Be blunt. If the OLD string is actually fine, say so — do not assume it is broken. If the NEW string is not idiomatic colloquial Sinhala, say BAD.

`;
props.forEach((p,i)=>{ s+=`${i+1}. English the learner must produce: "${p.target}"\n   OLD Sinhala prompt: ${p.old}\n   NEW Sinhala prompt: ${p.new}\n\n`; });
s+=`EXTRA QUESTIONS — answer each separately at the end:
Q1. Is the token "${props.find(p=>p.group==='G2').old.split(' ').find(t=>t.includes('ළමා'))}" a real Sinhala word? If not, what do you think a writer was trying to write?
Q2. Is the token "${props.find(p=>p.group==='G2').old.split(' ')[0]}" well-formed Sinhala? Is it a misspelling of the possessive "our"?
Q3. In item 8 above, is the OLD final token a possible real Sinhala word, or is the NEW one correct? Someone previously ruled the OLD one was fine — were they right?
Q4. In item 7, the English says "that" but the NEW Sinhala has no word for it. Is that acceptable, or should a word be added?
`;
fs.writeFileSync(__dirname+'/ling.txt',s); console.log(s.length+' chars');
