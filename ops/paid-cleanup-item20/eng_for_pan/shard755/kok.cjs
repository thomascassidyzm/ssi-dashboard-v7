// usage: node kok.cjs <course> <dict.json>  -- set known_ok on update-slot lines whose untaught known words are ALL in the dict; list the rest
const fs=require('fs'),path=require('path'),cp=require('child_process');
const [course,df]=process.argv.slice(2);const T='/home/tomcassidy/.cs-worktrees/ssi-dashboard-v7-clean/755-item20-plan-shard-urd-pan/ops/paid-cleanup-item20/tools';
const dict=JSON.parse(fs.readFileSync(df,'utf8'));
const run=()=>{cp.execSync('node sheet2plans.cjs '+course,{cwd:T,stdio:'pipe'});try{return cp.execSync('node build.cjs '+course+' plan 1 700',{cwd:T,stdio:'pipe'}).toString();}catch(e){return e.stdout.toString();}};
let out=run();const f=path.join(T,'..',course,'sheet.json');const sheet=JSON.parse(fs.readFileSync(f,'utf8'));
const by=new Map();for(const l of sheet.lines)if(l.slot.startsWith('update:'))by.set(l.lego+l.slot.slice(7),l);
let set=0;const left=[];
for(const m of out.matchAll(/^warn\s+(S\d{4}L\d\d[BU]\d+): known side untaught: (.+?) in "(.*)" \(or/gm)){const [_,id,ws,k]=m;const words=ws.split(', ');const l=by.get(id);
 const unk=words.filter(w=>!dict[w]);
 if(!l){left.push('INSERT-ROW '+id+': '+ws+' | '+k);continue;}
 if(unk.length){left.push(id+': '+unk.join(', ')+' | '+k);continue;}
 l.known_ok=words.join(' ')+'|'+[...new Set(words.map(w=>dict[w]))].join('; ');set++;}
fs.writeFileSync(f,JSON.stringify(sheet,null,1)+'\n');out=run();
console.log('known_ok set',set);left.forEach(x=>console.log('LEFT',x));
console.log(out.split('\n').filter(x=>/^(ERROR|eng_)/.test(x)).join('\n'));
