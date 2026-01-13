/**
 * Network Builder API
 * Real-time LEGO network construction for course creation
 *
 * Agents can add LEGOs and see the network grow with computed phrases
 */

const express = require('express');
const cors = require('cors');
const { NetworkBuilder } = require('@ssi/core/network');

const app = express();
app.use(cors());
app.use(express.json());

// Global network state (in-memory for now)
let builder = new NetworkBuilder();
let legos = [];
let phrases = [];
let legoCounter = 0;

// Helper to compute all valid phrases from current LEGOs
function computePhrases() {
  const allPhrases = [];

  // For each LEGO, find all valid paths it can start
  for (const lego of legos) {
    // Single LEGO phrase
    allPhrases.push({
      path: [lego.id],
      chinese: lego.chinese,
      english: lego.english,
      legoCount: 1
    });

    // Find multi-LEGO phrases by following children
    findPaths(lego, [lego], allPhrases);
  }

  // Deduplicate and sort by length
  const seen = new Set();
  return allPhrases
    .filter(p => {
      const key = p.path.join('→');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.legoCount - b.legoCount);
}

function findPaths(currentLego, pathSoFar, results, maxDepth = 6) {
  if (pathSoFar.length >= maxDepth) return;

  for (const childId of currentLego.children || []) {
    const childLego = legos.find(l => l.id === childId);
    if (!childLego) continue;
    if (pathSoFar.some(l => l.id === childId)) continue; // No cycles

    const newPath = [...pathSoFar, childLego];
    results.push({
      path: newPath.map(l => l.id),
      chinese: newPath.map(l => l.chinese).join(''),
      english: newPath.map(l => l.english).join(' '),
      legoCount: newPath.length
    });

    findPaths(childLego, newPath, results, maxDepth);
  }
}

// API Endpoints

// Get current network state
app.get('/api/network-builder/state', (req, res) => {
  const stats = builder.getStats();
  const currentPhrases = computePhrases();

  res.json({
    legos,
    phrases: currentPhrases,
    stats,
    network: builder.export()
  });
});

// Add a new LEGO
app.post('/api/network-builder/lego', (req, res) => {
  const { chinese, english, canFollow = [], canPrecede = [] } = req.body;

  if (!chinese || !english) {
    return res.status(400).json({ error: 'chinese and english are required' });
  }

  legoCounter++;
  const id = `L${String(legoCounter).padStart(3, '0')}`;

  const newLego = {
    id,
    chinese,
    english,
    parents: canFollow,
    children: canPrecede,
    addedAt: new Date().toISOString()
  };

  // Add to NetworkBuilder
  builder.addLego(id, chinese, english);

  // Create connections
  for (const parentId of canFollow) {
    builder.connectPhrase([parentId, id]);
    // Update parent's children
    const parent = legos.find(l => l.id === parentId);
    if (parent && !parent.children.includes(id)) {
      parent.children.push(id);
    }
  }

  for (const childId of canPrecede) {
    builder.connectPhrase([id, childId]);
    // Update child's parents
    const child = legos.find(l => l.id === childId);
    if (child && !child.parents.includes(id)) {
      child.parents.push(id);
    }
  }

  legos.push(newLego);

  // Compute new phrases
  const currentPhrases = computePhrases();
  const newPhrases = currentPhrases.filter(p => p.path.includes(id));

  console.log(`\n${'='.repeat(60)}`);
  console.log(`ADDED: ${id} | ${chinese} | "${english}"`);
  console.log(`Parents: [${canFollow.join(', ')}], Children: [${canPrecede.join(', ')}]`);
  console.log(`New phrases unlocked: ${newPhrases.length}`);
  newPhrases.slice(0, 5).forEach(p => {
    console.log(`  ${p.chinese} → "${p.english}"`);
  });
  if (newPhrases.length > 5) {
    console.log(`  ... and ${newPhrases.length - 5} more`);
  }
  console.log(`Total: ${legos.length} LEGOs, ${currentPhrases.length} phrases`);
  console.log('='.repeat(60));

  res.json({
    lego: newLego,
    newPhrases,
    totalLegos: legos.length,
    totalPhrases: currentPhrases.length,
    stats: builder.getStats()
  });
});

// Connect existing LEGOs to form a phrase
app.post('/api/network-builder/connect', (req, res) => {
  const { legoIds } = req.body;

  if (!legoIds || legoIds.length < 2) {
    return res.status(400).json({ error: 'legoIds array with at least 2 IDs required' });
  }

  // Validate all LEGOs exist
  for (const id of legoIds) {
    if (!legos.find(l => l.id === id)) {
      return res.status(400).json({ error: `LEGO ${id} not found` });
    }
  }

  // Create connections between consecutive LEGOs
  for (let i = 0; i < legoIds.length - 1; i++) {
    const parentId = legoIds[i];
    const childId = legoIds[i + 1];

    builder.connectPhrase([parentId, childId]);

    const parent = legos.find(l => l.id === parentId);
    const child = legos.find(l => l.id === childId);

    if (parent && !parent.children.includes(childId)) {
      parent.children.push(childId);
    }
    if (child && !child.parents.includes(parentId)) {
      child.parents.push(parentId);
    }
  }

  const currentPhrases = computePhrases();
  const pathLegos = legoIds.map(id => legos.find(l => l.id === id));

  console.log(`\nCONNECTED: ${legoIds.join(' → ')}`);
  console.log(`Phrase: ${pathLegos.map(l => l.chinese).join('')} → "${pathLegos.map(l => l.english).join(' ')}"`);

  res.json({
    connected: legoIds,
    phrase: {
      chinese: pathLegos.map(l => l.chinese).join(''),
      english: pathLegos.map(l => l.english).join(' ')
    },
    totalPhrases: currentPhrases.length
  });
});

// Reset the network
app.post('/api/network-builder/reset', (req, res) => {
  builder = new NetworkBuilder();
  legos = [];
  phrases = [];
  legoCounter = 0;

  console.log('\n🔄 Network reset\n');

  res.json({ status: 'reset', legos: 0, phrases: 0 });
});

// Get just the phrases
app.get('/api/network-builder/phrases', (req, res) => {
  const currentPhrases = computePhrases();
  res.json({
    count: currentPhrases.length,
    phrases: currentPhrases
  });
});

// Health check
app.get('/api/network-builder/health', (req, res) => {
  res.json({ status: 'ok', legos: legos.length, phrases: computePhrases().length });
});

const PORT = process.env.NETWORK_BUILDER_PORT || 3480;

app.listen(PORT, () => {
  console.log(`\n🌐 Network Builder API running on port ${PORT}`);
  console.log(`\nEndpoints:`);
  console.log(`  GET  /api/network-builder/state   - Get current network`);
  console.log(`  GET  /api/network-builder/phrases - Get all valid phrases`);
  console.log(`  POST /api/network-builder/lego    - Add a LEGO`);
  console.log(`  POST /api/network-builder/connect - Connect LEGOs`);
  console.log(`  POST /api/network-builder/reset   - Reset network`);
  console.log(`\nReady for agents to build! 🏗️\n`);
});
