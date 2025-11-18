const fs = require("fs");
const filePath = "./public/vfs/courses/spa_for_eng/lego_pairs.json";
const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

const issues = [];

// Extended grammar checks
const badPatterns = [
  { pattern: /\b(\w+)\s+\1\b/i, desc: "Repeated word", ignore: ["that that"] },
  { pattern: /\bto\s+to\b/i, desc: "to to" },
  { pattern: /\ba\s+a\b/i, desc: "a a" },
  { pattern: /\bthe\s+the\b/i, desc: "the the" },
  { pattern: /\bfor\s+for\b/i, desc: "for for" },
  { pattern: /\bis\s+is\b/i, desc: "is is" },
  { pattern: /\bwas\s+was\b/i, desc: "was was" },
  { pattern: /\bhave\s+have\b/i, desc: "have have" },
  { pattern: /\bI\s+I\b/, desc: "I I" },
  { pattern: /  +/, desc: "Double space" },
  { pattern: /^\s+|\s+$/, desc: "Leading/trailing space" },
  { pattern: /^No [A-Z]/, desc: "No without comma" },
  { pattern: /^Yes [A-Z]/, desc: "Yes without comma" },
  { pattern: /^Sí [A-Z]/, desc: "Sí without comma" },
  { pattern: /^Si [A-Z]/, desc: "Si without comma (or missing accent)" }
];

data.seeds.forEach(seed => {
  const seedId = seed.seed_id;
  const [engSeed, spaSeed] = seed.seed_pair;

  // Check English seed
  badPatterns.forEach(({pattern, desc, ignore}) => {
    if (pattern.test(engSeed)) {
      if (ignore && ignore.some(ign => engSeed.toLowerCase().includes(ign))) return;
      issues.push(seedId + ": English seed - " + desc + ": " + JSON.stringify(engSeed));
    }
  });

  // Check Spanish seed
  badPatterns.forEach(({pattern, desc}) => {
    if (pattern.test(spaSeed)) {
      issues.push(seedId + ": Spanish seed - " + desc + ": " + JSON.stringify(spaSeed));
    }
  });

  // Check all LEGOs
  seed.legos.forEach(lego => {
    const {id, target, known} = lego;

    if (target) {
      if (target.match(/  +/)) issues.push(id + ": Target - Double space");
      if (target.trim() !== target) issues.push(id + ": Target - Leading/trailing space");
      if (target.match(/\b(\w+)\s+\1\b/i) && !target.match(/que que/i)) {
        issues.push(id + ": Target - Repeated word: " + JSON.stringify(target));
      }
    }

    if (known) {
      if (known.match(/  +/)) issues.push(id + ": Known - Double space");
      if (known.trim() !== known) issues.push(id + ": Known - Leading/trailing space");
      if (known.match(/\b(\w+)\s+\1\b/i) && !known.match(/that that/i)) {
        issues.push(id + ": Known - Repeated word: " + JSON.stringify(known));
      }
    }
  });
});

if (issues.length === 0) {
  console.log("✅ No grammar issues found across all seeds and LEGOs");
} else {
  console.log("❌ Found " + issues.length + " potential issues:\n");
  issues.forEach(issue => console.log("  - " + issue));
}
