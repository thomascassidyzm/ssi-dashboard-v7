const fs = require('fs-extra');
const path = require('path');

async function migrateFeederParentIds() {
  const vfsRoot = path.join(__dirname, 'vfs', 'courses');
  const courses = await fs.readdir(vfsRoot);

  for (const courseCode of courses) {
    const legosPath = path.join(vfsRoot, courseCode, 'LEGO_BREAKDOWNS_COMPLETE.json');

    if (!await fs.pathExists(legosPath)) {
      console.log(`Skipping ${courseCode} - no LEGO_BREAKDOWNS_COMPLETE.json`);
      continue;
    }

    console.log(`\nProcessing ${courseCode}...`);
    const legoData = await fs.readJson(legosPath);
    let modified = false;

    for (const breakdown of legoData.lego_breakdowns) {
      if (!breakdown.feeder_pairs || breakdown.feeder_pairs.length === 0) {
        continue;
      }

      // Find first COMPOSITE LEGO in this seed
      const compositeLego = breakdown.lego_pairs?.find(lego => lego.lego_type === 'COMPOSITE');

      if (!compositeLego) {
        console.log(`  ${breakdown.seed_id}: Has feeders but no COMPOSITE LEGO - skipping`);
        continue;
      }

      // Add parent_lego_id to all feeders if not already present
      for (const feeder of breakdown.feeder_pairs) {
        if (!feeder.parent_lego_id) {
          feeder.parent_lego_id = compositeLego.lego_id;
          modified = true;
          console.log(`  ${breakdown.seed_id}: Added parent_lego_id ${compositeLego.lego_id} to ${feeder.feeder_id}`);
        }
      }
    }

    if (modified) {
      await fs.writeJson(legosPath, legoData, { spaces: 2 });
      console.log(`  ✓ Saved ${courseCode}`);
    } else {
      console.log(`  No changes needed for ${courseCode}`);
    }
  }

  console.log('\n✓ Migration complete!');
}

migrateFeederParentIds().catch(console.error);
