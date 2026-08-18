const fs=require('fs');
const items=JSON.parse(fs.readFileSync('.a108-gle/base-items.json'));
const corpus=items.map(x=>x.ga).join('\n');
const toks=corpus.toLowerCase();
// word-boundary aware for Irish: letters incl. accented + apostrophe
function count(w){
  const esc=w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const re=new RegExp('(^|[^a-záéíóúA-ZÁÉÍÓÚ\'’-])'+esc+'($|[^a-záéíóúA-ZÁÉÍÓÚ\'’-])','g');
  let n=0,m; const s=toks; re.lastIndex=0;
  // overlapping-safe manual scan
  let i=0; while((m=re.exec(s))!==null){ n++; re.lastIndex=m.index+1; }
  return n;
}
const CHECK=[
 ['what','C','céard'],['what','M','cad'],['what','U','goidé'],['what','U','caidé'],
 ['how','C','cén chaoi'],['how','M','conas'],['how','U','cad é mar'],
 ['look','C','breathnaigh'],['look','C','breathnaigh ar'],['look','M','féach'],['look','U','amharc'],
 ['also','C','freisin'],['also','U','fosta'],['also','M','chomh maith'],
 ['at all','C','ar bith'],['at all','M','in aon chor'],
 ['nothing','C','tada'],['nothing','M','faic'],
 ['I am','C','tá mé'],['I am','M','táim'],['I am neg','C','níl mé'],['I am neg','M','nílim'],
 ['we are','C','tá muid'],['we are','M','táimid'],['we (analytic)','C','muid'],
 ['able','C','in ann'],['able','U','ábalta'],['able','M','in acmhainn'],
 ['think','C','ceapaim'],['think','C','ceapann'],['think','M','is dóigh liom'],
 ['child','C','gasúr'],['child','M','garsún'],
 ['again','C','aríst'],['again','std','arís'],
 ['potato','C','fataí'],['potato','M','prátaí'],
 ['every','C','chuile'],['every','std','gach uile'],['every','std','gach'],
 ['under','std','faoi'],['under','M','fé'],
 ['very','std','an-'],['very','M','ana-'],
 ['there','std','ansin'],['there','M','ansan'],
 ['past 1sg','M','bhíos'],['past 1sg','M','chuas'],['past 1sg','M','dheineas'],
 ['neg','U','chan'],['to me','U','domh'],['all','U','uilig'],['sees','U','tchí'],
 ['want','C','ag iarraidh'],['want','std','teastaíonn'],
 ['know neg','C',"níl fhios agam"],['know neg','std',"níl a fhios agam"],
 ['dem','C','siúd'],['this','std','seo'],
 ['towards you','std','chugat'],['towards you','M','chughat'],
];
console.log('marker\tvariety\tcount');
for(const [m,v,w] of CHECK) console.log(`${m}\t${v}\t${w}\t${count(w)}`);
console.log('\ncorpus chars', corpus.length, 'items', items.length);
