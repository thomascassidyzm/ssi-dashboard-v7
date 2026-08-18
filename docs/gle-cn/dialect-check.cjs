#!/usr/bin/env node
// Connemara dialect gate for gle_cn_for_eng. Enforces docs/gle-cn/connemara-dialect-spec.md §1b/1c.
// Usage: node dialect-check.cjs '<irish text>'   |   require() and call checkIrish(text)
const FORBIDDEN = {
  // Munster
  'táim':'M: use "tá mé"','nílim':'M: use "níl mé"','táimid':'M: use "tá muid"',
  'bhíos':'M: use "bhí mé"','chuas':'M: use "chuaigh mé"','dheineas':'M: use "rinne mé"',
  'conas':'M: use "cén chaoi"','ansan':'M: use "ansin"','in aon chor':'M: use "ar bith"',
  'faic':'M: use "tada"','garsún':'M: use "gasúr"/"páiste"','prátaí':'M: use "fataí"',
  'fé':'M: use "faoi"','chughat':'M: use "chugat"','is dóigh liom':'M: use "ceapaim"',
  'in acmhainn':'M: use "in ann"','sara':'M: use "sula"','ana-':'M: use "an-"',
  // Ulster
  'chan':'U: standard negation','cha':'U: standard negation','domh':'U: use "dom"',
  'goidé':'U: use "céard"','caidé':'U: use "céard"','cad é mar':'U: use "cén chaoi"',
  'uilig':'U: use "ar fad"','tchí':'U: use "feiceann"','fosta':'U: use "freisin"',
  'ábalta':'U: use "in ann"','amharc':'U: use "breathnaigh"','achan':'U: use "chuile"',
  // spelling-only respellings excluded by §0
  'aríst':'spelling: use "arís"',
};
// "cad" is forbidden only as the interrogative "what", never inside another word.
const CAD_RE = /(^|[^a-záéíóúA-ZÁÉÍÓÚ'’-])cad($|[^a-záéíóúA-ZÁÉÍÓÚ'’-])/i;

function wordRe(w){
  const esc=w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return new RegExp('(^|[^a-záéíóúA-ZÁÉÍÓÚ\'’-])'+esc+'($|[^a-záéíóúA-ZÁÉÍÓÚ\'’-])','i');
}
const _cache={}; const re=w=>(_cache[w]||(_cache[w]=wordRe(w)));

function checkIrish(text){
  const hits=[];
  if(!text) return hits;
  for(const [w,why] of Object.entries(FORBIDDEN)) if(re(w).test(text)) hits.push({form:w,why});
  if(CAD_RE.test(text)) hits.push({form:'cad',why:'M: use "céard" for "what"'});
  return hits;
}
module.exports={checkIrish,FORBIDDEN};

if(require.main===module){
  const arg=process.argv[2];
  if(arg){ const h=checkIrish(arg); console.log(h.length?JSON.stringify(h):'clean'); process.exit(h.length?1:0); }
  // CALIBRATION against known positives and known negatives
  const POS=[
    ['Conas a mhothaíonn tú?','conas'],['Táim go maith','táim'],['Nílim cinnte','nílim'],
    ['Táimid ag iarraidh','táimid'],['Céard a bhí ansan?','ansan'],['Níl sé go maith in aon chor','in aon chor'],
    ['Cad a rinne tú?','cad'],['Tá sé ábalta','ábalta'],['Bhí mé ann fosta','fosta'],
  ];
  const NEG=[
    'Cén chaoi a bhfuil tú?','Tá muid ag iarraidh Gaeilge a labhairt','Céard a rinne tú ansin?',
    'Níl mé in ann é a dhéanamh ar bith','Ceapaim go bhfuil sé go maith','Tá chuile dhuine anseo',
    // traps: forbidden strings embedded inside legitimate words must NOT fire
    'Bhí an cadás daor','Tá sé ag canadh','Rinne mé é le mo chara','Tá an domhan mór',
    'Tá sé ag teacht anois','D’fhan sé sa mbaile',
  ];
  let fail=0;
  console.log('— known positives (must fire) —');
  for(const [t,want] of POS){ const h=checkIrish(t).map(x=>x.form);
    const ok=h.includes(want); if(!ok)fail++; console.log(ok?'PASS':'FAIL',JSON.stringify(t),'->',h.join(',')||'clean'); }
  console.log('— known negatives (must stay clean) —');
  for(const t of NEG){ const h=checkIrish(t).map(x=>x.form);
    const ok=h.length===0; if(!ok)fail++; console.log(ok?'PASS':'FAIL',JSON.stringify(t),'->',h.join(',')||'clean'); }
  console.log(fail?`\nCALIBRATION FAILED: ${fail}`:'\nCALIBRATION PASSED');
  process.exit(fail?1:0);
}
