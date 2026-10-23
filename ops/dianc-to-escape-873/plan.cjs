const fs=require('fs');
const W=/\b(dianc\w*|ddianc\w*)/i;
const GA=/\b(get|gets|got|getting|gotten) away\b/i;
const out={};
for(const c of ["nv2","sv2"]){const j=require("./"+c+".json");const rows=[];const odd=[];
const add=(kind,key,k,t,st)=>{ if(!W.test(t))return; if(GA.test(k))rows.push({kind,key,old:k,welsh:t,status:st}); else if(!/escap/i.test(k))odd.push([kind,key,k,t]);};
for(const s of j.seeds){add('seed',s.seed_number,s.known_text,s.target_text,s.status);
 for(const l of s.legos||[]){add('lego',l.lego_id,l.known_text,l.target_text,l.status);
  for(const p of l.basket_phrases||[])add('phrase',p.id,p.known_text,p.target_text,p.status)}}
const rep=t=>t.replace(/\bto get away\b/gi,m=>m[0]==='T'?'To escape':'to escape').replace(/\bgetting away\b/gi,'escaping').replace(/\bgets away\b/gi,'escapes').replace(/\bgot away\b/gi,'escaped').replace(/\bget away\b/gi,'escape');
for(const r of rows){r.new=rep(r.old)}
out[c]=rows;console.log('##',c,rows.length,'odd',odd.length);for(const o of odd)console.log('ODD',o.join(' | '));
// non-dianc rows with 'get away' for info
let n=0;for(const s of j.seeds){const chk=(k,t,id)=>{if(GA.test(k)&&!W.test(t))n++};chk(s.known_text,s.target_text);for(const l of s.legos||[]){chk(l.known_text,l.target_text);for(const p of l.basket_phrases||[])chk(p.known_text,p.target_text)}}
console.log('get-away without dianc (left alone):',n);}
fs.writeFileSync('plan.json',JSON.stringify(out,null,1));
for(const c in out)for(const r of out[c].filter(r=>!/^(to get away|I want to get away)$/.test(r.old)).slice(0,60))console.log(c,r.key,'|',r.old,'=>',r.new);
