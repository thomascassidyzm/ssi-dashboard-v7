require("dotenv").config();
const { getClient } = require("../services/supabase-client.cjs");
const supabase = getClient();

async function check() {
  const { data: legos } = await supabase
    .from("course_legos")
    .select("seed_number, lego_index, target_text, components")
    .eq("course_code", "zho_for_eng")
    .order("seed_number")
    .order("lego_index");

  const { data: seeds } = await supabase
    .from("course_seeds")
    .select("seed_number, known_text, target_text")
    .eq("course_code", "zho_for_eng")
    .order("seed_number");

  const cumulativeVocab = new Set();
  const tilingIssues = [];

  const legosBySeed = {};
  legos.forEach(l => {
    if (!legosBySeed[l.seed_number]) legosBySeed[l.seed_number] = [];
    legosBySeed[l.seed_number].push(l);
  });

  for (const seed of seeds) {
    const seedLegos = legosBySeed[seed.seed_number] || [];
    const thisSeeedVocab = new Set();
    seedLegos.forEach(l => {
      l.target_text.split("").forEach(c => thisSeeedVocab.add(c));
      if (l.components) {
        l.components.forEach(comp => {
          comp.target.split("").forEach(c => thisSeeedVocab.add(c));
        });
      }
    });

    const availableForThisSeed = new Set([...cumulativeVocab, ...thisSeeedVocab]);
    const seedChars = seed.target_text.replace(/[。！？，、：；""（）·\s\?]/g, "").split("");
    const missingChars = seedChars.filter(c => !availableForThisSeed.has(c));

    if (missingChars.length > 0) {
      tilingIssues.push({
        seed: seed.seed_number,
        known: seed.known_text,
        target: seed.target_text,
        missing: [...new Set(missingChars)]
      });
    }
    thisSeeedVocab.forEach(c => cumulativeVocab.add(c));
  }

  console.log("=== TILING ISSUES (cumulative vocab check) ===");
  console.log(`Found ${tilingIssues.length} seeds with tiling issues`);
  tilingIssues.slice(0, 15).forEach(t => {
    console.log(`\nS${t.seed}: ${t.known}`);
    console.log(`  Target: ${t.target}`);
    console.log(`  Missing: ${t.missing.join(", ")}`);
  });

  const firstBad = tilingIssues.length > 0 ? tilingIssues[0].seed : null;
  console.log(`\n=== SUMMARY ===`);
  console.log(`Total seeds: 260`);
  console.log(`Seeds with issues: ${tilingIssues.length}`);
  console.log(`First problematic seed: ${firstBad ? "S" + firstBad : "none"}`);
  console.log(`Clean seeds before first issue: ${firstBad ? firstBad - 1 : 260}`);

  // Group issues by seed range
  const ranges = { "1-50": 0, "51-100": 0, "101-150": 0, "151-200": 0, "201-260": 0 };
  tilingIssues.forEach(t => {
    if (t.seed <= 50) ranges["1-50"]++;
    else if (t.seed <= 100) ranges["51-100"]++;
    else if (t.seed <= 150) ranges["101-150"]++;
    else if (t.seed <= 200) ranges["151-200"]++;
    else ranges["201-260"]++;
  });
  console.log("\nIssues by range:");
  Object.entries(ranges).forEach(([r, c]) => console.log(`  ${r}: ${c} issues`));
}

check();
