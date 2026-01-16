const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function analyzeLegosPerSeed() {
  const courses = ["zho_for_eng", "deu_for_eng", "por_for_eng"];

  for (const course of courses) {
    console.log("\n" + "=".repeat(60));
    console.log("LEGO DECOMPOSITION ANALYSIS:", course);
    console.log("=".repeat(60));

    const { data: legos, error } = await supabase
      .from("course_legos")
      .select("seed_number, lego_index, type, known_text, target_text")
      .eq("course_code", course)
      .order("seed_number")
      .order("lego_index");

    if (error) {
      console.log("Error:", error.message);
      continue;
    }

    if (legos === null || legos.length === 0) {
      console.log("No LEGOs found");
      continue;
    }

    const seedLegoCounts = {};
    legos.forEach(l => {
      seedLegoCounts[l.seed_number] = (seedLegoCounts[l.seed_number] || 0) + 1;
    });

    const seedNumbers = Object.keys(seedLegoCounts).map(Number).sort((a, b) => a - b);
    const legosPerSeed = seedNumbers.map(n => seedLegoCounts[n]);

    const totalA = legos.filter(l => l.type === "A").length;
    const totalM = legos.filter(l => l.type === "M").length;

    console.log("Total seeds with LEGOs:", seedNumbers.length);
    console.log("Total LEGOs:", legos.length);
    console.log("  A-type (atomic):", totalA, "(" + (100 * totalA / legos.length).toFixed(1) + "%)");
    console.log("  M-type (molecular):", totalM, "(" + (100 * totalM / legos.length).toFixed(1) + "%)");
    console.log("");
    console.log("LEGOs per seed:");
    console.log("  Min:", Math.min(...legosPerSeed));
    console.log("  Max:", Math.max(...legosPerSeed));
    console.log("  Avg:", (legos.length / seedNumbers.length).toFixed(1));

    const dist = {};
    legosPerSeed.forEach(count => {
      dist[count] = (dist[count] || 0) + 1;
    });

    console.log("\nDistribution of LEGOs per seed:");
    Object.keys(dist).sort((a, b) => Number(a) - Number(b)).forEach(count => {
      const bar = "#".repeat(Math.min(dist[count], 40));
      console.log("  " + count + " LEGOs: " + dist[count] + " seeds " + bar);
    });

    // Sample decompositions at key points
    console.log("\nSample decompositions:");
    for (const seedNum of [50, 100, 150, 200]) {
      const seedLegos = legos.filter(l => l.seed_number === seedNum);
      if (seedLegos.length === 0) continue;

      const { data: seed } = await supabase
        .from("course_seeds")
        .select("known_text, target_text")
        .eq("course_code", course)
        .eq("seed_number", seedNum)
        .single();

      if (seed === null || seed.target_text === null) continue;

      console.log("\nS" + String(seedNum).padStart(4, "0") + ":", seed.known_text);
      console.log("  ->", seed.target_text);
      seedLegos.forEach(l => {
        const known = l.known_text.length > 35 ? l.known_text.substring(0,35) + "..." : l.known_text;
        const target = l.target_text.length > 20 ? l.target_text.substring(0,20) + "..." : l.target_text;
        console.log("    L" + l.lego_index + " [" + l.type + "]: \"" + known + "\" -> \"" + target + "\"");
      });
    }
  }
}

analyzeLegosPerSeed().catch(console.error);
