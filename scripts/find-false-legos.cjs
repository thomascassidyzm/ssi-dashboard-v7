#!/usr/bin/env node
/**
 * Find "false LEGOs" - baskets that exist but don't have introductions
 */

const fs = require('fs');
const path = require('path');

const courseCode = process.argv[2] || 'spa_for_eng';
const courseDir = path.join(__dirname, '../public/vfs/courses', courseCode);

const legoBasketsPath = path.join(courseDir, 'lego_baskets.json');
const introductionsPath = path.join(courseDir, 'introductions.json');

const legoBasketsData = JSON.parse(fs.readFileSync(legoBasketsPath, 'utf8'));
const baskets = legoBasketsData.baskets || legoBasketsData;
const introsData = JSON.parse(fs.readFileSync(introductionsPath, 'utf8'));
const intros = introsData.presentations || {};

const extraBaskets = [];
for (const legoId of Object.keys(baskets)) {
  if (!intros[legoId]) {
    extraBaskets.push(legoId);
  }
}

console.log('\n🔍 False LEGOs (baskets without introductions):\n');
extraBaskets.forEach(id => {
  const basket = baskets[id];
  const legoText = basket.lego?.known || basket.lego?.target || 'unknown';
  console.log(`   ${id}: "${legoText}"`);
});
console.log(`\nTotal: ${extraBaskets.length} false LEGOs\n`);
