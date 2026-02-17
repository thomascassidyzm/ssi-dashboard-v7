const {createClient}=require("@supabase/supabase-js");
const sb=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_KEY);
(async()=>{
  const r=await sb.from("course_legos").select("seed_number,lego_index,type,known_text,target_text").eq("course_code","eng_for_jpn").gte("seed_number",1).lte("seed_number",10).order("seed_number").order("lego_index");
  const byS={};
  r.data.forEach(l=>{
    if(!byS[l.seed_number])byS[l.seed_number]=[];
    byS[l.seed_number].push(l);
  });
  let overlapCount=0;
  let totalLegos=0;
  for(let s=1;s<=10;s++){
    const legos=byS[s]||[];
    totalLegos+=legos.length;
    const overlaps=[];
    for(let i=0;i<legos.length;i++){
      for(let j=0;j<legos.length;j++){
        if(i!==j && legos[j].target_text.includes(legos[i].target_text)){
          overlaps.push(`L${i+1} "${legos[i].target_text}" inside L${j+1} "${legos[j].target_text}"`);
        }
      }
    }
    if(overlaps.length>0)overlapCount++;
    console.log(`S${s} (${legos.length} LEGOs): ${overlaps.length>0?overlaps.join('; '):'NO OVERLAP'}`);
  }
  console.log(`\n${overlapCount}/10 seeds have overlapping LEGOs`);
  console.log(`${totalLegos} total LEGOs (avg ${(totalLegos/10).toFixed(1)} per seed)`);
})();
