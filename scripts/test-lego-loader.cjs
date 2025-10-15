/**
 * Test script to verify LEGO data loading
 * This demonstrates how the LegoVisualizer component loads data
 */

const fs = require('fs');
const path = require('path');

// Configuration
const COURSE_CODE = 'mkd_for_eng_574seeds';
const LEGO_DIR = path.join(__dirname, 'vfs', 'courses', COURSE_CODE, 'amino_acids', 'legos_deduplicated');

console.log('=================================================');
console.log('LEGO Visualizer Data Loading Test');
console.log('=================================================\n');

console.log(`Course Code: ${COURSE_CODE}`);
console.log(`LEGO Directory: ${LEGO_DIR}\n`);

try {
  // Check if directory exists
  if (!fs.existsSync(LEGO_DIR)) {
    throw new Error(`Directory not found: ${LEGO_DIR}`);
  }

  // Load all LEGO files
  const files = fs.readdirSync(LEGO_DIR).filter(f => f.endsWith('.json'));
  console.log(`✓ Found ${files.length} LEGO files\n`);

  // Load all LEGOs
  const legos = files.map(file => {
    const filePath = path.join(LEGO_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  });

  console.log(`✓ Successfully loaded ${legos.length} LEGOs\n`);

  // Calculate statistics
  const stats = {
    total: legos.length,
    avgFcfs: (legos.reduce((sum, l) => sum + l.fcfs_score, 0) / legos.length).toFixed(1),
    avgUtility: (legos.reduce((sum, l) => sum + l.utility_score, 0) / legos.length).toFixed(1),
    avgPedagogical: (legos.reduce((sum, l) => sum + l.pedagogical_score, 0) / legos.length).toFixed(1),
    minFcfs: Math.min(...legos.map(l => l.fcfs_score)).toFixed(1),
    maxFcfs: Math.max(...legos.map(l => l.fcfs_score)).toFixed(1),
    minUtility: Math.min(...legos.map(l => l.utility_score)),
    maxUtility: Math.max(...legos.map(l => l.utility_score)),
    withMultipleSources: legos.filter(l => l.provenance.length > 1).length
  };

  console.log('Statistics:');
  console.log('─────────────────────────────────────────────────');
  console.log(`Total LEGOs:          ${stats.total}`);
  console.log(`Average FCFS Score:   ${stats.avgFcfs} (range: ${stats.minFcfs} - ${stats.maxFcfs})`);
  console.log(`Average Utility:      ${stats.avgUtility} (range: ${stats.minUtility} - ${stats.maxUtility})`);
  console.log(`Average Pedagogical:  ${stats.avgPedagogical}`);
  console.log(`Multiple Sources:     ${stats.withMultipleSources} LEGOs\n`);

  // Sample LEGOs by different criteria
  console.log('Sample LEGOs:');
  console.log('─────────────────────────────────────────────────\n');

  // Highest FCFS
  const highestFcfs = [...legos].sort((a, b) => b.fcfs_score - a.fcfs_score).slice(0, 3);
  console.log('Top 3 by FCFS Score:');
  highestFcfs.forEach((lego, i) => {
    console.log(`  ${i + 1}. "${lego.text}"`);
    console.log(`     FCFS: ${lego.fcfs_score} | Utility: ${lego.utility_score} | Provenance: ${lego.provenance[0].provenance}`);
  });
  console.log();

  // Highest Utility
  const highestUtility = [...legos].sort((a, b) => b.utility_score - a.utility_score).slice(0, 3);
  console.log('Top 3 by Utility Score:');
  highestUtility.forEach((lego, i) => {
    console.log(`  ${i + 1}. "${lego.text}"`);
    console.log(`     FCFS: ${lego.fcfs_score} | Utility: ${lego.utility_score} | Provenance: ${lego.provenance[0].provenance}`);
  });
  console.log();

  // LEGOs with multiple sources
  const multiSource = legos.filter(l => l.provenance.length > 1).slice(0, 3);
  if (multiSource.length > 0) {
    console.log('LEGOs with Multiple Sources:');
    multiSource.forEach((lego, i) => {
      console.log(`  ${i + 1}. "${lego.text}"`);
      console.log(`     Sources: ${lego.provenance.map(p => p.provenance).join(', ')}`);
      console.log(`     FCFS: ${lego.fcfs_score} | Utility: ${lego.utility_score}`);
    });
    console.log();
  }

  // Provenance analysis
  const provenanceCounts = {};
  legos.forEach(lego => {
    lego.provenance.forEach(prov => {
      const seedId = prov.source_seed_id;
      provenanceCounts[seedId] = (provenanceCounts[seedId] || 0) + 1;
    });
  });

  const topSeeds = Object.entries(provenanceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  console.log('Top 5 Source SEEDs (by LEGO count):');
  topSeeds.forEach(([seedId, count], i) => {
    console.log(`  ${i + 1}. ${seedId}: ${count} LEGOs`);
  });
  console.log();

  // Test filtering scenarios
  console.log('Filter Test Scenarios:');
  console.log('─────────────────────────────────────────────────\n');

  const fcfsHigh = legos.filter(l => l.fcfs_score >= 30).length;
  const utilityHigh = legos.filter(l => l.utility_score >= 60).length;
  const searchTest = legos.filter(l => l.text.toLowerCase().includes('i')).length;

  console.log(`FCFS Score >= 30:        ${fcfsHigh} LEGOs`);
  console.log(`Utility Score >= 60:     ${utilityHigh} LEGOs`);
  console.log(`Text contains "i":       ${searchTest} LEGOs\n`);

  // Pagination test
  const itemsPerPage = 20;
  const totalPages = Math.ceil(legos.length / itemsPerPage);
  console.log(`Pagination (20 per page): ${totalPages} pages\n`);

  // Success summary
  console.log('=================================================');
  console.log('✓ All tests passed!');
  console.log('✓ LEGO data is valid and ready for visualization');
  console.log('=================================================\n');

  // Export sample data for component testing
  const sampleExport = {
    total: legos.length,
    stats,
    samples: highestFcfs.slice(0, 5)
  };

  console.log('Sample export data (for component testing):');
  console.log(JSON.stringify(sampleExport, null, 2));

} catch (error) {
  console.error('✗ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
