#!/usr/bin/env node
const fs = require('fs');

const COURSE = process.argv[2] || 'eng_for_cmn_test';
const data = JSON.parse(fs.readFileSync(`public/vfs/courses/${COURSE}/lego_pairs.json`));

// Group LEGOs by KNOWN
const knownToOccurrences = new Map();

for (const seed of data.seeds) {
  for (const lego of seed.legos || []) {
    const known = lego.lego.known;
    if (!knownToOccurrences.has(known)) {
      knownToOccurrences.set(known, []);
    }
    knownToOccurrences.get(known).push({
      seedId: seed.seed_id,
      sentence: seed.seed_pair,
      lego: lego.lego,
      type: lego.type
    });
  }
}

// Find conflicts (same KNOWN → different TARGETs)
const conflicts = [];

for (const [known, occurrences] of knownToOccurrences) {
  const targets = new Set(occurrences.map(o => o.lego.target));
  if (targets.size > 1) {
    conflicts.push({
      known,
      targets: [...targets],
      occurrences: occurrences.map(o => ({
        seedId: o.seedId,
        knownSentence: o.sentence.known,
        targetSentence: o.sentence.target,
        legoTarget: o.lego.target
      }))
    });
  }
}

// Output
const report = {
  course: COURSE,
  generated: new Date().toISOString(),
  totalConflicts: conflicts.length,
  conflicts
};

const outPath = `public/vfs/courses/${COURSE}/conflict_report.json`;
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(`Generated ${outPath} with ${conflicts.length} conflicts`);

// Also output human-readable version
let readable = `# Conflict Report: ${COURSE}\n\n`;
readable += `Total conflicts: ${conflicts.length}\n\n`;

for (const c of conflicts) {
  readable += `## ${c.known} → ${c.targets.join(' / ')}\n\n`;
  for (const o of c.occurrences) {
    readable += `- **${o.seedId}**: ${o.knownSentence}\n`;
    readable += `  - English: ${o.targetSentence}\n`;
    readable += `  - LEGO: ${c.known} → "${o.legoTarget}"\n\n`;
  }
}

fs.writeFileSync(`public/vfs/courses/${COURSE}/conflict_report.md`, readable);
console.log(`Generated conflict_report.md`);
