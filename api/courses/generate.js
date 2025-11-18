/**
 * POST /api/courses/generate
 *
 * Main course generation endpoint - forwards requests to appropriate phase services
 * Called by Dashboard UI when user clicks "Generate Course"
 */

import axios from 'axios';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    target,
    known,
    seeds,
    startSeed,
    endSeed,
    executionMode,
    phaseSelection,
    segmentMode,
    force
  } = req.body;

  // Validate required fields
  if (!target || !known) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['target', 'known']
    });
  }

  try {
    // Determine which phase service to call based on phaseSelection
    // For now, primarily handling Phase 5 (baskets)

    // Generate courseCode from target/known
    const courseCode = `${target.substring(0, 3).toLowerCase()}_for_${known.substring(0, 3).toLowerCase()}`;

    console.log(`[API] Course generation request: ${courseCode}`);
    console.log(`[API]   Phase: ${phaseSelection || 'all'}`);
    console.log(`[API]   Seeds: ${startSeed}-${endSeed}`);
    console.log(`[API]   Mode: ${executionMode || 'standard'}`);

    // Phase 5: Practice Baskets
    if (!phaseSelection || phaseSelection === '5' || phaseSelection.includes('5')) {
      const phase5Url = process.env.PHASE5_SERVER_URL || 'http://localhost:3459';

      console.log(`[API] Forwarding to Phase 5 Server: ${phase5Url}/start`);

      const phase5Response = await axios.post(`${phase5Url}/start`, {
        courseCode,
        startSeed: startSeed || 1,
        endSeed: endSeed || 668,
        target,
        known,
        stagingOnly: segmentMode === 'staging' // Safe staging mode if requested
      }, {
        timeout: 30000 // 30 second timeout
      });

      return res.json({
        success: true,
        message: `Phase 5 generation started for ${courseCode}`,
        courseCode,
        phase: 5,
        job: phase5Response.data.job,
        statusUrl: `/api/courses/${courseCode}/status`
      });
    }

    // Other phases can be added here (Phase 1, Phase 3, etc.)
    // For now, return error if phase not supported
    return res.status(400).json({
      error: 'Unsupported phase selection',
      requested: phaseSelection,
      supported: ['5']
    });

  } catch (error) {
    console.error('[API] Course generation error:', error.message);

    // Check if Phase 5 server is down
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        error: 'Phase 5 server not available',
        message: 'Please ensure Phase 5 server is running on port 3459',
        command: 'Start with: node services/phases/phase5-basket-server.cjs'
      });
    }

    return res.status(500).json({
      error: 'Course generation failed',
      message: error.message,
      details: error.response?.data
    });
  }
}
