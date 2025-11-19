#!/usr/bin/env node

/**
 * Compact lego_pairs.json and reorder fields logically
 *
 * Changes:
 * 1. More compact formatting (single-line for simple objects)
 * 2. Logical field order: id, type, new, lego, components (lego BEFORE components!)
 */

const fs = require('fs-extra');
const path = require('path');

function compactJSON(obj, indent = 0) {
  const spaces = '  '.repeat(indent);

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';

    // Check if all items are simple objects (known/target pairs)
    const allSimple = obj.every(item =>
      typeof item === 'object' &&
      Object.keys(item).length === 2 &&
      item.known && item.target &&
      item.known.length < 50 && item.target.length < 50
    );

    if (allSimple) {
      // Compact format for simple arrays
      const items = obj.map(item =>
        `{"known": ${JSON.stringify(item.known)}, "target": ${JSON.stringify(item.target)}}`
      );
      return '[\n' + spaces + '  ' + items.join(',\n' + spaces + '  ') + '\n' + spaces + ']';
    }

    // Regular array formatting
    return '[\n' + obj.map(item => spaces + '  ' + compactJSON(item, indent + 1)).join(',\n') + '\n' + spaces + ']';
  }

  if (typeof obj === 'object' && obj !== null) {
    const keys = Object.keys(obj);
    if (keys.length === 0) return '{}';

    // Check if it's a simple known/target object
    if (keys.length === 2 && obj.known && obj.target &&
        obj.known.length < 80 && obj.target.length < 80) {
      return `{"known": ${JSON.stringify(obj.known)}, "target": ${JSON.stringify(obj.target)}}`;
    }

    // Regular object formatting with field reordering
    const orderedKeys = reorderKeys(keys);
    const pairs = orderedKeys.map(key => {
      const value = obj[key];
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return `"${key}": ${JSON.stringify(value)}`;
      }
      return `"${key}": ${compactJSON(value, indent + 1)}`;
    });

    return '{\n' + pairs.map(p => spaces + '  ' + p).join(',\n') + '\n' + spaces + '}';
  }

  return JSON.stringify(obj);
}

function reorderKeys(keys) {
  // Define preferred order
  const order = ['id', 'type', 'new', 'lego', 'components', 'seed_id', 'seed_pair', 'legos', 'known', 'target'];

  return keys.sort((a, b) => {
    const aIndex = order.indexOf(a);
    const bIndex = order.indexOf(b);

    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.localeCompare(b);
  });
}

async function compactLegoPairs(courseDir) {
  const legoPairsPath = path.join(courseDir, 'lego_pairs.json');

  console.log(`\n📖 Reading lego_pairs.json...`);
  const legoPairs = await fs.readJson(legoPairsPath);

  // Reorder lego object fields
  for (const seed of legoPairs.seeds || []) {
    for (const lego of seed.legos || []) {
      // Create new object with correct order
      const reordered = {
        id: lego.id,
        type: lego.type,
        new: lego.new
      };

      // Add lego BEFORE components
      if (lego.lego) {
        reordered.lego = lego.lego;
      }

      if (lego.components) {
        reordered.components = lego.components;
      }

      // Replace lego with reordered version
      Object.keys(lego).forEach(key => delete lego[key]);
      Object.assign(lego, reordered);
    }
  }

  // Backup original
  const backupPath = legoPairsPath.replace('.json', '.pre-compact-backup.json');
  console.log(`💾 Backing up original to ${path.basename(backupPath)}...`);
  await fs.copy(legoPairsPath, backupPath);

  // Write compacted version
  console.log(`✍️  Writing compacted lego_pairs.json...`);
  const compactedJSON = compactJSON(legoPairs);
  await fs.writeFile(legoPairsPath, compactedJSON + '\n');

  console.log(`\n✅ Compaction complete!`);
  console.log(`   - Reordered fields: lego now appears BEFORE components`);
  console.log(`   - Compact formatting for readability`);
  console.log(`   - Backup saved: ${path.basename(backupPath)}`);
}

// Main
(async () => {
  const courseDir = process.argv[2] || path.join(__dirname, '../public/vfs/courses/spa_for_eng');

  console.log(`\n🔄 Compacting and reordering lego_pairs.json`);
  console.log(`   Course: ${courseDir}\n`);

  try {
    await compactLegoPairs(courseDir);
  } catch (error) {
    console.error('❌ Compaction failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
