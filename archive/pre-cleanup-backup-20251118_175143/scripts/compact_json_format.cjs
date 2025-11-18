#!/usr/bin/env node
/**
 * Compact JSON Formatter
 *
 * Formats JSON with inline arrays (like agent outputs) for better readability:
 * - Short arrays on single line: ["value1", "value2"]
 * - Objects indented normally
 * - Much more readable than standard JSON.stringify(obj, null, 2)
 */

const fs = require('fs');

function compactFormat(obj, indent = 0) {
  const spaces = '  '.repeat(indent);
  const nextSpaces = '  '.repeat(indent + 1);

  if (Array.isArray(obj)) {
    // Check if it's a short array that should be inline
    const isShortArray = obj.every(item =>
      typeof item === 'string' ||
      typeof item === 'number' ||
      typeof item === 'boolean' ||
      item === null ||
      (Array.isArray(item) && item.length <= 3 && item.every(i => typeof i === 'string' || typeof i === 'number'))
    );

    if (isShortArray && obj.length <= 3) {
      // Inline format for short arrays
      return '[' + obj.map(item =>
        Array.isArray(item)
          ? '[' + item.map(i => JSON.stringify(i)).join(', ') + ']'
          : JSON.stringify(item)
      ).join(', ') + ']';
    }

    // Multi-line for longer arrays or complex items
    const items = obj.map(item => nextSpaces + compactFormat(item, indent + 1)).join(',\n');
    return '[\n' + items + '\n' + spaces + ']';
  }

  if (obj !== null && typeof obj === 'object') {
    const keys = Object.keys(obj);
    if (keys.length === 0) return '{}';

    const items = keys.map(key => {
      const value = obj[key];
      const formattedValue = compactFormat(value, indent + 1);
      return nextSpaces + JSON.stringify(key) + ': ' + formattedValue;
    }).join(',\n');

    return '{\n' + items + '\n' + spaces + '}';
  }

  return JSON.stringify(obj);
}

// Main execution
const filePath = process.argv[2];

if (!filePath) {
  console.error('Usage: node compact_json_format.cjs <file.json>');
  process.exit(1);
}

try {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const formatted = compactFormat(data);
  fs.writeFileSync(filePath, formatted + '\n', 'utf8');
  console.log(`✅ Formatted ${filePath} with compact inline arrays`);
} catch (error) {
  console.error(`❌ Error: ${error.message}`);
  process.exit(1);
}
