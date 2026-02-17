const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://swfvymspfxmnfhevgdkg.supabase.co",
  "sb_secret_rjnajgh-6CuwZUEJv7Xtkg_wCZuRyTh"
);

async function main() {
  const { data: phrases, error } = await supabase
    .from("course_practice_phrases")
    .select("seed_number, lego_id, phrase_role, known_text, target_text")
    .eq("course_code", "deu_for_eng")
    .gte("seed_number", 1)
    .lte("seed_number", 50)
    .order("seed_number")
    .order("lego_id")
    .order("phrase_role");

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("=== Practice Phrases for seeds 1-50 (deu_for_eng) ===");
  console.log("Total phrases:", phrases.length);

  const bySeedLego = {};
  phrases.forEach(p => {
    const key = p.seed_number + ":" + p.lego_id;
    if (!bySeedLego[key]) {
      bySeedLego[key] = { seed: p.seed_number, lego_id: p.lego_id, build: [], use: [] };
    }
    if (p.phrase_role === "build") {
      bySeedLego[key].build.push(p);
    } else if (p.phrase_role === "use") {
      bySeedLego[key].use.push(p);
    }
  });

  let currentSeed = 0;
  for (const key of Object.keys(bySeedLego).sort((a,b) => {
    const [sa, la] = a.split(":");
    const [sb, lb] = b.split(":");
    return parseInt(sa) - parseInt(sb) || la.localeCompare(lb);
  })) {
    const group = bySeedLego[key];
    if (group.seed !== currentSeed) {
      console.log("\n========== SEED", group.seed, "==========");
      currentSeed = group.seed;
    }
    console.log("\n--- " + group.lego_id + " ---");
    console.log("BUILD (" + group.build.length + "):");
    group.build.forEach(p => console.log("  " + p.known_text + " -> " + p.target_text));
    console.log("USE (" + group.use.length + "):");
    group.use.forEach(p => console.log("  " + p.known_text + " -> " + p.target_text));
  }
}

main().catch(console.error);
