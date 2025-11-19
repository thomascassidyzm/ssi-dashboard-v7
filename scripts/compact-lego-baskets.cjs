#!/usr/bin/env node

/**
 * Compact lego_baskets.json for better readability
 *
 * Makes simple objects single-line while keeping structure readable
 */

const fs = require('fs-extra');
const path = require('path');

function compactJSON(obj, indent = 0) {
  const spaces = '  '.repeat(indent);

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';

    // Check if all items are simple known/target objects
    const allSimple = obj.every(item =>
      item &&
      typeof item === 'object' &&
      Object.keys(item).length === 2 &&
      item.known && item.target &&
      typeof item.known === 'string' && typeof item.target === 'string' &&
      item.known.length < 100 && item.target.length < 100
    );

    if (allSimple) {
      // Compact format for practice_phrases
      return '[\n' + obj.map(item =>
        spaces + '  ' + `{"known": ${JSON.stringify(item.known)}, "target": ${JSON.stringify(item.target)}}`
      ).join(',\n') + '\n' + spaces + ']';
    }

    // Regular array
    return '[\n' + obj.map(item => spaces + '  ' + compactJSON(item, indent + 1)).join(',\n') + '\n' + spaces + ']';
  }

  if (typeof obj === 'object' && obj !== null) {
    const keys = Object.keys(obj);
    if (keys.length === 0) return '{}';

    // Simple known/target object - single line
    if (keys.length === 2 && obj.known && obj.target &&
        typeof obj.known === 'string' && typeof obj.target === 'string' &&
        obj.known.length < 100 && obj.target.length < 100) {
      return `{"known": ${JSON.stringify(obj.known)}, "target": ${JSON.stringify(obj.target)}}`;
    }

    // Regular object with preferred key order
    const orderedKeys = orderKeys(keys);
    const pairs = orderedKeys.map(key => {
      const value = obj[key];
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) {
        return `"${key}": ${JSON.stringify(value)}`;
      }
      return `"${key}": ${compactJSON(value, indent + 1)}`;
    });

    return '{\n' + pairs.map(p => spaces + '  ' + p).join(',\n') + '\n' + spaces + '}';
  }

  return JSON.stringify(obj);
}

function orderKeys(keys) {
  // Preferred order for basket fields
  const order = [
    'lego', 'type', 'available_legos', 'is_final_lego', 'overlap_level',
    'target_phrase_count', 'practice_phrases', 'phrase_distribution',
    '_metadata', 'components', 'lego_id', 'seed_context', 'known', 'target'
  ];

  return keys.sort((a, b) => {
    const aIndex = order.indexOf(a);
    const bIndex = order.indexOf(b);

    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.localeCompare(b);
  });
}

async function compactBaskets(courseDir) {
  const basketsPath = path.join(courseDir, 'lego_baskets.json');

  console.log(`\n📖 Reading lego_baskets.json...`);
  const baskets = await fs.readJson(basketsPath);

  // Backup
  const backupPath = basketsPath.replace('.json', '.pre-compact-backup.json');
  console.log(`💾 Backing up to ${path.basename(backupPath)}...`);
  await fs.copy(basketsPath, backupPath);

  // Build compacted output
  console.log(`✍️  Writing compacted lego_baskets.json...`);

  let output = '{\n';

  // Metadata fields
  const metaKeys = ['version', 'phase', 'methodology', 'generated_at', 'course', 'seeds_processed'];
  for (const key of metaKeys) {
    if (baskets[key] !== undefined) {
      if (Array.isArray(baskets[key])) {
        output += `  "${key}": ${JSON.stringify(baskets[key])},\n`;
      } else {
        output += `  "${key}": ${JSON.stringify(baskets[key])},\n`;
      }
    }
  }

  // Baskets
  output += '  "baskets": {\n';
  const basketEntries = Object.entries(baskets.baskets || {});
  basketEntries.forEach(([legoId, basket], index) => {
    const isLast = index === basketEntries.length - 1;
    output += `    "${legoId}": ${compactJSON(basket, 2)}${isLast ? '' : ','}\n`;
  });
  output += '  }\n';
  output += '}\n';

  await fs.writeFile(basketsPath, output);

  console.log(`\n✅ Compaction complete!`);
  console.log(`   - Single-line format for lego fields`);
  console.log(`   - Single-line format for practice_phrases`);
  console.log(`   - Compacted ${basketEntries.length} baskets`);
}

// Main
(async () => {
  const courseDir = process.argv[2] || path.join(__dirname, '../public/vfs/courses/spa_for_eng');

  console.log(`\n🔄 Compacting lego_baskets.json`);
  console.log(`   Course: ${courseDir}\n`);

  try {
    await compactBaskets(courseDir);
  } catch (error) {
    console.error('❌ Compaction failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
