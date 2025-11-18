const fs = require('fs');
const v10 = JSON.parse(fs.readFileSync('public/vfs/courses/cmn_for_eng/lego_baskets_v10.json', 'utf8'));

console.log('=== V10 FORMAT VERIFICATION ===\n');

// Check metadata
console.log('Metadata:');
console.log('  Version:', v10.metadata.version);
console.log('  Total baskets:', v10.metadata.total_baskets);
console.log('  Languages:', JSON.stringify(v10.metadata.languages));

// Sample a few baskets to verify structure
const basketIds = ['S0001L01', 'S0015L01', 'S0100L05'];
console.log('\n=== Sample Baskets ===\n');

basketIds.forEach(id => {
  const basket = v10.baskets[id];
  if (!basket) {
    console.log(`${id}: NOT FOUND`);
    return;
  }

  console.log(`${id}:`);
  console.log('  lego_id:', basket.lego_id);
  console.log('  lego:', JSON.stringify(basket.lego));
  console.log('  type:', basket.type);
  console.log('  is_final_lego:', basket.is_final_lego);
  console.log('  earlier_legos count:', basket.current_seed_earlier_legos.length);
  console.log('  practice_phrases categories:', Object.keys(basket.practice_phrases).join(', '));
  console.log('  total_required_phrases:', basket.total_required_phrases);
  console.log('  _metadata.lego_id:', basket._metadata.lego_id);
  console.log('  components:', basket.components ? basket.components.length + ' items' : 'none');
  console.log('');
});

// Check all baskets have required fields
console.log('=== Field Coverage Check ===\n');
let missingFields = {};
let totalBaskets = 0;

for (const [id, basket] of Object.entries(v10.baskets)) {
  totalBaskets++;

  if (!basket.lego_id) missingFields.lego_id = (missingFields.lego_id || 0) + 1;
  if (!basket.lego) missingFields.lego = (missingFields.lego || 0) + 1;
  if (!basket.type) missingFields.type = (missingFields.type || 0) + 1;
  if (basket.is_final_lego === undefined) missingFields.is_final_lego = (missingFields.is_final_lego || 0) + 1;
  if (!basket.practice_phrases) missingFields.practice_phrases = (missingFields.practice_phrases || 0) + 1;
  if (!basket.total_required_phrases) missingFields.total_required_phrases = (missingFields.total_required_phrases || 0) + 1;
  if (!basket._metadata) missingFields._metadata = (missingFields._metadata || 0) + 1;
}

console.log('Total baskets checked:', totalBaskets);
console.log('Missing fields:', Object.keys(missingFields).length === 0 ? 'NONE ✅' : JSON.stringify(missingFields, null, 2));

// Check language consistency (English first, Mandarin second)
console.log('\n=== Language Order Check ===\n');
let swapIssues = 0;

for (const [id, basket] of Object.entries(v10.baskets)) {
  const eng = basket.lego.english || '';
  const man = basket.lego.mandarin || '';

  const engHasChinese = /[\u4e00-\u9fa5]/.test(eng);
  const manHasChinese = /[\u4e00-\u9fa5]/.test(man);

  if (engHasChinese || !manHasChinese) {
    swapIssues++;
    if (swapIssues <= 5) {
      console.log(`  ${id}: english="${eng}", mandarin="${man}"`);
    }
  }
}

console.log(`Language swap issues: ${swapIssues} ${swapIssues === 0 ? '✅' : '❌'}`);
console.log('\n✅ V10 format verification complete!');
