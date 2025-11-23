/**
 * PUT /api/courses/:courseCode/baskets/:seedId
 *
 * Updates a basket in lego_baskets.json
 * Reads from GitHub and commits back to GitHub
 */

import { readFromGitHub, commitToGitHub } from '../../../lib/github.js';

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
    // Read from GitHub
    const githubPath = `public/vfs/courses/${courseCode}/lego_baskets.json`;
    const { content } = await readFromGitHub(githubPath);
    const data = JSON.parse(content);

    // Update baskets for this seed
    if (!data.baskets) {
      data.baskets = {};
    }

    // Handle v6.2+ format where basketData has nested legos
    if (basketData.legos && typeof basketData.legos === 'object') {
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
    data.updated_by = 'dashboard_edit';

    // Commit to GitHub
    const jsonContent = JSON.stringify(data, null, 2);
    const result = await commitToGitHub({
      path: githubPath,
      content: jsonContent,
      message: `Update basket ${seedId}`
    });
    const githubCommit = result.commit;
    console.log(`[API] Committed to GitHub: ${githubCommit.sha.substring(0, 7)}`);

    res.status(200).json({
      success: true,
      message: 'Basket updated and committed to GitHub',
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
