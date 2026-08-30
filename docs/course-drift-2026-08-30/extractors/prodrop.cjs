const q=require('./q.cjs');
const PRON={i:'1s',im:'1s',"i'm":'1s',"i'll":'1s',"i've":'1s',"i'd":'1s',
 we:'1p',"we're":'1p',"we'll":'1p',"we've":'1p',"we'd":'1p',
 you:'2',"you're":'2',"you'll":'2',"you've":'2',"you'd":'2',
 he:'3s',"he's":'3s',"he'll":'3s',"he'd":'3s',
 she:'3s',"she's":'3s',"she'll":'3s',"she'd":'3s',
 they:'3p',"they're":'3p',"they'll":'3p',"they've":'3p',"they'd":'3p'};
const TARGET={pt:{'1s':'eu','1p':'nós|nos|a gente','2':'tu|você|voce|vocês|voces|vós|vos','3s':'ele|ela','3p':'eles|elas'}};
const W=s=>(s||'').toLowerCase().match(/[a-zà-ÿ']+/g)||[];
function classify(known,target,lang){
  const w=W(known); if(!w.length) return null;
  const p=PRON[w[0]]; if(p===undefined) return null;
  let alts=TARGET[lang][p];
  if(p==='3s'||p==='3p') alts=TARGET[lang]['3s']+'|'+TARGET[lang]['3p'];
  const re=new RegExp('^('+alts+')$');
  const tw=W(target).slice(0,4);
  return [tw.some(t=>re.test(t))?'EXPLICIT':'DROPPED',p];
}
(async()=>{
 const course=process.argv[2];
 const legos=await q("select lego_id,seed_number,lego_index,known_text,target_text,created_at from course_legos where course_code=$1",[course]);
 const phr=await q("select id,lego_id,seed_number,lego_index,phrase_role,known_text,target_text,created_at from course_practice_phrases where course_code=$1",[course]);
 const key=r=>r.seed_number+'|'+r.lego_index;
 const byLego={}; for(const p of phr){ (byLego[key(p)]=byLego[key(p)]||[]).push(p); }
 const out=[];let pairs=0;
 for(const l of legos){
   const lc=classify(l.known_text,l.target_text,'pt'); if(!lc) continue;
   for(const p of (byLego[key(l)]||[])){
     if(p.phrase_role==='component') continue;
     const pc=classify(p.known_text,p.target_text,'pt'); if(!pc) continue;
     if(pc[1]!==lc[1]) continue;
     pairs++;
     if(pc[0]!==lc[0]) out.push({lego_id:l.lego_id,seed:l.seed_number,person:lc[1],lego_known:l.known_text,lego_target:l.target_text,lego_class:lc[0],lego_created:l.created_at,phrase_id:p.id,role:p.phrase_role,ph_known:p.known_text,ph_target:p.target_text,ph_class:pc[0],ph_created:p.created_at});
   }
 }
 console.error(course,'pairs',pairs,'disagreeing phrases',out.length,'legos',new Set(out.map(o=>o.lego_id)).size);
 process.stdout.write(JSON.stringify(out,null,1));
})();
