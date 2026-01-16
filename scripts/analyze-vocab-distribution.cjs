const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function analyzeVocabDistribution() {
  const courses = ["zho_for_eng", "deu_for_eng"];

  for (const course of courses) {
    console.log("\n" + "=".repeat(75));
    console.log("VOCABULARY DISTRIBUTION:", course);
    console.log("=".repeat(75));

    // Get all phrases
    const { data: phrases } = await supabase
      .from("course_practice_phrases")
      .select("known_text, seed_number")
      .eq("course_code", course);

    if (phrases === null || phrases.length === 0) {
      console.log("No phrases found");
      continue;
    }

    // Extract all words from known_text
    const wordSeeds = {}; // word -> [seeds where it appears]
    const seedWords = {}; // seed -> unique words

    phrases.forEach(p => {
      const words = p.known_text.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/).filter(w => w.length > 2);
      words.forEach(word => {
        if (wordSeeds[word] === undefined) wordSeeds[word] = new Set();
        wordSeeds[word].add(p.seed_number);
      });

      if (seedWords[p.seed_number] === undefined) seedWords[p.seed_number] = new Set();
      words.forEach(w => seedWords[p.seed_number].add(w));
    });

    // Find most used words and their distribution
    const wordStats = Object.entries(wordSeeds)
      .map(([word, seeds]) => ({
        word,
        seedCount: seeds.size,
        seeds: [...seeds].sort((a, b) => a - b)
      }))
      .sort((a, b) => b.seedCount - a.seedCount);

    console.log("\nTop 20 most distributed words (appear in most seeds):");
    wordStats.slice(0, 20).forEach(w => {
      const first5 = w.seeds.slice(0, 5).join(", ");
      const last5 = w.seeds.slice(-5).join(", ");
      console.log("  \"" + w.word + "\": " + w.seedCount + " seeds (first: " + first5 + " ... last: " + last5 + ")");
    });

    // Check for problematic patterns - words that appear in almost every seed
    const totalSeeds = Object.keys(seedWords).length;
    const ubiquitous = wordStats.filter(w => w.seedCount > totalSeeds * 0.5);
    console.log("\nUbiquitous words (>50% of seeds): " + ubiquitous.length);
    ubiquitous.forEach(w => {
      console.log("  \"" + w.word + "\": " + w.seedCount + "/" + totalSeeds + " seeds (" + (100 * w.seedCount / totalSeeds).toFixed(1) + "%)");
    });

    // Check for repetitive phrase patterns
    console.log("\n--- Checking for repetitive phrase patterns ---");
    const phraseCounts = {};
    phrases.forEach(p => {
      // Look for 3-4 word patterns
      const words = p.known_text.toLowerCase().split(/\s+/);
      for (let i = 0; i < words.length - 2; i++) {
        const trigram = words.slice(i, i + 3).join(" ");
        phraseCounts[trigram] = (phraseCounts[trigram] || 0) + 1;
      }
    });

    const repeatedPatterns = Object.entries(phraseCounts)
      .filter(([p, c]) => c >= 10)
      .sort((a, b) => b[1] - a[1]);

    console.log("\nMost repeated 3-word patterns (10+ occurrences):");
    repeatedPatterns.slice(0, 25).forEach(([pattern, count]) => {
      console.log("  " + count + "x: \"" + pattern + "\"");
    });
  }
}

analyzeVocabDistribution().catch(console.error);
