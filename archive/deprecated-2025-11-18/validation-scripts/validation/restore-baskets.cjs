#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const courseCode = process.argv[2] || 'spa_for_eng';
const coursePath = path.join(__dirname, '../../public/vfs/courses', courseCode);

const backupPath = path.join(coursePath, 'deleted_baskets_backup.json');
const basketsPath = path.join(coursePath, 'lego_baskets.json');

const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
const baskets = JSON.parse(fs.readFileSync(basketsPath, 'utf8'));

// Restore all baskets
Object.assign(baskets.baskets, backup.baskets);
baskets.total_baskets = Object.keys(baskets.baskets).length;

fs.writeFileSync(basketsPath, JSON.stringify(baskets, null, 2));

console.log(`✅ Restored ${Object.keys(backup.baskets).length} baskets`);
console.log(`   Total baskets now: ${baskets.total_baskets}`);
