#!/usr/bin/env node
/**
 * Compact JSON Formatter for SSI Course Data
 *
 * Formats JSON with each array entry on one line for better git diffs
 * and readability while maintaining structure.
 *
 * Usage:
 *   node compact-json-formatter.cjs seed_pairs.json
 *   node compact-json-formatter.cjs lego_pairs.json
 *   node compact-json-formatter.cjs lego_baskets.json
 */

const fs = require('fs');
const path = require('path');

function compactFormat(obj, indent = 0) {
  const spaces = '  '.repeat(indent);
  const spacesPlus1 = '  '.repeat(indent + 1);

  if (Array.isArray(obj)) {
    // Check if it's a simple array (all primitives or short arrays)
    const isSimple = obj.every(item =>
      typeof item === 'string' ||
      typeof item === 'number' ||
      (Array.isArray(item) && item.length <= 5 && item.every(i => typeof i === 'string' || typeof i === 'number'))
    );

    if (isSimple && obj.length > 0) {
      // Put each item on one line
      const items = obj.map(item => JSON.stringify(item)).join(',\n' + spacesPlus1);
      return `[\n${spacesPlus1}${items}\n${spaces}]`;
    } else if (obj.length === 0) {
      return '[]';
    } else {
      // Complex array, format each item on new line but compact
      const items = obj.map(item => spacesPlus1 + compactFormat(item, indent + 1)).join(',\n');
      return `[\n${items}\n${spaces}]`;
    }
  } else if (obj && typeof obj === 'object') {
    const keys = Object.keys(obj);
    if (keys.length === 0) return '{}';

    const entries = keys.map(key => {
      const value = obj[key];

      // For seed translations (2-element arrays), keep on one line
      if (Array.isArray(value) && value.length === 2 &&
          value.every(v => typeof v === 'string')) {
        return `${spacesPlus1}"${key}": ${JSON.stringify(value)}`;
      }

      // For other values, format recursively
      return `${spacesPlus1}"${key}": ${compactFormat(value, indent + 1)}`;
    }).join(',\n');

    return `{\n${entries}\n${spaces}}`;
  } else {
    return JSON.stringify(obj);
  }
}

function formatFile(filePath) {
  try {
    console.log(`Reading ${filePath}...`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    console.log(`Formatting...`);
    const formatted = compactFormat(data);

    console.log(`Writing ${filePath}...`);
    fs.writeFileSync(filePath, formatted + '\n', 'utf8');

    console.log(`✅ Formatted ${filePath}`);
  } catch (error) {
    console.error(`❌ Error formatting ${filePath}:`, error.message);
    process.exit(1);
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node compact-json-formatter.cjs <file.json>');
    process.exit(1);
  }

  args.forEach(formatFile);
}

// Export for use in other scripts
module.exports = { compactFormat, formatFile };
