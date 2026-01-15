require("dotenv").config();
const { getClient } = require("../services/supabase-client.cjs");
const supabase = getClient();

async function check() {
  const { data: legos } = await supabase
    .from("course_legos")
    .select("seed_number, lego_index, type, known_text, target_text, components")
    .eq("course_code", "zho_for_eng")
    .order("seed_number")
    .order("lego_index");

  // Build cumulative vocabulary as we go
  const cumulativeVocab = new Set();
  const genuinelyChunky = [];

  for (const lego of legos) {
    const targetChars = lego.target_text.split("");
    const compChars = new Set();

    // Collect chars from components
    if (lego.components) {
      lego.components.forEach(c => {
        c.target.split("").forEach(ch => compChars.add(ch));
      });
    }

    // Check: which chars in this LEGO are NEW (not in cumulative vocab, not in components)?
    const newChars = targetChars.filter(c =>
      !cumulativeVocab.has(c) && !compChars.has(c)
    );

    // A LEGO is "genuinely chunky" if:
    // - It's 4+ characters
    // - AND introduces 3+ new characters without component breakdown
    if (lego.target_text.length >= 4 && newChars.length >= 3) {
      genuinelyChunky.push({
        id: `S${lego.seed_number}L${lego.lego_index}`,
        known: lego.known_text,
        target: lego.target_text,
        len: lego.target_text.length,
        newChars: newChars,
        compCount: lego.components?.length || 0
      });
    }

    // Add this LEGO's chars to cumulative vocab
    targetChars.forEach(c => cumulativeVocab.add(c));
    compChars.forEach(c => cumulativeVocab.add(c));
  }

  console.log("=== GENUINELY CHUNKY LEGOS ===");
  console.log(`(4+ chars AND introducing 3+ new chars without component breakdown)\n`);
  console.log(`Found ${genuinelyChunky.length} genuinely problematic LEGOs\n`);

  genuinelyChunky.forEach(l => {
    console.log(`${l.id}: "${l.known}" → "${l.target}"`);
    console.log(`  ${l.len} chars, ${l.compCount} comps, NEW chars: [${l.newChars.join(", ")}]`);
  });

  // Summary by seed range
  const ranges = { "1-50": 0, "51-100": 0, "101-150": 0, "151-200": 0, "201-260": 0 };
  genuinelyChunky.forEach(l => {
    const seed = parseInt(l.id.match(/S(\d+)/)[1]);
    if (seed <= 50) ranges["1-50"]++;
    else if (seed <= 100) ranges["51-100"]++;
    else if (seed <= 150) ranges["101-150"]++;
    else if (seed <= 200) ranges["151-200"]++;
    else ranges["201-260"]++;
  });

  console.log("\n=== BY RANGE ===");
  Object.entries(ranges).forEach(([r, c]) => console.log(`  ${r}: ${c} issues`));
}

check();
