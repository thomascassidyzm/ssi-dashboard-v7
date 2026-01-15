#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const legoFile = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/ita_for_eng/lego_pairs.json';
const data = JSON.parse(fs.readFileSync(legoFile, 'utf8'));

// Extract all LEGOs up to and including S0018 and S0019
const seeds = data.seeds.filter(s => s.seed_number <= 19);

// Build available vocabulary lists
const knownVocab = new Set();
const targetVocab = new Set();

// Process all seeds up to S0017 (available for S0018)
seeds.filter(s => s.seed_number <= 17).forEach(seed => {
  seed.legos.forEach(lego => {
    lego.known_text.split(/\s+/).forEach(w => knownVocab.add(w.toLowerCase()));
    lego.target_text.split(/\s+/).forEach(w => targetVocab.add(w.toLowerCase()));
  });
});

console.log('=== AVAILABLE VOCABULARY FOR S0018 ===');
console.log('Known words:', Array.from(knownVocab).sort());
console.log('Target words:', Array.from(targetVocab).sort());
console.log('\n');

// Get S0018 LEGOs
const s0018 = seeds.find(s => s.seed_number === 18);
console.log('=== S0018 LEGOs ===');
s0018.legos.forEach(lego => {
  console.log(`${lego.lego_id}: "${lego.known_text}" → "${lego.target_text}" (type: ${lego.type}, new: ${lego.new})`);
});
console.log('\n');

// Add S0018L01-L03 to vocab for S0018L04-L06
s0018.legos.slice(0, 3).forEach(lego => {
  lego.known_text.split(/\s+/).forEach(w => knownVocab.add(w.toLowerCase()));
  lego.target_text.split(/\s+/).forEach(w => targetVocab.add(w.toLowerCase()));
});

console.log('=== AVAILABLE VOCABULARY FOR S0018L04-L06 ===');
console.log('Known words:', Array.from(knownVocab).sort());
console.log('Target words:', Array.from(targetVocab).sort());
console.log('\n');

// Now for S0019
const knownVocab19 = new Set(knownVocab);
const targetVocab19 = new Set(targetVocab);

// Add all of S0018
s0018.legos.forEach(lego => {
  lego.known_text.split(/\s+/).forEach(w => knownVocab19.add(w.toLowerCase()));
  lego.target_text.split(/\s+/).forEach(w => targetVocab19.add(w.toLowerCase()));
});

const s0019 = seeds.find(s => s.seed_number === 19);
console.log('=== S0019 LEGOs ===');
s0019.legos.forEach(lego => {
  console.log(`${lego.lego_id}: "${lego.known_text}" → "${lego.target_text}" (type: ${lego.type}, new: ${lego.new})`);
});
console.log('\n');

console.log('=== AVAILABLE VOCABULARY FOR S0019L01-L02 ===');
console.log('Known words:', Array.from(knownVocab19).sort());
console.log('Target words:', Array.from(targetVocab19).sort());
console.log('\n');

// Get recent LEGOs for recombination
const recentLegos = [];
for (let i = Math.max(0, seeds.length - 10); i < seeds.length; i++) {
  seeds[i].legos.filter(l => l.new === true).forEach(lego => {
    recentLegos.push({
      id: lego.lego_id,
      known: lego.known_text,
      target: lego.target_text
    });
  });
}

console.log('=== RECENT LEGOs FOR RECOMBINATION (last 10 seeds) ===');
recentLegos.forEach(l => console.log(`${l.id}: "${l.known}" → "${l.target}"`));
