const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  // Get phrases with their scores from metadata
  const { data, error } = await supabase
    .from("course_practice_phrases")
    .select("phrase_role, metadata")
    .eq("course_code", "ara_for_eng");

  if (error) { console.error(error); return; }

  // Group by role and count scores
  const roleStats = {};
  for (const p of data) {
    const role = p.phrase_role || "null";
    if (!roleStats[role]) roleStats[role] = { count: 0, scored: 0, scores: [] };
    roleStats[role].count++;
    if (p.metadata && typeof p.metadata.score === "number") {
      roleStats[role].scored++;
      roleStats[role].scores.push(p.metadata.score);
    }
  }

  // Calculate averages
  for (const role in roleStats) {
    const scores = roleStats[role].scores;
    roleStats[role].avg = scores.length > 0 ? (scores.reduce((a,b) => a+b, 0) / scores.length).toFixed(2) : null;
    delete roleStats[role].scores;  // Don't print all scores
  }

  console.log(JSON.stringify(roleStats, null, 2));
})();
