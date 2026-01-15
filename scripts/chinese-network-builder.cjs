/**
 * Chinese Course Network Builder
 * Build the LEGO network interactively, watching phrases emerge
 */

const { NetworkBuilder } = require('@ssi/core/network');

const builder = new NetworkBuilder();

// Track what we've added
const legos = [];
const phrases = [];

function addLego(id, chinese, english, canFollow = []) {
  builder.addLego(id, chinese, english);
  legos.push({ id, chinese, english });

  // Connect to previous LEGOs
  canFollow.forEach(prevId => {
    builder.connectPhrase([prevId, id]);
    phrases.push({ path: [prevId, id], chinese: `${getLego(prevId).chinese}${chinese}`, english: `${getLego(prevId).english} ${english}` });
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`ADDED: ${id} | ${chinese} | "${english}"`);
  console.log(`${'='.repeat(60)}`);

  if (canFollow.length > 0) {
    console.log(`Connects to: ${canFollow.join(', ')}`);
  }

  showNetwork();
}

function getLego(id) {
  return legos.find(l => l.id === id);
}

function showNetwork() {
  const stats = builder.getStats();
  console.log(`\nNETWORK: ${stats.nodeCount} LEGOs, ${stats.edgeCount} edges`);

  console.log(`\nALL LEGOS:`);
  legos.forEach(l => console.log(`  ${l.id}: ${l.chinese} "${l.english}"`));

  if (phrases.length > 0) {
    console.log(`\nPHRASES UNLOCKED (${phrases.length}):`);
    phrases.forEach(p => console.log(`  ${p.chinese} → "${p.english}"`));
  }
}

// ============================================
// BUILD THE CHINESE NETWORK
// ============================================

console.log('🇨🇳 CHINESE COURSE NETWORK BUILDER');
console.log('Starting with Seed 1 concept: "I want to speak Chinese"');
console.log('(Deferring "with you" and "now" to later)\n');

// Start simple - SVO, transfers well from English
addLego('L001', '我', 'I');
addLego('L002', '想', 'want', ['L001']);  // 我想 = I want
addLego('L003', '说', 'to speak', ['L002']);  // 想说 = want to speak
addLego('L004', '中文', 'Chinese', ['L003']);  // 说中文 = speak Chinese

// Now we can also make longer chains
builder.connectPhrase(['L001', 'L002', 'L003']);
phrases.push({ path: ['L001', 'L002', 'L003'], chinese: '我想说', english: 'I want to speak' });

builder.connectPhrase(['L001', 'L002', 'L003', 'L004']);
phrases.push({ path: ['L001', 'L002', 'L003', 'L004'], chinese: '我想说中文', english: 'I want to speak Chinese' });

builder.connectPhrase(['L002', 'L003', 'L004']);
phrases.push({ path: ['L002', 'L003', 'L004'], chinese: '想说中文', english: 'want to speak Chinese' });

console.log('\n' + '='.repeat(60));
console.log('FULL NETWORK STATE AFTER SEED 1 (simplified):');
showNetwork();

// Seed 2: "I'm trying to learn"
console.log('\n\n' + '🌱'.repeat(30));
console.log('SEED 2: "I\'m trying to learn"');
console.log('🌱'.repeat(30));

addLego('L005', '在', '(ongoing action)', ['L001']);  // 我在 = I am (doing)
addLego('L006', '试着', 'trying to', ['L005', 'L001']);  // 在试着 = am trying, 我试着 = I'm trying
addLego('L007', '学', 'learn', ['L006', 'L002']);  // 试着学 = trying to learn, 想学 = want to learn

// Build more phrases
builder.connectPhrase(['L001', 'L005', 'L006', 'L007']);
phrases.push({ path: ['L001', 'L005', 'L006', 'L007'], chinese: '我在试着学', english: "I'm trying to learn" });

builder.connectPhrase(['L001', 'L002', 'L007']);
phrases.push({ path: ['L001', 'L002', 'L007'], chinese: '我想学', english: 'I want to learn' });

builder.connectPhrase(['L001', 'L002', 'L007', 'L004']);
phrases.push({ path: ['L001', 'L002', 'L007', 'L004'], chinese: '我想学中文', english: 'I want to learn Chinese' });

console.log('\n' + '='.repeat(60));
console.log('NETWORK STATE AFTER SEED 2:');
showNetwork();

console.log('\n\n📊 FINAL STATS:');
console.log(builder.getStats());
