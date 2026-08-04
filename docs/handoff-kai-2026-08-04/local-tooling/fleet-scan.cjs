require("dotenv").config({path:".env"});
const {createClient}=require("@supabase/supabase-js");
const sb=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_KEY);
const norm=s=>s.toLowerCase().replace(/[?!.,،؟。、！？]/g,'').replace(/\s+/g,' ').trim();
async function pageAll(tbl,cols,course){const out=[];for(let f=0;;f+=1000){const{data,error}=await sb.from(tbl).select(cols).eq("course_code",course).range(f,f+999);if(error)throw error;out.push(...data);if(data.length<1000)break;}return out;}
async function scan(course,cjk){
  const phrases=await pageAll("course_practice_phrases","seed_number, lego_index, target_text, phrase_role",course);
  const legos=await pageAll("course_legos","seed_number, lego_index, target_text, is_new",course);
  const contains=cjk?((p,c)=>norm(p).replace(/\s+/g,'').includes(norm(c).replace(/\s+/g,''))):((p,c)=>(' '+norm(p)+' ').includes(' '+norm(c)+' '));
  const nonComp=phrases.filter(p=>p.phrase_role!=='component');
  const newLegos=legos.filter(l=>l.is_new);
  const dist={'0':0,'1-2':0,'3-5':0,'6-9':0,'10+':0};
  for(const l of newLegos){
    const outside=nonComp.filter(p=>p.seed_number!==l.seed_number&&contains(p.target_text,l.target_text)).length;
    const b=outside===0?'0':outside<=2?'1-2':outside<=5?'3-5':outside<=9?'6-9':'10+';dist[b]++;
  }
  const n=newLegos.length||1;
  const orphan=dist['0'],under10=dist['0']+dist['1-2']+dist['3-5']+dist['6-9'];
  return {course,newLegos:newLegos.length,phrases:nonComp.length,orphan,orphanPct:+(100*orphan/n).toFixed(1),under10,under10Pct:+(100*under10/n).toFixed(1),dist,cjk};
}
const COURSES=[
  ["ita_for_eng",0],["spa_for_eng",0],["por_for_eng",0],["fra_for_eng",0],["deu_for_eng",0],
  ["ara_for_eng",0],["kor_for_eng",0],["zho_for_eng",1],["jpn_for_eng",1],
  ["por_br_for_eng",0],["spa_mx_for_eng",0],["ara_eg_for_eng",0],["ara_lb_for_eng",0],["ara_sy_for_eng",0],
  ["deu_at_for_eng",0],["deu_ch_for_eng",0],["fra_ca_for_eng",0],
  ["yue_for_eng",1],["hak_for_eng",1],["nan_for_eng",1],
];
(async()=>{
  const res=[];
  for(const [c,cjk] of COURSES){try{const r=await scan(c,!!cjk);res.push(r);process.stderr.write(".");}catch(e){process.stderr.write("\nFAIL "+c+": "+e.message+"\n");}}
  process.stderr.write("\n");
  res.sort((a,b)=>b.orphanPct-a.orphanPct);
  console.log("course".padEnd(16),"new".padStart(5),"phr".padStart(6),"orphan(0)".padStart(11),"<10use".padStart(11),"cjk");
  for(const r of res)console.log(r.course.padEnd(16),String(r.newLegos).padStart(5),String(r.phrases).padStart(6),(r.orphan+" ("+r.orphanPct+"%)").padStart(11),(r.under10+" ("+r.under10Pct+"%)").padStart(11),r.cjk?"cjk":"");
  console.log("\nGold reference: hand-crafted Welsh = 6-9% orphan");
})();
