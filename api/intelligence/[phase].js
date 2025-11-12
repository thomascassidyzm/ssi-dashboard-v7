/**
 * GET /api/intelligence/:phase
 *
 * Returns raw markdown for phase intelligence files
 * Agents can fetch directly without Vue UI
 */

import fs from 'fs/promises';
import path from 'path';

export default async function handler(req, res) {
  const { phase } = req.query;

  // Map phase numbers to filenames
  const phaseFiles = {
    '1': 'phase_1_seed_pairs.md',
    '3': 'phase_3_lego_pairs.md',
    '4': 'phase_4_batch_prep.md',
    '5': 'phase_5_lego_baskets.md',
    '5.5': 'phase_5.5_basket_deduplication.md',
    '6': 'phase_6_introductions.md',
    '7': 'phase_7_compilation.md',
    '8': 'phase_8_audio_generation.md'
  };

  const filename = phaseFiles[phase];

  if (!filename) {
    return res.status(404).json({
      error: 'Phase not found',
      availablePhases: Object.keys(phaseFiles)
    });
  }

  try {
    const intelligencePath = path.join(process.cwd(), 'docs', 'phase_intelligence', filename);
    const markdown = await fs.readFile(intelligencePath, 'utf-8');

    // Return raw markdown with appropriate content type
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).send(markdown);

  } catch (error) {
    console.error(`[API] Error reading phase ${phase} intelligence:`, error);
    res.status(500).json({
      error: 'Failed to read phase intelligence',
      phase,
      filename
    });
  }
}
