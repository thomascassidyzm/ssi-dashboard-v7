#!/usr/bin/env node

/**
 * Phase 3.5: Graph Construction (NEW in v7.0)
 *
 * Builds directed graph of LEGO adjacency relationships.
 * Enables pattern-aware basket construction in Phase 5.
 */

const fs = require('fs-extra');
const path = require('path');

const TRANSLATIONS_DIR = path.join(__dirname, 'amino_acids', 'translations');
const LEGOS_DIR = path.join(__dirname, 'amino_acids', 'legos');
const OUTPUT_FILE = path.join(__dirname, 'phase_outputs', 'phase_3.5_graph.json');

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Load all translation amino acids
 */
async function loadTranslations() {
  const files = await fs.readdir(TRANSLATIONS_DIR);
  const translations = [];

  for (const file of files) {
    if (file.endsWith('.json')) {
      const data = await fs.readJson(path.join(TRANSLATIONS_DIR, file));
      translations.push(data);
    }
  }

  return translations;
}

/**
 * Load all LEGO amino acids
 */
async function loadLEGOs() {
  const files = await fs.readdir(LEGOS_DIR);
  const legos = [];

  for (const file of files) {
    if (file.endsWith('.json')) {
      const data = await fs.readJson(path.join(LEGOS_DIR, file));
      legos.push(data);
    }
  }

  return legos;
}

/**
 * Normalize text for comparison
 */
function normalize(text) {
  return text.toLowerCase().replace(/[.,!?;:]/g, '').trim();
}

/**
 * Find all LEGOs that appear in a given translation
 */
function findLEGOsInTranslation(translation, allLEGOs) {
  const translationText = normalize(translation.source);
  const matchingLEGOs = [];

  for (const lego of allLEGOs) {
    const legoText = normalize(lego.text);

    // Check if this LEGO appears in the translation
    if (translationText.includes(legoText)) {
      // Find position of LEGO in translation
      const position = translationText.indexOf(legoText);
      matchingLEGOs.push({
        lego,
        position,
        endPosition: position + legoText.length
      });
    }
  }

  // Sort by position in translation
  matchingLEGOs.sort((a, b) => a.position - b.position);

  return matchingLEGOs;
}

/**
 * Detect adjacency between LEGOs in a translation
 */
function detectAdjacencies(translation, allLEGOs) {
  const legosInTranslation = findLEGOsInTranslation(translation, allLEGOs);
  const adjacencies = [];

  for (let i = 0; i < legosInTranslation.length - 1; i++) {
    const current = legosInTranslation[i];
    const next = legosInTranslation[i + 1];

    // Check if LEGOs are adjacent (next starts within 20 chars of current ending)
    // This allows for small gaps but ensures they're in sequence
    const gap = next.position - current.endPosition;

    if (gap >= 0 && gap < 20) {
      adjacencies.push({
        from_uuid: current.lego.uuid,
        to_uuid: next.lego.uuid,
        from_text: current.lego.text,
        to_text: next.lego.text,
        gap_chars: gap,
        translation_uuid: translation.uuid,
        translation_text: translation.source
      });
    }
  }

  return adjacencies;
}

/**
 * Build adjacency graph from all translations
 */
function buildGraph(translations, legos) {
  const nodes = new Map();
  const edges = new Map();

  // Initialize nodes
  legos.forEach(lego => {
    nodes.set(lego.uuid, {
      uuid: lego.uuid,
      text: lego.text,
      provenance: lego.provenance,
      outbound_edges: [],
      inbound_edges: []
    });
  });

  // Detect adjacencies across all translations
  translations.forEach(translation => {
    const adjacencies = detectAdjacencies(translation, legos);

    adjacencies.forEach(adj => {
      const edgeKey = `${adj.from_uuid}→${adj.to_uuid}`;

      if (!edges.has(edgeKey)) {
        edges.set(edgeKey, {
          from_uuid: adj.from_uuid,
          to_uuid: adj.to_uuid,
          from_text: adj.from_text,
          to_text: adj.to_text,
          weight: 0, // frequency of co-occurrence
          contexts: []
        });
      }

      const edge = edges.get(edgeKey);
      edge.weight++;
      edge.contexts.push({
        translation_uuid: adj.translation_uuid,
        translation_text: adj.translation_text,
        gap_chars: adj.gap_chars
      });

      // Update node adjacency lists
      const fromNode = nodes.get(adj.from_uuid);
      const toNode = nodes.get(adj.to_uuid);

      if (!fromNode.outbound_edges.includes(adj.to_uuid)) {
        fromNode.outbound_edges.push(adj.to_uuid);
      }

      if (!toNode.inbound_edges.includes(adj.from_uuid)) {
        toNode.inbound_edges.push(adj.from_uuid);
      }
    });
  });

  return {
    nodes: Array.from(nodes.values()),
    edges: Array.from(edges.values())
  };
}

/**
 * Calculate graph statistics
 */
function calculateStatistics(graph) {
  const totalNodes = graph.nodes.length;
  const totalEdges = graph.edges.length;

  const avgOutbound = graph.nodes.reduce((sum, n) => sum + n.outbound_edges.length, 0) / totalNodes;
  const avgInbound = graph.nodes.reduce((sum, n) => sum + n.inbound_edges.length, 0) / totalNodes;

  const maxOutbound = Math.max(...graph.nodes.map(n => n.outbound_edges.length));
  const maxInbound = Math.max(...graph.nodes.map(n => n.inbound_edges.length));

  const isolatedNodes = graph.nodes.filter(n =>
    n.outbound_edges.length === 0 && n.inbound_edges.length === 0
  ).length;

  const stronglyConnected = graph.nodes.filter(n =>
    n.outbound_edges.length > 0 && n.inbound_edges.length > 0
  ).length;

  return {
    total_nodes: totalNodes,
    total_edges: totalEdges,
    avg_outbound_degree: Math.round(avgOutbound * 10) / 10,
    avg_inbound_degree: Math.round(avgInbound * 10) / 10,
    max_outbound_degree: maxOutbound,
    max_inbound_degree: maxInbound,
    isolated_nodes: isolatedNodes,
    strongly_connected_nodes: stronglyConnected,
    connectivity_ratio: Math.round((stronglyConnected / totalNodes) * 100)
  };
}

// =============================================================================
// MAIN PROCESSOR
// =============================================================================

async function processPhase3_5() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('Phase 3.5: Graph Construction (NEW in v7.0)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Load data
  console.log('📖 Loading translation amino acids...');
  const translations = await loadTranslations();
  console.log(`   Found ${translations.length} translations\n`);

  console.log('🧬 Loading LEGO amino acids...');
  const legos = await loadLEGOs();
  console.log(`   Found ${legos.length} LEGOs\n`);

  // Build adjacency graph
  console.log('🔗 Detecting LEGO adjacency patterns...');
  const graph = buildGraph(translations, legos);
  console.log(`   Detected ${graph.edges.length} adjacency relationships\n`);

  // Calculate statistics
  console.log('📊 Calculating graph statistics...');
  const stats = calculateStatistics(graph);
  console.log(`   Graph connectivity: ${stats.connectivity_ratio}%\n`);

  // Identify key patterns
  console.log('🎯 Identifying high-frequency patterns...');
  const topPatterns = graph.edges
    .filter(e => e.weight > 1)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 20)
    .map(e => ({
      pattern: `${e.from_text} → ${e.to_text}`,
      frequency: e.weight,
      from_uuid: e.from_uuid,
      to_uuid: e.to_uuid
    }));
  console.log(`   Found ${topPatterns.length} high-frequency patterns\n`);

  // Compile graph report
  const graphReport = {
    version: '7.0',
    phase: '3.5',
    generated_at: new Date().toISOString(),
    course_code: 'spa_for_eng_30seeds',

    graph: {
      nodes: graph.nodes,
      edges: graph.edges
    },

    statistics: stats,

    top_patterns: topPatterns,

    metadata: {
      purpose: 'Enable pattern-aware basket construction in Phase 5',
      edge_definition: 'LEGOs are adjacent if they appear sequentially in source translations',
      weight_meaning: 'Number of times this adjacency pattern occurs across corpus'
    },

    next_phase: {
      phase: '4',
      name: 'Deduplication',
      purpose: 'Merge duplicate LEGOs while preserving provenance'
    }
  };

  // Save output
  console.log('💾 Saving graph data...');
  await fs.writeJson(OUTPUT_FILE, graphReport, { spaces: 2 });
  console.log(`   Saved to: ${OUTPUT_FILE}\n`);

  // Summary
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('✅ Phase 3.5 Complete!');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Graph Nodes (LEGOs): ${stats.total_nodes}`);
  console.log(`Graph Edges (Adjacencies): ${stats.total_edges}`);
  console.log(`Connectivity: ${stats.connectivity_ratio}%`);
  console.log(`Avg Connections/LEGO: ${stats.avg_outbound_degree}`);
  console.log(`High-Frequency Patterns: ${topPatterns.length}`);
  console.log('\nNext: Run Phase 4 (Deduplication)');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

// Run processor
processPhase3_5()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Phase 3.5 failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
