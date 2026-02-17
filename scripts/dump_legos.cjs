const {createClient} = require("@supabase/supabase-js");
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
(async()=>{
  const {data: seeds, error: e1} = await sb.from("course_seeds").select("seed_number,known_text,target_text").eq("course_code","eng_for_jpn").gte("seed_number",1).lte("seed_number",50).order("seed_number");
  if (e1) { console.error("seeds error:", e1); return; }
  const {data: legos, error: e2} = await sb.from("course_legos").select("seed_number,lego_index,type,known_text,target_text,is_new").eq("course_code","eng_for_jpn").gte("seed_number",1).lte("seed_number",50).order("seed_number").order("lego_index");
  if (e2) { console.error("legos error:", e2); return; }
  
  const legoMap = {};
  legos.forEach(l => {
    if (!legoMap[l.seed_number]) legoMap[l.seed_number] = [];
    legoMap[l.seed_number].push(l);
  });
  
  seeds.forEach(s => {
    const sl = legoMap[s.seed_number] || [];
    console.log("S" + s.seed_number + ": " + s.known_text);
    console.log("  → " + s.target_text);
    sl.forEach(l => {
      console.log("  L" + l.lego_index + " [" + l.type + "]: " + l.known_text + " → " + l.target_text + (l.is_new ? "" : " (dup)"));
    });
    console.log();
  });
})();
