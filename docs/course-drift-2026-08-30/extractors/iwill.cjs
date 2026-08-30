const q=require('./q.cjs');
(async()=>{
 const cs=['eng_for_hin','eng_for_pan','eng_for_sin','eng_for_guj','eng_for_mar','eng_for_tel'];
 for(const c of cs){
  const legos=await q("select lego_id,seed_number,lego_index,target_text,known_text,created_at from course_legos where course_code=$1 and target_text ~* '\\mI will\\M' order by seed_number",[c]);
  for(const l of legos){
    const ph=await q("select id,phrase_role,target_text from course_practice_phrases where course_code=$1 and seed_number=$2 and lego_index=$3 and phrase_role<>'component'",[c,l.seed_number,l.lego_index]);
    const lng=ph.filter(p=>/\bI will\b/i.test(p.target_text));
    const shrt=ph.filter(p=>/I'll/i.test(p.target_text));
    console.log(c, l.lego_id, JSON.stringify(l.target_text), 'drills:',ph.length,'long:',lng.length,'contracted:',shrt.length, String(l.created_at).slice(0,10));
  }
 }
})();
