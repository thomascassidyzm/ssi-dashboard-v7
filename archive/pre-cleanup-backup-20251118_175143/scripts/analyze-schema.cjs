const fs = require('fs');
const data = JSON.parse(fs.readFileSync('public/vfs/courses/cmn_for_eng/lego_baskets.json', 'utf8'));

// Collect all unique field combinations
const fieldSets = new Map();
const fieldFrequency = new Map();

for (const [basketId, basket] of Object.entries(data.baskets)) {
  const fields = Object.keys(basket).sort();
  const fieldKey = fields.join(',');

  if (!fieldSets.has(fieldKey)) {
    fieldSets.set(fieldKey, []);
  }
  fieldSets.get(fieldKey).push(basketId);

  // Track individual field frequency
  fields.forEach(field => {
    fieldFrequency.set(field, (fieldFrequency.get(field) || 0) + 1);
  });
}

console.log('=== FIELD FREQUENCY ===');
const totalBaskets = Object.keys(data.baskets).length;
Array.from(fieldFrequency.entries())
  .sort((a, b) => b[1] - a[1])
  .forEach(([field, count]) => {
    const pct = ((count / totalBaskets) * 100).toFixed(1);
    console.log(`${field.padEnd(35)} ${count.toString().padStart(5)} / ${totalBaskets} (${pct}%)`);
  });

console.log('\n=== SCHEMA VARIANTS ===');
console.log(`Found ${fieldSets.size} different field combinations:\n`);

Array.from(fieldSets.entries())
  .sort((a, b) => b[1].length - a[1].length)
  .forEach(([fields, basketIds], idx) => {
    console.log(`\nVariant ${idx + 1}: (${basketIds.length} baskets)`);
    console.log(`Fields: [${fields}]`);
    console.log(`Sample baskets: ${basketIds.slice(0, 5).join(', ')}${basketIds.length > 5 ? '...' : ''}`);
  });
