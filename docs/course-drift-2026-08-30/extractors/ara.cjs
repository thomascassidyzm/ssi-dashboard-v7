const q=require('./q.cjs');
const PRON={i:'1s',im:'1s',"i'm":'1s',"i'll":'1s',"i've":'1s',"i'd":'1s',
 we:'1p',"we're":'1p',"we'll":'1p',"we've":'1p',"we'd":'1p',
 you:'2',"you're":'2',"you'll":'2',"you've":'2',"you'd":'2',
 he:'3s',"he's":'3s',"he'll":'3s',"he'd":'3s',
 she:'3sf',"she's":'3sf',"she'll":'3sf',"she'd":'3sf',
 they:'3p',"they're":'3p',"they'll":'3p',"they've":'3p',"they'd":'3p'};
const AR={'1s':['انا'],'1p':['احنا','إحنا','نحن'],'2':['انت','إنت','انتي','إنتي','انتو','إنتو'],
 '3s':['هو'],'3sf':['هي'],'3p':['هم','همه','هما','هوما']};
const strip=s=>(s||'').replace(/[ً-ْٰـ]/g,'').replace(/[إأآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه');
const W=s=>strip(s).split(/[^ء-ي]+/).filter(Boolean);
const EW=s=>(s||'').toLowerCase().match(/[a-z']+/g)||[];
function cls(known,target,person){
  const set=new Set((AR[person]||[]).map(strip));
  const tw=W(target).slice(0,3);
  return tw.some(t=>set.has(t))?'EXPLICIT':'DROPPED';
}
(async()=>{
 const course='ara_eg_for_eng';
 const legos=await q("select lego_id,seed_number,lego_index,known_text,target_text,created_at from course_legos where course_code=$1",[course]);
 const phr=await q("select id,seed_number,lego_index,phrase_role,known_text,target_text,created_at from course_practice_phrases where course_code=$1 and phrase_role<>'component'",[course]);
 const key=r=>r.seed_number+'|'+r.lego_index;
 const by={}; for(const p of phr){(by[key(p)]=by[key(p)]||[]).push(p);}
 const out=[];let pairs=0;
 for(const l of legos){
   const w=EW(l.known_text); if(!w.length) continue;
   const p1=PRON[w[0]]; if(!p1) continue;
   const lc=cls(l.known_text,l.target_text,p1);
   for(const p of (by[key(l)]||[])){
     const pw=EW(p.known_text); if(!pw.length) continue;
     const p2=PRON[pw[0]]; if(p2!==p1) continue;
     pairs++;
     const pc=cls(p.known_text,p.target_text,p2);
     if(pc!==lc) out.push({lego_id:l.lego_id,seed:l.seed_number,person:p1,lego_known:l.known_text,lego_target:l.target_text,lego_class:lc,lego_created:l.created_at,phrase_id:p.id,role:p.phrase_role,ph_known:p.known_text,ph_target:p.target_text,ph_class:pc,ph_created:p.created_at});
   }
 }
 const g={};for(const o of out){const k=o.person+' lego='+o.lego_class+' drill='+o.ph_class;g[k]=(g[k]||0)+1}
 console.error(course,'pairs',pairs,'disagreements',out.length,JSON.stringify(g));
 const dates={};for(const o of out){const k=String(o.ph_created).slice(0,10);dates[k]=(dates[k]||0)+1}
 console.error('dates',JSON.stringify(dates));
 process.stdout.write(JSON.stringify(out,null,1));
})();
