const fs=require('fs');
const legacy=JSON.parse(fs.readFileSync('.a108-gle/base-items.json','utf8')).map(x=>({ga:x.ga||'',en:x.en||'',src:'legacy',kind:x.kind}));
const live=JSON.parse(fs.readFileSync('/tmp/gle_base.json','utf8')).map(x=>({ga:x.target_text||'',en:x.known_text||'',src:'live',kind:x.t}));
const corp={legacy,live};
function count(re,c){return corp[c].filter(x=>re.test(x.ga)).length;}
function show(re,c,n=6){return corp[c].filter(x=>re.test(x.ga)).slice(0,n).map(x=>`   ${x.ga}  [${x.en}]`).join('\n');}
const probes=[
 ['CALIBRATION Gaeilge',/Gaeilge/i],
 ['CALIBRATION iarraidh',/iarraidh/i],
 ['CALIBRATION in ann',/\bin ann\b/i],
 ['--- labhraím (1sg)',/labhraím/i],
 ['labhraim unaccented',/labhraim/i],
 ['labhraíonn',/labhraíonn/i],
 ['labhraíonn tú',/labhraíonn tú/i],
 ['labhraíonn sé/sí',/labhraíonn s[eé]/i],
 ['Tá ... Gaeilge agam',/Gaeilge agam/i],
 ['beagán Gaeilge',/beag[aá]n Gaeilge/i],
 ['Gaeilge ag (any)',/Gaeilge ag[a-z]*\b/i],
 ['--- dícheall',/dh?[ií]cheall/i],
 ['dícheall a dhéanamh',/dh?[ií]cheall a dh[eé]anamh/i],
 ['dícheall a thabhairt',/dh?[ií]cheall a thabhairt/i],
 ['--- cén chaoi',/c[eé]n chaoi/i],
 ['cén chaoi le',/c[eé]n chaoi le\b/i],
 ['conas',/\bconas\b/i],
 ['conas le',/\bconas le\b/i],
 ['conas + bare VN (no obj)',/\bconas (a )?(labhairt|foghlaim|caint|rá|déanamh|dul|teacht)\b/i],
 ['--- iarracht',/iarracht/i],
 ['iarracht a dhéanamh',/iarracht a dh[eé]anamh/i],
 ['--- éigin',/[eé]igin/i],
 ['eicínt',/eic[ií]nt/i],
 ['--- amárach',/am[aá]rach/i],
 ['amáireach',/am[aá]ireach/i],
];
for(const [name,re] of probes){
  console.log(`${name.padEnd(30)} legacy=${String(count(re,'legacy')).padStart(5)}  live=${String(count(re,'live')).padStart(5)}`);
}
console.log('\n=== CITATIONS ===');
for(const [name,re] of [['labhraím',/labhraím/i],['Gaeilge agam',/Gaeilge agam/i],['dícheall',/dh?[ií]cheall/i],['conas bare VN',/\bconas (a )?(labhairt|foghlaim|caint|rá)\b/i],['cén chaoi',/c[eé]n chaoi/i],['iarracht a dhéanamh',/iarracht a dh[eé]anamh/i]]){
  console.log('\n## '+name);
  for(const c of ['legacy','live']){const s=show(re,c,8); if(s)console.log(' ['+c+']\n'+s);}
}
