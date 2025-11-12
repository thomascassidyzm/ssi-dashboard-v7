/**
 * POST /api/courses/:courseCode/outputs
 *
 * Receives extraction outputs from Claude Code agents and writes to VFS
 * Agents POST their results directly to this endpoint (no git branch merging needed)
 */

import fs from 'fs/promises';
import path from 'path';

export default async function handler(req, res) {
  // CORS headers for agents calling from claude.ai
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

  const { courseCode } = req.query;
  const { phase, segmentId, seeds, agentId, metadata } = req.body;

  // Validate
  if (!courseCode || !phase || !seeds) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['courseCode', 'phase', 'seeds']
    });
  }

  try {
    // Determine output file based on phase
    const outputFileName = phase === '3' || phase === 3
      ? 'lego_pairs.json'
      : phase === '5' || phase === 5
      ? 'lego_baskets.json'
      : `phase_${phase}_output.json`;

    // Build path: public/vfs/courses/{courseCode}/{outputFileName}
    const vfsPath = path.join(process.cwd(), 'public', 'vfs', 'courses', courseCode);
    const outputPath = path.join(vfsPath, outputFileName);

    // Ensure directory exists
    await fs.mkdir(vfsPath, { recursive: true });

    // Read existing file if it exists (for merging segments)
    let existingData = null;
    try {
      const existingContent = await fs.readFile(outputPath, 'utf-8');
      existingData = JSON.parse(existingContent);
    } catch (err) {
      // File doesn't exist yet, that's fine
    }

    // Merge or create new data
    let finalData;

    if (existingData && existingData.seeds) {
      // Merge new seeds with existing
      const existingSeeds = Array.isArray(existingData.seeds)
        ? existingData.seeds
        : Object.values(existingData.seeds);

      const mergedSeeds = [...existingSeeds, ...seeds];

      finalData = {
        ...existingData,
        seeds: mergedSeeds,
        updated: new Date().toISOString(),
        segments: [
          ...(existingData.segments || []),
          {
            segmentId,
            agentId,
            seedCount: seeds.length,
            timestamp: new Date().toISOString()
          }
        ]
      };
    } else {
      // Create new file
      finalData = {
        version: '8.1.0',
        course: courseCode,
        phase: parseInt(phase),
        generated: new Date().toISOString(),
        methodology: metadata?.methodology || `Phase ${phase} extraction`,
        total_seeds: seeds.length,
        seeds: seeds,
        segments: [{
          segmentId,
          agentId,
          seedCount: seeds.length,
          timestamp: new Date().toISOString()
        }]
      };
    }

    // Write to file
    await fs.writeFile(outputPath, JSON.stringify(finalData, null, 2), 'utf-8');

    console.log(`[API] ✅ Wrote ${seeds.length} seeds to ${outputPath}`);
    console.log(`[API] Segment: ${segmentId}, Agent: ${agentId}, Phase: ${phase}`);

    res.status(200).json({
      success: true,
      message: `Successfully wrote ${seeds.length} seeds to ${outputFileName}`,
      path: `/vfs/courses/${courseCode}/${outputFileName}`,
      totalSeeds: finalData.seeds.length,
      segment: {
        segmentId,
        agentId,
        seedCount: seeds.length
      }
    });

  } catch (error) {
    console.error('[API] Error writing output:', error);
    res.status(500).json({
      error: 'Failed to write output',
      message: error.message
    });
  }
}
