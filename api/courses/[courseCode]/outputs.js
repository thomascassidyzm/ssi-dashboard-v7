/**
 * POST /api/courses/:courseCode/outputs
 *
 * Receives extraction outputs from Claude Code agents and writes to S3
 * Agents POST their results directly to this endpoint (no git branch merging needed)
 */

import { readCourseFile, writeCourseFile } from '../../lib/s3-course.js';

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

    // Read existing file from S3 if it exists (for merging segments)
    let existingData = null;
    try {
      const { content } = await readCourseFile(courseCode, outputFileName);
      existingData = content;
    } catch (err) {
      if (err.code !== 'NOT_FOUND') throw err;
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

    // Write to S3
    const { etag, url } = await writeCourseFile(courseCode, outputFileName, finalData);

    console.log(`[API] ✅ Wrote ${seeds.length} seeds to S3: courses/${courseCode}/${outputFileName}`);
    console.log(`[API] Segment: ${segmentId}, Agent: ${agentId}, Phase: ${phase}, ETag: ${etag}`);

    res.status(200).json({
      success: true,
      message: `Successfully wrote ${seeds.length} seeds to ${outputFileName}`,
      s3: { url, etag },
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
