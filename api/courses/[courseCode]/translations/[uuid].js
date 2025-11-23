/**
 * PUT /api/courses/:courseCode/translations/:uuid
 *
 * Updates a translation in seed_pairs.json
 * Writes to local VFS and commits to GitHub for persistence
 */

import { readFromGitHub, commitToGitHub, isGitHubConfigured } from '../../lib/github.js';

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

  const { courseCode, uuid } = req.query;
  const { source, target } = req.body;

  // Validate
  if (!courseCode || !uuid || !source || !target) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['courseCode', 'uuid', 'source', 'target']
    });
  }

  try {
    // Read from GitHub
    const githubPath = `public/vfs/courses/${courseCode}/seed_pairs.json`;
    const { content } = await readFromGitHub(githubPath);
    const data = JSON.parse(content);

    // Find and update the translation
    let found = false;
    if (data.translations && typeof data.translations === 'object') {
      // Format: { "S0001": ["target", "known"], ... }
      for (const [seedId, translation] of Object.entries(data.translations)) {
        // Match by checking if translation matches (uuid is typically the seedId)
        if (seedId === uuid || (Array.isArray(translation) && translation[0] === source)) {
          data.translations[seedId] = [target, source]; // [target, known/source]
          found = true;
          console.log(`[API] ✅ Updated translation ${seedId}: "${source}" → "${target}"`);
          break;
        }
      }
    }

    if (!found) {
      return res.status(404).json({
        error: 'Translation not found',
        uuid
      });
    }

    // Update metadata
    data.updated = new Date().toISOString();
    data.updated_by = 'dashboard_edit';

    // Commit to GitHub
    const jsonContent = JSON.stringify(data, null, 2);
    const result = await commitToGitHub({
      path: githubPath,
      content: jsonContent,
      message: `Update translation ${uuid}: "${target.substring(0, 30)}..."`
    });
    const githubCommit = result.commit;
    console.log(`[API] Committed to GitHub: ${githubCommit.sha.substring(0, 7)}`);

    res.status(200).json({
      success: true,
      message: 'Translation updated and committed to GitHub',
      updated: {
        uuid,
        source,
        target
      },
      github: githubCommit
    });

  } catch (error) {
    console.error('[API] Error updating translation:', error);
    res.status(500).json({
      error: 'Failed to update translation',
      message: error.message
    });
  }
}
