const fs = require("fs");
const path = require("path");

const manifestPath = path.join(__dirname, "..", "public/vfs/courses/spa_for_eng/course_manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

// Collect all phrases with their Spanish text
const allPhrases = [];

for (const slice of manifest.slices || []) {
  for (const seed of slice.seeds || []) {
    const seedId = seed.id;

    if (seed.node?.target?.text) {
      allPhrases.push({
        spanish: seed.node.target.text,
        english: seed.node.known?.text || '',
        seedId,
        location: 'seed',
        isIntro: false,
      });
    }

    for (const item of seed.introduction_items || []) {
      if (item.node?.target?.text) {
        allPhrases.push({
          spanish: item.node.target.text,
          english: item.node.known?.text || '',
          seedId,
          location: 'intro_item',
          isIntro: true,
        });
      }

      for (const node of item.nodes || []) {
        if (node.target?.text) {
          allPhrases.push({
            spanish: node.target.text,
            english: node.known?.text || '',
            seedId,
            location: 'intro_node',
            isIntro: false,
          });
        }
      }
    }
  }
}

console.log(`Total phrases in manifest: ${allPhrases.length}`);

// Deduplicate by Spanish text
const uniquePhrases = [];
const seen = new Set();
for (const p of allPhrases) {
  if (!seen.has(p.spanish)) {
    seen.add(p.spanish);
    uniquePhrases.push(p);
  }
}
console.log(`Unique phrases: ${uniquePhrases.length}`);

// Save for later use
fs.writeFileSync(
  path.join(__dirname, 'all-phrases.json'),
  JSON.stringify(uniquePhrases, null, 2)
);
console.log('Saved all-phrases.json');
