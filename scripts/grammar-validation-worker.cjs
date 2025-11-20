#!/usr/bin/env node
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3460;
const VFS_ROOT = path.join(__dirname, '../public/vfs/courses');

// Track deleted phrases and statistics
const stats = {
  workerId: 'grammar-validator-cmn',
  seedsAssigned: ['S0051', 'S0052', 'S0053'],
  deletedPhrases: [],
  keptPhrases: 0,
  errors: []
};

/**
 * POST /delete-phrase
 * Delete a phrase from the course data
 */
app.post('/delete-phrase', (req, res) => {
  const { courseCode, seed, legoIndex, phraseIndex, reason } = req.body;

  if (!courseCode || !seed || legoIndex === undefined || phraseIndex === undefined) {
    return res.status(400).json({
      error: 'Missing required fields: courseCode, seed, legoIndex, phraseIndex'
    });
  }

  try {
    // Load the basket data
    const basketPath = path.join(VFS_ROOT, courseCode, 'lego_baskets.json');
    const basketData = JSON.parse(fs.readFileSync(basketPath, 'utf8'));

    const basketKey = `${seed}L${String(legoIndex + 1).padStart(2, '0')}`;

    if (!basketData.baskets[basketKey]) {
      return res.status(404).json({
        error: `Basket ${basketKey} not found`
      });
    }

    const basket = basketData.baskets[basketKey];
    const phrase = basket.practice_phrases[phraseIndex];

    if (!phrase) {
      return res.status(404).json({
        error: `Phrase at index ${phraseIndex} not found in ${basketKey}`
      });
    }

    // Store deletion record
    stats.deletedPhrases.push({
      basket: basketKey,
      phraseIndex: phraseIndex,
      phrase: phrase,
      reason: reason || 'grammar error'
    });

    // Remove the phrase
    basket.practice_phrases.splice(phraseIndex, 1);

    // Save updated data
    fs.writeFileSync(basketPath, JSON.stringify(basketData, null, 2));

    res.json({
      success: true,
      message: `Deleted phrase from ${basketKey} at index ${phraseIndex}`,
      deletedPhrase: phrase
    });
  } catch (error) {
    stats.errors.push(error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /worker-complete
 * Report completion and statistics
 */
app.post('/worker-complete', (req, res) => {
  const { keptCount } = req.body;

  stats.keptPhrases = keptCount || 0;
  stats.completedAt = new Date().toISOString();

  console.log('\n=== GRAMMAR VALIDATION WORKER COMPLETE ===');
  console.log(`Worker ID: ${stats.workerId}`);
  console.log(`Seeds: ${stats.seedsAssigned.join(', ')}`);
  console.log(`Phrases Kept: ${stats.keptPhrases}`);
  console.log(`Phrases Deleted: ${stats.deletedPhrases.length}`);
  console.log(`Errors: ${stats.errors.length}`);
  console.log('==========================================\n');

  // Write report to file
  const reportPath = path.join(__dirname, '../.project/grammar-validation-report.json');
  const reportDir = path.dirname(reportPath);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  fs.writeFileSync(reportPath, JSON.stringify(stats, null, 2));

  res.json({
    success: true,
    message: 'Grammar validation complete',
    stats: {
      workerId: stats.workerId,
      seedsProcessed: stats.seedsAssigned,
      deletedCount: stats.deletedPhrases.length,
      keptCount: stats.keptPhrases,
      errorCount: stats.errors.length
    }
  });
});

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', workerId: stats.workerId });
});

app.listen(PORT, () => {
  console.log(`Grammar Validation Worker listening on port ${PORT}`);
  console.log(`Processing seeds: ${stats.seedsAssigned.join(', ')}`);
});
