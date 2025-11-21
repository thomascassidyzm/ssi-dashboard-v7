/**
 * PUT /api/courses/:courseCode/baskets/:seedId
 *
 * Updates a basket in lego_baskets.json
 * Writes to local VFS and commits to GitHub for persistence
 */

import fs from 'fs/promises';
import path from 'path';
import { commitToGitHub, isGitHubConfigured } from '../../lib/github.js';

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

  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { courseCode, seedId } = req.query;
  const basketData = req.body;

  // Validate
  if (!courseCode || !seedId || !basketData) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['courseCode', 'seedId', 'basketData']
    });
  }

  try {
    // Path to lego_baskets.json
    const vfsPath = path.join(process.cwd(), 'public', 'vfs', 'courses', courseCode);
    const basketsPath = path.join(vfsPath, 'lego_baskets.json');

    // Read existing file
    const content = await fs.readFile(basketsPath, 'utf-8');
    const data = JSON.parse(content);

    // Update baskets for this seed
    if (!data.baskets) {
      data.baskets = {};
    }

    // Handle v6.2+ format where basketData has nested legos
    if (basketData.legos && typeof basketData.legos === 'object') {
      // basketData = { seed_pair: {...}, legos: { S0001L01: {...}, S0001L02: {...} } }
      // Merge all legos for this seed into the main baskets object
      for (const [legoKey, legoData] of Object.entries(basketData.legos)) {
        if (legoKey.startsWith(seedId)) {
          data.baskets[legoKey] = legoData;
        }
      }
    } else {
      // Legacy format: basketData is flat with LEGOs at root
      for (const [key, value] of Object.entries(basketData)) {
        if (key.startsWith('S') && key.includes('L')) {
          data.baskets[key] = value;
        }
      }
    }

    console.log(`[API] Updated baskets for ${seedId}`);

    // Update metadata
    data.updated = new Date().toISOString();
    data.updated_by = 'manual_edit';

    // Write back to file
    const jsonContent = JSON.stringify(data, null, 2);
    await fs.writeFile(basketsPath, jsonContent, 'utf-8');

    console.log(`[API] Saved lego_baskets.json locally for ${courseCode}`);

    // Commit to GitHub for persistence
    let githubCommit = null;
    if (isGitHubConfigured()) {
      try {
        const result = await commitToGitHub({
          path: `public/vfs/courses/${courseCode}/lego_baskets.json`,
          content: jsonContent,
          message: `Update basket ${seedId}`
        });
        githubCommit = result.commit;
        console.log(`[API] Committed to GitHub: ${githubCommit.sha.substring(0, 7)}`);
      } catch (err) {
        console.error(`[API] GitHub commit failed (local save succeeded):`, err.message);
      }
    } else {
      console.log(`[API] GitHub not configured - local save only`);
    }

    res.status(200).json({
      success: true,
      message: githubCommit
        ? 'Basket updated and committed to GitHub'
        : 'Basket updated locally (GitHub not configured)',
      seedId,
      github: githubCommit
    });

  } catch (error) {
    console.error('[API] Error updating basket:', error);
    res.status(500).json({
      error: 'Failed to update basket',
      message: error.message
    });
  }
}
