#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const coursePath = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/zho_for_eng';
const legoBasketsPath = path.join(coursePath, 'lego_baskets.json');

// Load existing lego_baskets.json
const legoBaskets = JSON.parse(fs.readFileSync(legoBasketsPath, 'utf8'));

// Load my new seed baskets
const s0143Baskets = JSON.parse(
  fs.readFileSync(path.join(coursePath, 'phase3_outputs', 'seed_S0143_baskets.json'), 'utf8')
);
const s0144Baskets = JSON.parse(
  fs.readFileSync(path.join(coursePath, 'phase3_outputs', 'seed_S0144_baskets.json'), 'utf8')
);

// Merge new baskets into lego_baskets
Object.assign(legoBaskets, s0143Baskets, s0144Baskets);

// Create backup
const backupPath = path.join(coursePath, 'lego_baskets_backup_worker7.json');
fs.copyFileSync(legoBasketsPath, backupPath);
console.log(`✅ Created backup: ${backupPath}`);

// Write updated lego_baskets.json
fs.writeFileSync(legoBasketsPath, JSON.stringify(legoBaskets, null, 2));
console.log(`✅ Updated lego_baskets.json with S0143 and S0144 baskets`);

// Count total baskets
const totalBaskets = Object.keys(legoBaskets).length;
console.log(`✅ Total baskets in lego_baskets.json: ${totalBaskets}`);

console.log('\n📊 Worker 7 Summary:');
console.log('  - S0143L03: talking about / 谈的');
console.log('  - S0143L04: earlier / 之前');
console.log('  - S0143L05: we were talking about earlier / 我们之前谈的');
console.log('  - S0143L06: it\'s the same thing as / 这和');
console.log('  - S0144L01: I woke / 我醒了');
console.log('\n✅ All 5 LEGOs successfully merged!');
