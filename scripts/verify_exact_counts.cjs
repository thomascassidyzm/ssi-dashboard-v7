const fs = require('fs');
const legoPairs = JSON.parse(fs.readFileSync('public/vfs/courses/cmn_for_eng/lego_pairs.json'));
const legoBaskets = JSON.parse(fs.readFileSync('public/vfs/courses/cmn_for_eng/lego_baskets.json'));

// Get all new: true LEGO IDs
const newTrueIds = new Set();
legoPairs.seeds.forEach(seed => {
  seed.legos.forEach(lego => {
    if (lego.new === true) {
      newTrueIds.add(lego.id);
    }
  });
});

// Get all basket IDs
const basketIds = new Set(Object.keys(legoBaskets.baskets || {}));

console.log('=== VERIFICATION ===');
console.log('Total new: true LEGOs needed:', newTrueIds.size);
console.log('Total baskets in lego_baskets.json:', basketIds.size);
console.log();

// Find matches
const matches = [];
const missing = [];
for (const id of newTrueIds) {
  if (basketIds.has(id)) {
    matches.push(id);
  } else {
    missing.push(id);
  }
}

const extra = [];
for (const id of basketIds) {
  if (!newTrueIds.has(id)) {
    extra.push(id);
  }
}

console.log('Baskets matching new: true LEGOs:', matches.length);
console.log('Missing baskets (new: true without basket):', missing.length);
console.log('Extra baskets (not new: true):', extra.length);
console.log();

console.log('=== FINAL COUNT ===');
console.log('Progress:', matches.length, '/', newTrueIds.size, '=', Math.round(matches.length / newTrueIds.size * 100) + '%');
console.log('Remaining:', missing.length);
console.log();

if (missing.length < 20) {
  console.log('Missing LEGO IDs:', missing.join(', '));
}
