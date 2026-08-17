// A-134 null sweep — recompute what phase8's OWN presentation composer produces today
// for the 9 eng_for_sin cards whose presentation_audio_id was NULLED by the text-edit
// trigger during this plate's repairs (7 by the cards worker, 2 by the seeds 1-100
// worker). The composer algorithm is lifted verbatim from
// services/phases/phase8-audio-v13.cjs (~lines 3376-3520), exactly as the earlier
// A-134 recompose.cjs did — the example slot is SELECTED by the course, never authored.
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const { createClient } = require('@supabase/supabase-js')
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY)

const LEGOS = ['S0155L01','S0207L02','S0196L01','S0184L01','S0197L01']
const TEMPLATE = "{target_lang_name}ෙන්. '{known}'. '{seed}' ඉතින්. :"
const TARGET_LANG_NAME = 'ඉංග්‍රීසි'
function deterministicRand(legoId){let h=0;for(let i=0;i<legoId.length;i++){h=((h<<5)-h+legoId.charCodeAt(i))|0;}return (((h>>>0)%10000)/10000);}

;(async()=>{
  const {data:legos}=await sb.from('course_legos').select('lego_id,seed_number,known_text,target_text').eq('course_code','eng_for_sin').in('lego_id',LEGOS)
  const seedNumbers=[...new Set(legos.map(l=>l.seed_number))]
  const {data:seeds}=await sb.from('course_seeds').select('seed_number,known_text,target_text').eq('course_code','eng_for_sin').in('seed_number',seedNumbers)
  const seedMap={},seedTgt={}; for(const s of seeds){seedMap[s.seed_number]=s.known_text;seedTgt[s.seed_number]=s.target_text}
  const {data:uses}=await sb.from('course_practice_phrases').select('seed_number,lego_index,known_text,target_text').eq('course_code','eng_for_sin').eq('phrase_role','use').in('seed_number',seedNumbers).order('id')
  const usePhraseMap={},useTgt=new Map()
  for(const p of uses){const k=`${p.seed_number}:${p.lego_index}`;(usePhraseMap[k]=usePhraseMap[k]||[]).push(p.known_text);useTgt.set(p.known_text,p.target_text)}
  const out=[]
  for(const lego of legos.sort((a,b)=>a.lego_id.localeCompare(b.lego_id))){
    const seedText=seedMap[lego.seed_number]||lego.known_text
    const legoIndex=parseInt(lego.lego_id.match(/L(\d+)$/)[1],10)
    const knownLower=lego.known_text.toLowerCase()
    const knownVariants=[knownLower]; if(knownLower.includes(' / ')) knownVariants.push(...knownLower.split(' / ').map(s=>s.trim()))
    const textContainsKnown=t=>{const s=String(t||'').toLowerCase();return knownVariants.some(v=>s.includes(v))}
    const key=`${lego.seed_number}:${legoIndex}`
    const usePhrases=(usePhraseMap[key]||[]).filter(textContainsKnown)
    const seedValid=textContainsKnown(seedText)
    const roll=deterministicRand(lego.lego_id)
    let contextText=null,contextSource='none'
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
    const knownForPresentation=lego.known_text.includes(' / ')?lego.known_text.split(' / ')[0].trim():lego.known_text
    const presText=TEMPLATE.replace('{target_lang_name}',TARGET_LANG_NAME).replace('{known}',knownForPresentation).replace('{seed}',contextText||'')
    out.push({lego_id:lego.lego_id,seed_number:lego.seed_number,card_known:lego.known_text,card_target:lego.target_text,
      pool_use:(usePhraseMap[key]||[]).length,pool_matching:usePhrases.length,seedValid,roll:+roll.toFixed(4),
      contextSource,contextText,context_target:contextText?(useTgt.get(contextText)||seedTgt[lego.seed_number]||null):null,presText})
  }
  require('fs').writeFileSync(__dirname+'/recomposed5.json',JSON.stringify(out,null,2))
  const c={}; for(const o of out) c[o.contextSource]=(c[o.contextSource]||0)+1
  console.log('context sources:',JSON.stringify(c))
  out.forEach(o=>console.log(' ',o.lego_id,'['+o.contextSource+']',JSON.stringify(o.presText)))
})()
