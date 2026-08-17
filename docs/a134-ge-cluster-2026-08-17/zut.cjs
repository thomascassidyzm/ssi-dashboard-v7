// ZUT: one known (Sinhala) prompt -> exactly one target (English) form, course-wide.
// Run over the corpus WITH the 24 repairs substituted in.
const P=require('./phrases.json'), prop=require('./proposal.json'), fs=require('fs')
const rep={}; for(const r of prop) rep[r.id]=r.new
const norm=s=>s.normalize('NFC').replace(/[?!.]+$/,'').replace(/\s+/g,' ').trim()
const normE=s=>s.toLowerCase().replace(/[?!.]+$/,'').replace(/\s+/g,' ').trim()
function scan(useRepairs){
  const m=new Map()
  for(const p of P){
    const k=norm(useRepairs&&rep[p.id]?rep[p.id]:p.known_text)
    if(!k) continue
    if(!m.has(k)) m.set(k,new Map())
    const e=normE(p.target_text); const g=m.get(k)
    if(!g.has(e)) g.set(e,[]); g.get(e).push(p.id.split(':')[1])
  }
  const conf=[]; for(const [k,g] of m) if(g.size>1) conf.push({known:k,forms:[...g.entries()].map(([e,ids])=>({eng:e,ids}))})
  return conf
}
const before=scan(false), after=scan(true)
const key=c=>c.known
const beforeSet=new Set(before.map(key))
const NEW=after.filter(c=>!beforeSet.has(c.known))
console.log(`ZUT conflicts course-wide BEFORE: ${before.length}   AFTER repairs: ${after.length}`)
console.log(`NEW conflicts introduced by my 24 repairs: ${NEW.length}`)
for(const c of NEW){console.log('\nHARD ZUT HIT:',c.known);for(const f of c.forms)console.log('   ->',f.eng,f.ids.join(','))}
// resolved-by-repair
const afterSet=new Set(after.map(key))
const RESOLVED=before.filter(c=>!afterSet.has(c.known))
console.log(`\npre-existing conflicts my repairs RESOLVED: ${RESOLVED.length}`)
for(const c of RESOLVED.slice(0,20))console.log('  resolved:',c.known,'->',c.forms.map(f=>f.eng).join(' | '))
// soft: do any two of my 24 repairs produce the same known string?
const seen={}; let soft=0
for(const r of prop){const k=norm(r.new); if(seen[k]){console.log('SOFT near-conflict (two repairs same known):',k,seen[k],r.id);soft++} else seen[k]=r.id}
console.log('\nsoft duplicate-known among the 24:',soft)
fs.writeFileSync(__dirname+'/zut.json',JSON.stringify({before:before.length,after:after.length,new_conflicts:NEW,resolved:RESOLVED.map(key)},null,1))
