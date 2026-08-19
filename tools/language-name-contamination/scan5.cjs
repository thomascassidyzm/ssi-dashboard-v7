require('dotenv').config({path:'.env.psql'});
const {Client}=require('pg');
const L=require('./langnames.cjs');
const EXCEPTIONS=require('./adjudicated-exceptions.cjs');
const NAMES=/(?<![A-Za-z])(English|Chinese|Mandarin|Japanese|Korean|Welsh|Irish|Spanish|French|German|Italian|Portuguese|Russian|Arabic|Hebrew|Yiddish|Hindi|Bengali|Tamil|Telugu|Kannada|Marathi|Gujarati|Punjabi|Urdu|Nepali|Sinhala|Thai|Indonesian|Swahili|Afrikaans|Maltese|Basque|Catalan|Galician|Romanian|Bulgarian|Croatian|Serbian|Macedonian|Ukrainian|Latvian|Lithuanian|Estonian|Persian|Armenian|Cantonese|Hakka|Hokkien|Yoruba|Friulian|Romansh|Venetian|Lombard|Neapolitan|Sicilian|Romagnol|Sami|Cornish|Breton|Gaelic|Danish|Swedish|Norwegian|Finnish|Icelandic|Czech|Hungarian|Greek|Turkish|Polish|Dutch|Afrikaans)(?![A-Za-z])/u;
function adjudicated(courseCode,text){
  if(!text) return null;
  return EXCEPTIONS.find(e=>e.course_code===courseCode&&NAMES.test(text)&&new RegExp(`(?<![A-Za-z])${e.name}(?![A-Za-z])`,'u').test(text))||null;
}
(async()=>{
const c=new Client({connectionString:process.env.DATABASE_URL});await c.connect();
const courses=Object.fromEntries((await c.query("select course_code,target_lang,known_lang from courses")).rows.map(r=>[r.course_code,r]));
const {rows}=await c.query("select course_code,seed_number,known_text,target_text from course_seeds order by course_code,seed_number");
for(const r of rows){
  const co=courses[r.course_code]; if(!co) continue;
  const t=co.target_lang!=='eng'&&NAMES.test(r.target_text||'');
  const k=co.known_lang!=='eng'&&NAMES.test(r.known_text||'');
  if(!t&&!k) continue;
  const adjT=t&&adjudicated(r.course_code,r.target_text);
  const adjK=k&&adjudicated(r.course_code,r.known_text);
  const tag=[t&&(adjT?'TGT(ADJUDICATED)':'TGT'),k&&(adjK?'KNOWN(ADJUDICATED)':'KNOWN')].filter(Boolean).join('+');
  console.log(tag,r.course_code,r.seed_number,'| K:',r.known_text,'|| T:',r.target_text);
  if(adjT) console.log('  -> adjudicated:',adjT.reason,'|',adjT.doc);
  if(adjK) console.log('  -> adjudicated:',adjK.reason,'|',adjK.doc);
}
await c.end();
})().catch(e=>{console.error(e);process.exit(1)});
