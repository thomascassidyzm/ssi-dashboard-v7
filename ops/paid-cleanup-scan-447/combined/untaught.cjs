// read-only: recount untaught_target under the detector's rule and at seed level (first = min(first LEGO seed, first seed sentence))
const fs=require('fs'),path=require('path')
const R='/home/tomcassidy/.cs-worktrees/ssi-dashboard-v7-clean/482-cleanup-scan-combined-fix-list-4'
const { isChinese } = require(R + '/services/course-builder/lib/language-config.cjs')
const [dumpFile,outFile]=process.argv.slice(2)
const D=JSON.parse(fs.readFileSync(dumpFile,'utf8')),course=D.course
if(isChinese(course)){console.log(course,'spaceless: skipped');process.exit(0)}
const toks=(t)=>(String(t||'').toLowerCase().normalize('NFC').replace(/[ً-ْ]/g,'').match(/[\p{L}\p{M}\p{N}]+(?:['’][\p{L}\p{M}]+)*/gu)||[])
const legos=[],phrases=[]
for(const s of D.seeds)for(const l of s.legos){const L={...l,seed:s.n};legos.push(L);for(const p of l.phrases)phrases.push({...p,seed:s.n,lego:L})}
const played=(p)=>p.lego.is_new&&(p.type==='build'||p.type==='use')
const old=new Map(),fix=new Map()
for(const l of legos)for(const w of toks(l.target)){if(!old.has(w))old.set(w,l.seed);fix.set(w,Math.min(fix.get(w)??1e9,l.seed))}
for(const s of D.seeds)for(const w of toks(s.target)){if(!old.has(w))old.set(w,s.n);fix.set(w,Math.min(fix.get(w)??1e9,s.n))}
const out=[];let o=0,f=0
for(const p of phrases)if(played(p)){const bo=toks(p.target).filter(w=>!(old.get(w)<=p.seed)),bf=toks(p.target).filter(w=>!(fix.get(w)<=p.seed))
 if(bo.length)o++;if(bf.length)f++;if(bo.length)out.push({id:String(p.id).replace(course+':',''),known:p.known,target:p.target,old:bo,fixed:bf})}
fs.writeFileSync(outFile,JSON.stringify(out))
console.log(course,'detector',o,'seedlevel',f,'false',o-f)
