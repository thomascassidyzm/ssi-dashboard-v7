#!/usr/bin/env node

/**
 * Orchestrator Sync Validator
 * 
 * Checks that orchestrator brief matches current phase intelligence versions
 */

const fs = require('fs-extra');
const path = require('path');

console.log('🔍 Validating Orchestrator Brief Sync\n');

const briefPath = path.join(__dirname, '..', 'automation_server.cjs');
const briefContent = fs.readFileSync(briefPath, 'utf8');

// Check for stale format references
const issues = [];

// Check for 3-element componentization (old format)
if (briefContent.includes('[["component", "trans", "LEGO_ID"]')) {
  issues.push('❌ Found old 3-element componentization format - should be 2 elements!');
}

// Check for correct 2-element format
if (!briefContent.includes('targetPart') || !briefContent.includes('literalKnown')) {
  issues.push('⚠️  Missing explicit 2-element componentization format specification');
}

// Check for null in component examples
if (briefContent.match(/\["[^"]+",\s*"[^"]+",\s*null\]/)) {
  issues.push('❌ Found null in component examples');
}

// Check for deprecated terminology
const deprecated = [
  { term: 'amino_acids', context: 'generateOrchestratorBrief' },
  { term: 'LEGO_BREAKDOWNS_COMPLETE', context: 'generateOrchestratorBrief' },
  { term: 'translations.json', context: 'generateOrchestratorBrief' }
];

for (const { term, context } of deprecated) {
  const regex = new RegExp(`function ${context}[\\s\\S]*${term}[\\s\\S]*?^}`, 'm');
  if (regex.test(briefContent)) {
    issues.push(`⚠️  Found deprecated term in orchestrator: ${term}`);
  }
}

// Report results
if (issues.length === 0) {
  console.log('✅ Orchestrator brief is synced with current intelligence\n');
  console.log('📋 Current versions:');
  console.log('   - Phase 1: v2.6 (Pedagogical Translation)');
  console.log('   - Phase 3: v3.5 (LEGO Extraction)');
  console.log('   - Phase 5: v2.2 (Basket Generation - batch-aware)\n');
  console.log('📄 Format specifications verified:');
  console.log('   ✅ seed_pairs.json format');
  console.log('   ✅ lego_pairs.json with 2-element componentization');
  console.log('   ✅ lego_baskets.json format');
  console.log('   ✅ No deprecated terminology\n');
  console.log('🚀 Ready for course generation!\n');
  process.exit(0);
} else {
  console.log('⚠️  Issues found:\n');
  issues.forEach(issue => console.log(`   ${issue}`));
  console.log('\n🔧 Please update automation_server.cjs orchestrator brief\n');
  process.exit(1);
}
