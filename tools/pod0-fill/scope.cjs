const fs=require('fs')
const e = require('./empties.json')
// Approved scope reconstruction: slug 'pod-0' (NOT 'pod-0-unrecorded'),
// excluding cym_* (deliberately never queued) and zzz_test_* (test course).
const scope = e.filter(x => x.slug === 'pod-0'
  && !/^cym_/.test(x.course_code)
  && !/^zzz_test/.test(x.course_code))
const distinct = new Set(scope.map(x=>(x.text||'').trim()))
console.log('slots:', scope.length)
console.log('distinct texts:', distinct.size)
console.log('pods:', new Set(scope.map(x=>x.pod_id)).size)
console.log('courses:', new Set(scope.map(x=>x.course_code)).size)
console.log('sides:', [...new Set(scope.map(x=>x.side))])
const byC={}; scope.forEach(x=>byC[x.course_code]=(byC[x.course_code]||0)+1)
console.log(byC)
console.log('empty/blank texts:', scope.filter(x=>!(x.text||'').trim()).length)
fs.writeFileSync(__dirname+'/scope.json', JSON.stringify(scope,null,2))
