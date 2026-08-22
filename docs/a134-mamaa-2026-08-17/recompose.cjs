// Faithful offline re-implementation of the /regenerate-presentations composer
// (services/phases/phase8-audio-v13.cjs ~3377-3520). Deterministic: no RNG.
const {q}=require('./db.cjs');
const fs=require('fs');
const CC='eng_for_sin';
function deterministicRand(legoId){let h=0;for(let i=0;i<legoId.length;i++){h=((h<<5)-h+legoId.charCodeAt(i))|0}return (((h>>>0)%10000)/10000)}
(async()=>{
const [tpl]=await q("select template from presentation_templates where known_lang='sin'");
const template=tpl.template;
const shortTemplate=template; // none of phase8's strip patterns match the sin template
const targetLangName='ඉංග්‍රීසි'; // derived below from stored clips (prefix minus 'ෙන්')
const legos=await q(`select lego_id, seed_number, known_text, target_text from course_legos where course_code=$1`,[CC]);
const seeds=await q(`select seed_number, known_text from course_seeds where course_code=$1`,[CC]);
const seedMap=Object.fromEntries(seeds.map(s=>[s.seed_number,s.known_text]));
const uses=await q(`select seed_number, lego_index, known_text from course_practice_phrases where course_code=$1 and phrase_role='use' order by id`,[CC]);
const usePhraseMap={};
for(const p of uses){const k=`${p.seed_number}:${p.lego_index}`;(usePhraseMap[k]=usePhraseMap[k]||[]).push(p.known_text)}
const out={};
for(const lego of legos){
  const seedText=seedMap[lego.seed_number]||lego.known_text;
  const m=lego.lego_id.match(/L(\d+)$/); const legoIndex=m?parseInt(m[1],10):1;
  const knownLower=lego.known_text.toLowerCase();
  const knownVariants=[knownLower]; if(knownLower.includes(' / ')) knownVariants.push(...knownLower.split(' / ').map(s=>s.trim()));
  const contains=(t)=>{const s=String(t).toLowerCase();return knownVariants.some(v=>s.includes(v))};
  const key=`${lego.seed_number}:${legoIndex}`;
  const usePhrases=(usePhraseMap[key]||[]).filter(contains);
  const seedValid=contains(seedText);
  const roll=deterministicRand(lego.lego_id);
  let contextText=null, contextSource='none';
  if(usePhrases.length>0&&seedValid){
    if(roll<0.60){contextText=usePhrases[Math.floor(deterministicRand(lego.lego_id+':use')*usePhrases.length)];contextSource='use_phrase'}
    else if(roll<0.85){contextText=seedText;contextSource='seed'}
  } else if(usePhrases.length>0){
    if(roll<0.80){contextText=usePhrases[Math.floor(deterministicRand(lego.lego_id+':use')*usePhrases.length)];contextSource='use_phrase'}
  } else if(seedValid){
    if(roll<0.70){contextText=seedText;contextSource='seed'}
  }
  if(contextText&&lego.known_text.length>0){
    if(lego.known_text.length/contextText.length>0.5){contextText=null;contextSource='none_overlap'}
  }
  const finalTemplate=contextText?template:shortTemplate;
  const knownForPres=lego.known_text.includes(' / ')?lego.known_text.split(' / ')[0].trim():lego.known_text;
  const text=finalTemplate.replace('{target_lang_name}',targetLangName).replace('{known}',knownForPres).replace('{seed}',contextText||'');
  out[lego.lego_id]={lego_id:lego.lego_id,seed_number:lego.seed_number,known:lego.known_text,contextSource,contextText,text};
}
fs.writeFileSync(__dirname+'/recomposed.json',JSON.stringify(out,null,1));
console.log('recomposed',Object.keys(out).length,'legos');
// sanity: does it reproduce a HEALTHY stored clip byte-for-byte?
const stored=await q(`select l.lego_id, a.text from course_legos l join course_audio a on a.id::text=l.presentation_audio_id where l.course_code=$1 and a.text not like '%මමා%' limit 4000`,[CC]);
let same=0,diff=0; const diffs=[];
for(const s of stored){ if(!out[s.lego_id]) continue; if(out[s.lego_id].text===s.text) same++; else {diff++; if(diffs.length<5)diffs.push({lego:s.lego_id,stored:s.text,recomposed:out[s.lego_id].text}); } }
console.log('CALIBRATION on healthy clips: reproduced exactly',same,'/ differs',diff);
diffs.forEach(d=>console.log(JSON.stringify(d,null,1)));
})().catch(e=>{console.error(e.message);process.exit(1)});
