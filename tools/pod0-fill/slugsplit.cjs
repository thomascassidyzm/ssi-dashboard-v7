const e = require('./empties.json')
const m = {}
for (const x of e) { const k = x.course_code+' | '+x.slug; m[k]=(m[k]||0)+1 }
const rows = Object.entries(m).sort((a,b)=>b[1]-a[1])
let p0=0,p0u=0
rows.forEach(([k,v])=>{ if(k.endsWith('pod-0')) p0+=v; else p0u+=v })
console.log('pod-0:',p0,' pod-0-unrecorded:',p0u)
console.log('--- pod-0 slug only, by course ---')
rows.filter(([k])=>k.endsWith('| pod-0')).forEach(([k,v])=>console.log(' ',k,v))
