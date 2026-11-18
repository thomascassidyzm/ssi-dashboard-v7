// usage: node apply.cjs <course> <fillfile.cjs>   fill file exports array of [idx, lego, known, gender, opts?] ; opts {en, known_ok, hold}
const path=require('path');const fs=require('fs');
const [course,ff]=process.argv.slice(2);
const f=path.join((process.env.TOOLS||'/home/tomcassidy/.cs-worktrees/ssi-dashboard-v7-clean/755-item20-plan-shard-urd-pan/ops/paid-cleanup-item20/tools'),'..',course,'sheet.json');
const sheet=JSON.parse(fs.readFileSync(f,'utf8'));let n=0;
for(const [i,lego,known,gender,o={}] of require(path.resolve(ff))){const ln=sheet.lines[i];
 if(!ln||ln.lego!==lego)throw new Error(`idx ${i} is ${ln&&ln.lego}, not ${lego}`);
 delete ln.hold;if(known!=null)delete ln.known_ok;
 if(o.hold){ln.hold=o.hold;ln.known=null;ln.gender=null;n++;continue;}
 if(known==null&&!o.hold){if(o.known_ok)ln.known_ok=o.known_ok;n++;continue;}
 if(o.en){ if(ln.en&&ln.en!==o.en&&!ln.en_was&&!ln.author)ln.en_was=ln.en; ln.en=o.en;}
 if(!ln.en)throw new Error(`idx ${i} has no en`);
 ln.known=known.trim().replace(/\s+/g,' ');ln.gender=gender||null;if(o.known_ok)ln.known_ok=o.known_ok;n++;}
fs.writeFileSync(f,JSON.stringify(sheet,null,1)+'\n');console.log('applied',n);
