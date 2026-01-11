// Verify resolution - check for any remaining conflicts
const fs = require('fs');
const resolvedData = JSON.parse(fs.readFileSync('/home/user/ssi-dashboard-v7/scripts/phase2_worker2_resolved.json', 'utf8'));

// Extract all A-type LEGOs and group by "known" text
const legoMap = new Map();

resolvedData.seeds.forEach(seed => {
  seed.legos.forEach(lego => {
    if (lego.type === 'A') {
      const known = lego.lego.known;
      const target = lego.lego.target;

      if (!legoMap.has(known)) {
        legoMap.set(known, []);
      }

      legoMap.get(known).push({
        seedId: seed.seed_id,
        legoId: lego.id,
        target: target,
        new: lego.new
      });
    }
  });
});

// Find conflicts
const conflicts = [];
legoMap.forEach((occurrences, known) => {
  const uniqueTargets = new Set(occurrences.map(o => o.target));
  if (uniqueTargets.size > 1) {
    conflicts.push({
      known: known,
      targets: Array.from(uniqueTargets),
      occurrences: occurrences
    });
  }
});

console.log('=== VERIFICATION REPORT ===\n');
console.log(`Total unique A-type LEGOs: ${legoMap.size}`);
console.log(`Total LEGO instances: ${Array.from(legoMap.values()).reduce((sum, arr) => sum + arr.length, 0)}`);
console.log(`Conflicts remaining: ${conflicts.length}\n`);

if (conflicts.length > 0) {
  console.log('❌ CONFLICTS STILL EXIST:\n');
  conflicts.forEach((conflict, idx) => {
    console.log(`${idx + 1}. "${conflict.known}"`);
    console.log(`   Targets: ${conflict.targets.join(' | ')}`);
    conflict.occurrences.forEach(occ => {
      console.log(`   - ${occ.seedId}: "${occ.target}" [new: ${occ.new}]`);
    });
    console.log('');
  });
  process.exit(1);
} else {
  console.log('✅ NO CONFLICTS - All A-type LEGOs have consistent translations\n');
}

// Check for duplicate new:true flags
console.log('=== DUPLICATE new:true CHECK ===\n');
let duplicatesFound = false;
legoMap.forEach((occurrences, known) => {
  const newCount = occurrences.filter(o => o.new === true).length;
  if (newCount > 1) {
    duplicatesFound = true;
    console.log(`❌ "${known}" → "${occurrences[0].target}"`);
    console.log(`   Marked as new:true in ${newCount} seeds (should be only 1)`);
    console.log(`   Seeds: ${occurrences.filter(o => o.new).map(o => o.seedId).join(', ')}`);
    console.log('');
  }
});

if (!duplicatesFound) {
  console.log('✅ NO DUPLICATE new:true FLAGS - Each LEGO is new only on first occurrence\n');
}

// Summary
console.log('=== SUMMARY ===\n');
console.log(`Seeds processed: ${resolvedData.seeds.length}`);
console.log(`Total LEGOs: ${resolvedData.seeds.reduce((sum, s) => sum + s.legos.length, 0)}`);
console.log(`A-type LEGOs: ${Array.from(legoMap.values()).reduce((sum, arr) => sum + arr.length, 0)}`);
console.log(`M-type LEGOs: ${resolvedData.seeds.reduce((sum, s) => sum + s.legos.filter(l => l.type === 'M').length, 0)}`);
console.log('');

if (!conflicts.length && !duplicatesFound) {
  console.log('✅ RESOLUTION VERIFIED - Ready for Phase 3');
} else {
  console.log('❌ ISSUES DETECTED - Resolution incomplete');
  process.exit(1);
}
