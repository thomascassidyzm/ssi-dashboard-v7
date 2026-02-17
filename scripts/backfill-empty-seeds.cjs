/**
 * Backfill empty seeds for a course.
 *
 * "Empty seeds" = seeds where ALL LEGOs are duplicates (is_new=false).
 * These seeds contribute no new vocabulary, but their seed sentence should
 * be added as a USE phrase to the highest-indexed introducing LEGO.
 *
 * This script:
 * 1. Finds all empty seeds (all LEGOs are is_new=false)
 * 2. For each, attaches the seed sentence as a USE phrase to the best LEGO
 * 3. Deletes the placeholder is_new=false LEGO rows
 *
 * Usage: node scripts/backfill-empty-seeds.cjs <course_code>
 *   --dry-run   Show what would happen without writing (default)
 *   --execute   Actually write to database
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const courseCode = process.argv[2];
const dryRun = !process.argv.includes("--execute");

if (!courseCode) {
  console.error("Usage: node scripts/backfill-empty-seeds.cjs <course_code> [--execute]");
  process.exit(1);
}

function computeLegoPosition(phraseTargetText, legoTargetText) {
  if (!phraseTargetText || !legoTargetText) return null;
  const phrase = phraseTargetText.trim();
  const lego = legoTargetText.trim();
  const index = phrase.indexOf(lego);
  if (index === -1) return null;
  const phraseLength = phrase.length;
  const legoEndIndex = index + lego.length;
  const startPercent = index / phraseLength;
  const endPercent = legoEndIndex / phraseLength;
  const centerPercent = (startPercent + endPercent) / 2;
  if (centerPercent < 0.33) return "start";
  if (centerPercent > 0.67) return "end";
  return "middle";
}

(async () => {
  console.log(`\n${dryRun ? "DRY RUN" : "EXECUTING"} - backfill empty seeds for ${courseCode}\n`);

  // 1. Get all LEGOs for the course
  const { data: allLegos } = await supabase
    .from("course_legos")
    .select("seed_number, lego_index, is_new, known_text, target_text")
    .eq("course_code", courseCode)
    .order("seed_number");

  // Group by seed
  const seedMap = {};
  for (const l of allLegos || []) {
    if (!seedMap[l.seed_number]) seedMap[l.seed_number] = [];
    seedMap[l.seed_number].push(l);
  }

  // Find empty seeds (all LEGOs are is_new=false)
  const emptySeeds = [];
  for (const [seedNum, legos] of Object.entries(seedMap)) {
    if (legos.every(l => !l.is_new)) emptySeeds.push(parseInt(seedNum));
  }
  emptySeeds.sort((a, b) => a - b);

  if (emptySeeds.length === 0) {
    console.log("No empty seeds found.");
    return;
  }

  console.log(`Found ${emptySeeds.length} empty seeds: ${emptySeeds.join(", ")}\n`);

  // 2. Get seed sentences for these seeds
  const { data: seedData } = await supabase
    .from("course_seeds")
    .select("seed_number, known_text, target_text")
    .eq("course_code", courseCode)
    .in("seed_number", emptySeeds);

  const seedSentences = {};
  for (const s of seedData || []) {
    seedSentences[s.seed_number] = s;
  }

  // 3. Build word→introducing LEGO map from ALL is_new=true LEGOs
  const { data: newLegos } = await supabase
    .from("course_legos")
    .select("seed_number, lego_index, target_text")
    .eq("course_code", courseCode)
    .eq("is_new", true)
    .order("seed_number");

  const wordIntroducedBy = {};
  for (const l of (newLegos || [])) {
    const words = l.target_text.toLowerCase().replace(/[.,!?;:'"¿¡]/g, "").split(/\s+/).filter(Boolean);
    for (const w of words) {
      if (!wordIntroducedBy[w]) {
        wordIntroducedBy[w] = { seed_number: l.seed_number, lego_index: l.lego_index, target_text: l.target_text };
      }
    }
  }

  // 4. Process each empty seed
  let attached = 0;
  let noMatch = 0;
  const legoIdsToDelete = [];

  for (const seedNum of emptySeeds) {
    const seed = seedSentences[seedNum];
    if (!seed) {
      console.log(`  S${String(seedNum).padStart(4, "0")}: ⚠ No seed sentence found, skipping`);
      continue;
    }

    // Find highest-indexed introducing LEGO for words in seed target
    const seedWords = seed.target_text.toLowerCase().replace(/[.,!?;:'"¿¡]/g, "").split(/\s+/).filter(Boolean);
    let bestSeedNum = -1;
    let bestLegoIdx = -1;
    let bestLegoTarget = null;

    for (const w of seedWords) {
      const intro = wordIntroducedBy[w];
      if (!intro) continue;
      // Only consider LEGOs from EARLIER seeds (not from this seed or later)
      if (intro.seed_number >= seedNum) continue;
      if (intro.seed_number > bestSeedNum ||
          (intro.seed_number === bestSeedNum && intro.lego_index > bestLegoIdx)) {
        bestSeedNum = intro.seed_number;
        bestLegoIdx = intro.lego_index;
        bestLegoTarget = intro.target_text;
      }
    }

    const seedId = `S${String(seedNum).padStart(4, "0")}`;
    const placeholderLegos = seedMap[seedNum];

    if (bestSeedNum >= 0) {
      const bestLegoId = `S${String(bestSeedNum).padStart(4, "0")}L${String(bestLegoIdx).padStart(2, "0")}`;
      console.log(`  ${seedId}: "${seed.known_text}" → USE phrase on ${bestLegoId} (${bestLegoTarget})`);

      if (!dryRun) {
        // Find max position in target LEGO's basket
        const { data: existingPhrases } = await supabase
          .from("course_practice_phrases")
          .select("position")
          .eq("course_code", courseCode)
          .eq("seed_number", bestSeedNum)
          .eq("lego_index", bestLegoIdx)
          .order("position", { ascending: false })
          .limit(1);

        const maxPos = existingPhrases?.[0]?.position || 0;

        const { error: insertErr } = await supabase
          .from("course_practice_phrases")
          .insert({
            course_code: courseCode,
            seed_number: bestSeedNum,
            lego_index: bestLegoIdx,
            position: maxPos + 1,
            known_text: seed.known_text,
            target_text: seed.target_text,
            word_count: seed.target_text.length,
            lego_count: (seed.known_text.match(/\s+/g) || []).length + 1,
            phrase_role: "use",
            connected_lego_ids: [],
            lego_position: computeLegoPosition(seed.target_text, bestLegoTarget),
            metadata: {
              format: "build_use",
              source: "seed_sentence",
              source_seed: seedNum,
              score: 8
            },
            status: "draft",
            version: 1
          });

        if (insertErr) {
          console.log(`    ⚠ INSERT failed: ${insertErr.message}`);
        } else {
          attached++;
        }
      } else {
        attached++;
      }
    } else {
      console.log(`  ${seedId}: ⚠ No introducing LEGO found for "${seed.known_text}"`);
      noMatch++;
    }

    // Collect placeholder LEGO rows to delete
    for (const l of placeholderLegos) {
      legoIdsToDelete.push({ seed_number: l.seed_number, lego_index: l.lego_index });
    }
  }

  // 5. Delete placeholder LEGOs
  console.log(`\nDeleting ${legoIdsToDelete.length} placeholder LEGO rows...`);
  if (!dryRun) {
    for (const { seed_number, lego_index } of legoIdsToDelete) {
      const { error: delErr } = await supabase
        .from("course_legos")
        .delete()
        .eq("course_code", courseCode)
        .eq("seed_number", seed_number)
        .eq("lego_index", lego_index);

      if (delErr) {
        console.log(`  ⚠ DELETE failed for S${seed_number}L${lego_index}: ${delErr.message}`);
      }
    }

    // Also delete any phrases that belonged to these empty seeds directly
    for (const seedNum of emptySeeds) {
      await supabase
        .from("course_practice_phrases")
        .delete()
        .eq("course_code", courseCode)
        .eq("seed_number", seedNum);
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Empty seeds processed: ${emptySeeds.length}`);
  console.log(`Seed sentences attached as USE phrases: ${attached}`);
  console.log(`No match (no introducing LEGO found): ${noMatch}`);
  console.log(`Placeholder LEGOs to delete: ${legoIdsToDelete.length}`);
  console.log(dryRun ? "\n⚠ DRY RUN — no changes written. Use --execute to apply." : "\n✓ Done.");
})();
