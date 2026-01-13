/**
 * Network Builder API
 * Real-time LEGO network construction for course creation
 * Supports multiple networks via ?network=<id> query param
 */

const express = require('express');
const cors = require('cors');
const { NetworkBuilder } = require('@ssi/core/network');

const app = express();
app.use(cors());
app.use(express.json());

// Multiple networks keyed by networkId
const networks = {};

function getNetwork(networkId = 'default') {
  if (!networks[networkId]) {
    networks[networkId] = {
      builder: new NetworkBuilder(),
      legos: [],
      legoCounter: 0,
      createdAt: new Date().toISOString()
    };
    console.log(`\n🆕 Created new network: "${networkId}"`);
  }
  return networks[networkId];
}

// Helper to compute all valid phrases from current LEGOs
function computePhrases(legos) {
  const allPhrases = [];

  function findPaths(currentLego, pathSoFar, maxDepth = 6) {
    if (pathSoFar.length >= maxDepth) return;

    for (const childId of currentLego.children || []) {
      const childLego = legos.find(l => l.id === childId);
      if (!childLego) continue;
      if (pathSoFar.some(l => l.id === childId)) continue;

      const newPath = [...pathSoFar, childLego];
      allPhrases.push({
        path: newPath.map(l => l.id),
        chinese: newPath.map(l => l.chinese).join(''),
        english: newPath.map(l => l.english).join(' '),
        legoCount: newPath.length
      });

      findPaths(childLego, newPath, maxDepth);
    }
  }

  for (const lego of legos) {
    allPhrases.push({
      path: [lego.id],
      chinese: lego.chinese,
      english: lego.english,
      legoCount: 1
    });
    findPaths(lego, [lego]);
  }

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

// List all networks
app.get('/api/network-builder/networks', (req, res) => {
  const list = Object.entries(networks).map(([id, net]) => ({
    id,
    legoCount: net.legos.length,
    phraseCount: computePhrases(net.legos).length,
    createdAt: net.createdAt
  }));
  res.json({ networks: list });
});

// Get current network state
app.get('/api/network-builder/state', (req, res) => {
  const networkId = req.query.network || 'default';
  const net = getNetwork(networkId);
  const phrases = computePhrases(net.legos);
  const stats = net.builder.getStats();

  res.json({
    networkId,
    legos: net.legos,
    phrases,
    stats,
    network: net.builder.export()
  });
});

// Helper to find LEGO by ID or Chinese text
function findLego(legos, ref) {
  return legos.find(l => l.id === ref || l.chinese === ref);
}

// Add a new LEGO
app.post('/api/network-builder/lego', (req, res) => {
  const networkId = req.query.network || req.body.network || 'default';
  const { chinese, english, canFollow = [], canPrecede = [] } = req.body;
  const net = getNetwork(networkId);

  if (!chinese || !english) {
    return res.status(400).json({ error: 'chinese and english are required' });
  }

  net.legoCounter++;
  const id = `L${String(net.legoCounter).padStart(3, '0')}`;

  const newLego = {
    id,
    chinese,
    english,
    parents: [],
    children: [],
    addedAt: new Date().toISOString()
  };

  net.builder.addLego(id, chinese, english);

  // Resolve parent references (can be ID or Chinese text)
  for (const parentRef of canFollow) {
    const parent = findLego(net.legos, parentRef);
    if (parent) {
      net.builder.connectPhrase([parent.id, id]);
      if (!parent.children.includes(id)) {
        parent.children.push(id);
      }
      if (!newLego.parents.includes(parent.id)) {
        newLego.parents.push(parent.id);
      }
    }
  }

  // Resolve child references (can be ID or Chinese text)
  for (const childRef of canPrecede) {
    const child = findLego(net.legos, childRef);
    if (child) {
      net.builder.connectPhrase([id, child.id]);
      if (!child.parents.includes(id)) {
        child.parents.push(id);
      }
      if (!newLego.children.includes(child.id)) {
        newLego.children.push(child.id);
      }
    }
  }

  net.legos.push(newLego);

  const phrases = computePhrases(net.legos);
  const newPhrases = phrases.filter(p => p.path.includes(id));

  console.log(`\n${'='.repeat(60)}`);
  console.log(`[${networkId}] ADDED: ${id} | ${chinese} | "${english}"`);
  console.log(`Parents: [${canFollow.join(', ')}], Children: [${canPrecede.join(', ')}]`);
  console.log(`New phrases: ${newPhrases.length}`);
  newPhrases.slice(0, 5).forEach(p => console.log(`  ${p.chinese} → "${p.english}"`));
  if (newPhrases.length > 5) console.log(`  ... and ${newPhrases.length - 5} more`);
  console.log(`Total: ${net.legos.length} LEGOs, ${phrases.length} phrases`);
  console.log('='.repeat(60));

  res.json({
    networkId,
    lego: newLego,
    newPhrases,
    totalLegos: net.legos.length,
    totalPhrases: phrases.length,
    stats: net.builder.getStats()
  });
});

// Connect existing LEGOs
app.post('/api/network-builder/connect', (req, res) => {
  const networkId = req.query.network || req.body.network || 'default';
  const { legoIds } = req.body;
  const net = getNetwork(networkId);

  if (!legoIds || legoIds.length < 2) {
    return res.status(400).json({ error: 'legoIds array with at least 2 IDs required' });
  }

  for (const id of legoIds) {
    if (!net.legos.find(l => l.id === id)) {
      return res.status(400).json({ error: `LEGO ${id} not found in network ${networkId}` });
    }
  }

  for (let i = 0; i < legoIds.length - 1; i++) {
    const parentId = legoIds[i];
    const childId = legoIds[i + 1];
    net.builder.connectPhrase([parentId, childId]);

    const parent = net.legos.find(l => l.id === parentId);
    const child = net.legos.find(l => l.id === childId);

    if (parent && !parent.children.includes(childId)) parent.children.push(childId);
    if (child && !child.parents.includes(parentId)) child.parents.push(parentId);
  }

  const phrases = computePhrases(net.legos);
  const pathLegos = legoIds.map(id => net.legos.find(l => l.id === id));

  console.log(`[${networkId}] CONNECTED: ${legoIds.join(' → ')}`);

  res.json({
    networkId,
    connected: legoIds,
    phrase: {
      chinese: pathLegos.map(l => l.chinese).join(''),
      english: pathLegos.map(l => l.english).join(' ')
    },
    totalPhrases: phrases.length
  });
});

// Reset a specific network
app.post('/api/network-builder/reset', (req, res) => {
  const networkId = req.query.network || req.body.network || 'default';

  networks[networkId] = {
    builder: new NetworkBuilder(),
    legos: [],
    legoCounter: 0,
    createdAt: new Date().toISOString()
  };

  console.log(`\n🔄 Network "${networkId}" reset`);

  res.json({ status: 'reset', networkId, legos: 0, phrases: 0 });
});

// Get phrases for a network
app.get('/api/network-builder/phrases', (req, res) => {
  const networkId = req.query.network || 'default';
  const net = getNetwork(networkId);
  const phrases = computePhrases(net.legos);
  res.json({ networkId, count: phrases.length, phrases });
});

// Health check
app.get('/api/network-builder/health', (req, res) => {
  const networkCount = Object.keys(networks).length;
  res.json({ status: 'ok', networkCount, networks: Object.keys(networks) });
});

const PORT = process.env.NETWORK_BUILDER_PORT || 3480;

app.listen(PORT, () => {
  console.log(`\n🌐 Network Builder API running on port ${PORT}`);
  console.log(`\nEndpoints (add ?network=<id> for multiple networks):`);
  console.log(`  GET  /api/network-builder/networks - List all networks`);
  console.log(`  GET  /api/network-builder/state    - Get network state`);
  console.log(`  GET  /api/network-builder/phrases  - Get all phrases`);
  console.log(`  POST /api/network-builder/lego     - Add a LEGO`);
  console.log(`  POST /api/network-builder/connect  - Connect LEGOs`);
  console.log(`  POST /api/network-builder/reset    - Reset network`);
  console.log(`\nReady for agents to build! 🏗️\n`);
});
