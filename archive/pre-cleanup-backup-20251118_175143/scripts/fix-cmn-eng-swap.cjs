const fs = require('fs');

const filePath = 'public/vfs/courses/cmn_for_eng/lego_baskets.json';

console.log('Loading file...');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

let swapCount = 0;
const affectedBaskets = [];

for (const [basketId, basket] of Object.entries(data.baskets)) {
  let basketModified = false;

  // Fix lego pair
  if (basket.lego && basket.lego.length === 2) {
    const [first, second] = basket.lego;
    const firstHasChinese = /[\u4e00-\u9fa5]/.test(first);
    const secondHasChinese = /[\u4e00-\u9fa5]/.test(second);

    if (firstHasChinese && !secondHasChinese) {
      // Swap them
      basket.lego = [second, first];
      swapCount++;
      basketModified = true;
      console.log(`Fixed lego in ${basketId}: "${first}" <-> "${second}"`);
    }
  }

  // Fix practice phrases
  if (basket.practice_phrases) {
    basket.practice_phrases.forEach((phrase, idx) => {
      if (phrase.length >= 2) {
        const [first, second] = phrase;
        const firstHasChinese = /[\u4e00-\u9fa5]/.test(first);
        const secondHasChinese = /[\u4e00-\u9fa5]/.test(second);

        if (firstHasChinese && !secondHasChinese) {
          // Swap positions 0 and 1, keep rest unchanged
          phrase[0] = second;
          phrase[1] = first;
          swapCount++;
          basketModified = true;
        }
      }
    });
  }

  if (basketModified) {
    affectedBaskets.push(basketId);
  }
}

console.log(`\nTotal swaps performed: ${swapCount}`);
console.log(`Baskets modified: ${affectedBaskets.length}`);
console.log(`Affected baskets: ${affectedBaskets.join(', ')}`);

// Write back
console.log('\nWriting fixed file...');
fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
console.log('Done!');
