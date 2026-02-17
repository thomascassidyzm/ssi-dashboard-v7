const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: "/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/.env" });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  const { data: usePhrases } = await supabase
    .from("course_practice_phrases")
    .select("seed_number, metadata")
    .eq("course_code", "deu_for_eng")
    .eq("phrase_role", "eternal_eligible");

  const withScores = usePhrases.filter(p => {
    const score = p.metadata && p.metadata.score;
    return typeof score === "number";
  });

  const withoutScores = usePhrases.filter(p => {
    const score = p.metadata && p.metadata.score;
    return typeof score !== "number";
  });

  console.log("Total USE phrases:", usePhrases.length);
  console.log("With scores:", withScores.length);
  console.log("Without scores:", withoutScores.length);

  const seedsMissing = {};
  withoutScores.forEach(p => {
    seedsMissing[p.seed_number] = (seedsMissing[p.seed_number] || 0) + 1;
  });

  const seedsArr = Object.keys(seedsMissing).sort((a, b) => parseInt(a) - parseInt(b));
  console.log("\nSeeds with missing scores:", seedsArr.length);
  if (seedsArr.length > 0) {
    console.log("Range: S" + seedsArr[0] + " to S" + seedsArr[seedsArr.length - 1]);
  }

  if (withScores.length > 0) {
    const avg = withScores.reduce((sum, p) => sum + p.metadata.score, 0) / withScores.length;
    console.log("\nAvg score (where present):", avg.toFixed(2));
  }
}
check();
