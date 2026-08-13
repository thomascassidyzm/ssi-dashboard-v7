const fs=require('fs')
const scope=require('./scope.json')
const byCourse={}
for(const s of scope){
  const c=byCourse[s.course_code] ||= {course_code:s.course_code,pod_ids:new Set(),role:null,slots:0,blank:0}
  c.pod_ids.add(s.pod_id); c.slots++
  if(!(s.text||'').trim()) c.blank++
  const r = s.side==='known'?'known':'target'
  if(c.role && c.role!==r) throw new Error('mixed roles in '+s.course_code)
  c.role=r
}
const plan=Object.values(byCourse).map(c=>({...c,pod_ids:[...c.pod_ids]}))
plan.sort((a,b)=>b.slots-a.slots)
fs.writeFileSync(__dirname+'/plan.json',JSON.stringify(plan,null,2))
console.log('courses:',plan.length,'slots:',plan.reduce((n,c)=>n+c.slots,0),'blank:',plan.reduce((n,c)=>n+c.blank,0))
plan.forEach(c=>console.log(` ${c.course_code.padEnd(18)} role=${c.role.padEnd(6)} slots=${String(c.slots).padStart(4)} blank=${c.blank} pods=${c.pod_ids.join(',')}`))
